import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_REGISTRY,
  evaluateRoundAchievements,
  evaluateStageAchievements,
  type AchievementAnswer,
  type AchievementEvaluationInput,
  type AchievementQuestion,
  type AchievementScoreEvent,
} from './achievements';
import { stageDefinitions } from './rankings';

const questions = (count: number, voidAt: number[] = []): AchievementQuestion[] =>
  Array.from({ length: count }, (_, index) => ({
    questionInstanceId: `q${index + 1}`,
    questionIndex: index + 1,
    status: voidAt.includes(index + 1) ? 'VOIDED' : 'CLOSED',
  }));
const answer = (playerId: string, questionIndex: number, safeDisplayName = `Safe ${playerId}`, optionId = 'A'): AchievementAnswer => ({
  questionInstanceId: `q${questionIndex}`, playerId, safeDisplayName, optionId,
});
const correct = (playerId: string, questionIndex: number): AchievementScoreEvent => ({
  questionInstanceId: `q${questionIndex}`, playerId, reason: 'CORRECT', points: 500,
});
const result = (rows: ReturnType<typeof evaluateRoundAchievements>, id: string) => rows.find((row) => row.achievementId === id)!;

describe('V5 achievement registry and evaluator', () => {
  it('giữ ID duy nhất, label MOST_CORRECT nói rõ số câu đúng và không tính scoring mới', () => {
    expect(new Set(ACHIEVEMENT_REGISTRY.map((definition) => definition.id)).size).toBe(9);
    expect(ACHIEVEMENT_REGISTRY.find((definition) => definition.id === 'MOST_CORRECT')).toMatchObject({
      metricKey: 'correctCount', topLimit: 5, label: 'NHIỀU CÂU ĐÚNG NHẤT',
    });
    expect(ACHIEVEMENT_REGISTRY.filter((definition) => definition.policy === 'REUSE_PHASE1')
      .map((definition) => definition.id)).toEqual(['FASTEST_CORRECT', 'STAGE_CHAMPION', 'ROUND_CHAMPION']);
  });

  it('LONGEST_STREAK áp ngưỡng 3, giữ đồng hạng và bỏ câu đã void khỏi chuỗi', () => {
    const input: AchievementEvaluationInput = {
      roundId: 'round-streak', questions: questions(5, [4]),
      answers: [
        answer('two', 1), answer('two', 2),
        answer('three-a', 1), answer('three-a', 2), answer('three-a', 3), answer('three-a', 5),
        answer('three-b', 1), answer('three-b', 2), answer('three-b', 3),
        answer('void-only', 4),
      ],
      scoreEvents: [
        correct('two', 1), correct('two', 2),
        correct('three-a', 1), correct('three-a', 2), correct('three-a', 3), correct('three-a', 5),
        correct('three-b', 1), correct('three-b', 2), correct('three-b', 3), correct('void-only', 4),
        { questionInstanceId: 'q4', playerId: 'void-only', reason: 'VOID_REVERSAL:CORRECT', points: -500 },
      ], leaderboardSnapshots: [],
    };
    const streak = result(evaluateRoundAchievements(input), 'LONGEST_STREAK');
    expect(streak.entries.map(({ playerId, metricValue, rank, tied }) => ({ playerId, metricValue, rank, tied }))).toEqual([
      { playerId: 'three-a', metricValue: 4, rank: 1, tied: false },
      { playerId: 'three-b', metricValue: 3, rank: 2, tied: false },
    ]);
    expect(streak.entries.some((entry) => entry.playerId === 'two')).toBe(false);
    expect(streak.entries.some((entry) => entry.playerId === 'void-only')).toBe(false);
  });

  it('MOST_CORRECT đếm đáp án đúng tuyệt đối, tie không bị phá bằng playerId; full participation và first-correct chỉ là tổng', () => {
    const input: AchievementEvaluationInput = {
      roundId: 'round-counts', questions: questions(3, [3]),
      answers: [
        answer('p1', 1), answer('p1', 2),
        answer('p2', 1), answer('p2', 2),
        answer('p3', 1), answer('p3', 2),
        answer('p4', 1),
      ],
      scoreEvents: [
        correct('p1', 1), correct('p1', 2),
        correct('p2', 1), correct('p2', 2),
        correct('p3', 1),
        { questionInstanceId: 'q2', playerId: 'p3', reason: 'VOID_REVERSAL:CORRECT', points: -500 },
      ],
      leaderboardSnapshots: [],
    };
    const round = evaluateRoundAchievements(input);
    expect(result(round, 'MOST_CORRECT').entries.map(({ playerId, rank, metricValue, tied }) => ({ playerId, rank, metricValue, tied }))).toEqual([
      { playerId: 'p1', rank: 1, metricValue: 2, tied: true },
      { playerId: 'p2', rank: 1, metricValue: 2, tied: true },
      { playerId: 'p3', rank: 3, metricValue: 1, tied: false },
    ]);
    expect(result(round, 'FULL_PARTICIPATION')).toMatchObject({ aggregateCount: 3, totalQualified: 3, entries: [] });
    expect(result(round, 'FIRST_CORRECT')).toMatchObject({ aggregateCount: 3, totalQualified: 3, entries: [] });
  });

  it('COMEBACK không xét chặng 1, loại newcomer và người chỉ trả lời 2 câu; PERFECT_STAGE chỉ trả tổng', () => {
    const q = questions(10);
    const answers: AchievementAnswer[] = [];
    const events: AchievementScoreEvent[] = [];
    for (const player of ['climber', 'same', 'two-answers', 'newcomer', 'perfect']) {
      const indexes = player === 'newcomer' ? [6, 7, 8, 9, 10] : player === 'two-answers' ? [6, 7] : [6, 7, 8, 9, 10];
      for (const index of indexes) {
        answers.push(answer(player, index));
        if (player === 'perfect' || index <= 8) events.push(correct(player, index));
      }
    }
    const snapshots = [
      { questionInstanceId: 'q5', entries: [
        { playerId: 'climber', rank: 7 }, { playerId: 'same', rank: 8 }, { playerId: 'two-answers', rank: 9 }, { playerId: 'perfect', rank: 10 },
      ] },
      { questionInstanceId: 'q10', entries: [
        { playerId: 'climber', rank: 2 }, { playerId: 'same', rank: 3 }, { playerId: 'two-answers', rank: 1 }, { playerId: 'newcomer', rank: 1 }, { playerId: 'perfect', rank: 4 },
      ] },
    ];
    const input: AchievementEvaluationInput = { roundId: 'round-comeback', questions: q, answers, scoreEvents: events, leaderboardSnapshots: snapshots };
    const stages = stageDefinitions(10, 5);
    expect(evaluateStageAchievements(input, stages[0]!)).toMatchObject([{ achievementId: 'PERFECT_STAGE', aggregateCount: 0 }]);
    const second = evaluateStageAchievements(input, stages[1]!);
    expect(second.find((item) => item.achievementId === 'PERFECT_STAGE')).toMatchObject({ aggregateCount: 1, entries: [] });
    expect(second.find((item) => item.achievementId === 'COMEBACK')?.entries.map(({ playerId, metricValue, rank, tied }) => ({ playerId, metricValue, rank, tied }))).toEqual([
      { playerId: 'perfect', metricValue: 6, rank: 1, tied: false },
      { playerId: 'climber', metricValue: 5, rank: 2, tied: true },
      { playerId: 'same', metricValue: 5, rank: 2, tied: true },
    ]);
  });

  it('15 câu × 100 người khớp cách tính tham chiếu độc lập', () => {
    const q = questions(15);
    const answers: AchievementAnswer[] = [];
    const events: AchievementScoreEvent[] = [];
    const counts = new Map<string, number>();
    const allQuestions = new Map<string, Set<number>>();
    const stageCorrect = new Map<string, number>();
    for (let player = 0; player < 100; player += 1) {
      const playerId = `p${player}`;
      const participation = player % 10 === 0 ? 15 : player % 5 === 0 ? 10 : 5;
      for (let question = 1; question <= participation; question += 1) {
        answers.push(answer(playerId, question));
        const set = allQuestions.get(playerId) ?? new Set<number>();
        set.add(question);
        allQuestions.set(playerId, set);
        if ((player * 7 + question * 3) % 4 !== 0) {
          events.push(correct(playerId, question));
          counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
          if (question >= 11) stageCorrect.set(playerId, (stageCorrect.get(playerId) ?? 0) + 1);
        }
      }
    }
    const input: AchievementEvaluationInput = { roundId: 'mock-15x100', questions: q, answers, scoreEvents: events, leaderboardSnapshots: [] };
    const round = evaluateRoundAchievements(input);
    const independentCorrect = [...counts].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    expect(result(round, 'MOST_CORRECT').entries.slice(0, 5).map(({ playerId, metricValue }) => [playerId, metricValue]))
      .toEqual(independentCorrect.slice(0, 5));
    const full = [...allQuestions.values()].filter((set) => set.size === 15).length;
    expect(result(round, 'FULL_PARTICIPATION').aggregateCount).toBe(full);
    const stage = evaluateStageAchievements(input, stageDefinitions(15, 5)[2]!);
    const perfect = [...allQuestions].filter(([playerId, set]) => set.size === 15 && stageCorrect.get(playerId) === 5).length;
    expect(stage.find((item) => item.achievementId === 'PERFECT_STAGE')?.aggregateCount).toBe(perfect);
  });

  it('xử lý 10.000 người / 150.000 answer events dưới 200 ms ở mốc chặng', () => {
    const q = questions(15);
    const answers: AchievementAnswer[] = [];
    const events: AchievementScoreEvent[] = [];
    for (let player = 0; player < 10_000; player += 1) {
      const playerId = `p${player}`;
      for (let question = 1; question <= 15; question += 1) {
        answers.push(answer(playerId, question));
        events.push({
          questionInstanceId: `q${question}`, playerId,
          reason: (player + question) % 2 === 0 ? 'CORRECT' : 'INCORRECT', points: 500,
        });
      }
    }
    const input: AchievementEvaluationInput = { roundId: 'load-10k', questions: q, answers, scoreEvents: events, leaderboardSnapshots: [] };
    const start = performance.now();
    const snapshots = evaluateStageAchievements(input, stageDefinitions(15, 5)[0]!);
    const elapsed = performance.now() - start;
    expect(snapshots.some((snapshot) => snapshot.achievementId === 'PERFECT_STAGE')).toBe(true);
    expect(answers).toHaveLength(150_000);
    expect(events).toHaveLength(150_000);
    console.info(`achievement evaluator 10k/150k: ${elapsed.toFixed(1)} ms`);
    expect(elapsed).toBeLessThan(200);
  });
});
