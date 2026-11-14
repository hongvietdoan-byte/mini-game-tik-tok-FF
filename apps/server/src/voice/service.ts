import type { CachedMcVoiceAudio, McVoiceAudio, McVoiceCacheDescriptor, McVoiceProvider, McVoiceSynthesisRequest, McVoiceCredentialStore } from './types';
import { McVoiceProviderError } from './types';
import { McVoiceCache, mcVoiceCacheKey } from './cache';
import { MAX_MC_READING_MS, MC_VOICE_POLICY_VERSION, McVoiceEventSchema, type McVoiceEvent } from '@quiz/contracts';

export interface McVoiceAudioNormalizer {
  normalize(audio: McVoiceAudio, signal?: AbortSignal): Promise<McVoiceAudio>;
}

export type McVoiceReadingLine = {
  /** Event đã qua schema allowlist; không chứa tên/ID/điểm người chơi. */
  gameEvent: McVoiceEvent;
  lineId: string;
  descriptor: McVoiceCacheDescriptor;
  request: McVoiceSynthesisRequest;
};

export type McVoiceReadingBundle =
  | { ok: true; totalDurationMs: number; lines: Array<{ lineId: string; asset: Omit<CachedMcVoiceAudio, 'bytes'>; cacheHit: boolean }> }
  | { ok: false; reason: 'TOO_LONG'; totalDurationMs: number };

export class McVoiceService {
  constructor(
    private readonly provider: McVoiceProvider,
    private readonly cache: McVoiceCache,
    private readonly credentials: McVoiceCredentialStore,
    private readonly normalizer: McVoiceAudioNormalizer,
  ) {}

  async getOrCreate(
    descriptor: McVoiceCacheDescriptor,
    request: McVoiceSynthesisRequest,
    signal?: AbortSignal,
  ): Promise<{ asset: CachedMcVoiceAudio; cacheHit: boolean }> {
    if (descriptor.voicePolicyVersion !== MC_VOICE_POLICY_VERSION)
      throw new McVoiceProviderError('INVALID_RESPONSE', 'Voice policy version MC Voice không được hỗ trợ.');
    if (descriptor.text !== request.text)
      throw new McVoiceProviderError('INVALID_RESPONSE', 'Nội dung MC Voice không khớp cache key.');
    const assetId = mcVoiceCacheKey(descriptor);
    const cached = await this.cache.get(assetId);
    if (cached) return { asset: cached, cacheHit: true };

    const normalized = await this.generate(request, signal);
    return { asset: await this.cache.put(assetId, normalized), cacheHit: false };
  }

  /** Chuẩn bị prompt + bốn đáp án tuần tự; không lưu audio mới nếu tổng thời lượng vượt trần. */
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
      if (line.descriptor.text !== line.request.text)
        throw new McVoiceProviderError('INVALID_RESPONSE', 'Nội dung MC Voice không khớp cache key.');
      const assetId = mcVoiceCacheKey(line.descriptor);
      const cached = await this.cache.get(assetId);
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
      const audio = await this.generate(line.request, signal, token);
      totalDurationMs += audio.durationMs;
      prepared.push({ lineId: line.lineId, assetId, cached: null, audio });
    }

    if (totalDurationMs > MAX_MC_READING_MS) return { ok: false, reason: 'TOO_LONG', totalDurationMs };
    const output: Array<{ lineId: string; asset: Omit<CachedMcVoiceAudio, 'bytes'>; cacheHit: boolean }> = [];
    for (const line of prepared) {
      const asset = line.cached ?? await this.cache.put(line.assetId, line.audio!);
      const { bytes: _bytes, ...metadata } = asset;
      output.push({ lineId: line.lineId, asset: metadata, cacheHit: !!line.cached });
    }
    return { ok: true, totalDurationMs, lines: output };
  }

  private async generate(request: McVoiceSynthesisRequest, signal?: AbortSignal, knownToken?: string): Promise<McVoiceAudio> {
    const token = knownToken ?? await this.credentials.get();
    if (!token) throw new McVoiceProviderError('AUTH', 'Chưa cấu hình thông tin xác thực MC Voice.');
    const generated = await this.provider.synthesize(request, token, signal);
    return this.normalizer.normalize(generated, signal);
  }
}
