import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { MAX_MC_READING_MS } from '@quiz/contracts';
import type { CachedMcVoiceAudio, McVoiceAudio, McVoiceCacheDescriptor } from './types';

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/;

type CacheMetadata = {
  assetId: string;
  durationMs: number;
  format: 'mp3';
  checksum: string;
  sizeBytes: number;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}

/** Hash nội dung đã chuẩn hoá cùng các setting phát; không lưu text/voice key trong metadata. */
export function mcVoiceCacheKey(input: McVoiceCacheDescriptor): string {
  const canonical = JSON.stringify({
    text: input.text.normalize('NFC').trim().replace(/\s+/g, ' '),
    provider: input.provider,
    model: input.model,
    voiceSettings: stableValue(input.voiceSettings),
    rate: input.rate,
    format: input.format,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function checksum(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isMissing(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}

export class McVoiceCache {
  private readonly directory: string;
  private readonly pendingWrites = new Map<string, Promise<CachedMcVoiceAudio>>();

  constructor(directory: string) {
    this.directory = resolve(directory);
  }

  private async ensureDirectory() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const info = await lstat(this.directory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Thư mục cache MC Voice không hợp lệ.');
  }

  async get(assetId: string): Promise<CachedMcVoiceAudio | null> {
    if (!HASH_RE.test(assetId)) return null;
    await this.ensureDirectory();
    const entryDir = join(this.directory, assetId);
    const audioPath = join(entryDir, 'audio.mp3');
    const metaPath = join(entryDir, 'metadata.json');
    try {
      const [dirInfo, audioInfo, metaInfo] = await Promise.all([lstat(entryDir), lstat(audioPath), lstat(metaPath)]);
      if (dirInfo.isSymbolicLink() || !dirInfo.isDirectory() || audioInfo.isSymbolicLink() || !audioInfo.isFile() ||
        metaInfo.isSymbolicLink() || !metaInfo.isFile() || audioInfo.size <= 0 || audioInfo.size > MAX_AUDIO_BYTES) return null;
      const [bytes, rawMetadata] = await Promise.all([readFile(audioPath), readFile(metaPath, 'utf8')]);
      const metadata = JSON.parse(rawMetadata) as CacheMetadata;
      if (metadata.assetId !== assetId || metadata.format !== 'mp3' || metadata.sizeBytes !== bytes.byteLength ||
        !Number.isSafeInteger(metadata.durationMs) || metadata.durationMs <= 0 || metadata.durationMs > MAX_MC_READING_MS ||
        !HASH_RE.test(metadata.checksum) || checksum(bytes) !== metadata.checksum) return null;
      return { ...metadata, bytes };
    } catch (error) {
      if (isMissing(error)) return null;
      if (error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async put(assetId: string, audio: McVoiceAudio): Promise<CachedMcVoiceAudio> {
    if (!HASH_RE.test(assetId)) throw new Error('Cache key MC Voice không hợp lệ.');
    if (!(audio.bytes instanceof Uint8Array) || audio.bytes.byteLength === 0 || audio.bytes.byteLength > MAX_AUDIO_BYTES)
      throw new Error('Kích thước audio MC Voice không hợp lệ.');
    if (audio.format !== 'mp3' || !Number.isSafeInteger(audio.durationMs) || audio.durationMs <= 0 || audio.durationMs > MAX_MC_READING_MS)
      throw new Error('Audio vượt giới hạn thời lượng hoặc định dạng MC Voice.');

    const pending = this.pendingWrites.get(assetId);
    if (pending) return pending;
    const write = this.writeEntry(assetId, audio);
    this.pendingWrites.set(assetId, write);
    try {
      return await write;
    } finally {
      if (this.pendingWrites.get(assetId) === write) this.pendingWrites.delete(assetId);
    }
  }

  private async writeEntry(assetId: string, audio: McVoiceAudio): Promise<CachedMcVoiceAudio> {
    await this.ensureDirectory();
    const entryDir = join(this.directory, assetId);
    const existing = await this.get(assetId);
    if (existing) return existing;

    const metadata: CacheMetadata = {
      assetId,
      durationMs: audio.durationMs,
      format: audio.format,
      checksum: checksum(audio.bytes),
      sizeBytes: audio.bytes.byteLength,
    };
    const tempAudio = join(this.directory, `.audio-${randomUUID()}.tmp`);
    const tempMetadata = join(this.directory, `.metadata-${randomUUID()}.tmp`);
    try {
      await writeFile(tempAudio, audio.bytes, { flag: 'wx', mode: 0o600 });
      await writeFile(tempMetadata, JSON.stringify(metadata), { flag: 'wx', mode: 0o600 });
      await mkdir(entryDir, { recursive: true, mode: 0o700 });
      const dirInfo = await lstat(entryDir);
      if (dirInfo.isSymbolicLink() || !dirInfo.isDirectory()) throw new Error('Thư mục cache audio không hợp lệ.');
      await rename(tempAudio, join(entryDir, 'audio.mp3'));
      await rename(tempMetadata, join(entryDir, 'metadata.json'));
    } finally {
      await Promise.all([rm(tempAudio, { force: true }), rm(tempMetadata, { force: true })]);
    }
    const written = await this.get(assetId);
    if (!written) throw new Error('Không xác minh được audio sau khi ghi cache.');
    return written;
  }
}
