import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommandBody, ConnectionStatus, LiveSource, RawComment, SessionConfig } from '@quiz/contracts';
import { ManualScheduler, MockAdapter, type LiveAdapter } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import { AUTH, makeQuestions, tempDbPath, TOKEN } from './helpers';

class ReadyTikTokAdapter implements LiveAdapter {
  readonly source: LiveSource = 'TIKTOK';
  private connection: ConnectionStatus = 'DISCONNECTED';
  private readonly commentListeners = new Set<(comment: RawComment) => void>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();

  async connect() { this.setStatus('CONNECTED'); }
  async disconnect() { this.setStatus('DISCONNECTED'); }
  status() { return this.connection; }
  onComment(callback: (comment: RawComment) => void) { this.commentListeners.add(callback); return () => this.commentListeners.delete(callback); }
  onStatus(callback: (status: ConnectionStatus) => void) { this.statusListeners.add(callback); return () => this.statusListeners.delete(callback); }
  async healthCheck() { return { ok: this.connection === 'CONNECTED', detail: this.connection }; }
  private setStatus(status: ConnectionStatus) { this.connection = status; for (const listener of this.statusListeners) listener(status); }
}

class BlockedTikTokAdapter extends ReadyTikTokAdapter {
  override async connect() { throw new Error('Cổng TikTok chưa kết nối.'); }
  override status(): ConnectionStatus { return 'BLOCKED'; }
}

type Harness = { quiz: QuizApp; store: Store; tempRoot: string; scheduler: ManualScheduler; port: number; sockets: WebSocket[] };
const opened: Harness[] = [];

async function createWebRoots(root: string, completeAssets = true, staleBuilds = false) {
  const assets = join(root, 'assets');
  const dashboard = join(root, 'dashboard-dist');
  const overlay = join(root, 'overlay-dist');
  await Promise.all([mkdir(dashboard, { recursive: true }), mkdir(overlay, { recursive: true })]);
  const buildHash = staleBuilds
    ? 'invalid-build-hash'
    : execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim();
  await Promise.all([
    writeFile(join(dashboard, '.build-commit'), `${buildHash}\n`),
    writeFile(join(overlay, '.build-commit'), `${buildHash}\n`),
  ]);
  if (completeAssets) {
    for (const relative of ['brand/logo.png', 'victory/trophy-stage.png', 'victory/bg.jpg', 'chibi/test.png', 'mc/kelly.png']) {
      const path = join(assets, relative);
      await mkdir(join(path, '..'), { recursive: true });
      await writeFile(path, 'test-placeholder');
    }
  }
  return { assets, dashboard, overlay };
}

async function makeHarness(options: {
  mode?: 'MOCK' | 'TIKTOK';
  questionCount?: number;
  demoQuestions?: boolean;
  completeAssets?: boolean;
  adapter?: 'ready' | 'blocked';
  staleBuilds?: boolean;
} = {}): Promise<Harness> {
  const scheduler = new ManualScheduler();
  const store = new Store(tempDbPath());
  const mode = options.mode ?? 'TIKTOK';
  const questions = makeQuestions(options.questionCount ?? 10, 'preflight').map((question) => ({
    ...question,
    verificationStatus: options.demoQuestions ? 'DEMO' as const : 'OPERATOR_VERIFIED' as const,
  }));
  store.seedQuestions({ id: 'preflight', name: 'Preflight' }, questions, scheduler.now());
  const tempRoot = await mkdtemp(join(tmpdir(), 'quiz-preflight-'));
  const webRoots = await createWebRoots(tempRoot, options.completeAssets ?? true, options.staleBuilds ?? false);
  if (options.staleBuilds) {
    const epoch = new Date(0);
    await Promise.all([utimes(webRoots.dashboard, epoch, epoch), utimes(webRoots.overlay, epoch, epoch)]);
  }
  const adapterFactory = (requestedMode: 'MOCK' | 'TIKTOK') => requestedMode === 'MOCK'
    ? new MockAdapter()
    : options.adapter === 'blocked' ? new BlockedTikTokAdapter() : new ReadyTikTokAdapter();
  const quiz = await buildApp({
    store, scheduler, adminToken: TOKEN, adapterFactory, repositoryRoot: process.cwd(), webRoots,
  });
  await quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const port = (quiz.app.server.address() as AddressInfo).port;
  const harness = { quiz, store, tempRoot, scheduler, port, sockets: [] as WebSocket[] };
  opened.push(harness);
  return harness;
}

async function createSession(
  h: Harness,
  mode: 'MOCK' | 'TIKTOK' = 'TIKTOK',
  overrides: Omit<Partial<SessionConfig>, 'timings'> & { timings?: Partial<SessionConfig['timings']> } = {},
) {
  const response = await h.quiz.app.inject({
    method: 'POST', url: '/api/sessions', headers: AUTH,
    payload: { name: 'Phiên preflight', config: {
      mode, tiktokUsername: mode === 'TIKTOK' ? 'test_live' : undefined, packId: 'preflight',
      questionsPerRound: 10, allowDemoQuestions: mode === 'MOCK', seed: 77,
      ...overrides,
    } },
  });
  expect(response.statusCode).toBe(201);
  return response.json().sessionId as string;
}

async function command(h: Harness, sessionId: string, requested: CommandBody | 'OPEN_LOBBY' | 'START_ROUND') {
  const runtime = h.quiz.runtime();
  if (!runtime) throw new Error('Runtime chưa được tạo.');
  return h.quiz.app.inject({
    method: 'POST', url: `/api/sessions/${sessionId}/commands`, headers: AUTH,
    payload: {
      commandId: randomUUID(), expectedStateVersion: runtime.engine.stateVersion,
      operatorId: 'preflight-test', requestedAtMs: h.scheduler.now(),
      command: typeof requested === 'string' ? { type: requested } : requested,
    },
  });
}

async function connectAndAck(h: Harness) {
  const socket = new WebSocket(`ws://127.0.0.1:${h.port}/ws`);
  h.sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout overlay handshake/ACK.')), 5_000);
    socket.on('error', reject);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' })));
    socket.on('message', (data) => {
      let message: { type?: string; stateVersion?: number };
      try { message = JSON.parse(String(data)) as typeof message; } catch { return; }
      if (message.type !== 'STATE_SNAPSHOT' || typeof message.stateVersion !== 'number') return;
      socket.send(JSON.stringify({ type: 'ACK', stateVersion: message.stateVersion }));
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function waitForOverlayAck(h: Harness) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await h.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
    if (response.json().checks.find((item: { id: string }) => item.id === 'overlayAck')?.status === 'PASS') return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Overlay chưa ACK stateVersion hiện tại.');
}

afterEach(async () => {
  for (const harness of opened.splice(0)) {
    for (const socket of harness.sockets) {
      if (socket.readyState === WebSocket.CLOSED) continue;
      await new Promise<void>((resolve) => { socket.once('close', () => resolve()); socket.close(); });
    }
    await harness.quiz.close().catch(() => {});
    harness.store.close();
    await rm(harness.tempRoot, { recursive: true, force: true });
  }
});

describe('API preflight và cổng START_ROUND', () => {
  it('yêu cầu admin và trả đủ trạng thái PASS/FAIL/WARN', async () => {
    const h = await makeHarness();
    expect((await h.quiz.app.inject({ method: 'GET', url: '/api/preflight' })).statusCode).toBe(401);
    const response = await h.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
    expect(response.statusCode).toBe(200);
    expect(response.json().checks.map((item: { status: string }) => item.status)).toEqual(
      expect.arrayContaining(['PASS', 'WARN']),
    );
    expect(response.json().checks.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining([
      'questions', 'database', 'assets', 'overlayAck', 'commentSource', 'overlayBuild', 'dashboardBuild',
    ]));
  });

  it('TIKTOK chỉ START khi pool hợp lệ, asset/build mới, nguồn kết nối và overlay ACK', async () => {
    const h = await makeHarness();
    const sessionId = await createSession(h);
    await command(h, sessionId, 'OPEN_LOBBY');
    const beforeAck = await h.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
    expect(beforeAck.json().checks.find((item: { id: string }) => item.id === 'overlayAck').status).toBe('FAIL');
    const blocked = await command(h, sessionId, 'START_ROUND');
    expect(blocked.statusCode).toBe(422);
    expect(blocked.json()).toMatchObject({ ok: false, code: 'PREFLIGHT_FAILED' });

    await connectAndAck(h);
    await waitForOverlayAck(h);
    const ready = await h.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
    expect(ready.json().canStartTikTok).toBe(true);
    expect(ready.json().checks.every((item: { status: string }) => item.status !== 'FAIL')).toBe(true);
    expect((await command(h, sessionId, 'START_ROUND')).statusCode).toBe(200);

    const afterStart = await h.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
    expect(afterStart.json().checks.find((item: { id: string }) => item.id === 'questions')).toMatchObject({ status: 'FAIL' });
  });

  it('auto mode gặp preflight FAIL thì không bắt đầu vòng và tự tắt', async () => {
    const h = await makeHarness();
    const sessionId = await createSession(h, 'TIKTOK', { timings: { lobbyMs: 1_000 } });
    expect((await command(h, sessionId, 'OPEN_LOBBY')).statusCode).toBe(200);
    expect((await command(h, sessionId, { type: 'SET_AUTO_MODE', enabled: true })).statusCode).toBe(200);

    h.scheduler.advance(1_000);

    const runtime = h.quiz.runtime()!;
    expect(runtime.engine.state).toBe('LOBBY');
    expect(runtime.engine.autoMode).toBe(false);
    expect(runtime.engine.round).toBeNull();
    expect(runtime.adminSnapshot().error?.code).toBe('AUTO_START_FAILED');
    expect(runtime.adminSnapshot().error?.message).toContain('overlayAck: Chưa có overlay kết nối.');
  });

  it('loại câu DEMO khỏi TIKTOK và nêu rõ thiếu ngân hàng câu hỏi', async () => {
    const h = await makeHarness({ demoQuestions: true });
    const sessionId = await createSession(h);
    const response = await h.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
    const questions = response.json().checks.find((item: { id: string }) => item.id === 'questions');
    expect(questions).toMatchObject({ status: 'FAIL' });
    expect(questions.reason).toContain('đã loại DEMO');
    const start = await command(h, sessionId, 'START_ROUND');
    expect(start.json()).toMatchObject({ code: 'PREFLIGHT_FAILED' });
    expect(start.json().details.map((item: { id: string }) => item.id)).toContain('questions');
  });

  it('đánh dấu FAIL riêng cho DB, asset, nguồn và build cũ', async () => {
    const h = await makeHarness({ completeAssets: false, adapter: 'blocked', staleBuilds: true });
    vi.spyOn(h.store, 'probeWrite').mockImplementation(() => { throw new Error('read-only test'); });
    await createSession(h);
    const response = await h.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
    const failures = response.json().checks.filter((item: { status: string }) => item.status === 'FAIL');
    expect(failures.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining([
      'database', 'assets', 'overlayAck', 'commentSource', 'overlayBuild', 'dashboardBuild',
    ]));
    expect(failures.find((item: { id: string }) => item.id === 'database').reason).toContain('read-only test');
  });

  it('MOCK chỉ cảnh báo và không bị cổng preflight chặn', async () => {
    const h = await makeHarness({ mode: 'MOCK', demoQuestions: true });
    const sessionId = await createSession(h, 'MOCK');
    const preflight = await h.quiz.app.inject({ method: 'GET', url: '/api/preflight', headers: AUTH });
    expect(preflight.json().checks.find((item: { id: string }) => item.id === 'commentSource')).toMatchObject({ status: 'WARN' });
    await command(h, sessionId, 'OPEN_LOBBY');
    const start = await command(h, sessionId, 'START_ROUND');
    expect(start.statusCode).toBe(200);
    expect(start.json().code).not.toBe('PREFLIGHT_FAILED');
  });
});
