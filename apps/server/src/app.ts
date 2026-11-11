import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { z } from 'zod';
import {
  CONTRACT_VERSION,
  ClientHelloSchema,
  CreateSessionRequestSchema,
  SimulatorRequestSchema,
} from '@quiz/contracts';
import { MockAdapter, TikTokAdapterBlocked, type LiveAdapter, type Scheduler } from '@quiz/live-adapters';
import type { Store } from '@quiz/persistence';
import { ModeError, SessionRuntime, type Outgoing } from './runtime';

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
  adapterFactory?: (mode: 'MOCK' | 'TIKTOK') => LiveAdapter;
  logger?: boolean;
  startedAtMs?: number;
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
  const adapterFactory =
    opts.adapterFactory ?? ((mode) => (mode === 'MOCK' ? new MockAdapter() : new TikTokAdapterBlocked()));
  const startedAtMs = opts.startedAtMs ?? scheduler.now();

  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 256 * 1024 });
  await app.register(websocket, { options: { maxPayload: 16 * 1024 } });

  let rt: SessionRuntime | null = null;
  const overlayClients = new Set<WebSocket>();
  const adminClients = new Set<WebSocket>();
  let unsub: (() => void) | null = null;

  function attachRuntime(next: SessionRuntime) {
    unsub?.();
    rt?.dispose();
    rt = next;
    unsub = next.subscribe((batch: Outgoing[]) => {
      for (const o of batch) {
        const data = JSON.stringify(o.message);
        for (const ws of o.audience === 'public' ? overlayClients : adminClients) if (ws.readyState === 1) ws.send(data);
      }
    });
  }

  const isAdmin = (req: FastifyRequest) => {
    const h = req.headers.authorization;
    return typeof h === 'string' && h.startsWith('Bearer ') && safeEqual(h.slice(7).trim(), opts.adminToken);
  };
  const originOk = (req: FastifyRequest) => {
    const o = req.headers.origin;
    return o === undefined || allowed.has(o);
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

  app.get('/health', async () => ({ ok: true, contractVersion: CONTRACT_VERSION, sessionId: rt?.id ?? null }));

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
    if (parsed.data.config.mode !== 'MOCK')
      return reply.code(422).send({
        ok: false,
        code: 'NOT_ALLOWED_IN_MODE',
        message: 'LIVE_CONNECTOR_BLOCKED: kết nối TikTok chưa qua cổng khả thi (Phase 4) — chỉ chạy được MOCK',
      });
    const runtime = await SessionRuntime.create(
      { store, scheduler, adapter: adapterFactory(parsed.data.config.mode) },
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

  // --- WebSocket ----------------------------------------------------------------

  app.get('/ws', { websocket: true }, (socket, req) => {
    let role: 'overlay' | 'admin' | null = null;
    // Không HELLO trong 5 s → đóng
    const helloTimer = setTimeout(() => {
      if (!role) socket.close(4400, 'HELLO timeout');
    }, 5_000);
    socket.on('message', (data) => {
      if (role) return; // sau HELLO, client không gửi gì khác ở Phase 1
      let msg: unknown;
      try {
        msg = JSON.parse(String(data));
      } catch {
        socket.close(4400, 'JSON không hợp lệ');
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
        if (rt) socket.send(JSON.stringify(rt.wrap('STATE_SNAPSHOT', rt.publicSnapshot())));
      }
    });
    socket.on('close', () => {
      clearTimeout(helloTimer);
      overlayClients.delete(socket);
      adminClients.delete(socket);
    });
  });

  return {
    app,
    runtime: () => rt,
    async recover() {
      const row = store.latestOpenSession();
      if (!row) return null;
      const r = await SessionRuntime.recover(
        { store, scheduler, adapter: adapterFactory(row.mode === 'TIKTOK' ? 'TIKTOK' : 'MOCK') },
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
