import { describe, expect, it } from 'vitest';
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

function seatedIds(manager: AudienceManager) {
  return manager.visiblePlayerIds();
}

describe('AudienceManager rotation policy', () => {
  it('moves a held-throne player to the queue and gives their chair to the next waiting player', () => {
    const manager = makeManager();
    manager.startRound('round-1', 0);
    for (let index = 0; index < 37; index += 1) manager.onAccepted(`player-${index}`, `Player ${index}`, index);
    const holder = seatedIds(manager)[0]!;
    const chair = manager.seatForPlayer(holder)!.slotId;

    expect(manager.rotateBetweenQuestions(100, [holder], holder)).toBe(true);

    const successor = seatedIds(manager).find((playerId) => playerId !== holder && manager.seatForPlayer(playerId)?.slotId === chair);
    expect(successor).toBe('player-30');
    expect(manager.seatForPlayer(holder)).toBeNull();
    expect(new Set(seatedIds(manager)).size).toBe(30);
    expect(manager.view(null, 100, [holder])?.seats.find((seat) => seat.slotId === chair)?.occupant?.safeDisplayName).toBe('player-30');
  });

  it('rotates a player after three misses despite a Top-5 pin, keeps two misses, and holds seats if the queue is empty', () => {
    const manager = makeManager();
    manager.startRound('round-2', 0);
    for (let index = 0; index < 37; index += 1) manager.onAccepted(`player-${index}`, `Player ${index}`, index);
    const [miss3, miss2] = seatedIds(manager).slice(0, 2);
    const miss3Chair = manager.seatForPlayer(miss3!)!.slotId;

    manager.recordClosedQuestion(seatedIds(manager).filter((playerId) => playerId !== miss3 && playerId !== miss2));
    manager.recordClosedQuestion(seatedIds(manager).filter((playerId) => playerId !== miss3 && playerId !== miss2));
    manager.recordClosedQuestion(seatedIds(manager).filter((playerId) => playerId !== miss3));
    manager.rotateBetweenQuestions(200, [miss3!, miss2!]);

    expect(manager.seatForPlayer(miss3!)).toBeNull();
    expect(manager.seatForPlayer(miss2!)).not.toBeNull();
    expect(manager.seatForPlayer('player-30')?.slotId).toBe(miss3Chair);

    const noQueue = makeManager();
    noQueue.startRound('round-3', 0);
    for (let index = 0; index < 30; index += 1) noQueue.onAccepted(`seated-${index}`, `Seated ${index}`, index);
    const inactive = seatedIds(noQueue)[0]!;
    const before = noQueue.seatForPlayer(inactive);
    for (let index = 0; index < 3; index += 1)
      noQueue.recordClosedQuestion(seatedIds(noQueue).filter((playerId) => playerId !== inactive));
    expect(noQueue.rotateBetweenQuestions(300, [inactive])).toBe(false);
    expect(noQueue.seatForPlayer(inactive)).toEqual(before);
  });

  it('ưu tiên thay mọi ghế có người bỏ ba câu trước năm lượt xoay ngẫu nhiên', () => {
    const manager = makeManager();
    manager.startRound('round-many-misses', 0);
    for (let index = 0; index < 37; index += 1) manager.onAccepted(`player-${index}`, `Player ${index}`, index);
    const missed = seatedIds(manager).slice(0, 6);
    for (let index = 0; index < 3; index += 1)
      manager.recordClosedQuestion(seatedIds(manager).filter((playerId) => !missed.includes(playerId)));

    manager.rotateBetweenQuestions(400, missed.slice(0, 5));

    expect(missed.every((playerId) => manager.seatForPlayer(playerId) === null)).toBe(true);
    expect(Array.from({ length: 6 }, (_, index) => manager.seatForPlayer(`player-${30 + index}`)).every(Boolean)).toBe(true);
  });
});
