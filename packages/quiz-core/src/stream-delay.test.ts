import { describe, expect, it } from 'vitest';
import { clampStreamDelayMs, effectiveElapsedMs, estimateStreamDelayMs } from './stream-delay';
import { computeRoundScores } from './scoring';

describe('bù độ trễ stream', () => {
  it('ước lượng từ tối đa năm câu gần nhất và bỏ một giá trị thấp nhất', () => {
    expect(estimateStreamDelayMs([2_000, 2_500])).toBe(1_500);
    expect(estimateStreamDelayMs([800, 2_800])).toBe(1_800);
    // The newest five are used; the oldest 1s sample must not affect estimate.
    expect(estimateStreamDelayMs([10_000, 8_000, 6_000, 3_000, 2_000, 1_000])).toBe(2_000);
  });

  it('dùng một mẫu khi chỉ có một câu đúng và bỏ câu không có mẫu', () => {
    expect(estimateStreamDelayMs([6_500])).toBe(5_500);
    expect(estimateStreamDelayMs([])).toBeNull();
    expect(estimateStreamDelayMs([Number.NaN, -1])).toBeNull();
  });

  it('kẹp độ trễ trong 0–6 giây và không để thời gian hiệu dụng dưới 0,5 giây', () => {
    expect(clampStreamDelayMs(-50)).toBe(0);
    expect(clampStreamDelayMs(8_000)).toBe(6_000);
    expect(effectiveElapsedMs(800, 6_000)).toBe(500);
    expect(effectiveElapsedMs(7_000, 1_000)).toBe(6_000);
  });

  it('thời gian hiệu dụng ở ngưỡng 0,5 giây nhận SPEED tối đa ở cả hai luật điểm', () => {
    const question = {
      questionInstanceId: 'q1', index: 0, correctOptionId: 'A' as const, closed: true, voided: false,
      openedAtMs: 1_000, windowMs: 10_000, streamDelayMs: 5_000,
    };
    const answer = [{ questionInstanceId: 'q1', playerId: 'p', option: 'A' as const, receivedAtMs: 1_500 }];
    expect(computeRoundScores([question], answer, { mode: 'KAHOOT' }).totals.get('p')?.score).toBe(1_000);
    expect(computeRoundScores([question], answer, { mode: 'CLASSIC', speedBonusMax: 50 }).totals.get('p')?.score).toBe(150);
  });
});
