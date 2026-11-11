import type { LeaderboardEntry, PodiumSlot, PublicSnapshot } from '@quiz/contracts';

export function selectNewestSnapshot(
  current: PublicSnapshot | null,
  incoming: PublicSnapshot,
  allowVersionReset = false,
): PublicSnapshot {
  return current && incoming.stateVersion < current.stateVersion && !allowVersionReset ? current : incoming;
}

/** seq advances within one server run; the first snapshot after reconnect may start a new run. */
export function shouldAcceptSnapshotSeq(
  currentSeq: number | null,
  incomingSeq: number,
  awaitingFreshSnapshot = false,
): boolean {
  if (!Number.isSafeInteger(incomingSeq) || incomingSeq < 0) return false;
  return awaitingFreshSnapshot || currentSeq === null || incomingSeq > currentSeq;
}

export function interpolateRemainingMs(
  remainingMs: number,
  running: boolean,
  elapsedMs: number,
): number {
  if (!running) return Math.max(0, remainingMs);
  return Math.max(0, remainingMs - Math.max(0, elapsedMs));
}

export function leaderboardPages(entries: LeaderboardEntry[], pageSize = 5): LeaderboardEntry[][] {
  const safeSize = Math.max(1, Math.floor(pageSize));
  if (entries.length <= safeSize) return [entries];
  const pages: LeaderboardEntry[][] = [];
  for (let i = 0; i < entries.length; i += safeSize) pages.push(entries.slice(i, i + safeSize));
  return pages;
}

export function podiumLeftToRight(slots: PodiumSlot[]): PodiumSlot[] {
  const order: Record<PodiumSlot['place'], number> = { 2: 0, 1: 1, 3: 2 };
  return [...slots].sort((a, b) => order[a.place] - order[b.place]);
}
