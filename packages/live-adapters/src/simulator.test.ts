import { describe, expect, it } from 'vitest';
import { MockAdapter } from './adapter';
import { ManualScheduler } from './scheduler';
import { MockSimulator } from './simulator';

describe('MockSimulator sau khi khởi động lại', () => {
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
