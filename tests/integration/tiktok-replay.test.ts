import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { ManualScheduler, TikTokLiveAdapter, type TikTokConnectionLike } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import { AUTH, TOKEN, makeQuestions, markCurrentWebBuild, tempDbPath } from './helpers';

type RoundReplay = {
  questionsPerRound: 10;
  primaryPlayer: { userId: string; nicknames: string[] };
  beforeOpen: { userId: string; nickname: string; eventId: string; text: string };
  afterClose: { userId: string; nickname: string; eventId: string; text: string };
  changeOfMind: {
    userId: string;
    nickname: string;
    firstEventId: string;
    secondEventId: string;
    firstText: string;
    secondText: string;
  };
  duplicateMessage: { userId: string; nickname: string; text: string };
  invalidTexts: string[];
  staleComment: { userId: string; nickname: string; eventId: string; sourceLagMs: number; text: string };
  roundComments: { eventId: string; text: string }[];
};

const replay = JSON.parse(readFileSync(
  new URL('../../fixtures/replay/tiktok-comments-round.json', import.meta.url),
  'utf8',
)) as RoundReplay;

class ReplayConnection implements TikTokConnectionLike {
  handlers = new Map<string, ((data: any) => void)[]>();
  connects = 0;
  disconnects = 0;
  failWith: Error | null = null;

  async connect() {
    this.connects += 1;
    if (this.failWith) throw this.failWith;
    return { roomId: 'fixture-room' };
  }

  async disconnect() {
    this.disconnects += 1;
  }

  on(event: string, callback: (data: any) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), callback]);
  }

  removeAllListeners() {
    this.handlers.clear();
  }

  emit(event: string, data: any = {}) {
    for (const callback of this.handlers.get(event) ?? []) callback(data);
  }
}

class UserOfflineError extends Error {}
const cleanup: (() => Promise<void>)[] = [];
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const OPTIONS = ['A', 'B', 'C', 'D'] as const;

afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

async function bootReplay(connections: ReplayConnection[]) {
  const scheduler = new ManualScheduler(1_800_000_000_000);
  const store = new Store(tempDbPath());
  store.seedQuestions({ id: 'demo', name: 'Replay DEMO' }, makeQuestions(40), scheduler.now());
  const tempRoot = mkdtempSync(join(tmpdir(), 'quiz-replay-preflight-'));
  const webRoots = { assets: join(tempRoot, 'assets'), dashboard: join(tempRoot, 'dashboard'), overlay: join(tempRoot, 'overlay') };
  for (const directory of Object.values(webRoots)) mkdirSync(directory, { recursive: true });
  markCurrentWebBuild(webRoots.dashboard, webRoots.overlay);
  for (const relative of ['brand/logo.png', 'victory/trophy-stage.png', 'victory/bg.jpg', 'chibi/test.png', 'mc/kelly.png']) {
    const path = join(webRoots.assets, relative);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, 'test asset placeholder');
  }
  let connectionIndex = 0;
  let adapter: TikTokLiveAdapter | null = null;
  const quiz: QuizApp = await buildApp({
    store,
    scheduler,
    adminToken: TOKEN,
    repositoryRoot: process.cwd(),
    webRoots,
    adapterFactory: (_mode, config) => {
      adapter = new TikTokLiveAdapter({
        username: config.tiktokUsername!,
        scheduler,
        createConnection: () => connections[Math.min(connectionIndex++, connections.length - 1)]!,
        reconnect: { baseMs: 1_000, maxMs: 4_000, maxAttempts: 4 },
      });
      return adapter;
    },
  });
  await quiz.app.listen({ host: '127.0.0.1', port: 0 });
  const port = (quiz.app.server.address() as AddressInfo).port;
  const sockets: WebSocket[] = [];
  cleanup.push(async () => {
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.CLOSED) continue;
      await new Promise<void>((resolve) => { socket.once('close', () => resolve()); socket.close(); });
    }
    await quiz.close();
    store.close();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  const inject = (method: 'GET' | 'POST', url: string, payload?: unknown) => quiz.app.inject({
    method,
    url,
    headers: AUTH,
    ...(payload ? { payload } : {}),
  });
  return {
    adapter: () => {
      if (!adapter) throw new Error('TikTok adapter chưa được tạo');
      return adapter;
    },
    connections,
    inject,
    quiz,
    scheduler,
    store,
    port,
    sockets,
  };
}

async function connectOverlay(h: Awaited<ReturnType<typeof bootReplay>>) {
  const socket = new WebSocket(`ws://127.0.0.1:${h.port}/ws`);
  h.sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout ACK overlay trong replay.')), 5_000);
    socket.on('error', reject);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' })));
    socket.on('message', (data) => {
      let message: { type?: string; stateVersion?: number; seq?: number };
      try { message = JSON.parse(String(data)) as typeof message; } catch { return; }
      if (message.type !== 'STATE_SNAPSHOT' || typeof message.stateVersion !== 'number') return;
      socket.send(JSON.stringify({ type: 'ACK', stateVersion: message.stateVersion, seq: message.seq, role: 'program' }));
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function waitForOverlayAck(h: Awaited<ReturnType<typeof bootReplay>>) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await h.inject('GET', '/api/preflight');
    if (response.json().checks.find((item: { id: string }) => item.id === 'overlayAck')?.status === 'PASS') return;
    await flush();
  }
  throw new Error('Overlay chưa ACK stateVersion hiện tại trong replay.');
}

function runUntilAccepting(h: Awaited<ReturnType<typeof bootReplay>>) {
  for (let elapsed = 0; elapsed <= 20_000; elapsed += 100) {
    if (h.quiz.runtime()?.engine.state === 'ACCEPTING') return;
    h.scheduler.advance(100);
  }
  throw new Error(`Quá thời gian chờ ACCEPTING (state=${h.quiz.runtime()?.engine.state})`);
}

async function createReplaySession(
  h: Awaited<ReturnType<typeof bootReplay>>,
  config: { questionsPerRound?: 10; answerMs?: number } = {},
) {
  if (config.questionsPerRound) {
    for (const question of h.store.listQuestions('demo').slice(0, config.questionsPerRound))
      h.store.reviewQuestion(question.id, 'APPROVE', 'replay-fixture', h.scheduler.now());
  }
  const created = await h.inject('POST', '/api/sessions', {
    name: 'Phiên replay fixture',
    config: {
      mode: 'TIKTOK',
      tiktokUsername: 'synthetic_live',
      questionsPerRound: config.questionsPerRound ?? 10,
      scoringMode: 'KAHOOT',
      speedBonusMax: 50,
      leaderboardInterval: 20,
      seed: 73,
      timings: {
        lobbyMs: 0,
        prepareMs: 500,
        answerMs: config.answerMs ?? 3_000,
        revealMs: 500,
        leaderboardMs: 500,
        roundEndMs: 0,
        victoryMs: 1_000,
        intermissionMs: 1_000,
      },
    },
  });
  expect(created.statusCode, created.body).toBe(201);
  await flush();
  return created.json().sessionId as string;
}

async function command(h: Awaited<ReturnType<typeof bootReplay>>, sessionId: string, body: object) {
  const runtime = h.quiz.runtime();
  if (!runtime) throw new Error('Không có runtime');
  const response = await h.inject('POST', `/api/sessions/${sessionId}/commands`, {
    commandId: randomUUID(),
    expectedStateVersion: runtime.engine.stateVersion,
    operatorId: 'replay-fixture',
    requestedAtMs: h.scheduler.now(),
    command: body,
  });
  return response;
}

function emitComment(
  connection: ReplayConnection,
  h: Awaited<ReturnType<typeof bootReplay>>,
  input: { userId: string; nickname: string; text: string; eventId?: string; sourceLagMs?: number },
) {
  const common = {
    ...(input.eventId ? { msgId: input.eventId } : {}),
    createTime: String(h.scheduler.now() - (input.sourceLagMs ?? 0)),
  };
  const payload = {
    common,
    user: { id: input.userId, nickname: input.nickname },
    content: input.text,
  };
  connection.emit('chat', payload);
}

function otherOption(option: string) {
  const index = OPTIONS.indexOf(option as (typeof OPTIONS)[number]);
  return OPTIONS[(index + 1) % OPTIONS.length]!;
}

describe('TikTok comment replay qua runtime', () => {
  it('chạy đủ 10 câu Kahoot, chuẩn hoá chat và không nhân đôi người/đáp án', async () => {
    const connection = new ReplayConnection();
    const h = await bootReplay([connection]);
    const sessionId = await createReplaySession(h, { questionsPerRound: replay.questionsPerRound });
    await connectOverlay(h);
    const runtime = h.quiz.runtime()!;

    await command(h, sessionId, { type: 'OPEN_LOBBY' });
    await waitForOverlayAck(h);
    emitComment(connection, h, replay.beforeOpen);
    expect(runtime.metrics.rejected.NOT_ACCEPTING).toBe(1);
    await command(h, sessionId, { type: 'START_ROUND' });
    runUntilAccepting(h);
    const roundId = runtime.engine.round!.roundId;
    const expectedOptions: string[] = [];

    for (let index = 0; index < replay.roundComments.length; index += 1) {
      const entry = replay.roundComments[index]!;
      const correct = runtime.adminSnapshot().current!.correctOptionId;
      expectedOptions.push(correct);
      const player = replay.primaryPlayer;
      const nickname = player.nicknames[index % player.nicknames.length]!;
      emitComment(connection, h, {
        userId: player.userId,
        nickname,
        text: entry.text.replace('{correctLower}', correct.toLocaleLowerCase('en')),
        eventId: entry.eventId,
      });

      if (index === 0) {
        emitComment(connection, h, {
          ...replay.duplicateMessage,
          eventId: entry.eventId,
          text: replay.duplicateMessage.text.replace('{correct}', correct),
        });
        emitComment(connection, h, {
          userId: player.userId,
          nickname: player.nicknames[1]!,
          text: otherOption(correct),
          eventId: 'replay-primary-spam-q1',
        });
        emitComment(connection, h, {
          userId: replay.changeOfMind.userId,
          nickname: replay.changeOfMind.nickname,
          text: replay.changeOfMind.firstText,
          eventId: replay.changeOfMind.firstEventId,
        });
        emitComment(connection, h, {
          userId: replay.changeOfMind.userId,
          nickname: replay.changeOfMind.nickname,
          text: replay.changeOfMind.secondText,
          eventId: replay.changeOfMind.secondEventId,
        });
        for (const [invalidIndex, text] of replay.invalidTexts.entries())
          emitComment(connection, h, {
            userId: `demo-invalid-${String(invalidIndex + 1).padStart(3, '0')}`,
            nickname: 'Người Xem Giả',
            text,
            eventId: `replay-invalid-${String(invalidIndex + 1).padStart(3, '0')}`,
          });
        emitComment(connection, h, {
          ...replay.staleComment,
          text: replay.staleComment.text.replace('{correct}', correct),
        });
      }

      h.scheduler.advance(3_000);
      if (index === 0) {
        emitComment(connection, h, replay.afterClose);
        expect(runtime.metrics.rejected.NOT_ACCEPTING).toBe(2);
      }
      if (index < replay.roundComments.length - 1) runUntilAccepting(h);
    }

    expect(runtime.engine.round?.closed).toHaveLength(replay.questionsPerRound);
    const answers = h.store.answersForRound(roundId);
    expect(answers).toHaveLength(replay.questionsPerRound + 1);
    const firstQuestionId = h.store.roundQuestions(roundId)[0]!.id;

    const playerRow = h.store.raw.prepare(
      'SELECT id, display_name AS displayName FROM players WHERE source = ? AND source_user_id = ?',
    ).get('TIKTOK', replay.primaryPlayer.userId) as { id: string; displayName: string } | undefined;
    expect(playerRow).toBeDefined();
    expect(playerRow!.displayName).toBe(replay.primaryPlayer.nicknames.at(-1));
    expect(h.store.raw.prepare('SELECT COUNT(*) AS n FROM players WHERE source_user_id = ?').get(replay.primaryPlayer.userId))
      .toMatchObject({ n: 1 });
    const firstQuestionAnswers = answers.filter((answer) => answer.questionInstanceId === firstQuestionId);
    expect(firstQuestionAnswers).toHaveLength(2);
    expect(firstQuestionAnswers.find((answer) => answer.playerId === playerRow!.id)?.option).toBe(expectedOptions[0]);

    const changedPlayerId = h.store.raw.prepare(
      'SELECT id FROM players WHERE source = ? AND source_user_id = ?',
    ).get('TIKTOK', replay.changeOfMind.userId) as { id: string } | undefined;
    expect(changedPlayerId).toBeDefined();
    const changedAnswers = firstQuestionAnswers.filter((answer) => answer.playerId === changedPlayerId!.id);
    expect(changedAnswers).toHaveLength(1);
    expect(changedAnswers[0]!.option).toBe('A');

    const expectedStreakBonus = [100, 200, 300, 400, 500, 500, 500, 500, 500].reduce((sum, bonus) => sum + bonus, 0);
    const expectedKahootScore = replay.questionsPerRound * 1_000 + expectedStreakBonus;
    expect(h.store.ledgerTotals(roundId).get(playerRow!.id)).toBe(expectedKahootScore);
    expect(expectedKahootScore).toBe(13_500);
    expect(runtime.metrics.accepted).toBe(replay.questionsPerRound + 1);
    expect(runtime.metrics.rejected.DUPLICATE_EVENT).toBe(1);
    expect(runtime.metrics.rejected.DUPLICATE_ANSWER).toBe(2);
    expect(runtime.metrics.rejected.NOT_AN_ANSWER).toBe(replay.invalidTexts.length);
    expect(runtime.metrics.rejected.STALE_SOURCE_TIMESTAMP).toBe(1);
    expect(runtime.metrics.rejected.NOT_ACCEPTING).toBe(2);
  });

  it('mất mạng giữa câu: chờ backoff, resume thủ công, giữ đáp án cũ và nhận comment mới đúng một lần', async () => {
    const first = new ReplayConnection();
    const reconnected = new ReplayConnection();
    const h = await bootReplay([first, reconnected]);
    const sessionId = await createReplaySession(h, { questionsPerRound: 10 });
    await connectOverlay(h);
    const runtime = h.quiz.runtime()!;
    await command(h, sessionId, { type: 'OPEN_LOBBY' });
    await waitForOverlayAck(h);
    await command(h, sessionId, { type: 'START_ROUND' });
    runUntilAccepting(h);

    const correct = runtime.adminSnapshot().current!.correctOptionId;
    const originalEventId = 'replay-connection-before-drop';
    emitComment(first, h, {
      userId: 'demo-reconnect-player-01',
      nickname: 'Mây Sáng',
      text: correct,
      eventId: originalEventId,
    });
    expect(runtime.metrics.accepted).toBe(1);
    const originalRoundId = runtime.engine.round!.roundId;
    const firstQuestionId = h.store.roundQuestions(originalRoundId)[0]!.id;

    first.emit('disconnected', { reason: 'mất mạng giữa câu' });
    expect(h.adapter().status()).toBe('RECONNECTING');
    expect(runtime.engine.state).toBe('CONNECTION_INTERRUPTED');
    h.scheduler.advance(999);
    expect(reconnected.connects).toBe(0);
    h.scheduler.advance(1);
    await flush();
    expect(reconnected.connects).toBe(1);
    expect(h.adapter().status()).toBe('CONNECTED');
    expect(runtime.engine.state).toBe('CONNECTION_INTERRUPTED');
    expect(runtime.liveHealth().reconnects).toBe(1);

    await command(h, sessionId, { type: 'RESUME' });
    expect(runtime.engine.state).toBe('ACCEPTING');
    emitComment(reconnected, h, {
      userId: 'demo-reconnect-duplicate-02',
      nickname: 'Nắng Vàng',
      text: correct,
      eventId: originalEventId,
    });
    emitComment(reconnected, h, {
      userId: 'demo-reconnect-player-01',
      nickname: 'Mây Đổi Tên',
      text: otherOption(correct),
      eventId: 'replay-connection-second-answer',
    });
    emitComment(reconnected, h, {
      userId: 'demo-reconnect-player-03',
      nickname: 'Lá Sau Mưa',
      text: correct,
      eventId: 'replay-connection-new-answer',
    });

    const firstQuestionAnswers = h.store.answersForRound(originalRoundId)
      .filter((answer) => answer.questionInstanceId === firstQuestionId);
    const originalPlayer = h.store.raw.prepare(
      'SELECT id FROM players WHERE source = ? AND source_user_id = ?',
    ).get('TIKTOK', 'demo-reconnect-player-01') as { id: string } | undefined;
    expect(originalPlayer).toBeDefined();
    expect(firstQuestionAnswers).toHaveLength(2);
    expect(firstQuestionAnswers.filter((answer) => answer.playerId === originalPlayer!.id)).toHaveLength(1);
    expect(runtime.metrics.accepted).toBe(2);
    expect(runtime.metrics.rejected.DUPLICATE_EVENT).toBe(1);
    expect(runtime.metrics.rejected.DUPLICATE_ANSWER).toBe(1);
  });

  it('UserOfflineError không làm hỏng tạo phiên và để nguồn ở DISCONNECTED', async () => {
    const offline = new ReplayConnection();
    offline.failWith = new UserOfflineError('User is offline');
    const h = await bootReplay([offline]);

    const created = await h.inject('POST', '/api/sessions', {
      name: 'Phiên offline fixture',
      config: { mode: 'TIKTOK', tiktokUsername: 'synthetic_live', questionsPerRound: 10 },
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(h.quiz.runtime()?.liveHealth()).toMatchObject({
      status: 'DISCONNECTED',
      detail: expect.stringContaining('chưa phát LIVE'),
    });
    expect(offline.connects).toBe(1);
  });
});
