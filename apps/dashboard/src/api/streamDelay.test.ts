import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';

describe('Dashboard API: bù độ trễ LIVE', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gửi PATCH có token, mode và mức thủ công tới phiên đang mở', async () => {
    const streamDelay = { mode: 'MANUAL' as const, nextQuestionDelayMs: 3_500, activeQuestionDelayMs: 2_000, manualDelayMs: 3_500 };
    const fetchMock = vi.fn<typeof fetch>(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, streamDelay }) }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.updateStreamDelaySettings('admin-secret', 'session /1', { mode: 'MANUAL', manualDelayMs: 3_500 }))
      .resolves.toEqual({ ok: true, streamDelay });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/sessions/session%20%2F1/stream-delay');
    const request = fetchMock.mock.calls[0];
    expect(request?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ mode: 'MANUAL', manualDelayMs: 3_500 }),
    });
    const headers = new Headers(request?.[1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer admin-secret');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('trả lỗi API rõ khi server báo phiên đã đóng', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ code: 'SESSION_CLOSED', message: 'Phiên đã đóng.' }),
    }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.updateStreamDelaySettings('admin-secret', 'closed-session', { mode: 'AUTO' }))
      .rejects.toMatchObject({ status: 409, code: 'SESSION_CLOSED', message: 'Phiên đã đóng.' });
  });
});
