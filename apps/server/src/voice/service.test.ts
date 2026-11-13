import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { McVoiceCache, mcVoiceCacheKey } from './cache';
import { McVoiceService, type McVoiceReadingLine } from './service';
import { type McVoiceAudio, type McVoiceCredentialStore, type McVoiceProvider } from './types';
import { testTempRootAsync } from '../../../../tests/support/tempRoot';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

async function makeService(provider: McVoiceProvider, normalizer = { normalize: vi.fn(async (audio: McVoiceAudio) => audio) }) {
  const directory = await testTempRootAsync('mc-voice-service-test-');
  directories.push(directory);
  const cache = new McVoiceCache(directory);
  const credentials: McVoiceCredentialStore = { get: vi.fn(async () => 'test-secret'), set: vi.fn(), clear: vi.fn() };
  return { service: new McVoiceService(provider, cache, credentials, normalizer), cache, credentials, normalizer };
}

function line(index: number): McVoiceReadingLine {
  const text = `Câu/đáp án ${index}`;
  return {
    lineId: index === 0 ? 'prompt' : `option-${index}`,
    descriptor: {
      text,
      provider: 'clipai',
      model: 'runtime-model',
      voiceSettings: { voiceProfile: 'runtime-only', rate: 1 },
      rate: 1,
      format: 'mp3',
    },
    request: { text, voiceKey: 'runtime-only', rate: 1, format: 'mp3' },
  };
}

function audio(durationMs: number): McVoiceAudio {
  return { bytes: Buffer.from(`fake-${durationMs}`), durationMs, format: 'mp3' };
}

describe('McVoiceService', () => {
  it('cache hit không gọi provider lần nữa và service không trả token trong asset', async () => {
    const provider = { synthesize: vi.fn(async () => audio(1_000)) };
    const { service, credentials, normalizer } = await makeService(provider);
    const input = line(1);
    const first = await service.getOrCreate(input.descriptor, input.request);
    const second = await service.getOrCreate(input.descriptor, input.request);
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(provider.synthesize).toHaveBeenCalledTimes(1);
    expect(normalizer.normalize).toHaveBeenCalledTimes(1);
    expect(credentials.get).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(second)).not.toContain('test-secret');
  });

  it('tạo bundle câu hỏi tuần tự và không ghi bất kỳ line mới nào nếu tổng quá 20 giây', async () => {
    const provider = { synthesize: vi.fn(async () => audio(4_100)) };
    const { service, cache } = await makeService(provider);
    const lines = Array.from({ length: 5 }, (_, index) => line(index));
    const prepared = await service.prepareQuestionReading(lines);
    expect(prepared).toEqual({ ok: false, reason: 'TOO_LONG', totalDurationMs: 20_500 });
    expect(provider.synthesize).toHaveBeenCalledTimes(5);
    for (const item of lines) await expect(cache.get(mcVoiceCacheKey(item.descriptor))).resolves.toBeNull();
  });

  it('cho phép bundle đúng 20 giây và trả asset id, không trả audio bytes từ service', async () => {
    const durations = [3_000, 4_000, 4_000, 4_000, 5_000];
    let index = 0;
    const provider = { synthesize: vi.fn(async () => audio(durations[index++]!)) };
    const { service } = await makeService(provider);
    const result = await service.prepareQuestionReading(Array.from({ length: 5 }, (_, i) => line(i)));
    expect(result).toMatchObject({ ok: true, totalDurationMs: 20_000, lines: expect.any(Array) });
    if (result.ok) {
      expect(result.lines).toHaveLength(5);
      expect(result.lines.every((item) => !('bytes' in item.asset))).toBe(true);
    }
  });

  it('thiếu token dừng trước khi gọi provider', async () => {
    const provider = { synthesize: vi.fn(async () => audio(1_000)) };
    const { cache, normalizer } = await makeService(provider);
    const credentials: McVoiceCredentialStore = { get: vi.fn(async () => null), set: vi.fn(), clear: vi.fn() };
    const directory = await testTempRootAsync('mc-voice-auth-test-');
    directories.push(directory);
    const service = new McVoiceService(provider, new McVoiceCache(directory), credentials, normalizer);
    const input = line(1);
    await expect(service.getOrCreate(input.descriptor, input.request)).rejects.toMatchObject({ code: 'AUTH' });
    expect(provider.synthesize).not.toHaveBeenCalled();
  });
});
