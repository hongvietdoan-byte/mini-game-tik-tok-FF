import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS, GameStateSchema, type AdminSnapshot, type CommandBody, type CommandType, type GameState } from '@quiz/contracts';
import { createInitialState, transition, type EngineInput, type EngineState } from '@quiz/quiz-core';
import {
  actionsFor,
  buildCommandEnvelope,
  canRetryStaleCommand,
  checkStatusTone,
  commandErrorMessage,
  commandForAction,
  connectionStatusLabel,
  connectionStatusTone,
  formatTimeAgo,
  formatRetryWait,
  hasHighSourceLatencyWarning,
  hasSilentAcceptingWarning,
  overlayUrlFromLocation,
  overlayUrlForRole,
  shouldAcceptSnapshotSeq,
} from './logic';

function snapshot(state: AdminSnapshot['public']['state'] = 'LOBBY'): AdminSnapshot {
  return {
    public: { stateVersion: 17, state } as AdminSnapshot['public'],
    flaggedPlayers: [],
    sessionStatus: 'OPEN',
    autoMode: false,
    autoStartWhenAudienceFull: false,
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

function engineStateFor(state: GameState): EngineState {
  const initial = createInitialState({
    sessionId: 'dashboard-actions', mode: 'MOCK', timings: DEFAULT_TIMINGS,
    leaderboardInterval: 5, speedMultiplier: 1,
  });
  const needsRound = ['PREPARE', 'READING', 'ACCEPTING', 'REVEAL', 'LEADERBOARD', 'ROUND_END', 'VICTORY', 'INTERMISSION', 'PAUSED'].includes(state);
  const needsTimer = ['LOBBY', 'PREPARE', 'READING', 'ACCEPTING', 'REVEAL', 'LEADERBOARD', 'ROUND_END', 'VICTORY', 'INTERMISSION'].includes(state);
  return {
    ...initial,
    state,
    connectionOk: state !== 'CONNECTION_INTERRUPTED',
    timer: needsTimer ? { durationMs: 1_000, remainingMs: 1_000, deadlineMs: 1_000 } : null,
    round: needsRound ? {
      roundId: 'dashboard-round', roundNumber: 1, questionInstanceIds: ['dashboard-question'],
      questionIndex: 0, closed: state === 'LEADERBOARD' || state === 'ROUND_END' || state === 'VICTORY' || state === 'INTERMISSION' ? ['dashboard-question'] : [],
      voided: [],
    } : null,
    suspended: state === 'PAUSED'
      ? { from: 'ACCEPTING', kind: 'PAUSE' }
      : state === 'CONNECTION_INTERRUPTED' ? { from: 'ACCEPTING', kind: 'CONNECTION' } : null,
    error: state === 'ERROR' ? { code: 'E2E_ERROR', message: 'e2e' } : null,
  };
}

function commandResultFor(state: GameState, command: CommandType) {
  const engine = engineStateFor(state);
  const input: EngineInput = {
    kind: 'COMMAND',
    expectedStateVersion: engine.stateVersion,
    command: command === 'SET_AUTO_MODE' ? { type: command, enabled: true } : { type: command } as CommandBody,
    ...(command === 'START_ROUND' ? {
      preparedRound: { roundId: 'prepared', roundNumber: 1, questionInstanceIds: ['prepared-question'] },
    } : {}),
  };
  return transition(engine, input, 0);
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

  it('chỉ đưa nút điều khiển hợp lệ theo transition engine ở mọi trạng thái', () => {
    for (const state of GameStateSchema.options) {
      for (const action of actionsFor(snapshot(state))) {
        expect(commandResultFor(state, action.type).ok, `${state}/${action.type}`).toBe(true);
      }
    }
    expect(actionsFor(snapshot('READING')).map(({ type }) => type)).toEqual(['PAUSE']);
    expect(actionsFor(snapshot('ROUND_END')).map(({ type }) => type)).toEqual(['MANUAL_NEXT']);
  });

  it('chỉ retry stale cho lệnh an toàn khi engine vẫn chấp nhận ở trạng thái mới', () => {
    const safeCommands: CommandType[] = ['PAUSE', 'RESUME', 'MANUAL_NEXT', 'NEXT_ROUND', 'SET_AUTO_MODE'];
    for (const state of GameStateSchema.options) {
      const current = snapshot(state);
      const currentSnapshot: AdminSnapshot = {
        ...current,
        public: { ...current.public, state, connection: state === 'CONNECTION_INTERRUPTED' ? 'BLOCKED' : 'CONNECTED' },
        suspendedFrom: state === 'PAUSED' || state === 'CONNECTION_INTERRUPTED' ? 'ACCEPTING' : null,
      };
      for (const command of safeCommands) {
        expect(canRetryStaleCommand(command, currentSnapshot), `${state}/${command}`)
          .toBe(commandResultFor(state, command).ok);
      }
    }
    expect(canRetryStaleCommand('STOP', snapshot('LOBBY'))).toBe(false);
    expect(canRetryStaleCommand('PAUSE', { ...snapshot('PREPARE'), recoveryPending: true })).toBe(false);
    expect(canRetryStaleCommand('NEXT_ROUND', { ...snapshot('VICTORY'), sessionStatus: 'CLOSED' })).toBe(false);
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
    expect(shouldAcceptSnapshotSeq(14, 1, false, true)).toBe(true);
  });

  it('maps system and connection statuses to visible tones and labels', () => {
    expect(checkStatusTone('PASS')).toBe('pass');
    expect(checkStatusTone('FAIL')).toBe('fail');
    expect(checkStatusTone('NOT_TESTED')).toBe('not-tested');
    expect(connectionStatusLabel('RECONNECTING')).toBe('Đang kết nối lại');
    expect(connectionStatusTone('CONNECTED')).toBe('pass');
    expect(connectionStatusTone('BLOCKED')).toBe('fail');
  });

  it('formats comment age and warns after five seconds / high p95 only while accepting', () => {
    expect(formatTimeAgo(null, 20_000)).toBe('Chưa có bình luận');
    expect(formatTimeAgo(19_500, 20_000)).toBe('Vừa xong');
    expect(formatTimeAgo(18_500, 20_000)).toBe('1 giây trước');
    expect(hasSilentAcceptingWarning('ACCEPTING', null, 10_000, 15_000)).toBe(false);
    expect(hasSilentAcceptingWarning('ACCEPTING', null, 10_000, 15_001)).toBe(true);
    expect(hasSilentAcceptingWarning('PREPARE', null, 0, 15_001)).toBe(false);
    expect(hasHighSourceLatencyWarning('ACCEPTING', 3_000)).toBe(false);
    expect(hasHighSourceLatencyWarning('ACCEPTING', 3_001)).toBe(true);
    expect(hasHighSourceLatencyWarning('REVEAL', 4_000)).toBe(false);
  });

  it('hiển thị cooldown ký theo phút:giây rồi bỏ cảnh báo khi hết hạn', () => {
    expect(formatRetryWait(301_500, 1_000)).toBe('Thử lại được sau 05:01');
    expect(formatRetryWait(2_000, 2_000)).toBeNull();
    expect(formatRetryWait(null, 1_000)).toBeNull();
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
