import { describe, expect, it } from 'vitest';
import type { AdminSnapshot, CommandBody } from '@quiz/contracts';
import {
  actionsFor,
  buildCommandEnvelope,
  checkStatusTone,
  commandErrorMessage,
  commandForAction,
  connectionStatusLabel,
  connectionStatusTone,
  formatTimeAgo,
  hasSilentAcceptingWarning,
  overlayUrlFromLocation,
  overlayUrlForRole,
  shouldAcceptSnapshotSeq,
} from './logic';

function snapshot(state: AdminSnapshot['public']['state'] = 'LOBBY'): AdminSnapshot {
  return {
    public: { stateVersion: 17, state } as AdminSnapshot['public'],
    sessionStatus: 'OPEN',
    autoMode: false,
    recoveryPending: false,
    suspendedFrom: null,
    config: { questionsPerRound: 20 } as AdminSnapshot['config'],
    current: null,
    metrics: {} as AdminSnapshot['metrics'],
    recentRejections: [],
    pool: {} as AdminSnapshot['pool'],
    simulator: null,
    error: null,
    live: {} as AdminSnapshot['live'],
    overlay: { clients: 0, lastAckStateVersion: null, lastAckAtMs: null },
  };
}

describe('dashboard command logic', () => {
  it('builds an envelope from the displayed version and keeps a command id for retry', () => {
    const envelope = buildCommandEnvelope(snapshot(), { type: 'OPEN_LOBBY' }, ' host ', 'fixed-command-id', 1234);
    expect(envelope).toEqual({
      commandId: 'fixed-command-id', expectedStateVersion: 17, operatorId: 'host', requestedAtMs: 1234,
      command: { type: 'OPEN_LOBBY' },
    });
    const retryEnvelope = envelope;
    expect(retryEnvelope.commandId).toBe(envelope.commandId);
  });

  it('maps game state to available normal controls and hides them during recovery', () => {
    expect(actionsFor(snapshot('IDLE')).map((action) => action.type)).toEqual(['OPEN_LOBBY']);
    expect(actionsFor(snapshot('LOBBY')).map((action) => action.type)).toContain('START_ROUND');
    expect(actionsFor(snapshot('ACCEPTING')).map((action) => action.type)).toEqual(['PAUSE']);
    expect(actionsFor(snapshot('PAUSED')).map((action) => action.type)).toEqual(['RESUME']);
    expect(actionsFor({ ...snapshot('ACCEPTING'), recoveryPending: true })).toEqual([]);
  });

  it('creates session-sized commands and requires explicit reasons for dangerous commands', () => {
    expect(commandForAction({ type: 'START_ROUND', label: 'Bắt đầu' }, snapshot(), undefined)).toEqual({
      type: 'START_ROUND', questionCount: 20, reason: undefined,
    });
    expect(commandForAction({ type: 'VOID_QUESTION', label: 'Huỷ', danger: true }, snapshot(), 'Câu lỗi')).toEqual({
      type: 'VOID_QUESTION', reason: 'Câu lỗi',
    });
    const auto = commandForAction({ type: 'SET_AUTO_MODE', label: 'Auto' }, snapshot(), undefined, true) as CommandBody;
    expect(auto).toEqual({ type: 'SET_AUTO_MODE', enabled: true });
  });

  it('shows the stale-state message without generating an automatic retry', () => {
    expect(commandErrorMessage(409, 'stale')).toContain('xem lại rồi bấm lại');
    expect(commandErrorMessage(422, 'Thiếu câu đã duyệt.')).toBe('Thiếu câu đã duyệt.');
  });

  it('rejects stale websocket seq values and accepts a fresh server run on reconnect', () => {
    expect(shouldAcceptSnapshotSeq(14, 13)).toBe(false);
    expect(shouldAcceptSnapshotSeq(14, 14)).toBe(false);
    expect(shouldAcceptSnapshotSeq(14, 1, true)).toBe(true);
  });

  it('maps system and connection statuses to visible tones and labels', () => {
    expect(checkStatusTone('PASS')).toBe('pass');
    expect(checkStatusTone('FAIL')).toBe('fail');
    expect(checkStatusTone('NOT_TESTED')).toBe('not-tested');
    expect(connectionStatusLabel('RECONNECTING')).toBe('Đang kết nối lại');
    expect(connectionStatusTone('CONNECTED')).toBe('pass');
    expect(connectionStatusTone('BLOCKED')).toBe('fail');
  });

  it('formats comment age and warns only after 10 seconds while accepting', () => {
    expect(formatTimeAgo(null, 20_000)).toBe('Chưa có bình luận');
    expect(formatTimeAgo(19_500, 20_000)).toBe('Vừa xong');
    expect(formatTimeAgo(18_500, 20_000)).toBe('1 giây trước');
    expect(hasSilentAcceptingWarning('ACCEPTING', null, 10_000, 20_000)).toBe(false);
    expect(hasSilentAcceptingWarning('ACCEPTING', null, 10_000, 20_001)).toBe(true);
    expect(hasSilentAcceptingWarning('PREPARE', null, 0, 20_001)).toBe(false);
  });

  it('builds overlay URLs from the current app origin for dev and packaged routes', () => {
    expect(overlayUrlFromLocation('http://127.0.0.1:5173/?mock=1')).toBe('http://127.0.0.1:5174/');
    expect(overlayUrlFromLocation('http://127.0.0.1:8787/dashboard/?tab=obs')).toBe('http://127.0.0.1:8787/overlay/');
  });

  it('adds a program role for the live source and keeps preview as the default URL', () => {
    expect(overlayUrlForRole('http://127.0.0.1:8787/overlay/', 'program')).toBe('http://127.0.0.1:8787/overlay/?role=program');
    expect(overlayUrlForRole('http://127.0.0.1:8787/overlay/?role=program', 'preview')).toBe('http://127.0.0.1:8787/overlay/');
  });
});
