import type { PublicLeaderboardEntry, PublicPodiumSlot, PublicSnapshot, ThroneHolderView, ThroneView } from '@quiz/contracts';

export type PublicThroneHolder = ThroneHolderView;
export type PublicThrone = ThroneView;

export type SnapshotWithThrone = PublicSnapshot & { throne: PublicThrone };

export function publicThroneHolderId(holder: PublicThroneHolder): string {
  return holder.playerId;
}

export function getPublicThrone(snapshot: PublicSnapshot): PublicThrone | null {
  const value: unknown = snapshot.throne;
  if (!value || typeof value !== 'object') return null;
  const throne = value as Partial<PublicThrone>;
  if (throne.unlockAfterQuestion !== 5 || !['LOCKED', 'EMPTY', 'HELD'].includes(String(throne.state))) return null;
  if (throne.state !== 'HELD') return { state: throne.state as 'LOCKED' | 'EMPTY', unlockAfterQuestion: 5 };
  const holder = (throne as Extract<PublicThrone, { state: 'HELD' }>).holder;
  if (!holder || typeof holder.playerId !== 'string' || !holder.playerId ||
    typeof holder.safeDisplayName !== 'string' || !holder.safeDisplayName.trim() ||
    typeof holder.characterId !== 'string' || !holder.characterId ||
    !Number.isFinite(holder.score) || holder.score < 0 || !Number.isSafeInteger(holder.streak) || holder.streak < 0) return null;
  return { state: 'HELD', unlockAfterQuestion: 5, holder };
}

export function orderRankOneHolderFirst<T extends { rank: number; playerId: string }>(
  entries: readonly T[], holderId?: string,
): T[] {
  const group = entries.filter((entry) => entry.rank === 1);
  if (!holderId || group.length < 2 || !group.some((entry) => entry.playerId === holderId)) return [...entries];
  return [...group.filter((entry) => entry.playerId === holderId), ...group.filter((entry) => entry.playerId !== holderId), ...entries.filter((entry) => entry.rank !== 1)];
}

export function orderPodiumHolderFirst(slots: readonly PublicPodiumSlot[], holderId?: string): PublicPodiumSlot[] {
  const ordered = slots.map((slot) => ({ ...slot, entries: orderRankOneHolderFirst(slot.entries, holderId) }));
  if (!holderId) return ordered;
  const holderSlot = ordered.find((slot) => slot.rank === 1 && slot.entries.some((entry) => entry.playerId === holderId));
  if (!holderSlot) return ordered;
  return [holderSlot, ...ordered.filter((slot) => slot !== holderSlot)];
}
