import {
  DEFAULT_HUD_CONFIG,
  HudConfigSchema,
  INITIAL_TEST_SAFE_ZONE,
  McChatRequestSchema,
  SessionConfigSchema,
  SYSTEM_CHECK_IDS,
  type AdminSnapshot,
  type CheckStatus,
  type CommandBody,
  type CommandEnvelope,
  type CommandResult,
  type CreateSessionRequest,
  type GameState,
  type HudConfig,
  type HudConfigUpdate,
  type HudImageSlot,
  type LeaderboardEntry,
  type PublicLeaderboardEntry,
  type LiveSourceHealth,
  type McChatPreset,
  type McChatQueueItem,
  type PublicQuestion,
  type PublicSnapshot,
  type Question,
  type QuestionReview,
  type ResolvedTheme,
  type RejectReason,
  type SimulatorRequest,
  type SystemCheck,
} from '@quiz/contracts';
import { ApiError, type AdminThemeItem, type AdminThemesResponse, type CommandResponse, type DashboardClient, type HudImageUploadResponse, type SelfTestResponse, type SetActiveThemeResponse, type SocketStatus, type SourceControlAction, type StreamDelayMode, type StreamDelaySnapshot, type SystemChecksResponse, type UpdateStreamDelaySettings } from './client';

const mockThemeImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g"><stop stop-color="#161b4e"/><stop offset="1" stop-color="#7049f5"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="500" cy="80" r="42" fill="#ffcc58"/></svg>')}`;
const mockThemeDefinitions: Array<{ item: Omit<AdminThemeItem, 'active'>; tokens: Record<string, string>; assets: ResolvedTheme['assets'] }> = [
  {
    item: { id: 'neon-arena', name: 'Đấu trường Neon', valid: true },
    tokens: { deep: '#171A3D', violet: '#7049F5', gold: '#FFCC58', sky: '#8CC8FB', 'font-body': 'Segoe UI, sans-serif' },
    assets: {
      'arena.background': mockThemeImage,
      'arena.questionBackground': mockThemeImage,
      'brand.logo': mockThemeImage,
      'mc.static': mockThemeImage,
      'victory.background': mockThemeImage,
      'victory.trophyStage': mockThemeImage,
      'arena.flag.0': mockThemeImage,
      'arena.flag.1': mockThemeImage,
    },
  },
  {
    item: { id: 'theme-broken', name: 'Gói theme lỗi', valid: false, error: 'tokens.width: Theme không được thay vị trí hoặc kích thước khung.' },
    tokens: {},
    assets: {},
  },
];

const rejectReasons: RejectReason[] = [
  'INVALID_EVENT', 'NOT_AN_ANSWER', 'NOT_ACCEPTING', 'EARLY', 'LATE',
  'DUPLICATE_EVENT', 'DUPLICATE_ANSWER', 'STALE_SOURCE_TIMESTAMP',
];

const demoQuestion: PublicQuestion = {
  questionInstanceId: 'mock-question-1',
  index: 0,
  prompt: 'DEMO Free Fire: Trong chế độ Clash Squad, mỗi đội có bao nhiêu người?',
  options: [
    { id: 'A', text: '2 người' }, { id: 'B', text: '4 người' },
    { id: 'C', text: '3 người' }, { id: 'D', text: '5 người' },
  ],
  optionsVisible: true,
  isDemo: true,
};

const mockReviewQuestions: Question[] = Array.from({ length: 18 }, (_, index) => {
  const approved = index < 10;
  const id = `mock-review-${String(index + 1).padStart(2, '0')}`;
  return {
    id,
    packId: 'demo',
    subtopicId: index % 2 === 0 ? 'clash-squad' : 'free-fire-basics',
    prompt: `DEMO: Câu hỏi mẫu ${index + 1} về Free Fire?`,
    options: [
      { id: 'A', text: `Lựa chọn A của câu ${index + 1}` },
      { id: 'B', text: `Lựa chọn B của câu ${index + 1}` },
      { id: 'C', text: `Lựa chọn C của câu ${index + 1}` },
      { id: 'D', text: `Lựa chọn D của câu ${index + 1}` },
    ],
    correctOptionId: 'B',
    explanation: 'Dữ liệu mẫu chỉ dùng để xem giao diện duyệt câu hỏi.',
    difficulty: (['EASY', 'MEDIUM', 'HARD'] as const)[index % 3]!,
    tags: ['DEMO'],
    sourceRefs: [],
    verificationStatus: approved ? 'OPERATOR_VERIFIED' : 'DEMO',
    approvalStatus: approved ? 'APPROVED' : 'PENDING_REVIEW',
    version: 1,
    media: null,
    validFrom: null,
    validUntil: null,
    lastUsedAt: null,
  };
});

function makeLeaderboard(): PublicLeaderboardEntry[] {
  return [
    { rank: 1, tied: false, playerId: 'demo-01', safeDisplayName: 'Chiến binh DEMO 01', score: 900, correctCount: 8 },
    { rank: 2, tied: false, playerId: 'demo-02', safeDisplayName: 'Chiến binh DEMO 02', score: 700, correctCount: 7 },
    { rank: 3, tied: false, playerId: 'demo-03', safeDisplayName: 'Chiến binh DEMO 03', score: 600, correctCount: 6 },
  ];
}

class MockDashboardClient implements DashboardClient {
  private config = SessionConfigSchema.parse({ mode: 'MOCK', allowDemoQuestions: true });
  private hudConfig = HudConfigSchema.parse(DEFAULT_HUD_CONFIG);
  private sessionId: string | null = null;
  private state: GameState = 'IDLE';
  private suspendedFrom: GameState | null = null;
  private stateVersion = 0;
  private questionIndex = 0;
  private voidedCurrent = false;
  private roundNumber = 1;
  private autoMode = false;
  private autoStartWhenAudienceFull = false;
  private lobbyDisplayNames = new Map<string, string>();
  private lobbyCountdownEndsAtMs: number | null = null;
  private lobbyCountdownTimeoutId: number | null = null;
  private lobbyCountdownIntervalId: number | null = null;
  private simulator: { running: boolean; players: number } | null = null;
  private connection: AdminSnapshot['public']['connection'] = 'CONNECTED';
  private connectedSinceMs: number | null = Date.now();
  private lastCommentAtMs: number | null = null;
  private commentsReceived = 0;
  private reconnects = 0;
  private sourceDetail: string | null = null;
  private selfTestResult: SelfTestResponse | null = null;
  private answerCount = 0;
  private participantCount = 34;
  private optionCounts = { A: 4, B: 14, C: 3, D: 2 };
  private recentRejections: { atMs: number; reason: RejectReason }[] = [];
  private listeners = new Set<(snapshot: AdminSnapshot, serverTimeMs: number) => void>();
  private statusListeners = new Set<(status: SocketStatus) => void>();
  private commandResults = new Map<string, CommandResponse>();
  private activeThemeId: string | null = 'neon-arena';
  private themeVersion = 1;
  private streamDelayMode: StreamDelayMode = 'AUTO';
  private streamDelayManualMs = 2_000;
  private activeQuestionDelayMs: number | null = null;
  private mcChatQueue: McChatQueueItem[] = [];
  private mcChatPresets: McChatPreset[] = [];
  private mcChatBubble: NonNullable<PublicSnapshot['mcChatBubble']> | null = null;

  private resolvedTheme(themeId = this.activeThemeId): ResolvedTheme {
    const definition = mockThemeDefinitions.find((theme) => theme.item.id === themeId && theme.item.valid);
    if (!definition) return { id: 'default', name: 'Giao diện mặc định', version: this.themeVersion, tokens: {}, fonts: [], assets: {} };
    return {
      id: definition.item.id,
      name: definition.item.name,
      version: this.themeVersion,
      tokens: { ...definition.tokens },
      fonts: [],
      assets: { ...definition.assets },
    };
  }

  async getThemes(): Promise<AdminThemesResponse> {
    return {
      themes: mockThemeDefinitions.map(({ item }) => ({ ...item, active: item.id === this.activeThemeId })),
      activeThemeId: this.activeThemeId,
      themeVersion: this.themeVersion,
    };
  }

  async getActiveTheme() {
    return this.resolvedTheme();
  }

  async getResolvedTheme(_token: string, themeId: string) {
    const theme = mockThemeDefinitions.find((item) => item.item.id === themeId && item.item.valid);
    if (!theme) throw new ApiError('Theme không tồn tại hoặc có lỗi; hãy kiểm tra danh sách theme.', 422, 'THEME_INVALID');
    return this.resolvedTheme(themeId);
  }

  async reloadThemes() {
    this.themeVersion += 1;
    return this.getThemes();
  }

  async setActiveTheme(_token: string, themeId: string): Promise<SetActiveThemeResponse> {
    const theme = mockThemeDefinitions.find((item) => item.item.id === themeId && item.item.valid);
    if (!theme) throw new ApiError('Theme không tồn tại hoặc có lỗi; hãy kiểm tra danh sách theme.', 422, 'THEME_INVALID');
    this.activeThemeId = themeId;
    this.themeVersion += 1;
    return { theme: this.resolvedTheme(themeId), activeThemeId: this.activeThemeId, themeVersion: this.themeVersion };
  }

  async getHealth() {
    return { ok: true, contractVersion: 1, sessionId: this.sessionId };
  }

  async currentSession() {
    return this.sessionId && this.snapshot().sessionStatus === 'OPEN' ? this.sessionId : null;
  }

  async createSession(_token: string, request: CreateSessionRequest) {
    if (!this.sessionId || this.snapshot().sessionStatus === 'CLOSED') {
      this.sessionId = `mock-session-${Date.now()}`;
      this.config = SessionConfigSchema.parse(request.config);
      this.state = 'IDLE';
      this.suspendedFrom = null;
      this.stateVersion = 0;
      this.questionIndex = 0;
      this.voidedCurrent = false;
      this.roundNumber = 1;
      this.streamDelayMode = 'AUTO';
      this.streamDelayManualMs = 2_000;
      this.activeQuestionDelayMs = null;
      this.autoStartWhenAudienceFull = false;
      this.resetLobby();
      this.connectedSinceMs = Date.now();
      this.lastCommentAtMs = null;
      this.commentsReceived = 0;
      this.reconnects = 0;
      this.sourceDetail = null;
      this.selfTestResult = null;
      this.answerCount = 0;
      this.participantCount = 34;
      this.optionCounts = { A: 4, B: 14, C: 3, D: 2 };
      this.mcChatQueue = [];
      this.mcChatBubble = null;
    }
    const snapshot = this.snapshot();
    this.emit();
    return { sessionId: this.sessionId!, snapshot };
  }

  async getState(_token: string, sessionId: string) {
    this.assertSession(sessionId);
    return this.snapshot();
  }

  async updateStreamDelaySettings(_token: string, sessionId: string, update: UpdateStreamDelaySettings) {
    this.assertSession(sessionId);
    if (this.snapshot().sessionStatus !== 'OPEN') throw new ApiError('Phiên đã đóng.', 409, 'SESSION_CLOSED');
    if (update.mode === 'MANUAL' && update.manualDelayMs === undefined)
      throw new ApiError('Chế độ thủ công cần nhập mức bù trễ.', 400, 'VALIDATION_FAILED');
    if (update.manualDelayMs !== undefined && (!Number.isInteger(update.manualDelayMs) || update.manualDelayMs < 0 || update.manualDelayMs > 6_000))
      throw new ApiError('Mức bù trễ phải từ 0 đến 6 giây.', 400, 'VALIDATION_FAILED');
    this.streamDelayMode = update.mode;
    if (update.manualDelayMs !== undefined) this.streamDelayManualMs = update.manualDelayMs;
    this.stateVersion += 1;
    this.emit();
    return { ok: true as const, streamDelay: this.streamDelayView() };
  }

  async sendCommand(_token: string, sessionId: string, envelope: CommandEnvelope): Promise<CommandResponse> {
    this.assertSession(sessionId);
    const duplicate = this.commandResults.get(envelope.commandId);
    if (duplicate) return { status: duplicate.status, result: { ...duplicate.result, duplicate: true } };
    if (envelope.expectedStateVersion !== this.stateVersion) {
      return {
        status: 409,
        result: { ok: false, code: 'STALE_STATE_VERSION', message: 'Trạng thái đã thay đổi.', stateVersion: this.stateVersion, duplicate: false },
      };
    }
    if (this.isDangerous(envelope.command) && (envelope.command.reason?.trim().length ?? 0) < 3) {
      return {
        status: 422,
        result: { ok: false, code: 'VALIDATION_FAILED', message: 'Bắt buộc nêu lý do (≥ 3 ký tự)', stateVersion: this.stateVersion, duplicate: false },
      };
    }

    this.applyCommand(envelope.command);
    this.stateVersion += 1;
    if (envelope.command.type === 'SET_LOBBY_AUTO_START' && envelope.command.enabled) this.maybeStartLobbyCountdown();
    const result: CommandResult = { ok: true, stateVersion: this.stateVersion, state: this.state, duplicate: false };
    const response = { status: 200, result };
    this.commandResults.set(envelope.commandId, response);
    this.emit();
    this.pumpMockMcChat();
    return response;
  }

  async sendMcChat(_token: string, sessionId: string, request: { text: string; speak: boolean }) {
    this.assertSession(sessionId);
    if (this.snapshot().sessionStatus !== 'OPEN') throw new ApiError('Phiên đã đóng.', 409, 'SESSION_CLOSED');
    const parsed = McChatRequestSchema.safeParse(request);
    if (!parsed.success) throw new ApiError('Câu MC phải có từ 1 đến 120 ký tự.', 400, 'MC_CHAT_INVALID');
    const active = this.mcChatQueue.filter((item) => !['DONE', 'CANCELLED'].includes(item.status));
    if (active.length >= 5) throw new ApiError('Hàng chờ MC đã đủ 5 câu.', 429, 'MC_CHAT_QUEUE_FULL');
    const speak = parsed.data.speak && this.config.mcVoiceEnabled === true;
    const item: McChatQueueItem = {
      id: crypto.randomUUID(), text: parsed.data.text, speak,
      status: speak ? 'GENERATING' : 'QUEUED', createdAtMs: Date.now(), updatedAtMs: Date.now(),
    };
    this.mcChatQueue = [...this.mcChatQueue, item];
    this.emit();
    if (speak) {
      window.setTimeout(() => {
        if (this.mcChatQueue.find((entry) => entry.id === item.id)?.status !== 'GENERATING') return;
        this.updateMockMcChat(item.id, 'QUEUED');
        this.pumpMockMcChat();
      }, 60);
    }
    this.pumpMockMcChat();
    return { ok: true, item };
  }

  async cancelMcChat(_token: string, sessionId: string, chatId: string) {
    this.assertSession(sessionId);
    const item = this.mcChatQueue.find((entry) => entry.id === chatId);
    if (!item || !['GENERATING', 'QUEUED', 'ERROR'].includes(item.status))
      throw new ApiError('Chỉ huỷ được câu MC chưa phát.', 409, 'MC_CHAT_ALREADY_STARTED');
    this.updateMockMcChat(chatId, 'CANCELLED');
    return { ok: true, item: this.mcChatQueue.find((entry) => entry.id === chatId)! };
  }

  async useMcChatTextFallback(_token: string, sessionId: string, chatId: string) {
    this.assertSession(sessionId);
    const item = this.mcChatQueue.find((entry) => entry.id === chatId);
    if (!item || item.status !== 'ERROR') throw new ApiError('Câu MC chưa sẵn sàng để chuyển sang chữ.', 409, 'MC_CHAT_NOT_FALLBACK_READY');
    item.speak = false;
    this.updateMockMcChat(chatId, 'QUEUED');
    this.pumpMockMcChat();
    return { ok: true, item: this.mcChatQueue.find((entry) => entry.id === chatId)! };
  }

  async getMcChatPresets(_token: string) {
    return { presets: this.mcChatPresets.map((preset) => ({ ...preset })) };
  }

  async addMcChatPreset(_token: string, text: string) {
    const parsed = McChatRequestSchema.shape.text.safeParse(text);
    if (!parsed.success) throw new ApiError('Câu mẫu phải có từ 1 đến 120 ký tự.', 400, 'MC_CHAT_INVALID');
    if (this.mcChatPresets.length >= 50) throw new ApiError('Danh sách đã đủ 50 câu mẫu.', 409, 'MC_CHAT_PRESETS_FULL');
    this.mcChatPresets.push({ id: crypto.randomUUID(), text: parsed.data });
    return { ok: true, presets: this.mcChatPresets.map((preset) => ({ ...preset })) };
  }

  async deleteMcChatPreset(_token: string, presetId: string) {
    const before = this.mcChatPresets.length;
    this.mcChatPresets = this.mcChatPresets.filter((preset) => preset.id !== presetId);
    if (this.mcChatPresets.length === before) throw new ApiError('Không tìm thấy câu mẫu.', 404, 'MC_CHAT_PRESET_NOT_FOUND');
    return { ok: true, presets: this.mcChatPresets.map((preset) => ({ ...preset })) };
  }

  private updateMockMcChat(id: string, status: McChatQueueItem['status']) {
    this.mcChatQueue = this.mcChatQueue.map((item) => item.id === id ? { ...item, status, updatedAtMs: Date.now() } : item);
    this.emit();
  }

  private pumpMockMcChat() {
    if (!this.sessionId || !['LOBBY', 'REVEAL', 'LEADERBOARD', 'INTERMISSION', 'ROUND_END', 'VICTORY'].includes(this.state) ||
      this.mcChatQueue.some((item) => item.status === 'PLAYING')) return;
    const item = this.mcChatQueue.find((entry) => entry.status === 'QUEUED');
    if (!item) return;
    window.setTimeout(() => {
      const current = this.mcChatQueue.find((entry) => entry.id === item.id);
      if (current?.status !== 'QUEUED' || !['LOBBY', 'REVEAL', 'LEADERBOARD', 'INTERMISSION', 'ROUND_END', 'VICTORY'].includes(this.state)) return;
      const startsAtServerMs = Date.now();
      this.mcChatQueue = this.mcChatQueue.map((entry) => entry.id === current.id ? { ...entry, status: 'PLAYING', updatedAtMs: startsAtServerMs } : entry);
      this.mcChatBubble = { chatId: current.id, text: current.text, startsAtServerMs, endsAtServerMs: startsAtServerMs + 5_000 };
      this.emit();
      window.setTimeout(() => {
        if (this.mcChatBubble?.chatId === current.id) this.mcChatBubble = null;
        this.updateMockMcChat(current.id, 'DONE');
        this.emit();
        this.pumpMockMcChat();
      }, 5_000);
    }, 30);
  }

  async controlSimulator(_token: string, sessionId: string, request: SimulatorRequest) {
    this.assertSession(sessionId);
    this.simulator = request.action === 'START' ? { running: true, players: request.players } : null;
    this.emit();
    return { ok: true, running: !!this.simulator, players: this.simulator?.players ?? 0 };
  }

  async controlConnection(_token: string, sessionId: string, action: 'LOSE' | 'RESTORE') {
    this.assertSession(sessionId);
    if (action === 'LOSE') {
      this.connection = 'BLOCKED';
      this.connectedSinceMs = null;
      if (this.state === 'ACCEPTING') {
        this.suspendedFrom = this.state;
        this.state = 'CONNECTION_INTERRUPTED';
      }
    } else {
      this.connection = 'CONNECTED';
      this.connectedSinceMs = Date.now();
      // Có mạng lại không tự tiếp tục câu hỏi đang nhận đáp án.
    }
    this.stateVersion += 1;
    this.emit();
    return { ok: true, status: this.connection };
  }

  async controlSource(_token: string, sessionId: string, action: SourceControlAction) {
    this.assertSession(sessionId);
    if (action === 'DISCONNECT') {
      this.connection = 'DISCONNECTED';
      this.connectedSinceMs = null;
    } else {
      if (action === 'RECONNECT') this.reconnects += 1;
      this.connection = 'CONNECTED';
      this.connectedSinceMs = Date.now();
    }
    this.sourceDetail = null;
    this.stateVersion += 1;
    this.emit();
    return { ok: true, health: this.liveHealth() };
  }

  async getSystemChecks(_token: string): Promise<SystemChecksResponse> {
    const checkedAtMs = Date.now();
    const check = (id: SystemCheck['id'], label: string, status: CheckStatus, detail: string): SystemCheck => ({ id, label, status, detail, checkedAtMs });
    const selfTest = this.selfTestResult;
    const byId: Record<SystemCheck['id'], SystemCheck> = {
      backend: check('backend', 'Backend hoạt động', 'PASS', 'MOCK dashboard đang hoạt động trong trình duyệt'),
      database: check('database', 'Database hoạt động', 'PASS', 'Mô phỏng trong bộ nhớ'),
      theme: check('theme', 'Theme Pack tải thành công', 'NOT_TESTED', 'Đang dùng giao diện mặc định'),
      overlay: check('overlay', 'Overlay hiển thị', 'FAIL', 'Mock dashboard không mở kết nối overlay thật'),
      mockComment: check('mockComment', 'Mock Comment hoạt động', selfTest ? (selfTest.mockComment ? 'PASS' : 'FAIL') : 'NOT_TESTED', selfTest?.detail ?? 'Bấm "Chạy tự kiểm"'),
      tiktokConnector: check('tiktokConnector', 'TikTok Connector kết nối', 'NOT_TESTED', 'MOCK không kết nối TikTok'),
      testComment: check('testComment', 'Nhận được comment thử nghiệm', 'NOT_TESTED', 'Chỉ áp dụng khi có kết nối TikTok'),
      engineRecorded: check('engineRecorded', 'Quiz Engine ghi nhận câu trả lời', selfTest ? (selfTest.engineRecorded ? 'PASS' : 'FAIL') : 'NOT_TESTED', selfTest?.detail ?? 'Bấm "Chạy tự kiểm"'),
      overlayUpdated: check('overlayUpdated', 'Overlay cập nhật đúng', 'NOT_TESTED', 'Mock dashboard không có overlay ACK'),
    };
    return { checks: SYSTEM_CHECK_IDS.map((id) => byId[id]), live: this.liveHealth(), overlay: { clients: 0, lastAck: null, audioState: null } };
  }

  async getPreflight() {
    return { checks: [
      { id: 'overlayAck', label: 'Overlay đã ACK', status: 'WARN' as const, reason: 'MOCK không xác nhận nguồn overlay program.' },
      { id: 'mcVoice', label: 'Giọng MC', status: 'WARN' as const, reason: this.config.mcVoiceEnabled === true ? 'MOCK không kiểm tra khả năng phát giọng MC thật.' : 'Giọng MC đang tắt trong cấu hình phiên.' },
    ] };
  }

  async runSystemSelfTest(_token: string): Promise<SelfTestResponse> {
    this.selfTestResult = { ok: true, mockComment: true, engineRecorded: true, detail: 'MOCK: pipeline giả lập đã ghi nhận đáp án vào sổ điểm.', durationMs: 5 };
    return this.selfTestResult;
  }

  async getHud(): Promise<HudConfig> {
    return JSON.parse(JSON.stringify(this.hudConfig)) as HudConfig;
  }

  async saveHud(_token: string, update: HudConfigUpdate): Promise<HudConfig> {
    this.hudConfig = HudConfigSchema.parse({ ...update, version: this.hudConfig.version + 1 });
    return this.getHud();
  }

  async uploadHudImage(_token: string, slot: HudImageSlot, file: File): Promise<HudImageUploadResponse> {
    const mimeType = file.type.toLowerCase();
    if (file.size === 0 || file.size > 8 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(mimeType))
      throw new ApiError('Chọn ảnh PNG, JPG hoặc WEBP có dung lượng tối đa 8 MB.', 400, 'HUD_IMAGE_INVALID');
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.slice('image/'.length);
    const id = `${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}.${extension}`;
    this.hudConfig = HudConfigSchema.parse({
      ...this.hudConfig,
      images: { ...this.hudConfig.images, [slot]: id },
      version: this.hudConfig.version + 1,
    });
    return { image: { id, width, height, mimeType }, config: await this.getHud() };
  }

  async resetHud(_token: string): Promise<HudConfig> {
    this.hudConfig = HudConfigSchema.parse({ ...DEFAULT_HUD_CONFIG, version: this.hudConfig.version + 1 });
    return this.getHud();
  }

  async sendComment(_token: string, sessionId: string, comment: { userId: string; displayName: string; text: string }) {
    this.assertSession(sessionId);
    if (this.connection === 'CONNECTED') {
      this.commentsReceived += 1;
      this.lastCommentAtMs = Date.now();
    }
    if (this.connection === 'CONNECTED' && this.state === 'LOBBY' && this.matchesLobbyKeyword(comment.text)) {
      if (!this.lobbyDisplayNames.has(comment.userId)) {
        this.lobbyDisplayNames.set(comment.userId, `Khán giả ${this.lobbyDisplayNames.size + 1}`);
      }
      this.maybeStartLobbyCountdown();
    } else if (this.connection === 'CONNECTED' && this.state === 'ACCEPTING' && comment.text.trim().toUpperCase() in this.optionCounts) {
      const answer = comment.text.trim().toUpperCase() as keyof typeof this.optionCounts;
      this.optionCounts[answer] += 1;
      this.answerCount += 1;
      this.participantCount += 1;
    } else {
      this.recentRejections = [{ atMs: Date.now(), reason: 'NOT_ACCEPTING' as RejectReason }, ...this.recentRejections].slice(0, 20);
    }
    this.stateVersion += 1;
    this.emit();
    return { ok: true };
  }

  async getQuestions(_token: string) {
    return mockReviewQuestions.map((question) => ({ ...question, options: question.options.map((option) => ({ ...option })) }));
  }

  async reviewQuestion(_token: string, questionId: string, decision: QuestionReview['decision'], _reason?: string) {
    const question = mockReviewQuestions.find((item) => item.id === questionId);
    if (!question) throw new Error('Không có câu hỏi.');
    question.approvalStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    question.verificationStatus = decision === 'APPROVE' ? 'OPERATOR_VERIFIED' : 'UNVERIFIED';
    return { ok: true, question: { ...question, options: question.options.map((option) => ({ ...option })) } };
  }

  subscribe(_token: string, onSnapshot: (snapshot: AdminSnapshot, serverTimeMs: number) => void, onStatus: (status: SocketStatus) => void) {
    this.listeners.add(onSnapshot);
    this.statusListeners.add(onStatus);
    onStatus('connected');
    if (this.sessionId) onSnapshot(this.snapshot(), Date.now());
    return () => {
      this.listeners.delete(onSnapshot);
      this.statusListeners.delete(onStatus);
      onStatus('disconnected');
    };
  }

  private assertSession(sessionId: string) {
    if (!this.sessionId || sessionId !== this.sessionId) throw new Error('Không có phiên MOCK đang mở.');
  }

  private liveHealth(): LiveSourceHealth {
    return {
      source: 'MOCK',
      status: this.connection,
      transport: 'UNKNOWN',
      connectedSinceMs: this.connectedSinceMs,
      lastCommentAtMs: this.lastCommentAtMs,
      commentsReceived: this.commentsReceived,
      reconnects: this.reconnects,
      reconnectsThisRound: 0,
      downtimeMsThisRound: 0,
      commentsPerSecondTotal: 0,
      commentsPerSecondQuestion: 0,
      sourceLatencyP50Ms: null,
      sourceLatencyP95Ms: null,
      rejectedThisRound: {
        INVALID_EVENT: 0, NOT_AN_ANSWER: 0, NOT_ACCEPTING: 0, EARLY: 0, LATE: 0,
        DUPLICATE_EVENT: 0, DUPLICATE_ANSWER: 0, STALE_SOURCE_TIMESTAMP: 0,
      },
      rawRecordingEnabled: false,
      detail: this.sourceDetail,
    };
  }

  private isDangerous(command: CommandBody) {
    return ['SKIP_QUESTION', 'VOID_QUESTION', 'RESTART_ROUND', 'STOP', 'RESOLVE_RECOVERY'].includes(command.type);
  }

  private applyCommand(command: CommandBody) {
    switch (command.type) {
      case 'OPEN_LOBBY': this.resetLobby(); this.activeQuestionDelayMs = null; this.state = 'LOBBY'; break;
      case 'START_ROUND': this.clearLobbyCountdown(); this.questionIndex = 0; this.voidedCurrent = false; this.activeQuestionDelayMs = this.streamDelayView().nextQuestionDelayMs; this.state = 'PREPARE'; break;
      case 'PAUSE': this.suspendedFrom = this.state; this.state = 'PAUSED'; break;
      case 'RESUME': this.state = this.suspendedFrom ?? 'PREPARE'; this.suspendedFrom = null; break;
      case 'MANUAL_NEXT': this.advance(); break;
      case 'NEXT_ROUND': this.roundNumber += 1; this.questionIndex = 0; this.voidedCurrent = false; this.activeQuestionDelayMs = this.streamDelayView().nextQuestionDelayMs; this.state = 'PREPARE'; break;
      case 'SET_AUTO_MODE': this.autoMode = command.enabled; break;
      case 'SET_LOBBY_AUTO_START':
        this.autoStartWhenAudienceFull = command.enabled;
        if (!command.enabled) this.clearLobbyCountdown();
        break;
      case 'SKIP_QUESTION': this.advanceQuestion(); break;
      case 'VOID_QUESTION': this.voidedCurrent = true; this.state = 'LEADERBOARD'; break;
      case 'RESTART_ROUND': this.questionIndex = 0; this.voidedCurrent = false; this.activeQuestionDelayMs = this.streamDelayView().nextQuestionDelayMs; this.state = 'PREPARE'; break;
      case 'STOP': this.clearLobbyCountdown(); this.state = 'IDLE'; this.suspendedFrom = null; this.simulator = null; this.activeQuestionDelayMs = null; break;
      case 'RESOLVE_RECOVERY': this.applyRecovery(command.decision); break;
    }
  }

  private lobbyAudience(): NonNullable<PublicSnapshot['audience']> {
    const slots = Array.from({ length: 35 }, (_, index) => {
      const rowIndex = Math.floor(index / 5);
      const seatIndex = index % 5;
      return {
        slotId: `row-${rowIndex}-seat-${seatIndex}`,
        rowIndex,
        seatIndex,
        x: 160 + seatIndex * 190,
        y: 1_825 - rowIndex * (695 / 6),
        scale: 1 - rowIndex * 0.04,
        depth: 7 - rowIndex,
      };
    });
    const ids = [...this.lobbyDisplayNames.keys()];
    const centerOutSeatIndexes = [2, 1, 3, 0, 4];
    return {
      rotationId: 0,
      queued: Math.max(0, this.lobbyDisplayNames.size - slots.length),
      total: this.lobbyDisplayNames.size,
      seats: slots.map((slot, index) => {
        const rowIndex = Math.floor(index / 5);
        const seatIndex = index % 5;
        const joinOrder = rowIndex * 5 + centerOutSeatIndexes.indexOf(seatIndex);
        const playerId = ids[joinOrder];
        return {
          ...slot,
          occupant: playerId ? {
            safeDisplayName: this.lobbyDisplayNames.get(playerId) ?? 'Khán giả',
            characterId: 'chibi-002-a124',
            pinned: false,
            result: null,
          } : null,
        };
      }),
    };
  }

  private matchesLobbyKeyword(text: string): boolean {
    const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const keyword = normalize(this.config.lobbySeatKeyword ?? 'free fire');
    return keyword.length > 0 && normalize(text).includes(keyword);
  }

  private maybeStartLobbyCountdown() {
    const occupied = Math.min(this.lobbyDisplayNames.size, 35);
    if (this.state !== 'LOBBY' || !this.autoStartWhenAudienceFull || occupied !== 35 || this.lobbyCountdownEndsAtMs !== null) return;
    this.lobbyCountdownEndsAtMs = Date.now() + 10_000;
    this.lobbyCountdownIntervalId = window.setInterval(() => this.emit(), 1_000);
    this.lobbyCountdownTimeoutId = window.setTimeout(() => {
      this.lobbyCountdownTimeoutId = null;
      const stillEligible = this.state === 'LOBBY' && this.autoStartWhenAudienceFull
        && this.lobbyDisplayNames.size >= 35;
      if (stillEligible) {
        this.applyCommand({ type: 'START_ROUND' });
        this.stateVersion += 1;
      }
      this.clearLobbyCountdown();
      this.emit();
    }, 10_000);
  }

  private clearLobbyCountdown() {
    if (this.lobbyCountdownTimeoutId !== null) window.clearTimeout(this.lobbyCountdownTimeoutId);
    if (this.lobbyCountdownIntervalId !== null) window.clearInterval(this.lobbyCountdownIntervalId);
    this.lobbyCountdownTimeoutId = null;
    this.lobbyCountdownIntervalId = null;
    this.lobbyCountdownEndsAtMs = null;
  }

  private resetLobby() {
    this.clearLobbyCountdown();
    this.lobbyDisplayNames = new Map();
  }

  private applyRecovery(decision: 'RESUME' | 'VOID' | 'STOP') {
    if (decision === 'RESUME') this.state = this.suspendedFrom ?? 'PREPARE';
    else if (decision === 'VOID') { this.voidedCurrent = true; this.state = 'LEADERBOARD'; }
    else { this.state = 'IDLE'; this.activeQuestionDelayMs = null; }
    this.suspendedFrom = null;
  }

  private advance() {
    if (this.state === 'PREPARE') this.state = 'ACCEPTING';
    else if (this.state === 'ACCEPTING' || this.state === 'REVEAL') this.state = 'LEADERBOARD';
    else if (this.state === 'LEADERBOARD') this.advanceQuestion();
  }

  private advanceQuestion() {
    if (this.questionIndex + 1 >= this.config.questionsPerRound) {
      this.activeQuestionDelayMs = null;
      this.state = 'ROUND_END';
      return;
    }
    this.questionIndex += 1;
    this.voidedCurrent = false;
    this.activeQuestionDelayMs = this.streamDelayView().nextQuestionDelayMs;
    this.answerCount = 0;
    this.optionCounts = { A: 0, B: 0, C: 0, D: 0 };
    this.state = 'PREPARE';
  }

  private snapshot(): AdminSnapshot {
    const effectiveState = this.state === 'PAUSED' || this.state === 'CONNECTION_INTERRUPTED'
      ? this.suspendedFrom ?? this.state
      : this.state;
    const scene = this.state === 'CONNECTION_INTERRUPTED' ? 'CONNECTION_LOST' : this.sceneFor(effectiveState);
    const shortLeaderboard = effectiveState === 'LEADERBOARD' && !this.isFullLeaderboard();
    const fullLeaderboard = effectiveState === 'LEADERBOARD' && this.isFullLeaderboard();
    const questionVisible = effectiveState === 'PREPARE' || effectiveState === 'ACCEPTING' || effectiveState === 'REVEAL' || shortLeaderboard;
    const leaderboardEntries = makeLeaderboard();
    const questionState = effectiveState === 'PREPARE' || effectiveState === 'ACCEPTING';
    const publicSnapshot: PublicSnapshot = {
      contractVersion: 1,
      sessionId: this.sessionId ?? 'mock-session',
      stateVersion: this.stateVersion,
      state: this.state,
      scene,
      paused: this.state === 'PAUSED',
      mode: 'MOCK',
      timer: questionState || effectiveState === 'REVEAL'
        ? { durationMs: effectiveState === 'PREPARE' ? 8_000 : effectiveState === 'REVEAL' ? 9_000 : 20_000, remainingMs: effectiveState === 'PREPARE' ? 8_000 : effectiveState === 'REVEAL' ? 9_000 : 16_000, running: this.state !== 'PAUSED' && this.state !== 'CONNECTION_INTERRUPTED' }
        : shortLeaderboard || fullLeaderboard
          ? { durationMs: fullLeaderboard ? 6_000 : 9_000, remainingMs: fullLeaderboard ? 6_000 : 9_000, running: this.state !== 'PAUSED' && this.state !== 'CONNECTION_INTERRUPTED' }
          : effectiveState === 'INTERMISSION'
            ? { durationMs: 30_000, remainingMs: 30_000, running: this.state !== 'PAUSED' && this.state !== 'CONNECTION_INTERRUPTED' }
            : null,
      round: { roundNumber: this.roundNumber, questionIndex: this.questionIndex, questionCount: this.config.questionsPerRound },
      question: questionVisible ? {
        ...demoQuestion,
        options: effectiveState === 'PREPARE' ? [] : demoQuestion.options,
        optionsVisible: effectiveState !== 'PREPARE',
      } : null,
      answerCount: this.answerCount,
      participantCount: this.participantCount,
      fastestCorrectAnswer: !this.voidedCurrent && ['REVEAL', 'LEADERBOARD'].includes(effectiveState) ? {
        questionInstanceId: demoQuestion.questionInstanceId,
        publicPlayerId: leaderboardEntries[0]!.playerId,
        seatId: null,
        safeDisplayName: leaderboardEntries[0]!.safeDisplayName,
        responseMs: 1_234,
      } : null,
      questionTop3: null,
      stageTop3: null,
      reveal: (effectiveState === 'REVEAL' || shortLeaderboard) && !this.voidedCurrent ? {
        questionInstanceId: demoQuestion.questionInstanceId,
        correctOptionId: 'B',
        optionCounts: { ...this.optionCounts },
        explanation: 'DEMO Free Fire: chế độ Clash Squad có 4 người trong mỗi đội.',
      } : null,
      leaderboard: questionVisible
        ? { kind: 'COMPACT', entries: leaderboardEntries.slice(0, 10) }
        : ['LEADERBOARD', 'ROUND_END', 'VICTORY', 'INTERMISSION'].includes(effectiveState)
          ? { kind: 'FULL', entries: leaderboardEntries }
          : null,
      podium: ['ROUND_END', 'VICTORY'].includes(effectiveState) ? {
        slots: [
          { place: 2, rank: 2, tied: false, entries: [leaderboardEntries[1]!] },
          { place: 1, rank: 1, tied: false, entries: [leaderboardEntries[0]!] },
          { place: 3, rank: 3, tied: false, entries: [leaderboardEntries[2]!] },
        ],
        tieAcrossCutoff: false,
      } : null,
      mc: {
        state: effectiveState === 'PREPARE' ? 'ask' : shortLeaderboard ? 'react' : effectiveState === 'ACCEPTING' ? 'welcome' : 'idle',
        bubble: effectiveState === 'PREPARE'
          ? 'Sẵn sàng nhé! Câu hỏi Free Fire sắp bắt đầu.'
          : shortLeaderboard
            ? 'Đã khóa đáp án. Cùng xem kết quả câu hỏi Free Fire nhé.'
            : 'Bình luận A, B, C hoặc D để tham gia câu hỏi Free Fire.',
      },
      mcChatBubble: this.mcChatBubble && this.mcChatBubble.endsAtServerMs > Date.now() ? this.mcChatBubble : null,
      connection: this.connection,
      audience: this.state === 'LOBBY' ? this.lobbyAudience() : null,
      lobbyCountdown: this.lobbyCountdownEndsAtMs === null ? null : {
        durationMs: 10_000,
        remainingMs: Math.max(0, this.lobbyCountdownEndsAtMs - Date.now()),
      },
      safeZone: INITIAL_TEST_SAFE_ZONE,
    };
    return {
      public: publicSnapshot,
      flaggedPlayers: [],
      sessionStatus: this.state === 'IDLE' && this.stateVersion > 0 ? 'CLOSED' : 'OPEN',
      autoMode: this.autoMode,
      autoStartWhenAudienceFull: this.autoStartWhenAudienceFull,
      recoveryPending: false,
      suspendedFrom: this.suspendedFrom,
      live: this.liveHealth(),
      overlay: { clients: 0, lastAckStateVersion: null, lastAckAtMs: null },
      config: this.config,
      current: questionVisible ? {
        questionInstanceId: demoQuestion.questionInstanceId,
        correctOptionId: 'B',
        optionCounts: { ...this.optionCounts },
        voided: this.voidedCurrent,
      } : null,
      metrics: {
        received: this.answerCount,
        accepted: this.answerCount,
        rejected: Object.fromEntries(rejectReasons.map((reason) => [reason, this.recentRejections.filter((item) => item.reason === reason).length])) as AdminSnapshot['metrics']['rejected'],
      },
      recentRejections: [...this.recentRejections],
      mcChatQueue: this.mcChatQueue.map((item) => ({ ...item })),
      pool: { eligible: 36, unusedInSession: 36, requiredNextRound: this.config.questionsPerRound, lowPoolWarning: false },
      simulator: this.simulator,
      error: null,
      streamDelay: this.streamDelayView(),
    } as AdminSnapshot;
  }

  private streamDelayView(): StreamDelaySnapshot {
    return {
      mode: this.streamDelayMode,
      nextQuestionDelayMs: this.streamDelayMode === 'MANUAL' ? this.streamDelayManualMs : 2_000,
      activeQuestionDelayMs: this.activeQuestionDelayMs,
      manualDelayMs: this.streamDelayManualMs,
    };
  }

  private sceneFor(state: GameState): PublicSnapshot['scene'] {
    switch (state) {
      case 'IDLE':
      case 'LOBBY': return 'LOBBY';
      case 'PREPARE':
      case 'READING':
      case 'ACCEPTING': return 'QUESTION';
      case 'REVEAL': return 'REVEAL';
      case 'LEADERBOARD': return this.isFullLeaderboard() ? 'INTERIM_TOP10' : 'REVEAL';
      case 'ROUND_END': return 'ROUND_WINNER';
      case 'VICTORY': return 'VICTORY';
      case 'INTERMISSION': return 'INTERMISSION';
      case 'CONNECTION_INTERRUPTED':
      case 'ERROR': return 'CONNECTION_LOST';
      case 'PAUSED': return 'QUESTION';
    }
  }

  private isFullLeaderboard() {
    const questionNumber = this.questionIndex + 1;
    return questionNumber % this.config.leaderboardInterval === 0 || questionNumber === this.config.questionsPerRound;
  }

  private emit() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot, Date.now());
  }
}

export const mockClient = new MockDashboardClient();
