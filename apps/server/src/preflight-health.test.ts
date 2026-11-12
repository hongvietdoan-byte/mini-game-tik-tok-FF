import { describe, expect, it } from 'vitest';
import type { LiveSourceHealth } from '@quiz/contracts';
import { commentSourcePreflight, overlayAckPreflight, overlayAudioPreflight, OVERLAY_AUDIO_WARNING } from './preflight-health';

const connected: LiveSourceHealth = {
  source: 'TIKTOK', status: 'CONNECTED', connectedSinceMs: 1, detail: null, reconnects: 0,
  commentsReceived: 2, lastCommentAtMs: 9_800,
};

describe('preflight health', () => {
  it('F6: chỉ PASS nguồn TikTok khi có comment gần đây', () => {
    expect(commentSourcePreflight('TIKTOK', connected, 10_000).status).toBe('PASS');
    expect(commentSourcePreflight('TIKTOK', { ...connected, lastCommentAtMs: null }, 10_000).status).toBe('WARN');
    expect(commentSourcePreflight('TIKTOK', { ...connected, commentsReceived: 0 }, 10_000).status).toBe('WARN');
    expect(commentSourcePreflight('TIKTOK', { ...connected, lastCommentAtMs: 0 }, 5 * 60_000 + 1).status).toBe('WARN');
    expect(commentSourcePreflight('TIKTOK', { ...connected, lastCommentAtMs: 11_000 }, 10_000).status).toBe('WARN');
    expect(commentSourcePreflight('MOCK', { ...connected, source: 'MOCK' }, 10_000).status).toBe('WARN');
    expect(commentSourcePreflight('TIKTOK', { ...connected, status: 'DISCONNECTED' }, 10_000).status).toBe('FAIL');
  });

  it('F9: cảnh báo trong lúc ACK trễ ngắn hạn, chỉ fail sau grace period', () => {
    const pending = { clients: 1, programClients: 1, ackVersion: 2, expectedVersion: 3, pendingSinceMs: 1_000, nowMs: 2_999 };
    expect(overlayAckPreflight(pending).status).toBe('WARN');
    expect(overlayAckPreflight({ ...pending, nowMs: 3_000 }).status).toBe('FAIL');
    expect(overlayAckPreflight({ ...pending, ackVersion: 3 }).status).toBe('PASS');
    expect(overlayAckPreflight({ ...pending, clients: 0 }).status).toBe('FAIL');
  });

  it('cảnh báo âm thanh bị chặn, cho PASS khi đang phát hoặc tắt có chủ đích', () => {
    expect(overlayAudioPreflight('suspended')).toEqual({ status: 'WARN', reason: OVERLAY_AUDIO_WARNING });
    expect(overlayAudioPreflight('unavailable')).toEqual({ status: 'WARN', reason: OVERLAY_AUDIO_WARNING });
    expect(overlayAudioPreflight('running').status).toBe('PASS');
    expect(overlayAudioPreflight('disabled').status).toBe('PASS');
    expect(overlayAudioPreflight(null).status).toBe('WARN');
  });
});
