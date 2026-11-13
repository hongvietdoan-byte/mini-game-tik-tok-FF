import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { McVoiceCache, mcVoiceCacheKey } from './cache';
import type { McVoiceAudio, McVoiceCacheDescriptor } from './types';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

async function cache() {
  const directory = await mkdtemp(join(tmpdir(), 'mc-voice-cache-test-'));
  directories.push(directory);
  return { directory, cache: new McVoiceCache(directory) };
}

function descriptor(overrides: Partial<McVoiceCacheDescriptor> = {}): McVoiceCacheDescriptor {
  return {
    text: 'Câu hỏi thử nghiệm?',
    voicePolicyVersion: 1,
    provider: 'clipai',
    model: 'runtime-model',
    voiceSettings: { runtimeVoice: 'private-value', rate: 1 },
    rate: 1,
    format: 'mp3',
    ...overrides,
  };
}

function audio(durationMs = 1_500): McVoiceAudio {
  return { bytes: Buffer.from('fake-mp3-bytes'), durationMs, format: 'mp3' };
}

describe('McVoiceCache', () => {
  it('tạo key SHA-256 ổn định từ text chuẩn hoá và toàn bộ voice settings', () => {
    const first = descriptor({ text: '  Câu hỏi   thử nghiệm? ', voiceSettings: { b: 2, a: 'x' } });
    const same = descriptor({ text: 'Câu hỏi thử nghiệm?', voiceSettings: { a: 'x', b: 2 } });
    expect(mcVoiceCacheKey(first)).toBe(mcVoiceCacheKey(same));
    expect(mcVoiceCacheKey(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(mcVoiceCacheKey(first)).not.toContain('private-value');
    expect(mcVoiceCacheKey(first)).not.toBe(mcVoiceCacheKey(descriptor({ voiceSettings: { b: 2, a: 'y' } })));
  });

  it('ghi audio và metadata hạn chế quyền, kiểm checksum khi đọc; không lưu text/voice key', async () => {
    const { directory, cache: store } = await cache();
    const key = mcVoiceCacheKey(descriptor());
    const written = await store.put(key, audio());
    expect(written).toMatchObject({ assetId: key, durationMs: 1_500, format: 'mp3', sizeBytes: audio().bytes.byteLength });
    expect(await store.get(key)).toEqual(written);

    const metadata = await readFile(join(directory, key, 'metadata.json'), 'utf8');
    expect(metadata).not.toContain('Câu hỏi thử nghiệm');
    expect(metadata).not.toContain('private-value');

    await writeFile(join(directory, key, 'audio.mp3'), 'tampered');
    expect(await store.get(key)).toBeNull();
  });

  it('gom các lần ghi đồng thời cùng key để không làm hỏng cache', async () => {
    const { cache: store } = await cache();
    const key = mcVoiceCacheKey(descriptor());
    const [first, second] = await Promise.all([store.put(key, audio()), store.put(key, audio())]);
    expect(first.assetId).toBe(key);
    expect(second.assetId).toBe(key);
    await expect(store.get(key)).resolves.toMatchObject({ assetId: key, checksum: first.checksum });
  });

  it('từ chối asset id không an toàn và audio quá 20 giây', async () => {
    const { cache: store } = await cache();
    await expect(store.get('../escape')).resolves.toBeNull();
    await expect(store.put('../escape', audio())).rejects.toThrow('Cache key MC Voice không hợp lệ');
    await expect(store.put(mcVoiceCacheKey(descriptor()), audio(20_001))).rejects.toThrow('Audio vượt giới hạn');
  });

  it('bỏ qua cache cũ thiếu voicePolicyVersion để không phát lại audio theo policy cũ', async () => {
    const { directory, cache: store } = await cache();
    const assetId = 'a'.repeat(64);
    const entryDir = join(directory, assetId);
    const bytes = audio().bytes;
    await mkdir(entryDir);
    await writeFile(join(entryDir, 'audio.mp3'), bytes);
    await writeFile(join(entryDir, 'metadata.json'), JSON.stringify({
      assetId, durationMs: 1_500, format: 'mp3', checksum: 'b'.repeat(64), sizeBytes: bytes.byteLength,
    }));
    await expect(store.get(assetId)).resolves.toBeNull();
  });
});
