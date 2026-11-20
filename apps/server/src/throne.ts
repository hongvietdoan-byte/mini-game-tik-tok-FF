import type { OptionId } from '@quiz/contracts';
import { computeQuestionScoreDelta, effectiveElapsedMs, type AnswerInput, type RoundQuestionInput, type ScoringOptions } from '@quiz/quiz-core';

export type ThroneQuestion = RoundQuestionInput & { questionInstanceId: string };
export type ThroneAnswer = AnswerInput & { option: OptionId };
export type ThronePlayerOrder = { playerId: string; displayName?: string; joinOrder: number };
export type ThroneCandidate = {
  playerId: string;
  score: number;
  correctCount: number;
  streak: number;
  correctElapsedMs: number;
  joinOrder: number;
};
export type ThroneReplay = {
  unlocked: boolean;
  holder: ThroneCandidate | null;
  correctElapsedMs: Map<string, number>;
};

/**
 * Replays finalized results from persisted question/answer data. No throne owner
 * is persisted independently, so a restart and a regrade produce the same holder.
 */
export function replayThrone(
  questions: readonly ThroneQuestion[],
  answers: readonly ThroneAnswer[],
  players: readonly ThronePlayerOrder[],
  scoring: ScoringOptions,
): ThroneReplay {
  const orderedQuestions = [...questions].sort((a, b) => a.index - b.index);
  const answersByQuestion = new Map<string, ThroneAnswer[]>();
  for (const answer of answers) {
    const rows = answersByQuestion.get(answer.questionInstanceId) ?? [];
    rows.push(answer);
    answersByQuestion.set(answer.questionInstanceId, rows);
  }
  const playerById = new Map(players.map((player) => [player.playerId, player]));
  const totals = new Map<string, { playerId: string; score: number; correctCount: number; streak: number }>();
  const correctElapsedMs = new Map<string, number>();
  let holder: ThroneCandidate | null = null;
  let unlocked = false;

  for (const question of orderedQuestions) {
    const questionAnswers = answersByQuestion.get(question.questionInstanceId) ?? [];
    const delta = computeQuestionScoreDelta(question, totals.values(), questionAnswers, scoring);
    totals.clear();
    for (const [playerId, value] of delta.totals) totals.set(playerId, value);

    const finalized = question.closed || question.voided;
    if (finalized && question.closed && !question.voided) {
      for (const answer of questionAnswers) {
        if (answer.option !== question.correctOptionId || answer.receivedAtMs === undefined) continue;
        const rawElapsed = question.openedAtMs == null ? 0 : Math.max(0, answer.receivedAtMs - question.openedAtMs);
        const elapsed = question.streamDelayMs == null ? rawElapsed : effectiveElapsedMs(rawElapsed, question.streamDelayMs);
        correctElapsedMs.set(answer.playerId, (correctElapsedMs.get(answer.playerId) ?? 0) + elapsed);
      }
    }

    if (question.index + 1 < 5 || !finalized) continue;
    unlocked = true;
    // Only the rank-one group is needed here. Scan for the same score/correct
    // pair used by rankPlayers instead of sorting every participant on each
    // finalized question (the replay may include tens of thousands of players).
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestCorrectCount = Number.NEGATIVE_INFINITY;
    const leaders: ThroneCandidate[] = [];
    for (const total of totals.values()) {
      if (total.score > bestScore || (total.score === bestScore && total.correctCount > bestCorrectCount)) {
        bestScore = total.score;
        bestCorrectCount = total.correctCount;
        leaders.length = 0;
      }
      if (total.score !== bestScore || total.correctCount !== bestCorrectCount) continue;
      leaders.push({
        playerId: total.playerId,
        score: total.score,
        correctCount: total.correctCount,
        streak: total.streak,
        correctElapsedMs: correctElapsedMs.get(total.playerId) ?? 0,
        joinOrder: playerById.get(total.playerId)?.joinOrder ?? Number.MAX_SAFE_INTEGER,
      });
    }
    holder = chooseThroneHolder(leaders, holder?.playerId ?? null);
  }

  return { unlocked, holder, correctElapsedMs };
}

/** Cho streak cao nhất; nếu hoà thì giữ chủ ngai, sau đó ưu tiên thời gian đúng thấp nhất. */
export function chooseThroneHolder(
  leaders: readonly ThroneCandidate[],
  currentHolderId: string | null,
): ThroneCandidate | null {
  if (leaders.length === 0) return null;
  const longestStreak = Math.max(...leaders.map((candidate) => candidate.streak));
  const streakLeaders = leaders.filter((candidate) => candidate.streak === longestStreak);
  const incumbent = currentHolderId === null ? undefined : streakLeaders.find((candidate) => candidate.playerId === currentHolderId);
  if (incumbent) return incumbent;
  return [...streakLeaders].sort((a, b) =>
    a.correctElapsedMs - b.correctElapsedMs ||
    a.joinOrder - b.joinOrder ||
    (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0),
  )[0]!;
}
