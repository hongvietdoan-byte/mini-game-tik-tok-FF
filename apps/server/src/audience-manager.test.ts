import { describe, expect, it, vi } from 'vitest';
import type { Store } from '@quiz/persistence';
import { AudienceManager } from './audience';

function makeManager() {
  const names = new Map<string, string>();
  const store = {
    assignCharacter: (_roundId: string, playerId: string, proposed: string) => proposed,
    displayNames: (playerIds: readonly string[]) => new Map(playerIds.map((id) => [id, names.get(id) ?? id])),
    saveAudienceState: () => {},
  } as unknown as Store;
  return new AudienceManager(store, ['chibi-a', 'chibi-b', 'chibi-c'], 42);
}

function addPlayers(manager: AudienceManager, count: number) {
  manager.startRound('round-1', 0);
  for (let index = 0; index < count; index += 1) manager.onAccepted(`player-${index}`, `player-${index}`, index);
}

function standings(count: number, scoreFor: (index: number) => number, correctFor: (index: number) => number = () => 1) {
  return Array.from({ length: count }, (_, index) => ({
    playerId: `player-${index}`,
    score: scoreFor(index),
    correctCount: correctFor(index),
  })).sort((a, b) => b.score - a.score || b.correctCount - a.correctCount || (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0));
}

function queuedIds(manager: AudienceManager) {
  return [...(manager as unknown as { state: { queue: string[] } }).state.queue];
}

function orderedSeatNames(manager: AudienceManager) {
  return manager.view(null, 1)?.seats
    .sort((a, b) => b.rowIndex - a.rowIndex || Math.abs(a.seatIndex - 2) - Math.abs(b.seatIndex - 2) || a.seatIndex - b.seatIndex)
    .flatMap((seat) => seat.occupant ? [seat.occupant.safeDisplayName] : []) ?? [];
}

describe('AudienceManager rank-based seating', () => {
  it('selects the Top 30 of 40 standings, excludes the throne holder, and promotes rank 31 after overtaking rank 30', () => {
    const manager = makeManager();
    addPlayers(manager, 40);
    const rank = (index: number) => 100 - index;

    manager.reorderByRank(standings(40, rank), 'player-0');

    expect(orderedSeatNames(manager)).toEqual(Array.from({ length: 30 }, (_, index) => `player-${index + 1}`));
    expect(manager.seatForPlayer('player-0')).toBeNull();
    expect(manager.view(null, 100, ['player-0'])).toMatchObject({ queued: 9, total: 40 });
    expect(new Set(orderedSeatNames(manager)).size).toBe(30);

    manager.reorderByRank(standings(40, (index) => index === 31 ? 71 : rank(index)), 'player-0');

    expect(manager.seatForPlayer('player-31')).not.toBeNull();
    expect(manager.seatForPlayer('player-30')).toBeNull();
    expect(orderedSeatNames(manager)).toEqual([
      'player-1', 'player-2', 'player-3', 'player-4', 'player-5',
      'player-6', 'player-7', 'player-8', 'player-9', 'player-10',
      'player-11', 'player-12', 'player-13', 'player-14', 'player-15',
      'player-16', 'player-17', 'player-18', 'player-19', 'player-20',
      'player-21', 'player-22', 'player-23', 'player-24', 'player-25',
      'player-26', 'player-27', 'player-28', 'player-29', 'player-31',
    ]);
  });

  it('keeps a seated player over an earlier-joined waiting player on an exact tie', () => {
    const manager = makeManager();
    addPlayers(manager, 32);
    manager.reorderByRank(standings(32, () => 10));
    expect(manager.seatForPlayer('player-0')).not.toBeNull();

    manager.reorderByRank(standings(32, (index) => index === 30 ? 20 : 10));
    expect(manager.seatForPlayer('player-30')).not.toBeNull();
    expect(manager.seatForPlayer('player-0')).not.toBeNull();
    expect(manager.seatForPlayer('player-29')).toBeNull();

    manager.reorderByRank(standings(32, () => 10));

    expect(manager.seatForPlayer('player-30')).not.toBeNull();
    expect(manager.seatForPlayer('player-0')).not.toBeNull();
    expect(manager.seatForPlayer('player-29')).toBeNull();
    expect(manager.view(null, 300)).toMatchObject({ queued: 2, total: 32 });
  });

  it('removes the new throne holder and re-seats the former holder by score without leaving an empty chair', () => {
    const manager = makeManager();
    addPlayers(manager, 40);
    const initial = standings(40, (index) => 100 - index);

    manager.reorderByRank(initial, 'player-0');
    expect(manager.seatForPlayer('player-0')).toBeNull();
    expect(manager.seatForPlayer('player-1')).not.toBeNull();

    manager.reorderByRank(initial, 'player-1');

    expect(manager.seatForPlayer('player-1')).toBeNull();
    expect(manager.seatForPlayer('player-0')).not.toBeNull();
    expect(orderedSeatNames(manager)).toHaveLength(30);
    expect(new Set(orderedSeatNames(manager)).size).toBe(30);
    expect(manager.view(null, 200, ['player-1'])).toMatchObject({ queued: 9, total: 40 });
  });

  it('keeps LOBBY arrival order and starts a waiting list after the 30th commenter', () => {
    const manager = makeManager();
    manager.openLobby();
    for (let index = 0; index < 40; index += 1) manager.onLobbyKeyword(`player-${index}`, `player-${index}`, index);

    expect(manager.view(null, 50)).toMatchObject({ queued: 10, total: 40 });
    expect(orderedSeatNames(manager)).toEqual(Array.from({ length: 30 }, (_, index) => `player-${index}`));
    expect(manager.seatForPlayer('player-0')).not.toBeNull();
    expect(manager.seatForPlayer('player-29')).not.toBeNull();
    expect(manager.seatForPlayer('player-30')).toBeNull();
  });

  it('keeps the existing queue FIFO when waiting ranks change and appends people leaving seats', () => {
    const manager = makeManager();
    addPlayers(manager, 35);
    const score = (index: number) => index < 30 ? 100 - index : 66 + index - 30;

    manager.reorderByRank(standings(35, score));
    expect(queuedIds(manager)).toEqual(['player-30', 'player-31', 'player-32', 'player-33', 'player-34']);

    // The waiting players' score order differs from their arrival order, but
    // REVEAL must not reshuffle the invisible FIFO queue.
    manager.reorderByRank(standings(35, score));
    expect(queuedIds(manager)).toEqual(['player-30', 'player-31', 'player-32', 'player-33', 'player-34']);

    manager.reorderByRank(standings(35, (index) => index === 34 ? 1_000 : score(index)));
    expect(manager.seatForPlayer('player-34')).not.toBeNull();
    expect(manager.seatForPlayer('player-29')).toBeNull();
    expect(queuedIds(manager)).toEqual(['player-30', 'player-31', 'player-32', 'player-33', 'player-29']);
    const allPlayers = [
      ...orderedSeatNames(manager),
      ...queuedIds(manager),
    ];
    expect(new Set(allPlayers).size).toBe(allPlayers.length);
  });

  it('ignores unaccepted leaderboard entries and warns once', () => {
    const manager = makeManager();
    addPlayers(manager, 30);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ranked = [
      { playerId: 'not-accepted', score: 10_000, correctCount: 10_000 },
      ...standings(30, (index) => 30 - index),
    ];

    try {
      manager.reorderByRank(ranked);
      manager.reorderByRank(ranked);
      expect(manager.seatForPlayer('not-accepted')).toBeNull();
      expect(manager.view(null, 1)).toMatchObject({ queued: 0, total: 30 });
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});
