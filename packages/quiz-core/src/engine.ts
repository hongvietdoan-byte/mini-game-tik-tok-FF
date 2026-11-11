import type {
  CommandBody,
  CommandErrorCode,
  GameState,
  LiveSource,
  McState,
  Scene,
  Timings,
} from '@quiz/contracts';

/**
 * Máy trạng thái có thẩm quyền — HÀM THUẦN: (state, input, now) => result/events.
 * Không I/O, không Date.now(), không random. Mọi hiệu ứng phụ (chấm điểm, lưu DB, phát WS)
 * do tầng server thực hiện dựa trên `events` trả về.
 */

export type EngineTimer = {
  durationMs: number;
  remainingMs: number;
  /** null = đang đóng băng (pause / mất kết nối / chờ khôi phục). */
  deadlineMs: number | null;
};

export type EngineRound = {
  roundId: string;
  roundNumber: number;
  questionInstanceIds: string[];
  questionIndex: number;
  closed: string[];
  voided: string[];
};

export type SuspendKind = 'PAUSE' | 'CONNECTION' | 'RECOVERY' | 'ERROR';

export type EngineState = {
  sessionId: string;
  stateVersion: number;
  state: GameState;
  sessionStatus: 'OPEN' | 'CLOSED';
  mode: LiveSource;
  timings: Timings;
  leaderboardInterval: number;
  speedMultiplier: number;
  autoMode: boolean;
  timer: EngineTimer | null;
  round: EngineRound | null;
  acceptOpenAtMs: number | null;
  suspended: { from: GameState; kind: SuspendKind } | null;
  connectionOk: boolean;
  completedRounds: number;
  error: { code: string; message: string } | null;
};

export type PreparedRound = { roundId: string; roundNumber: number; questionInstanceIds: string[] };

export type EngineInput =
  | { kind: 'COMMAND'; expectedStateVersion: number; command: CommandBody; preparedRound?: PreparedRound }
  | { kind: 'TIMER_ELAPSED'; expectedStateVersion: number }
  | { kind: 'CONNECTION_CHANGED'; ok: boolean }
  | { kind: 'FATAL'; code: string; message: string }
  | { kind: 'PROCESS_RESTARTED'; lastHeartbeatMs: number };

export type EngineEvent =
  | { type: 'STATE_CHANGED'; from: GameState; to: GameState }
  | { type: 'ROUND_STARTED'; roundId: string; roundNumber: number }
  | { type: 'ROUND_ABORTED'; roundId: string; cause: 'RESTART' | 'STOP' }
  | { type: 'QUESTION_OPENED'; questionInstanceId: string; index: number }
  | { type: 'QUESTION_CLOSED'; questionInstanceId: string }
  | { type: 'QUESTION_VOIDED'; questionInstanceId: string; afterReveal: boolean }
  | { type: 'ROUND_ENDED'; roundId: string }
  | { type: 'VICTORY_STARTED'; roundId: string }
  | { type: 'AUTO_START_REQUESTED' }
  | { type: 'SESSION_STOPPED' }
  | { type: 'RECOVERY_REQUIRED'; interruptedState: GameState }
  | { type: 'ERROR_RAISED'; code: string; message: string };

export type TransitionResult =
  | { ok: true; state: EngineState; events: EngineEvent[]; changed: boolean }
  | { ok: false; code: CommandErrorCode; message: string };

export function createInitialState(init: {
  sessionId: string;
  mode: LiveSource;
  timings: Timings;
  leaderboardInterval: number;
  speedMultiplier: number;
}): EngineState {
  return {
    sessionId: init.sessionId,
    stateVersion: 0,
    state: 'IDLE',
    sessionStatus: 'OPEN',
    mode: init.mode,
    timings: init.timings,
    leaderboardInterval: init.leaderboardInterval,
    speedMultiplier: init.mode === 'MOCK' ? init.speedMultiplier : 1,
    autoMode: false,
    timer: null,
    round: null,
    acceptOpenAtMs: null,
    suspended: null,
    connectionOk: false,
    completedRounds: 0,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Truy vấn thuần
// ---------------------------------------------------------------------------

export function currentQuestionInstanceId(s: EngineState): string | null {
  return s.round ? (s.round.questionInstanceIds[s.round.questionIndex] ?? null) : null;
}

/** Trạng thái "thực" phía sau PAUSED / CONNECTION_INTERRUPTED / ERROR. */
export function effectiveState(s: EngineState): GameState {
  return s.suspended ? s.suspended.from : s.state;
}

export function remainingMs(s: EngineState, now: number): number {
  if (!s.timer) return 0;
  if (s.timer.deadlineMs === null) return s.timer.remainingMs;
  return Math.max(0, Math.min(s.timer.durationMs, s.timer.deadlineMs - now));
}

/** Cửa sổ nhận đáp án [openAtMs, deadlineMs) — null nếu không ở ACCEPTING đang chạy. */
export function acceptWindow(s: EngineState): { openAtMs: number; deadlineMs: number } | null {
  if (s.state !== 'ACCEPTING' || !s.timer || s.timer.deadlineMs === null || s.acceptOpenAtMs === null)
    return null;
  return { openAtMs: s.acceptOpenAtMs, deadlineMs: s.timer.deadlineMs };
}

export function sceneFor(s: EngineState): Scene {
  if (s.state === 'CONNECTION_INTERRUPTED' || s.state === 'ERROR') return 'CONNECTION_LOST';
  const st = effectiveState(s);
  switch (st) {
    case 'IDLE':
    case 'LOBBY':
      return 'LOBBY';
    case 'PREPARE':
    case 'ACCEPTING':
      return 'QUESTION';
    case 'REVEAL':
      return 'REVEAL';
    case 'LEADERBOARD':
      // V3: sau mỗi câu có LEADERBOARD ngắn (bảng Top 10 gọn cạnh câu hỏi, vẫn ở bố cục câu hỏi);
      // chỉ ở mốc (mỗi leaderboardInterval câu + câu cuối) mới là cảnh BXH lớn.
      return !s.round || isInterimLeaderboard(s) ? 'INTERIM_TOP10' : 'REVEAL';
    case 'ROUND_END':
      return 'ROUND_WINNER';
    case 'VICTORY':
      return 'VICTORY';
    case 'INTERMISSION':
      return 'INTERMISSION';
    case 'PAUSED':
    case 'CONNECTION_INTERRUPTED':
    case 'ERROR':
      // không thể xảy ra: suspended.from không bao giờ là trạng thái treo
      return 'CONNECTION_LOST';
    default:
      return assertNever(st);
  }
}

/** Trạng thái + lời thoại MC Kelly theo trạng thái trò chơi (hàm thuần, V3 §7). */
export function mcFor(s: EngineState, reveal: { correctOptionId: string } | null): { state: McState; bubble: string } {
  if (s.state === 'CONNECTION_INTERRUPTED' || s.state === 'ERROR')
    return { state: 'idle', bubble: 'Tạm dừng một chút, chờ kết nối ổn định nhé!' };
  if (s.state === 'PAUSED') return { state: 'idle', bubble: 'Tạm dừng một chút nhé!' };
  switch (s.state) {
    case 'IDLE':
    case 'LOBBY':
      return { state: 'welcome', bubble: 'Bình luận A/B/C/D để tham gia' };
    case 'PREPARE':
      return { state: 'ask', bubble: 'Câu hỏi tiếp theo, chuẩn bị nhé!' };
    case 'ACCEPTING':
      return { state: 'ask', bubble: 'Chọn đáp án ngay! Bình luận A, B, C hoặc D' };
    case 'REVEAL':
      return { state: 'react', bubble: reveal ? `Đáp án đúng là ${reveal.correctOptionId}!` : 'Cùng xem đáp án nào!' };
    case 'LEADERBOARD':
      return { state: 'idle', bubble: 'Cùng xem bảng xếp hạng!' };
    case 'ROUND_END':
    case 'VICTORY':
      return { state: 'celebrate', bubble: 'Chúc mừng các nhà vô địch!' };
    case 'INTERMISSION':
      return { state: 'idle', bubble: 'Trận tiếp theo sắp bắt đầu' };
    default:
      return assertNever(s.state);
  }
}

export function isInterimLeaderboard(s: EngineState): boolean {
  if (!s.round) return false;
  const i = s.round.questionIndex;
  return i === s.round.questionInstanceIds.length - 1 || (i + 1) % s.leaderboardInterval === 0;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const PAUSABLE: readonly GameState[] = [
  'LOBBY',
  'PREPARE',
  'ACCEPTING',
  'REVEAL',
  'LEADERBOARD',
  'ROUND_END',
  'VICTORY',
  'INTERMISSION',
];
const IN_QUESTION_PRE_REVEAL: readonly GameState[] = ['PREPARE', 'ACCEPTING'];
const IN_ROUND_PLAY: readonly GameState[] = ['PREPARE', 'ACCEPTING', 'REVEAL', 'LEADERBOARD'];

type Draft = { s: EngineState; events: EngineEvent[] };

function fail(code: CommandErrorCode, message: string): TransitionResult {
  return { ok: false, code, message };
}

function assertNever(x: never): never {
  throw new Error(`Trạng thái/lệnh không được xử lý: ${String(x)}`);
}

function clone(s: EngineState): EngineState {
  return {
    ...s,
    timer: s.timer ? { ...s.timer } : null,
    round: s.round
      ? {
          ...s.round,
          questionInstanceIds: [...s.round.questionInstanceIds],
          closed: [...s.round.closed],
          voided: [...s.round.voided],
        }
      : null,
    suspended: s.suspended ? { ...s.suspended } : null,
    error: s.error ? { ...s.error } : null,
  };
}

function setTimer(d: Draft, baseMs: number, now: number) {
  const durationMs = Math.max(0, Math.round(baseMs / d.s.speedMultiplier));
  d.s.timer = { durationMs, remainingMs: durationMs, deadlineMs: now + durationMs };
}

function go(d: Draft, to: GameState) {
  if (d.s.state !== to) d.events.push({ type: 'STATE_CHANGED', from: d.s.state, to });
  d.s.state = to;
}

function freeze(d: Draft, kind: SuspendKind, now: number) {
  const from = d.s.state;
  if (d.s.timer) {
    d.s.timer.remainingMs = remainingMs(d.s, now);
    d.s.timer.deadlineMs = null;
  }
  d.s.suspended = { from, kind };
  go(d, kind === 'CONNECTION' ? 'CONNECTION_INTERRUPTED' : kind === 'ERROR' ? 'ERROR' : 'PAUSED');
}

/** Bỏ treo: quay về trạng thái trước đó, đồng hồ chạy tiếp từ phần còn lại. */
function unfreeze(d: Draft, now: number) {
  const sus = d.s.suspended;
  if (!sus) return;
  d.s.suspended = null;
  go(d, sus.from);
  if (d.s.timer) d.s.timer.deadlineMs = now + d.s.timer.remainingMs;
  // Cửa sổ nhận đáp án mở lại từ "now": comment trong lúc treo không bao giờ được tính.
  if (sus.from === 'ACCEPTING') d.s.acceptOpenAtMs = now;
}

function enterLobby(d: Draft, now: number) {
  go(d, 'LOBBY');
  d.s.acceptOpenAtMs = null;
  if (d.s.autoMode) setTimer(d, d.s.timings.lobbyMs, now);
  else d.s.timer = null;
}

function enterPrepare(d: Draft, index: number, now: number) {
  d.s.round!.questionIndex = index;
  d.s.acceptOpenAtMs = null;
  go(d, 'PREPARE');
  setTimer(d, d.s.timings.prepareMs, now);
}

function enterAccepting(d: Draft, now: number) {
  go(d, 'ACCEPTING');
  setTimer(d, d.s.timings.answerMs, now);
  d.s.acceptOpenAtMs = now;
  d.events.push({
    type: 'QUESTION_OPENED',
    questionInstanceId: currentQuestionInstanceId(d.s)!,
    index: d.s.round!.questionIndex,
  });
  // Không bao giờ mở câu hỏi "mù" khi nguồn comment đang mất kết nối.
  if (!d.s.connectionOk) freeze(d, 'CONNECTION', now);
}

function enterLeaderboard(d: Draft, now: number) {
  go(d, 'LEADERBOARD');
  d.s.acceptOpenAtMs = null;
  const big = isInterimLeaderboard(d.s);
  setTimer(d, big ? (d.s.timings.bigLeaderboardMs ?? DEFAULT_BIG_LEADERBOARD_MS) : d.s.timings.leaderboardMs, now);
}

/**
 * Sau một câu. Đã REVEAL (điểm có thể đổi) → luôn LEADERBOARD (V3 §4 bước 8).
 * Bị huỷ TRƯỚC reveal (điểm không đổi) → chỉ vào LEADERBOARD nếu là mốc BXH lớn, ngược lại sang câu kế.
 */
function afterQuestion(d: Draft, now: number, revealed: boolean) {
  if (revealed || isInterimLeaderboard(d.s)) enterLeaderboard(d, now);
  else enterPrepare(d, d.s.round!.questionIndex + 1, now);
}

const DEFAULT_BIG_LEADERBOARD_MS = 6_000;

/** Tiến một bước theo đồng hồ (TIMER_ELAPSED) hoặc MANUAL_NEXT. */
function advance(d: Draft, now: number): boolean {
  const st = d.s.state;
  switch (st) {
    case 'LOBBY':
      d.s.timer = null;
      d.events.push({ type: 'AUTO_START_REQUESTED' });
      return true;
    case 'PREPARE':
      enterAccepting(d, now);
      return true;
    case 'ACCEPTING': {
      const qid = currentQuestionInstanceId(d.s)!;
      d.s.round!.closed.push(qid);
      d.s.acceptOpenAtMs = null;
      d.events.push({ type: 'QUESTION_CLOSED', questionInstanceId: qid });
      go(d, 'REVEAL');
      setTimer(d, d.s.timings.revealMs, now);
      return true;
    }
    case 'REVEAL':
      afterQuestion(d, now, true);
      return true;
    case 'LEADERBOARD': {
      const r = d.s.round!;
      if (r.questionIndex >= r.questionInstanceIds.length - 1) {
        go(d, 'ROUND_END');
        setTimer(d, d.s.timings.roundEndMs, now);
        d.events.push({ type: 'ROUND_ENDED', roundId: r.roundId });
      } else {
        enterPrepare(d, r.questionIndex + 1, now);
      }
      return true;
    }
    case 'ROUND_END':
      go(d, 'VICTORY');
      setTimer(d, d.s.timings.victoryMs, now);
      d.events.push({ type: 'VICTORY_STARTED', roundId: d.s.round!.roundId });
      return true;
    case 'VICTORY':
      go(d, 'INTERMISSION');
      setTimer(d, d.s.timings.intermissionMs, now);
      return true;
    case 'INTERMISSION':
      d.s.round = null;
      d.s.completedRounds += 1;
      enterLobby(d, now);
      return true;
    case 'IDLE':
    case 'PAUSED':
    case 'CONNECTION_INTERRUPTED':
    case 'ERROR':
      return false;
    default:
      return assertNever(st);
  }
}

/** Void câu hiện tại TRƯỚC khi reveal: không chấm điểm, tiến an toàn sang bước kế. */
function voidBeforeReveal(d: Draft, now: number) {
  const qid = currentQuestionInstanceId(d.s)!;
  if (!d.s.round!.voided.includes(qid)) d.s.round!.voided.push(qid);
  d.s.acceptOpenAtMs = null;
  d.events.push({ type: 'QUESTION_VOIDED', questionInstanceId: qid, afterReveal: false });
  afterQuestion(d, now, false);
}

function startRound(d: Draft, prepared: PreparedRound, now: number) {
  d.s.round = {
    roundId: prepared.roundId,
    roundNumber: prepared.roundNumber,
    questionInstanceIds: [...prepared.questionInstanceIds],
    questionIndex: 0,
    closed: [],
    voided: [],
  };
  d.events.push({ type: 'ROUND_STARTED', roundId: prepared.roundId, roundNumber: prepared.roundNumber });
  enterPrepare(d, 0, now);
}

function stop(d: Draft) {
  const eff = effectiveState(d.s);
  if (d.s.round && IN_ROUND_PLAY.includes(eff))
    d.events.push({ type: 'ROUND_ABORTED', roundId: d.s.round.roundId, cause: 'STOP' });
  d.s.suspended = null;
  d.s.timer = null;
  d.s.acceptOpenAtMs = null;
  d.s.autoMode = false;
  go(d, 'IDLE');
  d.s.sessionStatus = 'CLOSED';
  d.events.push({ type: 'SESSION_STOPPED' });
}

function done(d: Draft): TransitionResult {
  d.s.stateVersion += 1;
  return { ok: true, state: d.s, events: d.events, changed: true };
}

export function transition(state: EngineState, input: EngineInput, now: number): TransitionResult {
  const d: Draft = { s: clone(state), events: [] };

  switch (input.kind) {
    case 'TIMER_ELAPSED': {
      if (input.expectedStateVersion !== state.stateVersion)
        return fail('STALE_STATE_VERSION', 'Timer thuộc phiên bản trạng thái cũ');
      if (!d.s.timer || d.s.timer.deadlineMs === null)
        return fail('ILLEGAL_TRANSITION', 'Không có đồng hồ đang chạy');
      if (now < d.s.timer.deadlineMs) return fail('ILLEGAL_TRANSITION', 'Đồng hồ chưa hết');
      if (!advance(d, now)) return fail('ILLEGAL_TRANSITION', `Không thể tự tiến từ ${state.state}`);
      return done(d);
    }

    case 'CONNECTION_CHANGED': {
      if (d.s.connectionOk === input.ok) return { ok: true, state, events: [], changed: false };
      d.s.connectionOk = input.ok;
      // Mất kết nối giữa câu hỏi: đóng băng đồng hồ, chờ operator resume/void/stop.
      // Có kết nối lại KHÔNG tự chạy tiếp.
      if (!input.ok && d.s.state === 'ACCEPTING') freeze(d, 'CONNECTION', now);
      return done(d);
    }

    case 'FATAL': {
      if (d.s.sessionStatus === 'CLOSED' || d.s.state === 'ERROR')
        return { ok: true, state, events: [], changed: false };
      d.s.error = { code: input.code, message: input.message };
      if (d.s.suspended) {
        // giữ nguyên trạng thái gốc bên dưới
        d.s.suspended = { from: d.s.suspended.from, kind: 'ERROR' };
        go(d, 'ERROR');
      } else freeze(d, 'ERROR', now);
      d.events.push({ type: 'ERROR_RAISED', code: input.code, message: input.message });
      return done(d);
    }

    case 'PROCESS_RESTARTED': {
      if (d.s.sessionStatus === 'CLOSED' || d.s.state === 'IDLE' || d.s.state === 'ERROR')
        return { ok: true, state, events: [], changed: false };
      const from = effectiveState(d.s);
      if (d.s.timer) {
        // Phần còn lại tính bảo thủ theo nhịp heartbeat cuối cùng trước khi tiến trình dừng.
        d.s.timer.remainingMs =
          d.s.timer.deadlineMs === null
            ? d.s.timer.remainingMs
            : Math.max(0, Math.min(d.s.timer.durationMs, d.s.timer.deadlineMs - input.lastHeartbeatMs));
        d.s.timer.deadlineMs = null;
      }
      d.s.connectionOk = false;
      d.s.acceptOpenAtMs = null;
      d.s.suspended = { from, kind: 'RECOVERY' };
      go(d, 'PAUSED');
      d.events.push({ type: 'RECOVERY_REQUIRED', interruptedState: from });
      return done(d);
    }

    case 'COMMAND':
      return handleCommand(state, d, input, now);

    default:
      return assertNever(input);
  }
}

function handleCommand(
  state: EngineState,
  d: Draft,
  input: Extract<EngineInput, { kind: 'COMMAND' }>,
  now: number,
): TransitionResult {
  const cmd = input.command;
  if (state.sessionStatus === 'CLOSED') return fail('SESSION_CLOSED', 'Phiên đã đóng');
  if (input.expectedStateVersion !== state.stateVersion)
    return fail(
      'STALE_STATE_VERSION',
      `Trạng thái đã thay đổi (hiện tại v${state.stateVersion}, lệnh dựa trên v${input.expectedStateVersion})`,
    );

  const st = state.state;
  const sus = state.suspended;
  const illegal = () => fail('ILLEGAL_TRANSITION', `Lệnh ${cmd.type} không hợp lệ ở trạng thái ${st}`);

  if (sus?.kind === 'RECOVERY' && cmd.type !== 'RESOLVE_RECOVERY' && cmd.type !== 'STOP')
    return fail('RECOVERY_PENDING', 'Hệ thống vừa khởi động lại: cần chọn Tiếp tục / Huỷ câu / Dừng');
  if (st === 'ERROR' && cmd.type !== 'STOP') return illegal();

  switch (cmd.type) {
    case 'OPEN_LOBBY':
      if (st !== 'IDLE') return illegal();
      enterLobby(d, now);
      return done(d);

    case 'START_ROUND':
      if (st !== 'LOBBY') return illegal();
      if (!input.preparedRound || input.preparedRound.questionInstanceIds.length === 0)
        return fail('INSUFFICIENT_QUESTIONS', 'Chưa chuẩn bị được bộ câu hỏi cho vòng');
      startRound(d, input.preparedRound, now);
      return done(d);

    case 'RESTART_ROUND': {
      const eff = effectiveState(state);
      if (!state.round || !IN_ROUND_PLAY.includes(eff)) return illegal();
      if (!input.preparedRound || input.preparedRound.questionInstanceIds.length === 0)
        return fail('INSUFFICIENT_QUESTIONS', 'Chưa chuẩn bị được bộ câu hỏi cho vòng mới');
      d.events.push({ type: 'ROUND_ABORTED', roundId: state.round.roundId, cause: 'RESTART' });
      d.s.suspended = null;
      startRound(d, input.preparedRound, now);
      return done(d);
    }

    case 'PAUSE':
      if (!PAUSABLE.includes(st)) return illegal();
      freeze(d, 'PAUSE', now);
      return done(d);

    case 'RESUME':
      if (st === 'PAUSED' && sus?.kind === 'PAUSE') {
        if (sus.from === 'ACCEPTING' && !state.connectionOk)
          return fail('CONNECTION_NOT_READY', 'Nguồn comment chưa sẵn sàng — chưa thể mở lại câu hỏi');
        unfreeze(d, now);
        return done(d);
      }
      if (st === 'CONNECTION_INTERRUPTED') {
        if (!state.connectionOk)
          return fail('CONNECTION_NOT_READY', 'Nguồn comment chưa kết nối lại — chọn Huỷ câu hoặc Dừng');
        unfreeze(d, now);
        return done(d);
      }
      return illegal();

    case 'MANUAL_NEXT':
      if (!['PREPARE', 'REVEAL', 'LEADERBOARD', 'ROUND_END', 'VICTORY', 'INTERMISSION'].includes(st))
        return illegal();
      advance(d, now);
      return done(d);

    case 'NEXT_ROUND':
      if (st !== 'VICTORY' && st !== 'INTERMISSION') return illegal();
      d.s.round = null;
      d.s.completedRounds += 1;
      enterLobby(d, now);
      return done(d);

    case 'SET_AUTO_MODE':
      d.s.autoMode = cmd.enabled;
      if (st === 'LOBBY') {
        if (cmd.enabled) setTimer(d, d.s.timings.lobbyMs, now);
        else d.s.timer = null;
      }
      return done(d);

    case 'SKIP_QUESTION':
    case 'VOID_QUESTION': {
      const eff = effectiveState(state);
      if (!state.round) return illegal();
      if (IN_QUESTION_PRE_REVEAL.includes(eff)) {
        // Hợp lệ khi đang chạy, đang pause, hoặc đang mất kết nối.
        const wasPaused = st === 'PAUSED';
        if (sus) {
          d.s.suspended = null;
          go(d, sus.from);
        }
        voidBeforeReveal(d, now);
        if (wasPaused) freeze(d, 'PAUSE', now);
        return done(d);
      }
      // Sau reveal chỉ VOID_QUESTION hợp lệ, và chỉ với câu vừa reveal.
      if (cmd.type === 'VOID_QUESTION' && (eff === 'REVEAL' || eff === 'LEADERBOARD')) {
        const qid = currentQuestionInstanceId(state)!;
        if (state.round.voided.includes(qid)) return illegal();
        d.s.round!.voided.push(qid);
        d.events.push({ type: 'QUESTION_VOIDED', questionInstanceId: qid, afterReveal: true });
        return done(d);
      }
      return illegal();
    }

    case 'RESOLVE_RECOVERY': {
      if (sus?.kind !== 'RECOVERY') return illegal();
      if (cmd.decision === 'STOP') {
        stop(d);
        return done(d);
      }
      if (cmd.decision === 'RESUME') {
        if (sus.from === 'ACCEPTING' && !state.connectionOk)
          return fail('CONNECTION_NOT_READY', 'Nguồn comment chưa sẵn sàng');
        unfreeze(d, now);
        return done(d);
      }
      // VOID
      if (!state.round || !IN_QUESTION_PRE_REVEAL.includes(sus.from))
        return fail(
          'ILLEGAL_TRANSITION',
          'Chỉ huỷ được câu đang chuẩn bị/đang nhận đáp án. Hãy Tiếp tục rồi dùng Huỷ câu nếu câu đã công bố.',
        );
      d.s.suspended = null;
      go(d, sus.from);
      voidBeforeReveal(d, now);
      return done(d);
    }

    case 'STOP':
      stop(d);
      return done(d);

    default:
      return assertNever(cmd);
  }
}
