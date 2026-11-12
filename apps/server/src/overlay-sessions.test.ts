import { describe, expect, it } from 'vitest';
import { overlayAckPreflight } from './preflight-health';
import {
  recordOverlayAck,
  registerOverlaySession,
  removeOverlaySession,
  summarizeOverlaySessions,
  type OverlaySession,
} from './overlay-sessions';

function preflight(sessions: Map<object, OverlaySession>, nowMs = 10_000) {
  const summary = summarizeOverlaySessions(sessions);
  return overlayAckPreflight({
    clients: summary.clients,
    programClients: summary.programClients,
    ackVersion: summary.programAckStateVersion,
    expectedVersion: 7,
    nowMs,
    pendingSinceMs: 9_000,
  });
}

describe('preflight theo role của mỗi overlay connection', () => {
  it('không có overlay thì FAIL', () => {
    expect(preflight(new Map()).status).toBe('FAIL');
  });

  it('chỉ có preview thì WARN với thông báo LIVE Studio rõ ràng', () => {
    const sessions = new Map<object, OverlaySession>();
    const preview = {};
    registerOverlaySession(sessions, preview);
    recordOverlayAck(sessions, preview, { role: 'preview', stateVersion: 7 }, 9_500);
    const result = preflight(sessions);
    expect(result.status).toBe('WARN');
    expect(result.reason.toLowerCase()).toContain('chỉ thấy tab xem thử, chưa thấy nguồn trong live studio');
  });

  it('program ACK hiện hành thì PASS; preview không thể nâng quyền session program', () => {
    const sessions = new Map<object, OverlaySession>();
    const program = {};
    registerOverlaySession(sessions, program);
    expect(recordOverlayAck(sessions, program, { role: 'program', stateVersion: 7 }, 9_500)).toBe(true);
    expect(preflight(sessions).status).toBe('PASS');
    expect(recordOverlayAck(sessions, program, { role: 'preview', stateVersion: 7 }, 9_600)).toBe(false);
    expect(summarizeOverlaySessions(sessions).programClients).toBe(1);
  });

  it('chỉ lấy audioState của ACK mới nhất từ program, bỏ qua preview', () => {
    const sessions = new Map<object, OverlaySession>();
    const preview = {};
    const program = {};
    registerOverlaySession(sessions, preview);
    registerOverlaySession(sessions, program);
    recordOverlayAck(sessions, preview, { role: 'preview', stateVersion: 7, audioState: 'suspended' }, 9_400);
    recordOverlayAck(sessions, program, { role: 'program', stateVersion: 7, audioState: 'running' }, 9_500);
    expect(summarizeOverlaySessions(sessions).programAudioState).toBe('running');

    recordOverlayAck(sessions, program, { role: 'program', stateVersion: 6, audioState: 'unavailable' }, 9_600);
    expect(summarizeOverlaySessions(sessions).programAudioState).toBe('running');
    recordOverlayAck(sessions, program, { role: 'program', stateVersion: 8, audioState: 'suspended' }, 9_700);
    expect(summarizeOverlaySessions(sessions).programAudioState).toBe('suspended');
  });

  it('program ngắt kết nối thì preview còn lại không giữ PASS', () => {
    const sessions = new Map<object, OverlaySession>();
    const preview = {};
    const program = {};
    registerOverlaySession(sessions, preview);
    registerOverlaySession(sessions, program);
    recordOverlayAck(sessions, preview, { role: 'preview', stateVersion: 7 }, 9_500);
    recordOverlayAck(sessions, program, { role: 'program', stateVersion: 7 }, 9_500);
    expect(preflight(sessions).status).toBe('PASS');
    removeOverlaySession(sessions, program);
    const result = preflight(sessions);
    expect(result.status).toBe('WARN');
    expect(result.reason.toLowerCase()).toContain('chỉ thấy tab xem thử, chưa thấy nguồn trong live studio');
  });
});
