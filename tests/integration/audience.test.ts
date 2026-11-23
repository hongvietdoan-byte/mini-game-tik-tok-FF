import { afterEach, describe, expect, it } from 'vitest';
import { ManualScheduler } from '@quiz/live-adapters';
import type { SessionConfig } from '@quiz/contracts';
import { boot, command, createSession, rt, runUntil, tempDbPath, type Harness } from './helpers';

const open: Harness[] = [];
afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

async function session(dbPath?: string, config: Partial<SessionConfig> = {}) {
  const h = await createSession(await boot(dbPath ? { dbPath } : {}), config);
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
    h.scheduler.advance(1_500); // Persist the audience join order before checking equal-score ties.
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
    const ranked = h.store.rankedStandings(r.engine.round!.roundId);
    const currentSeatOrder = new Set(a.seats.flatMap((seat) => seat.occupant ? [seat.occupant.safeDisplayName] : []));
    const savedAudience = h.store.loadAudienceState<{ joinOrder?: string[] }>(r.engine.round!.roundId);
    const joinPosition = new Map((savedAudience?.joinOrder ?? []).map((playerId, index) => [playerId, index]));
    const expectedNames = [...ranked]
      .sort((left, right) => right.score - left.score || right.correctCount - left.correctCount ||
        Number(currentSeatOrder.has(right.displayName)) - Number(currentSeatOrder.has(left.displayName)) ||
        (joinPosition.get(left.playerId) ?? Number.MAX_SAFE_INTEGER) - (joinPosition.get(right.playerId) ?? Number.MAX_SAFE_INTEGER) ||
        (left.playerId < right.playerId ? -1 : left.playerId > right.playerId ? 1 : 0))
      .slice(0, 30)
      .map((entry) => entry.displayName);
    const actualNames = after.seats
      .sort((left, right) => right.rowIndex - left.rowIndex || Math.abs(left.seatIndex - 2) - Math.abs(right.seatIndex - 2) || left.seatIndex - right.seatIndex)
      .flatMap((seat) => seat.occupant ? [seat.occupant.safeDisplayName] : []);
    expect(actualNames).toEqual(expectedNames);
    expect(after.seats.filter((seat) => seat.occupant?.result === 'correct')).toHaveLength(30);
    // Người không có ghế vẫn được chấm điểm như người có ghế
    const lb = h.store.ledgerTotals(r.engine.round!.roundId);
    // đúng = 100 + thưởng tốc độ (> 100); sai = 0
    expect(lb.get('MOCK:v499')).toBeGreaterThan(100);
    expect([...lb.values()].filter((x) => x > 100)).toHaveLength(250);
    expect(lb.size).toBe(250); // người trả lời sai không có dòng nào trong sổ điểm
  });

  it('REVEAL chọn Top 30 theo điểm và bỏ qua cấu hình xoay cũ', async () => {
    const h = await session(undefined, { audienceRotateEvery: 1, audiencePinTop: 5 });
    await command(h, { type: 'OPEN_LOBBY' });
    const r = rt(h);
    for (let index = 0; index < 35; index += 1)
      r.ingest({ source: 'MOCK', userId: `rank-seat-${index}`, displayName: `Seat ${index}`, text: 'Comment Free Fire', eventId: `rank-seat-lobby-${index}` });
    expect(r.publicSnapshot().audience).toMatchObject({ queued: 5, total: 35 });
    await command(h, { type: 'START_ROUND' });

    runUntil(h, () => r.engine.state === 'ACCEPTING' && r.engine.round!.questionIndex === 0);
    runUntil(h, () => r.engine.state === 'REVEAL' && r.engine.round!.questionIndex === 0);
    const before = r.publicSnapshot().audience!;
    const rotationId = before.rotationId;
    runUntil(h, () => r.engine.state === 'ACCEPTING' && r.engine.round!.questionIndex === 1);
    const correct = r.adminSnapshot().current!.correctOptionId;
    r.ingest({ source: 'MOCK', userId: 'rank-seat-30', displayName: 'Seat 30', text: correct, eventId: 'rank-seat-q2-top' });
    runUntil(h, () => r.engine.state === 'REVEAL' && r.engine.round!.questionIndex === 1);

    const after = r.publicSnapshot().audience!;
    const names = after.seats.flatMap((seat) => seat.occupant ? [seat.occupant.safeDisplayName] : []);
    expect(names).toHaveLength(30);
    expect(new Set(names).size).toBe(30);
    expect(names).toContain('Seat 30');
    expect(names).not.toContain('Seat 29');
    expect(after.queued).toBe(5);
    expect(after.rotationId).toBe(rotationId);
    expect(after.queued + names.length).toBe(after.total);
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
