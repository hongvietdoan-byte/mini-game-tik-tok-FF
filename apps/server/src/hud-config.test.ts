import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_HUD_CONFIG,
  HudConfigUpdateSchema,
  HudTextsSchema,
} from '@quiz/contracts';
import { HudConfigError, HudConfigStore, MAX_HUD_IMAGE_BYTES } from './hud-config';

const roots: string[] = [];
function tempStore() {
  const root = mkdtempSync(join(tmpdir(), 'quiz-hud-config-'));
  roots.push(root);
  return { root, store: new HudConfigStore(root) };
}

function png(width = 9, height = 16) {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function update(images = DEFAULT_HUD_CONFIG.images) {
  return { texts: { ...DEFAULT_HUD_CONFIG.texts }, images };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('HudConfigStore', () => {
  it('trả mặc định khi thiếu, JSON hỏng hoặc cấu hình lưu không hợp lệ', () => {
    const { root, store } = tempStore();
    expect(store.get()).toEqual(DEFAULT_HUD_CONFIG);
    writeFileSync(store.configPath, '{ json hỏng');
    expect(store.get()).toEqual(DEFAULT_HUD_CONFIG);
    writeFileSync(store.configPath, JSON.stringify({ ...DEFAULT_HUD_CONFIG, version: -1 }));
    expect(store.get()).toEqual(DEFAULT_HUD_CONFIG);
    expect(existsSync(join(root, 'hud-assets'))).toBe(false);
  });

  it('trim chữ, giới hạn theo grapheme và từ chối nội dung dạng HTML', () => {
    const texts = { ...DEFAULT_HUD_CONFIG.texts, kicker: '  BÃO TỐ  ' };
    expect(HudTextsSchema.parse(texts).kicker).toBe('BÃO TỐ');
    expect(HudTextsSchema.safeParse({ ...texts, kicker: 'x'.repeat(25) }).success).toBe(false);
    // Một ký tự tiếng Việt có dấu tổ hợp được đếm là một grapheme hiển thị.
    expect(HudTextsSchema.safeParse({ ...texts, kicker: 'a\u0301'.repeat(24) }).success).toBe(true);
    expect(HudTextsSchema.safeParse({ ...texts, arenaTitle: '<b>Không an toàn</b>' }).success).toBe(false);
    expect(HudConfigUpdateSchema.safeParse({ ...update(), extra: true }).success).toBe(false);
  });

  it('lưu ảnh theo SHA-256, trả kích thước và cảnh báo nền sai tỷ lệ', () => {
    const { root, store } = tempStore();
    const bytes = png(100, 100);
    const { image, config } = store.upload('bgLobby', bytes, 'image/png');
    const hash = createHash('sha256').update(bytes).digest('hex');
    expect(image).toEqual({ id: `${hash}.png`, width: 100, height: 100, mimeType: 'image/png' });
    expect(config.version).toBe(1);
    expect(config.images.bgLobby).toBe(image.id);
    expect(readFileSync(join(root, 'hud-assets', image.id))).toEqual(bytes);
    expect(store.getImage(image.id)).toMatchObject({ id: image.id, width: 100, height: 100, mimeType: 'image/png' });
    expect(store.preflightIssues()).toEqual([expect.stringContaining('khác đáng kể so với 9:16')]);
  });

  it('từ chối slot, chữ ký ảnh, MIME sai và tệp lớn hơn 8 MB', () => {
    const { store } = tempStore();
    const expectCode = (fn: () => unknown, statusCode: number, code: string) => {
      try {
        fn();
        throw new Error('Mong đợi upload bị từ chối');
      } catch (error) {
        expect(error).toBeInstanceOf(HudConfigError);
        expect(error).toMatchObject({ statusCode, code });
      }
    };
    expectCode(() => store.upload('unknown', png(), 'image/png'), 400, 'HUD_IMAGE_SLOT_INVALID');
    expectCode(() => store.upload('logo', Buffer.from('not an image'), 'image/png'), 415, 'HUD_IMAGE_FORMAT_INVALID');
    expectCode(() => store.upload('logo', png(), 'image/jpeg'), 415, 'HUD_IMAGE_MIME_MISMATCH');
    expectCode(() => store.upload('logo', Buffer.alloc(MAX_HUD_IMAGE_BYTES + 1), 'image/png'), 413, 'HUD_IMAGE_TOO_LARGE');
  });

  it('không lưu cấu hình trỏ tới ảnh mất; reset tăng version và xóa tùy chỉnh', () => {
    const { store } = tempStore();
    const missing = `${'f'.repeat(64)}.png`;
    expect(() => store.save(update({ ...DEFAULT_HUD_CONFIG.images, logo: missing }))).toThrowError(
      expect.objectContaining({ code: 'HUD_IMAGE_NOT_FOUND', statusCode: 422 }),
    );
    expect(store.get()).toEqual(DEFAULT_HUD_CONFIG);
    expect(store.save(update()).version).toBe(1);
    expect(store.reset()).toEqual({ ...DEFAULT_HUD_CONFIG, version: 2 });
  });

  it('preflight cảnh báo khi ảnh tham chiếu đã bị thiếu hoặc sửa đổi', () => {
    const { root, store } = tempStore();
    const { image } = store.upload('logo', png(), 'image/png');
    writeFileSync(join(root, 'hud-assets', image.id), 'đã hỏng');
    expect(store.preflightIssues()).toEqual([expect.stringContaining('thiếu hoặc hỏng')]);
  });
});
