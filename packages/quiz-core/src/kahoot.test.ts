import { describe, expect, it } from 'vitest';
import { computeRoundScores, kahootPoints, kahootStreakBonus } from './scoring';

const q = (i: number, correct: 'A' | 'B' = 'A') => ({
  questionInstanceId: `q${i}`,
  index: i,
  correctOptionId: correct,
  closed: true,
  voided: false,
  openedAtMs: i * 100_000,
  windowMs: 20_000,
});

describe('tính điểm kiểu Kahoot (người dùng chốt 11/11)', () => {
  it('500–1000 theo thời gian trả lời, làm tròn như Kahoot', () => {
    expect(kahootPoints(0, 20_000)).toBe(1000);
    expect(kahootPoints(10_000, 20_000)).toBe(750);
    expect(kahootPoints(20_000, 20_000)).toBe(500);
    expect(kahootPoints(30_000, 20_000)).toBe(500);
    expect(kahootPoints(3_333, 20_000)).toBe(917);
    expect(kahootPoints(null, 20_000)).toBe(500);
  });

  it('thưởng chuỗi +100 × (n − 1), tối đa +500', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 10].map(kahootStreakBonus)).toEqual([0, 100, 200, 300, 400, 500, 500, 500]);
  });

  it('vòng 3 câu: đúng-đúng-sai-đúng, chuỗi reset; sổ điểm CORRECT/SPEED/STREAK khớp tổng; idempotent', () => {
    const qs = [q(0), q(1), q(2, 'B'), q(3)];
    const ans = [
      { questionInstanceId: 'q0', playerId: 'p', option: 'A' as const, receivedAtMs: 0 }, // 1000
      { questionInstanceId: 'q1', playerId: 'p', option: 'A' as const, receivedAtMs: 110_000 }, // 750 + chuỗi 100
      { questionInstanceId: 'q2', playerId: 'p', option: 'A' as const, receivedAtMs: 200_000 }, // sai → 0, chuỗi về 0
      { questionInstanceId: 'q3', playerId: 'p', option: 'A' as const, receivedAtMs: 320_000 }, // 500, chuỗi 1 → 0
    ];
    const r = computeRoundScores(qs, ans, { mode: 'KAHOOT' });
    expect(r.totals.get('p')).toMatchObject({ score: 1000 + 850 + 0 + 500, correctCount: 3, streak: 1 });
    expect(r.ledger.reduce((s, l) => s + l.points, 0)).toBe(2350);
    expect(r.ledger.filter((l) => l.reason === 'STREAK')).toEqual([{ questionInstanceId: 'q1', playerId: 'p', reason: 'STREAK', points: 100 }]);
    expect(computeRoundScores(qs, ans, { mode: 'KAHOOT' })).toEqual(r);
  });

  it('15 câu đúng tức thì → 15.000 + 0+100+200+300+400+500×10 = 21.000', () => {
    const qs = Array.from({ length: 15 }, (_, i) => q(i));
    const ans = qs.map((x) => ({ questionInstanceId: x.questionInstanceId, playerId: 'p', option: 'A' as const, receivedAtMs: x.openedAtMs }));
    expect(computeRoundScores(qs, ans, { mode: 'KAHOOT' }).totals.get('p')!.score).toBe(21_000);
  });
});
