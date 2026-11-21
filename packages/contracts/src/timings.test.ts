import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS, SessionConfigSchema, TimingsSchema } from './index';

describe('timing defaults', () => {
  it('adds five seconds only to phases whose overlay shows a countdown', () => {
    expect(DEFAULT_TIMINGS).toMatchObject({
      lobbyMs: 30_000,
      prepareMs: 6_000,
      answerMs: 20_000,
      revealMs: 7_000,
      leaderboardMs: 9_000,
      roundEndMs: 2_000,
      victoryMs: 10_000,
      intermissionMs: 30_000,
    });
    expect(DEFAULT_TIMINGS.bigLeaderboardMs).toBeUndefined();
  });

  it('giảm nhịp chuẩn bị còn 6 giây và reveal còn 7 giây', () => {
    expect(DEFAULT_TIMINGS.prepareMs).toBe(6_000);
    expect(DEFAULT_TIMINGS.revealMs).toBe(7_000);
    expect(SessionConfigSchema.parse({ timings: {} }).timings).toMatchObject({ prepareMs: 6_000, revealMs: 7_000 });
  });

  it('keeps explicit timings in saved sessions and fills only missing values from new defaults', () => {
    const savedTimings = {
      lobbyMs: 30_000,
      prepareMs: 3_000,
      answerMs: 15_000,
      revealMs: 4_000,
      leaderboardMs: 4_000,
      roundEndMs: 2_000,
      victoryMs: 18_000,
      intermissionMs: 25_000,
    };

    expect(TimingsSchema.parse(savedTimings)).toMatchObject(savedTimings);
    expect(SessionConfigSchema.parse({ timings: savedTimings }).timings).toMatchObject(savedTimings);
    expect(SessionConfigSchema.parse({ timings: { answerMs: 15_000 } }).timings).toMatchObject({
      prepareMs: 6_000,
      answerMs: 15_000,
      revealMs: 7_000,
      leaderboardMs: 9_000,
      victoryMs: 10_000,
      intermissionMs: 30_000,
    });
  });
});
