import { describe, expect, it } from 'vitest';
import { QuestionSchema, QUESTION_DISPLAY_LIMITS, QUESTION_WARNING_LIMITS, questionLengthWarnings } from './index';

function question(prompt: string, options: string[]) {
  return QuestionSchema.parse({
    id: 'q-length',
    packId: 'demo',
    subtopicId: 'general',
    prompt,
    options: options.map((text, index) => ({ id: `o${index + 1}`, text })),
    correctOptionId: 'o1',
    explanation: '',
    difficulty: 'EASY',
    verificationStatus: 'VERIFIED',
    approvalStatus: 'APPROVED',
  });
}

describe('questionLengthWarnings', () => {
  it('không cảnh báo đúng tại ngưỡng, dùng chung hằng số soft limit', () => {
    const value = question(
      'x'.repeat(QUESTION_WARNING_LIMITS.promptMax),
      ['a'.repeat(QUESTION_WARNING_LIMITS.optionMax), 'b', 'c', 'd'],
    );

    expect(questionLengthWarnings(value)).toEqual([]);
  });

  it('trả TOO_LONG riêng cho prompt và đáp án vượt ngưỡng', () => {
    const value = question('x'.repeat(QUESTION_WARNING_LIMITS.promptMax + 1), [
      'a'.repeat(QUESTION_WARNING_LIMITS.optionMax + 1), 'b', 'c', 'd',
    ]);

    expect(questionLengthWarnings(value)).toEqual([
      { code: 'TOO_LONG', field: 'prompt', characterCount: 111, limit: 110 },
      { code: 'TOO_LONG', field: 'option', optionId: 'o1', characterCount: 29, limit: 28 },
    ]);
  });

  it('dùng riêng mốc hiển thị 160/45 khi preflight cần đánh giá khung overlay', () => {
    const value = question('x'.repeat(QUESTION_DISPLAY_LIMITS.promptMax + 1), [
      'a'.repeat(QUESTION_DISPLAY_LIMITS.optionMax + 1), 'b', 'c', 'd',
    ]);

    expect(questionLengthWarnings(value, QUESTION_DISPLAY_LIMITS)).toEqual([
      { code: 'TOO_LONG', field: 'prompt', characterCount: 161, limit: 160 },
      { code: 'TOO_LONG', field: 'option', optionId: 'o1', characterCount: 46, limit: 45 },
    ]);
  });

  it('đếm Unicode code point thay vì UTF-16 code unit', () => {
    const value = question('😀'.repeat(56), ['😀'.repeat(15), 'b', 'c', 'd']);

    expect(questionLengthWarnings(value)).toEqual([]);
  });
});
