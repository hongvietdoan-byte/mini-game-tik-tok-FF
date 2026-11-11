import type { Question } from '@quiz/contracts';

const TIKTOK_USERNAME_PATTERN = /^(https?:\/\/(www\.)?tiktok\.com\/)?@?[A-Za-z0-9._]{2,24}(\/live)?\/?$/;

export type QuestionStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export function isValidTikTokUsername(username: string): boolean {
  return TIKTOK_USERNAME_PATTERN.test(username.trim());
}

export function approvedQuestionCount(questions: Question[]): number {
  return questions.filter((question) => question.approvalStatus === 'APPROVED' && question.verificationStatus !== 'DEMO').length;
}

export function canCreateTikTokSession(approvedCount: number, questionsPerRound: number): boolean {
  return approvedCount >= questionsPerRound;
}

export function maxRoundScore(questionsPerRound: number, speedBonusMax: number, scoringMode: 'KAHOOT' | 'CLASSIC'): number {
  if (scoringMode === 'CLASSIC') return questionsPerRound * (100 + speedBonusMax) + 180;
  let streakBonus = 0;
  for (let streak = 2; streak <= questionsPerRound; streak += 1) streakBonus += Math.min(100 * (streak - 1), 500);
  return questionsPerRound * 1_000 + streakBonus;
}

export function questionStatusBucket(question: Question): Exclude<QuestionStatusFilter, 'ALL'> | null {
  if (question.approvalStatus === 'REJECTED') return 'REJECTED';
  if (question.verificationStatus === 'DEMO' || question.approvalStatus === 'PENDING_REVIEW') return 'PENDING';
  if (question.approvalStatus === 'APPROVED') return 'APPROVED';
  return null;
}

export function filterQuestions(
  questions: Question[],
  filters: { status: QuestionStatusFilter; topic: string; difficulty: string },
): Question[] {
  return questions.filter((question) => {
    if (filters.status !== 'ALL' && questionStatusBucket(question) !== filters.status) return false;
    if (filters.topic && question.subtopicId !== filters.topic) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    return true;
  });
}

export function displayTikTokUsername(username?: string): string {
  if (!username) return '—';
  const pathUsername = username.match(/(?:^|\/)(@?[A-Za-z0-9._]{2,24})(?:\/live)?\/?$/i)?.[1] ?? username;
  return pathUsername.startsWith('@') ? pathUsername : `@${pathUsername}`;
}
