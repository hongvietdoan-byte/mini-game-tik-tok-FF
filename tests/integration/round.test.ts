import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { ManualScheduler } from '@quiz/live-adapters';
import { currentQuestionInstanceId, effectiveState } from '@quiz/quiz-core';
import {
  AUTH,
  TOKEN,
  boot,
  command,
  createSession,
  ledgerSums,
  referenceScores,
  rt,
  runUntil,
  storedScores,
  tempDbPath,
  type Harness,
} from './helpers';

const open: Harness[] = [];
afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

async function session(opts: Parameters<typeof boot>[0] = {}, config = {}) {
  const h = await createSession(await boot(opts), config);
  open.push(h);
  return h;
}

function roundId(h: Harness) {
  return rt(h).engine.round!.roundId;
}

function expectScoresMatchReference(h: Harness, rid: string) {
  const ref = referenceScores(h.store, rid);
  const stored = storedScores(h.store, rid);
  const sums = ledgerSums(h.store, rid);
  expect(stored.size).toBe(ref.size);
  for (const [p, r] of ref) {
    expect(stored.get(p), `player ${p}`).toEqual(r);
    expect(sums.get(p) ?? 0, `ledger ${p}`).toBe(r.score);
  }
  return ref;
}

function noDuplicates(h: Harness) {
  const dupAnswers = h.store.raw
    .prepare('SELECT COUNT(*) AS n FROM (SELECT 1 FROM answers GROUP BY question_instance_id, player_id HAVING COUNT(*) > 1)')
    .get() as { n: number };
  const dupLedger = h.store.raw
    .prepare(
      'SELECT COUNT(*) AS n FROM (SELECT 1 FROM score_events GROUP BY round_id, question_instance_id, player_id, score_reason HAVING COUNT(*) > 1)',
    )
    .get() as { n: number };
  expect(dupAnswers.n).toBe(0);
  expect(dupLedger.n).toBe(0);
}

async function startRound(h: Harness, simPlayers = 100) {
  if (simPlayers > 0) {
    const sim = await h.quiz.app.inject({
      method: 'POST',
      url: `/api/sessions/${h.sessionId}/simulator`,
      headers: AUTH,
      payload: { action: 'START', players: simPlayers, seed: 7 },
    });
    expect(sim.statusCode).toBe(200);
  }
  expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
  const res = await command(h, { type: 'START_ROUND' });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  expect(rt(h).engine.state).toBe('PREPARE');
}

describe('kết quả người trả lời đúng nhanh nhất', () => {
  it('công bố thời gian, mã ghế và tên alias an toàn từ REVEAL sang BXH ngắn', async () => {
    const h = await session();
    await startRound(h, 0);
    const runtime = rt(h);
    runUntil(h, () => runtime.engine.state === 'ACCEPTING');

    const question = h.store.roundQuestions(roundId(h))[0]!;
    const correctOptionId = question.snapshot.correctOptionId;
    const wrongOptionId = correctOptionId === 'A' ? 'B' : 'A';
    runtime.ingest({ source: 'TIKTOK', userId: 'raw-user-too-early', displayName: 'Too Early', text: wrongOptionId, eventId: 'fastest-wrong' });
    h.scheduler.advance(1_234);
    expect(runtime.ingest({ source: 'TIKTOK', userId: 'raw-user-fast', displayName: 'Fast Player', text: correctOptionId, eventId: 'fastest-first' })).toEqual({ accepted: true });
    expect(runtime.ingest({ source: 'TIKTOK', userId: 'raw-user-tie', displayName: 'Tie Player', text: correctOptionId, eventId: 'fastest-tie' })).toEqual({ accepted: true });
    expect(runtime.publicSnapshot().fastestCorrectAnswer).toBeNull();

    const internalPlayerId = h.store.findPlayerId('TIKTOK', 'raw-user-fast')!;
    const hidden = await h.quiz.app.inject({
      method: 'POST',
      url: '/api/admin/name-filter/players/visibility',
      headers: AUTH,
      payload: { playerIds: [internalPlayerId], hidden: true },
    });
    expect(hidden.statusCode).toBe(200);
    runUntil(h, () => runtime.engine.state === 'REVEAL');

    const atReveal = runtime.publicSnapshot();
    const fastest = atReveal.fastestCorrectAnswer!;
    expect(fastest).toMatchObject({
      questionInstanceId: question.id,
      publicPlayerId: expect.any(String),
      seatId: expect.any(String),
      safeDisplayName: 'Người chơi 1',
      responseMs: 1_234,
    });
    expect(atReveal.leaderboard!.entries.find((entry) => entry.playerId === fastest.publicPlayerId)?.safeDisplayName)
      .toBe(fastest.safeDisplayName);
    expect(atReveal.audience!.seats.find((seat) => seat.slotId === fastest.seatId)?.occupant?.safeDisplayName)
      .toBe(fastest.safeDisplayName);
    const publicJson = JSON.stringify(atReveal);
    expect(publicJson).not.toContain('TIKTOK:');
    expect(publicJson).not.toContain('raw-user-');
    expect(publicJson).not.toContain('Fast Player');

    runUntil(h, () => runtime.engine.state === 'LEADERBOARD');
    expect(runtime.publicSnapshot().fastestCorrectAnswer).toEqual(fastest);
  });

  it('returns null when nobody answers correctly', async () => {
    const h = await session();
    await startRound(h, 0);
    const runtime = rt(h);
    runUntil(h, () => runtime.engine.state === 'ACCEPTING');
    const question = h.store.roundQuestions(roundId(h))[0]!;
    const wrongOptionId = question.snapshot.correctOptionId === 'A' ? 'B' : 'A';
    runtime.ingest({ source: 'MOCK', userId: 'wrong-only', displayName: 'Wrong Only', text: wrongOptionId, eventId: 'fastest-no-correct' });
    runUntil(h, () => runtime.engine.state === 'REVEAL');

    expect(runtime.publicSnapshot().fastestCorrectAnswer).toBeNull();
  });
});

describe('Vòng MOCK 15 câu × 100 người chơi mô phỏng', () => {
  it('chạy trọn vòng, điểm khớp bản tính tham chiếu độc lập, không chấm trùng', async () => {
    const h = await session();
    await startRound(h);
    const rid = roundId(h);
    runUntil(h, () => rt(h).engine.state === 'VICTORY', 250);

    const r = rt(h);
    expect(r.engine.round!.closed).toHaveLength(15);
    const status = h.store.raw.prepare('SELECT status FROM rounds WHERE id = ?').get(rid) as { status: string };
    expect(status.status).toBe('COMPLETED');
    const qStatus = h.store.raw
      .prepare("SELECT COUNT(*) AS n FROM round_questions WHERE round_id = ? AND status = 'CLOSED'")
      .get(rid) as { n: number };
    expect(qStatus.n).toBe(15);

    const ref = expectScoresMatchReference(h, rid);
    expect(ref.size).toBeGreaterThan(80);
    expect(ref.size).toBeLessThanOrEqual(100);
    noDuplicates(h);

    // Mô phỏng có spam, trễ, nhiễu → bộ đếm từ chối phải ghi nhận.
    expect(r.metrics.accepted).toBeGreaterThan(1000);
    expect(r.metrics.rejected.DUPLICATE_ANSWER).toBeGreaterThan(0);
    expect(r.metrics.rejected.NOT_AN_ANSWER).toBeGreaterThan(0);
    expect(r.metrics.rejected.NOT_ACCEPTING + r.metrics.rejected.LATE).toBeGreaterThan(0);
    expect(r.metrics.rejected.DUPLICATE_EVENT).toBeGreaterThan(0);

    // Huy hiệu Top 1 liên tiếp: người đang hạng 1 có top1Streak ≥ 1 khớp lịch sử bảng xếp hạng; người khác không có
    const top = r.publicSnapshot().leaderboard!.entries;
    for (const e of top) if (e.rank === 1) expect(e.top1Streak).toBeGreaterThanOrEqual(1);
    for (const e of top) if (e.rank !== 1) expect(e.top1Streak).toBeUndefined();

    // Leaderboard cuối: ≤ 10, hạng không giảm, podium có trong VICTORY.
    const pub = r.publicSnapshot();
    expect(pub.scene).toBe('VICTORY');
    expect(pub.leaderboard!.entries.length).toBe(10);
    const ranks = pub.leaderboard!.entries.map((e) => e.rank);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(pub.podium!.slots.length).toBeGreaterThan(0);
    const finals = h.store.raw
      .prepare("SELECT COUNT(*) AS n FROM leaderboard_snapshots WHERE round_id = ? AND kind = 'FINAL'")
      .get(rid) as { n: number };
    expect(finals.n).toBe(1);

    // Hết vòng → INTERMISSION → LOBBY, câu hỏi vòng sau không lặp vòng trước
    runUntil(h, () => rt(h).engine.state === 'LOBBY', 500);
    expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
    const used = h.store.raw
      .prepare(
        'SELECT COUNT(*) AS n FROM (SELECT question_id FROM round_questions rq JOIN rounds r ON r.id = rq.round_id WHERE r.session_id = ? GROUP BY question_id HAVING COUNT(*) > 1)',
      )
      .get(h.sessionId) as { n: number };
    expect(used.n).toBe(0);
  });

  it('cùng seed → cùng bộ câu hỏi, cùng thứ tự đáp án đã xáo (tất định); seed khác → khác', async () => {
    // Ghi chú: hành vi của simulator phụ thuộc questionInstanceId (chứa sessionId ngẫu nhiên),
    // nên chỉ so phần do engine quyết định: chọn câu + xáo đáp án.
    const run = async (seed: number) => {
      const h = await session({}, { seed });
      await startRound(h, 0);
      const rid = roundId(h);
      return (h.store.raw.prepare('SELECT snapshot_json AS s FROM round_questions WHERE round_id = ? ORDER BY position').all(rid) as {
        s: string;
      }[]).map((x) => {
        const s = JSON.parse(x.s);
        return { q: s.questionId, opts: s.options.map((o: { originalOptionId: string }) => o.originalOptionId), c: s.correctOptionId };
      });
    };
    const a = await run(42);
    const b = await run(42);
    const c = await run(43);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('Nhận đáp án', () => {
  it('chỉ nhận trong ACCEPTING, đáp án đầu tiên thắng, eventId trùng bị loại', async () => {
    const h = await session();
    await startRound(h, 0);
    const r = rt(h);
    const send = (userId: string, text: string, eventId?: string) => r.ingest({ source: 'MOCK', userId, displayName: userId, text, ...(eventId ? { eventId } : {}) });

    expect(send('u1', 'A')).toEqual({ accepted: false, reason: 'NOT_ACCEPTING' }); // PREPARE
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    expect(send('u1', 'đáp án A')).toEqual({ accepted: false, reason: 'NOT_AN_ANSWER' });
    expect(send('u1', ' b ', 'e1')).toEqual({ accepted: true });
    expect(send('u1', 'C', 'e2')).toEqual({ accepted: false, reason: 'DUPLICATE_ANSWER' });
    expect(send('u2', 'C', 'e1')).toEqual({ accepted: false, reason: 'DUPLICATE_EVENT' });
    expect(send('u2', 'Ｄ')).toEqual({ accepted: true });
    expect(send('', 'A')).toEqual({ accepted: false, reason: 'INVALID_EVENT' });

    const qid = currentQuestionInstanceId(r.engine)!;
    expect(h.store.optionCounts(qid)).toEqual({ A: 0, B: 1, C: 0, D: 1 });
    // ACCEPTING công khai chỉ có tổng
    h.scheduler.advance(300);
    expect(r.publicSnapshot().answerCount).toBe(2);
    expect(r.publicSnapshot().reveal).toBeNull();

    // sát hạn chót vẫn nhận; hết giờ → REVEAL, mọi comment sau bị loại
    const deadline = r.engine.timer!.deadlineMs!;
    h.scheduler.advance(deadline - h.scheduler.now() - 1);
    expect(send('u3', 'A')).toEqual({ accepted: true });
    h.scheduler.advance(1);
    expect(r.engine.state).toBe('REVEAL');
    expect(send('u4', 'A')).toEqual({ accepted: false, reason: 'NOT_ACCEPTING' });
    expect(r.publicSnapshot().reveal!.optionCounts).toEqual({ A: 1, B: 1, C: 0, D: 1 });
  });

  it('cách ly sự kiện có sourceTimestamp cũ (bị đệm từ trước khi câu mở)', async () => {
    const h = await session();
    await startRound(h, 0);
    const r = rt(h);
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    const res = r.ingest({ source: 'MOCK', userId: 'u1', displayName: 'u1', text: 'A', sourceTimestampMs: h.scheduler.now() - 60_000 });
    expect(res).toEqual({ accepted: false, reason: 'STALE_SOURCE_TIMESTAMP' });
  });
});

describe('Lệnh operator', () => {
  it('lệnh dựa trên stateVersion cũ → 409; gửi lại cùng commandId → không chuyển trạng thái lần hai', async () => {
    const h = await session();
    const v0 = rt(h).engine.stateVersion;
    const id = randomUUID();
    const first = await command(h, { type: 'OPEN_LOBBY' }, { commandId: id });
    expect(first.status).toBe(200);
    const v1 = rt(h).engine.stateVersion;
    const again = await command(h, { type: 'OPEN_LOBBY' }, { commandId: id, expectedStateVersion: v0 });
    expect(again.status).toBe(200);
    expect(again.body.duplicate).toBe(true);
    expect(rt(h).engine.stateVersion).toBe(v1);

    const stale = await command(h, { type: 'PAUSE' }, { expectedStateVersion: v0 });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('STALE_STATE_VERSION');
    expect(rt(h).engine.state).toBe('LOBBY');

    const audit = h.store.raw.prepare('SELECT COUNT(*) AS n FROM operator_actions WHERE session_id = ?').get(h.sessionId) as { n: number };
    expect(audit.n).toBe(2); // OPEN_LOBBY (một lần) + PAUSE bị từ chối
  });

  it('hành động nguy hiểm bắt buộc lý do; thiếu token → 401; Origin lạ → 403', async () => {
    const h = await session();
    await command(h, { type: 'OPEN_LOBBY' });
    const noReason = await command(h, { type: 'STOP', reason: '' } as never);
    expect(noReason.status).toBe(422);
    expect(noReason.body.code).toBe('VALIDATION_FAILED');
    expect((await command(h, { type: 'PAUSE' }, { headers: {} })).status).toBe(401);
    expect((await command(h, { type: 'PAUSE' }, { headers: { ...AUTH, origin: 'https://evil.example' } })).status).toBe(403);
    expect((await command(h, { type: 'PAUSE' }, { headers: { ...AUTH, origin: 'http://127.0.0.1:5173' } })).status).toBe(200);
  });

  it('không đủ câu hỏi → INSUFFICIENT_QUESTIONS, không đổi trạng thái; allowReuse=true mới cho lặp', async () => {
    const h = await session({ questions: 10 });
    await command(h, { type: 'OPEN_LOBBY' });
    const res = await command(h, { type: 'START_ROUND' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_QUESTIONS');
    expect(rt(h).engine.state).toBe('LOBBY');
    expect((await command(h, { type: 'START_ROUND', questionCount: 10 })).status).toBe(200);
  });

  it('VOID_QUESTION sau reveal: bút toán đảo, điểm tính lại khớp tham chiếu, sổ cái cũ giữ nguyên', async () => {
    const h = await session();
    await startRound(h);
    const r = rt(h);
    const rid = roundId(h);
    runUntil(h, () => r.engine.state === 'REVEAL' && r.engine.round!.questionIndex === 1);
    const beforeRows = h.store.ledgerRows(rid);
    const before = beforeRows.length;
    const res = await command(h, { type: 'VOID_QUESTION', reason: 'Câu hỏi có hai đáp án đúng' });
    expect(res.status).toBe(200);
    const rows = h.store.ledgerRows(rid);
    expect(rows.length).toBeGreaterThan(before);
    expect(rows.slice(0, before)).toEqual(beforeRows); // chỉ ghi thêm, không sửa/xoá dòng cũ
    expect(rows.some((x) => x.reason.startsWith('VOID_REVERSAL:'))).toBe(true);
    expectScoresMatchReference(h, rid);
    runUntil(h, () => r.engine.state === 'VICTORY', 250);
    expectScoresMatchReference(h, rid);
    noDuplicates(h);
  });

  it('mất kết nối giữa câu → CONNECTION_INTERRUPTED; có mạng lại không tự chạy; RESUME mới chạy tiếp', async () => {
    const h = await session();
    await startRound(h, 0);
    const r = rt(h);
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    const lose = await h.quiz.app.inject({
      method: 'POST',
      url: `/api/sessions/${h.sessionId}/connection`,
      headers: AUTH,
      payload: { action: 'LOSE' },
    });
    expect(lose.statusCode).toBe(200);
    expect(r.engine.state).toBe('CONNECTION_INTERRUPTED');
    expect(r.publicSnapshot().scene).toBe('CONNECTION_LOST');
    const frozen = r.publicSnapshot().timer!.remainingMs;
    h.scheduler.advance(60_000);
    expect(r.engine.state).toBe('CONNECTION_INTERRUPTED');
    expect(r.publicSnapshot().timer!.remainingMs).toBe(frozen);
    expect((await command(h, { type: 'RESUME' })).body.code).toBe('CONNECTION_NOT_READY');
    await h.quiz.app.inject({
      method: 'POST',
      url: `/api/sessions/${h.sessionId}/connection`,
      headers: AUTH,
      payload: { action: 'RESTORE' },
    });
    expect(r.engine.state).toBe('CONNECTION_INTERRUPTED');
    expect((await command(h, { type: 'RESUME' })).status).toBe(200);
    expect(r.engine.state).toBe('ACCEPTING');
  });

  it('vòng không có ai tham gia vẫn kết thúc, không bịa người chơi', async () => {
    const h = await session();
    await startRound(h, 0);
    runUntil(h, () => rt(h).engine.state === 'VICTORY', 500);
    const pub = rt(h).publicSnapshot();
    expect(pub.leaderboard!.entries).toEqual([]);
    expect(pub.podium!.slots).toEqual([]);
  });
});

describe('Khởi động lại tiến trình (crash)', () => {
  async function crashAndRecover(h: Harness, dbPath: string, gapMs: number) {
    const lastBeat = h.store.getSession(h.sessionId)!.lastHeartbeatMs!;
    // "crash": bỏ runtime cũ, không gửi lệnh STOP, không ghi gì thêm
    await h.quiz.close();
    h.store.close();
    open.splice(open.indexOf(h), 1);
    const scheduler = new ManualScheduler(h.scheduler.now() + gapMs);
    const h2 = await boot({ dbPath, scheduler, seedQuestions: false });
    const recovered = await h2.quiz.recover();
    expect(recovered).not.toBeNull();
    await Promise.resolve();
    const h3: Harness = { ...h2, sessionId: h.sessionId };
    open.push(h3);
    return { h: h3, lastBeat };
  }

  it('crash giữa câu → PAUSED chờ operator, không tự chạy; RESUME rồi xong vòng, điểm vẫn khớp', async () => {
    const dbPath = tempDbPath();
    const h = await session({ dbPath });
    await startRound(h);
    const rid = roundId(h);
    runUntil(h, () => rt(h).engine.state === 'ACCEPTING' && rt(h).engine.round!.questionIndex === 2);
    h.scheduler.advance(5_000);
    const deadline = rt(h).engine.timer!.deadlineMs!;
    const scoresBefore = storedScores(h.store, rid);

    const { h: h2, lastBeat } = await crashAndRecover(h, dbPath, 120_000);
    const r = rt(h2);
    expect(r.engine.state).toBe('PAUSED');
    expect(r.engine.suspended).toEqual({ from: 'ACCEPTING', kind: 'RECOVERY' });
    expect(r.adminSnapshot().recoveryPending).toBe(true);
    expect(r.engine.timer!.remainingMs).toBe(Math.max(0, deadline - lastBeat));
    expect(storedScores(h2.store, rid)).toEqual(scoresBefore);

    // Thời gian trôi bao lâu cũng không tự chạy
    h2.scheduler.advance(10 * 60_000);
    expect(r.engine.state).toBe('PAUSED');
    const blocked = await command(h2, { type: 'MANUAL_NEXT' });
    expect(blocked.body.code).toBe('RECOVERY_PENDING');

    const resume = await command(h2, { type: 'RESOLVE_RECOVERY', decision: 'RESUME', reason: 'Khôi phục sau sự cố' });
    expect(resume.status, JSON.stringify(resume.body)).toBe(200);
    expect(r.engine.state).toBe('ACCEPTING');
    runUntil(h2, () => r.engine.state === 'VICTORY', 250);
    expectScoresMatchReference(h2, rid);
    noDuplicates(h2);
    expect(r.verifyIntegrity()).toBeNull();
  });

  it('crash ngay sau reveal → sổ cái không bị chấm lại, VOID qua recovery bị từ chối cho câu đã công bố', async () => {
    const dbPath = tempDbPath();
    const h = await session({ dbPath });
    await startRound(h);
    const rid = roundId(h);
    runUntil(h, () => rt(h).engine.state === 'REVEAL' && rt(h).engine.round!.questionIndex === 3);
    const ledgerBefore = h.store.ledgerRows(rid);

    const { h: h2 } = await crashAndRecover(h, dbPath, 30_000);
    const r = rt(h2);
    expect(r.engine.suspended).toEqual({ from: 'REVEAL', kind: 'RECOVERY' });
    expect(h2.store.ledgerRows(rid)).toEqual(ledgerBefore);
    const voidTry = await command(h2, { type: 'RESOLVE_RECOVERY', decision: 'VOID', reason: 'thử huỷ' });
    expect(voidTry.status).toBe(422);
    expect((await command(h2, { type: 'RESOLVE_RECOVERY', decision: 'RESUME', reason: 'tiếp tục' })).status).toBe(200);
    runUntil(h2, () => r.engine.state === 'VICTORY', 250);
    expectScoresMatchReference(h2, rid);
    noDuplicates(h2);
  });

  it('crash giữa câu rồi chọn Huỷ câu → câu VOIDED, vòng tiếp tục', async () => {
    const dbPath = tempDbPath();
    const h = await session({ dbPath });
    await startRound(h);
    const rid = roundId(h);
    runUntil(h, () => rt(h).engine.state === 'ACCEPTING' && rt(h).engine.round!.questionIndex === 0);
    h.scheduler.advance(4_000);
    const qid = currentQuestionInstanceId(rt(h).engine)!;
    const { h: h2 } = await crashAndRecover(h, dbPath, 5_000);
    const res = await command(h2, { type: 'RESOLVE_RECOVERY', decision: 'VOID', reason: 'Huỷ câu bị gián đoạn' });
    expect(res.status).toBe(200);
    const r = rt(h2);
    expect(effectiveState(r.engine)).toBe('PREPARE');
    const st = h2.store.raw.prepare('SELECT status FROM round_questions WHERE id = ?').get(qid) as { status: string };
    expect(st.status).toBe('VOIDED');
    runUntil(h2, () => r.engine.state === 'VICTORY', 250);
    expectScoresMatchReference(h2, rid);
  });
});

describe('WebSocket công khai', () => {
  it('không lộ đáp án đúng trước REVEAL; admin cần token', async () => {
    const h = await session();
    await h.quiz.app.listen({ host: '127.0.0.1', port: 0 });
    const port = (h.quiz.app.server.address() as { port: number }).port;
    const msgs: { raw: string; type: string; payload: any }[] = [];
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((res, rej) => {
      ws.once('open', () => res());
      ws.once('error', rej);
    });
    ws.on('message', (d) => {
      const raw = String(d);
      const m = JSON.parse(raw);
      msgs.push({ raw, type: m.type, payload: m.payload });
    });
    ws.send(JSON.stringify({ type: 'HELLO', role: 'overlay' }));
    const tick = () => new Promise((r) => setTimeout(r, 30));
    await tick();

    await startRound(h);
    for (let i = 0; i < 2000 && rt(h).engine.round!.questionIndex < 2; i++) {
      h.scheduler.advance(250);
      if (i % 4 === 0) await tick();
    }
    await tick();
    ws.close();

    expect(msgs.length).toBeGreaterThan(20);
    const seqs = msgs.map((m) => JSON.parse(m.raw).seq as number);
    for (let i = 1; i < seqs.length; i++) expect(seqs[i]).toBeGreaterThan(seqs[i - 1]!);
    expect(msgs.some((m) => m.type === 'ANSWER_COUNTS')).toBe(true);
    expect(msgs.some((m) => m.type === 'ADMIN_SNAPSHOT')).toBe(false);
    for (const m of msgs) {
      expect(m.raw).not.toContain('originalOptionId');
      // Đáp án chỉ được xuất hiện SAU khi chốt câu: REVEAL hoặc LEADERBOARD ngắn ngay sau đó.
      const isReveal =
        (m.type === 'STATE_SNAPSHOT' && (m.payload.state === 'REVEAL' || m.payload.state === 'LEADERBOARD')) ||
        m.type === 'ANSWER_REVEALED';
      if (!isReveal) expect(m.raw, `${m.type}`).not.toContain('correctOptionId');
      if (m.type === 'STATE_SNAPSHOT' && m.payload.state === 'ACCEPTING') {
        expect(m.payload.reveal).toBeNull();
        expect(m.payload.question.options).toHaveLength(4);
        expect(m.payload.question.optionsVisible).toBe(true);
        expect(m.payload.leaderboard.kind).toBe('COMPACT');
        expect(m.payload.mc.state).toBe('ask');
      }
      // Người dùng chốt: PREPARE chỉ hiện câu hỏi, chưa có 4 đáp án.
      if (m.type === 'STATE_SNAPSHOT' && m.payload.state === 'PREPARE') {
        expect(m.payload.question.prompt.length).toBeGreaterThan(0);
        expect(m.payload.question.options).toEqual([]);
        expect(m.payload.question.optionsVisible).toBe(false);
      }
    }

    // admin không token → đóng 4401
    const bad = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const code = await new Promise<number>((res) => {
      bad.once('open', () => bad.send(JSON.stringify({ type: 'HELLO', role: 'admin', token: 'sai' })));
      bad.once('close', (c) => res(c));
    });
    expect(code).toBe(4401);

    const good = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const first = await new Promise<string>((res) => {
      good.once('open', () => good.send(JSON.stringify({ type: 'HELLO', role: 'admin', token: TOKEN })));
      good.once('message', (d) => res(JSON.parse(String(d)).type));
    });
    good.close();
    expect(first).toBe('ADMIN_SNAPSHOT');
  });
});
