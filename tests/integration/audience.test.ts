import { afterEach, describe, expect, it } from 'vitest';
import { ManualScheduler } from '@quiz/live-adapters';
import { boot, command, createSession, rt, runUntil, tempDbPath, type Harness } from './helpers';

const open: Harness[] = [];
afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

async function session(dbPath?: string) {
  const h = await createSession(await boot(dbPath ? { dbPath } : {}));
  open.push(h);
  return h;
}

const seatedKey = (h: Harness) =>
  rt(h)
    .publicSnapshot()
    .audience!.seats.map((s) => `${s.slotId}=${s.occupant ? `${s.occupant.displayName}|${s.occupant.characterId}` : '-'}`)
    .join(',');

describe('V3 §6 — 35 ghế khán giả', () => {
  it('500 người tham gia: đủ 500 trong bảng điểm, đúng 35 ghế, 465 hàng chờ; overlay không lộ ID; đúng/sai sau công bố', async () => {
    const h = await session();
    await command(h, { type: 'OPEN_LOBBY' });
    await command(h, { type: 'START_ROUND' });
    const r = rt(h);
    expect(r.publicSnapshot().audience).toMatchObject({ queued: 0, total: 0 });
    expect(r.publicSnapshot().audience!.seats).toHaveLength(35);
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    const correct = r.adminSnapshot().current!.correctOptionId;
    for (let i = 0; i < 500; i++)
      r.ingest({ source: 'MOCK', userId: `v${i}`, displayName: `Khán giả ${i}`, text: i % 2 ? correct : correct === 'A' ? 'B' : 'A', eventId: `e${i}` });
    const a = r.publicSnapshot().audience!;
    expect(a.seats.filter((s) => s.occupant)).toHaveLength(35);
    expect(a.queued).toBe(465);
    expect(a.total).toBe(500);
    expect(new Set(a.seats.map((s) => s.occupant?.displayName)).size).toBe(35);
    // ghế đầu tiên là hàng trước, giữa
    expect(a.seats.find((s) => s.occupant?.displayName === 'Khán giả 0')).toMatchObject({ rowIndex: 0, seatIndex: 2 });
    // Trước công bố: không có đúng/sai
    expect(a.seats.every((s) => s.occupant?.result === null)).toBe(true);
    // Overlay không bao giờ thấy playerId / userId
    const raw = JSON.stringify(r.publicSnapshot());
    expect(raw).not.toContain('MOCK:v');
    expect(raw).not.toContain('"playerId"');

    runUntil(h, () => r.engine.state === 'REVEAL');
    const after = r.publicSnapshot().audience!;
    const k0 = after.seats.find((s) => s.occupant?.displayName === 'Khán giả 0')!;
    const k1 = after.seats.find((s) => s.occupant?.displayName === 'Khán giả 1')!;
    expect(k0.occupant!.result).toBe('wrong');
    expect(k1.occupant!.result).toBe('correct');
    // Người không có ghế vẫn được chấm điểm như người có ghế
    const lb = h.store.ledgerTotals(r.engine.round!.roundId);
    expect(lb.get('MOCK:v499')).toBe(100);
    expect([...lb.values()].filter((x) => x === 100)).toHaveLength(250);
  });

  it('xoay ghế giữa câu: ≤ 5 ghế đổi người, Top 3 đang ngồi được giữ nguyên, không ai ngồi 2 ghế', async () => {
    const h = await session();
    await command(h, { type: 'OPEN_LOBBY' });
    await command(h, { type: 'START_ROUND' });
    const r = rt(h);
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    // 35 người ngồi trả lời đúng câu 1, 30 người hàng chờ trả lời đúng
    const c1 = r.adminSnapshot().current!.correctOptionId;
    for (let i = 0; i < 65; i++) r.ingest({ source: 'MOCK', userId: `p${i}`, displayName: `P${i}`, text: c1 });
    runUntil(h, () => r.engine.state === 'ACCEPTING' && r.engine.round!.questionIndex === 1);
    // câu 2: chỉ p0..p2 (đang ngồi, dẫn đầu sau câu này) và hàng chờ trả lời
    const c2 = r.adminSnapshot().current!.correctOptionId;
    for (const i of [0, 1, 2, ...Array.from({ length: 30 }, (_, k) => 35 + k)])
      r.ingest({ source: 'MOCK', userId: `p${i}`, displayName: `P${i}`, text: c2 });
    const before = r.publicSnapshot().audience!;
    runUntil(h, () => r.engine.state === 'PREPARE' && r.engine.round!.questionIndex === 2); // xoay khi vào câu 3
    const after = r.publicSnapshot().audience!;
    expect(after.rotationId).toBe(before.rotationId + 1);
    const changed = after.seats.filter((s, i) => s.occupant?.displayName !== before.seats[i]!.occupant?.displayName);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.length).toBeLessThanOrEqual(5);
    for (const top of ['P0', 'P1', 'P2']) expect(after.seats.find((s) => s.occupant?.displayName === top)?.occupant?.pinned).toBe(true);
    const names = after.seats.flatMap((s) => (s.occupant ? [s.occupant.displayName] : []));
    expect(new Set(names).size).toBe(names.length);
    expect(after.queued + names.length).toBe(65);
  });

  it('khởi động lại giữa câu: ghế và nhân vật khôi phục y nguyên, không random lại', async () => {
    const dbPath = tempDbPath();
    const h = await session(dbPath);
    await command(h, { type: 'OPEN_LOBBY' });
    await command(h, { type: 'START_ROUND' });
    runUntil(h, () => rt(h).engine.state === 'ACCEPTING');
    for (let i = 0; i < 40; i++) rt(h).ingest({ source: 'MOCK', userId: `u${i}`, displayName: `U${i}`, text: 'A' });
    h.scheduler.advance(1_500); // nhịp heartbeat ghi trạng thái ghế
    const before = seatedKey(h);

    await h.quiz.close();
    h.store.close();
    open.splice(open.indexOf(h), 1);
    const b2 = await boot({ dbPath, scheduler: new ManualScheduler(h.scheduler.now() + 10_000), seedQuestions: false });
    await b2.quiz.recover();
    const h2: Harness = { ...b2, sessionId: h.sessionId };
    open.push(h2);
    expect(seatedKey(h2)).toBe(before);
    expect(rt(h2).publicSnapshot().audience).toMatchObject({ queued: 5, total: 40 });
  });
});
