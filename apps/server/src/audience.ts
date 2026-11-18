import {
  assignCharacter,
  createAudienceState,
  createSlots,
  hydrateAudienceState,
  onPlayerJoined,
  pin,
  reorderSeatedByRank,
  rotate,
  type AudienceState,
  type Slot,
} from '@quiz/audience-engine';
import type { AudienceView, OptionId } from '@quiz/contracts';
import type { Store } from '@quiz/persistence';

export const DEFAULT_CHARACTER_POOL = Array.from({ length: 12 }, (_, i) => `chibi-${String(i + 1).padStart(2, '0')}`);

/**
 * Vỏ có hiệu ứng quanh audience-engine (thuần): giữ trạng thái 35 ghế của vòng hiện tại,
 * gán nhân vật (lưu DB, không random lại), xoay ghế giữa các câu, và dựng AudienceView công khai.
 * Ghi DB theo lô (flush) — không ghi theo từng bình luận.
 */
export class AudienceManager {
  private readonly slots: Slot[] = createSlots();
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

  /** Vòng mới: 35 ghế trống. Gọi TRONG transaction của ROUND_STARTED. */
  startRound(roundId: string, now: number) {
    if (this.state && this.lobbyReservation) {
      this.roundId = roundId;
      this.lobbyReservation = false;
      for (const playerId of this.known) {
        // Giữ nhân vật người xem đã thấy ở sảnh để không bị đổi hình khi vào vòng.
        const proposed = this.chars.get(playerId) ?? assignCharacter(playerId, roundId, this.pool, this.seed);
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
    this.joined = 0;
    this.answersCache = null;
    this.store.saveAudienceState(roundId, 0, this.state, now);
    this.dirty = false;
    this.lobbyReservation = false;
  }

  /** Khôi phục sau khởi động lại / reload: ghế và nhân vật lấy đúng từ DB. */
  load(roundId: string) {
    this.lobbyReservation = false;
    this.roundId = roundId;
    const savedState = this.store.loadAudienceState<AudienceState>(roundId);
    this.state = savedState ? hydrateAudienceState(savedState) : createAudienceState(this.slots);
    this.dirty = !!savedState && !Array.isArray(savedState.joinOrder);
    this.chars = this.store.characterAssignments(roundId);
    this.joined = this.chars.size;
    const ids = [...Object.values(this.state.seats).flatMap((o) => (o ? [o.playerId] : []))];
    this.names = this.store.displayNames(ids);
    this.known = new Set([...ids, ...this.state.queue]);
    this.answersCache = null;
  }

  characterOf(playerId: string): string | undefined {
    return this.chars.get(playerId);
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
    this.joined += 1;
    this.names.set(playerId, displayName);
    if (persistCharacter && this.roundId) {
      const proposed = assignCharacter(playerId, this.roundId, this.pool, this.seed);
      this.chars.set(playerId, this.store.assignCharacter(this.roundId, playerId, proposed, now));
    } else if (this.lobbyReservation && !this.chars.has(playerId)) {
      // Sảnh chưa có roundId: gán tạm trong RAM (không ghi DB) để mỗi người có nhân vật riêng.
      this.lobbyKey ??= `lobby-${Math.floor(now)}`;
      this.chars.set(playerId, assignCharacter(playerId, this.lobbyKey, this.pool, this.seed));
    }
    this.dirty = true;
    // LOBBY also displays the waiting count, so every new participant changes
    // the public audience view even when all 35 seats are already occupied.
    return true;
  }

  /** Xoay ghế giữa hai câu: ghim Top N đang ngồi, thay tối đa 5 ghế. @returns true nếu có ghế đổi người. */
  rotateBetweenQuestions(now: number, topPlayerIds: readonly string[]): boolean {
    if (!this.state || !this.roundId) return false;
    const pinned = topPlayerIds.filter((p) => this.isSeated(p)).slice(0, 5);
    const pinnedState = pin(this.state, pinned);
    const t = rotate(pinnedState, { now, seed: (this.seed + pinnedState.rotationId * 7919) >>> 0, betweenQuestions: true, maxSwaps: 5 });
    this.state = t.state;
    const incoming = t.events.filter((e) => e.type === 'seat_assigned').map((e) => e.playerId);
    if (incoming.length) for (const [id, n] of this.store.displayNames(incoming)) this.names.set(id, n);
    this.dirty = true;
    return t.events.length > 0;
  }

  /** Re-rank the existing audience after a finalized reveal; no one enters or leaves. */
  reorderByRank(scoreByPlayer: ReadonlyMap<string, number | null>): boolean {
    if (!this.state || !this.roundId) return false;
    const previous = this.state;
    const result = reorderSeatedByRank(previous, scoreByPlayer);
    const changed = this.slots.some((slot) =>
      previous.seats[slot.slotId]?.playerId !== result.state.seats[slot.slotId]?.playerId ||
      previous.seats[slot.slotId]?.pinned !== result.state.seats[slot.slotId]?.pinned);
    this.state = result.state;
    if (changed || !Array.isArray(previous.joinOrder)) this.dirty = true;
    return changed;
  }

  /** Ghi trạng thái nếu có thay đổi (gọi trong transaction của mỗi lần chuyển trạng thái hoặc theo nhịp). */
  flush(now: number) {
    if (!this.dirty || !this.state || !this.roundId) return;
    this.store.saveAudienceState(this.roundId, this.state.rotationId, this.state, now);
    this.dirty = false;
  }

  private isSeated(playerId: string) {
    return !!this.state && Object.values(this.state.seats).some((o) => o?.playerId === playerId);
  }

  /**
   * Dựng view công khai. `revealedQid` khác null (sau khi công bố) → kèm đúng/sai của người đang ngồi cho câu đó.
   * Không bao giờ chứa playerId.
   */
  view(revealed: { qid: string; correctOptionId: OptionId } | null): AudienceView | null {
    if (!this.state) return null;
    let answers: Map<string, OptionId> | null = null;
    if (revealed) {
      if (this.answersCache?.qid !== revealed.qid)
        this.answersCache = { qid: revealed.qid, answers: this.store.answersForQuestion(revealed.qid) };
      answers = this.answersCache.answers;
    }
    const seats = this.slots.map((slot) => {
      const occ = this.state!.seats[slot.slotId] ?? null;
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
              characterId: this.chars.get(occ.playerId) ?? this.pool[0]!,
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
}
