/**
 * @quiz/contracts — nguồn sự thật duy nhất cho schema, DTO và kiểu sự kiện.
 * Mọi package khác chỉ phụ thuộc vào đây; không package nào được định nghĩa lại các kiểu này.
 */
import { z } from 'zod';

export const CONTRACT_VERSION = 1;

// ---------------------------------------------------------------------------
// Trạng thái & cảnh (scene)
// ---------------------------------------------------------------------------

export const GameStateSchema = z.enum([
  'IDLE',
  'LOBBY',
  'PREPARE',
  'READING',
  'ACCEPTING',
  'REVEAL',
  'LEADERBOARD',
  'ROUND_END',
  'VICTORY',
  'INTERMISSION',
  'PAUSED',
  'CONNECTION_INTERRUPTED',
  'ERROR',
]);
export type GameState = z.infer<typeof GameStateSchema>;

export const McReadingFallbackReasonSchema = z.enum([
  'NO_AUDIO',
  'PLAYBACK_ERROR',
  'NO_OWNER',
  'TIMEOUT',
]);
export type McReadingFallbackReason = z.infer<typeof McReadingFallbackReasonSchema>;

export const McVoiceSettingsSchema = z.object({
  provider: z.literal('CLIPAI'),
  voiceName: z.literal('Kelly'),
  /** Chỉ biểu thị có token; API không trả lại token hay dạng đã che. */
  hasToken: z.boolean(),
  ready: z.boolean(),
  primaryOverlayInstanceId: z.string().nullable(),
});
export type McVoiceSettings = z.infer<typeof McVoiceSettingsSchema>;

export const McVoiceSettingsUpdateSchema = z.object({
  token: z.string().trim().min(1).max(4_096).optional(),
  clearToken: z.boolean().optional(),
  primaryOverlayInstanceId: z.string().trim().min(1).max(128).nullable().optional(),
  confirmPrimaryOverlayChange: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.clearToken && value.token !== undefined)
    ctx.addIssue({ code: 'custom', path: ['token'], message: 'Không thể vừa đặt vừa xoá token.' });
});
export type McVoiceSettingsUpdate = z.infer<typeof McVoiceSettingsUpdateSchema>;

export const McVoiceTestRequestSchema = z.object({
  confirmed: z.literal(true),
  text: z.string().trim().min(1).max(1_000),
});
export type McVoiceTestRequest = z.infer<typeof McVoiceTestRequestSchema>;

export const McVoicePreGenerateRequestSchema = z.object({
  questionIds: z.array(z.string().trim().min(1).max(64)).min(1).max(200),
}).superRefine((value, ctx) => {
  if (new Set(value.questionIds).size !== value.questionIds.length)
    ctx.addIssue({ code: 'custom', path: ['questionIds'], message: 'Danh sách câu hỏi không được trùng.' });
});
export type McVoicePreGenerateRequest = z.infer<typeof McVoicePreGenerateRequestSchema>;

export const McVoicePreGenerateProgressSchema = z.object({
  jobId: z.string().min(1).max(100),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED']),
  total: z.number().int().min(0),
  completed: z.number().int().min(0),
  failed: z.number().int().min(0),
  tooLong: z.number().int().min(0),
  updatedAtMs: z.number().finite(),
});
export type McVoicePreGenerateProgress = z.infer<typeof McVoicePreGenerateProgressSchema>;

/** Trần đọc câu hỏi và bốn đáp án trong một lần phát MC. */
export const MAX_MC_READING_MS = 20_000;

export const SceneSchema = z.enum([
  'LOBBY',
  'QUESTION',
  'REVEAL',
  'INTERIM_TOP10',
  'ROUND_WINNER',
  'VICTORY',
  'INTERMISSION',
  'CONNECTION_LOST',
]);
export type Scene = z.infer<typeof SceneSchema>;

export const OptionIdSchema = z.enum(['A', 'B', 'C', 'D']);
export type OptionId = z.infer<typeof OptionIdSchema>;
export const OPTION_IDS: readonly OptionId[] = ['A', 'B', 'C', 'D'];

export const LiveSourceSchema = z.enum(['MOCK', 'TIKTOK']);
export type LiveSource = z.infer<typeof LiveSourceSchema>;

// ---------------------------------------------------------------------------
// Comment (mục 4 của đặc tả)
// ---------------------------------------------------------------------------

export const CommentEventSchema = z.object({
  source: LiveSourceSchema,
  eventId: z.string().min(1).max(200).optional(),
  userId: z.string().min(1).max(200),
  displayName: z.string().max(400),
  text: z.string().max(2000),
  receivedAtMs: z.number().finite(),
  sourceTimestampMs: z.number().finite().optional(),
});
export type CommentEvent = z.infer<typeof CommentEventSchema>;

/** Comment thô từ adapter — server đóng dấu receivedAtMs tại biên. */
export type RawComment = Omit<CommentEvent, 'receivedAtMs'>;

export const RejectReasonSchema = z.enum([
  'INVALID_EVENT',
  'NOT_AN_ANSWER',
  'NOT_ACCEPTING',
  'EARLY',
  'LATE',
  'DUPLICATE_EVENT',
  'DUPLICATE_ANSWER',
  'STALE_SOURCE_TIMESTAMP',
]);
export type RejectReason = z.infer<typeof RejectReasonSchema>;

export type IngestMetrics = {
  received: number;
  accepted: number;
  rejected: Record<RejectReason, number>;
};

// ---------------------------------------------------------------------------
// Câu hỏi (mục 6)
// ---------------------------------------------------------------------------

export const DifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
export type Difficulty = z.infer<typeof DifficultySchema>;
export const QUESTION_SELECTION_MODES = ['RANDOM', 'DIFFICULTY'] as const;
export const QuestionSelectionModeSchema = z.enum(QUESTION_SELECTION_MODES);
export type QuestionSelectionMode = z.infer<typeof QuestionSelectionModeSchema>;

/** Tỷ lệ mục tiêu cho vòng 15 câu; selector tự co giãn cho 10/20 câu. */
export const DEFAULT_DIFFICULTY_TARGETS = { EASY: 7, MEDIUM: 5, HARD: 3 } as const;
export const DifficultyTargetsSchema = z.object({
  EASY: z.number().int().min(0).max(20).default(DEFAULT_DIFFICULTY_TARGETS.EASY),
  MEDIUM: z.number().int().min(0).max(20).default(DEFAULT_DIFFICULTY_TARGETS.MEDIUM),
  HARD: z.number().int().min(0).max(20).default(DEFAULT_DIFFICULTY_TARGETS.HARD),
}).refine((targets) => targets.EASY + targets.MEDIUM + targets.HARD > 0, 'Ít nhất một mục tiêu độ khó phải lớn hơn 0');
export type DifficultyTargets = z.infer<typeof DifficultyTargetsSchema>;

export const VerificationStatusSchema = z.enum([
  'UNVERIFIED',
  'VERIFIED',
  'OPERATOR_VERIFIED',
  /** Câu hỏi hư cấu / demo — chỉ được dùng trong phiên MOCK và luôn gắn nhãn DEMO. */
  'DEMO',
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const ApprovalStatusSchema = z.enum([
  'DRAFT',
  'NEEDS_EVIDENCE',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const QUESTION_LIMITS = { promptMax: 220, optionMax: 90, explanationMax: 400 } as const;

export const QuestionOptionSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().trim().min(1).max(QUESTION_LIMITS.optionMax),
});

export const QuestionSchema = z
  .object({
    id: z.string().min(1).max(64),
    packId: z.string().min(1).max(64),
    subtopicId: z.string().min(1).max(64),
    prompt: z.string().trim().min(1).max(QUESTION_LIMITS.promptMax),
    options: z.array(QuestionOptionSchema).length(4),
    correctOptionId: z.string().min(1),
    explanation: z.string().max(QUESTION_LIMITS.explanationMax).default(''),
    /** Câu cũ chưa gán độ khó được xem là mức vừa. */
    difficulty: DifficultySchema.default('MEDIUM'),
    tags: z.array(z.string().max(40)).max(20).default([]),
    sourceRefs: z.array(z.string().max(200)).max(20).default([]),
    verificationStatus: VerificationStatusSchema,
    approvalStatus: ApprovalStatusSchema,
    version: z.number().int().min(1).default(1),
    media: z.object({ assetId: z.string().min(1) }).nullable().default(null),
    validFrom: z.number().nullable().default(null),
    validUntil: z.number().nullable().default(null),
    lastUsedAt: z.number().nullable().default(null),
  })
  .superRefine((q, ctx) => {
    const ids = new Set(q.options.map((o) => o.id));
    if (ids.size !== 4) ctx.addIssue({ code: 'custom', message: 'option id phải duy nhất' });
    const texts = new Set(q.options.map((o) => o.text.trim().toLocaleLowerCase('vi')));
    if (texts.size !== 4) ctx.addIssue({ code: 'custom', message: '4 đáp án phải khác nhau' });
    if (!ids.has(q.correctOptionId))
      ctx.addIssue({ code: 'custom', message: 'correctOptionId không thuộc options' });
  });
export type Question = z.infer<typeof QuestionSchema>;

/** Ngưỡng nội dung khuyến nghị cho overlay; vượt ngưỡng chỉ cảnh báo, không từ chối câu. */
export const QUESTION_WARNING_LIMITS = { promptMax: 110, optionMax: 28 } as const;

export type QuestionLengthWarning = {
  code: 'TOO_LONG';
  field: 'prompt' | 'option';
  characterCount: number;
  limit: number;
  optionId?: string;
};

function questionCharacterCount(value: string): number {
  return Array.from(value.trim()).length;
}

/** Trả về cảnh báo cho từng trường vượt ngưỡng; không biến cảnh báo thành lỗi validation. */
export function questionLengthWarnings(
  question: Pick<Question, 'prompt' | 'options'>,
): QuestionLengthWarning[] {
  const warnings: QuestionLengthWarning[] = [];
  const promptLength = questionCharacterCount(question.prompt);
  if (promptLength > QUESTION_WARNING_LIMITS.promptMax) {
    warnings.push({
      code: 'TOO_LONG',
      field: 'prompt',
      characterCount: promptLength,
      limit: QUESTION_WARNING_LIMITS.promptMax,
    });
  }
  for (const option of question.options) {
    const optionLength = questionCharacterCount(option.text);
    if (optionLength > QUESTION_WARNING_LIMITS.optionMax) {
      warnings.push({
        code: 'TOO_LONG',
        field: 'option',
        optionId: option.id,
        characterCount: optionLength,
        limit: QUESTION_WARNING_LIMITS.optionMax,
      });
    }
  }
  return warnings;
}

/** Ảnh chụp bất biến của câu hỏi tại thời điểm tạo vòng (đã xáo đáp án). */
export type QuestionSnapshot = {
  questionInstanceId: string;
  questionId: string;
  questionVersion: number;
  index: number;
  prompt: string;
  /** Theo thứ tự hiển thị A..D sau khi xáo. */
  options: { id: OptionId; text: string; originalOptionId: string }[];
  correctOptionId: OptionId;
  explanation: string;
  difficulty: Difficulty;
  subtopicId: string;
  isDemo: boolean;
};

/** Phiên bản công khai — KHÔNG BAO GIỜ chứa đáp án đúng. */
export type PublicQuestion = {
  questionInstanceId: string;
  index: number;
  prompt: string;
  /** Rỗng ở PREPARE; hiện đủ bốn đáp án từ READING nhưng không bao giờ kèm đáp án đúng. */
  options: { id: OptionId; text: string }[];
  optionsVisible: boolean;
  isDemo: boolean;
};

/** MC Kelly — MC cố định, KHÔNG phải người chơi (V3 §7). */
export const McStateSchema = z.enum(['idle', 'welcome', 'ask', 'react', 'celebrate']);
export type McState = z.infer<typeof McStateSchema>;
export type McView = { state: McState; bubble: string };

// ---------------------------------------------------------------------------
// Cấu hình
// ---------------------------------------------------------------------------

export const TimingsSchema = z.object({
  lobbyMs: z.number().int().min(0).max(600_000).default(30_000),
  prepareMs: z.number().int().min(500).max(60_000).default(3_000),
  answerMs: z.number().int().min(3_000).max(120_000).default(15_000),
  revealMs: z.number().int().min(500).max(60_000).default(4_000),
  leaderboardMs: z.number().int().min(500).max(60_000).default(4_000),
  /** BXH lớn ở mốc (mỗi leaderboardInterval câu + câu cuối) — V3: 5–8 s. Thiếu → 6 s. */
  bigLeaderboardMs: z.number().int().min(500).max(60_000).optional(),
  roundEndMs: z.number().int().min(0).max(60_000).default(2_000),
  victoryMs: z.number().int().min(1_000).max(120_000).default(18_000),
  intermissionMs: z.number().int().min(1_000).max(600_000).default(25_000),
});
export type Timings = z.infer<typeof TimingsSchema>;
export const DEFAULT_TIMINGS: Timings = TimingsSchema.parse({});

export const QuestionsPerRoundSchema = z.union([z.literal(10), z.literal(15), z.literal(20)]);

export const SessionConfigSchema = z
  .object({
    mode: LiveSourceSchema.default('MOCK'),
    packId: z.string().min(1).max(64).default('demo'),
    questionsPerRound: QuestionsPerRoundSchema.default(15),
    /** RANDOM giữ nguyên mặc định; DIFFICULTY bật phân bổ mục tiêu dễ/vừa/khó. */
    questionSelectionMode: QuestionSelectionModeSchema.default('RANDOM'),
    /** Mục tiêu gốc tương ứng 15 câu; được co giãn theo questionsPerRound. */
    difficultyTargets: DifficultyTargetsSchema.default({}),
    /** Cho phép lệch tối đa quanh mục tiêu khi cần; thiếu kho vẫn bù mức gần nhất. */
    difficultyTolerance: z.number().int().min(0).max(2).default(2),
    /** Hiện Top 10 đầy đủ sau mỗi N câu (mặc định 5) và luôn sau câu cuối. */
    leaderboardInterval: z.number().int().min(1).max(20).default(5),
    /** Thưởng tốc độ tối đa cho câu đúng (0 = tắt). Người dùng chốt 11/11: có thưởng tốc độ. */
    speedBonusMax: z.number().int().min(0).max(500).default(50),
    /** KAHOOT (mặc định, người dùng chốt 11/11): 500–1000/câu đúng theo tốc độ + chuỗi tới +500. CLASSIC: 100 + speedBonusMax + mốc 3/5/10. */
    scoringMode: z.enum(['KAHOOT', 'CLASSIC']).default('KAHOOT'),
    timings: TimingsSchema.default({}),
    /** Bật luồng MC Voice cho phiên; mặc định tắt để phiên cũ tiếp tục PREPARE → ACCEPTING. */
    mcVoiceEnabled: z.boolean().optional(),
    /** Chỉ hợp lệ trong MOCK. */
    speedMultiplier: z.number().min(1).max(200).default(1),
    /** Cho phép câu hỏi DEMO/hư cấu — chỉ hợp lệ trong MOCK. */
    allowDemoQuestions: z.boolean().default(false),
    seed: z.number().int().optional(),
    /** Bỏ comment có sourceTimestamp cũ hơn ngưỡng này so với lúc nhận (cách ly sự kiện trễ). */
    maxSourceLagMs: z.number().int().min(0).max(60_000).default(5_000),
    /** @username tài khoản TikTok đang phát LIVE — bắt buộc khi mode = TIKTOK. */
    /** Bộ mã nhân vật chibi để gán cho khán giả (Theme Pack sẽ cung cấp; mặc định chibi-01..12). */
    characterPool: z.array(z.string().min(1).max(64)).min(1).max(200).optional(),
    /** Xoay ghế mỗi N câu (0 = tắt). */
    audienceRotateEvery: z.number().int().min(0).max(20).default(2),
    /** Giữ cố định ghế của Top N (0–5). */
    audiencePinTop: z.number().int().min(0).max(5).default(3),
    tiktokUsername: z
      .string()
      .trim()
      .max(120)
      .regex(/^(https?:\/\/(www\.)?tiktok\.com\/)?@?[A-Za-z0-9._]{2,24}(\/live)?\/?$/, 'TikTok username không hợp lệ')
      .optional(),
  })
  .superRefine((c, ctx) => {
    if (c.mode !== 'MOCK' && c.speedMultiplier !== 1)
      ctx.addIssue({ code: 'custom', message: 'speedMultiplier chỉ dùng được trong MOCK' });
    if (c.mode !== 'MOCK' && c.allowDemoQuestions)
      ctx.addIssue({ code: 'custom', message: 'Câu hỏi DEMO không được vào LIVE thật' });
    if (c.mode === 'TIKTOK' && !c.tiktokUsername)
      ctx.addIssue({ code: 'custom', path: ['tiktokUsername'], message: 'Cần TikTok username của tài khoản đang LIVE' });
  });

export const QuestionReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(500).optional(),
  operatorId: z.string().trim().min(1).max(100).default('operator'),
});
export type QuestionReview = z.infer<typeof QuestionReviewSchema>;
type SessionConfigOutput = z.infer<typeof SessionConfigSchema>;
/** Các trường mới có schema default vẫn optional ở type đầu vào để giữ tương thích caller cũ. */
export type SessionConfig = Omit<SessionConfigOutput, 'questionSelectionMode' | 'difficultyTargets' | 'difficultyTolerance'> &
  Partial<Pick<SessionConfigOutput, 'questionSelectionMode' | 'difficultyTargets' | 'difficultyTolerance'>>;

/**
 * Vùng an toàn (px trên khung 1080×1920). GIÁ TRỊ MẶC ĐỊNH LÀ PRESET THỬ NGHIỆM BẢO THỦ,
 * KHÔNG PHẢI đặc tả chính thức của TikTok — phải tinh chỉnh theo thiết bị (Phase 5).
 */
export const SafeZonePresetSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().max(100),
  top: z.number().int().min(0).max(1920),
  bottom: z.number().int().min(0).max(1920),
  left: z.number().int().min(0).max(1080),
  right: z.number().int().min(0).max(1080),
  /**
   * Dải cấm bên phải chỉ áp dụng từ toạ độ y này trở xuống (thanh nút bên phải của TikTok LIVE nằm ở nửa dưới).
   * 0 = áp dụng toàn chiều cao. Là GIẢ ĐỊNH — phải đo trên điện thoại thật.
   */
  rightFromY: z.number().int().min(0).max(1920).default(0),
  commentRegion: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .nullable()
    .default(null),
  official: z.literal(false).default(false),
});
export type SafeZonePreset = z.infer<typeof SafeZonePresetSchema>;
export const INITIAL_TEST_SAFE_ZONE: SafeZonePreset = {
  id: 'initial-conservative-test',
  label: 'Preset thử nghiệm ban đầu (chưa hiệu chỉnh, không phải số chính thức của TikTok)',
  top: 230,
  bottom: 690,
  left: 0,
  right: 130,
  rightFromY: 1000,
  commentRegion: null,
  official: false,
};

// ---------------------------------------------------------------------------
// Lệnh điều hành (mục 3, 12)
// ---------------------------------------------------------------------------

const reason = z.string().trim().min(3, 'Bắt buộc nêu lý do (≥ 3 ký tự)').max(500);
const optReason = z.string().trim().max(500).optional();

export const CommandBodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('OPEN_LOBBY'), reason: optReason }),
  z.object({
    type: z.literal('START_ROUND'),
    reason: optReason,
    questionCount: QuestionsPerRoundSchema.optional(),
    /** Chỉ dùng khi ngân hàng thiếu câu: operator CHỦ ĐỘNG cho phép lặp lại. */
    allowReuse: z.boolean().optional(),
  }),
  z.object({ type: z.literal('PAUSE'), reason: optReason }),
  z.object({ type: z.literal('RESUME'), reason: optReason }),
  z.object({ type: z.literal('MANUAL_NEXT'), reason: optReason }),
  z.object({ type: z.literal('NEXT_ROUND'), reason: optReason }),
  z.object({ type: z.literal('SET_AUTO_MODE'), enabled: z.boolean(), reason: optReason }),
  // --- Hành động nguy hiểm: bắt buộc lý do ---
  z.object({ type: z.literal('SKIP_QUESTION'), reason }),
  z.object({ type: z.literal('VOID_QUESTION'), reason }),
  z.object({
    type: z.literal('RESTART_ROUND'),
    reason,
    questionCount: QuestionsPerRoundSchema.optional(),
    allowReuse: z.boolean().optional(),
  }),
  z.object({ type: z.literal('STOP'), reason }),
  z.object({
    type: z.literal('RESOLVE_RECOVERY'),
    decision: z.enum(['RESUME', 'VOID', 'STOP']),
    reason,
  }),
]);
export type CommandBody = z.infer<typeof CommandBodySchema>;
export type CommandType = CommandBody['type'];

export const DANGEROUS_COMMANDS: readonly CommandType[] = [
  'SKIP_QUESTION',
  'VOID_QUESTION',
  'RESTART_ROUND',
  'STOP',
  'RESOLVE_RECOVERY',
];

export const CommandEnvelopeSchema = z.object({
  /** Khoá idempotency — gửi lại cùng commandId không tạo thêm chuyển trạng thái. */
  commandId: z.string().min(8).max(100),
  expectedStateVersion: z.number().int().min(0),
  operatorId: z.string().min(1).max(100),
  requestedAtMs: z.number().finite(),
  command: CommandBodySchema,
});
export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;

export const CommandErrorCodeSchema = z.enum([
  'STALE_STATE_VERSION',
  'ILLEGAL_TRANSITION',
  'SESSION_CLOSED',
  'RECOVERY_PENDING',
  'CONNECTION_NOT_READY',
  'INSUFFICIENT_QUESTIONS',
  'NOT_ALLOWED_IN_MODE',
  'PREFLIGHT_FAILED',
  'VALIDATION_FAILED',
]);
export type CommandErrorCode = z.infer<typeof CommandErrorCodeSchema>;

export type CommandResult =
  | { ok: true; stateVersion: number; state: GameState; duplicate: boolean }
  | {
      ok: false;
      code: CommandErrorCode;
      message: string;
      stateVersion: number;
      duplicate: boolean;
      details?: unknown;
    };

// ---------------------------------------------------------------------------
// Bảng xếp hạng (mục 5)
// ---------------------------------------------------------------------------

export type LeaderboardEntry = {
  /** Hạng dùng chung khi hoà tuyệt đối (1,1,3…). */
  rank: number;
  tied: boolean;
  playerId: string;
  displayName: string;
  score: number;
  correctCount: number;
  /** Nhân vật chibi đã gán cho người chơi trong vòng (V3 §11: Victory dùng đúng nhân vật, không random lại). */
  characterId?: string;
  /** Số lần LIÊN TIẾP gần nhất đứng hạng 1 sau mỗi câu (≥ 2 → huy hiệu vàng x2, x3…). Chỉ có ở người đang hạng 1. */
  top1Streak?: number;
};

export type PodiumSlot = { place: 1 | 2 | 3; rank: number; tied: boolean; entries: LeaderboardEntry[] };
export type Podium = {
  /** Tối đa 3 vị trí; KHÔNG bịa người chơi nếu thiếu. */
  slots: PodiumSlot[];
  /** true nếu nhóm đồng hạng vắt qua ngưỡng bục (cần hiển thị ĐỒNG HẠNG). */
  tieAcrossCutoff: boolean;
};

// ---------------------------------------------------------------------------
// Snapshot & thông điệp WebSocket (mục 11)
// ---------------------------------------------------------------------------

export type TimerView = {
  durationMs: number;
  remainingMs: number;
  running: boolean;
};

export type RevealView = {
  questionInstanceId: string;
  correctOptionId: OptionId;
  optionCounts: Record<OptionId, number>;
  explanation: string;
};

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'BLOCKED';

/** Một ghế khán giả trên overlay (V3 §6). KHÔNG chứa playerId/userId — chỉ dữ liệu hiển thị. */
export type AudienceSeatView = {
  slotId: string;
  rowIndex: number;
  seatIndex: number;
  /** Toạ độ chân nhân vật trên khung 1080×1920. */
  x: number;
  y: number;
  scale: number;
  depth: number;
  occupant: {
    displayName: string;
    characterId: string;
    pinned: boolean;
    /** Chỉ có sau khi công bố đáp án: người ngồi ghế trả lời đúng / sai / không trả lời câu này. */
    result: 'correct' | 'wrong' | 'none' | null;
  } | null;
};
export type AudienceView = {
  rotationId: number;
  seats: AudienceSeatView[];
  /** Người đã tham gia nhưng chưa có ghế (vẫn được chấm điểm bình thường). */
  queued: number;
  total: number;
};

export type PublicSnapshot = {
  contractVersion: number;
  sessionId: string;
  stateVersion: number;
  state: GameState;
  scene: Scene;
  paused: boolean;
  mode: LiveSource;
  timer: TimerView | null;
  round: { roundNumber: number; questionIndex: number; questionCount: number } | null;
  question: PublicQuestion | null;
  answerCount: number;
  participantCount: number;
  reveal: RevealView | null;
  leaderboard: { kind: 'COMPACT' | 'FULL'; entries: LeaderboardEntry[] } | null;
  podium: Podium | null;
  mc: McView;
  /** null khi chưa có vòng. */
  audience: AudienceView | null;
  connection: ConnectionStatus;
  safeZone: SafeZonePreset;
};

export type AdminSnapshot = {
  public: PublicSnapshot;
  sessionStatus: 'OPEN' | 'CLOSED';
  autoMode: boolean;
  recoveryPending: boolean;
  suspendedFrom: GameState | null;
  config: SessionConfig;
  current: {
    questionInstanceId: string;
    correctOptionId: OptionId;
    optionCounts: Record<OptionId, number>;
    voided: boolean;
  } | null;
  metrics: IngestMetrics;
  recentRejections: { atMs: number; reason: RejectReason }[];
  pool: { eligible: number; unusedInSession: number; requiredNextRound: number; lowPoolWarning: boolean };
  simulator: { running: boolean; players: number } | null;
  error: { code: string; message: string } | null;
  /** Tình trạng nguồn comment (V3.1 mục C). */
  live: LiveSourceHealth;
  /** Overlay đang kết nối WS và phiên bản trạng thái overlay đã báo hiển thị (không khẳng định OBS/LIVE Studio đang phát). */
  overlay: { clients: number; lastAckStateVersion: number | null; lastAckAtMs: number | null };
};

export type LiveSourceHealth = {
  source: LiveSource;
  status: ConnectionStatus;
  connectedSinceMs: number | null;
  /** Comment gần nhất nhận được từ nguồn (mọi nội dung, không chỉ đáp án). */
  lastCommentAtMs: number | null;
  commentsReceived: number;
  reconnects: number;
  detail: string | null;
};

// ---------------------------------------------------------------------------
// Kiểm tra hệ thống (V3.1 mục E)
// ---------------------------------------------------------------------------

export const CheckStatusSchema = z.enum(['PASS', 'FAIL', 'NOT_TESTED']);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;
export const SYSTEM_CHECK_IDS = [
  'backend',
  'database',
  'theme',
  'overlay',
  'mockComment',
  'tiktokConnector',
  'testComment',
  'engineRecorded',
  'overlayUpdated',
] as const;
export type SystemCheckId = (typeof SYSTEM_CHECK_IDS)[number];
export type SystemCheck = { id: SystemCheckId; label: string; status: CheckStatus; detail: string; checkedAtMs: number };

export const WS_MESSAGE_TYPES = [
  'STATE_SNAPSHOT',
  'SCENE_CHANGED',
  'TIMER_SYNC',
  'QUESTION_OPENED_PUBLIC',
  'ANSWER_COUNTS',
  'ANSWER_REVEALED',
  'LEADERBOARD_UPDATED',
  'VICTORY_STARTED',
  'CONNECTION_STATUS',
  'ERROR_PUBLIC',
  'AUDIENCE_UPDATED',
  // chỉ gửi tới kênh admin đã xác thực
  'ADMIN_SNAPSHOT',
] as const;
export type WsMessageType = (typeof WS_MESSAGE_TYPES)[number];

export type WsPayloads = {
  STATE_SNAPSHOT: PublicSnapshot;
  SCENE_CHANGED: { scene: Scene; state: GameState };
  TIMER_SYNC: TimerView | null;
  QUESTION_OPENED_PUBLIC: PublicQuestion;
  ANSWER_COUNTS: { questionInstanceId: string; answerCount: number; participantCount: number };
  ANSWER_REVEALED: RevealView;
  LEADERBOARD_UPDATED: { kind: 'COMPACT' | 'FULL'; entries: LeaderboardEntry[] };
  VICTORY_STARTED: { podium: Podium };
  CONNECTION_STATUS: { status: ConnectionStatus };
  ERROR_PUBLIC: { code: string; message: string };
  AUDIENCE_UPDATED: AudienceView;
  ADMIN_SNAPSHOT: AdminSnapshot;
};

export type WsMessage<T extends WsMessageType = WsMessageType> = {
  [K in T]: {
    v: number;
    type: K;
    /** Tăng đơn điệu theo từng thông điệp trong một lần chạy server; client thấy hụt số → xin snapshot. */
    seq: number;
    sessionId: string;
    stateVersion: number;
    serverTimeMs: number;
    payload: WsPayloads[K];
  };
}[T];

export const ClientHelloSchema = z.object({
  type: z.literal('HELLO'),
  role: z.enum(['overlay', 'admin']),
  /** Chỉ admin; không bao giờ đặt token trong URL. */
  token: z.string().max(200).optional(),
  lastStateVersion: z.number().int().optional(),
});
export type ClientHello = z.infer<typeof ClientHelloSchema>;

/** Overlay báo đã render tới stateVersion nào (dùng cho Connection Test bước 9). */
export const ClientAckSchema = z.object({
  type: z.literal('ACK'),
  stateVersion: z.number().int().min(0),
  seq: z.number().int().min(0).optional(),
  /** Nguồn overlay đã render; client cũ không gửi role được xem là preview. */
  role: z.enum(['program', 'preview']).default('preview'),
});
export type ClientAck = z.infer<typeof ClientAckSchema>;

export const CreateSessionRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).default('Phiên LIVE'),
  config: SessionConfigSchema.default({}),
});
type CreateSessionRequestOutput = z.infer<typeof CreateSessionRequestSchema>;
export type CreateSessionRequest = Omit<CreateSessionRequestOutput, 'config'> & { config: SessionConfig };

export const SimulatorRequestSchema = z.object({
  action: z.enum(['START', 'STOP']),
  players: z.number().int().min(1).max(2000).default(100),
  accuracy: z.number().min(0).max(1).default(0.6),
  participation: z.number().min(0).max(1).default(0.9),
  spamRate: z.number().min(0).max(1).default(0.15),
  noiseRate: z.number().min(0).max(1).default(0.1),
  seed: z.number().int().default(20261111),
});
export type SimulatorRequest = z.infer<typeof SimulatorRequestSchema>;
