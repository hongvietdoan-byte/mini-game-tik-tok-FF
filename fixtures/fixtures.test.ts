import { describe, expect, it } from 'vitest';
import { QuestionSchema } from '@quiz/contracts';
import { sanitizeDisplayName } from '@quiz/quiz-core';
import { DEMO_PACK, DEMO_QUESTIONS, EDGE_CASE_PLAYERS, INVALID_QUESTION_SAMPLES, makeSimPlayers } from './index';

describe('fixtures DEMO', () => {
  it('có ít nhất 36 câu hợp lệ, id và prompt duy nhất, đủ độ khó và chủ đề', () => {
    expect(DEMO_PACK).toEqual({ id: 'demo', name: 'Gói DEMO — kiến thức chung' });
    expect(DEMO_QUESTIONS.length).toBeGreaterThanOrEqual(36);
    const parsed = DEMO_QUESTIONS.map((question) => QuestionSchema.parse(question));
    expect(new Set(parsed.map((question) => question.id)).size).toBe(parsed.length);
    expect(new Set(parsed.map((question) => question.prompt.toLocaleLowerCase('vi'))).size).toBe(parsed.length);
    expect(parsed.every((question) => question.verificationStatus === 'DEMO')).toBe(true);
    expect(parsed.every((question) => question.approvalStatus === 'APPROVED')).toBe(true);
    expect(parsed.every((question) => question.tags.includes('demo'))).toBe(true);
    expect(new Set(parsed.map((question) => question.subtopicId)).size).toBeGreaterThanOrEqual(4);
    expect(parsed.filter((question) => question.difficulty === 'EASY')).toHaveLength(16);
    expect(parsed.filter((question) => question.difficulty === 'MEDIUM')).toHaveLength(12);
    expect(parsed.filter((question) => question.difficulty === 'HARD')).toHaveLength(8);
    expect(['o1', 'o2', 'o3', 'o4'].map((id) => parsed.filter((question) => question.correctOptionId === id).length)).toEqual([9, 9, 9, 9]);
  });

  it('có câu hỏi và lựa chọn dài để thử bố cục overlay', () => {
    expect(DEMO_QUESTIONS.filter((question) => question.prompt.length >= 180 && question.prompt.length <= 220).length).toBeGreaterThanOrEqual(2);
    expect(DEMO_QUESTIONS.flatMap((question) => question.options).filter((option) => option.text.length >= 70 && option.text.length <= 90).length).toBeGreaterThanOrEqual(2);
  });

  it('giữ câu Tokyo và Sahara đúng loại đáp án, với prompt dài tự nhiên', () => {
    const tokyo = DEMO_QUESTIONS.find((question) => question.id === 'demo-001')!;
    const sahara = DEMO_QUESTIONS.find((question) => question.id === 'demo-008')!;
    const correctText = (question: (typeof DEMO_QUESTIONS)[number]) => question.options.find((option) => option.id === question.correctOptionId)!.text;
    expect(tokyo.prompt.length).toBeGreaterThanOrEqual(180);
    expect(tokyo.prompt.length).toBeLessThanOrEqual(220);
    expect(correctText(tokyo)).toBe('Tokyo');
    expect(sahara.prompt.length).toBeGreaterThanOrEqual(180);
    expect(sahara.prompt.length).toBeLessThanOrEqual(220);
    expect(correctText(sahara)).toBe('Sahara');
    expect(sahara.options.map((option) => option.text)).toEqual(['Gobi', 'Kalahari', 'Atacama', 'Sahara']);
  });

  it('từ chối các mẫu câu hỏi không hợp lệ', () => {
    expect(INVALID_QUESTION_SAMPLES.length).toBeGreaterThanOrEqual(5);
    for (const sample of INVALID_QUESTION_SAMPLES) expect(QuestionSchema.safeParse(sample).success).toBe(false);
  });

  it('tạo danh sách người chơi giả ổn định, đủ số lượng và userId duy nhất', () => {
    const first = makeSimPlayers(100, 20261111);
    expect(first).toHaveLength(100);
    expect(new Set(first.map((player) => player.userId)).size).toBe(100);
    expect(makeSimPlayers(100, 20261111)).toEqual(first);
    expect(makeSimPlayers(100, 7)).not.toEqual(first);
    expect(first.slice(0, EDGE_CASE_PLAYERS.length)).toEqual(EDGE_CASE_PLAYERS);
    expect(first[0]!.userId).toBe('sim-0001');
    expect(first[99]!.userId).toBe('sim-0100');
    expect(EDGE_CASE_PLAYERS[1]!.displayName.length).toBeGreaterThan(60);
    expect(EDGE_CASE_PLAYERS[2]!.displayName).toContain('👨‍👩‍👧‍👦');
    expect(EDGE_CASE_PLAYERS[8]!.displayName).toBe(EDGE_CASE_PLAYERS[9]!.displayName);
    expect(EDGE_CASE_PLAYERS[8]!.userId).not.toBe(EDGE_CASE_PLAYERS[9]!.userId);
  });

  it('mọi tên người chơi sau sanitize không có control/bidi và tối đa 24 grapheme', () => {
    const players = [...EDGE_CASE_PLAYERS, ...makeSimPlayers(100, 3)];
    for (const { displayName } of players) {
      const sanitized = sanitizeDisplayName(displayName);
      // ZWJ (U+200D) được phép khi nối emoji — xem X-0008
      expect(sanitized).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff]/);
      expect(Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(sanitized)).length).toBeLessThanOrEqual(24);
    }
    expect(sanitizeDisplayName(EDGE_CASE_PLAYERS[2]!.displayName)).toContain('👨‍👩‍👧‍👦');
  });

  it('không chứa tên giải đấu hoặc đội được cấm trong fixtures', () => {
    const content = JSON.stringify({ DEMO_PACK, DEMO_QUESTIONS, EDGE_CASE_PLAYERS }).normalize('NFKC').toLocaleLowerCase('vi');
    const forbidden = [
      ['free', 'fire'], ['bá', 'vương'], ['bv', 'đc'], ['gác', 'kiếm'], ['ngốc', 'nghếch'],
      ['one', 'champ'], ['bạn', 'siêu', 'thân'], ['outlaw'], ['thỏ', 'bá', 'vương'], ['bắn', 'toàn', 'trượt'],
    ].map((words) => words.join(' ').toLocaleLowerCase('vi'));
    for (const term of forbidden) expect(content).not.toContain(term);
  });
});
