import { describe, expect, it } from 'vitest';
import type { AdminSnapshot, CommandBody } from '@quiz/contracts';
import { actionsFor, buildCommandEnvelope, commandErrorMessage, commandForAction } from './logic';

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
});
