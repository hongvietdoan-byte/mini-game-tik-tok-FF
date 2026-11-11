import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry, PodiumSlot, PublicSnapshot } from '@quiz/contracts';
import { interpolateRemainingMs, leaderboardPages, podiumLeftToRight, selectNewestSnapshot } from './overlayLogic';

const base = { stateVersion: 4 } as PublicSnapshot;

describe('overlay logic', () => {
  it('keeps the latest stateVersion and allows same-version count snapshots', () => {
    const older = { stateVersion: 3 } as PublicSnapshot;
    const same = { stateVersion: 4, answerCount: 8 } as PublicSnapshot;
    expect(selectNewestSnapshot(base, older)).toBe(base);
    expect(selectNewestSnapshot(base, same)).toBe(same);
  });

  it('interpolates a running timer and freezes a paused one', () => {
    expect(interpolateRemainingMs(10_000, true, 2_500)).toBe(7_500);
    expect(interpolateRemainingMs(10_000, false, 2_500)).toBe(10_000);
    expect(interpolateRemainingMs(1_000, true, 5_000)).toBe(0);
  });

  it('paginates only when needed and keeps short leaderboards short', () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({ playerId: String(i) }) as LeaderboardEntry);
    expect(leaderboardPages(entries).map((page) => page.length)).toEqual([5, 3]);
    expect(leaderboardPages(entries.slice(0, 3))).toHaveLength(1);
    expect(leaderboardPages([])).toEqual([[]]);
  });

  it('puts the podium in 2-1-3 order', () => {
    const slots = ([{ place: 1 }, { place: 3 }, { place: 2 }] as PodiumSlot[]);
    expect(podiumLeftToRight(slots).map((slot) => slot.place)).toEqual([2, 1, 3]);
  });
});
