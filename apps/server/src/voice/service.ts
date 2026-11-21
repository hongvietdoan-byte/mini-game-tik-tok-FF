import type { CachedMcVoiceAudio, McVoiceAudio, McVoiceCacheDescriptor, McVoiceProvider, McVoiceSynthesisRequest, McVoiceCredentialStore } from './types';
import { McVoiceProviderError } from './types';
import { McVoiceCache, mcVoiceCacheKey } from './cache';
import { MAX_MC_VOICE_ASSET_MS, MC_VOICE_POLICY_VERSION, McVoiceEventSchema, type McVoiceEvent } from '@quiz/contracts';
import { applyMcPronunciationDictionary, type McPronunciationRule } from './pronunciation';

export interface McVoiceAudioNormalizer {
  normalize(audio: McVoiceAudio, signal?: AbortSignal, maxDurationMs?: number): Promise<McVoiceAudio>;
}

export type McVoiceReadingLine = {
  /** Event đã qua schema allowlist; không chứa tên/ID/điểm người chơi. */
  gameEvent: McVoiceEvent;
  lineId: string;
  descriptor: McVoiceCacheDescriptor;
  request: McVoiceSynthesisRequest;
};

function canonicalVoiceSettings(value: Readonly<Record<string, string | number | boolean>>) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
}

export type McVoiceReadingBundle =
  | { ok: true; totalDurationMs: number; lines: Array<{ lineId: string; asset: Omit<CachedMcVoiceAudio, 'bytes'>; cacheHit: boolean }> }
  | { ok: false; reason: 'TOO_LONG'; totalDurationMs: number };

export class McVoiceService {
  constructor(
    private readonly provider: McVoiceProvider,
    private readonly cache: McVoiceCache,
    private readonly credentials: McVoiceCredentialStore,
    private readonly normalizer: McVoiceAudioNormalizer,
    private readonly pronunciationRules: readonly McPronunciationRule[] = [],
  ) {}

  /** Text chỉ dành cho provider/cache; nội dung hiển thị không đi qua hàm này. */
  prepareSynthesisText(text: string) {
    return applyMcPronunciationDictionary(text, this.pronunciationRules);
  }

  async getOrCreate(
    descriptor: McVoiceCacheDescriptor,
    request: McVoiceSynthesisRequest,
    signal?: AbortSignal,
    maxDurationMs = MAX_MC_VOICE_ASSET_MS,
  ): Promise<{ asset: CachedMcVoiceAudio; cacheHit: boolean }> {
    if (descriptor.voicePolicyVersion !== MC_VOICE_POLICY_VERSION)
      throw new McVoiceProviderError('INVALID_RESPONSE', 'Voice policy version MC Voice không được hỗ trợ.');
    if (descriptor.text !== request.text || descriptor.voiceKey !== request.voiceKey ||
      canonicalVoiceSettings(descriptor.voiceSettings) !== canonicalVoiceSettings(request.voiceSettings))
      throw new McVoiceProviderError('INVALID_RESPONSE', 'Nội dung MC Voice không khớp cache key.');
    const speechText = this.prepareSynthesisText(descriptor.text);
    descriptor = { ...descriptor, text: speechText };
    request = { ...request, text: speechText };
    const assetId = mcVoiceCacheKey(descriptor);
    const cached = await this.cache.get(assetId, maxDurationMs);
    if (cached) return { asset: cached, cacheHit: true };

    const normalized = await this.generate(request, signal, maxDurationMs);
    return { asset: await this.cache.put(assetId, normalized, maxDurationMs), cacheHit: false };
  }

  /** Chuẩn bị prompt + bốn đáp án tuần tự; bundle dài vẫn được lưu để runtime kéo dài READING. */
  async prepareQuestionReading(lines: readonly McVoiceReadingLine[], signal?: AbortSignal): Promise<McVoiceReadingBundle> {
    if (lines.length !== 5 || new Set(lines.map((line) => line.lineId)).size !== 5)
      throw new McVoiceProviderError('INVALID_RESPONSE', 'Gói đọc MC cần một prompt và bốn đáp án duy nhất.');

    const prepared: Array<{
      lineId: string;
      assetId: string;
      cached: CachedMcVoiceAudio | null;
      audio: McVoiceAudio | null;
    }> = [];
    let totalDurationMs = 0;
    let token: string | null = null;
    let credentialsLoaded = false;
    for (const line of lines) {
      const parsedEvent = McVoiceEventSchema.safeParse(line.gameEvent);
      if (!parsedEvent.success || parsedEvent.data.type !== 'QUESTION')
        throw new McVoiceProviderError('INVALID_RESPONSE', 'Sự kiện MC Voice không nằm trong allowlist câu hỏi đã duyệt.');
      if (line.descriptor.voicePolicyVersion !== MC_VOICE_POLICY_VERSION)
        throw new McVoiceProviderError('INVALID_RESPONSE', 'Voice policy version MC Voice không được hỗ trợ.');
      if (line.descriptor.text !== line.request.text || line.descriptor.voiceKey !== line.request.voiceKey ||
        canonicalVoiceSettings(line.descriptor.voiceSettings) !== canonicalVoiceSettings(line.request.voiceSettings))
        throw new McVoiceProviderError('INVALID_RESPONSE', 'Nội dung MC Voice không khớp cache key.');
      const speechText = this.prepareSynthesisText(line.descriptor.text);
      const descriptor = { ...line.descriptor, text: speechText };
      const request = { ...line.request, text: speechText };
      const assetId = mcVoiceCacheKey(descriptor);
      const cached = await this.cache.get(assetId, MAX_MC_VOICE_ASSET_MS);
      if (cached) {
        totalDurationMs += cached.durationMs;
        prepared.push({ lineId: line.lineId, assetId, cached, audio: null });
        continue;
      }
      if (!credentialsLoaded) {
        token = await this.credentials.get();
        credentialsLoaded = true;
      }
      if (!token) throw new McVoiceProviderError('AUTH', 'Chưa cấu hình thông tin xác thực MC Voice.');
      const audio = await this.generate(request, signal, MAX_MC_VOICE_ASSET_MS, token);
      totalDurationMs += audio.durationMs;
      prepared.push({ lineId: line.lineId, assetId, cached: null, audio });
    }

    const output: Array<{ lineId: string; asset: Omit<CachedMcVoiceAudio, 'bytes'>; cacheHit: boolean }> = [];
    for (const line of prepared) {
      const asset = line.cached ?? await this.cache.put(line.assetId, line.audio!, MAX_MC_VOICE_ASSET_MS);
      const { bytes: _bytes, ...metadata } = asset;
      output.push({ lineId: line.lineId, asset: metadata, cacheHit: !!line.cached });
    }
    return { ok: true, totalDurationMs, lines: output };
  }

  private async generate(request: McVoiceSynthesisRequest, signal?: AbortSignal, maxDurationMs = MAX_MC_VOICE_ASSET_MS, knownToken?: string): Promise<McVoiceAudio> {
    const token = knownToken ?? await this.credentials.get();
    if (!token) throw new McVoiceProviderError('AUTH', 'Chưa cấu hình thông tin xác thực MC Voice.');
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const generated = await this.provider.synthesize(request, token, signal, maxDurationMs);
        const normalized = await this.normalizer.normalize(generated, signal, maxDurationMs);
        if (normalized.durationMs > maxDurationMs)
          throw new McVoiceProviderError('TOO_LONG', `Audio MC Voice vượt trần ${maxDurationMs / 1_000} giây.`);
        return normalized;
      } catch (error) {
        lastError = error;
        const code = error instanceof McVoiceProviderError ? error.code : null;
        if (signal?.aborted || attempt === 2 || code === 'AUTH' || code === 'NO_CREDIT' || code === 'INVALID_RESPONSE' || code === 'TOO_LONG')
          throw error;
      }
    }
    throw lastError;
  }
}
