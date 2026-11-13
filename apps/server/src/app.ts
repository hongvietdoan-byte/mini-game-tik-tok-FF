import { randomBytes, timingSafeEqual } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { z } from 'zod';
import {
  CONTRACT_VERSION,
  ClientAckSchema,
  ClientHelloSchema,
  CreateSessionRequestSchema,
  HudConfigUpdateSchema,
  HudImageSlotSchema,
  McVoicePreGenerateRequestSchema,
  McVoiceSettingsUpdateSchema,
  McVoiceTestRequestSchema,
  QuestionReviewSchema,
  DEFAULT_DIFFICULTY_TARGETS,
  questionLengthWarnings,
  QUESTION_DISPLAY_LIMITS,
  SimulatorRequestSchema,
  type OverlayAudioState,
  type PublicSnapshot,
  type WsMessage,
} from '@quiz/contracts';
import { formatDifficultyCounts, isEligible, planPreferredDifficultyCounts } from '@quiz/quiz-core';
import { MockAdapter, TikTokLiveAdapter, type LiveAdapter, type Scheduler } from '@quiz/live-adapters';
import type { Store } from '@quiz/persistence';
import type { SessionConfig, SystemCheck } from '@quiz/contracts';
import { ModeError, SessionRuntime, type Outgoing } from './runtime';
import { runPipelineSelfTest, type SelfTestResult } from './selftest';
import { serveAssets, serveSpa } from './static';
import { McVoiceCache } from './voice/cache';
import { McVoicePreGenerateManager } from './voice/pre-generate';
import { McVoiceProviderError, type McVoiceCredentialStore, type McVoiceProfile, EnvironmentMcVoiceCredentialStore } from './voice/types';
import { McVoiceService } from './voice/service';
import { preflightAssets } from './preflight-assets';
import { commentSourcePreflight, overlayAckPreflight, overlayAudioPreflight } from './preflight-health';
import { HudConfigError, HudConfigStore, MAX_HUD_IMAGE_BYTES } from './hud-config';
import {
  recordOverlayAck,
  registerOverlaySession,
  removeOverlaySession,
  summarizeOverlaySessions,
  type OverlaySession,
} from './overlay-sessions';

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://localhost:5174',
];

export type AppOptions = {
  store: Store;
  scheduler: Scheduler;
  adminToken: string;
  allowedOrigins?: string[];
  /** Mặc định: MOCK → MockAdapter, TIKTOK → TikTokAdapterBlocked. Test có thể thay. */
  adapterFactory?: (mode: 'MOCK' | 'TIKTOK', config: SessionConfig) => LiveAdapter;
  logger?: boolean;
  startedAtMs?: number;
  /** Gốc checkout để đối chiếu hash source với các bản build web. */
  repositoryRoot?: string;
  /** Thư mục bản build (vite build) để phục vụ cùng origin: /dashboard/ và /overlay/ (bộ cài Windows, OBS). */
  webRoots?: { dashboard?: string; overlay?: string; assets?: string };
  /** Kho nhân vật mặc định cho mọi phiên (từ manifest asset cục bộ). */
  characterPool?: readonly string[];
  /** Thư mục chứa hud.json và hud-assets; mặc định cùng thư mục với DB. */
  hudDataDir?: string;
  /** Cấu hình voice runtime được cấp ngoài repo; khi bỏ trống không gọi provider. */
  mcVoice?: {
    credentials?: McVoiceCredentialStore;
    service?: McVoiceService;
    profile?: McVoiceProfile;
    cache?: McVoiceCache;
    preGenerate?: McVoicePreGenerateManager;
  };
};

export type QuizApp = {
  app: FastifyInstance;
  runtime(): SessionRuntime | null;
  /** Khôi phục phiên OPEN mới nhất sau khi khởi động lại tiến trình. */
  recover(): Promise<SessionRuntime | null>;
  close(): Promise<void>;
};

/** Đọc hoặc sinh token admin lần đầu. KHÔNG in token ra log. */
export function loadOrCreateAdminToken(path: string): string {
  if (existsSync(path)) {
    const t = readFileSync(path, 'utf8').trim();
    if (t.length >= 16) return t;
  }
  mkdirSync(dirname(path), { recursive: true });
  const token = randomBytes(24).toString('base64url');
  writeFileSync(path, token + '\n', { encoding: 'utf8', mode: 0o600 });
  return token;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const MockConnectionSchema = z.object({ action: z.enum(['LOSE', 'RESTORE']) });
const MockCommentSchema = z.object({
  userId: z.string().min(1).max(200),
  displayName: z.string().max(400),
  text: z.string().max(2000),
  eventId: z.string().min(1).max(200).optional(),
});

export async function buildApp(opts: AppOptions): Promise<QuizApp> {
  const { store, scheduler } = opts;
  const hudStore = new HudConfigStore(opts.hudDataDir ?? dirname(store.path));
  const allowed = new Set(opts.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS);
  // TIKTOK: thư viện cộng đồng tiktok-live-connector — KHÔNG CHÍNH THỨC, người dùng chốt dùng tạm (BOARD #17).
  const adapterFactory =
    opts.adapterFactory ??
    ((mode: 'MOCK' | 'TIKTOK', config: SessionConfig): LiveAdapter =>
      mode === 'MOCK'
        ? new MockAdapter()
        : new TikTokLiveAdapter({
            username: config.tiktokUsername ?? '',
            scheduler,
            ...(process.env.EULER_API_KEY ? { signApiKey: process.env.EULER_API_KEY } : {}),
          }));
  const startedAtMs = opts.startedAtMs ?? scheduler.now();
  const repositoryRoot = opts.repositoryRoot ?? process.cwd();
  const currentHeadHash = () => {
    try {
      return execFileSync('git', ['-C', repositoryRoot, 'rev-parse', '--verify', 'HEAD'], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || null;
    } catch {
      return null;
    }
  };
  const voiceCredentials = opts.mcVoice?.credentials ?? new EnvironmentMcVoiceCredentialStore();
  const voiceService = opts.mcVoice?.service ?? null;
  const voiceProfile = opts.mcVoice?.profile ?? null;
  const voiceCache = opts.mcVoice?.cache ?? new McVoiceCache(join(dirname(store.path), 'mc-voice-cache'));
  const voicePreGenerate = opts.mcVoice?.preGenerate ?? (voiceService ? new McVoicePreGenerateManager(voiceService, () => scheduler.now()) : null);
  let primaryOverlayInstanceId: string | null = null;

  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 256 * 1024 });
  app.addContentTypeParser(
    ['application/octet-stream', 'image/png', 'image/jpeg', 'image/webp'],
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );
  await app.register(websocket, { options: { maxPayload: 16 * 1024 } });

  let rt: SessionRuntime | null = null;
  const overlayClients = new Set<WebSocket>();
  const overlaySessions = new Map<WebSocket, OverlaySession>();
  const adminClients = new Set<WebSocket>();
  let unsub: (() => void) | null = null;
  let lastAck: { stateVersion: number; atMs: number } | null = null;
  let ackPendingSinceMs = scheduler.now();
  let observedStateVersion = 0;
  let lastSelfTest: SelfTestResult | null = null;
  const withHudVersion = (snapshot: PublicSnapshot): PublicSnapshot => ({ ...snapshot, hudVersion: hudStore.get().version });
  const withHudVersionOnMessage = (message: WsMessage): WsMessage => {
    if (message.type === 'STATE_SNAPSHOT') return { ...message, payload: withHudVersion(message.payload) };
    if (message.type === 'ADMIN_SNAPSHOT')
      return { ...message, payload: { ...message.payload, public: withHudVersion(message.payload.public) } };
    return message;
  };
  const pushOverlayInfo = () =>
    rt?.setOverlayInfo({
      clients: overlayClients.size,
      lastAckStateVersion: lastAck?.stateVersion ?? null,
      lastAckAtMs: lastAck?.atMs ?? null,
    });

  function attachRuntime(next: SessionRuntime) {
    unsub?.();
    rt?.dispose();
    rt = next;
    lastAck = null;
    for (const session of overlaySessions.values()) session.ack = null;
    observedStateVersion = next.engine.stateVersion;
    ackPendingSinceMs = scheduler.now();
    pushOverlayInfo();
    unsub = next.subscribe((batch: Outgoing[]) => {
      const stateVersion = next.engine.stateVersion;
      if (stateVersion > observedStateVersion) {
        observedStateVersion = stateVersion;
        if (lastAck === null || lastAck.stateVersion < stateVersion) ackPendingSinceMs = scheduler.now();
      }
      for (const o of batch) {
        const data = JSON.stringify(withHudVersionOnMessage(o.message));
        for (const ws of o.audience === 'public' ? overlayClients : adminClients) if (ws.readyState === 1) ws.send(data);
      }
    });
  }

  function pushHudSnapshots() {
    if (!rt) return;
    const publicSnapshot = withHudVersion(rt.publicSnapshot());
    const publicMessage = JSON.stringify(rt.wrap('STATE_SNAPSHOT', publicSnapshot));
    for (const ws of overlayClients) if (ws.readyState === 1) ws.send(publicMessage);
    const adminSnapshot = { ...rt.adminSnapshot(), public: publicSnapshot };
    const adminMessage = JSON.stringify(rt.wrap('ADMIN_SNAPSHOT', adminSnapshot));
    for (const ws of adminClients) if (ws.readyState === 1) ws.send(adminMessage);
  }

  const isAdmin = (req: FastifyRequest) => {
    const h = req.headers.authorization;
    return typeof h === 'string' && h.startsWith('Bearer ') && safeEqual(h.slice(7).trim(), opts.adminToken);
  };
  /**
   * Origin hợp lệ: không có Origin, nằm trong danh sách dev, hoặc CÙNG ORIGIN với chính server
   * khi Host là loopback (bản đóng gói phục vụ dashboard/overlay từ server). Kiểm Host chống DNS rebinding.
   */
  const originOk = (req: FastifyRequest) => {
    const o = req.headers.origin;
    if (o === undefined || allowed.has(o)) return true;
    const host = req.headers.host ?? '';
    const hostname = host.replace(/:\d+$/, '');
    const loopback = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
    return loopback && (o === `http://${host}`);
  };

  /** Bảo vệ admin: Origin hợp lệ (chống CSRF từ trang khác) + Bearer token. */
  function guard(req: FastifyRequest, reply: FastifyReply, mutating: boolean): boolean {
    if (mutating && !originOk(req)) {
      void reply.code(403).send({ ok: false, code: 'FORBIDDEN_ORIGIN', message: 'Origin không được phép' });
      return false;
    }
    if (!isAdmin(req)) {
      void reply.code(401).send({ ok: false, code: 'UNAUTHORIZED', message: 'Thiếu hoặc sai mã quản trị' });
      return false;
    }
    return true;
  }

  function sessionOr404(id: string, reply: FastifyReply): SessionRuntime | null {
    if (!rt || rt.id !== id) {
      void reply.code(404).send({ ok: false, code: 'NOT_FOUND', message: 'Không có phiên đang mở với id này' });
      return null;
    }
    return rt;
  }

  type PreflightStatus = 'PASS' | 'FAIL' | 'WARN';
  type PreflightCheck = { id: string; label: string; status: PreflightStatus; reason: string; audioState?: OverlayAudioState | null };
  function makePreflight(session: SessionRuntime | null = rt) {
    const checkedAtMs = Math.floor(scheduler.now());
    const headHash = currentHeadHash();
    const checks: PreflightCheck[] = [];
    const check = (id: string, label: string, status: PreflightStatus, reason: string, audioState?: OverlayAudioState | null) =>
      checks.push({ id, label, status, reason, ...(audioState === undefined ? {} : { audioState }) });

    if (!session) {
      check('questions', 'Ngân hàng câu hỏi', 'WARN', 'Chưa có phiên để xác định bộ câu hỏi và số câu mỗi vòng.');
      check('difficultyDistribution', 'Phân bố độ khó và số vòng dự kiến', 'WARN', 'Chưa có phiên để dự báo phân bố độ khó và số vòng còn đủ.');
    } else {
      const config = session.config;
      const allowDemo = config.mode === 'MOCK' && config.allowDemoQuestions;
      const questions = store.listQuestions(config.packId);
      const eligibleCandidates = questions.filter((question) => isEligible(question, { allowDemo, nowMs: checkedAtMs }));
      const tooLong = eligibleCandidates.filter((question) =>
        questionLengthWarnings(question, QUESTION_DISPLAY_LIMITS).length > 0,
      );
      const eligible = eligibleCandidates.filter((question) =>
        questionLengthWarnings(question, QUESTION_DISPLAY_LIMITS).length === 0,
      );
      const used = store.usedQuestionIdsInSession(session.id);
      const unusedQuestions = eligible.filter((question) => !used.has(question.id));
      const unused = unusedQuestions.length;
      const enough = unused >= config.questionsPerRound;
      const difficultyTargets = config.difficultyTargets ?? DEFAULT_DIFFICULTY_TARGETS;
      const difficultyTolerance = config.difficultyTolerance ?? 2;
      check(
        'questions',
        'Câu APPROVED đủ và không lặp trong phiên',
        enough ? 'PASS' : 'FAIL',
        `Bộ ${config.packId}: ${eligible.length} câu hợp lệ (đã loại ${tooLong.length} câu dài khỏi lượt chọn), ${unused} câu chưa dùng / cần ${config.questionsPerRound}; mode ${config.mode}${config.mode === 'TIKTOK' ? ', đã loại DEMO' : ''}.`,
      );
      const preview = planPreferredDifficultyCounts(
        unusedQuestions,
        config.questionsPerRound,
        difficultyTargets,
        difficultyTolerance,
      );
      const roundsAvailable = Math.floor(unused / config.questionsPerRound);
      const modeDetail = config.questionSelectionMode === 'DIFFICULTY'
        ? `Dự kiến vòng tới: ${formatDifficultyCounts(preview.counts)} (mục tiêu ${formatDifficultyCounts(preview.targetCounts)} ±${difficultyTolerance}).`
        : `RANDOM đang bật; kho chưa dùng có ${formatDifficultyCounts(preview.availableCounts)}, chưa áp quota độ khó.`;
      const outsideDifficultyRange = config.questionSelectionMode === 'DIFFICULTY' &&
        (['EASY', 'MEDIUM', 'HARD'] as const).some((difficulty) =>
          Math.abs(preview.counts[difficulty] - preview.targetCounts[difficulty]) > difficultyTolerance,
        );
      const roundsDetail = roundsAvailable >= 6
        ? `Còn đủ ${roundsAvailable} vòng × ${config.questionsPerRound} câu.`
        : `Còn đủ ${roundsAvailable} vòng × ${config.questionsPerRound} câu; 6 vòng cần ${6 * config.questionsPerRound}, hiện còn ${unused}.`;
      check(
        'difficultyDistribution',
        'Phân bố độ khó và số vòng dự kiến',
        enough && roundsAvailable >= 6 && !outsideDifficultyRange ? 'PASS' : 'WARN',
        `${modeDetail} ${outsideDifficultyRange ? 'Kho hiện có buộc phải lệch quá ±2 ở ít nhất một mức.' : ''} ${roundsDetail}`.trim(),
      );
    }

    let dbReason = `Ghi/đọc thử OK — ${store.path}`;
    let dbStatus: PreflightStatus = 'PASS';
    try {
      if (!store.probeWrite(checkedAtMs)) {
        dbStatus = 'FAIL';
        dbReason = `Không đọc lại được bản ghi kiểm tra — ${store.path}`;
      }
    } catch (err) {
      dbStatus = 'FAIL';
      dbReason = `Không ghi được DB ${store.path}: ${err instanceof Error ? err.message : String(err)}`;
    }
    check('database', 'DB ghi được', dbStatus, dbReason);

    const assets = preflightAssets(opts.webRoots?.assets, repositoryRoot);
    check('assets', 'Asset bắt buộc', assets.status, assets.reason);

    const hudIssues = hudStore.preflightIssues();
    check(
      'hudAssets',
      'Ảnh HUD tuỳ chỉnh',
      hudIssues.length > 0 ? 'WARN' : 'PASS',
      hudIssues.length > 0 ? hudIssues.join(' ') : 'Ảnh HUD đã cấu hình đều tồn tại và nền gần đúng tỷ lệ 9:16.',
    );

    if (!session) {
      check('overlayAck', 'Overlay đã ACK', 'WARN', 'Chưa có phiên mở để đối chiếu ACK với stateVersion.');
      check('overlayAudio', 'Âm thanh nguồn trong LIVE Studio', 'WARN', 'Chưa có phiên overlay program để kiểm tra âm thanh.', null);
      check('commentSource', 'Nguồn comment', 'WARN', 'Chưa có phiên để xác định MOCK/TIKTOK.');
    } else {
      const overlaySummary = summarizeOverlaySessions(overlaySessions);
      const ack = overlayAckPreflight({
        clients: overlayClients.size,
        programClients: overlaySummary.programClients,
        ackVersion: overlaySummary.programAckStateVersion,
        expectedVersion: session.engine.stateVersion,
        nowMs: scheduler.now(),
        pendingSinceMs: ackPendingSinceMs,
      });
      check(
        'overlayAck',
        'Overlay đã ACK',
        ack.status,
        ack.reason,
      );
      const audio = overlayAudioPreflight(overlaySummary.programAudioState);
      check('overlayAudio', 'Âm thanh nguồn trong LIVE Studio', audio.status, audio.reason, overlaySummary.programAudioState);
      const live = session.liveHealth();
      const sourceHealth = commentSourcePreflight(session.config.mode, live, scheduler.now());
      check('commentSource', 'Nguồn comment', sourceHealth.status, sourceHealth.reason);
    }

    const buildCheck = (id: string, label: string, directory: string | undefined) => {
      if (!directory) {
        check(id, label, 'WARN', 'Chưa cấu hình thư mục dist để kiểm tra.');
        return;
      }
      if (!existsSync(directory)) {
        check(id, label, 'FAIL', `Không tìm thấy ${directory}; cần build lại web.`);
        return;
      }
      const marker = join(directory, '.build-commit');
      let buildHash = '';
      try {
        buildHash = readFileSync(marker, 'utf8').trim();
      } catch {
        check(id, label, 'FAIL', `Không tìm thấy ${marker}; cần build lại web.`);
        return;
      }
      if (!buildHash) {
        check(id, label, 'FAIL', `Hash build trong ${marker} rỗng; cần build lại.`);
        return;
      }
      if (headHash === null) {
        check(id, label, 'WARN', `Không có Git để đối chiếu ${marker}; launcher phải build lại ở mỗi lần khởi động.`);
        return;
      }
      if (buildHash === headHash) {
        check(id, label, 'PASS', `Bản build khớp HEAD ${headHash}.`);
        return;
      }
      try {
        execFileSync('git', [
          '-C', repositoryRoot, 'diff', '--quiet', buildHash, headHash, '--', 'apps', 'packages', 'pnpm-lock.yaml',
        ], { stdio: 'ignore' });
        check(id, label, 'PASS', `Từ hash build ${buildHash} tới HEAD ${headHash} không đổi apps/packages/pnpm-lock.yaml.`);
      } catch (error) {
        const status = error && typeof error === 'object' && 'status' in error ? error.status : null;
        check(
          id,
          label,
          'FAIL',
          status === 1
            ? `apps/packages/pnpm-lock.yaml đã đổi sau hash build ${buildHash}; cần build lại.`
            : `Không đối chiếu được hash build ${buildHash} với HEAD ${headHash}; cần build lại.`,
        );
      }
    };
    buildCheck('overlayBuild', 'Build overlay không cũ hơn HEAD', opts.webRoots?.overlay);
    buildCheck('dashboardBuild', 'Build dashboard không cũ hơn HEAD', opts.webRoots?.dashboard);

    const warningPackId = session?.config.packId ?? 'demo';
    const allowDemo = session ? session.config.mode === 'MOCK' && session.config.allowDemoQuestions : true;
    const approvedTooLong = store.listQuestions(warningPackId)
      .filter((question) => isEligible(question, { allowDemo, nowMs: checkedAtMs })
        && questionLengthWarnings(question, QUESTION_DISPLAY_LIMITS).length > 0);
    check(
      'questionLength',
      'Câu dài đã loại khỏi lượt chọn',
      'PASS',
      `Đã loại ${approvedTooLong.length} câu dài khỏi lượt chọn.`,
    );

    return {
      checkedAtMs,
      sessionId: session?.id ?? null,
      mode: session?.config.mode ?? null,
      canStartTikTok: !checks.some((item) => item.status === 'FAIL'),
      checks,
    };
  }

  async function voiceSettingsSnapshot() {
    const token = await voiceCredentials.get();
    return {
      provider: 'CLIPAI' as const,
      voiceName: 'Kelly' as const,
      hasToken: token !== null,
      ready: token !== null && voiceService !== null && voiceProfile !== null,
      primaryOverlayInstanceId,
    };
  }

  function badRequest(reply: FastifyReply, err: z.ZodError) {
    return reply.code(422).send({
      ok: false,
      code: 'VALIDATION_FAILED',
      message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
  }

  function mockOnly<T>(reply: FastifyReply, fn: () => T) {
    try {
      return reply.send(fn());
    } catch (err) {
      if (err instanceof ModeError) return reply.code(422).send({ ok: false, code: 'NOT_ALLOWED_IN_MODE', message: err.message });
      throw err;
    }
  }

  // --- HTTP -------------------------------------------------------------------

  const servedDashboard = opts.webRoots?.dashboard ? serveSpa(app, '/dashboard', opts.webRoots.dashboard) : false;
  const servedOverlay = opts.webRoots?.overlay ? serveSpa(app, '/overlay', opts.webRoots.overlay) : false;
  if (servedDashboard) app.get('/', async (_req, reply) => reply.redirect('/dashboard/'));
  if (opts.webRoots?.assets) serveAssets(app, '/assets', opts.webRoots.assets);

  app.get('/health', async () => ({
    ok: true,
    contractVersion: CONTRACT_VERSION,
    sessionId: rt?.id ?? null,
    web: { dashboard: servedDashboard, overlay: servedOverlay },
  }));

  app.get('/api/hud', async () => hudStore.get());

  app.put('/api/hud', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const parsed = HudConfigUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    try {
      const config = hudStore.save(parsed.data);
      pushHudSnapshots();
      return config;
    } catch (error) {
      if (error instanceof HudConfigError)
        return reply.code(error.statusCode).send({ ok: false, code: error.code, message: error.message });
      throw error;
    }
  });

  app.post<{ Querystring: { slot?: string } }>('/api/hud/images', { bodyLimit: MAX_HUD_IMAGE_BYTES }, async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const slot = HudImageSlotSchema.safeParse(req.query.slot);
    if (!slot.success) return reply.code(400).send({ ok: false, code: 'HUD_IMAGE_SLOT_INVALID', message: 'Slot ảnh HUD không hợp lệ.' });
    try {
      const result = hudStore.upload(slot.data, req.body, req.headers['content-type']);
      pushHudSnapshots();
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof HudConfigError)
        return reply.code(error.statusCode).send({ ok: false, code: error.code, message: error.message });
      throw error;
    }
  });

  app.post('/api/hud/reset', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const config = hudStore.reset();
    pushHudSnapshots();
    return config;
  });

  app.get<{ Params: { id: string } }>('/hud-assets/:id', async (req, reply) => {
    const image = hudStore.getImage(req.params.id);
    if (!image) return reply.code(404).send({ ok: false, code: 'HUD_IMAGE_NOT_FOUND', message: 'Không tìm thấy ảnh HUD.' });
    return reply
      .type(image.mimeType)
      .header('cache-control', 'public, max-age=31536000, immutable')
      .header('x-content-type-options', 'nosniff')
      .send(image.bytes);
  });

  app.get('/api/preflight', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    return makePreflight();
  });

  app.get('/api/mc-voice/settings', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    try {
      return await voiceSettingsSnapshot();
    } catch {
      return reply.code(503).send({ ok: false, code: 'MC_VOICE_SETTINGS_UNAVAILABLE', message: 'Không đọc được cài đặt MC Voice.' });
    }
  });

  app.put('/api/mc-voice/settings', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const parsed = McVoiceSettingsUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    const update = parsed.data;
    const hasPrimary = Object.prototype.hasOwnProperty.call(update, 'primaryOverlayInstanceId');
    if (hasPrimary && primaryOverlayInstanceId !== null && update.primaryOverlayInstanceId !== primaryOverlayInstanceId &&
      update.confirmPrimaryOverlayChange !== true) {
      return reply.code(409).send({ ok: false, code: 'MC_VOICE_PRIMARY_CONFIRMATION_REQUIRED', message: 'Xác nhận đổi overlay phát tiếng trước khi tiếp tục.' });
    }
    if (update.token !== undefined || update.clearToken === true) {
      try {
        if (update.clearToken) await voiceCredentials.clear();
        else await voiceCredentials.set(update.token!);
      } catch {
        return reply.code(503).send({ ok: false, code: 'MC_VOICE_CREDENTIAL_STORE_UNAVAILABLE', message: 'Kho bảo mật MC Voice chưa sẵn sàng.' });
      }
    }
    if (hasPrimary) primaryOverlayInstanceId = update.primaryOverlayInstanceId ?? null;
    try {
      return await voiceSettingsSnapshot();
    } catch {
      return reply.code(503).send({ ok: false, code: 'MC_VOICE_SETTINGS_UNAVAILABLE', message: 'Không đọc được cài đặt MC Voice.' });
    }
  });

  app.post('/api/mc-voice/test', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const parsed = McVoiceTestRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    if (!voiceService || !voiceProfile)
      return reply.code(503).send({ ok: false, code: 'MC_VOICE_NOT_READY', message: 'MC Voice chưa được cấu hình ở server.' });
    const text = parsed.data.text;
    try {
      const result = await voiceService.getOrCreate(
        {
          text,
          provider: 'clipai',
          model: voiceProfile.model,
          voiceSettings: voiceProfile.voiceSettings,
          rate: voiceProfile.rate,
          format: 'mp3',
        },
        { text, voiceKey: voiceProfile.voiceKey, rate: voiceProfile.rate, format: 'mp3' },
      );
      return {
        ok: true,
        assetId: result.asset.assetId,
        durationMs: result.asset.durationMs,
        cacheHit: result.cacheHit,
      };
    } catch (error) {
      const safe = error instanceof McVoiceProviderError ? error : new McVoiceProviderError('FAILED', 'MC Voice không hoàn tất.');
      return reply.code(safe.code === 'TOO_LONG' ? 422 : 503).send({
        ok: false,
        code: `MC_VOICE_${safe.code}`,
        message: safe.message,
      });
    }
  });

  app.post('/api/mc-voice/pre-generate', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const parsed = McVoicePreGenerateRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    if (!voiceService || !voiceProfile || !voicePreGenerate)
      return reply.code(503).send({ ok: false, code: 'MC_VOICE_NOT_READY', message: 'MC Voice chưa được cấu hình ở server.' });
    const packId = rt?.config.packId ?? 'demo';
    const requested = new Set(parsed.data.questionIds);
    const questions = store.listQuestions(packId).filter((question) => requested.has(question.id));
    if (questions.length !== requested.size || questions.some((question) => question.approvalStatus !== 'APPROVED'))
      return reply.code(400).send({ ok: false, code: 'MC_VOICE_QUESTION_NOT_APPROVED', message: 'Chỉ có thể tạo audio cho câu đã được duyệt trong bộ câu hiện hành.' });

    const makeLine = (lineId: string, text: string) => ({
      lineId,
      descriptor: {
        text,
        provider: 'clipai' as const,
        model: voiceProfile.model,
        voiceSettings: voiceProfile.voiceSettings,
        rate: voiceProfile.rate,
        format: 'mp3' as const,
      },
      request: { text, voiceKey: voiceProfile.voiceKey, rate: voiceProfile.rate, format: 'mp3' as const },
    });
    const items = questions.map((question) => ({
      lines: [
        makeLine('prompt', question.prompt),
        ...question.options.map((option, index) => makeLine(`option-${index + 1}`, option.text)),
      ],
    }));
    return reply.code(202).send(voicePreGenerate.start(items));
  });

  app.get<{ Params: { jobId: string } }>('/api/mc-voice/pre-generate/:jobId', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    const progress = voicePreGenerate?.get(req.params.jobId);
    if (!progress) return reply.code(404).send({ ok: false, code: 'MC_VOICE_JOB_NOT_FOUND', message: 'Không tìm thấy tiến độ tạo audio.' });
    return progress;
  });

  app.get<{ Params: { assetId: string } }>('/api/mc-voice/assets/:assetId', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    const asset = await voiceCache.get(req.params.assetId);
    if (!asset) return reply.code(404).send({ ok: false, code: 'MC_VOICE_ASSET_NOT_FOUND', message: 'Không tìm thấy audio MC Voice.' });
    return reply.type('audio/mpeg').header('cache-control', 'private, no-store').send(asset.bytes);
  });

  app.get('/api/sessions/current', async () => ({
    sessionId: rt && rt.engine.sessionStatus === 'OPEN' ? rt.id : null,
  }));

  app.post('/api/sessions', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const parsed = CreateSessionRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    if (rt && rt.engine.sessionStatus === 'OPEN')
      return reply.code(409).send({
        ok: false,
        code: 'SESSION_ALREADY_OPEN',
        message: 'Đang có phiên mở — dừng phiên đó trước khi tạo phiên mới',
        sessionId: rt.id,
      });
    const runtime = await SessionRuntime.create(
      {
        store,
        scheduler,
        characterPool: opts.characterPool,
        adapter: adapterFactory(parsed.data.config.mode, parsed.data.config),
        preflight: (session) => makePreflight(session),
        warn: (message) => console.warn(message),
      },
      parsed.data,
    );
    attachRuntime(runtime);
    return reply.code(201).send({ sessionId: runtime.id, snapshot: runtime.adminSnapshot() });
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id/state', async (req, reply) => {
    const s = sessionOr404(req.params.id, reply);
    if (!s) return reply;
    if (req.headers.authorization !== undefined) {
      if (!guard(req, reply, false)) return reply;
      return s.adminSnapshot();
    }
    return s.publicSnapshot();
  });

  app.post<{ Params: { id: string } }>('/api/sessions/:id/commands', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const s = sessionOr404(req.params.id, reply);
    if (!s) return reply;
    const out = s.dispatch(req.body);
    return reply.code(out.status).send(out.result);
  });

  app.post<{ Params: { id: string } }>('/api/sessions/:id/simulator', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const s = sessionOr404(req.params.id, reply);
    if (!s) return reply;
    const parsed = SimulatorRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    return mockOnly(reply, () => s.simulatorControl(parsed.data));
  });

  app.post<{ Params: { id: string } }>('/api/sessions/:id/connection', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const s = sessionOr404(req.params.id, reply);
    if (!s) return reply;
    const parsed = MockConnectionSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    return mockOnly(reply, () => s.mockConnection(parsed.data.action));
  });

  app.post<{ Params: { id: string } }>('/api/sessions/:id/comments', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const s = sessionOr404(req.params.id, reply);
    if (!s) return reply;
    const parsed = MockCommentSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    return mockOnly(reply, () => s.mockComment(parsed.data));
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id/history', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    if (!store.getSession(req.params.id))
      return reply.code(404).send({ ok: false, code: 'NOT_FOUND', message: 'Không có phiên' });
    return store.history(req.params.id);
  });

  app.get('/api/questions', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    const packId = rt?.config.packId ?? 'demo';
    return store.listQuestions(packId).map((question) => ({
      ...question,
      warnings: questionLengthWarnings(question),
    }));
  });

  /** Người dùng duyệt / từ chối câu hỏi (BOARD #13). Câu đã dùng trong vòng giữ snapshot cũ — không đổi kết quả cũ. */
  app.post<{ Params: { id: string } }>('/api/questions/:id/approve', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const parsed = QuestionReviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    const q = store.reviewQuestion(req.params.id, parsed.data.decision, parsed.data.operatorId, Math.floor(scheduler.now()));
    if (!q) return reply.code(404).send({ ok: false, code: 'NOT_FOUND', message: 'Không có câu hỏi' });
    return { ok: true, question: q, warnings: questionLengthWarnings(q) };
  });

  app.get('/api/diagnostics', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    const snap = rt?.adminSnapshot() ?? null;
    return {
      metrics: snap?.metrics ?? null,
      recentRejections: snap?.recentRejections ?? [],
      db: { path: store.path, walMode: String(store.raw.pragma('journal_mode', { simple: true })) },
      uptimeMs: Math.round(scheduler.now() - startedAtMs),
    };
  });

  // --- Connection Manager & kiểm tra hệ thống (V3.1 mục C, E) --------------------

  const SourceControlSchema = z.object({ action: z.enum(['CONNECT', 'DISCONNECT', 'RECONNECT']) });
  app.post<{ Params: { id: string } }>('/api/sessions/:id/source', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const s = sessionOr404(req.params.id, reply);
    if (!s) return reply;
    const parsed = SourceControlSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    return s.sourceControl(parsed.data.action);
  });

  /** Tự kiểm pipeline trên DB tạm trong bộ nhớ (không đụng phiên LIVE): mock comment → engine chấm điểm. */
  app.post('/api/system/selftest', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    lastSelfTest = await runPipelineSelfTest();
    return lastSelfTest;
  });

  app.get('/api/system/checks', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    const now = scheduler.now();
    const check = (id: SystemCheck['id'], label: string, status: SystemCheck['status'], detail: string): SystemCheck => ({
      id,
      label,
      status,
      detail,
      checkedAtMs: now,
    });
    let dbOk = false;
    let dbErr = '';
    try {
      dbOk = store.probeWrite(Math.floor(now));
    } catch (err) {
      dbErr = err instanceof Error ? err.message : String(err);
    }
    const live = rt?.liveHealth() ?? null;
    const st = rt?.engine.stateVersion ?? null;
    const isTiktok = rt?.config.mode === 'TIKTOK';
    const overlaySummary = summarizeOverlaySessions(overlaySessions);
    const programAudio = overlayAudioPreflight(overlaySummary.programAudioState);
    const iso = (ms: number) => new Date(ms).toISOString();
    const checks: SystemCheck[] = [
      check('backend', 'Backend hoạt động', 'PASS', `uptime ${Math.round((now - startedAtMs) / 1000)} s`),
      check(
        'database',
        'Database hoạt động',
        dbOk ? 'PASS' : 'FAIL',
        dbOk ? `ghi/đọc thử OK — ${store.path}` : `ghi/đọc thử lỗi ${dbErr}`,
      ),
      check('theme', 'Theme Pack tải thành công', 'NOT_TESTED', 'Theme Pack chưa triển khai (V3 P3) — đang dùng giao diện mặc định'),
      overlayClients.size > 0
        ? check(
            'overlay',
            'Overlay hiển thị',
            programAudio.status === 'WARN' && overlaySummary.programAudioState !== null ? 'WARN' : 'PASS',
            programAudio.status === 'WARN' && overlaySummary.programAudioState !== null
              ? programAudio.reason
              : `${overlayClients.size} overlay đang kết nối (không khẳng định OBS/LIVE Studio đang phát)${overlaySummary.programAudioState ? `; audioState=${overlaySummary.programAudioState}` : ''}`,
          )
        : check('overlay', 'Overlay hiển thị', 'FAIL', 'Chưa có overlay nào kết nối — mở Overlay URL trong OBS / trình duyệt'),
      lastSelfTest
        ? check('mockComment', 'Mock Comment hoạt động', lastSelfTest.mockComment ? 'PASS' : 'FAIL', lastSelfTest.detail)
        : check('mockComment', 'Mock Comment hoạt động', 'NOT_TESTED', 'Bấm "Chạy tự kiểm"'),
      isTiktok && live?.status === 'CONNECTED'
        ? check('tiktokConnector', 'TikTok Connector kết nối', 'PASS', `kết nối từ ${iso(live.connectedSinceMs ?? now)}`)
        : check(
            'tiktokConnector',
            'TikTok Connector kết nối',
            isTiktok ? 'FAIL' : 'NOT_TESTED',
            isTiktok
              ? (live?.detail ?? `trạng thái ${live?.status ?? '—'}`)
              : 'Phiên hiện tại là MOCK — tạo phiên TIKTOK (username tài khoản đang LIVE) để kiểm tra; kết nối dùng thư viện cộng đồng, KHÔNG CHÍNH THỨC',
          ),
      isTiktok && live?.lastCommentAtMs
        ? check('testComment', 'Nhận được comment thử nghiệm', 'PASS', `comment gần nhất ${iso(live.lastCommentAtMs)}, tổng ${live.commentsReceived}`)
        : check(
            'testComment',
            'Nhận được comment thử nghiệm',
            'NOT_TESTED',
            isTiktok ? 'Chưa nhận comment nào từ TikTok' : 'Chỉ áp dụng khi có kết nối TikTok',
          ),
      lastSelfTest
        ? check('engineRecorded', 'Quiz Engine ghi nhận câu trả lời', lastSelfTest.engineRecorded ? 'PASS' : 'FAIL', lastSelfTest.detail)
        : check('engineRecorded', 'Quiz Engine ghi nhận câu trả lời', 'NOT_TESTED', 'Bấm "Chạy tự kiểm"'),
      st === null || overlayClients.size === 0
        ? check('overlayUpdated', 'Overlay cập nhật đúng', 'NOT_TESTED', st === null ? 'Chưa có phiên' : 'Chưa có overlay kết nối')
        : lastAck && lastAck.stateVersion >= st
          ? check('overlayUpdated', 'Overlay cập nhật đúng', 'PASS', `overlay đã hiển thị v${lastAck.stateVersion} (server v${st})`)
          : check(
              'overlayUpdated',
              'Overlay cập nhật đúng',
              'FAIL',
              `overlay báo v${lastAck?.stateVersion ?? '—'}, server v${st} — overlay cần gửi ACK sau khi render`,
            ),
    ];
    return { checks, live, overlay: { clients: overlayClients.size, lastAck, audioState: overlaySummary.programAudioState } };
  });

  // --- WebSocket ----------------------------------------------------------------

  app.get('/ws', { websocket: true }, (socket, req) => {
    let role: 'overlay' | 'admin' | null = null;
    // Không HELLO trong 5 s → đóng
    const helloTimer = setTimeout(() => {
      if (!role) socket.close(4400, 'HELLO timeout');
    }, 5_000);
    socket.on('message', (data) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(data));
      } catch {
        socket.close(4400, 'JSON không hợp lệ');
        return;
      }
      if (role) {
        // Sau HELLO chỉ nhận ACK từ overlay (Connection Test bước 9); mọi thứ khác bị bỏ qua.
        const ack = role === 'overlay' ? ClientAckSchema.safeParse(msg) : null;
        if (ack?.success) {
          const atMs = scheduler.now();
          const programClientsBefore = summarizeOverlaySessions(overlaySessions).programClients;
          const accepted = recordOverlayAck(overlaySessions, socket, ack.data, atMs);
          const overlaySummary = summarizeOverlaySessions(overlaySessions);
          if (
            accepted
            && programClientsBefore === 0
            && overlaySummary.programClients > 0
            && overlaySummary.programAckStateVersion !== null
            && overlaySummary.programAckStateVersion < (rt?.engine.stateVersion ?? 0)
          ) ackPendingSinceMs = atMs;
          if (accepted && (!lastAck || ack.data.stateVersion >= lastAck.stateVersion)) {
            lastAck = { stateVersion: ack.data.stateVersion, atMs };
            pushOverlayInfo();
          }
        }
        return;
      }
      const hello = ClientHelloSchema.safeParse(msg);
      if (!hello.success) {
        socket.close(4400, 'Cần HELLO');
        return;
      }
      clearTimeout(helloTimer);
      if (hello.data.role === 'admin') {
        if (!originOk(req) || !hello.data.token || !safeEqual(hello.data.token, opts.adminToken)) {
          socket.close(4401, 'Sai mã quản trị');
          return;
        }
        role = 'admin';
        adminClients.add(socket);
        if (rt) {
          const publicSnapshot = withHudVersion(rt.publicSnapshot());
          socket.send(JSON.stringify(rt.wrap('ADMIN_SNAPSHOT', { ...rt.adminSnapshot(), public: publicSnapshot })));
        }
      } else {
        role = 'overlay';
        if (overlayClients.size === 0) ackPendingSinceMs = scheduler.now();
        overlayClients.add(socket);
        registerOverlaySession(overlaySessions, socket);
        pushOverlayInfo();
        if (rt) socket.send(JSON.stringify(rt.wrap('STATE_SNAPSHOT', withHudVersion(rt.publicSnapshot()))));
      }
    });
    socket.on('close', () => {
      clearTimeout(helloTimer);
      overlayClients.delete(socket);
      removeOverlaySession(overlaySessions, socket);
      adminClients.delete(socket);
      pushOverlayInfo();
    });
  });

  return {
    app,
    runtime: () => rt,
    async recover() {
      const row = store.latestOpenSession();
      if (!row) return null;
      const r = await SessionRuntime.recover(
        {
          store,
          scheduler,
          characterPool: opts.characterPool,
          adapter: adapterFactory(row.mode === 'TIKTOK' ? 'TIKTOK' : 'MOCK', row.config),
          preflight: (session) => makePreflight(session),
          warn: (message) => console.warn(message),
        },
        row,
      );
      attachRuntime(r);
      return r;
    },
    async close() {
      unsub?.();
      rt?.dispose();
      rt = null;
      for (const ws of [...overlayClients, ...adminClients]) ws.terminate();
      await app.close();
    },
  };
}
