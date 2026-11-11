import { performance } from 'node:perf_hooks';
import { afterEach, describe, expect, it } from 'vitest';
import { currentQuestionInstanceId } from '@quiz/quiz-core';
import { DEFAULT_TIMINGS } from '@quiz/contracts';
import { boot, command, createSession, rt, runUntil, type Harness } from '../integration/helpers';

const open: Harness[] = [];
afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

describe('tải Audience V3', () => {
  it('2000 người vào trong 20 giây ảo + 2 spam/người: đúng 35 ghế, 1965 chờ, p99 dưới 20 ms', async () => {
    const h = await createSession(await boot({}), {
      questionsPerRound: 10,
      timings: { ...DEFAULT_TIMINGS, answerMs: 60_000 },
      audienceRotateEvery: 0,
    });
    open.push(h);
    expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
    expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
    const r = rt(h);
    runUntil(h, () => r.engine.state === 'ACCEPTING');
    const correct = r.adminSnapshot().current!.correctOptionId;
    const latencies: number[] = [];

    // 2,000 first answers over 20 virtual seconds: 100 distinct players/s.
    for (let player = 0; player < 2_000; player += 1) {
      if (player > 0 && player % 100 === 0) h.scheduler.advance(1_000);
      const t0 = performance.now();
      r.ingest({
        source: 'MOCK',
        userId: `audience-load-${String(player).padStart(4, '0')}`,
        displayName: `Khán giả tải ${player}`,
        text: correct,
        eventId: `audience-load-first-${player}`,
      });
      latencies.push(performance.now() - t0);
    }
    h.scheduler.advance(1_000);

    // Two extra comments per player arrive after the join window; each has a
    // distinct event ID, so they exercise duplicate-answer handling, not event dedupe.
    for (let player = 0; player < 2_000; player += 1) {
      const userId = `audience-load-${String(player).padStart(4, '0')}`;
      for (let spam = 0; spam < 2; spam += 1) {
        const t0 = performance.now();
        r.ingest({
          source: 'MOCK',
          userId,
          displayName: `Khán giả tải ${player}`,
          text: correct,
          eventId: `audience-load-spam-${player}-${spam}`,
        });
        latencies.push(performance.now() - t0);
      }
    }

    latencies.sort((a, b) => a - b);
    const p50 = percentile(latencies, 50);
    const p99 = percentile(latencies, 99);
    const max = latencies.at(-1)!;
    console.log(
      `[load audience] unique=2000/20s ảo (100/s), spam=4000, ingest p50=${p50.toFixed(3)} ms p99=${p99.toFixed(3)} ms max=${max.toFixed(3)} ms`,
    );

    expect(r.metrics.received).toBe(6_000);
    expect(r.metrics.accepted).toBe(2_000);
    expect(r.metrics.rejected.DUPLICATE_ANSWER).toBe(4_000);
    expect(p99).toBeLessThan(20);

    const audience = r.publicSnapshot().audience!;
    expect(audience.total).toBe(2_000);
    expect(audience.seats.filter((seat) => seat.occupant !== null)).toHaveLength(35);
    expect(audience.queued).toBe(1_965);

    runUntil(h, () => r.engine.state === 'REVEAL');
    const roundId = r.engine.round!.roundId;
    const questionId = currentQuestionInstanceId(r.engine)!;
    const answers = h.store.raw
      .prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT player_id) AS players FROM answers WHERE round_id = ? AND question_instance_id = ?')
      .get(roundId, questionId) as { n: number; players: number };
    const scores = h.store.raw
      .prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT player_id) AS players FROM score_events WHERE round_id = ? AND question_instance_id = ?')
      .get(roundId, questionId) as { n: number; players: number };
    expect(answers).toEqual({ n: 2_000, players: 2_000 });
    expect(scores).toEqual({ n: 2_000, players: 2_000 });
  });
});
