import {
  assignCharacter,
  createAudienceState,
  createSlots,
  onPlayerJoined,
  pin,
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

  /** Vòng mới: 35 ghế trống. Gọi TRONG transaction của ROUND_STARTED. */
  startRound(roundId: string, now: number) {
    this.roundId = roundId;
    this.state = createAudienceState(this.slots);
    this.chars.clear();
    this.names.clear();
    this.known.clear();
    this.joined = 0;
    this.answersCache = null;
    this.store.saveAudienceState(roundId, 0, this.state, now);
    this.dirty = false;
  }

  /** Khôi phục sau khởi động lại / reload: ghế và nhân vật lấy đúng từ DB. */
  load(roundId: string) {
    this.roundId = roundId;
    this.state = this.store.loadAudienceState<AudienceState>(roundId) ?? createAudienceState(this.slots);
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

  endRound() {
    this.state = null;
    this.roundId = null;
  }

  /**
   * Gọi sau MỖI đáp án được chấp nhận. Người mới → ghế trống gần sân khấu nhất hoặc hàng chờ; gán nhân vật lần đầu.
   * @returns true nếu bố cục ghế đổi (cần phát AUDIENCE_UPDATED).
   */
  onAccepted(playerId: string, displayName: string, now: number): boolean {
    if (!this.state || !this.roundId) return false;
    if (this.known.has(playerId)) {
      // Đường nóng: chỉ cập nhật mốc hoạt động (trạng thái do manager sở hữu riêng, không chia sẻ).
      this.state.lastActiveAt[playerId] = now;
      if (this.names.has(playerId)) this.names.set(playerId, displayName);
      return false;
    }
    const t = onPlayerJoined(this.state, playerId, now);
    this.known.add(playerId);
    this.state = t.state;
    this.joined += 1;
    this.names.set(playerId, displayName);
    const proposed = assignCharacter(playerId, this.roundId, this.pool, this.seed);
    this.chars.set(playerId, this.store.assignCharacter(this.roundId, playerId, proposed, now));
    this.dirty = true;
    return t.events.length > 0;
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
              displayName: this.names.get(occ.playerId) ?? 'Khán giả',
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
