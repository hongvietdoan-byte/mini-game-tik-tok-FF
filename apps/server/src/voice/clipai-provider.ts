import { MAX_MC_READING_MS } from '@quiz/contracts';
import { McVoiceProviderError, type McVoiceAudio, type McVoiceProvider, type McVoiceSynthesisRequest } from './types';

export type ClipAiTransportErrorCode = 'AUTH' | 'NO_CREDIT' | 'RATE_LIMITED' | 'FAILED' | 'DOWNLOAD_FAILED';

/** HTTP transport nhận endpoint và tham số cấu hình từ profile riêng ngoài repository. */
export interface ClipAiTransport {
  submit(input: McVoiceSynthesisRequest, token: string, signal?: AbortSignal): Promise<{ jobId: string }>;
  poll(jobId: string, token: string, signal?: AbortSignal): Promise<
    | { status: 'PROCESSING' }
    | { status: 'SUCCEEDED' }
    | { status: 'FAILED'; code?: 'NO_CREDIT' | 'FAILED' }
  >;
  listAudio(jobId: string, token: string, signal?: AbortSignal): Promise<Array<{ assetRef: string; durationMs: number }>>;
  download(assetRef: string, token: string, signal?: AbortSignal): Promise<Uint8Array>;
}

export class ClipAiTransportError extends Error {
  constructor(readonly code: ClipAiTransportErrorCode, readonly retryAfterMs?: number) {
    // Không giữ message từ HTTP/provider vì có thể chứa token, URL hoặc dữ liệu không công khai.
    super('Yêu cầu tạo giọng MC thất bại.');
    this.name = 'ClipAiTransportError';
  }
}

export type McVoiceClock = {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
};

const realClock: McVoiceClock = {
  now: () => Date.now(),
  sleep: (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new McVoiceProviderError('FAILED', 'Yêu cầu đọc MC đã bị huỷ.'));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new McVoiceProviderError('FAILED', 'Yêu cầu đọc MC đã bị huỷ.'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) return onAbort();
    timer = setTimeout(() => {
      cleanup();
      resolve();
    }, Math.max(0, ms));
  }),
};

const MAX_RATE_LIMIT_RETRIES = 3;

function mapTransportError(error: unknown): McVoiceProviderError {
  if (error instanceof McVoiceProviderError) return error;
  if (error instanceof ClipAiTransportError) {
    if (error.code === 'AUTH') return new McVoiceProviderError('AUTH', 'Thông tin xác thực MC Voice không hợp lệ.');
    if (error.code === 'NO_CREDIT') return new McVoiceProviderError('NO_CREDIT', 'Nhà cung cấp MC Voice hết hạn mức.');
    if (error.code === 'RATE_LIMITED')
      return new McVoiceProviderError('RATE_LIMITED', 'Nhà cung cấp MC Voice đang giới hạn tốc độ.', error.retryAfterMs);
    if (error.code === 'DOWNLOAD_FAILED') return new McVoiceProviderError('DOWNLOAD_FAILED', 'Không tải được audio MC Voice.');
  }
  return new McVoiceProviderError('FAILED', 'Nhà cung cấp MC Voice xử lý thất bại.');
}

export class ClipAiMcVoiceProvider implements McVoiceProvider {
  constructor(
    private readonly transport: ClipAiTransport,
    private readonly options: { clock?: McVoiceClock; timeoutMs?: number; pollIntervalMs?: number } = {},
  ) {}

  async synthesize(input: McVoiceSynthesisRequest, token: string, signal?: AbortSignal): Promise<McVoiceAudio> {
    if (!token.trim()) throw new McVoiceProviderError('AUTH', 'Chưa cấu hình thông tin xác thực MC Voice.');
    if (!input.text.trim() || input.text.length > 1_000 || !input.voiceKey.trim() || !Number.isFinite(input.rate) || input.rate <= 0 || input.format !== 'mp3')
      throw new McVoiceProviderError('INVALID_RESPONSE', 'Yêu cầu tạo audio MC Voice không hợp lệ.');

    const clock = this.options.clock ?? realClock;
    const timeoutMs = this.options.timeoutMs ?? 45_000;
    const pollIntervalMs = this.options.pollIntervalMs ?? 750;
    const deadline = clock.now() + timeoutMs;
    const withRateLimitRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
      for (let retry = 0; ; retry += 1) {
        try {
          return await operation();
        } catch (error) {
          const mapped = mapTransportError(error);
          if (mapped.code !== 'RATE_LIMITED') throw mapped;
          const retryAfter = mapped.retryAfterMs;
          if (retry >= MAX_RATE_LIMIT_RETRIES || !Number.isFinite(retryAfter) || retryAfter! < 0)
            throw new McVoiceProviderError('RATE_LIMITED', 'Nhà cung cấp MC Voice chưa cho phép thử lại.');
          if (clock.now() + retryAfter! >= deadline)
            throw new McVoiceProviderError('TIMEOUT', 'Hết thời gian chờ tạo audio MC Voice.');
          await clock.sleep(retryAfter!, signal);
        }
      }
    };
    let jobId: string;
    try {
      const submitted = await withRateLimitRetry(() => this.transport.submit(input, token, signal));
      if (!submitted.jobId || submitted.jobId.length > 200) throw new McVoiceProviderError('INVALID_RESPONSE', 'Mã tác vụ MC Voice không hợp lệ.');
      jobId = submitted.jobId;
    } catch (error) {
      throw mapTransportError(error);
    }

    let complete = false;
    while (!complete) {
      if (signal?.aborted) throw new McVoiceProviderError('FAILED', 'Yêu cầu đọc MC đã bị huỷ.');
      if (clock.now() >= deadline) throw new McVoiceProviderError('TIMEOUT', 'Hết thời gian chờ tạo audio MC Voice.');
      try {
        const job = await withRateLimitRetry(() => this.transport.poll(jobId, token, signal));
        if (job.status === 'FAILED')
          throw new McVoiceProviderError(job.code === 'NO_CREDIT' ? 'NO_CREDIT' : 'FAILED', 'Tác vụ MC Voice không hoàn tất.');
        complete = job.status === 'SUCCEEDED';
      } catch (error) {
        throw mapTransportError(error);
      }
      if (!complete) await clock.sleep(Math.min(pollIntervalMs, Math.max(0, deadline - clock.now())), signal);
    }

    let items: Array<{ assetRef: string; durationMs: number }>;
    try {
      items = await withRateLimitRetry(() => this.transport.listAudio(jobId, token, signal));
    } catch (error) {
      throw mapTransportError(error);
    }
    const audioItem = items.find((item) => typeof item.assetRef === 'string' && item.assetRef.length > 0);
    if (!audioItem || !Number.isSafeInteger(audioItem.durationMs) || audioItem.durationMs <= 0)
      throw new McVoiceProviderError('INVALID_RESPONSE', 'Không có audio hợp lệ cho tác vụ MC Voice.');
    if (audioItem.durationMs > MAX_MC_READING_MS)
      throw new McVoiceProviderError('TOO_LONG', 'Audio MC Voice vượt trần 20 giây.');

    let bytes: Uint8Array;
    try {
      bytes = await withRateLimitRetry(() => this.transport.download(audioItem.assetRef, token, signal));
    } catch (error) {
      const mapped = mapTransportError(error);
      throw mapped.code === 'FAILED'
        ? new McVoiceProviderError('DOWNLOAD_FAILED', 'Không tải được audio MC Voice.')
        : mapped;
    }
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0)
      throw new McVoiceProviderError('DOWNLOAD_FAILED', 'Audio MC Voice tải về rỗng.');
    return { bytes, durationMs: audioItem.durationMs, format: 'mp3' };
  }
}
