import { describe, expect, it } from 'vitest';
import { planQuestionCueSchedule, questionVoiceScripts } from './question-script';

describe('kịch bản và lịch đọc MC cho câu hỏi', () => {
  it('thêm nhãn A/B/C/D, dấu câu và khoảng nghỉ mặc định', () => {
    const lines = questionVoiceScripts('Thủ đô Việt Nam là gì', [
      { id: 'raw-1', text: 'Huế' }, { id: 'raw-2', text: 'Hà Nội.' }, { id: 'raw-3', text: 'Đà Nẵng' }, { id: 'raw-4', text: 'Cần Thơ' },
    ]);
    expect(lines.map((line) => line.text)).toEqual([
      'Thủ đô Việt Nam là gì?', 'A: Huế.', 'B: Hà Nội.', 'C: Đà Nẵng.', 'D: Cần Thơ.',
    ]);
    expect(planQuestionCueSchedule([1_000, 1_000, 1_000, 1_000, 1_000], 20_000)).toEqual({
      offsetsMs: [0, 1_700, 3_100, 4_500, 5_900], totalDurationMs: 6_900, promptPauseMs: 700, optionPauseMs: 400,
    });
  });

  it('giảm khoảng nghỉ theo bậc để vừa trần, rồi chỉ bỏ khi các bậc trước không vừa', () => {
    const reduced = planQuestionCueSchedule([3_000, 3_000, 3_000, 3_000, 3_000], 16_000);
    expect(reduced).toMatchObject({ promptPauseMs: 300, optionPauseMs: 150, totalDurationMs: 15_750 });
    const noPause = planQuestionCueSchedule([3_800, 3_800, 3_800, 3_800, 3_800], 19_100);
    expect(noPause).toMatchObject({ promptPauseMs: 0, optionPauseMs: 0, totalDurationMs: 19_000 });
    expect(planQuestionCueSchedule([4_000, 4_000, 4_000, 4_000, 4_000], 19_000)).toBeNull();
  });
});
