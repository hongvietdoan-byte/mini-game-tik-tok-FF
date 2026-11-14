/**
 * @quiz/contracts — nguồn sự thật duy nhất cho schema, DTO và kiểu sự kiện.
 * Mọi package khác chỉ phụ thuộc vào đây; không package nào được định nghĩa lại các kiểu này.
 */
import { z } from 'zod';

export const CONTRACT_VERSION = 1;

// ---------------------------------------------------------------------------
// Nội dung HUD có thể tuỳ chỉnh (C-0171)
// ---------------------------------------------------------------------------

export const HUD_IMAGE_SLOTS = ['logo', 'bgQuestion', 'bgLobby', 'bgVictory'] as const;
export const HudImageSlotSchema = z.enum(HUD_IMAGE_SLOTS);
export type HudImageSlot = z.infer<typeof HudImageSlotSchema>;

export const HudImageIdSchema = z.string().regex(/^[a-f0-9]{64}\.(png|jpg|webp)$/, 'Id ảnh HUD không hợp lệ.');

function hudText(maxGraphemes: number, allowEmpty = false) {
  return z.string().trim().max(maxGraphemes * 16).superRefine((value, ctx) => {
    if (!allowEmpty && value.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Không được để trống.' });
      return;
    }
    if (/[<>]/u.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'Không được chứa ký tự HTML.' });
      return;
    }
    const graphemes = [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(value)].length;
    if (graphemes > maxGraphemes)
      ctx.addIssue({ code: 'custom', message: `Tối đa ${maxGraphemes} ký tự hiển thị.` });
  });
}

export const HudTextsSchema = z.object({
  kicker: hudText(24),
  arenaTitle: hudText(28),
  playingLabel: hudText(24),
  roundLabel: hudText(24),
  leaderboardTitle: hudText(28),
  victoryTitle: hudText(28, true),
}).strict();
export type HudTexts = z.infer<typeof HudTextsSchema>;

export const HudImagesSchema = z.object({
  logo: HudImageIdSchema.nullable(),
  bgQuestion: HudImageIdSchema.nullable(),
  bgLobby: HudImageIdSchema.nullable(),
  bgVictory: HudImageIdSchema.nullable(),
}).strict();
export type HudImages = z.infer<typeof HudImagesSchema>;

export const HudConfigSchema = z.object({
  texts: HudTextsSchema,
  images: HudImagesSchema,
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();
export type HudConfig = z.infer<typeof HudConfigSchema>;

export const HudConfigUpdateSchema = z.object({ texts: HudTextsSchema, images: HudImagesSchema }).strict();
export type HudConfigUpdate = z.infer<typeof HudConfigUpdateSchema>;

export const DEFAULT_HUD_CONFIG: HudConfig = {
  texts: {
    kicker: 'STORM ARENA',
    arenaTitle: 'ĐẤU TRƯỜNG BÃO TỐ',
    playingLabel: 'ĐANG CHƠI',
    roundLabel: 'VÒNG',
    leaderboardTitle: 'BXH TRỰC TIẾP',
    // Bố cục Victory hiện không có tiêu đề riêng; để rỗng giữ nguyên mockup.
    victoryTitle: '',
  },
  images: { logo: null, bgQuestion: null, bgLobby: null, bgVictory: null },
  version: 0,
};

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
  playerNameSpeech: z.literal('UNSUPPORTED'),
});
export type McVoiceSettings = z.infer<typeof McVoiceSettingsSchema>;

/** Tăng số này khi thay đổi luật phát voice game; cache thiếu/khác version bị bỏ qua. */
export const MC_VOICE_POLICY_VERSION = 1;

/** Voice payload game-side có allowlist hẹp; strict schema loại mọi trường danh tính người chơi. */
export const McVoiceEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('WELCOME'), scriptId: z.string().trim().min(1).max(64) }).strict(),
  z.object({
    type: z.literal('QUESTION'),
    questionInstanceId: z.string().trim().min(1).max(128),
    approvedQuestionVersion: z.string().trim().min(1).max(128),
  }).strict(),
  z.object({ type: z.literal('COUNTDOWN'), secondsRemaining: z.number().int().min(0).max(60) }).strict(),
  z.object({
    type: z.literal('ANSWER_REVEAL'),
    questionInstanceId: z.string().trim().min(1).max(128),
    approvedQuestionVersion: z.string().trim().min(1).max(128),
  }).strict(),
  z.object({ type: z.literal('LEADERBOARD_GENERIC'), roundId: z.string().trim().min(1).max(128) }).strict(),
  z.object({ type: z.literal('VICTORY_GENERIC'), roundId: z.string().trim().min(1).max(128) }).strict(),
]);
export type McVoiceEvent = z.infer<typeof McVoiceEventSchema>;

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
}).strict();
export type McVoiceTestRequest = z.infer<typeof McVoiceTestRequestSchema>;

export const McVoicePreGenerateRequestSchema = z.object({
  questionIds: z.array(z.string().trim().min(1).max(64)).min(1).max(200),
}).strict().superRefine((value, ctx) => {
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

/** Ngưỡng cảnh báo nội dung trong danh sách và tuyển chọn; vượt ngưỡng không từ chối câu. */
export const QUESTION_WARNING_LIMITS = { promptMax: 110, optionMax: 28 } as const;
/** Mốc hiển thị đã duyệt; preflight dùng để cảnh báo câu APPROVED dài hơn khung. */
export const QUESTION_DISPLAY_LIMITS = { promptMax: 160, optionMax: 45 } as const;

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
  limits: { promptMax: number; optionMax: number } = QUESTION_WARNING_LIMITS,
): QuestionLengthWarning[] {
  const warnings: QuestionLengthWarning[] = [];
  const promptLength = questionCharacterCount(question.prompt);
  if (promptLength > limits.promptMax) {
    warnings.push({
      code: 'TOO_LONG',
      field: 'prompt',
      characterCount: promptLength,
      limit: limits.promptMax,
    });
  }
  for (const option of question.options) {
    const optionLength = questionCharacterCount(option.text);
    if (optionLength > limits.optionMax) {
      warnings.push({
        code: 'TOO_LONG',
        field: 'option',
        optionId: option.id,
        characterCount: optionLength,
        limit: limits.optionMax,
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
  prepareMs: z.number().int().min(500).max(60_000).default(8_000),
  answerMs: z.number().int().min(3_000).max(120_000).default(20_000),
  revealMs: z.number().int().min(500).max(60_000).default(9_000),
  leaderboardMs: z.number().int().min(500).max(60_000).default(9_000),
  /** BXH lớn ở mốc (mỗi leaderboardInterval câu + câu cuối) — V3: 5–8 s. Thiếu → 6 s. */
  bigLeaderboardMs: z.number().int().min(500).max(60_000).optional(),
  roundEndMs: z.number().int().min(0).max(60_000).default(2_000),
  victoryMs: z.number().int().min(1_000).max(120_000).default(18_000),
  intermissionMs: z.number().int().min(1_000).max(600_000).default(30_000),
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

/** Public DTO: opaque id theo phiên, tên chỉ được phát trong safeDisplayName. */
export type PublicPlayerDTO = {
  /** Mã ngẫu nhiên theo phiên, không phải TikTok userId hoặc playerId nội bộ. */
  playerId: string;
  safeDisplayName: string;
  score: number;
  rank: number;
  correctCount: number;
  tied: boolean;
  characterId?: string;
  top1Streak?: number;
};
export type PublicLeaderboardEntry = PublicPlayerDTO;
export type PublicPodiumSlot = { place: 1 | 2 | 3; rank: number; tied: boolean; entries: PublicLeaderboardEntry[] };
export type PublicPodium = { slots: PublicPodiumSlot[]; tieAcrossCutoff: boolean };

// ---------------------------------------------------------------------------
// Kiểm duyệt tên: chỉ DTO quản trị mới được mang rawDisplayName.
// ---------------------------------------------------------------------------

export const NameFilterRiskSchema = z.enum(['NONE', 'REVIEW', 'PARTIAL', 'HIGH', 'MANUAL_HIDE']);
export type NameFilterRisk = z.infer<typeof NameFilterRiskSchema>;

export const NameFilterRuleGroupSchema = z.enum([
  'PROFANITY', 'NSFW_SEXUAL', 'HATE_SPEECH', 'ILLEGAL_HARMFUL', 'IMPERSONATION',
]);
export type NameFilterRuleGroup = z.infer<typeof NameFilterRuleGroupSchema>;

export const NameFilterDisplayActionSchema = z.enum(['SAFE_NAME', 'ALIAS', 'PARTIAL_MASK']);
export type NameFilterDisplayAction = z.infer<typeof NameFilterDisplayActionSchema>;

/**
 * Rule shape returned inside admin settings. `id` is the ruleId, `term` is the
 * match sample, and `severity` is the PARTIAL/HIGH action level. Current
 * settings include operator-added rules only; compiled SYSTEM defaults are
 * not returned. There is no `enabled` flag: custom rules are active while
 * present and may be removed from the rules array via PUT.
 */
export const NameModerationRuleSchema = z.object({
  id: z.string().min(2).max(80),
  term: z.string().min(1).max(64),
  aliases: z.array(z.string().min(1).max(64)),
  match: z.enum(['word', 'substring']),
  group: NameFilterRuleGroupSchema,
  severity: z.enum(['PARTIAL', 'HIGH']),
  source: z.enum(['SYSTEM', 'CUSTOM']),
  separatorInsensitive: z.boolean().optional(),
}).strict();
export type NameModerationRule = z.infer<typeof NameModerationRuleSchema>;

/** Current whitelist response has no entry id; identify it by value + ruleIds. */
export const NameModerationWhitelistSchema = z.object({
  value: z.string().min(1).max(80),
  ruleIds: z.array(z.string().min(2).max(80)).min(1).max(100),
}).strict();
export type NameModerationWhitelist = z.infer<typeof NameModerationWhitelistSchema>;

export const NameModerationProtectedEntitySchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  aliases: z.array(z.string().min(1).max(80)),
  kind: z.enum(['BRAND', 'ORGANIZATION', 'ROLE']),
  source: z.enum(['SYSTEM', 'OPERATOR']),
  scope: z.literal('PLAYER_DISPLAY_NAME'),
  rule: z.literal('REVIEW_OR_HIGH_CONTEXT'),
}).strict();
export type NameModerationProtectedEntity = z.infer<typeof NameModerationProtectedEntitySchema>;

export const NameModerationVerifiedAccountSchema = z.object({
  source: z.enum(['TIKTOK', 'MOCK']),
  stableUserId: z.string().min(1).max(200),
  entityId: z.string().min(1).max(80),
}).strict();
export type NameModerationVerifiedAccount = z.infer<typeof NameModerationVerifiedAccountSchema>;

export const NameModerationSettingsSchema = z.object({
  rules: z.array(NameModerationRuleSchema),
  whitelist: z.array(NameModerationWhitelistSchema),
  version: z.number().int().nonnegative(),
  protectedEntities: z.array(NameModerationProtectedEntitySchema),
  playerNameSpeech: z.literal('UNSUPPORTED'),
  hiddenPlayerIds: z.array(z.string()),
  allowedReviewPlayerIds: z.array(z.string()),
  verifiedOfficialAccounts: z.array(NameModerationVerifiedAccountSchema),
}).strict();
export type NameModerationSettings = z.infer<typeof NameModerationSettingsSchema>;

/** GET and successful PUT return the full admin settings object. */
export const NameModerationSettingsResponseSchema = NameModerationSettingsSchema;
export type NameModerationSettingsResponse = z.infer<typeof NameModerationSettingsResponseSchema>;

/** POST mutation routes return the stored config only (without protectedEntities or playerNameSpeech). */
export const NameModerationConfigMutationResponseSchema = z.object({
  rules: z.array(NameModerationRuleSchema),
  whitelist: z.array(NameModerationWhitelistSchema),
  hiddenPlayerIds: z.array(z.string()),
  allowedReviewPlayerIds: z.array(z.string()),
  verifiedOfficialAccounts: z.array(NameModerationVerifiedAccountSchema),
  version: z.number().int().nonnegative(),
}).strict();
export type NameModerationConfigMutationResponse = z.infer<typeof NameModerationConfigMutationResponseSchema>;

/** Rules POST returns the updated config with the generated rule in `rules`; it does not return a standalone rule object. */
export const NameModerationRuleMutationResponseSchema = NameModerationConfigMutationResponseSchema;
export type NameModerationRuleMutationResponse = z.infer<typeof NameModerationRuleMutationResponseSchema>;
/** Exceptions POST returns the updated config; whitelist entries have no id, and use value + ruleIds. */
export const NameModerationExceptionMutationResponseSchema = NameModerationConfigMutationResponseSchema;
export type NameModerationExceptionMutationResponse = z.infer<typeof NameModerationExceptionMutationResponseSchema>;
export const NameModerationVisibilityResponseSchema = NameModerationConfigMutationResponseSchema;
export type NameModerationVisibilityResponse = z.infer<typeof NameModerationVisibilityResponseSchema>;
export const NameModerationReviewResponseSchema = NameModerationConfigMutationResponseSchema;
export type NameModerationReviewResponse = z.infer<typeof NameModerationReviewResponseSchema>;
export const NameModerationOfficialAccountResponseSchema = NameModerationConfigMutationResponseSchema;
export type NameModerationOfficialAccountResponse = z.infer<typeof NameModerationOfficialAccountResponseSchema>;

export const NameModerationPlayerSchema = z.object({
  /** ID nội bộ; chỉ gửi qua API quản trị có Bearer token. */
  playerId: z.string().min(1),
  rawDisplayName: z.string(),
  safeDisplayName: z.string(),
  risk: NameFilterRiskSchema,
  displayAction: NameFilterDisplayActionSchema,
  matchedRuleIds: z.array(z.string()),
  matchedRuleGroups: z.array(NameFilterRuleGroupSchema),
  requiresReview: z.boolean(),
  hidden: z.boolean(),
  reviewAllowed: z.boolean(),
  policyVersion: z.number().int().nonnegative(),
  checkedAt: z.number().finite(),
  /** null khi không ở Top 10 hiện tại. */
  rank: z.number().int().positive().nullable(),
  /** null khi đang chờ ghế hoặc không có trong khán đài. */
  seat: z.object({ slotId: z.string(), rowIndex: z.number().int().nonnegative(), seatIndex: z.number().int().nonnegative() }).strict().nullable(),
  score: z.number().finite(),
}).strict();
export type NameModerationPlayer = z.infer<typeof NameModerationPlayerSchema>;

export const NameModerationRosterSchema = z.object({
  players: z.array(NameModerationPlayerSchema),
  policyVersion: z.number().int().nonnegative(),
  playerNameSpeech: z.literal('UNSUPPORTED'),
}).strict();
export type NameModerationRoster = z.infer<typeof NameModerationRosterSchema>;

export const NameModerationAuditEntrySchema = z.object({
  id: z.string().min(1),
  at: z.number().finite(),
  actor: z.string(),
  action: z.string(),
  policyVersion: z.number().int().nonnegative(),
  targetCount: z.number().int().nonnegative(),
  ruleId: z.string().optional(),
}).strict();
export type NameModerationAuditEntry = z.infer<typeof NameModerationAuditEntrySchema>;

/** GET /api/admin/name-filter/audit accepts `limit` 1–1000, default 100. */
export const NameModerationAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1_000).optional(),
}).strict();
export type NameModerationAuditQuery = z.infer<typeof NameModerationAuditQuerySchema>;

/** Response is newest-first entries; no page cursor or total count is provided. */
export const NameModerationAuditResponseSchema = z.object({
  entries: z.array(NameModerationAuditEntrySchema),
}).strict();
export type NameModerationAuditResponse = z.infer<typeof NameModerationAuditResponseSchema>;

export const NameModerationVisibilityRequestSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(1).max(500),
  hidden: z.boolean(),
}).strict();
export type NameModerationVisibilityRequest = z.infer<typeof NameModerationVisibilityRequestSchema>;

export const NameModerationReviewRequestSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(1).max(500),
  allowed: z.boolean(),
}).strict();
export type NameModerationReviewRequest = z.infer<typeof NameModerationReviewRequestSchema>;

export const NameModerationRuleRequestSchema = z.object({
  term: z.string().trim().min(1).max(64),
  aliases: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  match: z.enum(['word', 'substring']),
  group: NameFilterRuleGroupSchema,
  severity: z.enum(['PARTIAL', 'HIGH']),
  separatorInsensitive: z.boolean().optional(),
}).strict();
export type NameModerationRuleRequest = z.infer<typeof NameModerationRuleRequestSchema>;

export const NameModerationExceptionRequestSchema = z.object({
  value: z.string().trim().min(1).max(80),
  ruleIds: z.array(z.string().min(1)).min(1).max(100),
}).strict();
export type NameModerationExceptionRequest = z.infer<typeof NameModerationExceptionRequestSchema>;

export const NameModerationRecheckResponseSchema = z.object({
  policyVersion: z.number().int().nonnegative(),
  checked: z.number().int().nonnegative(),
  changed: z.number().int().nonnegative(),
  flagged: z.number().int().nonnegative(),
}).strict();
export type NameModerationRecheckResponse = z.infer<typeof NameModerationRecheckResponseSchema>;

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

/** Public-safe winner of one question; `publicPlayerId` is opaque and `seatId` matches AudienceSeatView.slotId. */
export type FastestCorrectAnswer = {
  questionInstanceId: string;
  publicPlayerId: string;
  seatId: string | null;
  safeDisplayName: string;
  responseMs: number;
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
    safeDisplayName: string;
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
  /** Phiên bản nội dung HUD; server gắn vào snapshot WS để overlay nạp lại cấu hình khi đổi. */
  hudVersion?: number;
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
  /** Present only while publishing a question result or its following leaderboard. */
  fastestCorrectAnswer: FastestCorrectAnswer | null;
  reveal: RevealView | null;
  leaderboard: { kind: 'COMPACT' | 'FULL'; entries: PublicLeaderboardEntry[] } | null;
  podium: PublicPodium | null;
  mc: McView;
  /** null khi chưa có vòng. */
  audience: AudienceView | null;
  connection: ConnectionStatus;
  safeZone: SafeZonePreset;
};

export type AdminSnapshot = {
  public: PublicSnapshot;
  /** Tên gốc flagged chỉ gửi trên kênh admin; không nằm trong PublicSnapshot hay DB. */
  flaggedPlayers: {
    playerId: string;
    rawDisplayName: string;
    safeDisplayName: string;
    flagged: true;
    risk: Exclude<NameFilterRisk, 'NONE'>;
    displayAction: NameFilterDisplayAction;
    matchedRuleIds: string[];
    matchedRuleGroups: NameFilterRuleGroup[];
    requiresReview: boolean;
    policyVersion: number;
    checkedAt: number;
  }[];
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

export const CheckStatusSchema = z.enum(['PASS', 'FAIL', 'WARN', 'NOT_TESTED']);
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
  LEADERBOARD_UPDATED: { kind: 'COMPACT' | 'FULL'; entries: PublicLeaderboardEntry[] };
  VICTORY_STARTED: { podium: PublicPodium };
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
export const OverlayAudioStateSchema = z.enum(['disabled', 'running', 'suspended', 'unavailable']);
export type OverlayAudioState = z.infer<typeof OverlayAudioStateSchema>;

export const ClientAckSchema = z.object({
  type: z.literal('ACK'),
  stateVersion: z.number().int().min(0),
  seq: z.number().int().min(0).optional(),
  /** Nguồn overlay đã render; client cũ không gửi role được xem là preview. */
  role: z.enum(['program', 'preview']).default('preview'),
  /** Trạng thái Web Audio của phiên overlay; client cũ không gửi field này vẫn hợp lệ. */
  audioState: OverlayAudioStateSchema.optional(),
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
