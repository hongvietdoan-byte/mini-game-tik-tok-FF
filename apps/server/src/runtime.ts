import { randomInt, randomUUID } from 'node:crypto';
import {
  CONTRACT_VERSION,
  CommandEnvelopeSchema,
  CommentEventSchema,
  INITIAL_TEST_SAFE_ZONE,
  type AdminSnapshot,
  type CommandBody,
  type CommandEnvelope,
  type CommandResult,
  type ConnectionStatus,
  type CreateSessionRequest,
  type FastestCorrectAnswer,
  type IngestMetrics,
  type LiveSourceHealth,
  type LeaderboardEntry,
  type OptionId,
  type PublicSnapshot,
  type QuestionSnapshot,
  type RawComment,
  type RejectReason,
  type SessionConfig,
  type SimulatorRequest,
  type WsMessage,
  type WsMessageType,
  type WsPayloads,
} from '@quiz/contracts';
import {
  acceptWindow,
  buildPodium,
  computeRoundScores,
  createInitialState,
  currentQuestionInstanceId,
  decideComment,
  effectiveState,
  formatDifficultyCounts,
  isEligible,
  isInterimLeaderboard,
  mcFor,
  rankPlayers,
  remainingMs,
  sanitizeDisplayName,
  sceneFor,
  selectRound,
  topN,
  top1Streaks,
  transition,
  type EngineEvent,
  type EngineInput,
  type EngineState,
  type PreparedRound,
} from '@quiz/quiz-core';
import { MockAdapter, MockSimulator, type LiveAdapter, type Scheduler, type SimPlayer } from '@quiz/live-adapters';
import type { FilteredPlayerName } from '@quiz/name-filter';
import type { SessionRow, Store } from '@quiz/persistence';
import { AudienceManager, DEFAULT_CHARACTER_POOL } from './audience';
import type { NameFilterStore } from './name-filter-store';

/**
 * SessionRuntime — vỏ có hiệu ứng phụ quanh reducer thuần.
 *
 * Mỗi đầu vào (lệnh operator, đồng hồ, kết nối) đi qua `apply()`:
 *   reducer thuần → MỘT transaction SQLite gồm (hiệu ứng DB + snapshot trạng thái + bản ghi kiểm toán + outbox)
 *   → commit → mới phát WebSocket từ outbox → đặt lại đồng hồ.
 * Node đơn luồng + better-sqlite3 đồng bộ ⇒ mọi đầu vào được xử lý tuần tự, không có tranh chấp.
 */

export type Audience = 'public' | 'admin';
export type Outgoing = { audience: Audience; message: WsMessage };
export type RuntimeListener = (batch: Outgoing[]) => void;
export type DispatchOutcome = { status: number; result: CommandResult };

type ApplyOk = { ok: true; state: EngineState; events: EngineEvent[] };
type ApplyFail = { ok: false; code: CommandResult extends infer R ? (R extends { ok: false; code: infer C } ? C : never) : never; message: string };
type ApplyResult = ApplyOk | ApplyFail;

type PreparedSelection = { round: PreparedRound; seed: number; snapshots: QuestionSnapshot[] };

const ZERO_COUNTS = (): Record<OptionId, number> => ({ A: 0, B: 0, C: 0, D: 0 });
const REJECT_REASONS: RejectReason[] = [
  'INVALID_EVENT',
  'NOT_AN_ANSWER',
  'NOT_ACCEPTING',
  'EARLY',
  'LATE',
  'DUPLICATE_EVENT',
  'DUPLICATE_ANSWER',
  'STALE_SOURCE_TIMESTAMP',
];
const MAX_REJECTIONS = 50;
const MAX_SEEN_EVENTS = 100_000;
const HEARTBEAT_MS = 1_000;
const COUNTS_THROTTLE_MS = 250;

export function statusForResult(r: CommandResult): number {
  if (r.ok) return 200;
  if (r.code === 'STALE_STATE_VERSION') return 409;
  return 422;
}

/** Người chơi giả lập tối thiểu cho simulator (tên hư cấu). */
export function simPlayers(n: number): SimPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `sim-${String(i + 1).padStart(4, '0')}`,
    displayName: `Khán giả ${i + 1}`,
  }));
}

export type RuntimeDeps = {
  store: Store;
  scheduler: Scheduler;
  adapter: LiveAdapter;
  /** Cổng kiểm tra dùng chung cho lệnh operator, auto mode và khôi phục. */
  preflight?: (runtime: SessionRuntime) => {
    checks: { id: string; status: 'PASS' | 'FAIL' | 'WARN'; reason: string }[];
  };
  warn?: (message: string) => void;
  /** Kho nhân vật mặc định (vd đọc từ assets-local/chibi/manifest.json); phiên có characterPool riêng thì dùng của phiên. */
  characterPool?: readonly string[];
  /** Lọc tên trước khi ghi DB/phát overlay. */
  nameFilter?: NameFilterStore;
};

export class SessionRuntime {
  engine: EngineState;
  readonly metrics: IngestMetrics;
  private listeners = new Set<RuntimeListener>();
  private timerHandle: unknown = null;
  private heartbeatHandle: unknown = null;
  private countsHandle: unknown = null;
  private snapshots = new Map<string, QuestionSnapshot>();
  private snapshotsRoundId: string | null = null;
  private counts = ZERO_COUNTS();
  private countsQid: string | null = null;
  private participants = 0;
  private ranked: LeaderboardEntry[] = [];
  private top1 = new Map<string, number>();
  private publicPlayerIds = new Map<string, string>();
  private fastestCorrectByQuestion = new Map<string, { playerId: string; responseMs: number } | null>();
  private seenEvents = new Set<string>();
  private rejections: { atMs: number; reason: RejectReason }[] = [];
  private simulator: MockSimulator | null = null;
  private notice: { code: string; message: string } | null = null;
  private poolCache: AdminSnapshot['pool'] | null = null;
  private unsubs: (() => void)[] = [];
  private disposed = false;
  private seq = 0;
  private health: LiveSourceHealth;
  private overlayInfo: AdminSnapshot['overlay'] = { clients: 0, lastAckStateVersion: null, lastAckAtMs: null };
  /** 35 ghế khán giả (V3 §6). */
  private readonly audience: AudienceManager;
  private audienceChanged = false;
  /** Tên gốc chỉ giữ trong RAM để role admin duyệt; DB và public WS luôn nhận tên đã lọc. */
  private playerNames = new Map<string, { originalName: string; result: FilteredPlayerName }>();

  private constructor(
    private readonly deps: RuntimeDeps,
    readonly session: SessionRow,
    engine: EngineState,
  ) {
    this.engine = engine;
    this.metrics = {
      received: 0,
      accepted: 0,
      rejected: Object.fromEntries(REJECT_REASONS.map((r) => [r, 0])) as Record<RejectReason, number>,
    };
    this.health = {
      source: deps.adapter.source,
      status: deps.adapter.status(),
      connectedSinceMs: null,
      lastCommentAtMs: null,
      commentsReceived: 0,
      reconnects: 0,
      detail: null,
    };
    const cfg = session.config;
    this.audience = new AudienceManager(
      deps.store,
      cfg.characterPool ?? (deps.characterPool?.length ? deps.characterPool : DEFAULT_CHARACTER_POOL),
      cfg.seed !== undefined ? cfg.seed >>> 0 : hashSeed(session.id),
    );
  }

  get id() {
    return this.session.id;
  }
  get config(): SessionConfig {
    return this.session.config;
  }
  private get store() {
    return this.deps.store;
  }
  private get scheduler() {
    return this.deps.scheduler;
  }
  private get adapter() {
    return this.deps.adapter;
  }

  // -------------------------------------------------------------------------
  // Khởi tạo / khôi phục
  // -------------------------------------------------------------------------

  static async create(deps: RuntimeDeps, req: CreateSessionRequest): Promise<SessionRuntime> {
    const now = deps.scheduler.now();
    const id = `ses-${randomUUID()}`;
    const config = req.config;
    deps.store.createSession({ id, name: req.name, mode: config.mode, packId: config.packId, config, now });
    const engine = createInitialState({
      sessionId: id,
      mode: config.mode,
      timings: config.timings,
      leaderboardInterval: config.leaderboardInterval,
      speedMultiplier: config.speedMultiplier,
      mcVoiceEnabled: config.mcVoiceEnabled,
    });
    deps.store.transaction(() => deps.store.saveGameSnapshot(engine, sceneFor(engine), null, now));
    const rt = new SessionRuntime(deps, deps.store.getSession(id)!, engine);
    await rt.attach();
    return rt;
  }

  /**
   * Mở lại phiên sau khi tiến trình dừng đột ngột. KHÔNG BAO GIỜ tự chạy tiếp:
   * reducer đưa phiên vào PAUSED/RECOVERY, chỉ operator mới chọn Tiếp tục / Huỷ câu / Dừng.
   */
  static async recover(deps: RuntimeDeps, row: SessionRow): Promise<SessionRuntime> {
    const stored = deps.store.latestGameSnapshot(row.id);
    if (!stored) throw new Error(`Phiên ${row.id} không có snapshot trạng thái`);
    // Trạng thái kết nối là sự thật của tiến trình cũ — tiến trình mới chưa kết nối gì.
    const engine: EngineState = { ...stored, connectionOk: false };
    const rt = new SessionRuntime(deps, row, engine);
    // Outbox chưa phát của tiến trình cũ: client sẽ tự lấy snapshot mới qua HELLO, không phát lại hiệu ứng cũ.
    const stale = deps.store.takeUnpublished(row.id);
    deps.store.markPublished(
      stale.map((s) => s.id),
      deps.scheduler.now(),
    );
    rt.rebuildCaches();
    rt.apply({ kind: 'PROCESS_RESTARTED', lastHeartbeatMs: row.lastHeartbeatMs ?? deps.scheduler.now() });
    const integrity = rt.verifyIntegrity();
    if (integrity) rt.apply({ kind: 'FATAL', code: 'SCORE_INTEGRITY', message: integrity });
    await rt.attach();
    return rt;
  }

  private async attach() {
    this.store.pruneProcessedEvents(this.scheduler.now() - 7 * 24 * 3_600_000);
    this.unsubs.push(this.adapter.onComment((c) => this.safe(() => this.ingest(c))));
    this.unsubs.push(this.adapter.onStatus((s) => this.safe(() => this.onConnectionStatus(s))));
    this.beat();
    this.arm();
    if (this.engine.sessionStatus === 'OPEN') {
      try {
        await this.adapter.connect();
      } catch (err) {
        this.health.detail = err instanceof Error ? err.message : String(err);
        this.health.status = this.adapter.status();
        this.store.recordConnectionEvent(this.id, this.adapter.source, 'BLOCKED', this.health.detail, this.scheduler.now());
      }
    }
  }

  private rebuildCaches() {
    const r = this.engine.round;
    if (!r) return;
    this.loadRound(r.roundId);
    this.audience.load(r.roundId);
    this.ranked = rankPlayers(this.store.standings(r.roundId));
    // Cơ sở dữ liệu chỉ giữ tên đã che khi tên bị gắn cờ. Khi phục hồi, tuyệt đối
    // không suy đoán lại tên gốc từ bất kỳ snapshot nào.
    this.refreshNameFilter(false);
    this.participants = this.store.participantCount(r.roundId);
    this.top1 = top1Streaks(this.store.leaderboardHistory(r.roundId));
    const qid = currentQuestionInstanceId(this.engine);
    if (qid) {
      this.countsQid = qid;
      this.counts = this.store.optionCounts(qid);
    }
  }

  private loadRound(roundId: string) {
    if (this.snapshotsRoundId === roundId) return;
    this.snapshots = new Map(this.store.roundQuestions(roundId).map((q) => [q.id, q.snapshot]));
    this.snapshotsRoundId = roundId;
  }

  dispose() {
    this.disposed = true;
    for (const h of [this.timerHandle, this.heartbeatHandle, this.countsHandle]) if (h !== null) this.scheduler.clearTimeout(h);
    this.timerHandle = this.heartbeatHandle = this.countsHandle = null;
    this.simulator?.stop();
    this.simulator = null;
    for (const u of this.unsubs.splice(0)) u();
    void this.adapter.disconnect().catch(() => {});
  }

  /** Tầng app báo số client overlay WS + ACK hiển thị mới nhất. */
  setOverlayInfo(info: AdminSnapshot['overlay']) {
    this.overlayInfo = { ...info };
  }

  liveHealth(): LiveSourceHealth {
    return { ...this.health, status: this.adapter.status() };
  }

  subscribe(fn: RuntimeListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // -------------------------------------------------------------------------
  // Lõi: apply
  // -------------------------------------------------------------------------

  private apply(
    input: EngineInput,
    opts: { action?: CommandEnvelope; prepared?: PreparedSelection } = {},
  ): ApplyResult {
    const now = this.scheduler.now();
    const prev = this.engine;
    const res = transition(prev, input, now);
    if (!res.ok) return res;
    if (!res.changed) return { ok: true, state: prev, events: [] };

    let integrityError: string | null = null;
    try {
      this.store.transaction(() => {
        if (opts.prepared) {
          this.store.createRound({
            id: opts.prepared.round.roundId,
            sessionId: this.id,
            roundNumber: opts.prepared.round.roundNumber,
            seed: opts.prepared.seed,
            selectionMode: 'RANDOM',
            snapshots: opts.prepared.snapshots,
            now,
          });
          this.poolCache = null;
        }
        this.engine = res.state;
        integrityError = this.applyEffects(res.events, now);
        this.audience.flush(now);
        this.store.saveGameSnapshot(
          res.state,
          sceneFor(res.state),
          res.state.timer ? remainingMs(res.state, now) : null,
          now,
        );
        if (opts.action) {
          const result: CommandResult = {
            ok: true,
            stateVersion: res.state.stateVersion,
            state: res.state.state,
            duplicate: false,
          };
          this.recordAction(opts.action, result, now);
        }
        for (const m of this.outboxFor(prev, res.state, res.events, now))
          this.store.addOutbox(this.id, res.state.stateVersion, m.type, m.payload, now);
      });
    } catch (err) {
      // Transaction đã rollback: trả bộ nhớ về trạng thái trước rồi để caller xử lý.
      this.engine = prev;
      this.snapshotsRoundId = null;
      this.rebuildCaches();
      throw err;
    }

    this.publish();
    this.arm();
    this.afterCommit(res.events, input);
    if (integrityError) this.apply({ kind: 'FATAL', code: 'SCORE_INTEGRITY', message: integrityError });
    return { ok: true, state: this.engine, events: res.events };
  }

  /** Hiệu ứng DB theo sự kiện (chạy TRONG transaction). @returns thông điệp lỗi toàn vẹn nếu có. */
  private applyEffects(events: EngineEvent[], now: number): string | null {
    let integrity: string | null = null;
    for (const e of events) {
      switch (e.type) {
        case 'ROUND_STARTED':
          this.store.setRoundStatus(e.roundId, 'RUNNING', now);
          this.snapshotsRoundId = null;
          this.loadRound(e.roundId);
          this.ranked = [];
          this.participants = 0;
          this.top1 = new Map();
          this.audience.startRound(e.roundId, now);
          break;
        case 'QUESTION_OPENED':
          this.store.markQuestion(e.questionInstanceId, 'OPEN', now);
          this.countsQid = e.questionInstanceId;
          this.counts = ZERO_COUNTS();
          break;
        case 'QUESTION_CLOSED':
          this.store.markQuestion(e.questionInstanceId, 'CLOSED', now);
          this.counts = this.store.optionCounts(e.questionInstanceId);
          integrity = this.scoreRound(now, 'AFTER_QUESTION', e.questionInstanceId) ?? integrity;
          break;
        case 'QUESTION_VOIDED':
          this.store.markQuestion(e.questionInstanceId, 'VOIDED', now, e.afterReveal);
          if (e.afterReveal) {
            this.store.insertVoidReversals(this.engine.round!.roundId, e.questionInstanceId, now);
            integrity = this.scoreRound(now, 'AFTER_VOID', e.questionInstanceId) ?? integrity;
          }
          break;
        case 'ROUND_ABORTED':
          this.store.setRoundStatus(e.roundId, 'ABORTED', now);
          break;
        case 'ROUND_ENDED':
          this.store.setRoundStatus(e.roundId, 'COMPLETED', now);
          this.store.saveLeaderboardSnapshot({
            roundId: e.roundId,
            questionInstanceId: null,
            kind: 'FINAL',
            entries: topN(this.ranked, 10),
            participantCount: this.participants,
            now,
          });
          break;
        case 'SESSION_STOPPED':
          this.store.closeSession(this.id, now);
          break;
        case 'STATE_CHANGED': {
          const every = this.config.audienceRotateEvery ?? 2;
          const qi = this.engine.round?.questionIndex ?? 0;
          if (e.to === 'PREPARE' && (e.from === 'REVEAL' || e.from === 'LEADERBOARD') && every > 0 && qi > 0 && qi % every === 0) {
            const top = this.ranked.slice(0, this.config.audiencePinTop ?? 3).map((x) => x.playerId);
            this.audience.rotateBetweenQuestions(now, top);
          }
          break;
        }
        case 'VICTORY_STARTED':
        case 'AUTO_START_REQUESTED':
        case 'MC_READING_ABORTED':
        case 'RECOVERY_REQUIRED':
        case 'ERROR_RAISED':
          break;
        default: {
          const never: never = e;
          throw new Error(`Sự kiện chưa xử lý: ${JSON.stringify(never)}`);
        }
      }
    }
    return integrity;
  }

  /**
   * Chấm lại TOÀN VÒNG từ dữ liệu gốc, ghi phần sổ cái còn thiếu (idempotent),
   * rồi đối chiếu tổng sổ cái với kết quả tính. Lệch ⇒ lỗi toàn vẹn (FATAL).
   */
  private scoreRound(now: number, kind: 'AFTER_QUESTION' | 'AFTER_VOID', qid: string): string | null {
    const r = this.engine.round!;
    this.loadRound(r.roundId);
    const { ledger, totals } = computeRoundScores(
      this.scoringQuestions(r),
      this.store.answersForRound(r.roundId),
      { mode: this.config.scoringMode ?? 'CLASSIC', speedBonusMax: this.config.speedBonusMax ?? 0 },
    );
    this.store.insertLedger(r.roundId, ledger, now);
    this.store.saveRoundPlayers(r.roundId, totals.values(), now);
    const integrity = this.compareLedger(r.roundId, totals);
    this.ranked = rankPlayers(this.store.standings(r.roundId));
    this.participants = this.store.participantCount(r.roundId);
    this.store.saveLeaderboardSnapshot({
      roundId: r.roundId,
      questionInstanceId: qid,
      kind,
      entries: topN(this.ranked, 10),
      participantCount: this.participants,
      now,
    });
    this.top1 = top1Streaks(this.store.leaderboardHistory(r.roundId));
    return integrity;
  }

  /** Câu hỏi của vòng cho bộ chấm điểm: kèm thời điểm mở + độ dài cửa sổ (thưởng tốc độ). */
  private scoringQuestions(r: NonNullable<EngineState['round']>) {
    this.loadRound(r.roundId);
    const opened = new Map(this.store.roundQuestions(r.roundId).map((q) => [q.id, q.openedAtMs]));
    const windowMs = Math.max(0, Math.round(this.config.timings.answerMs / this.engine.speedMultiplier));
    return [...this.snapshots.values()].map((s) => ({
      questionInstanceId: s.questionInstanceId,
      index: s.index,
      correctOptionId: s.correctOptionId,
      closed: r.closed.includes(s.questionInstanceId),
      voided: r.voided.includes(s.questionInstanceId),
      openedAtMs: opened.get(s.questionInstanceId) ?? null,
      windowMs,
    }));
  }

  private compareLedger(roundId: string, totals: Map<string, { score: number }>): string | null {
    const sums = this.store.ledgerTotals(roundId);
    const bad: string[] = [];
    for (const [pid, t] of totals) if ((sums.get(pid) ?? 0) !== t.score) bad.push(pid);
    for (const [pid, s] of sums) if (!totals.has(pid) && s !== 0) bad.push(pid);
    return bad.length
      ? `Sổ cái lệch với điểm tính lại ở vòng ${roundId} (${bad.length} người chơi, ví dụ ${bad.slice(0, 3).join(', ')})`
      : null;
  }

  /** Kiểm toàn vẹn khi khôi phục: tính lại vòng hiện tại và so với sổ cái đã lưu (không ghi gì). */
  verifyIntegrity(): string | null {
    const r = this.engine.round;
    if (!r) return null;
    this.loadRound(r.roundId);
    const { totals } = computeRoundScores(
      this.scoringQuestions(r),
      this.store.answersForRound(r.roundId),
      { mode: this.config.scoringMode ?? 'CLASSIC', speedBonusMax: this.config.speedBonusMax ?? 0 },
    );
    return this.compareLedger(r.roundId, totals);
  }

  private afterCommit(events: EngineEvent[], input: EngineInput) {
    for (const e of events) {
      if (e.type === 'QUESTION_OPENED') {
        const snap = this.snapshots.get(e.questionInstanceId);
        if (snap && this.simulator)
          this.simulator.onQuestionOpened({
            questionInstanceId: e.questionInstanceId,
            correctOptionId: snap.correctOptionId,
            windowMs: this.engine.timer?.durationMs ?? 0,
          });
      } else if (e.type === 'SESSION_STOPPED') {
        this.simulator?.stop();
        this.simulator = null;
        if (this.heartbeatHandle !== null) this.scheduler.clearTimeout(this.heartbeatHandle);
        this.heartbeatHandle = null;
      } else if (e.type === 'AUTO_START_REQUESTED') {
        const out = this.systemCommand({ type: 'START_ROUND' });
        if (!out.result.ok) {
          this.notice = { code: 'AUTO_START_FAILED', message: out.result.message };
          this.systemCommand({ type: 'SET_AUTO_MODE', enabled: false, reason: 'Tự động bắt đầu vòng thất bại' });
        }
      }
    }
    void input;
  }

  // -------------------------------------------------------------------------
  // Đồng hồ, heartbeat
  // -------------------------------------------------------------------------

  private arm() {
    if (this.timerHandle !== null) this.scheduler.clearTimeout(this.timerHandle);
    this.timerHandle = null;
    const t = this.engine.timer;
    if (this.disposed || !t || t.deadlineMs === null || this.engine.sessionStatus === 'CLOSED') return;
    const version = this.engine.stateVersion;
    const deadline = t.deadlineMs;
    const fire = () => {
      this.timerHandle = null;
      if (this.disposed || this.engine.stateVersion !== version) return;
      const left = deadline - this.scheduler.now();
      if (left > 0) {
        this.timerHandle = this.scheduler.setTimeout(fire, left);
        return;
      }
      this.safe(() => this.apply({ kind: 'TIMER_ELAPSED', expectedStateVersion: version }));
    };
    this.timerHandle = this.scheduler.setTimeout(fire, deadline - this.scheduler.now());
  }

  private beat() {
    if (this.disposed || this.engine.sessionStatus === 'CLOSED') return;
    this.store.heartbeat(this.id, this.scheduler.now());
    this.audience.flush(this.scheduler.now());
    this.heartbeatHandle = this.scheduler.setTimeout(() => this.beat(), HEARTBEAT_MS);
  }

  private safe(fn: () => void) {
    try {
      fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        this.apply({ kind: 'FATAL', code: 'RUNTIME_EXCEPTION', message });
      } catch {
        /* DB hỏng hẳn: không thể làm gì thêm, giữ nguyên trạng thái trong bộ nhớ */
      }
    }
  }

  // -------------------------------------------------------------------------
  // Lệnh operator
  // -------------------------------------------------------------------------

  dispatch(raw: unknown): DispatchOutcome {
    const parsed = CommandEnvelopeSchema.safeParse(raw);
    if (!parsed.success) {
      const result: CommandResult = {
        ok: false,
        code: 'VALIDATION_FAILED',
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        stateVersion: this.engine.stateVersion,
        duplicate: false,
      };
      return { status: 422, result };
    }
    const env = parsed.data;
    const prior = this.store.findAction(env.commandId);
    if (prior) {
      const result = { ...(JSON.parse(prior.resultJson) as CommandResult), duplicate: true };
      return { status: statusForResult(result), result };
    }

    const now = this.scheduler.now();
    const cmd = env.command;
    if (this.config.mode === 'TIKTOK' && (cmd.type === 'START_ROUND' || cmd.type === 'RESTART_ROUND')) {
      let failures: { id: string; reason: string }[];
      try {
        const result = this.deps.preflight?.(this);
        failures = result
          ? result.checks.filter((item) => item.status === 'FAIL').map(({ id, reason }) => ({ id, reason }))
          : [{ id: 'preflight', reason: 'Chưa cấu hình bộ kiểm tra preflight cho phiên TIKTOK.' }];
      } catch (error) {
        failures = [{ id: 'preflight', reason: error instanceof Error ? error.message : String(error) }];
      }
      if (failures.length > 0) {
        const action = cmd.type === 'RESTART_ROUND' ? 'khởi động lại' : 'bắt đầu';
        const message = `Không thể ${action} vòng TIKTOK khi preflight còn mục FAIL: ${failures.map((item) => `${item.id}: ${item.reason}`).join('; ')}`;
        const result: CommandResult = {
          ok: false,
          code: 'PREFLIGHT_FAILED',
          message,
          stateVersion: this.engine.stateVersion,
          duplicate: false,
          details: failures,
        };
        this.notice = { code: 'PREFLIGHT_FAILED', message };
        this.store.transaction(() => this.recordAction(env, result, now));
        if (this.engine.autoMode) {
          this.systemCommand({ type: 'SET_AUTO_MODE', enabled: false, reason: 'Preflight TIKTOK không đạt.' });
        } else {
          this.emitAdmin();
        }
        return { status: 422, result };
      }
    }
    let prepared: PreparedSelection | undefined;
    if (this.needsPreparedRound(env)) {
      const count = 'questionCount' in cmd && cmd.questionCount ? cmd.questionCount : this.config.questionsPerRound;
      const allowReuse = 'allowReuse' in cmd ? !!cmd.allowReuse : false;
      const sel = this.prepareRound(count, allowReuse, now);
      if (!sel.ok) {
        const result: CommandResult = {
          ok: false,
          code: 'INSUFFICIENT_QUESTIONS',
          message: `Không đủ câu hỏi chưa dùng: cần ${sel.required}, còn ${sel.unused} (đủ điều kiện ${sel.eligible}). Hãy giảm số câu, cho phép dùng lại hoặc đổi bộ câu hỏi.`,
          stateVersion: this.engine.stateVersion,
          duplicate: false,
          details: sel,
        };
        this.store.transaction(() => this.recordAction(env, result, now));
        return { status: 422, result };
      }
      prepared = sel.prepared;
    }

    const res = this.apply(
      {
        kind: 'COMMAND',
        expectedStateVersion: env.expectedStateVersion,
        command: cmd,
        ...(prepared ? { preparedRound: prepared.round } : {}),
      },
      { action: env, ...(prepared ? { prepared } : {}) },
    );
    if (!res.ok) {
      const result: CommandResult = {
        ok: false,
        code: res.code,
        message: res.message,
        stateVersion: this.engine.stateVersion,
        duplicate: false,
      };
      this.store.transaction(() => this.recordAction(env, result, now));
      return { status: statusForResult(result), result };
    }
    if (cmd.type === 'SET_AUTO_MODE' && cmd.enabled) this.notice = null;
    const result: CommandResult = { ok: true, stateVersion: res.state.stateVersion, state: res.state.state, duplicate: false };
    return { status: 200, result };
  }

  /** Lệnh nội bộ (auto mode) — đi cùng đường kiểm toán với lệnh operator. */
  systemCommand(command: CommandBody): DispatchOutcome {
    return this.dispatch({
      commandId: `sys-${randomUUID()}`,
      expectedStateVersion: this.engine.stateVersion,
      operatorId: 'system',
      requestedAtMs: this.scheduler.now(),
      command,
    });
  }

  private needsPreparedRound(env: CommandEnvelope): boolean {
    const e = this.engine;
    if (env.expectedStateVersion !== e.stateVersion || e.sessionStatus === 'CLOSED') return false;
    if (e.suspended?.kind === 'RECOVERY') return false;
    if (env.command.type === 'START_ROUND') return e.state === 'LOBBY';
    if (env.command.type === 'RESTART_ROUND')
      return !!e.round && ['PREPARE', 'ACCEPTING', 'REVEAL', 'LEADERBOARD'].includes(effectiveState(e));
    return false;
  }

  private prepareRound(
    count: number,
    allowReuse: boolean,
    now: number,
  ):
    | { ok: true; prepared: PreparedSelection }
    | { ok: false; eligible: number; unused: number; required: number } {
    const roundNumber = this.store.nextRoundNumber(this.id);
    const roundId = `${this.id}:r${roundNumber}`;
    const seed =
      this.config.seed !== undefined ? (this.config.seed + roundNumber * 7919) | 0 : randomInt(1, 2 ** 31 - 1);
    const sel = selectRound({
      roundId,
      seed,
      count,
      pool: this.store.listQuestions(this.config.packId),
      usedInSession: this.store.usedQuestionIdsInSession(this.id),
      allowDemo: this.config.mode === 'MOCK' && this.config.allowDemoQuestions,
      allowReuse,
      nowMs: now,
      selectionMode: this.config.questionSelectionMode,
      difficultyTargets: this.config.difficultyTargets,
      difficultyTolerance: this.config.difficultyTolerance,
      onDistribution: ({ counts, targetCounts, tolerance }) => this.deps.warn?.(
        `[quiz] Phân bố độ khó: ${formatDifficultyCounts(counts)} (mục tiêu ${formatDifficultyCounts(targetCounts)} ±${tolerance}).`,
      ),
    });
    if (!sel.ok) return { ok: false, eligible: sel.eligible, unused: sel.unused, required: sel.required };
    return {
      ok: true,
      prepared: {
        round: { roundId, roundNumber, questionInstanceIds: sel.snapshots.map((s) => s.questionInstanceId) },
        seed,
        snapshots: sel.snapshots,
      },
    };
  }

  private recordAction(env: CommandEnvelope, result: CommandResult, now: number) {
    this.store.recordAction({
      commandId: env.commandId,
      sessionId: this.id,
      operatorId: env.operatorId,
      commandType: env.command.type,
      reason: env.command.reason ?? null,
      expectedStateVersion: env.expectedStateVersion,
      resultStateVersion: result.stateVersion,
      accepted: result.ok,
      resultJson: JSON.stringify(result),
      requestedAtMs: env.requestedAtMs,
      now,
    });
  }

  // -------------------------------------------------------------------------
  // Nhận comment (đường nóng)
  // -------------------------------------------------------------------------

  ingest(raw: RawComment): { accepted: true } | { accepted: false; reason: RejectReason } {
    const now = this.scheduler.now();
    this.metrics.received += 1;
    this.health.commentsReceived += 1;
    this.health.lastCommentAtMs = now;
    const parsed = CommentEventSchema.safeParse({ ...raw, receivedAtMs: now });
    if (!parsed.success || !parsed.data.userId.trim()) return this.reject('INVALID_EVENT', now);
    const ev = parsed.data;

    const win = acceptWindow(this.engine);
    const decision = decideComment(ev, win ? { accepting: true, ...win } : null, {
      maxSourceLagMs: this.config.maxSourceLagMs,
    });
    if (!decision.ok) return this.reject(decision.reason, now);

    const qid = currentQuestionInstanceId(this.engine)!;
    const roundId = this.engine.round!.roundId;
    if (ev.eventId) {
      const key = `${ev.source}:${ev.eventId}`;
      if (this.seenEvents.has(key)) return this.reject('DUPLICATE_EVENT', now);
      this.seenEvents.add(key);
      if (this.seenEvents.size > MAX_SEEN_EVENTS) {
        const first = this.seenEvents.values().next().value;
        if (first !== undefined) this.seenEvents.delete(first);
      }
    }

    const sourceName = String(ev.displayName ?? '').trim();
    const originalName = sourceName ? sanitizeDisplayName(sourceName) : '';
    const accepted = this.store.transaction(() => {
      // Bền qua khởi động lại: eventId đã xử lý (kể cả ở tiến trình trước) không bao giờ được tính lại.
      if (ev.eventId && !this.store.markEventProcessed(ev.source, ev.eventId, qid, now)) return 'DUP_EVENT' as const;
      const existingId = this.store.findPlayerId(ev.source, ev.userId);
      const firstPass = this.deps.nameFilter?.evaluate(originalName, existingId) ?? {
        safeDisplayName: originalName,
        displayName: originalName,
        flagged: false,
        risk: 'NONE' as const,
        displayAction: 'ALLOW' as const,
        matchedRuleIds: [],
        matchedRuleGroups: [],
        requiresReview: false,
        policyVersion: 1,
        checkedAt: now,
        reasonCategory: null,
      };
      // resolvePlayer chỉ nhận tên đã che. Tên gốc flagged không bao giờ chạm SQLite.
      const playerId = existingId ?? this.store.resolvePlayer(ev.source, ev.userId, firstPass.safeDisplayName, now);
      const filtered = this.deps.nameFilter?.evaluate(originalName, playerId) ?? firstPass;
      if (filtered.flagged && existingId && this.playerNames.get(existingId)?.originalName !== originalName)
        this.store.scrubPlayerNameHistory(playerId, [originalName], filtered.safeDisplayName);
      this.store.touchPlayer(playerId, filtered.safeDisplayName, now);
      const outcome = this.store.insertAnswerWithJoin({
        questionInstanceId: qid,
        roundId,
        playerId,
        option: decision.option,
        receivedAtMs: now,
        sourceEventId: ev.eventId ?? null,
      });
      return { playerId, filtered, inserted: outcome.inserted, participantAdded: outcome.participantAdded };
    });
    if (accepted === 'DUP_EVENT') return this.reject('DUPLICATE_EVENT', now);
    if (!accepted) return this.reject('DUPLICATE_ANSWER', now);
    if (accepted.filtered.flagged)
      this.playerNames.set(accepted.playerId, { originalName, result: accepted.filtered });
    else this.playerNames.delete(accepted.playerId);
    if (accepted.filtered.flagged) this.deps.nameFilter?.rememberFlaggedName(accepted.playerId, originalName);
    else this.deps.nameFilter?.forgetFlaggedName(accepted.playerId);
    if (!accepted.inserted) return this.reject('DUPLICATE_ANSWER', now);
    if (accepted.participantAdded) this.participants += 1;
    if (this.audience.onAccepted(accepted.playerId, accepted.filtered.safeDisplayName, now)) this.audienceChanged = true;

    this.metrics.accepted += 1;
    if (this.countsQid === qid) this.counts[decision.option] += 1;
    this.scheduleCounts();
    return { accepted: true };
  }

  private reject(reason: RejectReason, now: number) {
    this.metrics.rejected[reason] += 1;
    this.rejections.push({ atMs: now, reason });
    if (this.rejections.length > MAX_REJECTIONS) this.rejections.shift();
    return { accepted: false as const, reason };
  }

  private scheduleCounts() {
    if (this.countsHandle !== null || this.disposed) return;
    this.countsHandle = this.scheduler.setTimeout(() => {
      this.countsHandle = null;
      const qid = this.countsQid;
      if (!qid) return;
      this.emit([
        {
          audience: 'public',
          message: this.wrap('ANSWER_COUNTS', {
            questionInstanceId: qid,
            answerCount: this.answerCount(),
            participantCount: this.participants,
          }),
        },
        ...(this.audienceChanged && this.publicSnapshot().audience
          ? [{ audience: 'public' as const, message: this.wrap('AUDIENCE_UPDATED', this.publicSnapshot().audience!) }]
          : []),
        { audience: 'admin', message: this.wrap('ADMIN_SNAPSHOT', this.adminSnapshot()) },
      ]);
      this.audienceChanged = false;
    }, COUNTS_THROTTLE_MS);
  }

  private onConnectionStatus(status: ConnectionStatus) {
    const now = this.scheduler.now();
    this.store.recordConnectionEvent(this.id, this.adapter.source, status, null, now);
    const prev = this.health.status;
    this.health.status = status;
    if (status === 'CONNECTED') {
      if (prev === 'RECONNECTING') this.health.reconnects += 1;
      this.health.connectedSinceMs = now;
      this.health.detail = null;
    } else {
      this.health.connectedSinceMs = null;
      this.health.detail = this.adapter.describe?.() ?? this.health.detail;
    }
    this.emit([{ audience: 'public', message: this.wrap('CONNECTION_STATUS', { status }) }]);
    const res = this.apply({ kind: 'CONNECTION_CHANGED', ok: status === 'CONNECTED' });
    if (res.ok && res.events.length === 0) this.emitAdmin();
  }

  // -------------------------------------------------------------------------
  // Công cụ MOCK
  // -------------------------------------------------------------------------

  private mockAdapter(): MockAdapter {
    if (this.config.mode !== 'MOCK' || !(this.adapter instanceof MockAdapter))
      throw new ModeError('Chỉ dùng được trong phiên MOCK');
    return this.adapter;
  }

  simulatorControl(req: SimulatorRequest) {
    const adapter = this.mockAdapter();
    this.simulator?.stop();
    this.simulator = null;
    if (req.action === 'START') {
      this.simulator = new MockSimulator(adapter, this.scheduler, {
        players: simPlayers(req.players),
        accuracy: req.accuracy,
        participation: req.participation,
        spamRate: req.spamRate,
        noiseRate: req.noiseRate,
        seed: req.seed,
      });
    }
    this.emitAdmin();
    return { ok: true, running: !!this.simulator, players: this.simulator?.opts.players.length ?? 0 };
  }

  mockConnection(action: 'LOSE' | 'RESTORE') {
    const adapter = this.mockAdapter();
    if (action === 'LOSE') adapter.simulateConnectionLoss();
    else adapter.simulateConnectionRestore();
    return { ok: true, status: adapter.status() };
  }

  /** Connection Manager (V3.1 mục C): connect / disconnect / reconnect nguồn comment. Không tự resume câu hỏi. */
  async sourceControl(action: 'CONNECT' | 'DISCONNECT' | 'RECONNECT') {
    try {
      if (action !== 'CONNECT') await this.adapter.disconnect();
      if (action !== 'DISCONNECT') {
        await this.adapter.connect();
        if (action === 'RECONNECT') this.health.reconnects += 1;
      }
      this.health.detail = null;
    } catch (err) {
      this.health.detail = err instanceof Error ? err.message : String(err);
    }
    this.health.status = this.adapter.status();
    if (this.health.detail === null && this.health.status !== 'CONNECTED') this.health.detail = this.adapter.describe?.() ?? null;
    this.emitAdmin();
    return { ok: this.health.detail === null, health: this.liveHealth() };
  }

  mockComment(c: { userId: string; displayName: string; text: string; eventId?: string }) {
    const adapter = this.mockAdapter();
    return { ok: adapter.emit(c) };
  }

  // -------------------------------------------------------------------------
  // Snapshot & phát
  // -------------------------------------------------------------------------

  private answerCount() {
    return this.counts.A + this.counts.B + this.counts.C + this.counts.D;
  }

  private publicPlayerIdFor(playerId: string) {
    let publicPlayerId = this.publicPlayerIds.get(playerId);
    if (!publicPlayerId) {
      publicPlayerId = randomUUID();
      this.publicPlayerIds.set(playerId, publicPlayerId);
    }
    return publicPlayerId;
  }

  private safeDisplayNameFor(playerId: string, fallback: string, now: number) {
    return this.playerNames.get(playerId)?.result.safeDisplayName ??
      this.deps.nameFilter?.evaluate(fallback, playerId, now).safeDisplayName ??
      fallback;
  }

  private fastestCorrectAnswerFor(
    roundId: string,
    questionInstanceId: string,
    correctOptionId: OptionId,
    now: number,
  ): FastestCorrectAnswer | null {
    let winner = this.fastestCorrectByQuestion.get(questionInstanceId);
    if (!this.fastestCorrectByQuestion.has(questionInstanceId)) {
      const question = this.store.roundQuestions(roundId).find((row) => row.id === questionInstanceId);
      if (!question || question.status !== 'CLOSED' || question.openedAtMs === null) {
        this.fastestCorrectByQuestion.set(questionInstanceId, null);
        return null;
      }

      let first: { playerId: string; receivedAtMs: number } | null = null;
      // Store.answersForRound is ordered by insertion id. Equal millisecond receipts
      // keep the answer the server accepted first.
      for (const answer of this.store.answersForRound(roundId)) {
        if (answer.questionInstanceId !== questionInstanceId || answer.option !== correctOptionId) continue;
        if (first === null || answer.receivedAtMs < first.receivedAtMs) first = answer;
      }
      winner = first
        ? { playerId: first.playerId, responseMs: Math.max(0, first.receivedAtMs - question.openedAtMs) }
        : null;
      this.fastestCorrectByQuestion.set(questionInstanceId, winner);
    }
    if (!winner) return null;

    const ranked = this.ranked.find((entry) => entry.playerId === winner.playerId);
    if (!ranked) return null;
    return {
      questionInstanceId,
      publicPlayerId: this.publicPlayerIdFor(winner.playerId),
      seatId: this.audience.seatForPlayer(winner.playerId)?.slotId ?? null,
      safeDisplayName: this.safeDisplayNameFor(winner.playerId, ranked.displayName, now),
      responseMs: winner.responseMs,
    };
  }

  /** Đánh giá lại tên của người chơi trong vòng hiện tại sau khi admin đổi luật. */
  refreshNameFilter(emit = true) {
    if (!this.engine.round || !this.deps.nameFilter) return;
    const displayNames = new Map<string, string>();
    const sessionIds = new Set(this.store.listPlayerIdsInSession(this.id));
    for (const player of this.store.listPlayers()) {
      if (!sessionIds.has(player.id)) continue;
      const originalName = this.playerNames.get(player.id)?.originalName ??
        this.deps.nameFilter.rawFlaggedName(player.id) ?? player.displayName;
      const result = this.deps.nameFilter.evaluate(originalName, player.id);
      if (result.flagged) {
        this.playerNames.set(player.id, { originalName, result });
        this.deps.nameFilter.rememberFlaggedName(player.id, originalName);
        // Nếu một tên sạch trước đó bị luật mới gắn cờ, DB chỉ còn bản đã che.
        if (player.displayName !== result.safeDisplayName) {
          this.store.transaction(() => {
            this.store.scrubPlayerNameHistory(player.id, [originalName], result.safeDisplayName);
            this.store.updatePlayerDisplayName(player.id, result.safeDisplayName);
          });
        }
      } else {
        this.playerNames.delete(player.id);
        this.deps.nameFilter.forgetFlaggedName(player.id);
        if (player.displayName !== result.safeDisplayName) this.store.updatePlayerDisplayName(player.id, result.safeDisplayName);
      }
      displayNames.set(player.id, result.safeDisplayName);
      if (this.audience.updateDisplayName(player.id, result.safeDisplayName)) this.audienceChanged = true;
    }
    this.ranked = this.ranked.map((entry) => ({
      ...entry,
      displayName: displayNames.get(entry.playerId) ?? entry.displayName,
    }));
    if (emit) {
      const now = this.scheduler.now();
      const publicSnapshot = this.publicSnapshot(now);
      this.emit([
        { audience: 'public', message: this.wrap('STATE_SNAPSHOT', publicSnapshot) },
        { audience: 'admin', message: this.wrap('ADMIN_SNAPSHOT', this.adminSnapshot(now)) },
      ]);
      this.audienceChanged = false;
    }
  }

  /** Chỉ operator gọi qua API đã xác thực: Top 10 + ghế hiện tại + mọi cảnh báo còn trong RAM. */
  moderationPlayers(query = '', riskFilter: string | undefined = undefined, now = this.scheduler.now()) {
    const sessionIds = new Set(this.store.listPlayerIdsInSession(this.id));
    const normalizedQuery = query.trim().toLocaleLowerCase('und');
    return this.store.listPlayers().filter((player) => sessionIds.has(player.id)).flatMap((player) => {
      const originalName = this.playerNames.get(player.id)?.originalName ??
        this.deps.nameFilter?.rawFlaggedName(player.id) ?? player.displayName;
      const moderated = this.deps.nameFilter?.evaluate(originalName, player.id, now);
      const safeDisplayName = moderated?.safeDisplayName ?? player.displayName;
      const risk = moderated?.risk ?? 'NONE';
      if (riskFilter && risk !== riskFilter) return [];
      if (normalizedQuery && !originalName.toLocaleLowerCase('und').includes(normalizedQuery) &&
        !safeDisplayName.toLocaleLowerCase('und').includes(normalizedQuery)) return [];
      const rank = this.ranked.find((entry) => entry.playerId === player.id);
      const config = this.deps.nameFilter?.get();
      return [{
        playerId: player.id,
        rawDisplayName: originalName,
        safeDisplayName,
        risk,
        displayAction: moderated?.displayAction === 'PARTIAL_MASK' ? 'PARTIAL_MASK' :
          moderated?.displayAction === 'ANONYMIZE' ? 'ALIAS' : 'SAFE_NAME',
        matchedRuleIds: moderated?.matchedRuleIds ?? [],
        matchedRuleGroups: moderated?.matchedRuleGroups ?? [],
        requiresReview: moderated?.requiresReview ?? false,
        policyVersion: moderated?.policyVersion ?? 0,
        checkedAt: moderated?.checkedAt ?? now,
        hidden: config?.hiddenPlayerIds.includes(player.id) ?? false,
        reviewAllowed: config?.allowedReviewPlayerIds.includes(player.id) ?? false,
        score: rank?.score ?? 0,
        rank: rank && rank.rank <= 10 ? rank.rank : null,
        seat: this.audience.seatForPlayer(player.id),
      }];
    });
  }

  publicSnapshot(now = this.scheduler.now()): PublicSnapshot {
    const e = this.engine;
    const eff = effectiveState(e);
    const qid = currentQuestionInstanceId(e);
    const snap = qid ? this.snapshots.get(qid) : undefined;
    // LEADERBOARD ngắn sau mỗi câu vẫn ở bố cục câu hỏi (đáp án đã công bố); chỉ mốc mới là BXH lớn.
    const bigBoard = eff === 'LEADERBOARD' && isInterimLeaderboard(e);
    const postReveal = eff === 'REVEAL' || (eff === 'LEADERBOARD' && !bigBoard);
    const showQuestion = !!snap && (eff === 'PREPARE' || eff === 'READING' || eff === 'ACCEPTING' || postReveal);
    // PREPARE chỉ hiện câu hỏi; READING hiện đủ bốn đáp án để MC đọc, chưa mở nhận comment.
    const showOptions = showQuestion && eff !== 'PREPARE';
    const showReveal = !!snap && postReveal;
    const showFastestCorrect = !!snap && !!e.round && postReveal;
    let leaderboard: PublicSnapshot['leaderboard'] = null;
    const withChar = (list: LeaderboardEntry[]) =>
      list.map((x) => {
        const characterId = this.audience.characterOf(x.playerId);
        const top1Streak = this.top1.get(x.playerId);
        return {
          rank: x.rank,
          tied: x.tied,
          playerId: this.publicPlayerIdFor(x.playerId),
          safeDisplayName: this.safeDisplayNameFor(x.playerId, x.displayName, now),
          score: x.score,
          correctCount: x.correctCount,
          ...(characterId ? { characterId } : {}),
          ...(top1Streak ? { top1Streak } : {}),
        };
      });
    if (e.round && (bigBoard || eff === 'ROUND_END' || eff === 'VICTORY' || eff === 'INTERMISSION'))
      leaderboard = { kind: 'FULL', entries: withChar(topN(this.ranked, 10)) };
    // Top 10 gọn cạnh câu hỏi (V3 §10) — chỉ cập nhật khi chốt câu, không đổi trong lúc trả lời.
    else if (e.round && (eff === 'PREPARE' || eff === 'READING' || eff === 'ACCEPTING' || postReveal))
      leaderboard = { kind: 'COMPACT', entries: withChar(topN(this.ranked, 10)) };
    const revealView = showReveal
      ? {
          questionInstanceId: snap!.questionInstanceId,
          correctOptionId: snap!.correctOptionId,
          optionCounts: { ...this.counts },
          explanation: snap!.explanation,
        }
      : null;
    const fastestCorrectAnswer = showFastestCorrect
      ? this.fastestCorrectAnswerFor(e.round!.roundId, snap!.questionInstanceId, snap!.correctOptionId, now)
      : null;
    return {
      contractVersion: CONTRACT_VERSION,
      sessionId: this.id,
      stateVersion: e.stateVersion,
      state: e.state,
      scene: sceneFor(e),
      paused: e.state === 'PAUSED',
      mode: e.mode,
      timer: e.timer
        ? { durationMs: e.timer.durationMs, remainingMs: remainingMs(e, now), running: e.timer.deadlineMs !== null }
        : null,
      round: e.round
        ? { roundNumber: e.round.roundNumber, questionIndex: e.round.questionIndex, questionCount: e.round.questionInstanceIds.length }
        : null,
      // PublicQuestion dựng tường minh: KHÔNG có correctOptionId / originalOptionId.
      question: showQuestion
        ? {
            questionInstanceId: snap!.questionInstanceId,
            index: snap!.index,
            prompt: snap!.prompt,
            options: showOptions ? snap!.options.map((o) => ({ id: o.id, text: o.text })) : [],
            optionsVisible: showOptions,
            isDemo: snap!.isDemo,
          }
        : null,
      answerCount: showOptions ? this.answerCount() : 0,
      participantCount: e.round ? this.participants : 0,
      fastestCorrectAnswer,
      reveal: revealView,
      leaderboard,
      podium:
        e.round && (eff === 'ROUND_END' || eff === 'VICTORY')
          ? (() => {
              const p = buildPodium(this.ranked);
              return { ...p, slots: p.slots.map((s) => ({ ...s, entries: withChar(s.entries) })) };
            })()
          : null,
      mc: mcFor(e, revealView),
      audience: e.round && this.audience.active
        ? this.audience.view(revealView ? { qid: revealView.questionInstanceId, correctOptionId: revealView.correctOptionId } : null)
        : null,
      connection: this.adapter.status(),
      safeZone: INITIAL_TEST_SAFE_ZONE,
    };
  }

  adminSnapshot(now = this.scheduler.now()): AdminSnapshot {
    const e = this.engine;
    const qid = currentQuestionInstanceId(e);
    const snap = qid ? this.snapshots.get(qid) : undefined;
    return {
      public: this.publicSnapshot(now),
      flaggedPlayers: [...this.playerNames.entries()].flatMap(([playerId, item]) =>
        item.result.flagged && item.result.reasonCategory
          ? [{
              playerId,
              rawDisplayName: item.originalName,
              safeDisplayName: item.result.safeDisplayName,
              flagged: true as const,
              risk: item.result.risk === 'NONE' ? 'REVIEW' as const : item.result.risk,
              displayAction: item.result.displayAction === 'ANONYMIZE' ? 'ALIAS' as const :
                item.result.displayAction === 'PARTIAL_MASK' ? 'PARTIAL_MASK' as const : 'SAFE_NAME' as const,
              matchedRuleIds: [...item.result.matchedRuleIds],
              matchedRuleGroups: [...item.result.matchedRuleGroups],
              requiresReview: item.result.requiresReview,
              policyVersion: item.result.policyVersion,
              checkedAt: item.result.checkedAt,
            }]
          : [],
      ),
      sessionStatus: e.sessionStatus,
      autoMode: e.autoMode,
      recoveryPending: e.suspended?.kind === 'RECOVERY',
      suspendedFrom: e.suspended?.from ?? null,
      config: this.config,
      current: snap
        ? {
            questionInstanceId: snap.questionInstanceId,
            correctOptionId: snap.correctOptionId,
            optionCounts: { ...this.counts },
            voided: !!e.round?.voided.includes(snap.questionInstanceId),
          }
        : null,
      metrics: { ...this.metrics, rejected: { ...this.metrics.rejected } },
      recentRejections: [...this.rejections].reverse().slice(0, 20),
      pool: this.pool(now),
      simulator: this.simulator ? { running: this.simulator.running, players: this.simulator.opts.players.length } : null,
      error: e.error ?? this.notice,
      live: { ...this.health, status: this.adapter.status() },
      overlay: { ...this.overlayInfo },
    };
  }

  private pool(now: number): AdminSnapshot['pool'] {
    if (this.poolCache) return this.poolCache;
    const allowDemo = this.config.mode === 'MOCK' && this.config.allowDemoQuestions;
    const eligible = this.store.listQuestions(this.config.packId).filter((q) => isEligible(q, { allowDemo, nowMs: now }));
    const used = this.store.usedQuestionIdsInSession(this.id);
    const unused = eligible.filter((q) => !used.has(q.id)).length;
    const required = this.config.questionsPerRound;
    this.poolCache = { eligible: eligible.length, unusedInSession: unused, requiredNextRound: required, lowPoolWarning: unused < required };
    return this.poolCache;
  }

  private outboxFor(prev: EngineState, next: EngineState, events: EngineEvent[], now: number) {
    const out: { type: WsMessageType; payload: unknown }[] = [];
    const pub = this.publicSnapshot(now);
    out.push({ type: 'STATE_SNAPSHOT', payload: pub });
    if (sceneFor(prev) !== pub.scene || prev.state !== next.state)
      out.push({ type: 'SCENE_CHANGED', payload: { scene: pub.scene, state: pub.state } });
    for (const e of events) {
      if (e.type === 'QUESTION_OPENED' && pub.question) out.push({ type: 'QUESTION_OPENED_PUBLIC', payload: pub.question });
      if (e.type === 'QUESTION_CLOSED' && pub.reveal) out.push({ type: 'ANSWER_REVEALED', payload: pub.reveal });
      if (e.type === 'VICTORY_STARTED' && pub.podium) out.push({ type: 'VICTORY_STARTED', payload: { podium: pub.podium } });
      if (e.type === 'ERROR_RAISED')
        out.push({ type: 'ERROR_PUBLIC', payload: { code: 'PAUSED_TECHNICAL', message: 'Tạm dừng kỹ thuật' } });
    }
    if (pub.leaderboard && events.some((e) => e.type === 'QUESTION_CLOSED' || e.type === 'QUESTION_VOIDED' || e.type === 'STATE_CHANGED'))
      out.push({ type: 'LEADERBOARD_UPDATED', payload: pub.leaderboard });
    return out;
  }

  private publish() {
    const rows = this.store.takeUnpublished(this.id);
    if (rows.length === 0) return;
    const now = this.scheduler.now();
    const batch: Outgoing[] = rows.map((r) => ({
      audience: 'public',
      message: {
        v: CONTRACT_VERSION,
        type: r.type,
        seq: ++this.seq,
        sessionId: this.id,
        stateVersion: r.stateVersion,
        serverTimeMs: now,
        payload: r.payload,
      } as WsMessage,
    }));
    batch.push({ audience: 'admin', message: this.wrap('ADMIN_SNAPSHOT', this.adminSnapshot(now)) });
    this.store.markPublished(
      rows.map((r) => r.id),
      now,
    );
    this.emit(batch);
  }

  private emitAdmin() {
    this.emit([{ audience: 'admin', message: this.wrap('ADMIN_SNAPSHOT', this.adminSnapshot()) }]);
  }

  wrap<T extends WsMessageType>(type: T, payload: WsPayloads[T]): WsMessage<T> {
    return {
      v: CONTRACT_VERSION,
      type,
      seq: ++this.seq,
      sessionId: this.id,
      stateVersion: this.engine.stateVersion,
      serverTimeMs: this.scheduler.now(),
      payload,
    } as WsMessage<T>;
  }

  private emit(batch: Outgoing[]) {
    for (const fn of [...this.listeners]) {
      try {
        fn(batch);
      } catch {
        /* lỗi của một client không được làm hỏng runtime */
      }
    }
  }
}

export class ModeError extends Error {}

/** Seed ổn định (≥ 0) từ chuỗi — dùng khi phiên không đặt seed. */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
