export type Slot = {
  slotId: string;
  rowIndex: number;
  seatIndex: number;
  /** Pixel coordinates in the 1080 × 1920 overlay canvas. */
  x: number;
  y: number;
  scale: number;
  /** Higher values render in front of lower values. */
  depth: number;
};

export type SeatOccupant = { playerId: string; pinned: boolean };

export type AudienceState = {
  rotationId: number;
  seats: Record<string, SeatOccupant | null>;
  queue: string[];
  lastActiveAt: Record<string, number>;
};

export type AudienceEvent =
  | { type: 'seat_assigned'; rotationId: number; slotId: string; playerId: string; atMs: number }
  | { type: 'seat_released'; rotationId: number; slotId: string; playerId: string; atMs: number };

export type AudienceTransition = { state: AudienceState; events: AudienceEvent[] };

export type RotateOptions = {
  /** Maximum number of seats whose occupant changes during this rotation. */
  maxSwaps?: number;
  now: number;
  seed: number;
  /** At most five player IDs may be pinned across state and this request. */
  pinned?: readonly string[];
  /** The owner should call rotate only between questions; false is a guarded no-op. */
  betweenQuestions?: boolean;
};

const CANVAS_WIDTH = 1080;
const AUDIENCE_TOP = 1080;
const AUDIENCE_BOTTOM = 1850;
const FRONT_Y = AUDIENCE_BOTTOM - 25;
const BACK_Y = AUDIENCE_TOP + 25;
const X_MARGIN = 160;
const MAX_X_SPACING = 190;
const SOURCE_CHARACTER_HEIGHT = 110;
const NAMEPLATE_HEIGHT = 26;
const MAX_FRONT_SCALE = 0.72;
const BACK_SCALE_RATIO = 0.82;

function requireIntegerAtLeast(value: number, name: string, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} phải là số nguyên ≥ ${minimum}.`);
  }
}

/**
 * Tạo các slot theo tọa độ pixel. Hàng 0 là hàng trước ở mép foreground;
 * hàng sau lùi dần lên trên (y giảm) và scale giảm 18%. Khoảng cách dọc chia
 * đều vùng 1130–1825; với 7 hàng là khoảng 116 px. Character dùng anchor chân,
 * cao tối đa 110 px × scale, nameplate tối đa 26 px nên mỗi hàng chiếm tối đa
 * 106 px ở scale trước 0.72 — còn khoảng hở, không đè nameplate hàng trước.
 * X được căn giữa trong vùng 160–920; slotIndex giữ thứ tự trái→phải, còn thứ
 * tự cấp ghế center-out được áp dụng trong onPlayerJoined/rotate.
 */
export function createSlots(rows = 7, seatsPerRow = 5): Slot[] {
  requireIntegerAtLeast(rows, 'rows', 0);
  requireIntegerAtLeast(seatsPerRow, 'seatsPerRow', 0);
  if (rows === 0 || seatsPerRow === 0) return [];

  const slots: Slot[] = [];
  const usableWidth = CANVAS_WIDTH - X_MARGIN * 2;
  const xSpacing =
    seatsPerRow <= 1 ? 0 : Math.min(MAX_X_SPACING, usableWidth / (seatsPerRow - 1));
  const ySpan = FRONT_Y - BACK_Y;
  const rowSpacing = rows <= 1 ? ySpan : ySpan / (rows - 1);
  const maxScaleFromRowSpacing =
    rowSpacing <= 0 ? MAX_FRONT_SCALE : (rowSpacing - NAMEPLATE_HEIGHT) / SOURCE_CHARACTER_HEIGHT;
  const frontScale = Math.max(0.1, Math.min(MAX_FRONT_SCALE, maxScaleFromRowSpacing));

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const progress = rows <= 1 ? 0 : rowIndex / (rows - 1);
    const y = rows <= 1 ? (FRONT_Y + BACK_Y) / 2 : FRONT_Y - progress * ySpan;
    const scale = frontScale * (1 - (1 - BACK_SCALE_RATIO) * progress);
    for (let seatIndex = 0; seatIndex < seatsPerRow; seatIndex += 1) {
      const x = seatsPerRow <= 1
        ? CANVAS_WIDTH / 2
        : CANVAS_WIDTH / 2 + (seatIndex - (seatsPerRow - 1) / 2) * xSpacing;
      slots.push({
        slotId: `row-${rowIndex}-seat-${seatIndex}`,
        rowIndex,
        seatIndex,
        x,
        y,
        scale,
        depth: rows - rowIndex,
      });
    }
  }
  return slots;
}

function cloneState(state: AudienceState): AudienceState {
  return {
    rotationId: state.rotationId,
    seats: Object.fromEntries(
      Object.entries(state.seats).map(([slotId, occupant]) => [
        slotId,
        occupant ? { ...occupant } : null,
      ]),
    ),
    queue: [...state.queue],
    lastActiveAt: { ...state.lastActiveAt },
  };
}

/** Build an empty, serializable audience snapshot from a slot layout. */
export function createAudienceState(slots: readonly Slot[] = createSlots()): AudienceState {
  const seats: Record<string, SeatOccupant | null> = {};
  for (const slot of slots) {
    if (Object.hasOwn(seats, slot.slotId)) throw new Error(`slotId bị trùng: ${slot.slotId}`);
    seats[slot.slotId] = null;
  }
  return { rotationId: 0, seats, queue: [], lastActiveAt: {} };
}

function orderedSlotIds(seats: Record<string, SeatOccupant | null>): string[] {
  const parsed = Object.keys(seats).map((slotId) => {
    const match = /^row-(\d+)-seat-(\d+)$/.exec(slotId);
    return match
      ? { slotId, row: Number(match[1]), seat: Number(match[2]), parsed: true }
      : { slotId, row: Number.MAX_SAFE_INTEGER, seat: Number.MAX_SAFE_INTEGER, parsed: false };
  });
  const counts = new Map<number, number>();
  for (const slot of parsed) {
    if (slot.parsed) counts.set(slot.row, Math.max(counts.get(slot.row) ?? 0, slot.seat + 1));
  }
  return parsed
    .sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      const count = counts.get(a.row) ?? 0;
      const center = (count - 1) / 2;
      const distance = Math.abs(a.seat - center) - Math.abs(b.seat - center);
      return distance || a.seat - b.seat || a.slotId.localeCompare(b.slotId);
    })
    .map((slot) => slot.slotId);
}

function knownPlayer(state: AudienceState, playerId: string): boolean {
  return state.queue.includes(playerId) || Object.values(state.seats).some((seat) => seat?.playerId === playerId);
}

function assertPlayerId(playerId: string): void {
  if (typeof playerId !== 'string' || playerId.trim().length === 0) {
    throw new TypeError('playerId phải là chuỗi không rỗng.');
  }
}

function assertTime(now: number): void {
  if (!Number.isFinite(now)) throw new TypeError('now phải là số hữu hạn.');
}

/** First join takes the first free seat by row, then center-out; overflow queues. */
export function onPlayerJoined(state: AudienceState, playerId: string, now: number): AudienceTransition {
  assertPlayerId(playerId);
  assertTime(now);
  if (knownPlayer(state, playerId)) return { state, events: [] };

  const next = cloneState(state);
  const slotId = orderedSlotIds(next.seats).find((id) => next.seats[id] === null);
  if (slotId === undefined) {
    next.queue.push(playerId);
    next.lastActiveAt[playerId] = now;
    return { state: next, events: [] };
  }

  next.seats[slotId] = { playerId, pinned: false };
  next.lastActiveAt[playerId] = now;
  return {
    state: next,
    events: [{ type: 'seat_assigned', rotationId: next.rotationId, slotId, playerId, atMs: now }],
  };
}

/** Activity only updates known players; it never creates a seat or joins the queue. */
export function onPlayerActive(state: AudienceState, playerId: string, now: number): AudienceTransition {
  assertPlayerId(playerId);
  assertTime(now);
  if (!knownPlayer(state, playerId)) return { state, events: [] };
  const next = cloneState(state);
  next.lastActiveAt[playerId] = now;
  return { state: next, events: [] };
}

/** Pin (or clear) up to five currently seated players; queued players remain queued. */
export function pin(state: AudienceState, playerIds: readonly string[]): AudienceState {
  const unique = new Set(playerIds);
  if (unique.size > 5) throw new RangeError('Tối đa 5 playerId được pin.');
  for (const playerId of unique) assertPlayerId(playerId);

  const next = cloneState(state);
  for (const occupant of Object.values(next.seats)) {
    if (occupant) occupant.pinned = unique.has(occupant.playerId);
  }
  return next;
}

function createRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!];
  }
  return items;
}

function getSeatGroupsByInactivity(
  state: AudienceState,
  seatIds: readonly string[],
  random: () => number,
): string[] {
  const tieOrder = shuffle([...seatIds].sort(), random);
  const tieRank = new Map(tieOrder.map((slotId, index) => [slotId, index]));
  return [...seatIds].sort((a, b) => {
    const aPlayer = state.seats[a]!.playerId;
    const bPlayer = state.seats[b]!.playerId;
    // A missing activity timestamp is least recently active. Equal timestamps
    // are seeded-shuffled, so player IDs and comment volume never determine rank.
    const activity = (state.lastActiveAt[aPlayer] ?? Number.NEGATIVE_INFINITY) -
      (state.lastActiveAt[bPlayer] ?? Number.NEGATIVE_INFINITY);
    return activity || (tieRank.get(a)! - tieRank.get(b)!);
  });
}

/**
 * Rotate only at an inter-question boundary (the caller owns game phase).
 * Queue entrants take vacancies first; if seats are full, oldest-inactive,
 * unpinned occupants return to the queue. The seed shuffles tie/order choices;
 * no comment count is stored or consulted.
 */
export function rotate(state: AudienceState, options: RotateOptions): AudienceTransition {
  const { now, seed, betweenQuestions = true } = options;
  const maxSwaps = options.maxSwaps ?? 5;
  requireIntegerAtLeast(maxSwaps, 'maxSwaps', 0);
  requireIntegerAtLeast(seed, 'seed', 0);
  assertTime(now);
  if (!betweenQuestions) return { state, events: [] };

  const requestedPinned = new Set(options.pinned ?? []);
  for (const playerId of requestedPinned) assertPlayerId(playerId);
  if (requestedPinned.size > 5) throw new RangeError('Tối đa 5 playerId được pin.');
  const existingPinned = Object.values(state.seats)
    .filter((occupant): occupant is SeatOccupant => occupant !== null && occupant.pinned)
    .map((occupant) => occupant.playerId);
  const pinnedIds = new Set([...existingPinned, ...requestedPinned]);
  if (pinnedIds.size > 5) throw new RangeError('Tổng số playerId được pin không vượt quá 5.');

  const next = cloneState(state);
  const rotationId = state.rotationId + 1;
  next.rotationId = rotationId;
  const events: AudienceEvent[] = [];
  const random = createRandom(seed);
  const queueOrder = shuffle([...next.queue], random);
  const incoming = [...queueOrder];
  const remainingQueue = [...queueOrder];
  let swaps = 0;
  const slotIds = orderedSlotIds(next.seats);

  // Repair/fill vacancies before displacing anyone; one filled seat is one swap.
  for (const slotId of slotIds) {
    if (swaps >= maxSwaps || incoming.length === 0) break;
    if (next.seats[slotId] !== null) continue;
    const playerId = incoming.shift()!;
    remainingQueue.splice(remainingQueue.indexOf(playerId), 1);
    next.seats[slotId] = { playerId, pinned: pinnedIds.has(playerId) };
    events.push({ type: 'seat_assigned', rotationId, slotId, playerId, atMs: now });
    swaps += 1;
  }

  if (incoming.length > 0 && swaps < maxSwaps) {
    const candidates = slotIds.filter((slotId) => {
      const occupant = next.seats[slotId];
      return occupant != null && !occupant.pinned && !pinnedIds.has(occupant.playerId);
    });
    const oldestInactiveFirst = getSeatGroupsByInactivity(next, candidates, random);
    for (const slotId of oldestInactiveFirst) {
      if (swaps >= maxSwaps || incoming.length === 0) break;
      const outgoing = next.seats[slotId]!;
      const incomingPlayerId = incoming.shift()!;
      remainingQueue.splice(remainingQueue.indexOf(incomingPlayerId), 1);
      events.push({ type: 'seat_released', rotationId, slotId, playerId: outgoing.playerId, atMs: now });
      next.queue.push(outgoing.playerId);
      next.seats[slotId] = { playerId: incomingPlayerId, pinned: pinnedIds.has(incomingPlayerId) };
      events.push({ type: 'seat_assigned', rotationId, slotId, playerId: incomingPlayerId, atMs: now });
      swaps += 1;
    }
  }

  // Keep unselected queue members in their previous relative order, then append
  // released occupants in the deterministic seat-selection order.
  const released = next.queue.slice(state.queue.length);
  next.queue = [...remainingQueue, ...released];
  return { state: next, events };
}

/** Stateless assignment: same identity, round, pool and seed always select the same ID. */
export function assignCharacter(
  playerId: string,
  roundId: string,
  pool: readonly string[],
  seed: number,
): string {
  assertPlayerId(playerId);
  assertPlayerId(roundId);
  requireIntegerAtLeast(seed, 'seed', 0);
  if (pool.length === 0) throw new RangeError('character pool không được rỗng.');
  for (const characterId of pool) assertPlayerId(characterId);

  const sortedPool = [...pool].sort();
  const input = `${seed}\u0000${roundId}\u0000${playerId}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const unsignedHash = hash >>> 0;
  return sortedPool[unsignedHash % sortedPool.length]!;
}
