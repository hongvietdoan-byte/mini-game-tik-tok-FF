import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { ManualScheduler } from '@quiz/live-adapters';
import { AUTH, TOKEN, boot, command, createSession, rt, runUntil, tempDbPath, type Harness } from './helpers';

const open: Harness[] = [];

/** Chờ tới khi điều kiện đúng (WS là bất đồng bộ; máy bận có thể chậm) — tối đa 5 s. */
async function waitFor(cond: () => boolean | Promise<boolean>, ms = 5_000) {
  const end = Date.now() + ms;
  while (!(await cond())) {
    if (Date.now() > end) throw new Error('waitFor: hết thời gian chờ');
    await new Promise((r) => setTimeout(r, 20));
  }
}
afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

async function session(opts: Parameters<typeof boot>[0] = {}) {
  const h = await createSession(await boot(opts));
  open.push(h);
  return h;
}

async function toAccepting(h: Harness) {
  await command(h, { type: 'OPEN_LOBBY' });
  await command(h, { type: 'START_ROUND' });
  runUntil(h, () => rt(h).engine.state === 'ACCEPTING');
}

describe('V3.1 — chống trùng comment bền vững', () => {
  it('eventId đã xử lý trước khi khởi động lại không bao giờ được tính lại', async () => {
    const dbPath = tempDbPath();
    const h = await session({ dbPath });
    await toAccepting(h);
    expect(rt(h).ingest({ source: 'MOCK', userId: 'u1', displayName: 'u1', text: 'A', eventId: 'ev-1' })).toEqual({ accepted: true });
    h.scheduler.advance(2_000);

    // crash: không STOP, mở lại DB
    await h.quiz.close();
    h.store.close();
    open.splice(open.indexOf(h), 1);
    const h2b = await boot({ dbPath, scheduler: new ManualScheduler(h.scheduler.now() + 5_000), seedQuestions: false });
    await h2b.quiz.recover();
    await Promise.resolve();
    const h2: Harness = { ...h2b, sessionId: h.sessionId };
    open.push(h2);
    expect((await command(h2, { type: 'RESOLVE_RECOVERY', decision: 'RESUME', reason: 'khôi phục' })).status).toBe(200);

    // nguồn phát lại comment cũ (cùng eventId) từ NGƯỜI KHÁC lẫn cùng người → bị loại vì DUPLICATE_EVENT
    expect(rt(h2).ingest({ source: 'MOCK', userId: 'u2', displayName: 'u2', text: 'B', eventId: 'ev-1' })).toEqual({
      accepted: false,
      reason: 'DUPLICATE_EVENT',
    });
    expect(rt(h2).ingest({ source: 'MOCK', userId: 'u2', displayName: 'u2', text: 'B', eventId: 'ev-2' })).toEqual({ accepted: true });
  });
});

describe('V3.1 — Connection Manager, kiểm tra hệ thống, ACK overlay', () => {
  it('overlay đang mở nhận snapshot của phiên mới ngay sau khi phiên cũ STOP', async () => {
    const h = await session();
    await h.quiz.app.listen({ host: '127.0.0.1', port: 0 });
    const port = (h.quiz.app.server.address() as { port: number }).port;
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
      headers: { origin: `http://localhost:${port}` },
    });
    const messages: { type: string; sessionId: string; payload?: { state?: string } }[] = [];
    socket.on('message', (data) => messages.push(JSON.parse(String(data))));
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('open', () => {
          socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' }));
          resolve();
        });
        socket.once('error', reject);
      });

      await waitFor(() => messages.some((message) => message.type === 'STATE_SNAPSHOT' && message.sessionId === h.sessionId));
      await command(h, { type: 'OPEN_LOBBY' });
      await waitFor(() => messages.some((message) => message.type === 'STATE_SNAPSHOT' && message.payload?.state === 'LOBBY'));
      await command(h, { type: 'STOP', reason: 'Operator thay phiên MOCK' });
      await waitFor(() => messages.some((message) => message.type === 'STATE_SNAPSHOT' && message.sessionId === h.sessionId && message.payload?.state === 'IDLE'));

      const previousSessionId = h.sessionId;
      const messagesBeforeNewSession = messages.length;
      const next = await createSession(h);
      h.sessionId = next.sessionId;
      await waitFor(() => messages.slice(messagesBeforeNewSession).some((message) =>
        message.type === 'STATE_SNAPSHOT' && message.sessionId === next.sessionId,
      ));
      expect(next.sessionId).not.toBe(previousSessionId);
    } finally {
      if (socket.readyState < WebSocket.CLOSING) socket.close();
      await waitFor(() => socket.readyState === WebSocket.CLOSED);
    }
  });

  it('tình trạng nguồn: comment gần nhất, số comment, reconnect; DISCONNECT giữa câu treo câu hỏi', async () => {
    const h = await session();
    await toAccepting(h);
    const r = rt(h);
    expect(r.adminSnapshot().live.status).toBe('CONNECTED');
    expect(r.adminSnapshot().live.connectedSinceMs).not.toBeNull();
    r.ingest({ source: 'MOCK', userId: 'u1', displayName: 'u1', text: 'xin chào' });
    const live = r.adminSnapshot().live;
    expect(live.commentsReceived).toBe(1);
    expect(live.lastCommentAtMs).toBe(h.scheduler.now());

    const off = await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/source`, headers: AUTH, payload: { action: 'DISCONNECT' } });
    expect(off.statusCode).toBe(200);
    expect(r.engine.state).toBe('CONNECTION_INTERRUPTED');
    const on = await h.quiz.app.inject({ method: 'POST', url: `/api/sessions/${h.sessionId}/source`, headers: AUTH, payload: { action: 'RECONNECT' } });
    expect(on.json().health.status).toBe('CONNECTED');
    expect(on.json().health.reconnects).toBe(1);
    // có kết nối lại cũng KHÔNG tự chạy tiếp
    expect(r.engine.state).toBe('CONNECTION_INTERRUPTED');
  });

  it('kiểm tra hệ thống: PASS/FAIL/NOT_TESTED đúng; tự kiểm pipeline PASS; overlay ACK → bước 9 PASS', async () => {
    const h = await session();
    const checks = async () =>
      Object.fromEntries(
        ((await h.quiz.app.inject({ method: 'GET', url: '/api/system/checks', headers: AUTH })).json().checks as {
          id: string;
          status: string;
        }[]).map((c) => [c.id, c.status]),
      );
    expect((await h.quiz.app.inject({ method: 'GET', url: '/api/system/checks' })).statusCode).toBe(401);

    let c = await checks();
    expect(c).toMatchObject({
      backend: 'PASS',
      database: 'PASS',
      theme: 'NOT_TESTED',
      overlay: 'FAIL',
      mockComment: 'NOT_TESTED',
      tiktokConnector: 'NOT_TESTED',
      testComment: 'NOT_TESTED',
      engineRecorded: 'NOT_TESTED',
      overlayUpdated: 'NOT_TESTED',
    });

    const st = await h.quiz.app.inject({ method: 'POST', url: '/api/system/selftest', headers: AUTH });
    expect(st.json(), st.body).toMatchObject({ ok: true, mockComment: true, engineRecorded: true });
    // tự kiểm chạy trên DB tạm: phiên thật không bị ảnh hưởng
    expect(rt(h).engine.state).toBe('IDLE');
    expect(rt(h).metrics.received).toBe(0);

    await h.quiz.app.listen({ host: '127.0.0.1', port: 0 });
    const port = (h.quiz.app.server.address() as { port: number }).port;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const first = await new Promise<{ stateVersion: number }>((res) => {
      ws.once('open', () => ws.send(JSON.stringify({ type: 'HELLO', role: 'overlay' })));
      ws.once('message', (d) => res(JSON.parse(String(d))));
    });
    await waitFor(async () => (await checks()).overlay === 'PASS');
    c = await checks();
    expect(c.overlay).toBe('PASS');
    expect(c.overlayUpdated).toBe('FAIL'); // chưa ACK
    expect(c).toMatchObject({ mockComment: 'PASS', engineRecorded: 'PASS' });

    ws.send(JSON.stringify({ type: 'ACK', stateVersion: first.stateVersion }));
    await waitFor(async () => (await checks()).overlayUpdated === 'PASS');
    c = await checks();
    expect(c.overlayUpdated).toBe('PASS');
    expect(rt(h).adminSnapshot().overlay).toMatchObject({ clients: 1, lastAckStateVersion: first.stateVersion });

    // admin WS không gửi được ACK giả mạo overlay; overlay không gửi được lệnh
    const admin = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((res) => {
      admin.once('open', () => admin.send(JSON.stringify({ type: 'HELLO', role: 'admin', token: TOKEN })));
      admin.once('message', () => res());
    });
    admin.send(JSON.stringify({ type: 'ACK', stateVersion: 9999 }));
    await new Promise((r) => setTimeout(r, 150));
    expect(rt(h).adminSnapshot().overlay.lastAckStateVersion).toBe(first.stateVersion);
    ws.close();
    admin.close();
    await waitFor(() => rt(h).adminSnapshot().overlay.clients === 0);
    expect(rt(h).adminSnapshot().overlay.clients).toBe(0);
  });
});
