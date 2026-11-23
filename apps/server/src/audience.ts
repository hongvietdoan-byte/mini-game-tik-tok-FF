import {
  assignCharacter,
  createAudienceState,
  createSlots,
  hydrateAudienceState,
  onPlayerJoined,
  type AudienceState,
  type Slot,
} from '@quiz/audience-engine';
import type { AudienceView, OptionId } from '@quiz/contracts';
import type { Store } from '@quiz/persistence';

export const DEFAULT_CHARACTER_POOL = Array.from({ length: 12 }, (_, i) => `chibi-${String(i + 1).padStart(2, '0')}`);

/**
 * Vỏ có hiệu ứng quanh audience-engine (thuần): giữ trạng thái 30 ghế của vòng hiện tại,
 * gán nhân vật (lưu DB, không random lại), xếp ghế theo điểm ở REVEAL và dựng AudienceView công khai.
 * Ghi DB theo lô (flush) — không ghi theo từng bình luận.
 */
export class AudienceManager {
  private readonly slots: Slot[] = createSlots(6, 5);
  private state: AudienceState | null = null;
  private roundId: string | null = null;
  private chars = new Map<string, string>();
  private names = new Map<string, string>();
  private joined = 0;
  private lobbyReservation = false;
  /** Khoá gán nhân vật tạm ở sảnh (chưa có roundId); nhân vật này được giữ khi vào vòng. */
  private lobbyKey: string | null = null;
  /** Người đã vào vòng (ngồi hoặc chờ) — tránh dò tuyến tính hàng chờ ở mỗi đáp án. */
  private known = new Set<string>();
  /** Stable first-join positions, maintained as players register. */
  private joinOrderIndices = new Map<string, number>();
  private dirty = false;
  private answersCache: { qid: string; answers: Map<string, OptionId> } | null = null;

  constructor(
    private readonly store: Store,
    private readonly pool: readonly string[],
    private readonly seed: number,
  ) {}

  get active() {
    return this.state !== null;
  }

  get occupiedSeats() {
    return this.state ? Object.values(this.state.seats).filter((occupant) => occupant !== null).length : 0;
  }

  /** Temporary seats are kept in memory until the preselected round actually starts. */
  openLobby() {
    this.roundId = null;
    this.state = createAudienceState(this.slots);
    this.chars.clear();
    this.names.clear();
    this.known.clear();
    this.joinOrderIndices.clear();
    this.joined = 0;
    this.answersCache = null;
    this.dirty = false;
    this.lobbyReservation = true;
    this.lobbyKey = null;
  }

  onLobbyKeyword(playerId: string, displayName: string, now: number): boolean {
    if (!this.state || !this.lobbyReservation) return false;
    return this.join(playerId, displayName, now, false);
  }

  /** Vòng mới: 30 ghế trống bên dưới ngai. Gọi TRONG transaction của ROUND_STARTED. */
  startRound(roundId: string, now: number) {
    if (this.state && this.lobbyReservation) {
      this.roundId = roundId;
      this.lobbyReservation = false;
      for (const playerId of this.known) {
        // Giữ nhân vật người xem đã thấy ở sảnh để không bị đổi hình khi vào vòng.
        const proposed = this.chars.get(playerId) ?? assignCharacter(playerId, roundId, this.pool, this.seed, [...this.chars.values()]);
        this.chars.set(playerId, this.store.assignCharacter(roundId, playerId, proposed, now));
      }
      this.store.saveAudienceState(roundId, 0, this.state, now);
      this.dirty = false;
      return;
    }
    this.roundId = roundId;
    this.state = createAudienceState(this.slots);
    this.chars.clear();
    this.names.clear();
    this.known.clear();
    this.joinOrderIndices.clear();
    this.joined = 0;
    this.answersCache = null;
    this.store.saveAudienceState(roundId, 0, this.state, now);
    this.dirty = false;
    this.lobbyReservation = false;
  }

  /** Khôi phục sau khởi động lại / reload: ghế và nhân vật lấy đúng từ DB. */
  load(roundId: string, now = Date.now()) {
    this.lobbyReservation = false;
    this.roundId = roundId;
    const savedState = this.store.loadAudienceState<AudienceState>(roundId);
    let repairedState = false;
    if (savedState) {
      const hydrated = hydrateAudienceState(savedState);
      const currentSlotIds = this.slots.map((slot) => slot.slotId).sort();
      const savedSlotIds = Object.keys(hydrated.seats).sort();
      this.state = currentSlotIds.length === savedSlotIds.length && currentSlotIds.every((id, index) => id === savedSlotIds[index])
        ? hydrated
        : this.migrateToThroneSeats(hydrated);
      repairedState = this.state !== hydrated;
    } else {
      this.state = createAudienceState(this.slots);
    }
    repairedState ||= !!savedState && !Array.isArray(savedState.joinOrder);
    const originalJoinOrder = [...(this.state.joinOrder ?? [])];
    const roundPlayers = this.store.roundPlayerJoinOrder(roundId);
    const presentBeforeRepair = new Set([
      ...Object.values(this.state.seats).flatMap((occupant) => occupant ? [occupant.playerId] : []),
      ...this.state.queue,
    ]);
    const recoveredRoundPlayers = roundPlayers.filter((player) => !presentBeforeRepair.has(player.playerId));
    for (const player of roundPlayers) {
      if (presentBeforeRepair.has(player.playerId)) continue;
      this.state = onPlayerJoined(this.state, player.playerId, player.joinedAtMs).state;
      presentBeforeRepair.add(player.playerId);
      repairedState = true;
    }
    if (recoveredRoundPlayers.length) {
      const rankByPlayer = new Map(roundPlayers.map((player, index) => [player.playerId, index]));
      const recoveredIds = new Set(recoveredRoundPlayers.map((player) => player.playerId));
      const restoredOrder = [...new Set([
        ...originalJoinOrder,
        ...Object.values(this.state.seats).flatMap((occupant) => occupant ? [occupant.playerId] : []),
        ...this.state.queue,
      ])].filter((playerId) => !recoveredIds.has(playerId));
      for (const player of recoveredRoundPlayers) {
        const playerRank = rankByPlayer.get(player.playerId)!;
        const nextRankedPlayer = restoredOrder.findIndex((playerId) => {
          const existingRank = rankByPlayer.get(playerId);
          return existingRank !== undefined && existingRank > playerRank;
        });
        if (nextRankedPlayer < 0) restoredOrder.push(player.playerId);
        else restoredOrder.splice(nextRankedPlayer, 0, player.playerId);
      }
      this.state.joinOrder = restoredOrder;
    }
    this.dirty = repairedState;
    this.chars = this.store.characterAssignments(roundId);
    const joinOrder = this.state.joinOrder ?? [];
    const ids = [...Object.values(this.state.seats).flatMap((o) => (o ? [o.playerId] : []))];
    const orderedKnown = [...new Set([...joinOrder, ...ids, ...this.state.queue])];
    this.known = new Set(orderedKnown);
    this.joinOrderIndices = new Map(orderedKnown.map((playerId, index) => [playerId, index]));
    this.names = this.store.displayNames(orderedKnown);
    for (const playerId of orderedKnown) {
      if (this.chars.has(playerId)) continue;
      const assigned = this.assignRoundCharacter(playerId, now);
      this.chars.set(playerId, assigned);
      console.warn('Missing character assignment repaired from saved audience order.', { roundId, playerId, characterId: assigned });
    }
    this.joined = this.known.size;
    this.answersCache = null;
  }

  characterOf(playerId: string, now = Date.now()): string | undefined {
    return this.chars.get(playerId) ?? this.repairCharacter(playerId, now);
  }

  /** Persist the first accepted answer's assignment inside the answer transaction. */
  persistRoundCharacter(playerId: string, now: number): string | undefined {
    if (!this.roundId) return undefined;
    const saved = this.store.characterAssignments(this.roundId);
    const existing = saved.get(playerId);
    if (existing) return existing;
    const used = new Set([...saved.values(), ...this.chars.values()]);
    const proposed = assignCharacter(playerId, this.roundId, this.pool, this.seed, [...used]);
    return this.store.assignCharacter(this.roundId, playerId, proposed, now);
  }

  /** Stable registration order used by the throne tie-break, including lobby arrivals. */
  joinOrderIndex(playerId: string): number {
    return this.joinOrderIndices.get(playerId) ?? Number.MAX_SAFE_INTEGER;
  }

  registrationOrder(): string[] {
    return [...(this.state?.joinOrder ?? [])];
  }

  updateDisplayName(playerId: string, displayName: string): boolean {
    if (!this.names.has(playerId)) return false;
    if (this.names.get(playerId) === displayName) return false;
    this.names.set(playerId, displayName);
    return true;
  }

  visiblePlayerIds(): string[] {
    if (!this.state) return [];
    return Object.values(this.state.seats).flatMap((occupant) => occupant ? [occupant.playerId] : []);
  }

  seatForPlayer(playerId: string): { slotId: string; rowIndex: number; seatIndex: number } | null {
    if (!this.state) return null;
    for (const slot of this.slots)
      if (this.state.seats[slot.slotId]?.playerId === playerId)
        return { slotId: slot.slotId, rowIndex: slot.rowIndex, seatIndex: slot.seatIndex };
    return null;
  }

  endRound() {
    this.state = null;
    this.roundId = null;
    this.lobbyReservation = false;
    this.joinOrderIndices.clear();
  }

  /**
   * Gọi sau MỖI đáp án được chấp nhận. Người mới → ghế trống gần sân khấu nhất hoặc hàng chờ; gán nhân vật lần đầu.
   * @returns true nếu bố cục ghế đổi (cần phát AUDIENCE_UPDATED).
   */
  onAccepted(playerId: string, displayName: string, now: number): boolean {
    if (!this.state || !this.roundId) return false;
    return this.join(playerId, displayName, now, true);
  }

  private join(playerId: string, displayName: string, now: number, persistCharacter: boolean): boolean {
    const state = this.state;
    if (!state) return false;
    if (this.known.has(playerId)) {
      // Đường nóng: chỉ cập nhật mốc hoạt động (trạng thái do manager sở hữu riêng, không chia sẻ).
      state.lastActiveAt[playerId] = now;
      if (this.names.has(playerId)) this.names.set(playerId, displayName);
      return false;
    }
    const hasVacantSeat = Object.values(state.seats).some((occupant) => occupant === null);
    if (hasVacantSeat) {
      const t = onPlayerJoined(state, playerId, now);
      this.state = t.state;
    } else {
      // The audience-engine reducer copies the full serializable state for pure callers.
      // Once every seat is occupied, the server-owned queue can append in place: this
      // state is private to AudienceManager and is persisted later by flush().
      state.queue.push(playerId);
      state.lastActiveAt[playerId] = now;
      state.joinOrder.push(playerId);
    }
    this.known.add(playerId);
    this.joinOrderIndices.set(playerId, this.joinOrderIndices.size);
    this.joined += 1;
    this.names.set(playerId, displayName);
    if (persistCharacter && this.roundId) {
      const proposed = this.chars.get(playerId) ?? assignCharacter(playerId, this.roundId, this.pool, this.seed, [...this.chars.values()]);
      this.chars.set(playerId, this.store.assignCharacter(this.roundId, playerId, proposed, now));
    } else if (this.lobbyReservation && !this.chars.has(playerId)) {
      // Sảnh chưa có roundId: gán tạm trong RAM (không ghi DB) để mỗi người có nhân vật riêng.
      this.lobbyKey ??= `lobby-${Math.floor(now)}`;
      this.chars.set(playerId, assignCharacter(playerId, this.lobbyKey, this.pool, this.seed, [...this.chars.values()]));
    }
    this.dirty = true;
    // LOBBY also displays the waiting count, so every new participant changes
    // the public audience view even when all 30 seats are already occupied.
    return true;
  }

  /** Select the round Top 30 at REVEAL, with the throne holder represented only on the throne. */
  reorderByRank(
    rankByPlayer: ReadonlyMap<string, { score: number; correctCount: number }>,
    throneHolderId: string | null = null,
    now = Date.now(),
  ): boolean {
    if (!this.state || !this.roundId) return false;
    const previous = this.state;
    const originalJoinOrderLength = previous.joinOrder.length;

    const currentlySeated = new Set(this.visiblePlayerIds().filter((playerId) => playerId !== throneHolderId));
    const candidateIds = new Set([
      ...this.known,
      ...(previous.joinOrder ?? []),
      ...Object.values(previous.seats).flatMap((occupant) => occupant ? [occupant.playerId] : []),
      ...previous.queue,
      ...rankByPlayer.keys(),
      ...(throneHolderId ? [throneHolderId] : []),
    ]);

    for (const [playerId, standing] of rankByPlayer) {
      if (!Number.isFinite(standing.score) || !Number.isFinite(standing.correctCount))
        throw new TypeError('Điểm và số câu đúng phải là số hữu hạn.');
      if (standing.correctCount < 0) throw new TypeError('Số câu đúng không được âm.');
      if (!candidateIds.has(playerId)) candidateIds.add(playerId);
    }

    // Standings normally contain only accepted participants, who are already
    // registered by onAccepted. Repair any missing registration deterministically.
    const joinOrderSet = new Set(previous.joinOrder);
    let nextJoinOrderIndex = previous.joinOrder.length;
    for (const playerId of candidateIds) {
      if (!joinOrderSet.has(playerId)) {
        previous.joinOrder.push(playerId);
        joinOrderSet.add(playerId);
      }
      if (!this.joinOrderIndices.has(playerId)) this.joinOrderIndices.set(playerId, nextJoinOrderIndex++);
      if (this.known.has(playerId)) continue;
      this.known.add(playerId);
      this.joined += 1;
      this.names.set(playerId, this.store.displayNames([playerId]).get(playerId) ?? 'Khán giả');
      if (!this.chars.has(playerId)) this.chars.set(playerId, this.assignRoundCharacter(playerId, now));
    }

    const scoreOf = (playerId: string) => rankByPlayer.get(playerId)?.score ?? 0;
    const correctOf = (playerId: string) => rankByPlayer.get(playerId)?.correctCount ?? 0;
    const rankedIds = [...candidateIds]
      .filter((playerId) => playerId !== throneHolderId)
      .sort((a, b) =>
        scoreOf(b) - scoreOf(a) ||
        correctOf(b) - correctOf(a) ||
        Number(currentlySeated.has(b)) - Number(currentlySeated.has(a)) ||
        this.joinOrderIndex(a) - this.joinOrderIndex(b) ||
        (a < b ? -1 : a > b ? 1 : 0),
      );

    const orderedSlots = this.orderedSlots();
    const nextSeats = { ...previous.seats };
    const selected = new Set(rankedIds.slice(0, orderedSlots.length));
    for (let index = 0; index < orderedSlots.length; index += 1) {
      const slotId = orderedSlots[index]!.slotId;
      const playerId = rankedIds[index];
      nextSeats[slotId] = playerId && selected.has(playerId) ? { playerId, pinned: false } : null;
    }
    const nextQueue = rankedIds.slice(orderedSlots.length);
    const changed = this.slots.some((slot) =>
      previous.seats[slot.slotId]?.playerId !== nextSeats[slot.slotId]?.playerId ||
      previous.seats[slot.slotId]?.pinned !== nextSeats[slot.slotId]?.pinned) ||
      previous.joinOrder.length !== originalJoinOrderLength ||
      previous.queue.length !== nextQueue.length || previous.queue.some((playerId, index) => playerId !== nextQueue[index]);
    this.state = { ...previous, seats: nextSeats, queue: nextQueue };
    if (changed) this.dirty = true;
    return changed;
  }

  /** Ghi trạng thái nếu có thay đổi (gọi trong transaction của mỗi lần chuyển trạng thái hoặc theo nhịp). */
  flush(now: number) {
    if (!this.dirty || !this.state || !this.roundId) return;
    this.store.saveAudienceState(this.roundId, this.state.rotationId, this.state, now);
    this.dirty = false;
  }

  private orderedSlots(): Slot[] {
    const seatsPerRow = new Map<number, number>();
    for (const slot of this.slots) seatsPerRow.set(slot.rowIndex, Math.max(seatsPerRow.get(slot.rowIndex) ?? 0, slot.seatIndex + 1));
    return [...this.slots].sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return b.rowIndex - a.rowIndex;
      const center = ((seatsPerRow.get(a.rowIndex) ?? 1) - 1) / 2;
      return Math.abs(a.seatIndex - center) - Math.abs(b.seatIndex - center) ||
        a.seatIndex - b.seatIndex || a.slotId.localeCompare(b.slotId);
    });
  }

  /**
   * Dựng view công khai. `revealedQid` khác null (sau khi công bố) → kèm đúng/sai của người đang ngồi cho câu đó.
   * Không bao giờ chứa playerId.
   */
  view(
    revealed: { qid: string; correctOptionId: OptionId } | null,
    now = Date.now(),
    hiddenPlayerIds: readonly string[] = [],
  ): AudienceView | null {
    if (!this.state) return null;
    const hidden = new Set(hiddenPlayerIds);
    let answers: Map<string, OptionId> | null = null;
    if (revealed) {
      if (this.answersCache?.qid !== revealed.qid)
        this.answersCache = { qid: revealed.qid, answers: this.store.answersForQuestion(revealed.qid) };
      answers = this.answersCache.answers;
    }
    const seats = this.slots.map((slot) => {
      const storedOccupant = this.state!.seats[slot.slotId] ?? null;
      // Keep a defensive rendering guard; normal REVEAL reconciliation has already
      // removed the holder from both the seat list and the queue.
      const occ = storedOccupant && !hidden.has(storedOccupant.playerId) ? storedOccupant : null;
      return {
        slotId: slot.slotId,
        rowIndex: slot.rowIndex,
        seatIndex: slot.seatIndex,
        x: slot.x,
        y: slot.y,
        scale: slot.scale,
        depth: slot.depth,
        occupant: occ
          ? {
              safeDisplayName: this.names.get(occ.playerId) ?? 'Khán giả',
              characterId: this.characterOf(occ.playerId, now)!,
              pinned: occ.pinned,
              result: !revealed
                ? null
                : answers!.has(occ.playerId)
                  ? answers!.get(occ.playerId) === revealed.correctOptionId
                    ? ('correct' as const)
                    : ('wrong' as const)
                  : ('none' as const),
            }
          : null,
      };
    });
    return { rotationId: this.state.rotationId, seats, queued: this.state.queue.length, total: this.joined };
  }

  private assignRoundCharacter(playerId: string, now: number): string {
    const roundId = this.roundId;
    if (!roundId) throw new Error('Không thể gán nhân vật bền khi chưa có vòng.');
    const used = [...this.store.characterAssignments(roundId).values(), ...this.chars.values()];
    const proposed = assignCharacter(playerId, roundId, this.pool, this.seed, used);
    return this.store.assignCharacter(roundId, playerId, proposed, now);
  }

  /** Drop the old front row when restoring a 7×5 audience snapshot for the throne layout. */
  private migrateToThroneSeats(previous: AudienceState): AudienceState {
    const migrated = createAudienceState(this.slots);
    const queue = [...previous.queue];
    for (let row = 0; row < 7; row += 1) {
      for (let seat = 0; seat < 5; seat += 1) {
        const occupant = previous.seats[`row-${row}-seat-${seat}`] ?? null;
        if (!occupant) continue;
        if (row === 0) {
          queue.push(occupant.playerId);
          continue;
        }
        migrated.seats[`row-${row - 1}-seat-${seat}`] = { ...occupant };
      }
    }
    const present = new Set([
      ...Object.values(migrated.seats).flatMap((occupant) => occupant ? [occupant.playerId] : []),
      ...queue,
    ]);
    migrated.rotationId = previous.rotationId;
    migrated.queue = [...new Set(queue)];
    migrated.lastActiveAt = Object.fromEntries(Object.entries(previous.lastActiveAt).filter(([id]) => present.has(id)));
    migrated.joinOrder = (previous.joinOrder ?? []).filter((id, index, all) => present.has(id) && all.indexOf(id) === index);
    for (const id of [...Object.values(migrated.seats).flatMap((occupant) => occupant ? [occupant.playerId] : []), ...migrated.queue])
      if (!migrated.joinOrder.includes(id)) migrated.joinOrder.push(id);
    return migrated;
  }

  private repairCharacter(playerId: string, now: number): string | undefined {
    if (this.roundId) {
      const assigned = this.assignRoundCharacter(playerId, now);
      this.chars.set(playerId, assigned);
      this.known.add(playerId);
      this.joined = this.known.size;
      console.warn('Missing character assignment repaired before public snapshot.', { roundId: this.roundId, playerId, characterId: assigned });
      return assigned;
    }
    if (this.lobbyReservation) {
      this.lobbyKey ??= `lobby-${Math.floor(now)}`;
      const assigned = assignCharacter(playerId, this.lobbyKey, this.pool, this.seed, [...this.chars.values()]);
      this.chars.set(playerId, assigned);
      this.known.add(playerId);
      this.joined = this.known.size;
      console.warn('Missing lobby character assignment repaired before public snapshot.', { playerId, characterId: assigned });
      return assigned;
    }
    throw new Error(`Audience player ${playerId} has no character assignment outside a round or lobby.`);
  }
}
