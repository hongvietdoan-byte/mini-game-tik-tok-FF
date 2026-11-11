import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { DEFAULT_TIMINGS, type PublicSnapshot, type SessionConfig } from '@quiz/contracts';
import { ManualScheduler } from '@quiz/live-adapters';
import { currentQuestionInstanceId, selectRound } from '@quiz/quiz-core';
import {
  AUTH,
  boot,
  command,
  createSession,
  rt,
  runUntil,
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

type PartialSessionConfig = Omit<Partial<SessionConfig>, 'timings'> & {
  timings?: Partial<SessionConfig['timings']>;
};

async function session(opts: Parameters<typeof boot>[0] = {}, config: PartialSessionConfig = {}): Promise<Harness> {
  const h = await createSession(await boot(opts), {
    ...config,
    timings: { ...DEFAULT_TIMINGS, ...config.timings },
  });
  open.push(h);
  return h;
}

async function startAccepting(h: Harness): Promise<void> {
  expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
  expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
  runUntil(h, () => rt(h).engine.state === 'ACCEPTING');
}

async function sessionWithCorrectA(
  answerMs = 3_000,
  overrides: Partial<SessionConfig> = {},
): Promise<Harness> {
  const setup = await boot({ questions: 40 });
  const pool = setup.store.listQuestions('demo');
  const count = overrides.questionsPerRound ?? 15;
  let chosenSeed: number | undefined;
  for (let candidate = 0; candidate < 512; candidate += 1) {
    const selection = selectRound({
      roundId: 'seed-probe:r1',
      seed: (candidate + 7_919) | 0,
      count,
      pool,
      usedInSession: new Set<string>(),
      allowDemo: true,
      allowReuse: false,
      nowMs: setup.scheduler.now(),
    });
    if (selection.ok && selection.snapshots[0]?.correctOptionId === 'A') {
      chosenSeed = candidate;
      break;
    }
  }
  if (chosenSeed === undefined) throw new Error('Không tìm được seed để đáp án đúng hiển thị là A.');

  const h = await createSession(setup, {
    ...overrides,
    seed: chosenSeed,
    timings: { ...DEFAULT_TIMINGS, ...overrides.timings, answerMs },
  });
  open.push(h);
  return h;
}

function questionScoreRows(h: Harness, questionId: string): number {
  return (h.store.raw
    .prepare('SELECT COUNT(*) AS n FROM score_events WHERE question_instance_id = ?')
    .get(questionId) as { n: number }).n;
}

function answerRows(h: Harness, questionId: string) {
  return h.store.raw
    .prepare('SELECT player_id AS playerId, option_id AS optionId FROM answers WHERE question_instance_id = ?')
    .all(questionId) as { playerId: string; optionId: string }[];
}

function audienceSignature(audience: NonNullable<PublicSnapshot['audience']>) {
  return audience.seats.map((seat) => [
    seat.slotId,
    seat.occupant?.displayName ?? null,
    seat.occupant?.characterId ?? null,
  ]);
}

async function connectOverlay(port: number): Promise<{ socket: WebSocket; snapshot: PublicSnapshot }> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const snapshot = await new Promise<PublicSnapshot>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Hết giờ chờ STATE_SNAPSHOT của overlay.')), 5_000);
    socket.once('error', reject);
    socket.on('message', (data) => {
      const message = JSON.parse(String(data)) as { type: string; payload: PublicSnapshot };
      if (message.type !== 'STATE_SNAPSHOT') return;
      clearTimeout(timeout);
      resolve(message.payload);
    });
    socket.once('open', () => socket.send(JSON.stringify({ type: 'HELLO', role: 'overlay' })));
  });
  return { socket, snapshot };
}

async function closeSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    socket.once('close', () => resolve());
    socket.close();
  });
}

describe('V3 §17 — acceptance', () => {
  it('một người gửi A 100 lần chỉ tạo một answer và một score event', async () => {
    const h = await sessionWithCorrectA();
    await startAccepting(h);
    const r = rt(h);
    expect(r.adminSnapshot().current!.correctOptionId).toBe('A');
    const questionId = currentQuestionInstanceId(r.engine)!;

    for (let index = 0; index < 100; index += 1) {
      const result = r.ingest({
        source: 'MOCK',
        userId: 'spam-a-100',
        displayName: 'Người gửi lặp',
        text: 'A',
        eventId: `spam-a-100-${index}`,
      });
      expect(result.accepted).toBe(index === 0);
    }

    expect(answerRows(h, questionId)).toHaveLength(1);
    expect(r.metrics.accepted).toBe(1);
    expect(r.metrics.rejected.DUPLICATE_ANSWER).toBe(99);
    runUntil(h, () => r.engine.state === 'REVEAL');
    expect(questionScoreRows(h, questionId)).toBe(1);
  });

  it('đổi A→B vẫn chỉ tính đáp án đầu tiên', async () => {
    const h = await sessionWithCorrectA();
    await startAccepting(h);
    const r = rt(h);
    const questionId = currentQuestionInstanceId(r.engine)!;

    expect(r.ingest({ source: 'MOCK', userId: 'change-answer', displayName: 'Đổi đáp án', text: 'A', eventId: 'change-a' }))
      .toEqual({ accepted: true });
    expect(r.ingest({ source: 'MOCK', userId: 'change-answer', displayName: 'Đổi đáp án', text: 'B', eventId: 'change-b' }))
      .toEqual({ accepted: false, reason: 'DUPLICATE_ANSWER' });
    expect(answerRows(h, questionId)).toEqual([{ playerId: 'MOCK:change-answer', optionId: 'A' }]);

    runUntil(h, () => r.engine.state === 'REVEAL');
    expect(questionScoreRows(h, questionId)).toBe(1);
  });

  it('MC không tự vào leaderboard; comment mang tên MC KELLY/FFVN.Kelly tạo player thường', async () => {
    const h = await session();
    await startAccepting(h);
    const r = rt(h);
    const before = r.publicSnapshot();
    expect(before.mc).toMatchObject({ state: 'ask' });
    expect(before.participantCount).toBe(0);
    expect(before.leaderboard?.entries).toEqual([]);

    const correct = r.adminSnapshot().current!.correctOptionId;
    r.ingest({ source: 'MOCK', userId: 'name-mc', displayName: 'MC KELLY', text: correct, eventId: 'name-mc-1' });
    r.ingest({ source: 'MOCK', userId: 'name-ffvn', displayName: 'FFVN.Kelly', text: correct, eventId: 'name-ffvn-1' });
    runUntil(h, () => r.engine.state === 'REVEAL');

    const after = r.publicSnapshot();
    expect(after.mc.state).toBe('react');
    expect(after.participantCount).toBe(2);
    expect(after.leaderboard!.entries.map((entry) => entry.displayName).sort()).toEqual(['FFVN.Kelly', 'MC KELLY']);
    expect(h.store.participantCount(r.engine.round!.roundId)).toBe(2);
  });

  it('overlay reconnect giữa câu nhận lại đúng ghế và timer hiện hành', async () => {
    const h = await session({}, { timings: { answerMs: 12_000 } });
    await startAccepting(h);
    const r = rt(h);
    const correct = r.adminSnapshot().current!.correctOptionId;
    for (let index = 0; index < 40; index += 1) {
      r.ingest({
        source: 'MOCK',
        userId: `ws-seat-${index}`,
        displayName: `WS Ghế ${index}`,
        text: correct,
        eventId: `ws-seat-event-${index}`,
      });
    }

    await h.quiz.app.listen({ host: '127.0.0.1', port: 0 });
    const port = (h.quiz.app.server.address() as { port: number }).port;
    const first = await connectOverlay(port);
    expect(first.snapshot.state).toBe('ACCEPTING');
    expect(first.snapshot.audience).toMatchObject({ total: 40, queued: 5 });
    expect(first.snapshot.audience!.seats.filter((seat) => seat.occupant)).toHaveLength(35);
    expect(first.snapshot.timer?.running).toBe(true);
    const signature = audienceSignature(first.snapshot.audience!);
    const remainingBefore = first.snapshot.timer!.remainingMs;
    await closeSocket(first.socket);

    h.scheduler.advance(1_000);
    const reconnected = await connectOverlay(port);
    expect(reconnected.snapshot.state).toBe('ACCEPTING');
    expect(reconnected.snapshot.audience).toMatchObject({ total: 40, queued: 5 });
    expect(audienceSignature(reconnected.snapshot.audience!)).toEqual(signature);
    expect(reconnected.snapshot.timer?.running).toBe(true);
    expect(reconnected.snapshot.timer?.remainingMs).toBe(remainingBefore - 1_000);
    await closeSocket(reconnected.socket);
  });

  it('Top 10 đồng hạng có rank nhất quán và thứ tự playerId ổn định', async () => {
    const h = await session();
    await startAccepting(h);
    const r = rt(h);
    const correct = r.adminSnapshot().current!.correctOptionId;
    for (let index = 0; index < 12; index += 1) {
      const player = String(index).padStart(2, '0');
      r.ingest({
        source: 'MOCK',
        userId: `tie-${player}`,
        displayName: `Đồng hạng ${player}`,
        text: correct,
        eventId: `tie-event-${player}`,
      });
    }
    runUntil(h, () => r.engine.state === 'REVEAL');

    const entries = r.publicSnapshot().leaderboard!.entries;
    expect(entries).toHaveLength(10);
    expect(entries.every((entry) => entry.rank === 1 && entry.tied)).toBe(true);
    expect(entries.map((entry) => entry.playerId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `MOCK:tie-${String(index).padStart(2, '0')}`),
    );
  });

  it('crash ngay sau reveal rồi recovery không chấm lại score event', async () => {
    const dbPath = tempDbPath();
    const h = await session({ dbPath }, {
      questionsPerRound: 10,
      timings: { prepareMs: 500, answerMs: 3_000, revealMs: 500, leaderboardMs: 500, victoryMs: 1_000 },
    });
    await startAccepting(h);
    const r = rt(h);
    const questionId = currentQuestionInstanceId(r.engine)!;
    const correct = r.adminSnapshot().current!.correctOptionId;
    expect(r.ingest({ source: 'MOCK', userId: 'crash-score', displayName: 'Khôi phục', text: correct, eventId: 'crash-score-1' }))
      .toEqual({ accepted: true });
    runUntil(h, () => r.engine.state === 'REVEAL');
    const roundId = r.engine.round!.roundId;
    const ledgerBefore = h.store.ledgerRows(roundId);
    expect(questionScoreRows(h, questionId)).toBe(1);

    const scheduler = new ManualScheduler(h.scheduler.now() + 5_000);
    await h.quiz.close();
    h.store.close();
    open.splice(open.indexOf(h), 1);
    const recoveredBase = await boot({ dbPath, scheduler, seedQuestions: false });
    expect(await recoveredBase.quiz.recover()).not.toBeNull();
    await Promise.resolve();
    const recovered: Harness = { ...recoveredBase, sessionId: h.sessionId };
    open.push(recovered);
    expect(rt(recovered).engine.state).toBe('PAUSED');
    expect((await command(recovered, {
      type: 'RESOLVE_RECOVERY',
      decision: 'RESUME',
      reason: 'Kiểm thử V3 sau crash',
    })).status).toBe(200);
    runUntil(recovered, () => rt(recovered).engine.state === 'VICTORY', 250);

    expect(recovered.store.ledgerRows(roundId)).toEqual(ledgerBefore);
    expect(questionScoreRows(recovered, questionId)).toBe(1);
    const duplicateScores = recovered.store.raw.prepare(
      'SELECT COUNT(*) AS n FROM (SELECT 1 FROM score_events WHERE round_id = ? AND question_instance_id = ? GROUP BY player_id, score_reason HAVING COUNT(*) > 1)',
    ).get(roundId, questionId) as { n: number };
    expect(duplicateScores.n).toBe(0);
  });
});
