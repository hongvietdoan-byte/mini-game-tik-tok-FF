import { describe, expect, it } from 'vitest';
import type { Question } from '@quiz/contracts';
import { approvedQuestionCount, canCreateTikTokSession, filterQuestions, isValidTikTokUsername, maxRoundScore } from './tiktokSessionLogic';

function question(id: string, approvalStatus: Question['approvalStatus'], verificationStatus: Question['verificationStatus'] = 'UNVERIFIED'): Question {
  return {
    id,
    packId: 'demo',
    subtopicId: id === 'approved' ? 'arena' : 'basics',
    prompt: `Câu hỏi ${id}`,
    options: [
      { id: 'A', text: 'Đáp án A' },
      { id: 'B', text: 'Đáp án B' },
      { id: 'C', text: 'Đáp án C' },
      { id: 'D', text: 'Đáp án D' },
    ],
    correctOptionId: 'A',
    explanation: 'Giải thích',
    difficulty: 'EASY',
    tags: [],
    sourceRefs: [],
    verificationStatus,
    approvalStatus,
    version: 1,
    media: null,
    validFrom: null,
    validUntil: null,
    lastUsedAt: null,
  };
}

describe('TikTok session helpers', () => {
  it('accepts the same username and URL shapes as SessionConfigSchema', () => {
    expect(isValidTikTokUsername('@player.name')).toBe(true);
    expect(isValidTikTokUsername('https://www.tiktok.com/@player/live')).toBe(true);
    expect(isValidTikTokUsername('x')).toBe(false);
    expect(isValidTikTokUsername('player name')).toBe(false);
    expect(isValidTikTokUsername('player-name')).toBe(false);
  });

  it('counts only approved questions and blocks a round without enough questions', () => {
    const questions = [
      question('approved', 'APPROVED', 'OPERATOR_VERIFIED'),
      question('pending', 'PENDING_REVIEW', 'DEMO'),
      question('demo-approved-status', 'APPROVED', 'DEMO'),
      question('rejected', 'REJECTED'),
    ];
    expect(approvedQuestionCount(questions)).toBe(1);
    expect(canCreateTikTokSession(1, 10)).toBe(false);
    expect(canCreateTikTokSession(10, 10)).toBe(true);
  });

  it('filters DEMO/PENDING questions by topic and difficulty', () => {
    const questions = [
      question('approved', 'APPROVED', 'OPERATOR_VERIFIED'),
      question('pending', 'PENDING_REVIEW', 'DEMO'),
      question('demo', 'APPROVED', 'DEMO'),
      question('rejected', 'REJECTED'),
    ];
    expect(filterQuestions(questions, { status: 'PENDING', topic: 'basics', difficulty: 'EASY' }).map(({ id }) => id)).toEqual(['pending', 'demo']);
  });

  it('shows maximum round score for both scoring modes', () => {
    expect(maxRoundScore(15, 50, 'CLASSIC')).toBe(2_430);
    expect(maxRoundScore(15, 50, 'KAHOOT')).toBe(21_000);
  });
});
