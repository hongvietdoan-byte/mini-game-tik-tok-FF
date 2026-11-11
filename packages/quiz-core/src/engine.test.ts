import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS, type CommandBody, type GameState, type Scene } from '@quiz/contracts';
import {
  createInitialState,
  sceneFor,
  transition,
  type EngineInput,
  type EngineState,
  type PreparedRound,
  type TransitionResult,
} from './engine';

const TIMINGS = {
  ...DEFAULT_TIMINGS,
  lobbyMs: 3_000,
  prepareMs: 1_000,
  answerMs: 5_000,
  revealMs: 1_000,
  leaderboardMs: 1_000,
  roundEndMs: 1_000,
  victoryMs: 1_000,
  intermissionMs: 1_000,
};

function initial(mode: 'MOCK' | 'TIKTOK' = 'MOCK', speedMultiplier = 1): EngineState {
  return createInitialState({ sessionId: 's1', mode, timings: TIMINGS, leaderboardInterval: 5, speedMultiplier });
}

function prepared(count = 15, roundNumber = 1): PreparedRound {
  return { roundId: `r${roundNumber}`, roundNumber, questionInstanceIds: Array.from({ length: count }, (_, index) => `r${roundNumber}:q${String(index + 1).padStart(2, '0')}`) };
}

function cmd(state: EngineState, command: CommandBody, now: number, preparedRound?: PreparedRound): TransitionResult {
  const input: EngineInput = {
    kind: 'COMMAND',
    expectedStateVersion: state.stateVersion,
    command,
    ...(preparedRound ? { preparedRound } : {}),
  };
  return transition(state, input, now);
}

function ok(result: TransitionResult): EngineState {
  if (!result.ok) throw new Error(`Transition lỗi ${result.code}: ${result.message}`);
  return result.state;
}

function elapse(state: EngineState): TransitionResult {
  const deadline = state.timer?.deadlineMs;
  if (deadline === undefined || deadline === null) throw new Error(`Không có timer đang chạy ở ${state.state}`);
  return transition(state, { kind: 'TIMER_ELAPSED', expectedStateVersion: state.stateVersion }, deadline);
}

function beginRound(count = 15, connected = true, speedMultiplier = 1): EngineState {
  let state = initial('MOCK', speedMultiplier);
  if (connected) state = ok(transition(state, { kind: 'CONNECTION_CHANGED', ok: true }, 0));
  state = ok(cmd(state, { type: 'OPEN_LOBBY' }, 10));
  return ok(cmd(state, { type: 'START_ROUND' }, 20, prepared(count)));
}

function reachAccepting(count = 3): EngineState {
  return ok(elapse(beginRound(count)));
}

function reachReveal(count = 1): EngineState {
  return ok(elapse(reachAccepting(count)));
}

function reachVictory(): EngineState {
  let state = reachReveal(1);
  state = ok(elapse(state)); // last question → leaderboard
  state = ok(elapse(state)); // round end
  state = ok(elapse(state)); // victory
  return state;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

describe('đường đi trọn vòng theo interval 5', () => {
  it.each([10, 15, 20])('chạy đủ vòng %i câu, chỉ hiện leaderboard ở mốc 5', (count) => {
    let state = initial();
    state = ok(transition(state, { kind: 'CONNECTION_CHANGED', ok: true }, 0));
    state = ok(cmd(state, { type: 'OPEN_LOBBY' }, 10));
    const start = cmd(state, { type: 'START_ROUND' }, 20, prepared(count));
    let roundEvents: string[] = [];
    if (start.ok) {
      state = start.state;
      roundEvents = start.events.map((event) => event.type);
    } else throw new Error(`Không mở được vòng: ${start.code}`);
    const events: string[] = [];
    const questionEvents: string[] = [];
    const expectedQuestionIds = [...state.round!.questionInstanceIds];
    const leaderboardQuestions: number[] = [];
    const timerStep = () => {
      const result = elapse(state);
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.state;
        events.push(...result.events.map((event) => event.type));
        for (const event of result.events) {
          if (event.type === 'QUESTION_OPENED' || event.type === 'QUESTION_CLOSED')
            questionEvents.push(`${event.type}:${event.questionInstanceId}`);
        }
      }
    };

    for (let question = 1; question <= count; question += 1) {
      timerStep();
      expect(state.state).toBe('ACCEPTING');
      timerStep();
      expect(state.state).toBe('REVEAL');
      timerStep();
      const isMilestone = question % 5 === 0 || question === count;
      expect(state.state).toBe(isMilestone ? 'LEADERBOARD' : 'PREPARE');
      if (state.state === 'LEADERBOARD') leaderboardQuestions.push(question);
      if (state.state === 'LEADERBOARD' && question < count) {
        timerStep();
        expect(state.state).toBe('PREPARE');
      }
    }

    timerStep();
    expect(state.state).toBe('ROUND_END');
    timerStep();
    expect(state.state).toBe('VICTORY');
    timerStep();
    expect(state.state).toBe('INTERMISSION');
    timerStep();
    expect(state.state).toBe('LOBBY');
    expect(state.completedRounds).toBe(1);
    expect(leaderboardQuestions).toEqual(Array.from({ length: count / 5 }, (_, index) => (index + 1) * 5));
    expect(events.filter((event) => event === 'QUESTION_OPENED')).toHaveLength(count);
    expect(events.filter((event) => event === 'QUESTION_CLOSED')).toHaveLength(count);
    expect(roundEvents.filter((event) => event === 'ROUND_STARTED')).toHaveLength(1);
    expect(questionEvents).toEqual(expectedQuestionIds.flatMap((id) => [`QUESTION_OPENED:${id}`, `QUESTION_CLOSED:${id}`]));
    expect(events.indexOf('ROUND_ENDED')).toBeLessThan(events.indexOf('VICTORY_STARTED'));
  });
});

describe('transition/version và truy vấn scene', () => {
  it('chỉ tăng stateVersion khi transition thành công và không mutate input đã deep-freeze', () => {
    const state = deepFreeze(initial());
    const opened = cmd(state, { type: 'OPEN_LOBBY' }, 10);
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      expect(opened.state.stateVersion).toBe(state.stateVersion + 1);
      expect(state.state).toBe('IDLE');
      const snapshot = structuredClone(opened.state);
      const failed = cmd(opened.state, { type: 'START_ROUND' }, 20);
      expect(failed).toMatchObject({ ok: false, code: 'INSUFFICIENT_QUESTIONS' });
      expect(opened.state).toEqual(snapshot);
      expect(opened.state.stateVersion).toBe(snapshot.stateVersion);
    }
  });

  it('trả STALE_STATE_VERSION cho COMMAND và TIMER_ELAPSED phiên bản cũ', () => {
    const state = ok(cmd(initial(), { type: 'OPEN_LOBBY' }, 10));
    const staleCommand = transition(state, { kind: 'COMMAND', expectedStateVersion: state.stateVersion - 1, command: { type: 'SET_AUTO_MODE', enabled: true } }, 20);
    expect(staleCommand).toMatchObject({ ok: false, code: 'STALE_STATE_VERSION' });
    const running = ok(cmd(state, { type: 'SET_AUTO_MODE', enabled: true }, 20));
    const staleTimer = transition(running, { kind: 'TIMER_ELAPSED', expectedStateVersion: running.stateVersion - 1 }, running.timer!.deadlineMs!);
    expect(staleTimer).toMatchObject({ ok: false, code: 'STALE_STATE_VERSION' });
  });

  it('từ chối timer trước hạn hoặc khi không có timer', () => {
    const idle = initial();
    expect(transition(idle, { kind: 'TIMER_ELAPSED', expectedStateVersion: idle.stateVersion }, 100)).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
    const lobby = ok(cmd(ok(cmd(idle, { type: 'OPEN_LOBBY' }, 0)), { type: 'SET_AUTO_MODE', enabled: true }, 0));
    expect(transition(lobby, { kind: 'TIMER_ELAPSED', expectedStateVersion: lobby.stateVersion }, lobby.timer!.deadlineMs! - 1)).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
  });

  it.each([
    ['IDLE', null, 'LOBBY'], ['LOBBY', null, 'LOBBY'], ['PREPARE', null, 'QUESTION'],
    ['ACCEPTING', null, 'QUESTION'], ['REVEAL', null, 'REVEAL'], ['LEADERBOARD', null, 'INTERIM_TOP10'],
    ['ROUND_END', null, 'ROUND_WINNER'], ['VICTORY', null, 'VICTORY'], ['INTERMISSION', null, 'INTERMISSION'],
    ['PAUSED', { from: 'ACCEPTING', kind: 'PAUSE' }, 'QUESTION'],
    ['CONNECTION_INTERRUPTED', { from: 'ACCEPTING', kind: 'CONNECTION' }, 'CONNECTION_LOST'],
    ['ERROR', { from: 'ACCEPTING', kind: 'ERROR' }, 'CONNECTION_LOST'],
  ] as [GameState, EngineState['suspended'], Scene][])('sceneFor %s → %s', (stateName, suspended, scene) => {
    expect(sceneFor({ ...initial(), state: stateName, suspended })).toBe(scene);
  });
});

describe('pause, resume và mất kết nối', () => {
  it('đóng băng remainingMs và resume đặt deadline mới; mở lại ACCEPTING từ now', () => {
    let state = beginRound(2);
    const preparePauseAt = state.timer!.deadlineMs! - 400;
    state = ok(cmd(state, { type: 'PAUSE' }, preparePauseAt));
    expect(state.state).toBe('PAUSED');
    expect(state.timer).toMatchObject({ remainingMs: 400, deadlineMs: null });
    const resumedPrepareAt = preparePauseAt + 500;
    state = ok(cmd(state, { type: 'RESUME' }, resumedPrepareAt));
    expect(state.state).toBe('PREPARE');
    expect(state.timer!.deadlineMs).toBe(resumedPrepareAt + 400);

    state = ok(elapse(state));
    expect(state.state).toBe('ACCEPTING');
    const openAt = state.acceptOpenAtMs!;
    const pauseAt = openAt + 2_000;
    state = ok(cmd(state, { type: 'PAUSE' }, pauseAt));
    expect(state.timer!.remainingMs).toBe(3_000);
    const resumeAt = pauseAt + 900;
    state = ok(cmd(state, { type: 'RESUME' }, resumeAt));
    expect(state.timer!.deadlineMs).toBe(resumeAt + 3_000);
    expect(state.acceptOpenAtMs).toBe(resumeAt);
  });

  it('không cho PAUSE ở IDLE; RESUME khi ACCEPTING mất kết nối trả CONNECTION_NOT_READY', () => {
    const idle = initial();
    expect(cmd(idle, { type: 'PAUSE' }, 0)).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
    let state = ok(elapse(beginRound(2)));
    state = ok(cmd(state, { type: 'PAUSE' }, 100));
    state = ok(transition(state, { kind: 'CONNECTION_CHANGED', ok: false }, 200));
    expect(cmd(state, { type: 'RESUME' }, 300)).toMatchObject({ ok: false, code: 'CONNECTION_NOT_READY' });
  });

  it('mất kết nối trong ACCEPTING đóng băng; nối lại không tự resume, operator phải RESUME', () => {
    let state = reachAccepting(2);
    const remaining = state.timer!.deadlineMs! - 1_200;
    state = ok(transition(state, { kind: 'CONNECTION_CHANGED', ok: false }, 1_200));
    expect(state.state).toBe('CONNECTION_INTERRUPTED');
    expect(state.suspended).toEqual({ from: 'ACCEPTING', kind: 'CONNECTION' });
    expect(state.timer!.deadlineMs).toBeNull();
    expect(state.timer!.remainingMs).toBe(remaining);
    expect(cmd(state, { type: 'RESUME' }, 1_400)).toMatchObject({ ok: false, code: 'CONNECTION_NOT_READY' });
    state = ok(transition(state, { kind: 'CONNECTION_CHANGED', ok: true }, 1_500));
    expect(state.state).toBe('CONNECTION_INTERRUPTED');
    state = ok(cmd(state, { type: 'RESUME' }, 2_000));
    expect(state.state).toBe('ACCEPTING');
    expect(state.timer!.deadlineMs).toBe(2_000 + remaining);
    expect(state.acceptOpenAtMs).toBe(2_000);
  });

  it('mở ACCEPTING khi nguồn đang mất sẽ ngắt ngay; lặp connection value là changed:false', () => {
    let state = beginRound(2, false);
    const sameDisconnected = transition(state, { kind: 'CONNECTION_CHANGED', ok: false }, 30);
    expect(sameDisconnected).toMatchObject({ ok: true, changed: false });
    state = ok(elapse(state));
    expect(state.state).toBe('CONNECTION_INTERRUPTED');
    const sameDisconnectedAgain = transition(state, { kind: 'CONNECTION_CHANGED', ok: false }, 40);
    expect(sameDisconnectedAgain).toMatchObject({ ok: true, changed: false });
  });
});

describe('skip và void', () => {
  it('void trước reveal tiến sang câu kế hoặc leaderboard ở mốc; event afterReveal=false', () => {
    let state = beginRound(6);
    let result = cmd(state, { type: 'SKIP_QUESTION', reason: 'Bỏ câu demo' }, 100);
    expect(result).toMatchObject({ ok: true, state: { state: 'PREPARE', round: { questionIndex: 1 } } });
    expect(result.ok && result.events).toContainEqual({ type: 'QUESTION_VOIDED', questionInstanceId: 'r1:q01', afterReveal: false });

    state = beginRound(6);
    for (let question = 1; question < 5; question += 1) {
      state = ok(elapse(state));
      state = ok(elapse(state));
      state = ok(elapse(state));
      if (question < 5 && state.state === 'LEADERBOARD') state = ok(elapse(state));
    }
    expect(state.state).toBe('PREPARE');
    state = ok(elapse(state)); // ACCEPTING q5
    result = cmd(state, { type: 'VOID_QUESTION', reason: 'Câu sai dữ liệu' }, 500);
    expect(result).toMatchObject({ ok: true, state: { state: 'LEADERBOARD', round: { questionIndex: 4 } } });
    expect(result.ok && result.events).toContainEqual({ type: 'QUESTION_VOIDED', questionInstanceId: 'r1:q05', afterReveal: false });
  });

  it('skip khi PAUSED giữ nguyên PAUSED và freeze câu kế tiếp', () => {
    let state = reachAccepting(3);
    state = ok(cmd(state, { type: 'PAUSE' }, 100));
    const result = cmd(state, { type: 'SKIP_QUESTION', reason: 'Bỏ câu khi tạm dừng' }, 200);
    expect(result).toMatchObject({ ok: true, state: { state: 'PAUSED', suspended: { from: 'PREPARE', kind: 'PAUSE' }, round: { questionIndex: 1 } } });
    expect(result.ok && result.events).toContainEqual({ type: 'QUESTION_VOIDED', questionInstanceId: 'r1:q01', afterReveal: false });
    expect(result.ok && result.state.timer?.deadlineMs).toBeNull();
  });

  it('void khi CONNECTION_INTERRUPTED chuyển an toàn sang PREPARE kế tiếp', () => {
    let state = reachAccepting(3);
    state = ok(transition(state, { kind: 'CONNECTION_CHANGED', ok: false }, 200));
    const result = cmd(state, { type: 'VOID_QUESTION', reason: 'Nguồn comment gián đoạn' }, 300);
    expect(result).toMatchObject({ ok: true, state: { state: 'PREPARE', round: { questionIndex: 1 } } });
    expect(result.ok && result.events).toContainEqual({ type: 'QUESTION_VOIDED', questionInstanceId: 'r1:q01', afterReveal: false });
  });

  it('void sau reveal chỉ ghi event once, không đổi state; skip sau reveal bị từ chối', () => {
    let state = reachReveal(3);
    const voided = cmd(state, { type: 'VOID_QUESTION', reason: 'Đáp án lỗi' }, 500);
    expect(voided).toMatchObject({ ok: true, state: { state: 'REVEAL' } });
    expect(voided.ok && voided.events).toContainEqual({ type: 'QUESTION_VOIDED', questionInstanceId: 'r1:q01', afterReveal: true });
    if (voided.ok) state = voided.state;
    expect(cmd(state, { type: 'VOID_QUESTION', reason: 'Lặp void' }, 600)).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
    expect(cmd(state, { type: 'SKIP_QUESTION', reason: 'Skip sau reveal' }, 700)).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
  });

  it('void ở LEADERBOARD cũng được ghi afterReveal=true mà không đổi state', () => {
    let state = reachReveal(1);
    state = ok(elapse(state));
    expect(state.state).toBe('LEADERBOARD');
    const result = cmd(state, { type: 'VOID_QUESTION', reason: 'Sửa điểm sau reveal' }, 900);
    expect(result).toMatchObject({ ok: true, state: { state: 'LEADERBOARD' } });
    expect(result.ok && result.events).toContainEqual({ type: 'QUESTION_VOIDED', questionInstanceId: 'r1:q01', afterReveal: true });
  });
});

describe('recovery', () => {
  it('PROCESS_RESTARTED từ ACCEPTING đóng băng theo heartbeat và chỉ cho phép lệnh recovery', () => {
    const accepting = reachAccepting(2);
    const deadline = accepting.timer!.deadlineMs!;
    const restarted = transition(accepting, { kind: 'PROCESS_RESTARTED', lastHeartbeatMs: deadline - 2_000 }, deadline + 5_000);
    expect(restarted).toMatchObject({
      ok: true,
      state: { state: 'PAUSED', suspended: { from: 'ACCEPTING', kind: 'RECOVERY' }, connectionOk: false, acceptOpenAtMs: null, timer: { remainingMs: 2_000, deadlineMs: null } },
      events: [{ type: 'STATE_CHANGED' }, { type: 'RECOVERY_REQUIRED', interruptedState: 'ACCEPTING' }],
    });
    if (restarted.ok) {
      expect(cmd(restarted.state, { type: 'OPEN_LOBBY' }, 10)).toMatchObject({ ok: false, code: 'RECOVERY_PENDING' });
      expect(cmd(restarted.state, { type: 'PAUSE' }, 10)).toMatchObject({ ok: false, code: 'RECOVERY_PENDING' });
      expect(cmd(restarted.state, { type: 'RESOLVE_RECOVERY', decision: 'RESUME', reason: 'Tiếp tục sau khi restart' }, 20)).toMatchObject({ ok: false, code: 'CONNECTION_NOT_READY' });
      const connected = ok(transition(restarted.state, { kind: 'CONNECTION_CHANGED', ok: true }, 30));
      const resumed = cmd(connected, { type: 'RESOLVE_RECOVERY', decision: 'RESUME', reason: 'Nguồn đã sẵn sàng' }, 40);
      expect(resumed).toMatchObject({ ok: true, state: { state: 'ACCEPTING', acceptOpenAtMs: 40, timer: { deadlineMs: 2_040 } } });
    }
  });

  it('RESOLVE_RECOVERY VOID chỉ bỏ câu PREPARE/ACCEPTING và recovery STOP đóng phiên', () => {
    const prepare = beginRound(1);
    const recovery = transition(prepare, { kind: 'PROCESS_RESTARTED', lastHeartbeatMs: 100 }, 200);
    expect(recovery.ok).toBe(true);
    if (recovery.ok) {
      const voided = cmd(recovery.state, { type: 'RESOLVE_RECOVERY', decision: 'VOID', reason: 'Bỏ câu sau recovery' }, 300);
      expect(voided).toMatchObject({ ok: true, state: { state: 'LEADERBOARD', round: { voided: ['r1:q01'] } } });
      expect(voided.ok && voided.events).toContainEqual({ type: 'QUESTION_VOIDED', questionInstanceId: 'r1:q01', afterReveal: false });
      const stopped = cmd(recovery.state, { type: 'RESOLVE_RECOVERY', decision: 'STOP', reason: 'Dừng phiên phục hồi' }, 400);
      expect(stopped).toMatchObject({ ok: true, state: { sessionStatus: 'CLOSED' }, events: expect.arrayContaining([{ type: 'SESSION_STOPPED' }]) });
    }

    const acceptingRecovery = transition(reachAccepting(1), { kind: 'PROCESS_RESTARTED', lastHeartbeatMs: 100 }, 200);
    expect(acceptingRecovery.ok).toBe(true);
    if (acceptingRecovery.ok) {
      expect(cmd(acceptingRecovery.state, { type: 'RESOLVE_RECOVERY', decision: 'VOID', reason: 'Bỏ câu ACCEPTING' }, 300)).toMatchObject({ ok: true, state: { state: 'LEADERBOARD', round: { voided: ['r1:q01'] } } });
    }

    const revealRecovery = transition(reachReveal(1), { kind: 'PROCESS_RESTARTED', lastHeartbeatMs: 100 }, 200);
    expect(revealRecovery.ok).toBe(true);
    if (revealRecovery.ok)
      expect(cmd(revealRecovery.state, { type: 'RESOLVE_RECOVERY', decision: 'VOID', reason: 'Không void hồi tố' }, 300)).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
  });

  it('PROCESS_RESTARTED ở IDLE, CLOSED hoặc ERROR không thay đổi trạng thái', () => {
    const idle = initial();
    expect(transition(idle, { kind: 'PROCESS_RESTARTED', lastHeartbeatMs: 10 }, 20)).toMatchObject({ ok: true, changed: false });
    const closed = ok(cmd(idle, { type: 'STOP', reason: 'Đóng phiên' }, 30));
    expect(transition(closed, { kind: 'PROCESS_RESTARTED', lastHeartbeatMs: 40 }, 50)).toMatchObject({ ok: true, changed: false });
    const error = ok(transition(idle, { kind: 'FATAL', code: 'BROKEN', message: 'Lỗi' }, 60));
    expect(transition(error, { kind: 'PROCESS_RESTARTED', lastHeartbeatMs: 70 }, 80)).toMatchObject({ ok: true, changed: false });
  });
});

describe('fatal, stop và restart round', () => {
  it('FATAL vào ERROR, lưu lỗi, chỉ STOP hợp lệ; FATAL lần hai là no-op', () => {
    const active = reachAccepting(2);
    const failed = transition(active, { kind: 'FATAL', code: 'E_TEST', message: 'Có lỗi giả lập' }, 100);
    expect(failed).toMatchObject({ ok: true, state: { state: 'ERROR', error: { code: 'E_TEST', message: 'Có lỗi giả lập' } }, events: expect.arrayContaining([{ type: 'ERROR_RAISED', code: 'E_TEST', message: 'Có lỗi giả lập' }]) });
    if (failed.ok) {
      expect(cmd(failed.state, { type: 'PAUSE' }, 200)).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
      expect(transition(failed.state, { kind: 'FATAL', code: 'SECOND', message: 'Lỗi nữa' }, 300)).toMatchObject({ ok: true, changed: false });
      expect(cmd(failed.state, { type: 'STOP', reason: 'Đóng sau lỗi' }, 400)).toMatchObject({ ok: true, state: { sessionStatus: 'CLOSED' } });
    }
  });

  it('STOP giữa vòng ghi ROUND_ABORTED + SESSION_STOPPED; lệnh sau nhận SESSION_CLOSED', () => {
    const active = beginRound(3);
    const stopped = cmd(active, { type: 'STOP', reason: 'Dừng vòng thử' }, 100);
    expect(stopped).toMatchObject({ ok: true, state: { state: 'IDLE', sessionStatus: 'CLOSED', timer: null }, events: expect.arrayContaining([
      { type: 'ROUND_ABORTED', roundId: 'r1', cause: 'STOP' }, { type: 'SESSION_STOPPED' },
    ]) });
    if (stopped.ok) expect(cmd(stopped.state, { type: 'OPEN_LOBBY' }, 200)).toMatchObject({ ok: false, code: 'SESSION_CLOSED' });
  });

  it('RESTART_ROUND giữa vòng hoặc PAUSED tạo vòng mới; thiếu bộ câu hỏi trả INSUFFICIENT_QUESTIONS', () => {
    const active = beginRound(3);
    expect(cmd(active, { type: 'RESTART_ROUND', reason: 'Thiếu dữ liệu' }, 100)).toMatchObject({ ok: false, code: 'INSUFFICIENT_QUESTIONS' });
    const restarted = cmd(active, { type: 'RESTART_ROUND', reason: 'Chạy lại vòng' }, 200, prepared(2, 2));
    expect(restarted).toMatchObject({ ok: true, state: { state: 'PREPARE', round: { roundId: 'r2', roundNumber: 2, questionIndex: 0 } }, events: expect.arrayContaining([{ type: 'ROUND_ABORTED', roundId: 'r1', cause: 'RESTART' }]) });
    if (restarted.ok) {
      const paused = ok(cmd(restarted.state, { type: 'PAUSE' }, 300));
      const restartedWhilePaused = cmd(paused, { type: 'RESTART_ROUND', reason: 'Thay bộ câu hỏi' }, 400, prepared(4, 3));
      expect(restartedWhilePaused).toMatchObject({ ok: true, state: { state: 'PREPARE', suspended: null, round: { roundId: 'r3', questionInstanceIds: expect.arrayContaining(['r3:q04']) } } });
    }
    expect(cmd(initial(), { type: 'START_ROUND' }, 0, prepared(1))).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
  });
});

describe('auto mode và chuyển vòng', () => {
  it('SET_AUTO_MODE bật/tắt timer lobby; hết giờ phát AUTO_START_REQUESTED', () => {
    let state = ok(cmd(initial(), { type: 'OPEN_LOBBY' }, 0));
    state = ok(cmd(state, { type: 'SET_AUTO_MODE', enabled: true }, 10));
    expect(state.timer).toMatchObject({ durationMs: TIMINGS.lobbyMs, deadlineMs: 10 + TIMINGS.lobbyMs });
    const elapsed = elapse(state);
    expect(elapsed).toMatchObject({ ok: true, state: { state: 'LOBBY', timer: null }, events: [{ type: 'AUTO_START_REQUESTED' }] });
    if (elapsed.ok) {
      state = ok(cmd(elapsed.state, { type: 'SET_AUTO_MODE', enabled: false }, 20));
      expect(state.autoMode).toBe(false);
      expect(state.timer).toBeNull();
    }
  });

  it('NEXT_ROUND từ VICTORY hoặc INTERMISSION trở về LOBBY; MANUAL_NEXT ở ACCEPTING trái phép', () => {
    const victory = reachVictory();
    expect(cmd(victory, { type: 'NEXT_ROUND' }, 100)).toMatchObject({ ok: true, state: { state: 'LOBBY', round: null, completedRounds: 1 } });
    const intermission = ok(elapse(victory));
    expect(intermission.state).toBe('INTERMISSION');
    expect(cmd(intermission, { type: 'NEXT_ROUND' }, 200)).toMatchObject({ ok: true, state: { state: 'LOBBY', round: null, completedRounds: 1 } });
    expect(cmd(reachAccepting(2), { type: 'MANUAL_NEXT' }, 300)).toMatchObject({ ok: false, code: 'ILLEGAL_TRANSITION' });
  });

  it('chia thời lượng theo speedMultiplier chỉ trong MOCK; TIKTOK luôn multiplier 1', () => {
    const mock = beginRound(2, true, 10);
    expect(mock.speedMultiplier).toBe(10);
    expect(mock.timer!.durationMs).toBe(TIMINGS.prepareMs / 10);
    const tiktok = createInitialState({ sessionId: 'live', mode: 'TIKTOK', timings: TIMINGS, leaderboardInterval: 5, speedMultiplier: 10 });
    expect(tiktok.speedMultiplier).toBe(1);
    const liveStarted = ok(cmd(ok(cmd(tiktok, { type: 'OPEN_LOBBY' }, 0)), { type: 'START_ROUND' }, 10, prepared(2)));
    expect(liveStarted.timer!.durationMs).toBe(TIMINGS.prepareMs);
  });
});
