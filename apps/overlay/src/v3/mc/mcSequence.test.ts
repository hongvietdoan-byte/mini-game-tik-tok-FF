import { describe, expect, it } from 'vitest';
import {
  advanceMcPlayback,
  createMcPlayback,
  getMcFallbackUrl,
  getMcFrameUrl,
  parseMcSequenceManifest,
  preloadMcAnimation,
  resolveMcAnimation,
  type McSequenceManifest,
} from './mcSequence';

function fakeManifest(): McSequenceManifest {
  const parsed = parseMcSequenceManifest({
    id: 'mc-kelly-test',
    fallback: 'poster.png',
    animations: {
      idle: { path: 'idle/', frames: 2, fps: 10, loop: true },
      welcome: { path: 'welcome/', frames: 2, fps: 12, loop: false, then: 'idle' },
      ask: { path: 'ask/', frames: 3, fps: 12, loop: true },
    },
  });
  if (!parsed) throw new Error('Manifest giả phải hợp lệ.');
  return parsed;
}

describe('MC PNG sequence', () => {
  it('bắt buộc idle và thiếu animation thì chọn idle', () => {
    expect(parseMcSequenceManifest({ id: 'broken', animations: { ask: { path: 'ask', frames: 2, fps: 12, loop: true } } }))
      .toBeNull();
    expect(resolveMcAnimation(fakeManifest(), 'react').name).toBe('idle');
  });

  it('tạo URL frame 1-based, zero-padded và từ chối chỉ số ngoài dải', () => {
    const manifest = fakeManifest();
    const idle = resolveMcAnimation(manifest, 'idle');
    expect(getMcFrameUrl('/assets/mc/kelly/', idle, 0)).toBe('/assets/mc/kelly/idle/0001.png');
    expect(getMcFrameUrl('/assets/mc/kelly', idle, 1)).toBe('/assets/mc/kelly/idle/0002.png');
    expect(getMcFrameUrl('/assets/mc/kelly', idle, 2)).toBeNull();
  });

  it('loop frame cuối về đầu và welcome phát xong chuyển idle', () => {
    const manifest = fakeManifest();
    const welcome = createMcPlayback(resolveMcAnimation(manifest, 'welcome'), 1);
    expect(advanceMcPlayback(welcome, manifest)).toMatchObject({ name: 'idle', frameIndex: 0 });
    const ask = createMcPlayback(resolveMcAnimation(manifest, 'ask'), 2);
    expect(advanceMcPlayback(ask, manifest)).toMatchObject({ name: 'ask', frameIndex: 0 });
  });

  it('preload dùng frame giả và báo lỗi nếu có frame tải thất bại', async () => {
    const manifest = fakeManifest();
    const selection = resolveMcAnimation(manifest, 'ask');
    const fakeFrames: string[] = [];
    const result = await preloadMcAnimation('/fake/mc', selection, async (url) => {
      fakeFrames.push(url);
      return !url.endsWith('0002.png');
    });

    expect(fakeFrames).toEqual([
      '/fake/mc/ask/0001.png',
      '/fake/mc/ask/0002.png',
      '/fake/mc/ask/0003.png',
    ]);
    expect(result.ok).toBe(false);
    expect(getMcFallbackUrl(manifest, '/assets/mc/kelly', '/assets/mc/kelly.png'))
      .toBe('/assets/mc/kelly/poster.png');
  });
});
