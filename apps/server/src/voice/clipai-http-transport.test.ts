import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClipAiHttpTransport, type ClipAiHttpProfile } from './clipai-http-transport';
import { ClipAiTransportError } from './clipai-provider';

const profile: ClipAiHttpProfile = {
  baseUrl: 'https://api.example.test/',
  apiProvider: 'fake-provider',
  model: 'fake-model',
  voiceId: 'fake-voice',
  voiceSettings: { volume: 1 },
  allowedCdnHosts: ['cdn.example.test'],
};

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...Object.fromEntries(new Headers(headers)) } });
}

afterEach(() => vi.unstubAllGlobals());

describe('ClipAiHttpTransport với fetch giả', () => {
  it('gửi yêu cầu tổng hợp theo profile cục bộ và nhận mã tác vụ', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => json({ code: 0, status: 'success', data: { asset_id: 'job-local' } }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = new ClipAiHttpTransport(profile);
    const result = await transport.submit({ text: 'Câu kiểm tra.', voiceKey: 'internal', rate: 1, format: 'mp3' }, 'fake-token');
    const [url, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(result).toEqual({ jobId: 'job-local' });
    expect(String(url)).toBe('https://api.example.test/api/sound/generate');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer fake-token');
    expect(body).toMatchObject({ text: 'Câu kiểm tra.', model: 'fake-model', voice_actor_id: 'fake-voice' });
    expect(body).not.toHaveProperty('rate');
  });

  it('tra cứu trạng thái và audio qua danh sách tác vụ giả lập', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => json({ code: 0, status: 'success', data: {
      items: [{ id: 'job-local', status: 'success', url: 'https://cdn.example.test/audio', duration_ms: 1_500 }],
    } }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = new ClipAiHttpTransport(profile);
    await expect(transport.poll('job-local', 'fake-token')).resolves.toEqual({ status: 'SUCCEEDED' });
    await expect(transport.listAudio('job-local', 'fake-token')).resolves.toEqual([
      { assetRef: 'https://cdn.example.test/audio', durationMs: 1_500 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/api/sound/audio-list?');
  });

  it('nhận diện giới hạn tốc độ và hết hạn mức mà không trả nội dung provider', async () => {
    const rateLimited = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => json({ code: 1130, msg: 'Please retry after 2 seconds', data: {} }));
    vi.stubGlobal('fetch', rateLimited);
    const transport = new ClipAiHttpTransport(profile);
    await expect(transport.submit({ text: 'Câu kiểm tra.', voiceKey: 'internal', rate: 1, format: 'mp3' }, 'fake-token'))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterMs: 3_000 });
    expect(rateLimited).toHaveBeenCalledTimes(1);

    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response('limited', { status: 429, headers: { 'retry-after': '4' } })));
    await expect(transport.submit({ text: 'Câu kiểm tra.', voiceKey: 'internal', rate: 1, format: 'mp3' }, 'fake-token'))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterMs: 4_000 });

    const noCredit = new ClipAiHttpTransport(profile);
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      json({ code: 0, status: 'success', data: { items: [{ id: 'job-local', status: 'failed', provider_error: 'insufficient credit' }] } })));
    await expect(noCredit.poll('job-local', 'fake-token')).resolves.toEqual({ status: 'FAILED', code: 'NO_CREDIT' });
  });

  it('chỉ tải HTTPS từ host allowlist, không gắn token vào CDN và chặn redirect', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = new ClipAiHttpTransport(profile);
    await expect(transport.download('https://cdn.example.test/audio', 'fake-token')).resolves.toEqual(new Uint8Array([1, 2, 3]));
    const [, init] = fetchMock.mock.calls[0]!;
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
    expect(init?.redirect).toBe('error');
    await expect(transport.download('https://not-allowed.example.test/audio', 'fake-token'))
      .rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('từ chối audio quá giới hạn kích thước cache', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(new Uint8Array(), { status: 200, headers: { 'content-length': String(12 * 1024 * 1024 + 1) } })));
    await expect(new ClipAiHttpTransport(profile).download('https://cdn.example.test/large', 'fake-token'))
      .rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
  });

  it('chặn profile URL không mã hóa hoặc CDN wildcard/IP', () => {
    expect(() => new ClipAiHttpTransport({ ...profile, baseUrl: 'http://api.example.test/' })).toThrow();
    expect(() => new ClipAiHttpTransport({ ...profile, allowedCdnHosts: ['*.example.test'] })).toThrow();
    expect(() => new ClipAiHttpTransport({ ...profile, allowedCdnHosts: ['127.0.0.1'] })).toThrow();
  });
});
