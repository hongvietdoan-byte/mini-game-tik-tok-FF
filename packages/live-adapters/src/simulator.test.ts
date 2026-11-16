import { describe, expect, it } from 'vitest';
import { MockAdapter } from './adapter';
import { ManualScheduler } from './scheduler';
import { MockSimulator } from './simulator';

describe('MockSimulator sau khi khởi động lại', () => {
  it('gom simulator theo nhịp và chỉ giữ tối đa một timer đang chờ', async () => {
    const scheduler = new ManualScheduler();
    const adapter = new MockAdapter();
    await adapter.connect();
    let received = 0;
    adapter.onComment(() => { received += 1; });
    const simulator = new MockSimulator(adapter, scheduler, {
      players: Array.from({ length: 1_000 }, (_, i) => ({ userId: `batch-${i}`, displayName: `Batch ${i}` })),
      accuracy: 0.6,
      participation: 0.9,
      spamRate: 0.15,
      noiseRate: 0.1,
      seed: 20261117,
    });

    simulator.onQuestionOpened({ questionInstanceId: 'batch-question', correctOptionId: 'A', windowMs: 20_000 });
    expect(scheduler.pending).toBe(1);
    scheduler.advance(20_500);
    expect(received).toBe(simulator.sent);
    expect(received).toBeGreaterThan(900);
    expect(scheduler.pending).toBe(0);
  });

  it('stop hủy timer đang chờ và bỏ các batch còn lại', async () => {
    const scheduler = new ManualScheduler();
    const adapter = new MockAdapter();
    await adapter.connect();
    const simulator = new MockSimulator(adapter, scheduler, {
      players: Array.from({ length: 1_000 }, (_, i) => ({ userId: `stop-${i}`, displayName: `Stop ${i}` })),
      accuracy: 0.6,
      participation: 0.9,
      spamRate: 0.15,
      noiseRate: 0.1,
      seed: 20261118,
    });

    simulator.onQuestionOpened({ questionInstanceId: 'stop-question', correctOptionId: 'A', windowMs: 20_000 });
    simulator.stop();
    expect(scheduler.pending).toBe(0);
    scheduler.advance(20_500);
    expect(simulator.sent).toBe(0);
  });

  it('không tái dùng eventId của simulator trước trong cùng nguồn comment', async () => {
    const scheduler = new ManualScheduler();
    const adapter = new MockAdapter();
    await adapter.connect();
    const eventIds: string[][] = [];
    let current: string[] = [];
    adapter.onComment((comment) => { if (comment.eventId) current.push(comment.eventId); });
    const options = {
      players: [{ userId: 'synthetic-viewer-1', displayName: 'Người xem giả lập 1' }],
      accuracy: 1,
      participation: 1,
      spamRate: 0,
      noiseRate: 0,
      seed: 20261112,
    };

    for (const questionInstanceId of ['question-before-restart', 'question-after-restart']) {
      current = [];
      const simulator = new MockSimulator(adapter, scheduler, options);
      simulator.onQuestionOpened({ questionInstanceId, correctOptionId: 'A', windowMs: 3_000 });
      scheduler.advance(3_500);
      simulator.stop();
      eventIds.push(current);
    }

    const overlap = eventIds[0]!.find((eventId) => eventIds[1]!.includes(eventId));
    expect(eventIds[0]!.length).toBeGreaterThan(0);
    expect(eventIds[1]!.length).toBeGreaterThan(0);
    expect(overlap, 'eventId phải duy nhất qua các lần start trong cùng nguồn MOCK').toBeUndefined();
  });
});
