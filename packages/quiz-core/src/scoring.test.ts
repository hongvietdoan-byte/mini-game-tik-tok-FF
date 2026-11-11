import { describe, expect, it } from 'vitest';
import { createPrng } from './selection';
import {
  buildPodium,
  computeRoundScores,
  rankPlayers,
  topN,
  type AnswerInput,
  type RoundQuestionInput,
} from './scoring';

function questions(count: number, overrides: Partial<RoundQuestionInput> = {}): RoundQuestionInput[] {
  return Array.from({ length: count }, (_, index) => ({
    questionInstanceId: `q${index + 1}`,
    index: index + 1,
    correctOptionId: 'A' as const,
    closed: true,
    voided: false,
    ...overrides,
  }));
}

function answersFor(qs: RoundQuestionInput[], playerId = 'p1', option: AnswerInput['option'] = 'A'): AnswerInput[] {
  return qs.map((question) => ({ questionInstanceId: question.questionInstanceId, playerId, option }));
}

describe('computeRoundScores', () => {
  it('chấm +100, sai/không trả lời 0 và thưởng chuỗi 3/5/10 đúng câu đạt mốc', () => {
    const qs = questions(10);
    const result = computeRoundScores(qs, answersFor(qs));
    expect(result.ledger.filter((entry) => entry.reason === 'CORRECT')).toHaveLength(10);
    expect(result.ledger.filter((entry) => entry.reason === 'CORRECT').every((entry) => entry.points === 100)).toBe(true);
    expect(result.ledger.filter((entry) => entry.reason !== 'CORRECT')).toEqual([
      { questionInstanceId: 'q3', playerId: 'p1', reason: 'STREAK_3', points: 30 },
      { questionInstanceId: 'q5', playerId: 'p1', reason: 'STREAK_5', points: 50 },
      { questionInstanceId: 'q10', playerId: 'p1', reason: 'STREAK_10', points: 100 },
    ]);
    expect(result.totals.get('p1')).toEqual({ playerId: 'p1', score: 1180, correctCount: 10, streak: 10 });
    const mixed = computeRoundScores(questions(3), [
      { questionInstanceId: 'q1', playerId: 'p1', option: 'B' },
      { questionInstanceId: 'q2', playerId: 'p1', option: 'A' },
    ]);
    expect(mixed.totals.get('p1')).toEqual({ playerId: 'p1', score: 100, correctCount: 1, streak: 0 });
  });

  it('reset chuỗi khi sai rồi cho thưởng STREAK_3 lần nữa', () => {
    const qs = questions(7);
    const answers = answersFor(qs).map((answer) => answer.questionInstanceId === 'q4' ? { ...answer, option: 'B' as const } : answer);
    const result = computeRoundScores(qs, answers);
    expect(result.ledger.filter((entry) => entry.reason === 'STREAK_3').map((entry) => entry.questionInstanceId)).toEqual(['q3', 'q7']);
    expect(result.totals.get('p1')?.score).toBe(660);
    expect(result.totals.get('p1')?.streak).toBe(3);
  });

  it('bỏ lỡ câu sau khi tham gia làm chuỗi về 0; người vào muộn không bị tính câu trước', () => {
    const qs = questions(8);
    const answers = [
      ...answersFor(qs.slice(0, 3), 'early'),
      ...answersFor(qs.slice(5), 'late'),
    ];
    const result = computeRoundScores(qs, answers);
    expect(result.totals.get('early')).toEqual({ playerId: 'early', score: 330, correctCount: 3, streak: 0 });
    expect(result.totals.get('late')).toEqual({ playerId: 'late', score: 330, correctCount: 3, streak: 3 });
  });

  it('câu voided hoặc chưa closed không cho điểm và không đổi chuỗi', () => {
    const qs = questions(4);
    qs[1]!.voided = true;
    qs[2]!.closed = false;
    const result = computeRoundScores(qs, answersFor(qs));
    expect(result.totals.get('p1')).toEqual({ playerId: 'p1', score: 200, correctCount: 2, streak: 2 });
    expect(result.ledger.map((entry) => entry.questionInstanceId)).toEqual(['q1', 'q4']);
  });

  it('chỉ dùng câu trả lời đầu tiên của cùng người cho cùng câu', () => {
    const qs = questions(1);
    const result = computeRoundScores(qs, [
      { questionInstanceId: 'q1', playerId: 'p1', option: 'B' },
      { questionInstanceId: 'q1', playerId: 'p1', option: 'A' },
    ]);
    expect(result.totals.get('p1')).toEqual({ playerId: 'p1', score: 0, correctCount: 0, streak: 0 });
    expect(result.ledger).toEqual([]);
  });

  it('tất định, idempotent và không phụ thuộc thứ tự mảng questions', () => {
    const qs = questions(12);
    const answers = [...answersFor(qs), { questionInstanceId: 'q3', playerId: 'p2', option: 'A' as const }];
    const first = computeRoundScores(qs, answers);
    const again = computeRoundScores(qs, answers);
    const reversed = computeRoundScores([...qs].reverse(), answers);
    expect(again.ledger).toEqual(first.ledger);
    expect(again.totals).toEqual(first.totals);
    expect(reversed.ledger).toEqual(first.ledger);
    expect(reversed.totals).toEqual(first.totals);
    expect(qs.map((question) => question.index)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it('property check 200 ca: tổng ledger bằng score và CORRECT bằng correctCount', () => {
    const rnd = createPrng(20261111);
    const options = ['A', 'B', 'C', 'D'] as const;
    for (let run = 0; run < 200; run += 1) {
      const qs = questions(20).map((question) => ({ ...question, correctOptionId: options[Math.floor(rnd() * 4)]! }));
      const answers: AnswerInput[] = [];
      for (const question of qs) {
        for (let player = 0; player < 12; player += 1) {
          if (rnd() < 0.75) answers.push({ questionInstanceId: question.questionInstanceId, playerId: `p${player}`, option: options[Math.floor(rnd() * 4)]! });
        }
      }
      const result = computeRoundScores(qs, answers);
      for (const total of result.totals.values()) {
        const entries = result.ledger.filter((entry) => entry.playerId === total.playerId);
        expect(entries.reduce((sum, entry) => sum + entry.points, 0)).toBe(total.score);
        expect(entries.filter((entry) => entry.reason === 'CORRECT')).toHaveLength(total.correctCount);
      }
    }
  });
});

describe('leaderboards', () => {
  it('xếp hạng 1,1,3; tie đúng, sort trong nhóm theo playerId, không mutate input', () => {
    const players = [
      { playerId: 'z', displayName: 'Z', score: 200, correctCount: 2 },
      { playerId: 'b', displayName: 'B', score: 200, correctCount: 2 },
      { playerId: 'a', displayName: 'A', score: 100, correctCount: 1 },
      { playerId: 'c', displayName: 'C', score: 200, correctCount: 1 },
    ];
    const before = structuredClone(players);
    expect(rankPlayers(players).map(({ playerId, rank, tied }) => [playerId, rank, tied])).toEqual([
      ['b', 1, true], ['z', 1, true], ['c', 3, false], ['a', 4, false],
    ]);
    expect(players).toEqual(before);
  });

  it('topN không bịa người chơi khi danh sách ngắn hơn 10', () => {
    const ranked = rankPlayers([{ playerId: 'p1', displayName: 'Một', score: 100, correctCount: 1 }]);
    expect(topN(ranked, 10)).toHaveLength(1);
    expect(topN([], 10)).toEqual([]);
  });

  it('buildPodium xử lý 0–3 người, hai người đồng hạng nhất và nhóm đồng hạng vắt ngưỡng', () => {
    expect(buildPodium([])).toEqual({ slots: [], tieAcrossCutoff: false });
    expect(buildPodium(rankPlayers([{ playerId: 'p1', displayName: 'A', score: 1, correctCount: 1 }])).slots).toHaveLength(1);
    expect(buildPodium(rankPlayers([
      { playerId: 'p1', displayName: 'A', score: 1, correctCount: 1 },
      { playerId: 'p2', displayName: 'B', score: 0, correctCount: 0 },
    ])).slots).toHaveLength(2);
    expect(buildPodium(rankPlayers([
      { playerId: 'p1', displayName: 'A', score: 3, correctCount: 3 },
      { playerId: 'p2', displayName: 'B', score: 2, correctCount: 2 },
      { playerId: 'p3', displayName: 'C', score: 1, correctCount: 1 },
    ])).slots).toHaveLength(3);
    const tiedFirst = buildPodium(rankPlayers([
      { playerId: 'p1', displayName: 'A', score: 10, correctCount: 1 },
      { playerId: 'p2', displayName: 'B', score: 10, correctCount: 1 },
      { playerId: 'p3', displayName: 'C', score: 0, correctCount: 0 },
    ]));
    expect(tiedFirst.slots[0]).toMatchObject({ place: 1, rank: 1, tied: true });
    expect(tiedFirst.slots[1]).toMatchObject({ place: 2, rank: 3 });
    expect(tiedFirst.tieAcrossCutoff).toBe(false);
    const cutoff = buildPodium(rankPlayers([
      { playerId: 'p1', displayName: 'A', score: 5, correctCount: 5 },
      { playerId: 'p2', displayName: 'B', score: 4, correctCount: 4 },
      { playerId: 'p3', displayName: 'C', score: 3, correctCount: 3 },
      { playerId: 'p4', displayName: 'D', score: 3, correctCount: 3 },
      { playerId: 'p5', displayName: 'E', score: 3, correctCount: 3 },
    ]));
    expect(cutoff.tieAcrossCutoff).toBe(true);
    const fourFirst = buildPodium(rankPlayers(Array.from({ length: 4 }, (_, index) => ({ playerId: `p${index}`, displayName: `${index}`, score: 1, correctCount: 1 }))));
    expect(fourFirst.slots).toHaveLength(1);
    expect(fourFirst.tieAcrossCutoff).toBe(true);
  });
});
