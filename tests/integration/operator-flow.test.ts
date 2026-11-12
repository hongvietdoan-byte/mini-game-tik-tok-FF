import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { DEFAULT_TIMINGS } from '@quiz/contracts';
import { ManualScheduler, TikTokLiveAdapter, type TikTokConnectionLike } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import { AUTH, TOKEN, ledgerSums, makeQuestions, markCurrentWebBuild, referenceScores, storedScores, tempDbPath } from './helpers';

const FAST_TIMINGS = {
  ...DEFAULT_TIMINGS,
  prepareMs: 500,
  answerMs: 3_000,
  revealMs: 500,
  leaderboardMs: 500,
  bigLeaderboardMs: 500,
  roundEndMs: 0,
  victoryMs: 1_000,
  intermissionMs: 1_000,
};

class FakeTikTokConnection implements TikTokConnectionLike {
  private handlers = new Map<string, ((data: any) => void)[]>();

  async connect() {
    return {};
  }

  async disconnect() {}

  on(event: string, callback: (data: any) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), callback]);
  }

  removeAllListeners(event?: string) {
    if (event) this.handlers.delete(event);
    else this.handlers.clear();
  }

  emit(event: string, data: unknown) {
    for (const callback of this.handlers.get(event) ?? []) callback(data);
  }
}

type TestServer = {
  scheduler: ManualScheduler;
  store: Store;
  quiz: QuizApp;
  connections: FakeTikTokConnection[];
  sessionId: string | null;
  dbPath: string;
  baseUrl: string | null;
  requestUrls: string[];
  wsUrls: string[];
  tempRoot: string;
  closed: boolean;
};

type HttpResult = { status: number; body: any };
type WsMessage = { type: string; payload?: any; seq?: number; stateVersion?: number };

const open: TestServer[] = [];

afterEach(async () => {
  for (const h of open.splice(0)) await closeServer(h);
});

async function bootServer(opts: { dbPath?: string; seedQuestions?: boolean; questions?: number; logger?: boolean } = {}) {
  const scheduler = new ManualScheduler();
  const dbPath = opts.dbPath ?? tempDbPath();
  const store = new Store(dbPath);
  if (opts.seedQuestions !== false)
    store.seedQuestions({ id: 'demo', name: 'Demo' }, makeQuestions(opts.questions ?? 20), scheduler.now());
  const connections: FakeTikTokConnection[] = [];
  const tempRoot = mkdtempSync(join(tmpdir(), 'quiz-operator-preflight-'));
  const webRoots = { assets: join(tempRoot, 'assets'), dashboard: join(tempRoot, 'dashboard'), overlay: join(tempRoot, 'overlay') };
  for (const directory of Object.values(webRoots)) mkdirSync(directory, { recursive: true });
  markCurrentWebBuild(webRoots.dashboard, webRoots.overlay);
  for (const relative of ['brand/logo.png', 'victory/trophy-stage.png', 'victory/bg.jpg', 'chibi/test.png', 'mc/kelly.png']) {
    const path = join(webRoots.assets, relative);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, 'test asset placeholder');
  }
  const quiz = await buildApp({
    store,
    scheduler,
    adminToken: TOKEN,
    repositoryRoot: process.cwd(),
    webRoots,
    logger: opts.logger ?? false,
    adapterFactory: (mode, config) => {
      if (mode !== 'TIKTOK') throw new Error(`Không mong đợi mode ${mode} trong test operator LIVE.`);
      return new TikTokLiveAdapter({
        username: config.tiktokUsername ?? 'operator_test_live',
        scheduler,
        reconnect: { baseMs: 2_000, maxMs: 2_000, maxAttempts: 5 },
        createConnection: () => {
          const connection = new FakeTikTokConnection();
          connections.push(connection);
          return connection;
        },
      });
    },
  });
  const h: TestServer = {
    scheduler,
    store,
    quiz,
    connections,
    sessionId: null,
    dbPath,
    baseUrl: null,
    requestUrls: [],
    wsUrls: [],
    tempRoot,
    closed: false,
  };
  open.push(h);
  return h;
}

async function listen(h: TestServer) {
  if (h.baseUrl) return;
  await h.quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const address = h.quiz.app.server.address() as { port: number };
  h.baseUrl = `http://127.0.0.1:${address.port}`;
}

async function closeServer(h: TestServer) {
  if (h.closed) return;
  h.closed = true;
  await h.quiz.close().catch(() => {});
  h.store.close();
  rmSync(h.tempRoot, { recursive: true, force: true });
}

async function request(
  h: TestServer,
  method: 'GET' | 'POST',
  path: string,
  payload?: unknown,
  token: string | null = TOKEN,
): Promise<HttpResult> {
  if (!h.baseUrl) throw new Error('HTTP server chưa listen.');
  const url = `${h.baseUrl}${path}`;
  h.requestUrls.push(url);
  const headers: Record<string, string> = {};
  if (payload !== undefined) headers['content-type'] = 'application/json';
  if (token !== null) headers.authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method,
    headers,
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 5_000) {
  const end = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() >= end) throw new Error('waitFor: hết thời gian chờ.');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function runtime(h: TestServer) {
  const value = h.quiz.runtime();
  if (!value) throw new Error('Không có runtime cho phiên TIKTOK.');
  return value;
}

function runUntil(h: TestServer, condition: () => boolean, stepMs = 100, maxMs = 300_000) {
  let spent = 0;
  while (!condition()) {
    if (spent >= maxMs) throw new Error(`runUntil quá ${maxMs} ms (state=${runtime(h).engine.state}).`);
    h.scheduler.advance(stepMs);
    spent += stepMs;
  }
}

async function createTikTokSession(h: TestServer, overrides: Record<string, unknown> = {}) {
  const result = await request(h, 'POST', '/api/sessions', {
    name: 'Phiên operator TIKTOK test',
    config: {
      mode: 'TIKTOK',
      tiktokUsername: 'operator_test_live',
      questionsPerRound: 10,
      seed: 57,
      timings: FAST_TIMINGS,
      ...overrides,
    },
  });
  if (result.status !== 201) throw new Error(`Tạo phiên TIKTOK lỗi ${result.status}: ${JSON.stringify(result.body)}`);
  h.sessionId = result.body.sessionId as string;
  await waitFor(() => runtime(h).adminSnapshot().live.status === 'CONNECTED');
  return result.body;
}

async function questions(h: TestServer) {
  const result = await request(h, 'GET', '/api/questions');
  expect(result.status).toBe(200);
  return result.body as { id: string; prompt: string; approvalStatus: string }[];
}

async function reviewQuestion(h: TestServer, id: string, decision: 'APPROVE' | 'REJECT') {
  const result = await request(h, 'POST', `/api/questions/${id}/approve`, { decision, operatorId: 'operator-test' });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  return result.body.question;
}

async function approveQuestions(h: TestServer, count = 10) {
  for (const q of (await questions(h)).slice(0, count)) await reviewQuestion(h, q.id, 'APPROVE');
}

async function command(h: TestServer, body: Record<string, unknown>): Promise<HttpResult> {
  if (!h.sessionId) throw new Error('Chưa có sessionId.');
  const state = await request(h, 'GET', `/api/sessions/${h.sessionId}/state`);
  const version = state.body.public.stateVersion as number;
  return request(h, 'POST', `/api/sessions/${h.sessionId}/commands`, {
    commandId: randomUUID(),
    expectedStateVersion: version,
    operatorId: 'operator-test',
    requestedAtMs: h.scheduler.now(),
    command: body,
  });
}

async function connectOverlay(h: TestServer) {
  if (!h.baseUrl) throw new Error('HTTP server chưa listen.');
  const wsUrl = h.baseUrl.replace(/^http/, 'ws') + '/ws';
  h.wsUrls.push(wsUrl);
  const socket = new WebSocket(wsUrl);
  const messages: WsMessage[] = [];
  const rawMessages: string[] = [];
  socket.on('message', (data) => {
    const raw = String(data);
    rawMessages.push(raw);
    const message = JSON.parse(raw) as WsMessage;
    messages.push(message);
    if (message.type === 'STATE_SNAPSHOT')
      socket.send(JSON.stringify({ type: 'ACK', stateVersion: message.stateVersion, seq: message.seq }));
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' }));
  await waitFor(() => messages.some((m) => m.type === 'STATE_SNAPSHOT'));
  return { socket, messages, rawMessages };
}

async function closeSocket(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    socket.once('close', () => resolve());
    socket.close();
  });
}

async function openLobbyAndRound(h: TestServer) {
  expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
  await waitForOverlayAck(h);
  expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
}

async function waitForOverlayAck(h: TestServer) {
  await waitFor(async () => {
    const result = await request(h, 'GET', '/api/preflight');
    return result.body.checks.some((item: { id: string; status: string }) => item.id === 'overlayAck' && item.status === 'PASS');
  });
}

async function waitAccepting(h: TestServer, questionIndex?: number) {
  runUntil(h, () => {
    const engine = runtime(h).engine;
    return engine.state === 'ACCEPTING' && (questionIndex === undefined || engine.round?.questionIndex === questionIndex);
  });
}

async function waitReveal(h: TestServer) {
  runUntil(h, () => runtime(h).engine.state === 'REVEAL');
}

function emitChat(h: TestServer, userId: string, text: string, msgId: string) {
  const connection = h.connections.at(-1);
  if (!connection) throw new Error('TikTok fake connection chưa được tạo.');
  connection.emit('chat', {
    common: { msgId, createTime: String(h.scheduler.now()) },
    user: { id: userId, nickname: `Khán giả ${userId}` },
    content: text,
  });
}

async function correctOption(h: TestServer) {
  if (!h.sessionId) throw new Error('Chưa có sessionId.');
  const state = await request(h, 'GET', `/api/sessions/${h.sessionId}/state`);
  return state.body.current.correctOptionId as string;
}

async function answer(h: TestServer, userId: string, text: string, msgId: string) {
  const receivedBefore = runtime(h).adminSnapshot().metrics.received;
  emitChat(h, userId, text, msgId);
  await waitFor(() => runtime(h).adminSnapshot().metrics.received > receivedBefore);
}

describe('C-0057 — luồng operator TIKTOK qua HTTP API và WebSocket', () => {
  it('chỉ mở vòng khi đủ câu đã duyệt; câu REJECT không xuất hiện trong vòng hoặc overlay', async () => {
    const h = await bootServer();
    await listen(h);
    const pool = await questions(h);
    const rejected = pool[0]!;
    for (const q of pool.slice(1, 10)) await reviewQuestion(h, q.id, 'APPROVE');
    await reviewQuestion(h, rejected.id, 'REJECT');
    await createTikTokSession(h);

    const overlay = await connectOverlay(h);
    expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
    await waitForOverlayAck(h);
    const insufficient = await command(h, { type: 'START_ROUND' });
    expect(insufficient.status).toBe(422);
    expect(insufficient.body.code).toBe('PREFLIGHT_FAILED');

    const newlyApproved = pool[10]!;
    await reviewQuestion(h, newlyApproved.id, 'APPROVE');
    expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
    const roundId = runtime(h).engine.round!.roundId;
    runUntil(h, () => runtime(h).engine.state === 'VICTORY');
    await waitFor(() => overlay.messages.some((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'VICTORY'));

    const selected = h.store.raw
      .prepare('SELECT question_id AS id FROM round_questions WHERE round_id = ? ORDER BY position')
      .all(roundId) as { id: string }[];
    expect(selected).toHaveLength(10);
    expect(selected.map((q) => q.id)).not.toContain(rejected.id);
    const selectedPrompts = selected.map((q) => pool.find((candidate) => candidate.id === q.id)!.prompt);
    const overlayPrompts = overlay.messages
      .filter((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.question?.prompt)
      .map((m) => m.payload.question.prompt as string);
    expect(overlayPrompts).not.toContain(rejected.prompt);
    expect(new Set(overlayPrompts)).toEqual(new Set(selectedPrompts));
    await closeSocket(overlay.socket);
  });

  it('PAUSE chặn comment trong lúc dừng; RESUME dời deadline đúng bằng thời gian pause và giữ đáp án cũ', async () => {
    const h = await bootServer();
    await listen(h);
    await approveQuestions(h);
    await createTikTokSession(h);
    const overlay = await connectOverlay(h);
    await openLobbyAndRound(h);
    await waitAccepting(h, 0);

    const correct = await correctOption(h);
    await answer(h, 'viewer-1', correct, 'pause-before');
    const questionId = runtime(h).engine.round!.questionInstanceIds[0]!;
    const oldDeadline = runtime(h).engine.timer!.deadlineMs!;
    const pauseAt = h.scheduler.now();
    expect((await command(h, { type: 'PAUSE' })).status).toBe(200);
    expect(runtime(h).engine.state).toBe('PAUSED');

    h.scheduler.advance(5_000);
    emitChat(h, 'viewer-paused', correct, 'pause-during');
    const pausedSnapshot = await request(h, 'GET', `/api/sessions/${h.sessionId}/state`, undefined, null);
    expect(pausedSnapshot.body.state).toBe('PAUSED');
    expect(pausedSnapshot.body.timer).toMatchObject({ running: false, remainingMs: oldDeadline - pauseAt });
    expect(h.store.raw.prepare('SELECT player_id FROM answers WHERE source_event_id = ?').get('pause-during')).toBeUndefined();

    const resumeAt = h.scheduler.now();
    expect((await command(h, { type: 'RESUME' })).status).toBe(200);
    const newDeadline = runtime(h).engine.timer!.deadlineMs!;
    expect(newDeadline - oldDeadline).toBe(resumeAt - pauseAt);
    expect(runtime(h).engine.state).toBe('ACCEPTING');

    emitChat(h, 'viewer-2', correct, 'pause-after');
    const accepted = h.store.raw
      .prepare('SELECT COUNT(*) AS n FROM answers WHERE question_instance_id = ?')
      .get(questionId) as { n: number };
    expect(accepted.n).toBe(2);
    await waitFor(() => overlay.messages.some((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'PAUSED'));
    await waitFor(() => overlay.messages.some((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'ACCEPTING'));
    const latest = [...overlay.messages].reverse().find((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'ACCEPTING')!;
    expect(latest.payload.timer).toMatchObject({ running: true, remainingMs: oldDeadline - pauseAt });
    await closeSocket(overlay.socket);
  });

  it('SKIP trước REVEAL và VOID sau REVEAL giữ điểm, chuỗi, top1Streak và snapshot đồng nhất', async () => {
    const h = await bootServer();
    await listen(h);
    await approveQuestions(h);
    await createTikTokSession(h);
    const overlay = await connectOverlay(h);
    await openLobbyAndRound(h);
    const roundId = runtime(h).engine.round!.roundId;

    await waitAccepting(h, 0);
    const q0 = runtime(h).engine.round!.questionInstanceIds[0]!;
    await answer(h, 'winner', await correctOption(h), 'skip-answer');
    expect((await command(h, { type: 'SKIP_QUESTION', reason: 'Lỗi nội dung câu' })).status).toBe(200);
    expect((h.store.raw.prepare('SELECT status FROM round_questions WHERE id = ?').get(q0) as { status: string }).status).toBe('VOIDED');
    expect((h.store.raw.prepare('SELECT COUNT(*) AS n FROM score_events WHERE question_instance_id = ?').get(q0) as { n: number }).n).toBe(0);

    await waitAccepting(h, 1);
    const q1 = runtime(h).engine.round!.questionInstanceIds[1]!;
    await answer(h, 'winner', await correctOption(h), 'void-answer');
    await waitReveal(h);
    const shortReason = await command(h, { type: 'VOID_QUESTION', reason: 'xy' });
    expect(shortReason.status).toBe(422);
    expect((await command(h, { type: 'VOID_QUESTION', reason: 'Đáp án câu hỏi bị sai' })).status).toBe(200);
    expect((h.store.raw.prepare('SELECT status FROM round_questions WHERE id = ?').get(q1) as { status: string }).status).toBe('VOIDED');
    const voidNet = h.store.raw
      .prepare('SELECT COALESCE(SUM(points), 0) AS n FROM score_events WHERE question_instance_id = ?')
      .get(q1) as { n: number };
    expect(voidNet.n).toBe(0);

    await waitAccepting(h, 2);
    await answer(h, 'winner', await correctOption(h), 'streak-one');
    await waitReveal(h);
    await waitAccepting(h, 3);
    await answer(h, 'winner', await correctOption(h), 'streak-two');
    await waitReveal(h);
    await waitAccepting(h, 4);
    const correct = await correctOption(h);
    const wrong = ['A', 'B', 'C', 'D'].find((option) => option !== correct)!;
    await answer(h, 'winner', wrong, 'streak-break');
    await waitReveal(h);
    await waitAccepting(h, 5);
    await answer(h, 'winner', await correctOption(h), 'streak-reset');
    runUntil(h, () => runtime(h).engine.state === 'VICTORY');
    await waitFor(() => overlay.messages.some((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'VICTORY'));

    const expected = referenceScores(h.store, roundId, { windowMs: FAST_TIMINGS.answerMs });
    expect(storedScores(h.store, roundId)).toEqual(expected);
    expect(ledgerSums(h.store, roundId).get('TIKTOK:winner')).toBe(expected.get('TIKTOK:winner')!.score);
    expect(expected.get('TIKTOK:winner')).toEqual({ score: 3_100, correct: 3 });

    const publicState = await request(h, 'GET', `/api/sessions/${h.sessionId}/state`, undefined, null);
    const wsVictory = [...overlay.messages].reverse().find((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'VICTORY')!;
    expect(wsVictory.payload.leaderboard).toEqual(publicState.body.leaderboard);
    expect(wsVictory.payload.podium).toEqual(publicState.body.podium);
    const history = h.store.leaderboardHistory(roundId);
    const lastBoardByQuestion = new Map<string, { playerId: string; rank: number }[]>();
    for (const board of history) if (board.questionInstanceId) lastBoardByQuestion.set(board.questionInstanceId, board.entries);
    const boards = [...lastBoardByQuestion.values()];
    let expectedTop1 = 0;
    for (let index = boards.length - 1; index >= 0; index -= 1) {
      if (!boards[index]!.some((entry) => entry.playerId === 'TIKTOK:winner' && entry.rank === 1)) break;
      expectedTop1 += 1;
    }
    const winnerEntry = publicState.body.leaderboard.entries.find((entry: any) => entry.playerId === 'TIKTOK:winner');
    expect(winnerEntry.top1Streak).toBe(expectedTop1);
    expect(expectedTop1).toBeGreaterThan(1);
    await closeSocket(overlay.socket);
  });

  it('mất LIVE giữa câu → Connection Manager reconnect thủ công, resume và giữ đáp án đã nhận', async () => {
    const h = await bootServer();
    await listen(h);
    await approveQuestions(h);
    await createTikTokSession(h);
    const overlay = await connectOverlay(h);
    await openLobbyAndRound(h);
    await waitAccepting(h, 0);
    const correct = await correctOption(h);
    await answer(h, 'kept-viewer', correct, 'before-live-drop');
    const questionId = runtime(h).engine.round!.questionInstanceIds[0]!;

    h.connections[0]!.emit('disconnected', { reason: 'mạng LIVE bị ngắt' });
    expect(runtime(h).engine.state).toBe('CONNECTION_INTERRUPTED');
    const interrupted = await request(h, 'GET', `/api/sessions/${h.sessionId}/state`);
    expect(interrupted.body.live).toMatchObject({ status: 'RECONNECTING' });
    expect(interrupted.body.live.detail).toContain('mạng LIVE bị ngắt');

    const reconnect = await request(h, 'POST', `/api/sessions/${h.sessionId}/source`, { action: 'RECONNECT' });
    expect(reconnect.status).toBe(200);
    expect(reconnect.body.health.status).toBe('CONNECTED');
    expect(h.connections).toHaveLength(2);
    expect(runtime(h).engine.state).toBe('CONNECTION_INTERRUPTED');
    expect((await command(h, { type: 'RESUME' })).status).toBe(200);
    expect(runtime(h).engine.state).toBe('ACCEPTING');

    const preserved = h.store.raw
      .prepare('SELECT COUNT(*) AS n FROM answers WHERE question_instance_id = ? AND source_event_id = ?')
      .get(questionId, 'before-live-drop') as { n: number };
    expect(preserved.n).toBe(1);
    emitChat(h, 'new-viewer', correct, 'after-live-reconnect');
    const answers = h.store.raw
      .prepare('SELECT COUNT(*) AS n FROM answers WHERE question_instance_id = ?')
      .get(questionId) as { n: number };
    expect(answers.n).toBe(2);
    await waitFor(() => overlay.messages.some((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'CONNECTION_INTERRUPTED'));
    await waitFor(() => overlay.messages.some((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'ACCEPTING'));
    await closeSocket(overlay.socket);
  });

  it('token sai/thiếu nhận 401; token không vào URL, log hoặc WS công khai', async () => {
    const capturedLogs: string[] = [];
    const capture = (stream: NodeJS.WriteStream) =>
      vi.spyOn(stream, 'write').mockImplementation(((chunk: unknown) => {
        capturedLogs.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
        return true;
      }) as never);
    const stdout = capture(process.stdout);
    const stderr = capture(process.stderr);
    let h: TestServer | undefined;
    let overlay: Awaited<ReturnType<typeof connectOverlay>> | undefined;
    let admin: WebSocket | undefined;
    try {
      h = await bootServer({ logger: true });
      await listen(h);
      const missing = await request(h, 'POST', '/api/sessions', { config: { mode: 'TIKTOK', tiktokUsername: 'operator_test_live' } }, null);
      const wrong = await request(h, 'POST', '/api/sessions', { config: { mode: 'TIKTOK', tiktokUsername: 'operator_test_live' } }, 'wrong-admin-token-012345');
      expect(missing.status).toBe(401);
      expect(wrong.status).toBe(401);

      await approveQuestions(h);
      await createTikTokSession(h);
      overlay = await connectOverlay(h);
      const publicState = await request(h, 'GET', `/api/sessions/${h.sessionId}/state`, undefined, null);
      expect(publicState.status).toBe(200);
      expect(JSON.stringify(publicState.body)).not.toContain(TOKEN);

      const invalidAdmin = new WebSocket(h.baseUrl!.replace(/^http/, 'ws') + '/ws');
      const invalidCode = await new Promise<number>((resolve, reject) => {
        invalidAdmin.once('open', () => invalidAdmin.send(JSON.stringify({ type: 'HELLO', role: 'admin', token: 'sai-admin-token' })));
        invalidAdmin.once('error', reject);
        invalidAdmin.once('close', (code) => resolve(code));
      });
      expect(invalidCode).toBe(4401);

      admin = new WebSocket(h.baseUrl!.replace(/^http/, 'ws') + '/ws');
      h.wsUrls.push(h.baseUrl!.replace(/^http/, 'ws') + '/ws');
      const adminSnapshot = await new Promise<WsMessage>((resolve, reject) => {
        admin!.once('open', () => admin!.send(JSON.stringify({ type: 'HELLO', role: 'admin', token: TOKEN })));
        admin!.once('error', reject);
        admin!.once('message', (data) => resolve(JSON.parse(String(data)) as WsMessage));
      });
      expect(adminSnapshot.type).toBe('ADMIN_SNAPSHOT');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(h.requestUrls.every((url) => !url.includes(TOKEN))).toBe(true);
      expect(h.wsUrls.every((url) => !url.includes(TOKEN))).toBe(true);
      expect(overlay.rawMessages.join('\n')).not.toContain(TOKEN);
      expect(JSON.stringify(adminSnapshot)).not.toContain(TOKEN);
      expect(capturedLogs.join('')).not.toContain(TOKEN);
      expect(capturedLogs.length).toBeGreaterThan(0);
    } finally {
      if (admin && admin.readyState !== WebSocket.CLOSED) await closeSocket(admin);
      if (overlay) await closeSocket(overlay.socket);
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });

  it('STOP giữa vòng đóng phiên mà không tạo podium cho câu chưa chấm; restart không khôi phục phiên đã dừng', async () => {
    const h = await bootServer();
    await listen(h);
    await approveQuestions(h);
    await createTikTokSession(h);
    const overlay = await connectOverlay(h);
    await openLobbyAndRound(h);
    await waitAccepting(h, 0);
    const roundId = runtime(h).engine.round!.roundId;
    const q0 = runtime(h).engine.round!.questionInstanceIds[0]!;
    await answer(h, 'winner', await correctOption(h), 'stop-scored');
    await waitReveal(h);
    await waitAccepting(h, 1);
    const q1 = runtime(h).engine.round!.questionInstanceIds[1]!;
    await answer(h, 'pending-viewer', await correctOption(h), 'stop-unscored');

    expect((await command(h, { type: 'STOP', reason: 'Operator dừng phiên giữa vòng' })).status).toBe(200);
    const stopped = await request(h, 'GET', `/api/sessions/${h.sessionId}/state`, undefined, null);
    expect(stopped.body.state).toBe('IDLE');
    expect(stopped.body.podium).toBeNull();
    expect(runtime(h).engine.sessionStatus).toBe('CLOSED');
    expect((h.store.raw.prepare('SELECT status FROM rounds WHERE id = ?').get(roundId) as { status: string }).status).toBe('ABORTED');
    const closed = h.store.raw
      .prepare("SELECT COUNT(*) AS n FROM round_questions WHERE round_id = ? AND status = 'CLOSED'")
      .get(roundId) as { n: number };
    expect(closed.n).toBe(1);
    const unscored = h.store.raw
      .prepare('SELECT COUNT(*) AS n FROM score_events WHERE question_instance_id = ?')
      .get(q1) as { n: number };
    expect(unscored.n).toBe(0);
    const scoredQuestions = h.store.raw
      .prepare('SELECT DISTINCT question_instance_id AS id FROM score_events WHERE round_id = ?')
      .all(roundId) as { id: string }[];
    expect(scoredQuestions.map((q) => q.id)).toEqual([q0]);
    const finalBoard = h.store.raw
      .prepare("SELECT COUNT(*) AS n FROM leaderboard_snapshots WHERE round_id = ? AND kind = 'FINAL'")
      .get(roundId) as { n: number };
    expect(finalBoard.n).toBe(0);
    expect(overlay.messages.some((m) => m.type === 'VICTORY_STARTED')).toBe(false);
    expect(overlay.messages.some((m) => m.type === 'STATE_SNAPSHOT' && m.payload?.state === 'VICTORY')).toBe(false);
    expect((h.store.raw.prepare('SELECT COUNT(*) AS n FROM answers WHERE question_instance_id = ?').get(q0) as { n: number }).n).toBe(1);
    await closeSocket(overlay.socket);

    await closeServer(h);
    const restarted = await bootServer({ dbPath: h.dbPath, seedQuestions: false });
    expect(await restarted.quiz.recover()).toBeNull();
    await listen(restarted);
    expect((await request(restarted, 'GET', '/api/sessions/current', undefined, null)).body.sessionId).toBeNull();
    expect(restarted.quiz.runtime()).toBeNull();
  });
});
