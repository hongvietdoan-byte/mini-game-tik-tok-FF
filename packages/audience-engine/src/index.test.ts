import { describe, expect, it } from 'vitest';
import {
  assignCharacter,
  createAudienceState,
  createSlots,
  onPlayerActive,
  onPlayerJoined,
  pin,
  rotate,
  type AudienceState,
} from './index';

function ids(state: AudienceState): string[] {
  return [
    ...Object.values(state.seats).flatMap((seat) => seat ? [seat.playerId] : []),
    ...state.queue,
  ];
}

function expectInvariants(state: AudienceState, joinedCount: number): void {
  const occupants = Object.values(state.seats).flatMap((seat) => seat ? [seat.playerId] : []);
  expect(occupants.length).toBeLessThanOrEqual(Object.keys(state.seats).length);
  expect(new Set(occupants).size).toBe(occupants.length);
  expect(new Set(state.queue).size).toBe(state.queue.length);
  expect(new Set([...occupants, ...state.queue]).size).toBe(joinedCount);
  expect(ids(state)).toHaveLength(joinedCount);
}

function joinMany(state: AudienceState, count: number): AudienceState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = onPlayerJoined(next, `player-${String(index).padStart(3, '0')}`, index).state;
  }
  return next;
}

describe('createSlots', () => {
  it('tạo 7×5 slot duy nhất trong vùng khán giả 1080×1920', () => {
    const slots = createSlots();
    expect(slots).toHaveLength(35);
    expect(new Set(slots.map((slot) => slot.slotId)).size).toBe(35);
    expect(slots[0]).toMatchObject({ slotId: 'row-0-seat-0', rowIndex: 0, seatIndex: 0 });
    expect(slots.every((slot) => slot.x >= 160 && slot.x <= 920 && slot.y >= 1080 && slot.y <= 1850)).toBe(true);
  });

  it('đặt hàng sau cao hơn/nhỏ hơn và chừa khoảng cho avatar cùng nameplate', () => {
    const slots = createSlots();
    const front = slots.find((slot) => slot.slotId === 'row-0-seat-2')!;
    const back = slots.find((slot) => slot.slotId === 'row-6-seat-2')!;
    const rowPitch = front.y - back.y;
    const maximumRowBlock = 110 * front.scale + 26;
    expect(back.y).toBeLessThan(front.y);
    expect(back.scale).toBeLessThan(front.scale);
    expect(rowPitch / 6).toBeGreaterThan(maximumRowBlock);
    expect(front.depth).toBeGreaterThan(back.depth);
  });

  it('căn giữa từng hàng và hỗ trợ layout có số hàng/ghế khác', () => {
    expect(createSlots(2, 1).map((slot) => slot.x)).toEqual([540, 540]);
    expect(createSlots(0, 5)).toEqual([]);
    expect(createSlots(2, 4)).toHaveLength(8);
    expect(() => createSlots(-1, 5)).toThrow(RangeError);
    expect(() => createSlots(1.5, 5)).toThrow(RangeError);
  });
});

describe('assignCharacter', () => {
  const pool = ['chibi-c', 'chibi-a', 'chibi-b'];

  it('ổn định theo player/round/seed, không phụ thuộc thứ tự gọi hoặc thứ tự pool', () => {
    const first = assignCharacter('p-1', 'r-1', pool, 42);
    assignCharacter('p-2', 'r-1', pool, 42);
    expect(assignCharacter('p-1', 'r-1', [...pool].reverse(), 42)).toBe(first);
    expect(assignCharacter('p-1', 'r-1', pool, 42)).toBe(first);
    expect(new Set(Array.from({ length: 40 }, (_, index) => assignCharacter(`p-${index}`, 'r-1', pool, 42))).size)
      .toBeGreaterThan(1);
  });

  it('từ chối pool rỗng và định danh không hợp lệ', () => {
    expect(() => assignCharacter('p', 'r', [], 1)).toThrow(RangeError);
    expect(() => assignCharacter('p', 'r', [''], 1)).toThrow(TypeError);
  });
});

describe('audience seating', () => {
  it('cấp ghế trống theo hàng trước→sau rồi giữa→mép; tràn vào queue', () => {
    let state = createAudienceState(createSlots(2, 5));
    const assigned: string[] = [];
    for (let index = 0; index < 10; index += 1) {
      const result = onPlayerJoined(state, `p${index}`, index);
      state = result.state;
      assigned.push(result.events[0]!.slotId);
    }
    expect(assigned).toEqual([
      'row-0-seat-2', 'row-0-seat-1', 'row-0-seat-3', 'row-0-seat-0', 'row-0-seat-4',
      'row-1-seat-2', 'row-1-seat-1', 'row-1-seat-3', 'row-1-seat-0', 'row-1-seat-4',
    ]);
    const overflow = onPlayerJoined(state, 'overflow', 10);
    expect(overflow.events).toEqual([]);
    expect(overflow.state.queue).toEqual(['overflow']);
  });

  it('join lặp không nhân đôi, activity chỉ cập nhật người đã tham gia', () => {
    const state = onPlayerJoined(createAudienceState(createSlots(1, 1)), 'p1', 10).state;
    expect(onPlayerJoined(state, 'p1', 20)).toEqual({ state, events: [] });
    const active = onPlayerActive(state, 'p1', 30);
    expect(active.state.lastActiveAt.p1).toBe(30);
    expect(onPlayerActive(state, 'unknown', 40)).toEqual({ state, events: [] });
  });

  it('pin chỉ giữ tối đa 5 người đang ngồi và có thể bỏ pin', () => {
    const state = joinMany(createAudienceState(createSlots()), 35);
    const firstFive = Object.values(state.seats).flatMap((seat) => seat ? [seat.playerId] : []).slice(0, 5);
    const pinned = pin(state, firstFive);
    expect(Object.values(pinned.seats).filter((seat) => seat?.pinned)).toHaveLength(5);
    expect(Object.values(pin(pinned, []).seats).some((seat) => seat?.pinned)).toBe(false);
    expect(() => pin(state, ['1', '2', '3', '4', '5', '6'])).toThrow(RangeError);
  });

  it('rotate đưa queue lên, đẩy người ít hoạt động nhất xuống và phát đúng sự kiện', () => {
    let state = joinMany(createAudienceState(createSlots(1, 2)), 4);
    const occupants = Object.values(state.seats).flatMap((seat) => seat ? [seat.playerId] : []);
    state = onPlayerActive(state, occupants[0]!, 100).state;
    state = onPlayerActive(state, occupants[1]!, 200).state;
    const before = state;
    const result = rotate(state, { now: 500, seed: 7, pinned: [], maxSwaps: 1 });
    expect(result.state.rotationId).toBe(1);
    expect(result.state.queue).toContain(occupants[0]);
    expect(result.events).toHaveLength(2);
    expect(result.events.map((event) => event.type)).toEqual(['seat_released', 'seat_assigned']);
    expect(result.events[0]).toMatchObject({ playerId: occupants[0], atMs: 500 });
    expect(ids(before)).toEqual(ids(state));
    expect(state.rotationId).toBe(0);
  });

  it('không đổi ghế pin, giới hạn số ghế thay và có thể chặn rotation ngoài boundary', () => {
    let state = joinMany(createAudienceState(createSlots(1, 5)), 8);
    const pinnedPlayer = Object.values(state.seats).find((seat) => seat)?.playerId!;
    state = pin(state, [pinnedPlayer]);
    const guarded = rotate(state, { now: 20, seed: 1, betweenQuestions: false });
    expect(guarded.state).toBe(state);
    expect(guarded.events).toEqual([]);
    const result = rotate(state, { now: 20, seed: 1, maxSwaps: 2 });
    expect(result.events.filter((event) => event.type === 'seat_released')).toHaveLength(2);
    expect(Object.values(result.state.seats).find((seat) => seat?.playerId === pinnedPlayer)?.pinned).toBe(true);
    expect(ids(result.state)).toHaveLength(8);
  });
});

describe('audience invariants', () => {
  it('property check có seed: 200 state chạy join/activity/pin/rotate không mất người hoặc lặp ghế', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      let state = createAudienceState(createSlots(7, 5));
      const playerCount = 35 + (seed % 40);
      state = joinMany(state, playerCount);
      expectInvariants(state, playerCount);

      const seated = Object.values(state.seats).flatMap((seat) => seat ? [seat.playerId] : []);
      state = onPlayerActive(state, seated[seed % seated.length]!, 10_000 + seed).state;
      if (seed % 2 === 0) state = pin(state, seated.slice(0, Math.min(seed % 6, 5)));

      for (let rotation = 0; rotation < 20; rotation += 1) {
        const options = { now: 20_000 + rotation, seed: seed * 100 + rotation, maxSwaps: 5 };
        const left = rotate(state, options);
        const sameInput = rotate(state, options);
        expect(left).toEqual(sameInput);
        state = left.state;
        expectInvariants(state, playerCount);
      }
    }
  });

  it('500 người join: đúng 35 ghế, 465 trong queue, 20 rotation vẫn giữ bất biến', () => {
    let state = joinMany(createAudienceState(createSlots()), 500);
    expect(Object.values(state.seats).filter(Boolean)).toHaveLength(35);
    expect(state.queue).toHaveLength(465);
    expectInvariants(state, 500);
    for (let rotation = 0; rotation < 20; rotation += 1) {
      state = rotate(state, { now: 100_000 + rotation, seed: 9000 + rotation }).state;
      expectInvariants(state, 500);
      expect(Object.values(state.seats).filter(Boolean)).toHaveLength(35);
      expect(state.queue).toHaveLength(465);
    }
  });
});
