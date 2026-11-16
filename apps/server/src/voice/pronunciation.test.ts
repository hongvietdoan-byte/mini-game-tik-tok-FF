import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadMcPronunciationDictionary, applyMcPronunciationDictionary } from './pronunciation';
import { McVoiceCache } from './cache';
import { McVoiceService } from './service';
import type { McVoiceAudio, McVoiceCredentialStore, McVoiceProvider } from './types';
import { MC_VOICE_POLICY_VERSION } from '@quiz/contracts';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('từ điển phát âm MC', () => {
  it('thay từ nguyên vẹn theo cờ không phân biệt hoa thường, không chạm từ dài hơn', () => {
    const speech = applyMcPronunciationDictionary('MVP, mVp và MVPs; tiếng Việt: rank!', [
      { from: 'mvp', to: 'em vi pi', caseInsensitive: true },
      { from: 'rank', to: 'hạng', caseInsensitive: false },
    ]);
    expect(speech).toBe('em vi pi, em vi pi và MVPs; tiếng Việt: hạng!');
    expect('MVP, mVp và MVPs; tiếng Việt: rank!').not.toBe(speech);
  });

  it('đọc ký hiệu đơn vị sát số thành cụm tách từ', () => {
    expect(applyMcPronunciationDictionary('3% và 50%', [{ from: '%', to: 'phần trăm', caseInsensitive: false }]))
      .toBe('3 phần trăm và 50 phần trăm');
  });

  it('bỏ qua dictionary hỏng và nạp cấu hình cục bộ hợp lệ', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mc-pronunciation-'));
    directories.push(root);
    const path = join(root, 'mc-pronunciation.json');
    await writeFile(path, JSON.stringify({ version: 1, entries: [{ from: 'BO5', to: 'bo năm', caseInsensitive: true }] }));
    const rules = await loadMcPronunciationDictionary(path);
    expect(applyMcPronunciationDictionary('BO5', rules)).toBe('bo năm');
    await writeFile(path, '{broken');
    await expect(loadMcPronunciationDictionary(path)).resolves.toEqual([]);
  });

  it('đưa text đã thay vào provider và cache key mà không nâng policy version', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mc-pronunciation-cache-'));
    directories.push(root);
    const cache = new McVoiceCache(root);
    const credentials: McVoiceCredentialStore = { get: vi.fn(async () => 'mock-token'), set: vi.fn(), clear: vi.fn() };
    const generated: string[] = [];
    const provider: McVoiceProvider = {
      synthesize: vi.fn(async ({ text }) => {
        generated.push(text);
        return { bytes: Buffer.from(text), durationMs: 300, format: 'mp3' } satisfies McVoiceAudio;
      }),
    };
    const normalizer = { normalize: vi.fn(async (audio: McVoiceAudio) => audio) };
    const descriptor = {
      text: 'MVP rank', voicePolicyVersion: MC_VOICE_POLICY_VERSION, voiceKey: 'mock-voice', provider: 'clipai' as const,
      model: 'mock-model', voiceSettings: { style: 'neutral' }, rate: 1, format: 'mp3' as const,
    };
    const request = { text: descriptor.text, voiceKey: descriptor.voiceKey, voiceSettings: descriptor.voiceSettings, rate: 1, format: 'mp3' as const };
    const first = new McVoiceService(provider, cache, credentials, normalizer, [
      { from: 'MVP', to: 'em vi pi', caseInsensitive: true },
    ]);
    const firstAsset = await first.getOrCreate(descriptor, request);
    const second = new McVoiceService(provider, cache, credentials, normalizer, [
      { from: 'MVP', to: 'mờ vê pê', caseInsensitive: true },
    ]);
    const secondAsset = await second.getOrCreate(descriptor, request);

    expect(generated).toEqual(['em vi pi rank', 'mờ vê pê rank']);
    expect(firstAsset.asset.assetId).not.toBe(secondAsset.asset.assetId);
    expect(MC_VOICE_POLICY_VERSION).toBe(3);
  });
});
