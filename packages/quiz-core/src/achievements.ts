import type { AchievementId as ContractAchievementId, RankedEntry, RankingScope, StageDefinition } from '@quiz/contracts';

export type AchievementId = ContractAchievementId;

export type AchievementDefinition = {
  id: AchievementId;
  scope: RankingScope;
  metricKey: string;
  topLimit: number | null;
  policy: 'RANK' | 'COUNT_ONLY' | 'REUSE_PHASE1';
  label: string;
  minimum?: number;
  minimumAnswers?: number;
};

/** Registry IDs không đổi theo theme; theme chỉ đổi phần trình bày ở Phase 4. */
export const ACHIEVEMENT_REGISTRY: readonly AchievementDefinition[] = [
  { id: 'FASTEST_CORRECT', scope: 'QUESTION', metricKey: 'responseMs', topLimit: 3, policy: 'REUSE_PHASE1', label: 'ĐÚNG NHANH NHẤT' },
  { id: 'STAGE_CHAMPION', scope: 'STAGE', metricKey: 'stageScore', topLimit: 3, policy: 'REUSE_PHASE1', label: 'QUÁN QUÂN CHẶNG' },
  { id: 'LONGEST_STREAK', scope: 'ROUND', metricKey: 'longestStreak', topLimit: 3, policy: 'RANK', label: 'CHUỖI ĐÚNG DÀI NHẤT', minimum: 3 },
  { id: 'MOST_CORRECT', scope: 'ROUND', metricKey: 'correctCount', topLimit: 5, policy: 'RANK', label: 'NHIỀU CÂU ĐÚNG NHẤT' },
  { id: 'COMEBACK', scope: 'STAGE', metricKey: 'placesImproved', topLimit: 3, policy: 'RANK', label: 'LỘI NGƯỢC DÒNG', minimum: 1, minimumAnswers: 3 },
  { id: 'PERFECT_STAGE', scope: 'STAGE', metricKey: 'playerCount', topLimit: null, policy: 'COUNT_ONLY', label: 'CHẶNG HOÀN HẢO' },
  { id: 'FULL_PARTICIPATION', scope: 'ROUND', metricKey: 'playerCount', topLimit: null, policy: 'COUNT_ONLY', label: 'THAM GIA TRỌN VẸN' },
  { id: 'FIRST_CORRECT', scope: 'ROUND', metricKey: 'playerCount', topLimit: null, policy: 'COUNT_ONLY', label: 'ĐÃ CÓ CÂU TRẢ LỜI ĐÚNG' },
  { id: 'ROUND_CHAMPION', scope: 'ROUND', metricKey: 'score', topLimit: 3, policy: 'REUSE_PHASE1', label: 'QUÁN QUÂN TOÀN TRẬN' },
] as const;

export type AchievementQuestion = {
  questionInstanceId: string;
  questionIndex: number;
  status: 'PENDING' | 'OPEN' | 'CLOSED' | 'VOIDED';
};
export type AchievementAnswer = {
  questionInstanceId: string;
  playerId: string;
  optionId: string;
  safeDisplayName: string;
};
export type AchievementScoreEvent = {
  questionInstanceId: string;
  playerId: string;
  reason: string;
  points: number;
};
export type AchievementLeaderboardSnapshot = {
  questionInstanceId: string | null;
  entries: readonly Pick<RankedEntry, 'playerId' | 'rank'>[];
};

export type AchievementSnapshotResult = {
  achievementId: AchievementId;
  scope: Exclude<RankingScope, 'QUESTION'>;
  scopeId: string;
  metricKey: string;
  entries: RankedEntry[];
  totalQualified: number;
  tiedOverflowCount: number;
  /** Chỉ dùng cho danh hiệu cộng đồng; không tạo danh sách người thắng giả. */
  aggregateCount?: number;
  /** Người nhận thật gồm cả người đồng hạng vượt cutoff; chỉ gửi persistence, không gửi public. */
  awardEntries: RankedEntry[];
};

export type AchievementEvaluationInput = {
  roundId: string;
  questions: readonly AchievementQuestion[];
  answers: readonly AchievementAnswer[];
  scoreEvents: readonly AchievementScoreEvent[];
  leaderboardSnapshots: readonly AchievementLeaderboardSnapshot[];
};

type MetricPlayer = { playerId: string; safeDisplayName: string; metricValue: number };
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const pairKey = (questionId: string, playerId: string) => `${questionId}\u0000${playerId}`;

function safeNames(answers: readonly AchievementAnswer[]) {
  const names = new Map<string, string>();
  for (const answer of answers) {
    const current = names.get(answer.playerId);
    if (!current || current === 'Người chơi') names.set(answer.playerId, answer.safeDisplayName || 'Người chơi');
  }
  return names;
}

/** Số CORRECT sau khi trừ các bút toán đảo; mỗi cặp câu/người chỉ được tính một lần. */
function correctAnswerKeys(events: readonly AchievementScoreEvent[], questionIds?: ReadonlySet<string>) {
  const net = new Map<string, number>();
  for (const event of events) {
    if (questionIds && !questionIds.has(event.questionInstanceId)) continue;
    if (event.reason !== 'CORRECT' && event.reason !== 'VOID_REVERSAL:CORRECT') continue;
    const key = pairKey(event.questionInstanceId, event.playerId);
    net.set(key, (net.get(key) ?? 0) + (event.reason === 'CORRECT' ? 1 : -1));
  }
  return new Set([...net].filter(([, count]) => count > 0).map(([key]) => key));
}

function rankMetric(
  players: readonly MetricPlayer[],
  achievementId: AchievementId,
  scope: 'ROUND' | 'STAGE',
  scopeId: string,
  metricKey: string,
  metricUnit: RankedEntry['metricUnit'],
  limit: number,
): AchievementSnapshotResult {
  const ordered = [...players].sort((a, b) => b.metricValue - a.metricValue || compareText(a.playerId, b.playerId));
  let rank = 0;
  const ranked = ordered.map((player, index) => {
    const previous = ordered[index - 1];
    const next = ordered[index + 1];
    const tiedPrevious = previous?.metricValue === player.metricValue;
    const tiedNext = next?.metricValue === player.metricValue;
    if (!tiedPrevious) rank = index + 1;
    return {
      playerId: player.playerId,
      safeDisplayName: player.safeDisplayName || 'Người chơi',
      rank,
      metricValue: player.metricValue,
      metricUnit,
      tied: tiedPrevious || tiedNext,
    } satisfies RankedEntry;
  });
  const entries = ranked.slice(0, limit);
  const cutoff = ranked[limit - 1];
  let tiedOverflowCount = 0;
  if (cutoff) {
    for (let index = limit; index < ranked.length && ranked[index]!.metricValue === cutoff.metricValue; index += 1)
      tiedOverflowCount += 1;
  }
  const awardEntries = cutoff ? ranked.filter((entry) => entry.rank <= cutoff.rank) : ranked;
  return { achievementId, scope, scopeId, metricKey, entries, awardEntries, totalQualified: ranked.length, tiedOverflowCount };
}

function countOnly(
  achievementId: AchievementId,
  scope: 'ROUND' | 'STAGE',
  scopeId: string,
  count: number,
): AchievementSnapshotResult {
  return {
    achievementId, scope, scopeId, metricKey: 'playerCount', entries: [],
    totalQualified: count, tiedOverflowCount: 0, aggregateCount: count, awardEntries: [],
  };
}

function normalizedAnswers(input: AchievementEvaluationInput) {
  const questionById = new Map(input.questions.map((question) => [question.questionInstanceId, question]));
  const validAnswers = new Map<string, AchievementAnswer>();
  for (const answer of input.answers) {
    const question = questionById.get(answer.questionInstanceId);
    if (!question || question.status !== 'CLOSED') continue;
    const key = pairKey(answer.questionInstanceId, answer.playerId);
    if (!validAnswers.has(key)) validAnswers.set(key, answer);
  }
  return { questionById, validAnswers };
}

/** Tính các danh hiệu toàn trận đã chốt. Hàm thuần, không đụng DB hay thay đổi scoring. */
export function evaluateRoundAchievements(input: AchievementEvaluationInput): AchievementSnapshotResult[] {
  const questions = [...input.questions].filter((question) => question.status === 'CLOSED')
    .sort((a, b) => a.questionIndex - b.questionIndex);
  const validQuestionIds = new Set(questions.map((question) => question.questionInstanceId));
  const { questionById, validAnswers } = normalizedAnswers(input);
  const correctKeys = correctAnswerKeys(input.scoreEvents);
  const names = safeNames([...validAnswers.values()]);
  const playerQuestionIds = new Map<string, Set<string>>();
  const correctCounts = new Map<string, number>();
  const answerIndexes = new Map<string, Set<number>>();

  for (const answer of validAnswers.values()) {
    const index = questionById.get(answer.questionInstanceId)?.questionIndex;
    if (index === undefined) continue;
    const questionsForPlayer = playerQuestionIds.get(answer.playerId) ?? new Set<string>();
    questionsForPlayer.add(answer.questionInstanceId);
    playerQuestionIds.set(answer.playerId, questionsForPlayer);
    const indexes = answerIndexes.get(answer.playerId) ?? new Set<number>();
    indexes.add(index);
    answerIndexes.set(answer.playerId, indexes);
    if (correctKeys.has(pairKey(answer.questionInstanceId, answer.playerId)))
      correctCounts.set(answer.playerId, (correctCounts.get(answer.playerId) ?? 0) + 1);
  }

  const longestStreak = new Map<string, number>();
  for (const [playerId, answeredIndexes] of answerIndexes) {
    const firstIndex = Math.min(...answeredIndexes);
    let current = 0;
    let longest = 0;
    for (const question of questions) {
      if (question.questionIndex < firstIndex) continue; // Người vào muộn không bị tính các câu trước khi tham gia.
      const answered = playerQuestionIds.get(playerId)?.has(question.questionInstanceId) ?? false;
      const correct = answered && correctKeys.has(pairKey(question.questionInstanceId, playerId));
      current = correct ? current + 1 : 0;
      longest = Math.max(longest, current);
    }
    longestStreak.set(playerId, longest);
  }

  const streakDefinition = ACHIEVEMENT_REGISTRY.find((definition) => definition.id === 'LONGEST_STREAK')!;
  const streakPlayers = [...longestStreak].filter(([, value]) => value >= (streakDefinition.minimum ?? 0))
    .map(([playerId, metricValue]) => ({ playerId, safeDisplayName: names.get(playerId) ?? 'Người chơi', metricValue }));
  const correctPlayers = [...correctCounts].filter(([, value]) => value > 0)
    .map(([playerId, metricValue]) => ({ playerId, safeDisplayName: names.get(playerId) ?? 'Người chơi', metricValue }));
  const totalQuestions = validQuestionIds.size;
  const fullyParticipating = totalQuestions > 0
    ? [...playerQuestionIds].filter(([, answered]) => answered.size === totalQuestions).length
    : 0;

  return [
    rankMetric(streakPlayers, 'LONGEST_STREAK', 'ROUND', input.roundId, 'longestStreak', 'questions', 3),
    rankMetric(correctPlayers, 'MOST_CORRECT', 'ROUND', input.roundId, 'correctCount', 'questions', 5),
    countOnly('FULL_PARTICIPATION', 'ROUND', input.roundId, fullyParticipating),
    countOnly('FIRST_CORRECT', 'ROUND', input.roundId, correctPlayers.length),
  ];
}

function latestSnapshotsByQuestion(snapshots: readonly AchievementLeaderboardSnapshot[]) {
  const latest = new Map<string, AchievementLeaderboardSnapshot>();
  for (const snapshot of snapshots) if (snapshot.questionInstanceId) latest.set(snapshot.questionInstanceId, snapshot);
  return latest;
}

/** Tính danh hiệu của chặng đã chốt; hạng comeback chỉ dựa trên snapshot cuối hai chặng. */
export function evaluateStageAchievements(
  input: AchievementEvaluationInput,
  stage: StageDefinition,
): AchievementSnapshotResult[] {
  const stageQuestions = input.questions.filter((question) =>
    question.questionIndex >= stage.firstQuestionIndex && question.questionIndex <= stage.lastQuestionIndex &&
    question.status === 'CLOSED');
  const stageQuestionIds = new Set(stageQuestions.map((question) => question.questionInstanceId));
  const questionById = new Map(input.questions.map((question) => [question.questionInstanceId, question]));
  const correctByQuestion = new Map<string, Map<string, number>>();
  for (const event of input.scoreEvents) {
    if (!stageQuestionIds.has(event.questionInstanceId) ||
      (event.reason !== 'CORRECT' && event.reason !== 'VOID_REVERSAL:CORRECT')) continue;
    const playerCounts = correctByQuestion.get(event.questionInstanceId) ?? new Map<string, number>();
    playerCounts.set(event.playerId, (playerCounts.get(event.playerId) ?? 0) +
      (event.reason === 'CORRECT' ? 1 : -1));
    correctByQuestion.set(event.questionInstanceId, playerCounts);
  }

  const players = new Map<string, { safeDisplayName: string; answered: Set<string>; answerCount: number; correctCount: number }>();
  for (const answer of input.answers) {
    if (!stageQuestionIds.has(answer.questionInstanceId) || questionById.get(answer.questionInstanceId)?.status !== 'CLOSED') continue;
    const player = players.get(answer.playerId) ?? {
      safeDisplayName: answer.safeDisplayName || 'Người chơi', answered: new Set<string>(), answerCount: 0, correctCount: 0,
    };
    if (player.answered.has(answer.questionInstanceId)) continue; // answers có unique(q, player); giữ hàm thuần bền với replay lặp.
    player.answered.add(answer.questionInstanceId);
    player.answerCount += 1;
    if ((correctByQuestion.get(answer.questionInstanceId)?.get(answer.playerId) ?? 0) > 0) player.correctCount += 1;
    if (player.safeDisplayName === 'Người chơi' && answer.safeDisplayName) player.safeDisplayName = answer.safeDisplayName;
    players.set(answer.playerId, player);
  }

  const perfectCount = stageQuestionIds.size > 0
    ? [...players.values()].filter((player) => player.answered.size === stageQuestionIds.size &&
      player.correctCount === stageQuestionIds.size).length
    : 0;
  const results = [countOnly('PERFECT_STAGE', 'STAGE', stage.stageId, perfectCount)];
  if (stage.stageIndex <= 1) return results;

  const snapshotAtQuestion = (questionIndex: number) => {
    const ordered = [...input.questions].filter((question) => question.questionIndex <= questionIndex)
      .sort((a, b) => b.questionIndex - a.questionIndex);
    for (const question of ordered) {
      const snapshot = snapshots.get(question.questionInstanceId);
      if (snapshot) return snapshot;
    }
    return undefined;
  };
  const snapshots = latestSnapshotsByQuestion(input.leaderboardSnapshots);
  const currentEntries = snapshotAtQuestion(stage.lastQuestionIndex)?.entries ?? [];
  const previousEntries = snapshotAtQuestion(stage.firstQuestionIndex - 1)?.entries ?? [];
  const currentRanks = new Map(currentEntries.map((entry) => [entry.playerId, entry.rank]));
  const previousRanks = new Map(previousEntries.map((entry) => [entry.playerId, entry.rank]));
  const comebackPlayers: MetricPlayer[] = [];
  for (const [playerId, rankNow] of currentRanks) {
    const rankBefore = previousRanks.get(playerId);
    const placesImproved = rankBefore === undefined ? 0 : rankBefore - rankNow;
    const player = players.get(playerId);
    if (rankBefore === undefined || placesImproved <= 0 ||
      (player?.answerCount ?? 0) < (ACHIEVEMENT_REGISTRY.find((definition) => definition.id === 'COMEBACK')?.minimumAnswers ?? 3)) continue;
    comebackPlayers.push({ playerId, safeDisplayName: player?.safeDisplayName ?? 'Người chơi', metricValue: placesImproved });
  }
  results.push(rankMetric(comebackPlayers, 'COMEBACK', 'STAGE', stage.stageId, 'placesImproved', 'places', 3));
  return results;
}

