import { describe, expect, it } from 'vitest';
import { computeRoundScores, speedBonus } from './scoring';

describe('thưởng tốc độ (người dùng chốt 11/11)', () => {
  it('giảm tuyến tính từ tối đa về 0 theo thời gian server nhận', () => {
    expect(speedBonus(0, 15_000, 50)).toBe(50);
    expect(speedBonus(7_500, 15_000, 50)).toBe(25);
    expect(speedBonus(14_999, 15_000, 50)).toBe(0);
    expect(speedBonus(20_000, 15_000, 50)).toBe(0);
    expect(speedBonus(-5, 15_000, 50)).toBe(50);
    expect(speedBonus(1_000, 15_000, 0)).toBe(0);
  });

  it('chỉ cộng cho câu đúng, ghi dòng SPEED riêng, idempotent', () => {
    const qs = [{ questionInstanceId: 'q1', index: 0, correctOptionId: 'A' as const, closed: true, voided: false, openedAtMs: 1_000, windowMs: 10_000 }];
    const ans = [
      { questionInstanceId: 'q1', playerId: 'fast', option: 'A' as const, receivedAtMs: 2_000 },
      { questionInstanceId: 'q1', playerId: 'slow', option: 'A' as const, receivedAtMs: 10_000 },
      { questionInstanceId: 'q1', playerId: 'wrong', option: 'B' as const, receivedAtMs: 1_100 },
    ];
    const a = computeRoundScores(qs, ans, { speedBonusMax: 50 });
    expect(a.totals.get('fast')!.score).toBe(145);
    expect(a.totals.get('slow')!.score).toBe(105);
    expect(a.totals.get('wrong')!.score).toBe(0);
    expect(a.ledger.filter((l) => l.reason === 'SPEED').map((l) => [l.playerId, l.points])).toEqual([['fast', 45], ['slow', 5]]);
    expect(computeRoundScores(qs, ans, { speedBonusMax: 50 })).toEqual(a);
    // tắt → như cũ
    expect(computeRoundScores(qs, ans).totals.get('fast')!.score).toBe(100);
  });

  it('câu bị huỷ không có thưởng tốc độ', () => {
    const qs = [{ questionInstanceId: 'q1', index: 0, correctOptionId: 'A' as const, closed: true, voided: true, openedAtMs: 0, windowMs: 10_000 }];
    const r = computeRoundScores(qs, [{ questionInstanceId: 'q1', playerId: 'p', option: 'A', receivedAtMs: 0 }], { speedBonusMax: 50 });
    expect(r.totals.get('p')!.score).toBe(0);
  });
});
