import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { ManualScheduler, TikTokLiveAdapter, type TikTokConnectionLike } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import { AUTH, TOKEN, makeQuestions, markCurrentWebBuild, tempDbPath } from './helpers';
import { testTempRoot } from '../support/tempRoot';

class FakeConn implements TikTokConnectionLike {
  handlers = new Map<string, ((d: any) => void)[]>();
  async connect() {
    return {};
  }
  async disconnect() {}
  on(ev: string, cb: (d: any) => void) {
    this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), cb]);
  }
  emit(ev: string, d: any) {
    for (const cb of this.handlers.get(ev) ?? []) cb(d);
  }
}

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const f of cleanup.splice(0)) await f();
});

async function bootTikTok() {
  const scheduler = new ManualScheduler();
  const store = new Store(tempDbPath());
  store.seedQuestions({ id: 'demo', name: 'Demo' }, makeQuestions(20), scheduler.now());
  const conn = new FakeConn();
  const tempRoot = testTempRoot('quiz-tiktok-preflight-');
  const webRoots = { assets: join(tempRoot, 'assets'), dashboard: join(tempRoot, 'dashboard'), overlay: join(tempRoot, 'overlay') };
  for (const directory of Object.values(webRoots)) mkdirSync(directory, { recursive: true });
  markCurrentWebBuild(webRoots.dashboard, webRoots.overlay);
  for (const relative of ['brand/logo.png', 'victory/trophy-stage.png', 'victory/bg.jpg', 'chibi/test.png', 'mc/kelly.png']) {
    const path = join(webRoots.assets, relative);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, 'test asset placeholder');
  }
  const quiz: QuizApp = await buildApp({
    store,
    scheduler,
    adminToken: TOKEN,
    repositoryRoot: process.cwd(),
    webRoots,
    adapterFactory: (mode, config) =>
      new TikTokLiveAdapter({ username: config.tiktokUsername!, scheduler, createConnection: () => conn }),
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
    rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });
  const inject = (method: 'GET' | 'POST', url: string, payload?: unknown) =>
    quiz.app.inject({ method, url, headers: AUTH, ...(payload ? { payload } : {}) });
  return { scheduler, store, conn, quiz, port, sockets, inject };
}

async function connectOverlay(h: Awaited<ReturnType<typeof bootTikTok>>) {
  const socket = new WebSocket(`ws://127.0.0.1:${h.port}/ws`);
  h.sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout ACK overlay trong test TikTok.')), 5_000);
    socket.on('error', reject);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' })));
    socket.on('message', (data) => {
      let message: { type?: string; stateVersion?: number };
      try { message = JSON.parse(String(data)) as typeof message; } catch { return; }
      if (message.type !== 'STATE_SNAPSHOT' || typeof message.stateVersion !== 'number') return;
      socket.send(JSON.stringify({ type: 'ACK', stateVersion: message.stateVersion, role: 'program' }));
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function waitForOverlayAck(h: Awaited<ReturnType<typeof bootTikTok>>) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await h.inject('GET', '/api/preflight');
    if (response.json().checks.find((item: { id: string }) => item.id === 'overlayAck')?.status === 'PASS') return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Overlay chưa ACK trạng thái phiên.');
}

const chat = (userId: string, text: string, msgId: string, at: number) => ({
  common: { msgId, createTime: String(at) },
  user: { id: userId, nickname: `Người xem ${userId}` },
  content: text,
});

describe('Phiên TIKTOK (adapter cộng đồng, kết nối giả)', () => {
  it('route duyệt/từ chối câu lưu question_versions và trả 404 cho câu không tồn tại', async () => {
    const h = await bootTikTok();
    const questions = h.store.listQuestions('demo');
    const approveQuestion = questions[0]!;
    const rejectQuestion = questions[1]!;

    const approved = await h.inject('POST', `/api/questions/${approveQuestion.id}/approve`, {
      decision: 'APPROVE',
      operatorId: 'reviewer-approve',
    });
    expect(approved.statusCode).toBe(200);
    expect(approved.json().question).toMatchObject({
      id: approveQuestion.id,
      approvalStatus: 'APPROVED',
      verificationStatus: 'OPERATOR_VERIFIED',
    });

    const rejected = await h.inject('POST', `/api/questions/${rejectQuestion.id}/approve`, {
      decision: 'REJECT',
      operatorId: 'reviewer-reject',
    });
    expect(rejected.statusCode).toBe(200);
    expect(rejected.json().question).toMatchObject({
      id: rejectQuestion.id,
      approvalStatus: 'REJECTED',
      verificationStatus: 'DEMO',
    });

    expect((await h.inject('POST', '/api/questions/missing-question/approve', {
      decision: 'APPROVE',
    })).statusCode).toBe(404);

    const versions = h.store.raw
      .prepare('SELECT question_id AS questionId, snapshot_json AS snapshotJson, edited_by AS editedBy FROM question_versions')
      .all() as { questionId: string; snapshotJson: string; editedBy: string }[];
    expect(versions).toHaveLength(2);
    expect(versions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        questionId: approveQuestion.id,
        snapshotJson: JSON.stringify(approved.json().question),
        editedBy: 'APPROVE:reviewer-approve',
      }),
      expect.objectContaining({
        questionId: rejectQuestion.id,
        snapshotJson: JSON.stringify(rejected.json().question),
        editedBy: 'REJECT:reviewer-reject',
      }),
    ]));
  });

  it('bắt buộc username; câu DEMO không vào LIVE; người dùng duyệt câu → vòng chạy, bình luận thật được chấm', async () => {
    const h = await bootTikTok();
    expect((await h.inject('POST', '/api/sessions', { config: { mode: 'TIKTOK' } })).statusCode).toBe(422);
    expect((await h.inject('POST', '/api/sessions', { config: { mode: 'TIKTOK', tiktokUsername: '@ff', allowDemoQuestions: true } })).statusCode).toBe(422);

    const created = await h.inject('POST', '/api/sessions', { config: { mode: 'TIKTOK', tiktokUsername: '@bvdc_official', questionsPerRound: 10, seed: 3 } });
    expect(created.statusCode, created.body).toBe(201);
    const sid = created.json().sessionId as string;
    await new Promise((r) => setTimeout(r, 0));
    const rt = h.quiz.runtime()!;
    expect(rt.adminSnapshot().live).toMatchObject({ source: 'TIKTOK', status: 'CONNECTED' });
    await connectOverlay(h);

    const cmd = async (command: object) => {
      const res = await h.inject('POST', `/api/sessions/${sid}/commands`, {
        commandId: randomUUID(),
        expectedStateVersion: rt.engine.stateVersion,
        operatorId: 'op',
        requestedAtMs: h.scheduler.now(),
        command,
      });
      return { status: res.statusCode, body: res.json() };
    };
    expect((await cmd({ type: 'OPEN_LOBBY' })).status).toBe(200);
    await waitForOverlayAck(h);
    // Toàn bộ câu đang là DEMO (chưa duyệt) → không được vào LIVE thật
    const blocked = await cmd({ type: 'START_ROUND' });
    expect(blocked.body.code).toBe('PREFLIGHT_FAILED');

    // Người dùng duyệt 10 câu
    const qs = (await h.inject('GET', '/api/questions')).json() as { id: string }[];
    for (const q of qs.slice(0, 10)) {
      const r = await h.inject('POST', `/api/questions/${q.id}/approve`, { decision: 'APPROVE', operatorId: 'nguoi-dung' });
      expect(r.json().question).toMatchObject({ approvalStatus: 'APPROVED', verificationStatus: 'OPERATOR_VERIFIED' });
    }
    expect((await h.inject('POST', '/api/questions/khong-co/approve', { decision: 'APPROVE' })).statusCode).toBe(404);
    const versions = h.store.raw.prepare('SELECT COUNT(*) AS n FROM question_versions').get() as { n: number };
    expect(versions.n).toBe(10);

    await waitForOverlayAck(h);
    expect((await cmd({ type: 'START_ROUND' })).status).toBe(200);
    for (let i = 0; i < 40 && rt.engine.state !== 'ACCEPTING'; i++) h.scheduler.advance(250);
    expect(rt.engine.state).toBe('ACCEPTING');
    const snap = rt.adminSnapshot().current!;

    const now = h.scheduler.now();
    h.conn.emit('chat', chat('1001', ` ${snap.correctOptionId.toLowerCase()} `, 'm1', now)); // đúng
    h.conn.emit('chat', chat('1001', 'B', 'm2', now)); // spam cùng người → không đổi
    h.conn.emit('chat', chat('1002', 'xin chào', 'm3', now)); // không phải đáp án
    h.conn.emit('chat', chat('1003', 'A', 'm1', now)); // trùng msgId → loại
    h.conn.emit('chat', { user: { nickname: 'không id' }, content: 'A', common: { msgId: 'm9' } }); // không có mã ổn định → bỏ
    expect(rt.metrics.accepted).toBe(1);
    expect(rt.metrics.rejected.DUPLICATE_ANSWER).toBe(1);
    expect(rt.metrics.rejected.NOT_AN_ANSWER).toBe(1);
    expect(rt.metrics.rejected.DUPLICATE_EVENT).toBe(1);
    expect(rt.adminSnapshot().live.commentsReceived).toBe(4);

    for (let i = 0; i < 100 && rt.engine.state === 'ACCEPTING'; i++) h.scheduler.advance(250);
    // Kahoot: trả lời gần như ngay khi mở → gần 1000 (500–1000)
    const total = h.store.ledgerTotals(rt.engine.round!.roundId).get('TIKTOK:1001')!;
    expect(total).toBeGreaterThan(980);
    expect(total).toBeLessThanOrEqual(1000);
  });

  it('mất kết nối TikTok giữa câu → treo câu, adapter tự nối lại nhưng câu KHÔNG tự chạy tiếp', async () => {
    const h = await bootTikTok();
    for (const q of (await h.inject('GET', '/api/questions')).json() as { id: string }[])
      await h.inject('POST', `/api/questions/${q.id}/approve`, { decision: 'APPROVE' });
    const sid = (await h.inject('POST', '/api/sessions', { config: { mode: 'TIKTOK', tiktokUsername: 'bvdc_official', questionsPerRound: 10 } })).json()
      .sessionId as string;
    await new Promise((r) => setTimeout(r, 0));
    const rt = h.quiz.runtime()!;
    await connectOverlay(h);
    const cmd = (command: object) =>
      h.inject('POST', `/api/sessions/${sid}/commands`, {
        commandId: randomUUID(),
        expectedStateVersion: rt.engine.stateVersion,
        operatorId: 'op',
        requestedAtMs: h.scheduler.now(),
        command,
      });
    await cmd({ type: 'OPEN_LOBBY' });
    await waitForOverlayAck(h);
    await cmd({ type: 'START_ROUND' });
    for (let i = 0; i < 40 && rt.engine.state !== 'ACCEPTING'; i++) h.scheduler.advance(250);

    h.conn.emit('disconnected', { reason: 'mạng chập chờn' });
    expect(rt.engine.state).toBe('CONNECTION_INTERRUPTED');
    expect(rt.adminSnapshot().live.detail).toContain('mạng chập chờn');
    h.scheduler.advance(2_000); // backoff → tự kết nối lại
    await new Promise((r) => setTimeout(r, 0));
    expect(rt.adminSnapshot().live.status).toBe('CONNECTED');
    expect(rt.engine.state).toBe('CONNECTION_INTERRUPTED');
    expect((await cmd({ type: 'RESUME' })).statusCode).toBe(200);
    expect(rt.engine.state).toBe('ACCEPTING');
  });
});
