import { randomBytes, timingSafeEqual } from 'node:crypto';
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
  McVoicePreGenerateRequestSchema,
  McVoicePlaybackCompletionSchema,
  McVoiceSettingsUpdateSchema,
  McVoiceTestRequestSchema,
  MAX_MC_READING_MS,
  QuestionReviewSchema,
  SimulatorRequestSchema,
  type WsPayloads,
} from '@quiz/contracts';
import { MockAdapter, TikTokLiveAdapter, type LiveAdapter, type Scheduler } from '@quiz/live-adapters';
import type { Store } from '@quiz/persistence';
import type { SessionConfig, SystemCheck } from '@quiz/contracts';
import { ModeError, SessionRuntime, type Outgoing } from './runtime';
import { runPipelineSelfTest, type SelfTestResult } from './selftest';
import { serveAssets, serveSpa } from './static';
import { McVoiceCache, mcVoiceCacheKey } from './voice/cache';
import { McVoicePreGenerateManager } from './voice/pre-generate';
import { McVoiceProviderError, type McVoiceCredentialStore, type McVoiceProfile, EnvironmentMcVoiceCredentialStore } from './voice/types';
import { McVoiceService } from './voice/service';
import { McVoiceLeaseManager } from './voice/lease';

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
  /** Thư mục bản build (vite build) để phục vụ cùng origin: /dashboard/ và /overlay/ (bộ cài Windows, OBS). */
  webRoots?: { dashboard?: string; overlay?: string; assets?: string };
  /** Kho nhân vật mặc định cho mọi phiên (từ manifest asset cục bộ). */
  characterPool?: readonly string[];
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
  const voiceCredentials = opts.mcVoice?.credentials ?? new EnvironmentMcVoiceCredentialStore();
  const voiceService = opts.mcVoice?.service ?? null;
  const voiceProfile = opts.mcVoice?.profile ?? null;
  const voiceCache = opts.mcVoice?.cache ?? new McVoiceCache(join(dirname(store.path), 'mc-voice-cache'));
  const voicePreGenerate = opts.mcVoice?.preGenerate ?? (voiceService ? new McVoicePreGenerateManager(voiceService, () => scheduler.now()) : null);

  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 256 * 1024 });
  await app.register(websocket, { options: { maxPayload: 16 * 1024 } });

  let rt: SessionRuntime | null = null;
  const overlayClients = new Set<WebSocket>();
  const adminClients = new Set<WebSocket>();
  let unsub: (() => void) | null = null;
  let lastAck: { stateVersion: number; atMs: number } | null = null;
  let lastSelfTest: SelfTestResult | null = null;
  let voiceWsSeq = 0;
  const voiceSockets = new Map<WebSocket, string>();
  const handledVoiceReadings = new Set<string>();
  const voiceLeases = new McVoiceLeaseManager(scheduler, {
    onExpired: (overlayInstanceId) => {
      const current = rt;
      const snapshot = current?.publicSnapshot();
      const questionInstanceId = snapshot?.state === 'READING' ? snapshot.question?.questionInstanceId : null;
      if (current && questionInstanceId && voiceLeases.primaryOverlayInstanceId === overlayInstanceId)
        current.completeMcReading(current.engine.stateVersion, questionInstanceId, 'NO_OWNER');
    },
  });

  function sendVoiceMessage<T extends 'MC_VOICE_LEASE' | 'MC_VOICE_PLAY'>(
    socket: WebSocket,
    type: T,
    payload: WsPayloads[T],
  ) {
    if (socket.readyState !== 1) return;
    const message = rt?.wrap(type, payload) ?? {
      v: CONTRACT_VERSION,
      type,
      seq: ++voiceWsSeq,
      sessionId: '',
      stateVersion: 0,
      serverTimeMs: scheduler.now(),
      payload,
    };
    socket.send(JSON.stringify(message));
  }

  function sendLeaseState(socket: WebSocket, overlayInstanceId: string, revoked = false) {
    const leaseToken = revoked ? null : voiceLeases.leaseTokenFor(overlayInstanceId);
    const status = revoked ? 'REVOKED' : voiceLeases.statusFor(overlayInstanceId);
    sendVoiceMessage(socket, 'MC_VOICE_LEASE', {
      status,
      overlayInstanceId,
      ...(leaseToken ? { leaseToken } : {}),
    });
  }

  function notifyLeaseFor(overlayInstanceId: string, revoked = false) {
    for (const [socket, id] of voiceSockets) if (id === overlayInstanceId) sendLeaseState(socket, id, revoked);
  }

  function voiceReadingKey(snapshot: ReturnType<SessionRuntime['publicSnapshot']>) {
    const questionInstanceId = snapshot.question?.questionInstanceId;
    return questionInstanceId ? `${snapshot.sessionId}:${snapshot.stateVersion}:${questionInstanceId}` : null;
  }

  async function publishVoiceReading(current: SessionRuntime, snapshot = current.publicSnapshot(), reconnect = false) {
    if (snapshot.state !== 'READING' || !snapshot.question) return;
    const key = voiceReadingKey(snapshot);
    const questionInstanceId = snapshot.question.questionInstanceId;
    if (!key || (handledVoiceReadings.has(key) && !reconnect)) return;

    const fallback = (reason: 'NO_AUDIO' | 'NO_OWNER') => {
      handledVoiceReadings.add(key);
      current.completeMcReading(snapshot.stateVersion, questionInstanceId, reason);
    };

    const ownerId = voiceLeases.primaryOverlayInstanceId;
    if (!ownerId) {
      fallback('NO_OWNER');
      return;
    }
    if (!voiceLeases.isConnected(ownerId)) {
      if (voiceLeases.isReconnectPending(ownerId)) return;
      fallback('NO_OWNER');
      return;
    }
    if (!voiceService || !voiceProfile || !snapshot.timer?.running) {
      fallback('NO_AUDIO');
      return;
    }

    const deadlineAtMs = scheduler.now() + snapshot.timer.remainingMs;
    const lines = [
      { lineId: 'prompt' as const, text: snapshot.question.prompt },
      ...snapshot.question.options.map((option) => ({ lineId: `option-${option.id}` as const, text: option.text })),
    ];
    let assets;
    try {
      assets = await Promise.all(lines.map(({ text }) => {
        const descriptor = {
          text,
          provider: 'clipai' as const,
          model: voiceProfile.model,
          voiceKey: voiceProfile.voiceKey,
          voiceSettings: voiceProfile.voiceSettings,
          rate: voiceProfile.rate,
          format: 'mp3' as const,
        };
        return voiceCache.get(mcVoiceCacheKey(descriptor));
      }));
    } catch {
      fallback('NO_AUDIO');
      return;
    }

    const latest = current.publicSnapshot();
    if (latest.state !== 'READING' || latest.stateVersion !== snapshot.stateVersion ||
      latest.question?.questionInstanceId !== questionInstanceId) return;
    if (!assets.every((asset) => asset !== null)) {
      fallback('NO_AUDIO');
      return;
    }
    const totalDurationMs = assets.reduce((total, asset) => total + asset!.durationMs, 0);
    if (totalDurationMs <= 0 || totalDurationMs > MAX_MC_READING_MS) {
      fallback('NO_AUDIO');
      return;
    }
    if (!voiceLeases.isConnected(ownerId)) {
      if (voiceLeases.isReconnectPending(ownerId)) return;
      fallback('NO_OWNER');
      return;
    }
    const targets = [...voiceSockets].filter(([socket, id]) => id === ownerId && socket.readyState === 1);
    if (targets.length === 0) {
      fallback('NO_OWNER');
      return;
    }
    handledVoiceReadings.add(key);
    const payload = {
      questionInstanceId,
      lines: lines.map((line, index) => ({
        ...line,
        assetId: assets[index]!.assetId,
        durationMs: assets[index]!.durationMs,
      })),
      totalDurationMs,
      deadlineAtMs,
    };
    for (const [socket] of targets) sendVoiceMessage(socket, 'MC_VOICE_PLAY', payload);
  }

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
    pushOverlayInfo();
    unsub = next.subscribe((batch: Outgoing[]) => {
      for (const o of batch) {
        if (o.audience === 'public' && o.message.type === 'STATE_SNAPSHOT' && o.message.payload.state === 'READING')
          void publishVoiceReading(next, o.message.payload);
        const data = JSON.stringify(o.message);
        for (const ws of o.audience === 'public' ? overlayClients : adminClients) if (ws.readyState === 1) ws.send(data);
      }
    });
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

  async function voiceSettingsSnapshot() {
    const token = await voiceCredentials.get();
    return {
      provider: 'CLIPAI' as const,
      voiceName: 'Kelly' as const,
      hasToken: token !== null,
      ready: token !== null && voiceService !== null && voiceProfile !== null,
      primaryOverlayInstanceId: voiceLeases.primaryOverlayInstanceId,
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

  app.get('/api/mc-voice/settings', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    try {
      return await voiceSettingsSnapshot();
    } catch {
      return reply.code(503).send({ ok: false, code: 'MC_VOICE_SETTINGS_UNAVAILABLE', message: 'Không đọc được cài đặt MC Voice.' });
    }
  });

  app.get('/api/mc-voice/overlays', async (req, reply) => {
    if (!guard(req, reply, false)) return reply;
    return {
      primaryOverlayInstanceId: voiceLeases.primaryOverlayInstanceId,
      activeOverlayInstanceIds: voiceLeases.activeOverlayInstanceIds,
    };
  });

  app.put('/api/mc-voice/settings', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const parsed = McVoiceSettingsUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    const update = parsed.data;
    const hasPrimary = Object.prototype.hasOwnProperty.call(update, 'primaryOverlayInstanceId');
    const previousPrimary = voiceLeases.primaryOverlayInstanceId;
    if (hasPrimary && previousPrimary !== null && update.primaryOverlayInstanceId !== previousPrimary &&
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
    if (hasPrimary) {
      const changed = voiceLeases.setPrimary(update.primaryOverlayInstanceId ?? null, update.confirmPrimaryOverlayChange === true);
      if (changed.previous) notifyLeaseFor(changed.previous, true);
      if (changed.current) notifyLeaseFor(changed.current);
      if (rt && changed.current && rt.publicSnapshot().state === 'READING')
        void publishVoiceReading(rt, rt.publicSnapshot(), true);
    }
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
          voiceKey: voiceProfile.voiceKey,
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
        voiceKey: voiceProfile.voiceKey,
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

  function hasVoiceLease(req: FastifyRequest) {
    const leaseToken = req.headers['x-mc-voice-lease'];
    return originOk(req) && typeof leaseToken === 'string' && voiceLeases.authorize(leaseToken);
  }

  app.post('/api/mc-voice/playback/complete', async (req, reply) => {
    if (!hasVoiceLease(req)) return reply.code(401).send({ ok: false, code: 'MC_VOICE_LEASE_REQUIRED', message: 'Overlay không giữ lease phát MC Voice.' });
    const parsed = McVoicePlaybackCompletionSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    if (!rt) return reply.code(404).send({ ok: false, code: 'MC_VOICE_SESSION_NOT_FOUND', message: 'Không có phiên MC Voice đang mở.' });
    const completion = parsed.data;
    const result = rt.completeMcReading(
      completion.expectedStateVersion,
      completion.questionInstanceId,
      completion.result === 'FALLBACK' ? completion.fallbackReason : undefined,
    );
    if (!result.ok)
      return reply.code(409).send({ ok: false, code: result.code, stateVersion: result.stateVersion, message: result.message });
    return { ok: true, state: result.state, stateVersion: result.stateVersion };
  });

  app.get<{ Params: { assetId: string } }>('/api/mc-voice/assets/:assetId', async (req, reply) => {
    if (!isAdmin(req) && !hasVoiceLease(req))
      return reply.code(401).send({ ok: false, code: 'UNAUTHORIZED', message: 'Cần admin hoặc lease MC Voice hợp lệ.' });
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
      { store, scheduler, characterPool: opts.characterPool, adapter: adapterFactory(parsed.data.config.mode, parsed.data.config) },
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
    return store.listQuestions(packId);
  });

  /** Người dùng duyệt / từ chối câu hỏi (BOARD #13). Câu đã dùng trong vòng giữ snapshot cũ — không đổi kết quả cũ. */
  app.post<{ Params: { id: string } }>('/api/questions/:id/approve', async (req, reply) => {
    if (!guard(req, reply, true)) return reply;
    const parsed = QuestionReviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(reply, parsed.error);
    const q = store.reviewQuestion(req.params.id, parsed.data.decision, parsed.data.operatorId, Math.floor(scheduler.now()));
    if (!q) return reply.code(404).send({ ok: false, code: 'NOT_FOUND', message: 'Không có câu hỏi' });
    return { ok: true, question: q };
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
        ? check('overlay', 'Overlay hiển thị', 'PASS', `${overlayClients.size} overlay đang kết nối (không khẳng định OBS/LIVE Studio đang phát)`)
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
    return { checks, live, overlay: { clients: overlayClients.size, lastAck } };
  });

  // --- WebSocket ----------------------------------------------------------------

  app.get('/ws', { websocket: true }, (socket, req) => {
    let role: 'overlay' | 'admin' | null = null;
    let overlayInstanceId: string | null = null;
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
        if (ack?.success && (!lastAck || ack.data.stateVersion >= lastAck.stateVersion)) {
          lastAck = { stateVersion: ack.data.stateVersion, atMs: scheduler.now() };
          pushOverlayInfo();
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
        if (rt) socket.send(JSON.stringify(rt.wrap('ADMIN_SNAPSHOT', rt.adminSnapshot())));
      } else {
        role = 'overlay';
        overlayClients.add(socket);
        if (hello.data.overlayInstanceId) {
          overlayInstanceId = hello.data.overlayInstanceId;
          voiceSockets.set(socket, overlayInstanceId);
          voiceLeases.connect(overlayInstanceId);
        }
        pushOverlayInfo();
        if (rt) socket.send(JSON.stringify(rt.wrap('STATE_SNAPSHOT', rt.publicSnapshot())));
        if (overlayInstanceId) {
          sendLeaseState(socket, overlayInstanceId);
          if (rt && overlayInstanceId === voiceLeases.primaryOverlayInstanceId)
            void publishVoiceReading(rt, rt.publicSnapshot(), true);
        }
      }
    });
    socket.on('close', () => {
      clearTimeout(helloTimer);
      overlayClients.delete(socket);
      adminClients.delete(socket);
      if (overlayInstanceId) {
        voiceSockets.delete(socket);
        voiceLeases.disconnect(overlayInstanceId);
        notifyLeaseFor(overlayInstanceId);
      }
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
        { store, scheduler, characterPool: opts.characterPool, adapter: adapterFactory(row.mode === 'TIKTOK' ? 'TIKTOK' : 'MOCK', row.config) },
        row,
      );
      attachRuntime(r);
      return r;
    },
    async close() {
      unsub?.();
      rt?.dispose();
      rt = null;
      voiceLeases.dispose();
      for (const ws of [...overlayClients, ...adminClients]) ws.terminate();
      await app.close();
    },
  };
}
