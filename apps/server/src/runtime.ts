import { randomInt, randomUUID } from 'node:crypto';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import {
  CONTRACT_VERSION,
  CommandEnvelopeSchema,
  CommentEventSchema,
  DEFAULT_MC_READING_MS,
  INITIAL_TEST_SAFE_ZONE,
  MAX_MC_READING_MS,
  McChatRequestSchema,
  MC_VOICE_POLICY_VERSION,
  DEFAULT_PRIORITY_SHARE,
  DEFAULT_PRIORITY_TOPIC_NAMES,
  PRIORITY_TOPIC_SETTINGS_KEY,
  PriorityTopicSettingsSchema,
  McVoiceCueSchema,
  McVoiceEventSchema,
  type McVoiceCue,
  type McChatQueueItem,
  type McVoiceCountdownSchedule,
  type McVoiceEvent,
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
  type ThroneView,
  type PublicAchievementSnapshot,
  type RankingSnapshot,
  type StageDefinition,
  type QuestionSnapshot,
  type RawComment,
  type RejectReason,
  type SpamWarningReason,
  type SessionConfig,
  type UpdateStreamDelaySettings,
  type SimulatorRequest,
  type WsMessage,
  type WsMessageType,
  type WsPayloads,
} from '@quiz/contracts';
import {
  acceptWindow,
  buildPodium,
  computeQuestionScoreDeltaFromCorrectRows,
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
  rankSortedPlayers,
  remainingMs,
  sanitizeDisplayName,
  sceneFor,
  selectRound,
  questionTop3 as buildQuestionTop3,
  ACHIEVEMENT_REGISTRY,
  evaluateRoundAchievements,
  evaluateStageAchievements,
  stageDefinitions,
  stageScores,
  stageTop3 as buildStageTop3,
  topN,
  top1Streaks,
  clampStreamDelayMs,
  DEFAULT_STREAM_DELAY_MS,
  effectiveElapsedMs,
  estimateStreamDelayMs,
  transition,
  type EngineEvent,
  type AchievementEvaluationInput,
  type AchievementSnapshotResult,
  type EngineInput,
  type EngineState,
  type LedgerEntry,
  type PreparedRound,
  type PlayerTotals,
} from '@quiz/quiz-core';
import { MockAdapter, MockSimulator, type LiveAdapter, type Scheduler, type SimPlayer } from '@quiz/live-adapters';
import type { FilteredPlayerName } from '@quiz/name-filter';
import type { QuestionScoringRow, RoundQuestionRow, SessionRow, Store } from '@quiz/persistence';
import { AudienceManager, DEFAULT_CHARACTER_POOL } from './audience';
import { chooseThroneHolder, replayThrone, type ThroneCandidate, type ThroneQuestion, type ThroneReplay } from './throne';
import type { NameFilterStore } from './name-filter-store';
import { McVoiceService, type McVoiceReadingBundle, type McVoiceReadingLine } from './voice/service';
import { mcVoiceSettingsForEvent, type McVoiceProfile } from './voice/types';
import { planQuestionCueSchedule, questionVoiceScripts } from './voice/question-script';
import { containsPlayerIdentity } from './voice/safety';
import { lobbyKeywordMatcher } from './lobby-keyword';

const COUNTDOWN_SCRIPT: Readonly<Record<number, string>> = {
  10: 'Còn 10 giây!',
  5: 'Năm',
  4: 'Bốn',
  3: 'Ba',
  2: 'Hai',
  1: 'Một',
};
const SPAM_REMINDER_TEXT = 'Nhắc nhẹ nè: mỗi người chỉ một đáp án, bình luận đầu tiên mới được tính nhé!';
const COUNTDOWN_SECONDS = [10, 5, 4, 3, 2, 1] as const;
const MC_CHAT_QUEUE_LIMIT = 5;
const MC_CHAT_GENERATION_TIMEOUT_MS = 10_000;
const MC_CHAT_TEXT_DURATION_MS = 5_000;
const STAGE_ACHIEVEMENT_IDS = ACHIEVEMENT_REGISTRY
  .filter((definition) => definition.scope === 'STAGE' && definition.policy !== 'REUSE_PHASE1')
  .map((definition) => definition.id);
const ROUND_ACHIEVEMENT_IDS = ACHIEVEMENT_REGISTRY
  .filter((definition) => definition.scope === 'ROUND' && definition.policy !== 'REUSE_PHASE1')
  .map((definition) => definition.id);
const LOBBY_REMINDER_INTERVAL_MS = 20_000;
const LOBBY_AUTO_START_AFTER_MS = 30_000;
const LOBBY_AUTO_START_COUNTDOWN_MS = 10_000;
const LOBBY_VOICE_LINES = [
  'Comment Free Fire để giành ghế ngồi nhé!',
  'Ghế đang lấp đầy nhanh lắm!',
  'Còn chờ gì nữa, comment Free Fire ngay!',
  'Mọi người sẵn sàng chưa? Hãy cùng tham gia nào!',
  'Comment Free Fire và vào chỗ thôi!',
] as const;

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
type RoundQuestionCount = NonNullable<Extract<CommandBody, { type: 'START_ROUND' }>['questionCount']>;
type PreparedLobbyRound = {
  selection: PreparedSelection;
  questionCount: RoundQuestionCount;
  allowReuse: boolean;
  signature: string;
};
type PendingRoundStart = {
  selection: PreparedSelection;
  questionCount: RoundQuestionCount;
  allowReuse: boolean;
  signature: string;
  deadlineMs: number;
  timeout: unknown;
};
type RoundVoicePreparation = { signature: string; promise: Promise<void> };
type SpamAttempt = { atMs: number; reason: SpamWarningReason };
type SpamWarning = NonNullable<AdminSnapshot['spamWarnings']>[number];
type McChatEntry = McChatQueueItem & {
  asset: { assetId: string; durationMs: number } | null;
  generationTimeout: unknown | null;
  startTimeout: unknown | null;
  finishTimeout: unknown | null;
  scheduled: boolean;
  previousVoiceTailAtMs: number | null;
  scheduledVoiceTailAtMs: number | null;
};
type EventLoopDelayStats = { resolutionMs: number; samples: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number; meanMs: number };
type SpamAttemptState = {
  source: string;
  userId: string;
  playerId: string | null;
  displayName: string | null;
  safeDisplayName: string | null;
  attempts: SpamAttempt[];
  head: number;
  reasonCounts: Record<SpamWarningReason, number>;
  lastAtMs: number;
  latestReasonSequence: Partial<Record<SpamWarningReason, number>>;
  sequence: number;
};

const ZERO_COUNTS = (): Record<OptionId, number> => ({ A: 0, B: 0, C: 0, D: 0 });
const SPAM_WARNING_REASONS = ['DUPLICATE_ANSWER', 'NOT_ACCEPTING', 'EARLY', 'LATE'] as const satisfies readonly SpamWarningReason[];
const SPAM_WARNING_REASON_SET: ReadonlySet<string> = new Set(SPAM_WARNING_REASONS);
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
const COMMENT_RATE_WINDOW_SECONDS = 5;
const SOURCE_LATENCY_SAMPLE_LIMIT = 512;
const HEARTBEAT_MS = 1_000;
const DEFAULT_START_ROUND_VOICE_WAIT_MS = 30_000;
const QUESTION_AUDIO_MAX_WAIT_MS = 10_000;
const COUNTS_THROTTLE_MS = 250;
const SPAM_CLEANUP_MS = 1_000;
const MC_VOICE_TELEMETRY_REASONS = new Set([
  'UNSAFE_PLAYER_IDENTITY', 'TOO_LONG', 'NOT_CONFIGURED', 'LATE_AUDIO', 'TIMER_LATE', 'CANCELLED', 'ASSET_UNAVAILABLE',
  'AUTH', 'NO_CREDIT', 'RATE_LIMITED', 'FAILED', 'TIMEOUT', 'DOWNLOAD_FAILED', 'INVALID_RESPONSE',
]);

type CommentRateBucket = { second: number; total: number; byQuestion: Map<string, number> };

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
  /** Runtime MC được cấp ngoài app; thiếu cấu hình/credential thì game chạy im lặng. */
  mcVoice?: { service: McVoiceService; profile: McVoiceProfile };
};

export class SessionRuntime {
  engine: EngineState;
  readonly metrics: IngestMetrics;
  private listeners = new Set<RuntimeListener>();
  private timerHandle: unknown = null;
  private heartbeatHandle: unknown = null;
  private countsHandle: unknown = null;
  private spamCleanupHandle: unknown = null;
  private spamSnapshotHandle: unknown = null;
  private readingStartedAtMs: number | null = null;
  private questionVoiceBundles = new Map<string, Promise<McVoiceReadingBundle | null>>();
  private voiceAssetPromises = new Map<string, Promise<{ assetId: string; durationMs: number } | null>>();
  private preparedLobbyRound: PreparedLobbyRound | null = null;
  private pendingRoundStart: PendingRoundStart | null = null;
  private readyQuestionVoiceKeys = new Set<string>();
  private roundVoicePreparation: RoundVoicePreparation | null = null;
  private voiceHandles = new Set<unknown>();
  private countdownSchedule: McVoiceCountdownSchedule | null = null;
  private countdownScheduleGeneration = 0;
  private reminderCues = new Set<string>();
  private voiceTailAtMs = 0;
  private countdownVoiceTailAtMs = 0;
  private systemVoicePending = 0;
  private mcChatQueue: McChatEntry[] = [];
  private mcChatBubble: NonNullable<PublicSnapshot['mcChatBubble']> | null = null;
  private mcChatPumpHandle: unknown = null;
  private welcomeCueRequested = false;
  private lobbyOpenedAtMs: number | null = null;
  private lobbyCountdownEndsAtMs: number | null = null;
  private lobbyNextReminderAtMs: number | null = null;
  private lobbyReminderIndex = 0;
  private lobbyClaimedKeys = new Set<string>();
  private readonly lobbyKeywordMatches: (text: string) => boolean;
  private snapshots = new Map<string, QuestionSnapshot>();
  private snapshotsRoundId: string | null = null;
  private questionRows = new Map<string, RoundQuestionRow>();
  private streamDelaySamples: number[] = [];
  private cachedNextQuestionDelayMs = DEFAULT_STREAM_DELAY_MS;
  private counts = ZERO_COUNTS();
  private countsQid: string | null = null;
  private participants = 0;
  private ranked: LeaderboardEntry[] = [];
  private top1 = new Map<string, number>();
  private throne: ThroneReplay = { unlocked: false, holder: null, correctElapsedMs: new Map() };
  private throneStreaks = new Map<string, number>();
  private publicPlayerIds = new Map<string, string>();
  private fastestCorrectByQuestion = new Map<string, { playerId: string; responseMs: number } | null>();
  private seenEvents = new Set<string>();
  private rejections: { atMs: number; reason: RejectReason }[] = [];
  /** Khóa gồm source + TikTok ID chỉ tồn tại nội bộ; snapshot admin dùng playerId opaque. */
  private spamAttempts = new Map<string, SpamAttemptState>();
  private spamSequence = 0;
  private simulator: MockSimulator | null = null;
  private simulatorEventLoopDelay: ReturnType<typeof monitorEventLoopDelay> | null = null;
  private notice: { code: string; message: string } | null = null;
  private poolCache: AdminSnapshot['pool'] | null = null;
  private unsubs: (() => void)[] = [];
  private disposed = false;
  private seq = 0;
  private health: LiveSourceHealth;
  private readonly commentRateBuckets: CommentRateBucket[] = Array.from({ length: COMMENT_RATE_WINDOW_SECONDS }, () => ({
    second: Number.NaN,
    total: 0,
    byQuestion: new Map<string, number>(),
  }));
  private readonly sourceLatencySamples: number[] = Array.from({ length: SOURCE_LATENCY_SAMPLE_LIMIT }, () => 0);
  private sourceLatencySampleCount = 0;
  private sourceLatencySampleNext = 0;
  private telemetryRoundId: string | null = null;
  private roundStartedAtMs: number | null = null;
  private outageStartedAtMs: number | null = null;
  private overlayInfo: AdminSnapshot['overlay'] = { clients: 0, lastAckStateVersion: null, lastAckAtMs: null };
  /** 30 ghế khán giả dưới ngai (V3 §6). */
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
    this.lobbyKeywordMatches = lobbyKeywordMatcher(session.config.lobbySeatKeyword ?? 'free fire');
    this.metrics = {
      received: 0,
      accepted: 0,
      rejected: Object.fromEntries(REJECT_REASONS.map((r) => [r, 0])) as Record<RejectReason, number>,
    };
    this.health = {
      source: deps.adapter.source,
      status: deps.adapter.status(),
      transport: 'UNKNOWN',
      connectedSinceMs: null,
      lastCommentAtMs: null,
      commentsReceived: 0,
      reconnects: 0,
      reconnectsThisRound: 0,
      downtimeMsThisRound: 0,
      commentsPerSecondTotal: 0,
      commentsPerSecondQuestion: 0,
      sourceLatencyP50Ms: null,
      sourceLatencyP95Ms: null,
      rejectedThisRound: Object.fromEntries(REJECT_REASONS.map((reason) => [reason, 0])) as Record<RejectReason, number>,
      rawRecordingEnabled: deps.adapter.source === 'TIKTOK' && (deps.adapter.rawRecordingEnabled?.() ?? false),
      detail: null,
    };
    const cfg = session.config;
    this.audience = new AudienceManager(
      deps.store,
      cfg.characterPool ?? (deps.characterPool?.length ? deps.characterPool : DEFAULT_CHARACTER_POOL),
      cfg.seed !== undefined ? cfg.seed >>> 0 : hashSeed(session.id),
    );
    this.reloadStreamDelaySamples();
  }

  get id() {
    return this.session.id;
  }
  get config(): SessionConfig {
    return this.session.config;
  }

  /** Chỉ câu kế tiếp đổi cấu hình; câu đang mở dùng stream_delay_ms đã chốt khi mở. */
  updateStreamDelaySettings(settings: UpdateStreamDelaySettings): boolean {
    if (this.engine.sessionStatus !== 'OPEN') return false;
    const config: SessionConfig = {
      ...this.config,
      streamDelayMode: settings.mode,
      streamDelayManualMs: clampStreamDelayMs(settings.manualDelayMs ?? this.config.streamDelayManualMs ?? DEFAULT_STREAM_DELAY_MS),
    };
    this.session.config = config;
    this.store.updateSessionConfig(this.id, config);
    this.recomputeNextQuestionDelay();
    this.emitAdmin();
    return true;
  }

  streamDelayAdminView(): AdminSnapshot['streamDelay'] {
    const roundId = this.engine.round?.roundId;
    const questionInstanceId = currentQuestionInstanceId(this.engine);
    const activeQuestion = roundId && questionInstanceId
      ? this.questionFor(roundId, questionInstanceId)
      : undefined;
    return {
      mode: this.config.streamDelayMode ?? 'AUTO',
      nextQuestionDelayMs: this.cachedNextQuestionDelayMs,
      activeQuestionDelayMs: activeQuestion?.streamDelayMs ?? null,
      manualDelayMs: clampStreamDelayMs(this.config.streamDelayManualMs ?? DEFAULT_STREAM_DELAY_MS),
    };
  }

  private nextQuestionStreamDelayMs(): number {
    return this.cachedNextQuestionDelayMs;
  }

  private recomputeNextQuestionDelay() {
    if ((this.config.streamDelayMode ?? 'AUTO') === 'MANUAL') {
      this.cachedNextQuestionDelayMs = clampStreamDelayMs(
        this.config.streamDelayManualMs ?? DEFAULT_STREAM_DELAY_MS,
      );
      return;
    }
    this.cachedNextQuestionDelayMs = estimateStreamDelayMs(this.streamDelaySamples) ?? DEFAULT_STREAM_DELAY_MS;
  }

  private reloadStreamDelaySamples() {
    this.streamDelaySamples = this.store.recentCorrectAnswerElapsedMs(this.id);
    this.recomputeNextQuestionDelay();
  }

  private rememberClosedQuestionDelaySample(questionInstanceId: string) {
    const sample = this.store.correctAnswerElapsedMsForQuestion(questionInstanceId);
    if (sample !== null) this.streamDelaySamples = [sample, ...this.streamDelaySamples].slice(0, 5);
    this.recomputeNextQuestionDelay();
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
    const engine: EngineState = { ...stored, autoStartWhenAudienceFull: stored.autoStartWhenAudienceFull ?? false, connectionOk: false };
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
    if (this.adapter.onCommentBatch)
      this.unsubs.push(this.adapter.onCommentBatch((comments) => this.safe(() => this.ingestBatch(comments))));
    else this.unsubs.push(this.adapter.onComment((c) => this.safe(() => this.ingest(c))));
    this.unsubs.push(this.adapter.onStatus((s) => this.safe(() => this.onConnectionStatus(s))));
    this.beat();
    this.arm();
    if (this.config.mcVoiceEnabled) {
      this.preGenerateGenericVoice();
    }
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
    this.audience.load(r.roundId, this.scheduler.now());
    this.rankRound(r.roundId);
    // Cơ sở dữ liệu chỉ giữ tên đã che khi tên bị gắn cờ. Khi phục hồi, tuyệt đối
    // không suy đoán lại tên gốc từ bất kỳ snapshot nào.
    this.refreshNameFilter(false);
    this.participants = this.store.participantCount(r.roundId);
    this.top1 = top1Streaks(this.store.leaderboardHistory(r.roundId));
    this.rebuildThrone(r.roundId);
    const qid = currentQuestionInstanceId(this.engine);
    if (qid) {
      this.countsQid = qid;
      this.counts = this.store.optionCounts(qid);
    }
  }

  private loadRound(roundId: string) {
    if (this.snapshotsRoundId === roundId) return;
    const questions = this.store.roundQuestions(roundId);
    this.questionRows = new Map(questions.map((question) => [question.id, question]));
    this.snapshots = new Map(questions.map((question) => [question.id, question.snapshot]));
    this.snapshotsRoundId = roundId;
  }

  private questionFor(roundId: string, questionInstanceId: string) {
    this.loadRound(roundId);
    return this.questionRows.get(questionInstanceId);
  }

  private questionsFor(roundId: string) {
    this.loadRound(roundId);
    return [...this.questionRows.values()];
  }

  private updateCachedQuestion(questionInstanceId: string, patch: Partial<RoundQuestionRow>) {
    const question = this.questionRows.get(questionInstanceId);
    if (question) this.questionRows.set(questionInstanceId, { ...question, ...patch });
  }

  dispose() {
    this.disposed = true;
    this.cancelPendingRoundStart();
    for (const h of [
      this.timerHandle,
      this.heartbeatHandle,
      this.countsHandle,
      this.spamCleanupHandle,
      this.spamSnapshotHandle,
      ...this.voiceHandles,
    ])
      if (h !== null) this.scheduler.clearTimeout(h);
    this.timerHandle = this.heartbeatHandle = this.countsHandle = this.spamCleanupHandle = this.spamSnapshotHandle = null;
    this.voiceHandles.clear();
    for (const item of this.mcChatQueue) {
      for (const handle of [item.generationTimeout, item.startTimeout, item.finishTimeout])
        if (handle !== null) this.scheduler.clearTimeout(handle);
    }
    if (this.mcChatPumpHandle !== null) this.scheduler.clearTimeout(this.mcChatPumpHandle);
    this.mcChatPumpHandle = null;
    this.cancelCountdownSchedule();
    this.simulator?.stop();
    this.simulator = null;
    this.finishSimulatorEventLoopDelay();
    for (const u of this.unsubs.splice(0)) u();
    void this.adapter.disconnect().catch(() => {});
  }

  /** Tầng app báo số client overlay WS + ACK hiển thị mới nhất. */
  setOverlayInfo(info: AdminSnapshot['overlay']) {
    this.overlayInfo = { ...info };
  }

  liveHealth(): LiveSourceHealth {
    return this.liveHealthSnapshot(this.scheduler.now());
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
          this.throne = { unlocked: false, holder: null, correctElapsedMs: new Map() };
          this.throneStreaks.clear();
          this.audience.startRound(e.roundId, now);
          this.telemetryRoundId = e.roundId;
          this.roundStartedAtMs = now;
          this.health.reconnectsThisRound = 0;
          this.health.downtimeMsThisRound = 0;
          this.health.rejectedThisRound = Object.fromEntries(REJECT_REASONS.map((reason) => [reason, 0])) as Record<RejectReason, number>;
          break;
        case 'QUESTION_OPENED':
          {
            const streamDelayMs = this.nextQuestionStreamDelayMs();
            this.store.markQuestion(e.questionInstanceId, 'OPEN', now, false, streamDelayMs);
            this.updateCachedQuestion(e.questionInstanceId, {
              status: 'OPEN', openedAtMs: now, closedAtMs: null, streamDelayMs,
            });
          }
          this.countsQid = e.questionInstanceId;
          this.counts = ZERO_COUNTS();
          break;
        case 'QUESTION_CLOSED':
          this.store.markQuestion(e.questionInstanceId, 'CLOSED', now);
          this.updateCachedQuestion(e.questionInstanceId, { status: 'CLOSED', closedAtMs: now });
          this.counts = this.store.optionCounts(e.questionInstanceId);
          integrity = this.scoreRound(now, 'AFTER_QUESTION', e.questionInstanceId) ?? integrity;
          this.rememberClosedQuestionDelaySample(e.questionInstanceId);
          break;
        case 'QUESTION_VOIDED':
          this.store.markQuestion(e.questionInstanceId, 'VOIDED', now, e.afterReveal);
          this.updateCachedQuestion(e.questionInstanceId, {
            status: 'VOIDED', voidedAfterReveal: e.afterReveal,
          });
          this.fastestCorrectByQuestion.delete(e.questionInstanceId);
          this.reloadStreamDelaySamples();
          if (e.afterReveal) {
            this.store.insertVoidReversals(this.engine.round!.roundId, e.questionInstanceId, now);
            integrity = this.scoreRound(now, 'AFTER_VOID', e.questionInstanceId) ?? integrity;
          } else if (this.engine.round) this.rebuildThrone(this.engine.round.roundId);
          break;
        case 'ROUND_ABORTED':
          this.store.setRoundStatus(e.roundId, 'ABORTED', now);
          this.finalizeRoundTelemetry(now, e.roundId);
          break;
        case 'LOBBY_AUTO_START_SET':
          break;
        case 'ROUND_ENDED':
          this.store.setRoundStatus(e.roundId, 'COMPLETED', now);
          this.finalizeRoundTelemetry(now, e.roundId);
          this.store.saveLeaderboardSnapshot({
            roundId: e.roundId,
            questionInstanceId: null,
            kind: 'FINAL',
            entries: topN(this.ranked, 10),
            participantCount: this.participants,
            now,
          });
          this.persistRoundAchievements(e.roundId, now);
          break;
        case 'SESSION_STOPPED':
          this.store.closeSession(this.id, now);
          break;
        case 'STATE_CHANGED': {
          if (e.to === 'REVEAL' && this.engine.round) {
            const scores = new Map(this.ranked.map((entry) => [entry.playerId, entry.score]));
            this.audienceChanged = this.audience.reorderByRank(scores) || this.audienceChanged;
          }
          if (e.to === 'LOBBY') {
            this.audience.openLobby();
            this.lobbyOpenedAtMs = now;
            this.lobbyCountdownEndsAtMs = null;
            this.lobbyNextReminderAtMs = now + LOBBY_REMINDER_INTERVAL_MS;
            this.lobbyReminderIndex = 0;
            this.lobbyClaimedKeys.clear();
            this.welcomeCueRequested = false;
            this.audienceChanged = true;
          }
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
    const questions = this.scoringQuestions(r);
    const scoringOptions = { mode: this.config.scoringMode ?? 'CLASSIC', speedBonusMax: this.config.speedBonusMax ?? 0 } as const;
    let ledger: LedgerEntry[];
    let totals: Iterable<PlayerTotals>;
    let scoringQuestion: (typeof questions)[number] | null = null;
    let scoringRows: QuestionScoringRow[] = [];
    let expectedTotals: Map<string, PlayerTotals> | null = null;
    if (kind === 'AFTER_VOID') {
      const full = computeRoundScores(questions, this.store.answersForRound(r.roundId), scoringOptions);
      ledger = full.ledger;
      totals = full.totals.values();
      expectedTotals = full.totals;
    }
    else {
      scoringQuestion = questions.find((entry) => entry.questionInstanceId === qid) ?? null;
      if (!scoringQuestion) throw new Error(`Thiếu câu hỏi ${qid} khi chấm điểm.`);
      // Đáp án sai/bỏ lỡ chỉ cần reset chuỗi; chỉ đọc dữ liệu người trả lời đúng câu này.
      // Điểm của nhóm không trả lời không đổi, còn xếp hạng vẫn dựng trên toàn bộ standings bên dưới.
      scoringRows = this.store.scoringRowsForQuestion(r.roundId, qid, scoringQuestion.correctOptionId);
      const delta = computeQuestionScoreDeltaFromCorrectRows(
        scoringQuestion,
        scoringRows,
        scoringOptions,
      );
      ledger = delta.ledger;
      totals = delta.totals;
    }
    const insertedLedger = this.store.insertLedger(r.roundId, ledger, now);
    let integrity: string | null = null;
    if (kind === 'AFTER_VOID') {
      this.store.saveRoundPlayers(r.roundId, totals, now);
      integrity = this.compareLedger(r.roundId, expectedTotals!);
    } else if (insertedLedger !== ledger.length) {
      // Khởi động lại/ghi dở có thể để lại một phần sổ cái; dựng lại toàn vòng để
      // không cộng lặp điểm khi sửa các dòng round_players.
      const full = computeRoundScores(questions, this.store.answersForRound(r.roundId), scoringOptions);
      this.store.saveRoundPlayers(r.roundId, full.totals.values(), now);
      integrity = this.compareLedger(r.roundId, full.totals)
        ?? `Không ghi đủ bút toán chấm điểm ở câu ${qid} (${insertedLedger}/${ledger.length}).`;
    } else {
      this.store.applyQuestionTotals(r.roundId, qid, scoringQuestion!.correctOptionId, totals);
    }
    this.rankRound(r.roundId);
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
    if (kind === 'AFTER_VOID' || insertedLedger !== ledger.length) this.rebuildThrone(r.roundId);
    else this.updateThroneAfterQuestion(r.roundId, scoringQuestion!, scoringRows);
    this.persistQuestionRanking(r.roundId, qid, now);
    this.persistFinalizedStageRankings(r.roundId, qid, now, kind);
    return integrity;
  }

  /** Câu hỏi của vòng cho bộ chấm điểm: kèm thời điểm mở + độ dài cửa sổ (thưởng tốc độ). */
  private scoringQuestions(r: NonNullable<EngineState['round']>) {
    this.loadRound(r.roundId);
    const persisted = this.questionRows;
    const fallbackWindowMs = Math.max(0, Math.round(this.config.timings.answerMs / this.engine.speedMultiplier));
    return [...this.snapshots.values()].map((s) => {
      const question = persisted.get(s.questionInstanceId);
      const openedAtMs = question?.openedAtMs ?? null;
      const windowMs = openedAtMs !== null && question?.closedAtMs !== null && question?.closedAtMs !== undefined
        ? Math.max(0, question.closedAtMs - openedAtMs)
        : fallbackWindowMs;
      return {
        questionInstanceId: s.questionInstanceId,
        index: s.index,
        correctOptionId: s.correctOptionId,
        closed: r.closed.includes(s.questionInstanceId),
        voided: r.voided.includes(s.questionInstanceId),
        openedAtMs,
        windowMs,
        streamDelayMs: question?.streamDelayMs ?? null,
      };
    });
  }

  /** Ngai được replay từ câu đã chốt và đáp án lưu; không có cột holder riêng. */
  private rebuildThrone(roundId: string) {
    const round = this.engine.round;
    if (!round || round.roundId !== roundId) {
      this.throne = { unlocked: false, holder: null, correctElapsedMs: new Map() };
      this.throneStreaks.clear();
      return;
    }
    const joinRows = this.store.roundPlayerJoinOrder(roundId);
    const order = [...new Set([
      ...this.audience.registrationOrder(),
      ...joinRows.map((player) => player.playerId),
    ])];
    const orderIndex = new Map(order.map((playerId, index) => [playerId, index]));
    const names = this.store.displayNames(joinRows.map((player) => player.playerId));
    const players = joinRows.map((player) => ({
      playerId: player.playerId,
      displayName: names.get(player.playerId) ?? 'Người chơi',
      joinOrder: orderIndex.get(player.playerId) ?? Number.MAX_SAFE_INTEGER,
    }));
    const scoringQuestions = this.scoringQuestions(round).map((question) => ({
      ...question,
      questionInstanceId: question.questionInstanceId,
    }));
    const answers = this.store.answersForRound(roundId).map((answer) => ({
      questionInstanceId: answer.questionInstanceId,
      playerId: answer.playerId,
      option: answer.option,
      receivedAtMs: answer.receivedAtMs,
    }));
    this.throne = replayThrone(scoringQuestions, answers, players, {
      mode: this.config.scoringMode ?? 'CLASSIC',
      speedBonusMax: this.config.speedBonusMax ?? 0,
    });
  }

  /** Cập nhật holder theo câu vừa chốt; chỉ replay toàn vòng khi recovery/VOID. */
  private updateThroneAfterQuestion(roundId: string, question: ThroneQuestion, correctRows: QuestionScoringRow[]) {
    const correctElapsedMs = this.throne.correctElapsedMs;
    for (const answer of correctRows) {
      if (answer.receivedAtMs === undefined) continue;
      const rawElapsed = question.openedAtMs == null ? 0 : Math.max(0, answer.receivedAtMs - question.openedAtMs);
      const elapsed = question.streamDelayMs == null ? rawElapsed : effectiveElapsedMs(rawElapsed, question.streamDelayMs);
      correctElapsedMs.set(answer.playerId, (correctElapsedMs.get(answer.playerId) ?? 0) + elapsed);
    }

    if (question.index + 1 < 5) {
      this.throne = { unlocked: false, holder: null, correctElapsedMs };
      return;
    }

    const leaders = this.ranked.filter((entry) => entry.rank === 1);
    let fallbackJoinOrder: Map<string, number> | null = null;
    const joinOrderIndex = (playerId: string) => {
      const index = this.audience.joinOrderIndex(playerId);
      if (index !== Number.MAX_SAFE_INTEGER) return index;
      if (!fallbackJoinOrder) {
        const audienceCount = this.audience.registrationOrder().length;
        fallbackJoinOrder = new Map(this.store.roundPlayerJoinOrder(roundId)
          .map((player, joinedIndex) => [player.playerId, audienceCount + joinedIndex]));
      }
      return fallbackJoinOrder.get(playerId) ?? Number.MAX_SAFE_INTEGER;
    };
    const candidates = leaders.map((entry): ThroneCandidate => ({
      playerId: entry.playerId,
      score: entry.score,
      correctCount: entry.correctCount,
      streak: this.throneStreaks.get(entry.playerId) ?? 0,
      correctElapsedMs: correctElapsedMs.get(entry.playerId) ?? 0,
      joinOrder: joinOrderIndex(entry.playerId),
    }));
    this.throne = {
      unlocked: true,
      holder: chooseThroneHolder(candidates, this.throne.holder?.playerId ?? null),
      correctElapsedMs,
    };
  }

  private publicThrone(now: number): ThroneView {
    if (!this.throne.unlocked) return { state: 'LOCKED', unlockAfterQuestion: 5 };
    const holder = this.throne.holder;
    if (!holder) return { state: 'EMPTY', unlockAfterQuestion: 5 };
    const standing = this.ranked.find((entry) => entry.playerId === holder.playerId);
    const characterId = this.audience.characterOf(holder.playerId, now);
    if (!characterId) throw new Error(`Throne holder ${holder.playerId} has no character assignment.`);
    return {
      state: 'HELD',
      unlockAfterQuestion: 5,
      holder: {
        playerId: this.publicPlayerIdFor(holder.playerId),
        safeDisplayName: this.safeDisplayNameFor(holder.playerId, standing?.displayName ?? 'Người chơi', now),
        characterId,
        score: holder.score,
        streak: holder.streak,
      },
    };
  }

  /** Put the throne holder first within a tied rank-one group without changing shared ranks. */
  private rankedForPublic(): LeaderboardEntry[] {
    const ranked = [...this.ranked];
    const holderId = this.throne.holder?.playerId;
    if (!holderId) return ranked;
    const leaderGroup = ranked.filter((entry) => entry.rank === 1);
    const holderIndex = leaderGroup.findIndex((entry) => entry.playerId === holderId);
    if (holderIndex <= 0) return ranked;
    const holder = leaderGroup.splice(holderIndex, 1)[0]!;
    return [holder, ...leaderGroup, ...ranked.filter((entry) => entry.rank !== 1)];
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

  private rankRound(roundId: string) {
    const standings = this.store.rankedStandings(roundId);
    this.throneStreaks = new Map(standings.map((entry) => [entry.playerId, entry.streak]));
    // SQLite's BINARY and JS's string comparison have identical order for ASCII
    // provider IDs; retain the previous comparator for any unusual Unicode ID.
    for (let i = 1; i < standings.length; i += 1) {
      const previous = standings[i - 1]!;
      const current = standings[i]!;
      if (
        previous.score < current.score ||
        (previous.score === current.score && previous.correctCount < current.correctCount) ||
        (previous.score === current.score && previous.correctCount === current.correctCount && previous.playerId > current.playerId)
      ) {
        this.ranked = rankPlayers(standings);
        return;
      }
    }
    this.ranked = rankSortedPlayers(standings);
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
      if ((e.type === 'STATE_CHANGED' && e.from === 'ACCEPTING' && e.to !== 'ACCEPTING') ||
        e.type === 'QUESTION_CLOSED' || e.type === 'QUESTION_VOIDED' || e.type === 'SESSION_STOPPED')
        this.cancelCountdownSchedule();
      if (e.type === 'STATE_CHANGED' && e.from === 'PAUSED' && e.to === 'ACCEPTING') {
        this.cancelCountdownSchedule();
      }
      if (e.type === 'STATE_CHANGED' && e.to === 'ACCEPTING') {
        const questionId = currentQuestionInstanceId(this.engine);
        if (questionId) {
          this.scheduleQuestionCountdown(questionId);
          const questionIndex = this.engine.round?.questionIndex ?? -1;
          if ([1, 4, 7].includes(questionIndex))
            void this.trackSystemVoice(() => this.speakSpamReminder(questionId, questionIndex + 1));
        }
      }
      if (e.type === 'ROUND_STARTED' && this.engine.round)
        this.preGenerateRoundVoice(this.engine.round.roundId, [...this.snapshots.values()]);
      else if (e.type === 'QUESTION_CLOSED') {
        void this.trackSystemVoice(() => this.speakGeneric({ type: 'TIMEOUT' }, 'Hết giờ!'));
        void this.trackSystemVoice(() => this.speakAnswerReveal(e.questionInstanceId));
      }
      else if (e.type === 'VICTORY_STARTED')
        void this.trackSystemVoice(() => this.speakGeneric({ type: 'VICTORY_GENERIC', roundId: e.roundId }, 'Xin chúc mừng những người chiến thắng! Cảm ơn mọi người đã tham gia.'));
      else if (e.type === 'STATE_CHANGED' && e.to === 'READING')
        void this.trackSystemVoice(() => this.beginQuestionReading());
      else if (e.type === 'STATE_CHANGED' && e.to === 'LOBBY') {
        void this.trackSystemVoice(() => this.announceWelcome());
        this.preselectLobbyRoundVoice();
      } else if (e.type === 'STATE_CHANGED' && e.from === 'LOBBY' && e.to !== 'LOBBY') {
        this.cancelLobbyCountdown();
        this.lobbyOpenedAtMs = null;
        this.lobbyNextReminderAtMs = null;
        this.lobbyClaimedKeys.clear();
      } else if (e.type === 'ROUND_STARTED') {
        this.cancelLobbyCountdown();
        this.lobbyOpenedAtMs = null;
        this.lobbyNextReminderAtMs = null;
        this.lobbyClaimedKeys.clear();
      } else if (e.type === 'LOBBY_AUTO_START_SET') {
        if (!e.enabled) this.cancelLobbyCountdown();
      }
      else if (e.type === 'STATE_CHANGED' && e.to === 'LEADERBOARD' && this.engine.round) {
        const round = this.engine.round;
        const isLastQuestion = round.questionIndex >= round.questionInstanceIds.length - 1;
        if (isLastQuestion) {
          void this.trackSystemVoice(() => this.speakGeneric(
            { type: 'ROUND_COMPLETE_GENERIC', roundId: round.roundId, scriptId: 'round-complete-v1' },
            'Đã xong tất cả các câu hỏi! Cùng xem ai là nhà vô địch nhé!',
          ));
        } else {
          void this.trackSystemVoice(() => this.speakGeneric(
            { type: 'LEADERBOARD_GENERIC', roundId: round.roundId },
            'Bảng xếp hạng đã cập nhật. Cùng cố gắng ở câu tiếp theo nhé!',
          ));
        }
      }
      if (e.type === 'QUESTION_OPENED') {
        const snap = this.snapshots.get(e.questionInstanceId);
        if (snap && this.simulator) {
          const answerDurationMs = Math.max(0, Math.round(this.engine.timings.answerMs / this.engine.speedMultiplier));
          const readingDurationMs = this.engine.state === 'READING' ? this.engine.timer?.durationMs ?? 0 : 0;
          this.simulator.onQuestionOpened({
            questionInstanceId: e.questionInstanceId,
            correctOptionId: snap.correctOptionId,
            windowMs: readingDurationMs + answerDurationMs,
          });
        }
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
    this.pumpMcChatQueue();
  }

  private trackSystemVoice<T>(work: () => Promise<T>): Promise<T | null> {
    this.systemVoicePending += 1;
    try {
      // Kick off synchronously: beginQuestionReading sets the fallback timer before its first await.
      return work().catch(() => null).finally(() => {
        this.systemVoicePending = Math.max(0, this.systemVoicePending - 1);
        this.pumpMcChatQueue();
      });
    } catch {
      this.systemVoicePending = Math.max(0, this.systemVoicePending - 1);
      this.pumpMcChatQueue();
      return Promise.resolve(null);
    }
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
      this.safe(() => {
        const qid = this.engine.state === 'READING' ? currentQuestionInstanceId(this.engine) : null;
        this.apply(qid
          ? { kind: 'MC_READING_FINISHED', expectedStateVersion: version, questionInstanceId: qid }
          : { kind: 'TIMER_ELAPSED', expectedStateVersion: version });
      });
    };
    // Kết thúc READING sớm 1 ms bằng ACK nội bộ để không ghi nhầm TIMEOUT khi audio phát đủ.
    this.timerHandle = this.scheduler.setTimeout(fire, Math.max(0, deadline - this.scheduler.now() - Number(this.engine.state === 'READING')));
  }

  private voiceEnabled() {
    return this.config.mcVoiceEnabled === true && !!this.deps.mcVoice;
  }

  private telemetry(reason: string, eventType: McVoiceEvent['type'], detail?: { timerLatenessMs?: number }) {
    // Chỉ ghi loại sự kiện và mã lý do; tuyệt đối không ghi text, tên, token hay chi tiết provider.
    const safeReason = MC_VOICE_TELEMETRY_REASONS.has(reason) ? reason : 'FAILED';
    const timerLateness = detail?.timerLatenessMs;
    const lateness = Number.isFinite(timerLateness)
      ? ` timer_lateness_ms=${Math.max(0, Math.round(timerLateness!))}`
      : '';
    this.deps.warn?.(`[mc-voice] cue skipped event=${eventType} reason=${safeReason}${lateness}`);
    if (eventType === 'QUESTION' && ['AUTH', 'NO_CREDIT', 'NOT_CONFIGURED', 'RATE_LIMITED', 'FAILED', 'TIMEOUT', 'DOWNLOAD_FAILED', 'INVALID_RESPONSE', 'LATE_AUDIO'].includes(safeReason)) {
      this.notice = {
        code: 'MC_VOICE_QUESTION_SKIPPED',
        message: 'Không phát được audio cho câu hỏi đã duyệt sau khi thử lại/chờ tối đa 10 giây. Câu hỏi vẫn được mở bằng nội dung hiển thị.',
      };
      this.emitAdmin();
    }
  }

  voiceIdentityValues() {
    const sessionPlayerIds = new Set(this.store.listPlayerIdsInSession(this.id));
    const identities = new Set<string>();
    for (const player of this.store.listPlayers()) {
      if (!sessionPlayerIds.has(player.id)) continue;
      identities.add(player.id);
      identities.add(this.publicPlayerIdFor(player.id));
      identities.add(player.displayName);
      const held = this.playerNames.get(player.id);
      if (held) {
        identities.add(held.originalName);
        identities.add(held.result.safeDisplayName);
      }
    }
    return [...identities];
  }

  private speechContainsPlayerIdentity(text: string) {
    return containsPlayerIdentity(text, this.voiceIdentityValues());
  }

  private mcChatSafetyFailure(text: string): { code: string; message: string } | null {
    const spoken = this.deps.mcVoice?.service.prepareSynthesisText(text) ?? text;
    if (this.speechContainsPlayerIdentity(text) || this.speechContainsPlayerIdentity(spoken)) {
      this.telemetry('UNSAFE_PLAYER_IDENTITY', 'OPERATOR_CHAT');
      return { code: 'MC_CHAT_UNSAFE_PLAYER_IDENTITY', message: 'Câu MC chứa tên hoặc ID người chơi nên đã bị từ chối.' };
    }
    const filter = this.deps.nameFilter;
    if (filter) {
      const matches = [text, spoken].flatMap((value) => filter.findTextMatches(value));
      const blockedTerms = [...new Set(matches.map((match) => match.matchedText))];
      if (blockedTerms.length) {
        return {
          code: 'MC_CHAT_UNSAFE_CONTENT',
          message: `Câu MC có từ bị chặn: ${blockedTerms.map((term) => `“${term}”`).join(', ')}. Hãy sửa câu rồi gửi lại.`,
        };
      }
    }
    return null;
  }

  private publicMcChatItem(item: McChatEntry): McChatQueueItem {
    const { id, text, speak, status, createdAtMs, updatedAtMs, errorMessage } = item;
    return { id, text, speak, status, createdAtMs, updatedAtMs, ...(errorMessage ? { errorMessage } : {}) };
  }

  private recordMcChatAction(operatorId: string, commandType: string, accepted: boolean, result: Record<string, unknown>, now: number) {
    this.store.transaction(() => this.store.recordAction({
      commandId: randomUUID(), sessionId: this.id, operatorId, commandType, reason: null,
      expectedStateVersion: this.engine.stateVersion, resultStateVersion: this.engine.stateVersion,
      accepted, resultJson: JSON.stringify(result), requestedAtMs: now, now,
    }));
  }

  recordMcChatPresetAction(commandType: 'MC_CHAT_PRESET_ADD' | 'MC_CHAT_PRESET_REMOVE', result: Record<string, unknown>) {
    this.recordMcChatAction('operator', commandType, true, result, this.scheduler.now());
  }

  private updateMcChat(item: McChatEntry, status: McChatQueueItem['status'], errorMessage?: string) {
    if (['DONE', 'CANCELLED'].includes(item.status)) return;
    item.status = status;
    item.updatedAtMs = this.scheduler.now();
    if (errorMessage) item.errorMessage = errorMessage;
    else delete item.errorMessage;
  }

  sendMcChat(input: unknown, operatorId = 'operator') {
    const parsed = McChatRequestSchema.safeParse(input);
    if (!parsed.success) return { status: 400, result: { ok: false, code: 'MC_CHAT_INVALID', message: 'Câu MC phải có từ 1 đến 120 ký tự.' } };
    if (this.engine.sessionStatus !== 'OPEN')
      return { status: 409, result: { ok: false, code: 'SESSION_CLOSED', message: 'Phiên đã đóng, không thể gửi câu MC.' } };
    const { text } = parsed.data;
    const now = this.scheduler.now();
    const safetyFailure = this.mcChatSafetyFailure(text);
    if (safetyFailure) {
      this.recordMcChatAction(operatorId, 'MC_CHAT_SEND', false, { ok: false, code: safetyFailure.code }, now);
      return { status: 422, result: { ok: false, ...safetyFailure } };
    }
    const active = this.mcChatQueue.filter((item) => !['DONE', 'CANCELLED'].includes(item.status));
    if (active.length >= MC_CHAT_QUEUE_LIMIT) {
      this.recordMcChatAction(operatorId, 'MC_CHAT_SEND', false, { ok: false, code: 'MC_CHAT_QUEUE_FULL' }, now);
      return { status: 429, result: { ok: false, code: 'MC_CHAT_QUEUE_FULL', message: 'Hàng chờ MC đã đủ 5 câu. Hãy chờ hoặc huỷ một câu chưa phát.' } };
    }
    const speak = parsed.data.speak && this.config.mcVoiceEnabled === true;
    const item: McChatEntry = {
      id: randomUUID(), text, speak, status: speak ? 'GENERATING' : 'QUEUED',
      createdAtMs: now, updatedAtMs: now, asset: null, generationTimeout: null,
      startTimeout: null, finishTimeout: null, scheduled: false,
      previousVoiceTailAtMs: null, scheduledVoiceTailAtMs: null,
    };
    this.mcChatQueue.push(item);
    this.recordMcChatAction(operatorId, 'MC_CHAT_SEND', true, { ok: true, queueId: item.id, speak }, now);
    if (speak) {
      item.generationTimeout = this.scheduler.setTimeout(() => this.safe(() => {
        if (item.status !== 'GENERATING') return;
        item.generationTimeout = null;
        this.updateMcChat(item, 'ERROR', 'Tạo giọng quá 10 giây. Chọn “Chỉ hiện chữ” hoặc huỷ câu.');
        this.emitAdmin();
      }), MC_CHAT_GENERATION_TIMEOUT_MS);
      void this.voiceAsset({ type: 'OPERATOR_CHAT', chatId: item.id }, text).then((asset) => {
        if (this.disposed || item.status !== 'GENERATING') return;
        if (item.generationTimeout !== null) this.scheduler.clearTimeout(item.generationTimeout);
        item.generationTimeout = null;
        if (!asset) this.updateMcChat(item, 'ERROR', 'Không tạo được giọng. Chọn “Chỉ hiện chữ” hoặc huỷ câu.');
        else {
          item.asset = asset;
          this.updateMcChat(item, 'QUEUED');
        }
        this.emitAdmin();
        this.pumpMcChatQueue();
      });
    }
    this.emitAdmin();
    this.pumpMcChatQueue();
    return { status: 202, result: { ok: true, item: this.publicMcChatItem(item) } };
  }

  useMcChatTextFallback(id: string, operatorId = 'operator') {
    const item = this.mcChatQueue.find((candidate) => candidate.id === id);
    if (!item || item.status !== 'ERROR')
      return { status: 409, result: { ok: false, code: 'MC_CHAT_NOT_FALLBACK_READY', message: 'Câu MC không ở trạng thái lỗi giọng để chuyển sang chữ.' } };
    const now = this.scheduler.now();
    item.speak = false;
    item.asset = null;
    this.updateMcChat(item, 'QUEUED');
    this.recordMcChatAction(operatorId, 'MC_CHAT_TEXT_FALLBACK', true, { ok: true, queueId: id }, now);
    this.emitAdmin();
    this.pumpMcChatQueue();
    return { status: 202, result: { ok: true, item: this.publicMcChatItem(item) } };
  }

  cancelMcChat(id: string, operatorId = 'operator') {
    const item = this.mcChatQueue.find((candidate) => candidate.id === id);
    if (!item || !['GENERATING', 'QUEUED', 'ERROR'].includes(item.status))
      return { status: 409, result: { ok: false, code: 'MC_CHAT_ALREADY_STARTED', message: 'Chỉ huỷ được câu MC chưa phát.' } };
    const now = this.scheduler.now();
    if (item.generationTimeout !== null) this.scheduler.clearTimeout(item.generationTimeout);
    if (item.startTimeout !== null) {
      this.scheduler.clearTimeout(item.startTimeout);
      this.voiceHandles.delete(item.startTimeout);
      if (item.scheduledVoiceTailAtMs !== null && this.voiceTailAtMs === item.scheduledVoiceTailAtMs)
        this.voiceTailAtMs = item.previousVoiceTailAtMs ?? now;
    }
    if (item.finishTimeout !== null) this.scheduler.clearTimeout(item.finishTimeout);
    item.generationTimeout = item.startTimeout = item.finishTimeout = null;
    item.scheduled = false;
    this.updateMcChat(item, 'CANCELLED');
    this.recordMcChatAction(operatorId, 'MC_CHAT_CANCEL', true, { ok: true, queueId: id }, now);
    this.emitAdmin();
    this.pumpMcChatQueue();
    return { status: 200, result: { ok: true, item: this.publicMcChatItem(item) } };
  }

  private chatPlaybackAllowed() {
    return this.engine.sessionStatus === 'OPEN' && ['LOBBY', 'REVEAL', 'LEADERBOARD', 'INTERMISSION', 'ROUND_END', 'VICTORY']
      .includes(effectiveState(this.engine));
  }

  private pumpMcChatQueue() {
    if (this.disposed || this.mcChatQueue.some((item) => item.status === 'PLAYING' || item.scheduled)) return;
    if (!this.chatPlaybackAllowed() || this.systemVoicePending > 0) return;
    const item = this.mcChatQueue.find((candidate) => candidate.status === 'QUEUED');
    if (!item) return;
    const now = this.scheduler.now();
    const freeAtMs = Math.max(this.voiceTailAtMs, this.countdownVoiceTailAtMs);
    if (freeAtMs > now) {
      if (this.mcChatPumpHandle !== null) this.scheduler.clearTimeout(this.mcChatPumpHandle);
      this.mcChatPumpHandle = this.scheduler.setTimeout(() => this.safe(() => {
        this.mcChatPumpHandle = null;
        this.pumpMcChatQueue();
      }), freeAtMs - now);
      return;
    }
    item.scheduled = true;
    if (item.speak && item.asset) {
      const schedule = this.scheduleVoiceCue('OPERATOR_CHAT', item.asset.assetId, item.asset.durationMs,
        () => item.status === 'QUEUED' && this.chatPlaybackAllowed() && this.systemVoicePending === 0,
        0, item.text, Number.POSITIVE_INFINITY,
        (startsAtServerMs) => this.startMcChat(item, startsAtServerMs, item.asset!.durationMs),
        () => {
          item.scheduled = false;
          item.startTimeout = null;
          item.previousVoiceTailAtMs = item.scheduledVoiceTailAtMs = null;
          this.pumpMcChatQueue();
        });
      item.startTimeout = schedule.handle;
      item.previousVoiceTailAtMs = schedule.previousVoiceTailAtMs;
      item.scheduledVoiceTailAtMs = schedule.scheduledVoiceTailAtMs;
      return;
    }
    const startsAtServerMs = now + 80;
    item.startTimeout = this.scheduler.setTimeout(() => this.safe(() => {
      item.startTimeout = null;
      if (item.status !== 'QUEUED' || !this.chatPlaybackAllowed()) {
        item.scheduled = false;
        this.pumpMcChatQueue();
        return;
      }
      this.startMcChat(item, startsAtServerMs, MC_CHAT_TEXT_DURATION_MS);
      this.emit([{ audience: 'public', message: this.wrap('STATE_SNAPSHOT', this.publicSnapshot()) }]);
    }), startsAtServerMs - now);
  }

  private startMcChat(item: McChatEntry, startsAtServerMs: number, durationMs: number) {
    item.scheduled = false;
    item.startTimeout = null;
    item.previousVoiceTailAtMs = item.scheduledVoiceTailAtMs = null;
    this.mcChatBubble = {
      chatId: item.id, text: item.text, startsAtServerMs, endsAtServerMs: startsAtServerMs + durationMs,
    };
    this.updateMcChat(item, 'PLAYING');
    this.emitAdmin();
    item.finishTimeout = this.scheduler.setTimeout(() => this.safe(() => {
      item.finishTimeout = null;
      this.updateMcChat(item, 'DONE');
      if (this.mcChatBubble?.chatId === item.id) {
        this.mcChatBubble = null;
        this.emit([{ audience: 'public', message: this.wrap('STATE_SNAPSHOT', this.publicSnapshot()) }]);
      }
      this.emitAdmin();
      this.pumpMcChatQueue();
    }), Math.max(0, startsAtServerMs + durationMs - this.scheduler.now()));
  }

  private questionVoiceKey(snap: QuestionSnapshot) {
    return `${snap.questionInstanceId}\u0000${JSON.stringify(snap)}`;
  }

  private cancelPendingRoundStart() {
    const pending = this.pendingRoundStart;
    if (!pending) return false;
    this.scheduler.clearTimeout(pending.timeout);
    this.pendingRoundStart = null;
    return true;
  }

  private waitForRoundVoice(selection: PreparedSelection, questionCount: RoundQuestionCount, allowReuse: boolean, signature: string, now: number) {
    const pending: PendingRoundStart = {
      selection,
      questionCount,
      allowReuse,
      signature,
      deadlineMs: now + this.startRoundVoiceWaitMs(),
      timeout: null,
    };
    this.pendingRoundStart = pending;
    pending.timeout = this.scheduler.setTimeout(() => this.safe(() => this.finishPendingRoundStart(pending, 'TIMEOUT')), this.startRoundVoiceWaitMs());
    this.emit([
      { audience: 'public', message: this.wrap('STATE_SNAPSHOT', this.publicSnapshot(now)) },
      { audience: 'admin', message: this.wrap('ADMIN_SNAPSHOT', this.adminSnapshot(now)) },
    ]);
    const firstQuestion = selection.snapshots[0];
    if (firstQuestion) {
      void this.prepareQuestionVoice(firstQuestion).then((bundle) => {
        this.safe(() => this.finishPendingRoundStart(pending, bundle?.ok ? 'READY' : 'UNAVAILABLE'));
      });
    }
  }

  private startRoundVoiceWaitMs() {
    return Math.min(30_000, Math.max(0, this.config.mcVoiceStartWaitMs ?? DEFAULT_START_ROUND_VOICE_WAIT_MS));
  }

  private finishPendingRoundStart(pending: PendingRoundStart, outcome: 'READY' | 'UNAVAILABLE' | 'TIMEOUT') {
    if (this.disposed || this.pendingRoundStart !== pending) return;
    this.cancelPendingRoundStart();
    if (this.engine.state !== 'LOBBY' || this.engine.sessionStatus !== 'OPEN') {
      this.emitAdmin();
      return;
    }
    if (outcome === 'TIMEOUT') this.telemetry('TIMEOUT', 'QUESTION');
    const result = this.apply({
      kind: 'COMMAND',
      expectedStateVersion: this.engine.stateVersion,
      command: { type: 'START_ROUND', questionCount: pending.questionCount, allowReuse: pending.allowReuse },
      preparedRound: pending.selection.round,
    }, { prepared: pending.selection });
    if (!result.ok) {
      this.notice = { code: result.code, message: result.message };
      this.emitAdmin();
    }
  }

  private questionVoiceLines(snap: QuestionSnapshot): McVoiceReadingLine[] {
    const event = McVoiceEventSchema.parse({
      type: 'QUESTION', questionInstanceId: snap.questionInstanceId, approvedQuestionVersion: String(snap.questionVersion),
    });
    const values = questionVoiceScripts(snap.prompt, snap.options);
    const voiceSettings = mcVoiceSettingsForEvent(this.deps.mcVoice!.profile, 'QUESTION');
    return values.map(({ lineId, text }) => {
      return {
        gameEvent: event,
        lineId,
        descriptor: {
          text, voicePolicyVersion: MC_VOICE_POLICY_VERSION, voiceKey: this.deps.mcVoice!.profile.voiceKey, provider: 'clipai',
          model: this.deps.mcVoice!.profile.model, voiceSettings,
          rate: this.deps.mcVoice!.profile.rate, format: 'mp3',
        },
        request: { text, voiceKey: this.deps.mcVoice!.profile.voiceKey, voiceSettings, rate: this.deps.mcVoice!.profile.rate, format: 'mp3' },
      };
    });
  }

  private prepareQuestionVoice(snap: QuestionSnapshot) {
    // Một lựa chọn LOBBY có thể bị thay bằng lựa chọn mới nhưng cùng round/qid. Đưa snapshot vào
    // khóa RAM để audio cũ không bị dùng nhầm; khóa cache asset hiện có vẫn giữ nguyên.
    const key = this.questionVoiceKey(snap);
    const existing = this.questionVoiceBundles.get(key);
    if (existing) return existing;
    const lines = this.questionVoiceLines(snap);
    // Câu đã duyệt là nội dung cố định, không chèn danh tính người chơi; chỉ kiểm tra text động của MC chat.
    const service = this.deps.mcVoice!.service;
    const pending = service.prepareQuestionReading(lines).then((bundle) => {
      if (!bundle.ok) this.telemetry('TOO_LONG', 'QUESTION');
      else this.readyQuestionVoiceKeys.add(key);
      return bundle;
    }).catch((error: unknown) => {
      this.telemetry(error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : 'FAILED', 'QUESTION');
      return null;
    });
    this.questionVoiceBundles.set(key, pending);
    return pending;
  }

  private preGenerateGenericVoice() {
    if (!this.voiceEnabled()) return;
    void this.voiceAsset({ type: 'WELCOME', scriptId: 'lobby-v1' }, 'Chào mừng cả nhà đến với phiên đố vui! Hãy cùng sẵn sàng nhé.');
    for (const [index, text] of LOBBY_VOICE_LINES.entries())
      void this.voiceAsset({ type: 'WELCOME', scriptId: `lobby-reminder-v${index + 1}` }, text);
    void this.voiceAsset({ type: 'WELCOME', scriptId: 'lobby-full-countdown-v1' }, 'Đủ người rồi, vào trận sau 10 giây!');
    for (const secondsRemaining of COUNTDOWN_SECONDS)
      void this.voiceAsset({ type: 'COUNTDOWN', secondsRemaining }, COUNTDOWN_SCRIPT[secondsRemaining]!);
    void this.voiceAsset({ type: 'TIMEOUT' }, 'Hết giờ!');
    void this.voiceAsset({ type: 'SPAM_REMINDER', roundId: 'preload', questionNumber: 2 }, SPAM_REMINDER_TEXT);
  }

  private preselectLobbyRoundVoice() {
    this.preparedLobbyRound = null;
    const questionCount = this.config.questionsPerRound;
    const allowReuse = false;
    const now = this.scheduler.now();
    const result = this.prepareRound(questionCount, allowReuse, now);
    if (!result.ok) return;
    const selection = result.prepared;
    this.preparedLobbyRound = {
      selection,
      questionCount,
      allowReuse,
      signature: this.lobbyRoundSignature(questionCount, allowReuse, now),
    };
    if (this.voiceEnabled()) this.preGenerateRoundVoice(selection.round.roundId, selection.snapshots);
  }

  /** Chữ ký RAM để chỉ dùng lại lựa chọn nếu cả config, pool, câu đã dùng và count còn nguyên. */
  private lobbyRoundSignature(questionCount: number, allowReuse: boolean, now: number) {
    const config = this.config;
    const pool = this.store.listQuestions(config.packId).sort((a, b) => a.id.localeCompare(b.id));
    const allowDemo = config.mode === 'MOCK' && config.allowDemoQuestions;
    const eligibleQuestionIds = pool
      .filter((question) => isEligible(question, { allowDemo, nowMs: now }))
      .map((question) => question.id);
    const usedQuestionIds = [...this.store.usedQuestionIdsInSession(this.id)].sort();
    return JSON.stringify({
      questionCount,
      allowReuse,
      roundNumber: this.store.nextRoundNumber(this.id),
      config,
      pool,
      eligibleQuestionIds,
      usedQuestionIds,
    });
  }

  private preGenerateRoundVoice(roundId: string, selected: readonly QuestionSnapshot[]) {
    if (!this.voiceEnabled() || selected.length === 0) return;
    const signature = JSON.stringify({ roundId, selected });
    if (this.roundVoicePreparation?.signature === signature) return this.roundVoicePreparation.promise;

    const run: RoundVoicePreparation = { signature, promise: Promise.resolve() };
    this.roundVoicePreparation = run;
    run.promise = this.generateRoundVoice(run, roundId, selected).catch(() => {
      if (!this.disposed && this.roundVoicePreparation === run) this.telemetry('FAILED', 'QUESTION');
    });
    return run.promise;
  }

  private async generateRoundVoice(run: RoundVoicePreparation, roundId: string, selected: readonly QuestionSnapshot[]) {
    const first = selected[0]!;
    // Ưu tiên toàn bộ audio câu 1 (câu hỏi + đáp án) trước mọi câu hỏi/reveal khác.
    await this.prepareQuestionVoice(first);
    if (this.disposed || this.roundVoicePreparation !== run) return;

    const jobs: Array<
      | { kind: 'question' | 'reveal'; snapshot: QuestionSnapshot }
      | { kind: 'generic'; type: 'LEADERBOARD_GENERIC' | 'ROUND_COMPLETE_GENERIC' | 'VICTORY_GENERIC'; text: string }
    > = [
      ...selected.slice(1).map((snapshot) => ({ kind: 'question' as const, snapshot })),
      ...selected.map((snapshot) => ({ kind: 'reveal' as const, snapshot })),
      { kind: 'generic', type: 'LEADERBOARD_GENERIC', text: 'Bảng xếp hạng đã cập nhật. Cùng cố gắng ở câu tiếp theo nhé!' },
      { kind: 'generic', type: 'ROUND_COMPLETE_GENERIC', text: 'Đã xong tất cả các câu hỏi! Cùng xem ai là nhà vô địch nhé!' },
      { kind: 'generic', type: 'VICTORY_GENERIC', text: 'Xin chúc mừng những người chiến thắng! Cảm ơn mọi người đã tham gia.' },
    ];
    let next = 0;
    const worker = async () => {
      while (!this.disposed && this.roundVoicePreparation === run && next < jobs.length) {
        const job = jobs[next++]!;
        if (job.kind === 'generic') {
          const event: McVoiceEvent = job.type === 'ROUND_COMPLETE_GENERIC'
            ? { type: job.type, roundId, scriptId: 'round-complete-v1' } as const
            : { type: job.type, roundId } as const;
          await this.voiceAsset(event, job.text);
          continue;
        }
        if (job.kind === 'reveal') {
          await this.prepareAnswerRevealVoice(job.snapshot);
          continue;
        }
        await this.prepareQuestionVoice(job.snapshot);
        if (this.disposed || this.roundVoicePreparation !== run) return;
      }
    };
    await Promise.all([worker(), worker()]);
  }

  private voiceAsset(event: McVoiceEvent, text: string) {
    const parsed = McVoiceEventSchema.safeParse(event);
    if (!this.voiceEnabled() || !parsed.success) return Promise.resolve(null);
    const speechText = this.deps.mcVoice!.service.prepareSynthesisText(text);
    const { service, profile } = this.deps.mcVoice!;
    const voiceSettings = mcVoiceSettingsForEvent(profile, event.type);
    const key = `${event.type}\u0000${speechText.normalize('NFC').trim().replace(/\s+/gu, ' ')}\u0000${JSON.stringify(Object.fromEntries(Object.entries(voiceSettings).sort(([a], [b]) => a.localeCompare(b))))}`;
    const cached = this.voiceAssetPromises.get(key);
    if (cached) return cached;
    const descriptor = {
      text, voicePolicyVersion: MC_VOICE_POLICY_VERSION, voiceKey: profile.voiceKey, provider: 'clipai' as const,
      model: profile.model, voiceSettings, rate: profile.rate, format: 'mp3' as const,
    };
    const request = { text, voiceKey: profile.voiceKey, voiceSettings, rate: profile.rate, format: 'mp3' as const };
    const pending = service.getOrCreate(descriptor, request).then(({ asset }) => ({ assetId: asset.assetId, durationMs: asset.durationMs })).catch((error: unknown) => {
      this.telemetry(error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : 'FAILED', event.type);
      return null;
    });
    this.voiceAssetPromises.set(key, pending);
    return pending;
  }

  private emitVoiceCue(eventType: McVoiceEvent['type'], assetId: string, durationMs: number, startsAtServerMs: number, bubbleText?: string) {
    if (this.disposed) return;
    const cue = McVoiceCueSchema.parse({
      cueId: randomUUID(), eventType, assetUrl: `/api/mc-voice/assets/${assetId}`,
      durationMs, startsAtServerMs, ...(bubbleText ? { bubbleText } : {}),
    });
    // Direct one-shot snapshot: publicSnapshot() and reconnects always contain null, so a cue is never replayed.
    this.emit([{ audience: 'public', message: this.wrap('STATE_SNAPSHOT', this.publicSnapshot(this.scheduler.now(), cue)) }]);
  }

  private scheduleVoiceCue(
    eventType: McVoiceEvent['type'], assetId: string, durationMs: number,
    isCurrent: () => boolean, delayMs = 0, bubbleText?: string, mustFinishByMs = Number.POSITIVE_INFINITY,
    onStarted?: (startsAtServerMs: number) => void, onSkipped?: () => void,
  ): { handle: unknown; previousVoiceTailAtMs: number; scheduledVoiceTailAtMs: number } {
    const now = this.scheduler.now();
    const startsAtServerMs = Math.max(now + 80 + Math.max(0, delayMs), this.voiceTailAtMs);
    const previousVoiceTailAtMs = this.voiceTailAtMs;
    const scheduledTailAtMs = startsAtServerMs + durationMs;
    this.voiceTailAtMs = scheduledTailAtMs;
    const handle = this.scheduler.setTimeout(() => {
      this.voiceHandles.delete(handle);
      const actualStartAtMs = Math.max(startsAtServerMs, this.scheduler.now());
      const current = !this.disposed && isCurrent();
      if (!current || actualStartAtMs + durationMs > mustFinishByMs) {
        if (this.voiceTailAtMs === scheduledTailAtMs) this.voiceTailAtMs = previousVoiceTailAtMs;
        if (current && actualStartAtMs + durationMs > mustFinishByMs)
          this.telemetry('LATE_AUDIO', eventType);
        onSkipped?.();
        return;
      }
      if (this.voiceTailAtMs === scheduledTailAtMs) this.voiceTailAtMs = actualStartAtMs + durationMs;
      onStarted?.(actualStartAtMs);
      this.emitVoiceCue(eventType, assetId, durationMs, actualStartAtMs, bubbleText);
    }, startsAtServerMs - now);
    this.voiceHandles.add(handle);
    return { handle, previousVoiceTailAtMs, scheduledVoiceTailAtMs: scheduledTailAtMs };
  }

  private async beginQuestionReading() {
    if (this.config.mcVoiceEnabled !== true) return;
    const qid = currentQuestionInstanceId(this.engine);
    const snap = qid ? this.snapshots.get(qid) : undefined;
    if (!qid || !snap) return;
    this.cancelNonQuestionVoiceForReading();
    const startedAt = this.scheduler.now();
    this.readingStartedAtMs = startedAt;
    this.apply({ kind: 'MC_READING_DURATION_SET', expectedStateVersion: this.engine.stateVersion,
      questionInstanceId: qid,
      durationMs: DEFAULT_MC_READING_MS + (this.voiceEnabled() ? QUESTION_AUDIO_MAX_WAIT_MS : 0), elapsedMs: 0 });
    if (!this.voiceEnabled()) {
      this.telemetry('NOT_CONFIGURED', 'QUESTION');
      return;
    }
    const prepared = await this.prepareQuestionVoice(snap);
    if (!prepared?.ok) {
      this.setQuestionReadingDuration(qid, startedAt,
        Math.max(DEFAULT_MC_READING_MS, this.scheduler.now() - startedAt + 80));
      return;
    }
    if (this.disposed || this.engine.state !== 'READING' || currentQuestionInstanceId(this.engine) !== qid) {
      this.telemetry('LATE_AUDIO', 'QUESTION');
      return;
    }
    const elapsedMs = Math.max(0, Math.floor(this.scheduler.now() - startedAt));
    const durations = prepared.lines.map((line) => line.asset.durationMs);
    const audioDurationMs = durations.reduce((total, duration) => total + duration, 0);
    const availableBudgetMs = Math.max(0, MAX_MC_READING_MS - elapsedMs - 80);
    // Ưu tiên rút ngắn khoảng nghỉ để vừa 20 giây; nếu riêng audio đã dài hơn thì dùng lịch 0 gap.
    const schedule = planQuestionCueSchedule(durations, availableBudgetMs) ??
      planQuestionCueSchedule(durations, audioDurationMs);
    if (!schedule) {
      this.telemetry('FAILED', 'QUESTION');
      this.setQuestionReadingDuration(qid, startedAt,
        Math.max(DEFAULT_MC_READING_MS, this.scheduler.now() - startedAt + 80));
      return;
    }
    const durationMs = Math.min(MAX_MC_READING_MS, Math.max(DEFAULT_MC_READING_MS, elapsedMs + schedule.totalDurationMs + 80));
    if (!this.setQuestionReadingDuration(qid, startedAt, durationMs)) return;
    if (this.notice?.code === 'MC_VOICE_QUESTION_SKIPPED') {
      this.notice = null;
      this.emitAdmin();
    }
    for (const [index, line] of prepared.lines.entries()) {
      this.scheduleVoiceCue('QUESTION', line.asset.assetId, line.asset.durationMs,
        () => this.engine.state === 'READING' && currentQuestionInstanceId(this.engine) === qid, schedule.offsetsMs[index]!);
    }
  }

  private setQuestionReadingDuration(questionInstanceId: string, startedAtMs: number, durationMs: number) {
    if (this.disposed || this.engine.state !== 'READING' || currentQuestionInstanceId(this.engine) !== questionInstanceId) return false;
    const elapsedMs = Math.max(0, Math.floor(this.scheduler.now() - startedAtMs));
    if (elapsedMs >= durationMs) return false;
    return this.apply({ kind: 'MC_READING_DURATION_SET', expectedStateVersion: this.engine.stateVersion,
      questionInstanceId, durationMs, elapsedMs }).ok;
  }

  private cancelNonQuestionVoiceForReading() {
    for (const handle of this.voiceHandles) this.scheduler.clearTimeout(handle);
    this.voiceHandles.clear();
    for (const item of this.mcChatQueue) {
      if (item.startTimeout === null) continue;
      item.scheduled = false;
      item.startTimeout = null;
      item.previousVoiceTailAtMs = item.scheduledVoiceTailAtMs = null;
    }
    this.cancelCountdownSchedule();
    this.countdownVoiceTailAtMs = this.scheduler.now();
    this.voiceTailAtMs = this.scheduler.now();
  }

  private answerRevealVoice(snap: QuestionSnapshot) {
    const event = McVoiceEventSchema.parse({
      type: 'ANSWER_REVEAL', questionInstanceId: snap.questionInstanceId, approvedQuestionVersion: String(snap.questionVersion),
    });
    const option = snap.options.find((item) => item.id === snap.correctOptionId);
    return option ? { event, text: `Đáp án đúng là ${snap.correctOptionId}: ${option.text}` } : null;
  }

  private prepareAnswerRevealVoice(snap: QuestionSnapshot) {
    const line = this.answerRevealVoice(snap);
    return line ? this.voiceAsset(line.event, line.text) : Promise.resolve(null);
  }

  private async speakAnswerReveal(questionInstanceId: string) {
    const snap = this.snapshots.get(questionInstanceId);
    if (!snap || !this.engine.round) return;
    const line = this.answerRevealVoice(snap);
    if (!line) return;
    const asset = await this.voiceAsset(line.event, line.text);
    if (asset) this.scheduleVoiceCue(line.event.type, asset.assetId, asset.durationMs,
      () => ['REVEAL', 'LEADERBOARD', 'ROUND_END', 'VICTORY'].includes(effectiveState(this.engine)));
  }

  private async speakGeneric(event: McVoiceEvent, text: string) {
    const asset = await this.voiceAsset(event, text);
    if (!asset) return;
    this.scheduleVoiceCue(event.type, asset.assetId, asset.durationMs, () => {
      if (event.type === 'WELCOME') return this.engine.sessionStatus === 'OPEN' && effectiveState(this.engine) === 'LOBBY';
      if (event.type === 'TIMEOUT') return ['REVEAL', 'LEADERBOARD'].includes(effectiveState(this.engine));
      if (event.type === 'LEADERBOARD_GENERIC') return effectiveState(this.engine) === 'LEADERBOARD';
      if (event.type === 'ROUND_COMPLETE_GENERIC') {
        const round = this.engine.round;
        return effectiveState(this.engine) === 'LEADERBOARD' &&
          round !== null && round.questionIndex === round.questionInstanceIds.length - 1;
      }
      if (event.type === 'VICTORY_GENERIC') return ['VICTORY', 'ROUND_END'].includes(effectiveState(this.engine));
      return this.engine.sessionStatus === 'OPEN';
    });
  }

  private scheduleQuestionCountdown(questionInstanceId: string) {
    const timer = this.engine.timer;
    if (!this.voiceEnabled() || this.engine.state !== 'ACCEPTING' || !timer?.deadlineMs) return;
    const generation = ++this.countdownScheduleGeneration;
    const deadlineMs = timer.deadlineMs;
    const cues = COUNTDOWN_SECONDS.map((secondsRemaining) => ({
      secondsRemaining,
      startsAtServerMs: deadlineMs - secondsRemaining * 1_000,
      event: { type: 'COUNTDOWN' as const, secondsRemaining },
      text: COUNTDOWN_SCRIPT[secondsRemaining]!,
    }));
    void Promise.all(cues.map(async (cue) => ({ ...cue, asset: await this.voiceAsset(cue.event, cue.text) })))
      .then((prepared) => {
        const now = this.scheduler.now();
        const stillCurrent = !this.disposed && generation === this.countdownScheduleGeneration &&
          this.engine.state === 'ACCEPTING' && currentQuestionInstanceId(this.engine) === questionInstanceId &&
          this.engine.timer?.deadlineMs === deadlineMs;
        if (!stillCurrent) {
          for (const cue of prepared)
            this.telemetry('CANCELLED', 'COUNTDOWN', { timerLatenessMs: now - cue.startsAtServerMs });
          return;
        }
        const scheduled = prepared.flatMap((cue) => {
          if (!cue.asset) {
            this.telemetry('ASSET_UNAVAILABLE', 'COUNTDOWN', { timerLatenessMs: now - cue.startsAtServerMs });
            return [];
          }
          return [{
            cueId: randomUUID(),
            secondsRemaining: cue.secondsRemaining,
            assetId: cue.asset.assetId,
            durationMs: cue.asset.durationMs,
            startsAtServerMs: cue.startsAtServerMs,
          }];
        });
        if (scheduled.length === 0) return;
        this.countdownSchedule = { scheduleId: randomUUID(), questionInstanceId, cues: scheduled };
        this.countdownVoiceTailAtMs = Math.max(this.countdownVoiceTailAtMs, ...scheduled.map((cue) => cue.startsAtServerMs + cue.durationMs));
        // Một snapshot chứa nguyên lịch; các snapshot phục hồi sau đó giữ cùng scheduleId để overlay dedupe.
        this.emit([{ audience: 'public', message: this.wrap('STATE_SNAPSHOT', this.publicSnapshot(now)) }]);
      });
  }

  private cancelCountdownSchedule() {
    this.countdownScheduleGeneration += 1;
    this.countdownSchedule = null;
  }

  private async speakSpamReminder(questionInstanceId: string, questionNumber: number) {
    const roundId = this.engine.round?.roundId;
    if (!this.voiceEnabled() || !roundId) return;
    const key = `${roundId}:${questionNumber}`;
    if (this.reminderCues.has(key)) return;
    this.reminderCues.add(key);
    const openedAtMs = this.scheduler.now();
    const event = { type: 'SPAM_REMINDER' as const, roundId, questionNumber };
    const asset = await this.voiceAsset(event, SPAM_REMINDER_TEXT);
    if (!asset || this.engine.state !== 'ACCEPTING' || currentQuestionInstanceId(this.engine) !== questionInstanceId) return;
    const now = this.scheduler.now();
    const startsAt = Math.max(now + 80, this.voiceTailAtMs);
    if (startsAt - openedAtMs > 4_000) {
      this.telemetry('LATE_AUDIO', event.type);
      return;
    }
    const timerDeadlineMs = this.engine.timer?.deadlineMs;
    const countdownAtMs = timerDeadlineMs === undefined || timerDeadlineMs === null
      ? Number.POSITIVE_INFINITY : timerDeadlineMs - 10_000;
    // Lịch countdown đã tới overlay trước mốc phát, nên lời nhắc phải kết thúc trước mốc 10 giây.
    const reminderMustFinishByMs = countdownAtMs;
    if (startsAt + asset.durationMs > reminderMustFinishByMs) {
      this.telemetry('LATE_AUDIO', event.type);
      return;
    }
    this.scheduleVoiceCue(event.type, asset.assetId, asset.durationMs,
      () => this.engine.state === 'ACCEPTING' && currentQuestionInstanceId(this.engine) === questionInstanceId &&
        this.scheduler.now() <= openedAtMs + 4_000,
      Math.max(0, startsAt - now - 80), SPAM_REMINDER_TEXT, reminderMustFinishByMs);
  }

  /** Phát lời chào khi phiên thực sự vào sảnh; audio đã được pre-generate từ lúc tạo phiên. */
  private async announceWelcome() {
    if (this.welcomeCueRequested || this.disposed || this.engine.sessionStatus !== 'OPEN' || effectiveState(this.engine) !== 'LOBBY') return false;
    this.welcomeCueRequested = true;
    const event = { type: 'WELCOME' as const, scriptId: 'lobby-v1' };
    const text = 'Chào mừng cả nhà đến với phiên đố vui! Hãy cùng sẵn sàng nhé.';
    const asset = await this.voiceAsset(event, text);
    if (!asset || this.disposed || this.engine.sessionStatus !== 'OPEN' || effectiveState(this.engine) !== 'LOBBY') return false;
    const startsAtServerMs = this.scheduler.now() + 80;
    this.voiceTailAtMs = Math.max(this.voiceTailAtMs, startsAtServerMs + asset.durationMs);
    this.emitVoiceCue(event.type, asset.assetId, asset.durationMs, startsAtServerMs);
    return true;
  }

  private beat() {
    if (this.disposed || this.engine.sessionStatus === 'CLOSED') return;
    const now = this.scheduler.now();
    this.store.heartbeat(this.id, now);
    this.audience.flush(now);
    this.checkLobbyAutomation(now);
    this.speakLobbyReminder(now);
    // Admin-only telemetry must advance even when no comments or game commands arrive.
    this.emitAdmin();
    this.heartbeatHandle = this.scheduler.setTimeout(() => this.beat(), HEARTBEAT_MS);
  }

  private cancelLobbyCountdown() {
    this.lobbyCountdownEndsAtMs = null;
  }

  private lobbyAutoStartGatesPass(now: number) {
    if (this.engine.state !== 'LOBBY' || !this.engine.autoStartWhenAudienceFull) return false;
    if (this.audience.occupiedSeats !== 30) return false;
    if (this.lobbyOpenedAtMs === null || now - this.lobbyOpenedAtMs < LOBBY_AUTO_START_AFTER_MS) return false;
    const first = this.preparedLobbyRound?.selection.snapshots[0];
    if (!first || !this.readyQuestionVoiceKeys.has(this.questionVoiceKey(first))) return false;
    try {
      const preflight = this.deps.preflight?.(this);
      if (!preflight || preflight.checks.some((check) => check.status === 'FAIL')) return false;
    } catch {
      return false;
    }
    return true;
  }

  private checkLobbyAutomation(now: number) {
    if (!this.lobbyAutoStartGatesPass(now)) {
      if (this.lobbyCountdownEndsAtMs !== null) {
        this.cancelLobbyCountdown();
        this.emit([{ audience: 'public', message: this.wrap('STATE_SNAPSHOT', this.publicSnapshot(now)) }]);
      }
      return;
    }
    if (this.lobbyCountdownEndsAtMs === null) {
      this.lobbyCountdownEndsAtMs = now + LOBBY_AUTO_START_COUNTDOWN_MS;
      void this.trackSystemVoice(() => this.speakGeneric(
        { type: 'WELCOME', scriptId: 'lobby-full-countdown-v1' },
        'Đủ người rồi, vào trận sau 10 giây!',
      ));
      this.emit([{ audience: 'public', message: this.wrap('STATE_SNAPSHOT', this.publicSnapshot(now)) }]);
      return;
    }
    if (now < this.lobbyCountdownEndsAtMs) {
      this.emit([{ audience: 'public', message: this.wrap('STATE_SNAPSHOT', this.publicSnapshot(now)) }]);
      return;
    }
    this.cancelLobbyCountdown();
    const out = this.systemCommand({ type: 'START_ROUND' });
    if (!out.result.ok) {
      this.notice = { code: 'LOBBY_AUTO_START_FAILED', message: out.result.message };
      this.systemCommand({ type: 'SET_LOBBY_AUTO_START', enabled: false, reason: 'Tự bắt đầu sảnh chờ thất bại' });
    }
  }

  private speakLobbyReminder(now: number) {
    if (this.engine.state !== 'LOBBY' || this.lobbyNextReminderAtMs === null || now < this.lobbyNextReminderAtMs) return;
    this.lobbyNextReminderAtMs = now + LOBBY_REMINDER_INTERVAL_MS;
    const index = this.lobbyReminderIndex++ % LOBBY_VOICE_LINES.length;
    const text = LOBBY_VOICE_LINES[index]!;
    void this.trackSystemVoice(() => this.speakGeneric(
      { type: 'WELCOME', scriptId: `lobby-reminder-v${index + 1}` }, text,
    ));
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
    if (env.expectedStateVersion === this.engine.stateVersion &&
      ((cmd.type === 'SET_LOBBY_AUTO_START' && !cmd.enabled) || (cmd.type === 'START_ROUND' && this.engine.state === 'LOBBY')))
      this.cancelLobbyCountdown();

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
      if (cmd.type === 'START_ROUND') {
        const pending = this.pendingRoundStart;
        if (pending && !cmd.startImmediately) {
          const result: CommandResult = { ok: true, stateVersion: this.engine.stateVersion, state: this.engine.state, duplicate: false };
          this.store.transaction(() => this.recordAction(env, result, now));
          this.emitAdmin();
          return { status: 202, result };
        }
        if (pending && cmd.startImmediately) {
          if (pending.questionCount === count && pending.allowReuse === allowReuse &&
            pending.signature === this.lobbyRoundSignature(count, allowReuse, now)) prepared = pending.selection;
          this.cancelPendingRoundStart();
        }
        if (!prepared) {
          const candidate = this.preparedLobbyRound;
          this.preparedLobbyRound = null;
          if (candidate && candidate.questionCount === count && candidate.allowReuse === allowReuse &&
            candidate.signature === this.lobbyRoundSignature(count, allowReuse, now)) {
            prepared = candidate.selection;
          }
        }
      }
      if (!prepared) {
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
      if (cmd.type === 'START_ROUND' && !cmd.startImmediately && this.voiceEnabled() && prepared) {
        const firstQuestion = prepared.snapshots[0];
        const signature = this.lobbyRoundSignature(count, allowReuse, now);
        if (firstQuestion && !this.readyQuestionVoiceKeys.has(this.questionVoiceKey(firstQuestion))) {
          this.waitForRoundVoice(prepared, count, allowReuse, signature, now);
          const result: CommandResult = { ok: true, stateVersion: this.engine.stateVersion, state: this.engine.state, duplicate: false };
          this.store.transaction(() => this.recordAction(env, result, now));
          return { status: 202, result };
        }
      }
    }

    // PAUSE/STOP được reducer xác thực ngay bên dưới; clear trước khi snapshot được ghi để
    // overlay không giữ bubble chờ giọng trong trạng thái đã tạm dừng hoặc kết thúc.
    if (this.pendingRoundStart && env.expectedStateVersion === this.engine.stateVersion &&
      (cmd.type === 'PAUSE' || cmd.type === 'STOP')) this.cancelPendingRoundStart();

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
    const storedPrioritySettings = PriorityTopicSettingsSchema.safeParse(
      this.store.getJsonSetting(PRIORITY_TOPIC_SETTINGS_KEY),
    );
    const prioritySettings = storedPrioritySettings.success
      ? storedPrioritySettings.data
      : {
        priorityTopicNames: [...(this.config.priorityTopicNames ?? DEFAULT_PRIORITY_TOPIC_NAMES)],
        priorityShare: this.config.priorityShare ?? DEFAULT_PRIORITY_SHARE,
      };
    const subtopics = this.store.listSubtopics(this.config.packId);
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
      priorityTopicNames: prioritySettings.priorityTopicNames,
      priorityShare: prioritySettings.priorityShare,
      subtopicNamesById: Object.fromEntries(subtopics.map((subtopic) => [subtopic.id, subtopic.name])),
      onDistribution: ({ counts, targetCounts, tolerance }) => this.deps.warn?.(
        `[quiz] Phân bố độ khó: ${formatDifficultyCounts(counts)} (mục tiêu ${formatDifficultyCounts(targetCounts)} ±${tolerance}).`,
      ),
      onPriorityDistribution: ({ priority, total, share, topics }) => this.deps.warn?.(
        `[quiz] ưu tiên ${priority}/${total} (mục tiêu ${Math.round(share * 100)}%; ${topics.map(({ name, count }) => `${name}: ${count}`).join(', ')}).`,
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
    this.recordCommentRate(now);
    const parsed = CommentEventSchema.safeParse({ ...raw, receivedAtMs: now });
    if (!parsed.success || !parsed.data.userId.trim()) return this.reject('INVALID_EVENT', now);
    const ev = parsed.data;
    if (ev.sourceTimestampMs !== undefined) this.recordSourceLatency(now - ev.sourceTimestampMs);

    if (this.engine.state === 'LOBBY') {
      if (!this.lobbyKeywordMatches(ev.text)) return { accepted: false, reason: 'NOT_AN_ANSWER' };
      const claimKey = `${ev.source}\u0000${ev.userId}`;
      if (this.lobbyClaimedKeys.has(claimKey)) return { accepted: true };
      this.lobbyClaimedKeys.add(claimKey);
      const sourceName = String(ev.displayName ?? '').trim();
      const originalName = sourceName ? sanitizeDisplayName(sourceName) : '';
      const joined = this.store.transaction(() => {
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
        const playerId = existingId ?? this.store.resolvePlayer(ev.source, ev.userId, firstPass.safeDisplayName, now, ev.uniqueId);
        const filtered = this.deps.nameFilter?.evaluate(originalName, playerId) ?? firstPass;
        if (filtered.flagged && existingId && this.playerNames.get(existingId)?.originalName !== originalName)
          this.store.scrubPlayerNameHistory(playerId, [originalName], filtered.safeDisplayName);
        this.store.touchPlayer(playerId, filtered.safeDisplayName, now, ev.uniqueId);
        return { playerId, filtered };
      });
      if (joined.filtered.flagged) {
        this.playerNames.set(joined.playerId, { originalName, result: joined.filtered });
        this.deps.nameFilter?.rememberFlaggedName(joined.playerId, originalName);
      } else {
        this.playerNames.delete(joined.playerId);
        this.deps.nameFilter?.forgetFlaggedName(joined.playerId);
      }
      this.audienceChanged = this.audience.onLobbyKeyword(joined.playerId, joined.filtered.safeDisplayName, now) || this.audienceChanged;
      this.scheduleAudienceUpdate();
      return { accepted: true };
    }

    const win = acceptWindow(this.engine);
    const decision = decideComment(ev, win ? { accepting: true, ...win } : null, {
      maxSourceLagMs: this.config.maxSourceLagMs,
    });
    if (!decision.ok) {
      if (SPAM_WARNING_REASON_SET.has(decision.reason))
        return this.rejectAnswer(decision.reason as SpamWarningReason, now, ev);
      return this.reject(decision.reason, now);
    }

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
      const playerId = existingId ?? this.store.resolvePlayer(ev.source, ev.userId, firstPass.safeDisplayName, now, ev.uniqueId);
      const filtered = this.deps.nameFilter?.evaluate(originalName, playerId) ?? firstPass;
      if (filtered.flagged && existingId && this.playerNames.get(existingId)?.originalName !== originalName)
        this.store.scrubPlayerNameHistory(playerId, [originalName], filtered.safeDisplayName);
      this.store.touchPlayer(playerId, filtered.safeDisplayName, now, ev.uniqueId);
      const outcome = this.store.insertAnswerWithJoin({
        questionInstanceId: qid,
        roundId,
        playerId,
        option: decision.option,
        receivedAtMs: now,
        sourceEventId: ev.eventId ?? null,
      });
      if (outcome.inserted) this.audience.persistRoundCharacter(playerId, now);
      return { playerId, filtered, inserted: outcome.inserted, participantAdded: outcome.participantAdded };
    });
    if (accepted === 'DUP_EVENT') return this.reject('DUPLICATE_EVENT', now);
    if (!accepted) return this.rejectAnswer('DUPLICATE_ANSWER', now, ev);
    if (this.spamAttempts.size)
      this.associateSpamPlayer(ev.source, ev.userId, accepted.playerId, accepted.filtered.safeDisplayName);
    if (accepted.filtered.flagged)
      this.playerNames.set(accepted.playerId, { originalName, result: accepted.filtered });
    else this.playerNames.delete(accepted.playerId);
    if (accepted.filtered.flagged) this.deps.nameFilter?.rememberFlaggedName(accepted.playerId, originalName);
    else this.deps.nameFilter?.forgetFlaggedName(accepted.playerId);
    if (!accepted.inserted) return this.rejectAnswer('DUPLICATE_ANSWER', now, ev, accepted.playerId, accepted.filtered.safeDisplayName);
    if (accepted.participantAdded) this.participants += 1;
    if (this.audience.onAccepted(accepted.playerId, accepted.filtered.safeDisplayName, now)) this.audienceChanged = true;

    this.metrics.accepted += 1;
    if (this.countsQid === qid) this.counts[decision.option] += 1;
    this.scheduleCounts();
    return { accepted: true };
  }

  private ingestBatch(comments: RawComment[]) {
    const errors: unknown[] = [];
    this.store.transaction(() => {
      for (const comment of comments) {
        try {
          this.ingest(comment);
        } catch (error) {
          // ingest() uses a nested SQLite savepoint, so one invalid event cannot
          // roll back other valid comments in this simulator tick.
          errors.push(error);
        }
      }
    });
    for (const error of errors) this.safe(() => { throw error; });
  }

  private reject(reason: RejectReason, now: number) {
    this.metrics.rejected[reason] += 1;
    if (this.engine.round && this.engine.round.roundId === this.telemetryRoundId)
      this.health.rejectedThisRound[reason] += 1;
    this.rejections.push({ atMs: now, reason });
    if (this.rejections.length > MAX_REJECTIONS) this.rejections.shift();
    return { accepted: false as const, reason };
  }

  private recordCommentRate(now: number) {
    const second = Math.floor(now / 1_000);
    const bucket = this.commentRateBuckets[((second % COMMENT_RATE_WINDOW_SECONDS) + COMMENT_RATE_WINDOW_SECONDS) % COMMENT_RATE_WINDOW_SECONDS]!;
    if (bucket.second !== second) {
      bucket.second = second;
      bucket.total = 0;
      bucket.byQuestion.clear();
    }
    bucket.total += 1;
    const qid = this.engine.state === 'ACCEPTING' ? currentQuestionInstanceId(this.engine) : null;
    if (qid) bucket.byQuestion.set(qid, (bucket.byQuestion.get(qid) ?? 0) + 1);
  }

  private recordSourceLatency(latencyMs: number) {
    if (!Number.isFinite(latencyMs)) return;
    this.sourceLatencySamples[this.sourceLatencySampleNext] = latencyMs;
    this.sourceLatencySampleNext = (this.sourceLatencySampleNext + 1) % SOURCE_LATENCY_SAMPLE_LIMIT;
    this.sourceLatencySampleCount = Math.min(SOURCE_LATENCY_SAMPLE_LIMIT, this.sourceLatencySampleCount + 1);
  }

  private finalizeRoundTelemetry(now: number, roundId: string) {
    if (this.telemetryRoundId !== roundId) return;
    if (this.outageStartedAtMs !== null && this.roundStartedAtMs !== null)
      this.health.downtimeMsThisRound += Math.max(0, now - Math.max(this.outageStartedAtMs, this.roundStartedAtMs));
    this.roundStartedAtMs = null;
    this.telemetryRoundId = null;
  }

  private liveHealthSnapshot(now: number): LiveSourceHealth {
    const second = Math.floor(now / 1_000);
    const firstSecond = second - COMMENT_RATE_WINDOW_SECONDS + 1;
    let total = 0;
    let question = 0;
    const qid = this.engine.state === 'ACCEPTING' ? currentQuestionInstanceId(this.engine) : null;
    for (const bucket of this.commentRateBuckets) {
      if (bucket.second < firstSecond || bucket.second > second) continue;
      total += bucket.total;
      if (qid) question += bucket.byQuestion.get(qid) ?? 0;
    }
    const latencies = this.sourceLatencySamples.slice(0, this.sourceLatencySampleCount).sort((a, b) => a - b);
    const percentile = (p: number) => {
      if (!latencies.length) return null;
      const position = (latencies.length - 1) * p;
      const lower = Math.floor(position);
      const upper = Math.ceil(position);
      return Math.round(latencies[lower]! + (latencies[upper]! - latencies[lower]!) * (position - lower));
    };
    const currentOutageMs = this.outageStartedAtMs !== null && this.roundStartedAtMs !== null
      ? Math.max(0, now - Math.max(this.outageStartedAtMs, this.roundStartedAtMs))
      : 0;
    const retryAtMs = this.adapter.retryAtMs?.() ?? null;
    return {
      ...this.health,
      ...(retryAtMs !== null ? { retryAtMs } : {}),
      status: this.adapter.status(),
      transport: this.adapter.transport?.() ?? 'UNKNOWN',
      commentsPerSecondTotal: total / COMMENT_RATE_WINDOW_SECONDS,
      commentsPerSecondQuestion: question / COMMENT_RATE_WINDOW_SECONDS,
      sourceLatencyP50Ms: percentile(0.5),
      sourceLatencyP95Ms: percentile(0.95),
      downtimeMsThisRound: this.health.downtimeMsThisRound + currentOutageMs,
    };
  }

  private rejectAnswer(
    reason: SpamWarningReason,
    now: number,
    event: Pick<RawComment, 'source' | 'userId' | 'displayName'>,
    playerId?: string,
    safeDisplayName?: string,
  ) {
    const result = this.reject(reason, now);
    this.recordSpamAttempt(event, reason, now, playerId, safeDisplayName);
    return result;
  }

  private spamKey(source: string, userId: string) {
    // source has a fixed enum prefix, so the compound key stays unambiguous without JSON allocation.
    return `${source}:${userId}`;
  }

  private associateSpamPlayer(source: string, userId: string, playerId: string, safeDisplayName: string) {
    const state = this.spamAttempts.get(this.spamKey(source, userId));
    if (!state) return;
    state.playerId = playerId;
    state.safeDisplayName = safeDisplayName;
  }

  private recordSpamAttempt(
    event: Pick<RawComment, 'source' | 'userId' | 'displayName'>,
    reason: SpamWarningReason,
    now: number,
    knownPlayerId?: string,
    knownSafeDisplayName?: string,
  ) {
    if (this.disposed) return;
    const key = this.spamKey(event.source, event.userId);
    let state = this.spamAttempts.get(key);
    const newState = !state;
    if (!state) {
      state = {
        source: event.source,
        userId: event.userId,
        playerId: knownPlayerId ?? null,
        displayName: null,
        safeDisplayName: knownSafeDisplayName ?? null,
        attempts: [],
        head: 0,
        reasonCounts: { DUPLICATE_ANSWER: 0, NOT_ACCEPTING: 0, EARLY: 0, LATE: 0 },
        latestReasonSequence: {},
        lastAtMs: now,
        sequence: 0,
      };
      this.spamAttempts.set(key, state);
    }
    if (knownPlayerId) state.playerId = knownPlayerId;
    if (knownSafeDisplayName) state.safeDisplayName = knownSafeDisplayName;
    state.attempts.push({ atMs: now, reason });
    state.reasonCounts[reason] += 1;
    state.lastAtMs = now;
    state.sequence = ++this.spamSequence;
    state.latestReasonSequence[reason] = state.sequence;

    if (this.spamCount(state) >= (this.config.spamWarningThreshold ?? 5)) {
      // Match the store's stable player ID convention without a DB read/write on the comment path.
      // This value is only returned on the admin snapshot; public snapshots never contain it.
      state.playerId ??= `${state.source}:${state.userId}`;
      const displayName = sanitizeDisplayName(String(event.displayName ?? ''));
      const displayNameChanged = state.displayName !== displayName;
      state.displayName = displayName;
      if (knownSafeDisplayName) state.safeDisplayName = knownSafeDisplayName;
      else if (!state.safeDisplayName || displayNameChanged)
        state.safeDisplayName = this.deps.nameFilter?.evaluateTransient(displayName, state.playerId, now).safeDisplayName
          ?? displayName;
      this.scheduleSpamSnapshot();
    }
    if (newState) this.scheduleSpamCleanup();
  }

  private spamCount(state: SpamAttemptState) {
    return state.attempts.length - state.head;
  }

  private pruneSpamAttempts(now: number) {
    const threshold = this.config.spamWarningThreshold ?? 5;
    const cutoff = now - (this.config.spamWarningWindowMs ?? 30_000);
    let warningsChanged = false;
    for (const [key, state] of this.spamAttempts) {
      const before = this.spamCount(state);
      const wasWarning = before >= threshold;
      while (state.head < state.attempts.length && state.attempts[state.head]!.atMs <= cutoff) {
        state.reasonCounts[state.attempts[state.head]!.reason] -= 1;
        state.head += 1;
      }
      const after = this.spamCount(state);
      const isWarning = after >= threshold;
      if (wasWarning && (before !== after || !isWarning)) warningsChanged = true;
      if (after === 0) {
        this.spamAttempts.delete(key);
        continue;
      }
      // Compact only during the cleanup cadence, never in the comment hot path.
      if (state.head >= 64 && state.head * 2 >= state.attempts.length) {
        state.attempts = state.attempts.slice(state.head);
        state.head = 0;
      }
    }
    return warningsChanged;
  }

  private scheduleSpamCleanup() {
    if (this.spamCleanupHandle !== null || this.disposed) return;
    this.spamCleanupHandle = this.scheduler.setTimeout(() => {
      this.spamCleanupHandle = null;
      const changed = this.pruneSpamAttempts(this.scheduler.now());
      if (changed) this.scheduleSpamSnapshot();
      if (this.spamAttempts.size) this.scheduleSpamCleanup();
    }, SPAM_CLEANUP_MS);
  }

  private scheduleSpamSnapshot() {
    if (this.spamSnapshotHandle !== null || this.disposed) return;
    this.spamSnapshotHandle = this.scheduler.setTimeout(() => {
      this.spamSnapshotHandle = null;
      if (!this.disposed) this.emitAdmin();
    }, COUNTS_THROTTLE_MS);
  }

  private spamWarnings(): SpamWarning[] {
    const threshold = this.config.spamWarningThreshold ?? 5;
    return [...this.spamAttempts.values()]
      .filter((state) => this.spamCount(state) >= threshold && state.playerId && state.safeDisplayName)
      .map((state) => {
        let primaryReason: SpamWarningReason = SPAM_WARNING_REASONS[0]!;
        for (const reason of SPAM_WARNING_REASONS.slice(1)) {
          if (state.reasonCounts[reason] > state.reasonCounts[primaryReason] ||
            (state.reasonCounts[reason] === state.reasonCounts[primaryReason] &&
              (state.latestReasonSequence[reason] ?? -1) > (state.latestReasonSequence[primaryReason] ?? -1)))
            primaryReason = reason;
        }
        return {
          warning: {
            playerId: state.playerId!,
            safeDisplayName: state.safeDisplayName!,
            count: this.spamCount(state),
            primaryReason,
            lastAtMs: state.lastAtMs,
          },
          sequence: state.sequence,
        };
      })
      .sort((a, b) => b.warning.lastAtMs - a.warning.lastAtMs || b.sequence - a.sequence)
      .slice(0, 20)
      .map(({ warning }) => warning);
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

  private scheduleAudienceUpdate() {
    if (this.countsHandle !== null || this.disposed) return;
    this.countsHandle = this.scheduler.setTimeout(() => {
      this.countsHandle = null;
      const audience = this.publicSnapshot().audience;
      if (audience) this.emit([{ audience: 'public', message: this.wrap('AUDIENCE_UPDATED', audience) }]);
      this.emitAdmin();
      this.audienceChanged = false;
    }, COUNTS_THROTTLE_MS);
  }

  private onConnectionStatus(status: ConnectionStatus) {
    const now = this.scheduler.now();
    this.store.recordConnectionEvent(this.id, this.adapter.source, status, null, now);
    const prev = this.health.status;
    if ((status === 'RECONNECTING' || status === 'DISCONNECTED' || status === 'BLOCKED') &&
      prev === 'CONNECTED' && this.outageStartedAtMs === null) {
      this.outageStartedAtMs = now;
      if (this.roundStartedAtMs !== null) this.health.reconnectsThisRound += 1;
    }
    this.health.status = status;
    if (status === 'CONNECTED') {
      if (this.outageStartedAtMs !== null) {
        this.health.reconnects += 1;
        if (this.roundStartedAtMs !== null)
          this.health.downtimeMsThisRound += Math.max(0, now - Math.max(this.outageStartedAtMs, this.roundStartedAtMs));
        this.outageStartedAtMs = null;
      }
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
    let eventLoopDelay: EventLoopDelayStats | null = null;
    if (req.action === 'START') {
      this.finishSimulatorEventLoopDelay();
      this.simulatorEventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
      this.simulatorEventLoopDelay.enable();
    } else {
      eventLoopDelay = this.finishSimulatorEventLoopDelay();
    }
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
    return {
      ok: true,
      running: !!this.simulator,
      players: this.simulator?.opts.players.length ?? 0,
      ...(eventLoopDelay ? { eventLoopDelay } : {}),
    };
  }

  private finishSimulatorEventLoopDelay(): EventLoopDelayStats | null {
    const histogram = this.simulatorEventLoopDelay;
    if (!histogram) return null;
    histogram.disable();
    this.simulatorEventLoopDelay = null;
    const toMs = (nanoseconds: number) => Number.isFinite(nanoseconds) ? Number((nanoseconds / 1_000_000).toFixed(2)) : 0;
    const stats = {
      resolutionMs: 20,
      samples: Math.round(histogram.count),
      p50Ms: toMs(histogram.percentile(50)),
      p95Ms: toMs(histogram.percentile(95)),
      p99Ms: toMs(histogram.percentile(99)),
      maxMs: toMs(histogram.max),
      meanMs: toMs(histogram.mean),
    };
    this.deps.warn?.(`[simulator] event_loop_delay_ms resolution=${stats.resolutionMs} samples=${stats.samples} p50=${stats.p50Ms} p95=${stats.p95Ms} p99=${stats.p99Ms} max=${stats.maxMs} mean=${stats.meanMs}`);
    return stats;
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

  mockComment(c: { userId: string; displayName: string; text: string; eventId?: string; sourceTimestampMs?: number }) {
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
    const question = this.questionFor(roundId, questionInstanceId);
    let winner = this.fastestCorrectByQuestion.get(questionInstanceId);
    if (!this.fastestCorrectByQuestion.has(questionInstanceId)) {
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
      responseMs: question?.streamDelayMs == null
        ? winner.responseMs
        : effectiveElapsedMs(winner.responseMs, question.streamDelayMs),
    };
  }

  /** Chốt ranking câu khi câu đóng; void sau reveal tạo revision rỗng để không phát kết quả lỗi thời. */
  private persistQuestionRanking(roundId: string, questionInstanceId: string, now: number): RankingSnapshot | null {
    const question = this.questionFor(roundId, questionInstanceId);
    if (!question) return null;
    const previous = this.store.latestRankingSnapshot(roundId, 'QUESTION', questionInstanceId, 'FASTEST_CORRECT');
    if (question.status === 'VOIDED') {
      if (!previous) return null;
      return this.store.saveRankingSnapshot({
        roundId,
        scope: 'QUESTION',
        scopeId: questionInstanceId,
        achievementId: 'FASTEST_CORRECT',
        metricKey: 'responseMs',
        entries: [],
        totalQualified: 0,
        tiedOverflowCount: 0,
        finalizedAtMs: now,
      });
    }
    if (question.status !== 'CLOSED' || question.openedAtMs === null) return previous;
    const snapshot = this.snapshots.get(questionInstanceId) ?? question.snapshot;
    const answers = this.store.rankingAnswersForQuestion(roundId, questionInstanceId).map((answer) => ({
      answerId: answer.answerId,
      questionInstanceId: answer.questionInstanceId,
      playerId: answer.playerId,
      optionId: answer.option,
      receivedAtMs: answer.receivedAtMs,
      safeDisplayName: this.safeDisplayNameFor(answer.playerId, answer.displayName, now),
    }));
    const ranking = buildQuestionTop3({
      questionInstanceId,
      correctOptionId: snapshot.correctOptionId,
      openedAtMs: question.openedAtMs,
      answers,
    });
    if (!ranking) return previous;
    return this.store.saveRankingSnapshot({
      roundId,
      scope: 'QUESTION',
      scopeId: questionInstanceId,
      achievementId: 'FASTEST_CORRECT',
      metricKey: 'responseMs',
      ...ranking,
      finalizedAtMs: now,
    });
  }

  private persistStageRanking(roundId: string, stage: StageDefinition, now: number): RankingSnapshot {
    const questions = this.questionsFor(roundId);
    const byQuestionId = questions.map((question) => ({
      questionInstanceId: question.id,
      questionIndex: question.position + 1,
    }));
    const answers = this.store.rankingAnswersForRound(roundId).map((answer) => ({
      questionInstanceId: answer.questionInstanceId,
      playerId: answer.playerId,
      safeDisplayName: this.safeDisplayNameFor(answer.playerId, answer.displayName, now),
    }));
    const events = this.store.ledgerRows(roundId).map((event) => ({
      questionInstanceId: event.questionInstanceId,
      playerId: event.playerId,
      reason: event.reason,
      points: event.points,
    }));
    const ranking = buildStageTop3(stageScores(stage, byQuestionId, answers, events));
    return this.store.saveRankingSnapshot({
      roundId,
      scope: 'STAGE',
      scopeId: stage.stageId,
      achievementId: 'STAGE_CHAMPION',
      metricKey: 'stageScore',
      ...ranking,
      finalizedAtMs: now,
    });
  }

  private achievementEvaluationInput(roundId: string, now: number): AchievementEvaluationInput {
    return {
      roundId,
      questions: this.questionsFor(roundId).map((question) => ({
        questionInstanceId: question.id,
        questionIndex: question.position + 1,
        status: question.status,
      })),
      answers: this.store.achievementAnswersForRound(roundId).map((answer) => ({
        questionInstanceId: answer.questionInstanceId,
        playerId: answer.playerId,
        optionId: answer.optionId,
        safeDisplayName: this.safeDisplayNameFor(answer.playerId, answer.displayName, now),
      })),
      scoreEvents: this.store.ledgerRows(roundId),
      leaderboardSnapshots: this.store.leaderboardHistory(roundId).map((snapshot) => ({
        questionInstanceId: snapshot.questionInstanceId,
        entries: snapshot.entries.map((entry) => ({ playerId: entry.playerId, rank: entry.rank })),
      })),
    };
  }

  private persistAchievementResults(roundId: string, results: readonly AchievementSnapshotResult[], now: number) {
    for (const result of results) {
      this.store.saveAchievementSnapshot({
        roundId,
        scope: result.scope,
        scopeId: result.scopeId,
        achievementId: result.achievementId,
        metricKey: result.metricKey,
        entries: result.entries,
        totalQualified: result.totalQualified,
        tiedOverflowCount: result.tiedOverflowCount,
        ...(result.aggregateCount === undefined ? {} : { aggregateCount: result.aggregateCount }),
        finalizedAtMs: now,
      }, result.awardEntries);
    }
  }

  private persistRoundAchievements(roundId: string, now: number) {
    const input = this.achievementEvaluationInput(roundId, now);
    this.persistAchievementResults(roundId, evaluateRoundAchievements(input), now);
  }

  /** Chốt chặng tại checkpoint và cập nhật lại các chặng đã chốt nếu có câu bị void/regrade. */
  private persistFinalizedStageRankings(
    roundId: string,
    questionInstanceId: string,
    now: number,
    kind: 'AFTER_QUESTION' | 'AFTER_VOID',
  ) {
    const questions = this.questionsFor(roundId);
    const question = questions.find((row) => row.id === questionInstanceId);
    if (!question) return;
    const stages = stageDefinitions(questions.length, this.engine.leaderboardInterval);
    const currentQuestionIndex = question.position + 1;
    const targets = new Map<string, StageDefinition>();
    if (kind === 'AFTER_QUESTION') {
      const checkpoint = stages.find((stage) => stage.lastQuestionIndex === currentQuestionIndex);
      if (checkpoint) targets.set(checkpoint.stageId, checkpoint);
    } else {
      const finalized = this.store.rankingSnapshotsForRound(roundId, 'STAGE', 'STAGE_CHAMPION');
      for (const snapshot of finalized) {
        const stage = stages.find((candidate) => candidate.stageId === snapshot.scopeId);
        if (stage && currentQuestionIndex >= stage.firstQuestionIndex && currentQuestionIndex <= stage.lastQuestionIndex)
          targets.set(stage.stageId, stage);
      }
    }
    if (targets.size === 0) return;
    const input = this.achievementEvaluationInput(roundId, now);
    for (const stage of targets.values()) {
      this.persistStageRanking(roundId, stage, now);
      this.persistAchievementResults(roundId, evaluateStageAchievements(input, stage), now);
    }
  }

  private publicRankingEntries(snapshot: RankingSnapshot, now: number) {
    const question = snapshot.scope === 'QUESTION' && snapshot.metricKey === 'responseMs'
      ? this.questionFor(snapshot.roundId, snapshot.scopeId)
      : undefined;
    const entries = snapshot.entries.map((entry) => {
      const standings = this.ranked.find((player) => player.playerId === entry.playerId);
      return {
        ...entry,
        metricValue: question?.streamDelayMs == null
          ? entry.metricValue
          : effectiveElapsedMs(entry.metricValue, question.streamDelayMs),
        playerId: this.publicPlayerIdFor(entry.playerId),
        safeDisplayName: this.safeDisplayNameFor(
          entry.playerId,
          standings?.displayName ?? entry.safeDisplayName ?? 'Người chơi',
          now,
        ),
        characterId: this.audience.characterOf(entry.playerId, now),
      };
    });
    return this.holderFirstWithinRankOne(entries);
  }

  /** Public Top 3/achievement rows use the same rank-one tie order as the throne and leaderboard. */
  private holderFirstWithinRankOne<T extends { playerId: string; rank: number }>(entries: T[]): T[] {
    const holderId = this.throne.holder?.playerId;
    if (!holderId) return entries;
    const publicHolderId = this.publicPlayerIdFor(holderId);
    const leaders = entries.filter((entry) => entry.rank === 1);
    const holderIndex = leaders.findIndex((entry) => entry.playerId === publicHolderId);
    if (holderIndex <= 0) return entries;
    const holder = leaders.splice(holderIndex, 1)[0]!;
    return [holder, ...leaders, ...entries.filter((entry) => entry.rank !== 1)];
  }

  private questionTop3ForPublic(roundId: string, questionInstanceId: string, now: number) {
    const question = this.questionFor(roundId, questionInstanceId);
    if (!question || question.status !== 'CLOSED') return null;
    const snapshot = this.store.latestRankingSnapshot(roundId, 'QUESTION', questionInstanceId, 'FASTEST_CORRECT')
      ?? this.persistQuestionRanking(roundId, questionInstanceId, now);
    if (!snapshot) return null;
    return {
      questionInstanceId,
      entries: this.publicRankingEntries(snapshot, now),
      totalQualified: snapshot.totalQualified,
      tiedOverflowCount: snapshot.tiedOverflowCount,
      revision: snapshot.revision,
    };
  }

  private stageTop3ForPublic(roundId: string, stage: StageDefinition, now: number) {
    const questions = this.questionsFor(roundId);
    const completed = questions
      .filter((question) => question.position + 1 >= stage.firstQuestionIndex && question.position + 1 <= stage.lastQuestionIndex)
      .every((question) => question.status === 'CLOSED' || question.status === 'VOIDED');
    if (!completed) return null;
    const snapshot = this.store.latestRankingSnapshot(roundId, 'STAGE', stage.stageId, 'STAGE_CHAMPION')
      ?? this.persistStageRanking(roundId, stage, now);
    return {
      stage,
      entries: this.publicRankingEntries(snapshot, now),
      totalQualified: snapshot.totalQualified,
      tiedOverflowCount: snapshot.tiedOverflowCount,
      revision: snapshot.revision,
    };
  }

  private achievementSnapshotsForPublic(
    roundId: string,
    scope: 'STAGE' | 'ROUND',
    scopeId: string,
    achievementIds: readonly string[],
    now: number,
  ): PublicAchievementSnapshot[] {
    return achievementIds.flatMap((achievementId) => {
      const snapshot = this.store.latestRankingSnapshot(roundId, scope, scopeId, achievementId);
      if (!snapshot) return [];
      return [{
        achievementId: snapshot.achievementId as PublicAchievementSnapshot['achievementId'],
        scope: snapshot.scope as 'STAGE' | 'ROUND',
        scopeId: snapshot.scopeId,
        metricKey: snapshot.metricKey,
        entries: this.publicRankingEntries(snapshot, now),
        totalQualified: snapshot.totalQualified,
        tiedOverflowCount: snapshot.tiedOverflowCount,
        ...(snapshot.aggregateCount === undefined ? {} : { aggregateCount: snapshot.aggregateCount }),
        revision: snapshot.revision,
      }];
    });
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

  publicSnapshot(now = this.scheduler.now(), mcVoiceCue: McVoiceCue | null = null): PublicSnapshot {
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
    const publicRanked = this.rankedForPublic();
    const withChar = (list: LeaderboardEntry[]) =>
      list.map((x) => {
        const characterId = this.audience.characterOf(x.playerId, now);
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
      leaderboard = { kind: 'FULL', entries: withChar(topN(publicRanked, 10)) };
    // Top 10 gọn cạnh câu hỏi (V3 §10) — chỉ cập nhật khi chốt câu, không đổi trong lúc trả lời.
    else if (e.round && (eff === 'PREPARE' || eff === 'READING' || eff === 'ACCEPTING' || postReveal))
      leaderboard = { kind: 'COMPACT', entries: withChar(topN(publicRanked, 10)) };
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
    const questionTop3 = e.round && snap && (eff === 'REVEAL' || eff === 'LEADERBOARD')
      ? this.questionTop3ForPublic(e.round.roundId, snap.questionInstanceId, now)
      : null;
    const stage = e.round && bigBoard
      ? stageDefinitions(e.round.questionInstanceIds.length, e.leaderboardInterval)
        .find((candidate) => candidate.lastQuestionIndex === e.round!.questionIndex + 1)
      : undefined;
    const stageTop3 = e.round && stage ? this.stageTop3ForPublic(e.round.roundId, stage, now) : null;
    const achievementSnapshots = e.round && bigBoard && stage
      ? this.achievementSnapshotsForPublic(e.round.roundId, 'STAGE', stage.stageId, STAGE_ACHIEVEMENT_IDS, now)
      : e.round && (eff === 'ROUND_END' || eff === 'VICTORY')
        ? this.achievementSnapshotsForPublic(e.round.roundId, 'ROUND', e.round.roundId, ROUND_ACHIEVEMENT_IDS, now)
        : [];
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
      questionTop3,
      stageTop3,
      ...(achievementSnapshots.length ? { achievementSnapshots } : {}),
      mcVoiceCue,
      mcChatBubble: this.mcChatBubble && this.mcChatBubble.endsAtServerMs > now ? this.mcChatBubble : null,
      ...(this.pendingRoundStart && e.state === 'LOBBY' ? { lobbyMessage: 'Chuẩn bị vào trận…' } : {}),
      lobbyCountdown: this.lobbyCountdownEndsAtMs !== null && e.state === 'LOBBY'
        ? { durationMs: LOBBY_AUTO_START_COUNTDOWN_MS, remainingMs: Math.max(0, this.lobbyCountdownEndsAtMs - now) }
        : null,
      mcVoiceCountdownSchedule: e.state === 'ACCEPTING' && qid &&
        this.countdownSchedule?.questionInstanceId === qid ? this.countdownSchedule : null,
      reveal: revealView,
      leaderboard,
      podium:
        e.round && (eff === 'ROUND_END' || eff === 'VICTORY')
          ? (() => {
              const p = buildPodium(publicRanked);
              return { ...p, slots: p.slots.map((s) => ({ ...s, entries: withChar(s.entries) })) };
            })()
          : null,
      mc: mcFor(e, revealView),
      audience: this.audience.active
        ? this.audience.view(
            revealView ? { qid: revealView.questionInstanceId, correctOptionId: revealView.correctOptionId } : null,
            now,
            this.throne.holder ? [this.throne.holder.playerId] : [],
          )
        : null,
      throne: this.publicThrone(now),
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
      autoStartWhenAudienceFull: e.autoStartWhenAudienceFull,
      recoveryPending: e.suspended?.kind === 'RECOVERY',
      suspendedFrom: e.suspended?.from ?? null,
      config: this.config,
      streamDelay: this.streamDelayAdminView(),
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
      spamWarnings: this.spamWarnings(),
      roundStartWait: this.pendingRoundStart ? {
        durationMs: this.startRoundVoiceWaitMs(),
        remainingMs: Math.max(0, this.pendingRoundStart.deadlineMs - now),
      } : null,
      mcChatQueue: this.mcChatQueue.slice(-20).map((item) => this.publicMcChatItem(item)),
      pool: this.pool(now),
      simulator: this.simulator ? { running: this.simulator.running, players: this.simulator.opts.players.length } : null,
      error: e.error ?? this.notice,
      live: this.liveHealthSnapshot(now),
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
