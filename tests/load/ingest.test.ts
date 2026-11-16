import { performance } from 'node:perf_hooks';
import { afterEach, describe, expect, it } from 'vitest';
import { boot, command, createSession, referenceScores, rt, runUntil, storedScores, type Harness } from '../integration/helpers';

/**
 * Test tải MOCK (mục 13 đặc tả): 500 người chơi, burst comment. Đây là số đo của server cục bộ,
 * KHÔNG phải cam kết về tốc độ giao comment của TikTok.
 */
const open: Harness[] = [];
afterEach(async () => {
  for (const h of open.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

function pct(sorted: number[], p: number) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

describe('tải ingest', () => {
  it('500 người chơi × (1 đáp án + 2 spam) trong một câu: không mất, không trùng, độ trễ xử lý thấp', async () => {
    const h = await createSession(await boot({}));
    open.push(h);
    await command(h, { type: 'OPEN_LOBBY' });
    await command(h, { type: 'START_ROUND' });
    const r = rt(h);
    runUntil(h, () => r.engine.state === 'ACCEPTING');

    const latencies: number[] = [];
    const opts = ['A', 'B', 'C', 'D'];
    let sent = 0;
    const originalIngest = r.ingest.bind(r);
    r.ingest = (comment) => {
      const startedAt = performance.now();
      const result = originalIngest(comment);
      latencies.push(performance.now() - startedAt);
      return result;
    };
    let batch: Parameters<typeof h.adapter.emitBatch>[0][number][] = [];
    const deliver = () => {
      if (!batch.length) return;
      h.adapter.emitBatch(batch);
      batch = [];
    };
    // 1500 comment trải đều 10 s ảo = 150 comment/s (vượt mục tiêu burst 100/s)
    for (let i = 0; i < 1500; i++) {
      const player = i % 500;
      batch.push({ userId: `load-${player}`, displayName: `Tải ${player}`, text: opts[(player + Math.floor(i / 500)) % 4]!, eventId: `ev-${i}` });
      sent++;
      if (i % 15 === 14) {
        deliver();
        h.scheduler.advance(100);
      }
    }
    deliver();
    latencies.sort((a, b) => a - b);
    const p50 = pct(latencies, 50);
    const p99 = pct(latencies, 99);
    console.log(`[load] ${sent} comment, ingest p50=${p50.toFixed(3)} ms p99=${p99.toFixed(3)} ms`);

    expect(r.metrics.accepted).toBe(500);
    expect(r.metrics.rejected.DUPLICATE_ANSWER).toBe(1000);
    expect(p99).toBeLessThan(50);

    runUntil(h, () => r.engine.state === 'REVEAL');
    const rid = r.engine.round!.roundId;
    const ref = referenceScores(h.store, rid);
    expect(storedScores(h.store, rid)).toEqual(ref);
    expect(ref.size).toBe(500);
  });
});
