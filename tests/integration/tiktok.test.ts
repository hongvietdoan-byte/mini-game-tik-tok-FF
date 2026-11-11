import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { ManualScheduler, TikTokLiveAdapter, type TikTokConnectionLike } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import { AUTH, TOKEN, makeQuestions, tempDbPath } from './helpers';

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
  const quiz: QuizApp = await buildApp({
    store,
    scheduler,
    adminToken: TOKEN,
    adapterFactory: (mode, config) =>
      new TikTokLiveAdapter({ username: config.tiktokUsername!, scheduler, createConnection: () => conn }),
  });
  cleanup.push(async () => {
    await quiz.close();
    store.close();
  });
  const inject = (method: 'GET' | 'POST', url: string, payload?: unknown) =>
    quiz.app.inject({ method, url, headers: AUTH, ...(payload ? { payload } : {}) });
  return { scheduler, store, conn, quiz, inject };
}

const chat = (userId: string, text: string, msgId: string, at: number) => ({
  common: { msgId, createTime: String(at) },
  user: { id: userId, nickname: `Người xem ${userId}` },
  content: text,
});

describe('Phiên TIKTOK (adapter cộng đồng, kết nối giả)', () => {
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
    // Toàn bộ câu đang là DEMO (chưa duyệt) → không được vào LIVE thật
    const blocked = await cmd({ type: 'START_ROUND' });
    expect(blocked.body.code).toBe('INSUFFICIENT_QUESTIONS');

    // Người dùng duyệt 10 câu
    const qs = (await h.inject('GET', '/api/questions')).json() as { id: string }[];
    for (const q of qs.slice(0, 10)) {
      const r = await h.inject('POST', `/api/questions/${q.id}/approve`, { decision: 'APPROVE', operatorId: 'nguoi-dung' });
      expect(r.json().question).toMatchObject({ approvalStatus: 'APPROVED', verificationStatus: 'OPERATOR_VERIFIED' });
    }
    expect((await h.inject('POST', '/api/questions/khong-co/approve', { decision: 'APPROVE' })).statusCode).toBe(404);
    const versions = h.store.raw.prepare('SELECT COUNT(*) AS n FROM question_versions').get() as { n: number };
    expect(versions.n).toBe(10);

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
    expect(h.store.ledgerTotals(rt.engine.round!.roundId).get('TIKTOK:1001')).toBe(100);
  });

  it('mất kết nối TikTok giữa câu → treo câu, adapter tự nối lại nhưng câu KHÔNG tự chạy tiếp', async () => {
    const h = await bootTikTok();
    for (const q of (await h.inject('GET', '/api/questions')).json() as { id: string }[])
      await h.inject('POST', `/api/questions/${q.id}/approve`, { decision: 'APPROVE' });
    const sid = (await h.inject('POST', '/api/sessions', { config: { mode: 'TIKTOK', tiktokUsername: 'bvdc_official', questionsPerRound: 10 } })).json()
      .sessionId as string;
    await new Promise((r) => setTimeout(r, 0));
    const rt = h.quiz.runtime()!;
    const cmd = (command: object) =>
      h.inject('POST', `/api/sessions/${sid}/commands`, {
        commandId: randomUUID(),
        expectedStateVersion: rt.engine.stateVersion,
        operatorId: 'op',
        requestedAtMs: h.scheduler.now(),
        command,
      });
    await cmd({ type: 'OPEN_LOBBY' });
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
