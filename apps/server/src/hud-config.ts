import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import {
  DEFAULT_HUD_CONFIG,
  HudConfigSchema,
  HudConfigUpdateSchema,
  HudImageIdSchema,
  HudImageSlotSchema,
  type HudConfig,
  type HudConfigUpdate,
  type HudImageSlot,
} from '@quiz/contracts';

export const MAX_HUD_IMAGE_BYTES = 8 * 1024 * 1024;
export const HUD_BACKGROUND_ASPECT_RATIO = 9 / 16;
const HUD_BACKGROUND_RATIO_TOLERANCE = 0.15;

export type HudImageInfo = { id: string; width: number; height: number; mimeType: string };
export type HudImageAsset = HudImageInfo & { bytes: Buffer };

export class HudConfigError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode: number) {
    super(message);
    this.name = 'HudConfigError';
  }
}

type DetectedImage = { extension: 'png' | 'jpg' | 'webp'; mimeType: string; width: number; height: number };

function jpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined || marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (startOfFrame.has(marker)) {
      if (segmentLength < 7) return null;
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += segmentLength;
  }
  return null;
}

function webpDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 25 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = bytes.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && bytes.length >= 30) {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1,
    };
  }
  if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b1 = bytes[21]!;
    const b2 = bytes[22]!;
    const b3 = bytes[23]!;
    const b4 = bytes[24]!;
    return {
      width: 1 + b1 + ((b2 & 0x3f) << 8),
      height: 1 + ((b2 >> 6) & 0x03) + (b3 << 2) + ((b4 & 0x0f) << 10),
    };
  }
  if (chunk === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

function detectImage(bytes: Buffer): DetectedImage | null {
  if (bytes.length >= 24
    && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    && bytes.toString('ascii', 12, 16) === 'IHDR') {
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    return width && height ? { extension: 'png', mimeType: 'image/png', width, height } : null;
  }
  const jpeg = jpegDimensions(bytes);
  if (jpeg) return { extension: 'jpg', mimeType: 'image/jpeg', ...jpeg };
  const webp = webpDimensions(bytes);
  if (webp) return { extension: 'webp', mimeType: 'image/webp', ...webp };
  return null;
}

function emptyConfig(): HudConfig {
  return HudConfigSchema.parse(DEFAULT_HUD_CONFIG);
}

function atomicWrite(path: string, bytes: Buffer | string) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export class HudConfigStore {
  readonly configPath: string;
  readonly assetsPath: string;

  constructor(readonly dataDir: string) {
    this.configPath = join(dataDir, 'hud.json');
    this.assetsPath = join(dataDir, 'hud-assets');
  }

  get(): HudConfig {
    try {
      const parsed = HudConfigSchema.safeParse(JSON.parse(readFileSync(this.configPath, 'utf8')) as unknown);
      return parsed.success ? parsed.data : emptyConfig();
    } catch {
      return emptyConfig();
    }
  }

  private persist(config: HudConfig): HudConfig {
    const parsed = HudConfigSchema.parse(config);
    atomicWrite(this.configPath, `${JSON.stringify(parsed, null, 2)}\n`);
    return parsed;
  }

  private next(update: HudConfigUpdate): HudConfig {
    const parsed = HudConfigUpdateSchema.parse(update);
    return HudConfigSchema.parse({ ...parsed, version: this.get().version + 1 });
  }

  save(update: HudConfigUpdate): HudConfig {
    const config = this.next(update);
    const absent = this.missingImageSlots(config);
    if (absent.length) throw new HudConfigError('HUD_IMAGE_NOT_FOUND', `Không tìm thấy ảnh cho: ${absent.join(', ')}.`, 422);
    return this.persist(config);
  }

  reset(): HudConfig {
    const config = HudConfigSchema.parse({ ...emptyConfig(), version: this.get().version + 1 });
    return this.persist(config);
  }

  upload(slotValue: unknown, bytesValue: unknown, declaredContentType: string | undefined): { image: HudImageInfo; config: HudConfig } {
    const slot = HudImageSlotSchema.safeParse(slotValue);
    if (!slot.success) throw new HudConfigError('HUD_IMAGE_SLOT_INVALID', 'Slot ảnh HUD không hợp lệ.', 400);
    if (!Buffer.isBuffer(bytesValue) || bytesValue.length === 0)
      throw new HudConfigError('HUD_IMAGE_EMPTY', 'Tệp ảnh trống hoặc không hợp lệ.', 400);
    if (bytesValue.length > MAX_HUD_IMAGE_BYTES)
      throw new HudConfigError('HUD_IMAGE_TOO_LARGE', 'Ảnh HUD tối đa 8 MB.', 413);
    const detected = detectImage(bytesValue);
    if (!detected) throw new HudConfigError('HUD_IMAGE_FORMAT_INVALID', 'Chỉ chấp nhận ảnh PNG, JPG hoặc WEBP hợp lệ.', 415);
    const normalizedContentType = declaredContentType?.split(';', 1)[0]?.trim().toLowerCase();
    if (normalizedContentType && normalizedContentType !== 'application/octet-stream' && normalizedContentType !== detected.mimeType)
      throw new HudConfigError('HUD_IMAGE_MIME_MISMATCH', 'Content-Type không khớp định dạng ảnh.', 415);

    const hash = createHash('sha256').update(bytesValue).digest('hex');
    const id = `${hash}.${detected.extension}`;
    const imagePath = join(this.assetsPath, id);
    if (!existsSync(imagePath)) atomicWrite(imagePath, bytesValue);
    const current = this.get();
    const config = this.persist(this.next({
      texts: current.texts,
      images: { ...current.images, [slot.data]: id },
    }));
    return { image: { id, width: detected.width, height: detected.height, mimeType: detected.mimeType }, config };
  }

  getImage(idValue: unknown): HudImageAsset | null {
    const id = this.safeImageId(idValue);
    if (!id) return null;
    try {
      const bytes = readFileSync(join(this.assetsPath, id));
      const detected = detectImage(bytes);
      if (!detected) return null;
      const [hash, extension] = id.split('.') as [string, string];
      if (extension !== detected.extension || hash !== createHash('sha256').update(bytes).digest('hex')) return null;
      return { id, bytes, width: detected.width, height: detected.height, mimeType: detected.mimeType };
    } catch {
      return null;
    }
  }

  preflightIssues(): string[] {
    const config = this.get();
    const issues: string[] = [];
    for (const slot of Object.keys(config.images) as HudImageSlot[]) {
      const id = config.images[slot];
      if (!id) continue;
      const image = this.getImage(id);
      if (!image) {
        issues.push(`Ảnh ${slot} thiếu hoặc hỏng.`);
        continue;
      }
      if (slot.startsWith('bg')) {
        const ratio = image.width / image.height;
        const deviation = Math.abs(ratio - HUD_BACKGROUND_ASPECT_RATIO) / HUD_BACKGROUND_ASPECT_RATIO;
        if (deviation > HUD_BACKGROUND_RATIO_TOLERANCE)
          issues.push(`Ảnh nền ${slot} có tỷ lệ ${image.width}:${image.height}, khác đáng kể so với 9:16.`);
      }
    }
    return issues;
  }

  private missingImageSlots(config: HudConfig): HudImageSlot[] {
    return (Object.keys(config.images) as HudImageSlot[]).filter((slot) => {
      const id = config.images[slot];
      return id !== null && this.getImage(id) === null;
    });
  }

  private safeImageId(value: unknown): string | null {
    const result = HudImageIdSchema.safeParse(value);
    return result.success ? result.data : null;
  }
}
