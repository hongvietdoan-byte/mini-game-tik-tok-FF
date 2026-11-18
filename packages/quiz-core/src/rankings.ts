import type { RankedEntry, StageDefinition } from '@quiz/contracts';

export type Top3RankingResult = {
  entries: RankedEntry[];
  totalQualified: number;
  /** Số người bị ẩn vì đồng hạng với dòng cuối trong ba dòng hiển thị. */
  tiedOverflowCount: number;
};

export type QuestionRankingAnswer = {
  answerId: number;
  questionInstanceId: string;
  playerId: string;
  optionId: string;
  receivedAtMs: number;
  safeDisplayName: string;
};

/**
 * Xếp Top 3 trả lời đúng nhanh nhất của một câu đã chốt.
 * DB lưu đúng một answer mỗi người/câu; việc chọn answerId nhỏ nhất ở đây cũng
 * giúp hàm thuần giữ đúng luật nếu được gọi với dữ liệu replay có bản ghi lặp.
 */
export function questionTop3(input: {
  questionInstanceId: string;
  correctOptionId: string;
  openedAtMs: number | null;
  voided?: boolean;
  answers: readonly QuestionRankingAnswer[];
}): Top3RankingResult | null {
  if (input.openedAtMs === null || !Number.isFinite(input.openedAtMs) || input.voided) return null;

  const firstAnswerByPlayer = new Map<string, QuestionRankingAnswer>();
  const orderedAnswers = [...input.answers].sort(
    (a, b) => a.answerId - b.answerId || compareText(a.playerId, b.playerId),
  );
  for (const answer of orderedAnswers) {
    if (answer.questionInstanceId !== input.questionInstanceId || firstAnswerByPlayer.has(answer.playerId) ||
      !Number.isFinite(answer.receivedAtMs) || answer.receivedAtMs < input.openedAtMs) continue;
    firstAnswerByPlayer.set(answer.playerId, answer);
  }

  const correct = [...firstAnswerByPlayer.values()]
    .filter((answer) => answer.optionId === input.correctOptionId)
    .map((answer) => ({
      playerId: answer.playerId,
      safeDisplayName: answer.safeDisplayName,
      metricValue: answer.receivedAtMs - input.openedAtMs!,
      answerId: answer.answerId,
    }))
    .sort((a, b) => a.metricValue - b.metricValue || a.answerId - b.answerId || compareText(a.playerId, b.playerId));

  let rank = 0;
  const ranked = correct.map((entry, index) => {
    const previous = correct[index - 1];
    const next = correct[index + 1];
    const tiedPrevious = previous?.metricValue === entry.metricValue;
    const tiedNext = next?.metricValue === entry.metricValue;
    if (!tiedPrevious) rank = index + 1;
    return {
      playerId: entry.playerId,
      safeDisplayName: entry.safeDisplayName,
      rank,
      metricValue: entry.metricValue,
      metricUnit: 'ms' as const,
      tied: tiedPrevious || tiedNext,
    };
  });
  const entries = ranked.slice(0, 3);
  const lastVisible = ranked[2];
  let tiedOverflowCount = 0;
  if (ranked.length > 3 && lastVisible) {
    for (let i = 3; i < ranked.length && ranked[i]!.metricValue === lastVisible.metricValue; i += 1)
      tiedOverflowCount += 1;
  }
  return { entries, totalQualified: ranked.length, tiedOverflowCount };
}

/** Chia câu hỏi thành các chặng có chỉ số câu 1-based; chặng cuối được phép ngắn. */
export function stageDefinitions(questionCount: number, leaderboardInterval: number): StageDefinition[] {
  if (!Number.isInteger(questionCount) || questionCount < 0)
    throw new RangeError('questionCount phải là số nguyên không âm.');
  if (!Number.isInteger(leaderboardInterval) || leaderboardInterval < 1)
    throw new RangeError('leaderboardInterval phải là số nguyên dương.');

  const stages: StageDefinition[] = [];
  for (let first = 1, stageIndex = 1; first <= questionCount; first += leaderboardInterval, stageIndex += 1) {
    const last = Math.min(questionCount, first + leaderboardInterval - 1);
    stages.push({
      stageId: `STAGE_${stageIndex}`,
      stageIndex,
      firstQuestionIndex: first,
      lastQuestionIndex: last,
    });
  }
  return stages;
}

export type RankingStageQuestion = { questionInstanceId: string; questionIndex: number };
export type RankingStageAnswer = { questionInstanceId: string; playerId: string; safeDisplayName: string };
export type RankingScoreEvent = { questionInstanceId: string; playerId: string; reason: string; points: number };
export type StageScore = { playerId: string; safeDisplayName: string; stageScore: number; correctCount: number };

/**
 * Gom điểm từ score_events theo câu thuộc chặng. Bao gồm cả sự kiện đảo điểm
 * (VOID_REVERSAL), để tổng điểm chặng bằng đúng tổng sổ cái của vòng.
 */
export function stageScores(
  stage: StageDefinition,
  questions: readonly RankingStageQuestion[],
  answers: readonly RankingStageAnswer[],
  scoreEvents: readonly RankingScoreEvent[],
): StageScore[] {
  const stageQuestionIds = new Set(
    questions
      .filter((question) => question.questionIndex >= stage.firstQuestionIndex &&
        question.questionIndex <= stage.lastQuestionIndex)
      .map((question) => question.questionInstanceId),
  );
  const byPlayer = new Map<string, { safeDisplayName: string; stageScore: number }>();
  const correctNet = new Map<string, number>();
  const ensure = (playerId: string, safeDisplayName: string) => {
    let current = byPlayer.get(playerId);
    if (!current) {
      current = { safeDisplayName, stageScore: 0 };
      byPlayer.set(playerId, current);
    } else if (safeDisplayName && (!current.safeDisplayName || current.safeDisplayName === 'Người chơi')) {
      current.safeDisplayName = safeDisplayName;
    }
    return current;
  };

  for (const answer of answers) {
    if (stageQuestionIds.has(answer.questionInstanceId)) ensure(answer.playerId, answer.safeDisplayName);
  }

  for (const event of scoreEvents) {
    if (!stageQuestionIds.has(event.questionInstanceId)) continue;
    const player = ensure(event.playerId, 'Người chơi');
    player.stageScore += event.points;
    if (event.reason === 'CORRECT' || event.reason === 'VOID_REVERSAL:CORRECT') {
      const key = `${event.questionInstanceId}\u0000${event.playerId}`;
      correctNet.set(key, (correctNet.get(key) ?? 0) + event.points);
    }
  }

  const correctCounts = new Map<string, number>();
  for (const [key, points] of correctNet) {
    if (points <= 0) continue;
    const separator = key.indexOf('\u0000');
    const playerId = key.slice(separator + 1);
    correctCounts.set(playerId, (correctCounts.get(playerId) ?? 0) + 1);
  }
  return [...byPlayer.entries()]
    .map(([playerId, values]) => ({
      playerId,
      safeDisplayName: values.safeDisplayName || 'Người chơi',
      stageScore: values.stageScore,
      correctCount: correctCounts.get(playerId) ?? 0,
    }))
    .sort((a, b) => compareText(a.playerId, b.playerId));
}

/** Top 3 chặng: điểm giảm dần → câu đúng giảm dần → đồng hạng. */
export function stageTop3(stageScoresForStage: readonly StageScore[]): Top3RankingResult {
  const sorted = [...stageScoresForStage].sort(
    (a, b) => b.stageScore - a.stageScore || b.correctCount - a.correctCount || compareText(a.playerId, b.playerId),
  );
  let rank = 0;
  const ranked = sorted.map((entry, index) => {
    const previous = sorted[index - 1];
    const next = sorted[index + 1];
    const sameAsPrevious = previous?.stageScore === entry.stageScore && previous.correctCount === entry.correctCount;
    const sameAsNext = next?.stageScore === entry.stageScore && next.correctCount === entry.correctCount;
    if (!sameAsPrevious) rank = index + 1;
    return {
      playerId: entry.playerId,
      safeDisplayName: entry.safeDisplayName,
      rank,
      metricValue: entry.stageScore,
      metricUnit: 'points' as const,
      tied: sameAsPrevious || sameAsNext,
    };
  });
  const entries = ranked.slice(0, 3);
  const lastVisible = sorted[2];
  let tiedOverflowCount = 0;
  if (sorted.length > 3 && lastVisible) {
    for (let i = 3; i < sorted.length && sorted[i]!.stageScore === lastVisible.stageScore &&
      sorted[i]!.correctCount === lastVisible.correctCount; i += 1)
      tiedOverflowCount += 1;
  }
  return { entries, totalQualified: sorted.length, tiedOverflowCount };
}

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
