import { describe, expect, it } from 'vitest';
import { QuestionSchema, SessionConfigSchema } from './index';

describe('cấu hình chọn câu theo độ khó', () => {
  it('giữ RANDOM làm mặc định và đặt mục tiêu 7/5/3 với độ lệch tối đa 2', () => {
    const config = SessionConfigSchema.parse({});
    expect(config.questionSelectionMode).toBe('RANDOM');
    expect(config.difficultyTargets).toEqual({ EASY: 7, MEDIUM: 5, HARD: 3 });
    expect(config.difficultyTolerance).toBe(2);
  });

  it('chuẩn hóa câu cũ chưa có độ khó thành mức vừa', () => {
    const question = QuestionSchema.parse({
      id: 'legacy',
      packId: 'demo',
      subtopicId: 'general',
      prompt: 'Câu cũ?',
      options: [
        { id: 'a', text: 'Đáp án A' }, { id: 'b', text: 'Đáp án B' },
        { id: 'c', text: 'Đáp án C' }, { id: 'd', text: 'Đáp án D' },
      ],
      correctOptionId: 'a',
      verificationStatus: 'VERIFIED',
      approvalStatus: 'APPROVED',
    });
    expect(question.difficulty).toBe('MEDIUM');
  });
});
