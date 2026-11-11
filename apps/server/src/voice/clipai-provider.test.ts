import { describe, expect, it, vi } from 'vitest';
import {
  ClipAiMcVoiceProvider,
  ClipAiTransportError,
  type ClipAiTransport,
  type McVoiceClock,
} from './clipai-provider';
import { McVoiceProviderError, type McVoiceSynthesisRequest } from './types';

const request: McVoiceSynthesisRequest = { text: 'Đọc câu hỏi và bốn đáp án.', voiceKey: 'runtime-only', rate: 1, format: 'mp3' };

function fakeClock(): McVoiceClock & { sleeps: number[] } {
  let now = 0;
  const sleeps: number[] = [];
  return {
    sleeps,
    now: () => now,
    sleep: async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
  };
}

function transport(overrides: Partial<ClipAiTransport> = {}): ClipAiTransport {
  return {
    submit: vi.fn(async () => ({ jobId: 'job-1' })),
    poll: vi.fn(async () => ({ status: 'SUCCEEDED' as const })),
    listAudio: vi.fn(async () => [{ assetRef: 'internal-audio-ref', durationMs: 2_000 }]),
    download: vi.fn(async () => Buffer.from('fake-mp3')),
    ...overrides,
  };
}

describe('ClipAiMcVoiceProvider qua transport giả', () => {
  it('poll tác vụ tới thành công, liệt kê audio rồi tải bytes', async () => {
    const api = transport({ poll: vi.fn().mockResolvedValueOnce({ status: 'PROCESSING' }).mockResolvedValueOnce({ status: 'SUCCEEDED' }) });
    const clock = fakeClock();
    const provider = new ClipAiMcVoiceProvider(api, { clock, pollIntervalMs: 250 });
    const result = await provider.synthesize(request, 'secret-test-only');
    expect(result).toEqual({ bytes: Buffer.from('fake-mp3'), durationMs: 2_000, format: 'mp3' });
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(api.poll).toHaveBeenCalledTimes(2);
    expect(api.listAudio).toHaveBeenCalledTimes(1);
    expect(api.download).toHaveBeenCalledTimes(1);
    expect(clock.sleeps).toEqual([250]);
  });

  it('tôn trọng Retry-After cho lỗi 1130 mà không submit job lần hai', async () => {
    const api = transport({
      poll: vi.fn()
        .mockRejectedValueOnce(new ClipAiTransportError('RATE_LIMITED', 400))
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'SUCCEEDED' }),
    });
    const clock = fakeClock();
    const provider = new ClipAiMcVoiceProvider(api, { clock, pollIntervalMs: 50 });
    await expect(provider.synthesize(request, 'secret-test-only')).resolves.toMatchObject({ durationMs: 2_000 });
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(clock.sleeps).toEqual([400, 50]);
  });

  it('401 dừng ngay, job lỗi hết hạn mức không tải audio', async () => {
    const authTransport = transport({ submit: vi.fn().mockRejectedValue(new ClipAiTransportError('AUTH')) });
    await expect(new ClipAiMcVoiceProvider(authTransport).synthesize(request, 'secret-test-only'))
      .rejects.toMatchObject({ code: 'AUTH' });
    expect(authTransport.poll).not.toHaveBeenCalled();

    const creditTransport = transport({ poll: vi.fn().mockResolvedValue({ status: 'FAILED', code: 'NO_CREDIT' }) });
    await expect(new ClipAiMcVoiceProvider(creditTransport).synthesize(request, 'secret-test-only'))
      .rejects.toMatchObject({ code: 'NO_CREDIT' });
    expect(creditTransport.download).not.toHaveBeenCalled();
  });

  it('timeout không tự submit lại và lỗi tải audio được phân loại riêng', async () => {
    const api = transport({ poll: vi.fn().mockResolvedValue({ status: 'PROCESSING' }) });
    const clock = fakeClock();
    const timeoutProvider = new ClipAiMcVoiceProvider(api, { clock, timeoutMs: 100, pollIntervalMs: 50 });
    await expect(timeoutProvider.synthesize(request, 'secret-test-only'))
      .rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(api.submit).toHaveBeenCalledTimes(1);

    const failedDownload = transport({ download: vi.fn().mockRejectedValue(new ClipAiTransportError('DOWNLOAD_FAILED')) });
    await expect(new ClipAiMcVoiceProvider(failedDownload).synthesize(request, 'secret-test-only'))
      .rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
  });

  it('không nhận file dài hơn trần 20 giây hoặc audio rỗng', async () => {
    const longAudio = transport({ listAudio: vi.fn().mockResolvedValue([{ assetRef: 'internal', durationMs: 20_001 }]) });
    await expect(new ClipAiMcVoiceProvider(longAudio).synthesize(request, 'secret-test-only'))
      .rejects.toMatchObject({ code: 'TOO_LONG' });
    expect(longAudio.download).not.toHaveBeenCalled();

    const emptyAudio = transport({ download: vi.fn().mockResolvedValue(new Uint8Array()) });
    await expect(new ClipAiMcVoiceProvider(emptyAudio).synthesize(request, 'secret-test-only'))
      .rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
  });

  it('không đưa message transport ra lỗi công khai', async () => {
    const noisy = new Error('token=secret-test-only host=http://private.invalid');
    const api = transport({ submit: vi.fn().mockRejectedValue(noisy) });
    try {
      await new ClipAiMcVoiceProvider(api).synthesize(request, 'secret-test-only');
      throw new Error('đáng lẽ phải lỗi');
    } catch (error) {
      expect(error).toBeInstanceOf(McVoiceProviderError);
      expect((error as Error).message).not.toContain('secret-test-only');
      expect((error as Error).message).not.toContain('private.invalid');
    }
  });
});
