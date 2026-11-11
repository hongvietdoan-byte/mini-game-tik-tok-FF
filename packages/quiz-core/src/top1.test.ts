import { describe, expect, it } from 'vitest';
import { top1Streaks } from './scoring';

const board = (qid: string, ...rank1: string[]) => ({
  questionInstanceId: qid,
  entries: [...rank1.map((playerId) => ({ playerId, rank: 1 })), { playerId: 'z', rank: rank1.length + 1 }],
});

describe('chuỗi Top 1 liên tiếp (huy hiệu x2, x3…)', () => {
  it('đếm số lần liên tiếp gần nhất đứng hạng 1, chỉ cho người đang hạng 1', () => {
    const r = top1Streaks([board('q1', 'a'), board('q2', 'b'), board('q3', 'b'), board('q4', 'b')]);
    expect(r).toEqual(new Map([['b', 3]]));
  });
  it('mất hạng 1 rồi lấy lại → đếm lại từ 1', () => {
    expect(top1Streaks([board('q1', 'a'), board('q2', 'a'), board('q3', 'b'), board('q4', 'a')])).toEqual(new Map([['a', 1]]));
  });
  it('đồng hạng 1 cùng được tính', () => {
    expect(top1Streaks([board('q1', 'a'), board('q2', 'a', 'b'), board('q3', 'a', 'b')])).toEqual(new Map([['a', 3], ['b', 2]]));
  });
  it('câu bị huỷ sau công bố: dùng bảng tính lại (bản sau cùng của câu đó)', () => {
    expect(top1Streaks([board('q1', 'a'), board('q2', 'a'), board('q2', 'b')])).toEqual(new Map([['b', 1]]));
  });
  it('chưa có bảng → rỗng', () => {
    expect(top1Streaks([]).size).toBe(0);
  });
});
