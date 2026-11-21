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
    .audience!.seats.map((s) => `${s.slotId}=${s.occupant ? `${s.occupant.safeDisplayName}|${s.occupant.characterId}` : '-'}`)
    .join(',');

describe('V3 §6 — 30 ghế khán giả', () => {
  it('header công khai đếm ghế đã vào sảnh rồi đếm đúng người trả lời trong câu', async () => {
    const h = await session();
    await command(h, { type: 'OPEN_LOBBY' });
    const r = rt(h);
    for (let index = 0; index < 30; index += 1) {
      r.ingest({ source: 'MOCK', userId: `lobby-${index}`, displayName: `Lobby ${index}`, text: 'Comment Free Fire', eventId: `lobby-${index}` });
    }
    expect(r.publicSnapshot()).toMatchObject({ state: 'LOBBY', playingCount: 30 });

    await command(h, { type: 'START_ROUND' });
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    const correct = r.adminSnapshot().current!.correctOptionId;
    for (let index = 0; index < 3; index += 1) {
      r.ingest({ source: 'MOCK', userId: `lobby-${index}`, displayName: `Lobby ${index}`, text: correct, eventId: `answer-${index}` });
    }
    expect(r.publicSnapshot()).toMatchObject({ playingCount: 3 });
  });

  it('500 người tham gia: đủ 500 trong bảng điểm, đúng 30 ghế, 470 hàng chờ; overlay không lộ ID; đúng/sai sau công bố', async () => {
    const h = await session();
    await command(h, { type: 'OPEN_LOBBY' });
    await command(h, { type: 'START_ROUND' });
    const r = rt(h);
    expect(r.publicSnapshot().audience).toMatchObject({ queued: 0, total: 0 });
    expect(r.publicSnapshot().audience!.seats).toHaveLength(30);
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    const correct = r.adminSnapshot().current!.correctOptionId;
    for (let i = 0; i < 500; i++)
      r.ingest({ source: 'MOCK', userId: `v${i}`, displayName: `Khán giả ${i}`, text: i % 2 ? correct : correct === 'A' ? 'B' : 'A', eventId: `e${i}` });
    const a = r.publicSnapshot().audience!;
    expect(a.seats.filter((s) => s.occupant)).toHaveLength(30);
    expect(a.queued).toBe(470);
    expect(a.total).toBe(500);
    expect(new Set(a.seats.map((s) => s.occupant?.safeDisplayName)).size).toBe(30);
    // Người đầu tiên ngồi giữa hàng trên cùng.
    expect(a.seats.find((s) => s.occupant?.safeDisplayName === 'Khán giả 0')).toMatchObject({ rowIndex: 5, seatIndex: 2 });
    // Trước công bố: không có đúng/sai
    expect(a.seats.every((s) => s.occupant?.result === null)).toBe(true);
    // Overlay không bao giờ thấy playerId / userId
    const raw = JSON.stringify(r.publicSnapshot());
    expect(raw).not.toContain('MOCK:v');
    expect(raw).not.toContain('"playerId"');

    runUntil(h, () => r.engine.state === 'REVEAL');
    const after = r.publicSnapshot().audience!;
    const k0 = after.seats.find((s) => s.occupant?.safeDisplayName === 'Khán giả 0')!;
    const k1 = after.seats.find((s) => s.occupant?.safeDisplayName === 'Khán giả 1')!;
    expect(k0.occupant!.result).toBe('wrong');
    expect(k1.occupant!.result).toBe('correct');
    // Người không có ghế vẫn được chấm điểm như người có ghế
    const lb = h.store.ledgerTotals(r.engine.round!.roundId);
    // đúng = 100 + thưởng tốc độ (> 100); sai = 0
    expect(lb.get('MOCK:v499')).toBeGreaterThan(100);
    expect([...lb.values()].filter((x) => x > 100)).toHaveLength(250);
    expect(lb.size).toBe(250); // người trả lời sai không có dòng nào trong sổ điểm
  });

  it('xoay ghế giữa câu: ≤ 5 ghế đổi người, Top 3 đang ngồi được giữ nguyên, không ai ngồi 2 ghế', async () => {
    const h = await session();
    await command(h, { type: 'OPEN_LOBBY' });
    await command(h, { type: 'START_ROUND' });
    const r = rt(h);
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    // 30 người ngồi trả lời đúng câu 1, 35 người hàng chờ trả lời đúng
    const c1 = r.adminSnapshot().current!.correctOptionId;
    for (let i = 0; i < 65; i++) r.ingest({ source: 'MOCK', userId: `p${i}`, displayName: `P${i}`, text: c1 });
    runUntil(h, () => r.engine.state === 'ACCEPTING' && r.engine.round!.questionIndex === 1);
    // câu 2: chỉ p0..p2 (đang ngồi, dẫn đầu sau câu này) và hàng chờ trả lời
    const c2 = r.adminSnapshot().current!.correctOptionId;
    for (const i of [0, 1, 2, ...Array.from({ length: 30 }, (_, k) => 30 + k)])
      r.ingest({ source: 'MOCK', userId: `p${i}`, displayName: `P${i}`, text: c2 });
    const before = r.publicSnapshot().audience!;
    runUntil(h, () => r.engine.state === 'PREPARE' && r.engine.round!.questionIndex === 2); // xoay khi vào câu 3
    const after = r.publicSnapshot().audience!;
    expect(after.rotationId).toBe(before.rotationId + 1);
    const changed = after.seats.filter((s, i) => s.occupant?.safeDisplayName !== before.seats[i]!.occupant?.safeDisplayName);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.length).toBeLessThanOrEqual(5);
    for (const top of ['P0', 'P1', 'P2']) expect(after.seats.find((s) => s.occupant?.safeDisplayName === top)?.occupant?.pinned).toBe(true);
    const names = after.seats.flatMap((s) => (s.occupant ? [s.occupant.safeDisplayName] : []));
    expect(new Set(names).size).toBe(names.length);
    expect(after.queued + names.length).toBe(65);
  });

  it('sắp lại người đang ngồi theo điểm khi vào REVEAL, giữ người/nhân vật và khôi phục thứ tự sau restart', async () => {
    const dbPath = tempDbPath();
    const h = await session(dbPath);
    await command(h, { type: 'OPEN_LOBBY' });
    await command(h, { type: 'START_ROUND' });
    const r = rt(h);
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    const correct = r.adminSnapshot().current!.correctOptionId;
    const wrong = correct === 'A' ? 'B' : 'A';

    // Ngồi theo thứ tự vào ngược với ID xếp hạng; 5 người cuối có điểm.
    for (let i = 14; i >= 0; i -= 1)
      r.ingest({ source: 'MOCK', userId: `rank${i}`, displayName: `Rank ${i}`, text: i < 5 ? correct : wrong, eventId: `rank-event-${i}` });
    const before = r.publicSnapshot().audience!;
    expect(before.seats.filter((seat) => seat.occupant)).toHaveLength(15);
    const beforeNames = before.seats.flatMap((seat) => seat.occupant ? [seat.occupant.safeDisplayName] : []);
    const beforeCharacters = new Map(before.seats.flatMap((seat) => seat.occupant ? [[seat.occupant.safeDisplayName, seat.occupant.characterId] as const] : []));

    runUntil(h, () => r.engine.state === 'REVEAL');
    const after = r.publicSnapshot().audience!;
    const afterNames = after.seats.flatMap((seat) => seat.occupant ? [seat.occupant.safeDisplayName] : []);
    expect(afterNames).not.toEqual(beforeNames);
    expect([...afterNames].sort()).toEqual([...beforeNames].sort());
    const rankedSeatNames = [...after.seats]
      .sort((left, right) => right.rowIndex - left.rowIndex || Math.abs(left.seatIndex - 2) - Math.abs(right.seatIndex - 2) || left.seatIndex - right.seatIndex)
      .flatMap((seat) => seat.occupant ? [seat.occupant.safeDisplayName] : []);
    // Equal scores retain their original order (Rank 4 → Rank 0); unscored users follow in join order.
    expect(rankedSeatNames).toEqual(['Rank 4', 'Rank 3', 'Rank 2', 'Rank 1', 'Rank 0', ...Array.from({ length: 10 }, (_, index) => `Rank ${14 - index}`)]);
    expect(after.seats.flatMap((seat) => seat.occupant ? [[seat.occupant.safeDisplayName, seat.occupant.characterId] as const] : []))
      .toEqual(afterNames.map((name) => [name, beforeCharacters.get(name)]));
    expect(after.queued).toBe(before.queued);
    const persistedLayout = seatedKey(h);

    await h.quiz.close();
    h.store.close();
    open.splice(open.indexOf(h), 1);
    const recovered = await boot({ dbPath, scheduler: new ManualScheduler(h.scheduler.now() + 10_000), seedQuestions: false });
    await recovered.quiz.recover();
    const h2: Harness = { ...recovered, sessionId: h.sessionId };
    open.push(h2);
    expect(seatedKey(h2)).toBe(persistedLayout);
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
    expect(rt(h2).publicSnapshot().audience).toMatchObject({ queued: 10, total: 40 });
  });
});
