import { describe, expect, it } from 'vitest';
import type { PublicSnapshot } from '@quiz/contracts';
import { makeMockSnapshot, MOCK_SCENES } from './mock/snapshots';
import { getPublicThroneOrLocked } from './throne';

describe('getPublicThroneOrLocked', () => {
  it('keeps the throne visible as LOCKED when a legacy or incomplete snapshot omits it', () => {
    expect(getPublicThroneOrLocked({} as PublicSnapshot)).toEqual({ state: 'LOCKED', unlockAfterQuestion: 5 });
  });

  it('uses the LOCKED fallback when the public throne payload is invalid', () => {
    expect(getPublicThroneOrLocked({ throne: { state: 'HELD', unlockAfterQuestion: 5 } } as PublicSnapshot))
      .toEqual({ state: 'LOCKED', unlockAfterQuestion: 5 });
  });

  it('keeps a valid held throne from the snapshot', () => {
    const throne = {
      state: 'HELD', unlockAfterQuestion: 5,
      holder: { playerId: 'player-1', safeDisplayName: 'StormKing', characterId: 'chibi-1', score: 1_000, streak: 2 },
    } as const;
    expect(getPublicThroneOrLocked({ throne } as PublicSnapshot)).toEqual(throne);
  });

  it('gives every screenshot mock the throne layout and 30 audience slots', () => {
    expect(MOCK_SCENES).not.toContain('lobby-35');
    for (const name of MOCK_SCENES) {
      const snapshot = makeMockSnapshot(name);
      expect(snapshot?.throne, `${name} mock must carry a throne state`).toBeDefined();
      if (snapshot?.audience) expect(snapshot.audience.seats, `${name} mock must use 30 slots`).toHaveLength(30);
    }
  });

  it('keeps the queue mock at 30 occupied seats with a locked throne', () => {
    const snapshot = makeMockSnapshot('lobby-queue');
    expect(snapshot?.throne.state).toBe('LOCKED');
    expect(snapshot?.audience?.seats).toHaveLength(30);
    expect(snapshot?.audience?.seats.filter((seat) => seat.occupant).length).toBe(30);
    expect(snapshot?.audience?.queued).toBe(5);
  });

  it('holds the throne starting with question five', () => {
    expect(makeMockSnapshot('question')?.throne.state).toBe('HELD');
    expect(makeMockSnapshot('throne-locked-question')?.throne.state).toBe('LOCKED');
  });
});
