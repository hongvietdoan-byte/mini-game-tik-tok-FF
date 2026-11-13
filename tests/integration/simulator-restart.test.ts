import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS } from '@quiz/contracts';
import { AUTH, boot, command, createSession, rt, runUntil, type Harness } from './helpers';

const open: Harness[] = [];
afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

async function setSimulator(h: Harness, action: 'START' | 'STOP', players: number) {
  const res = await h.quiz.app.inject({
    method: 'POST',
    url: `/api/sessions/${h.sessionId}/simulator`,
    headers: AUTH,
    payload: { action, players, accuracy: 0.6, participation: 1, spamRate: 0, noiseRate: 0, seed: 20261112 },
  });
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as { ok: boolean; running: boolean; players: number };
}

describe('Khởi động lại MockSimulator trong phiên đang chạy', () => {
  it('đổi 500 → 2.000 người không tạo DUPLICATE_EVENT do va chạm eventId giữa hai lần chạy', async () => {
    // This case checks simulator run IDs in one server process, not SQLite durability;
    // keep the 2,000-comment burst independent from disk latency and temp-root location.
    const h = await createSession(await boot({ dbPath: ':memory:', questions: 10 }), {
      questionsPerRound: 10,
      timings: { ...DEFAULT_TIMINGS, prepareMs: 500, answerMs: 3_000, revealMs: 500, leaderboardMs: 500 },
    });
    open.push(h);

    const idsByRun: string[][] = [];
    let currentIds: string[] = [];
    h.adapter.onComment((comment) => {
      if (comment.eventId) currentIds.push(comment.eventId);
    });

    expect((await setSimulator(h, 'START', 500)).players).toBe(500);
    expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
    expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
    runUntil(h, () => rt(h).engine.state === 'ACCEPTING');

    runUntil(h, () => rt(h).engine.state === 'REVEAL');
    expect((await setSimulator(h, 'STOP', 500)).running).toBe(false);
    idsByRun.push(currentIds);

    currentIds = [];
    expect((await setSimulator(h, 'START', 2_000)).players).toBe(2_000);
    runUntil(h, () => rt(h).engine.state === 'ACCEPTING' && rt(h).engine.round!.questionIndex === 1);
    h.scheduler.advance(1_000);
    expect(rt(h).publicSnapshot().participantCount)
      .toBe(h.store.participantCount(rt(h).engine.round!.roundId));
    runUntil(h, () => rt(h).engine.state === 'REVEAL');
    idsByRun.push(currentIds);

    const firstRunIds = new Set(idsByRun[0]);
    const crossRunDuplicates = idsByRun[1]!.filter((eventId) => firstRunIds.has(eventId));
    expect(idsByRun[0]!.length).toBeGreaterThan(0);
    expect(idsByRun[1]!.length).toBeGreaterThan(0);
    expect(crossRunDuplicates, 'không được có eventId giao nhau qua STOP → START').toEqual([]);
  });
});
