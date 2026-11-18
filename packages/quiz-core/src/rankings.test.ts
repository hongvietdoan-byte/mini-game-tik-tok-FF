import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { questionTop3, stageDefinitions, stageScores, stageTop3 } from './rankings';
import type { QuestionRankingAnswer, RankingScoreEvent, RankingStageAnswer, RankingStageQuestion } from './rankings';

const answer = (answerId: number, playerId: string, receivedAtMs: number, optionId = 'A', questionInstanceId = 'q1') => ({
  answerId,
  playerId,
  questionInstanceId,
  optionId,
  receivedAtMs,
  safeDisplayName: `An toàn ${playerId}`,
});

describe('questionTop3', () => {
  const make = (answers: QuestionRankingAnswer[], openedAtMs: number | null = 1_000) => questionTop3({
    questionInstanceId: 'q1', correctOptionId: 'A', openedAtMs, answers,
  });

  it.each([0, 1, 2])('không bịa thêm người khi chỉ có %i người đúng', (count) => {
    const result = make(Array.from({ length: count }, (_, index) => answer(index + 1, `p${index + 1}`, 1_010 + index)));
    expect(result?.entries).toHaveLength(count);
    expect(result?.totalQualified).toBe(count);
    expect(result?.tiedOverflowCount).toBe(0);
  });

  it('chọn đáp án đúng đầu tiên hợp lệ, bỏ câu sai/câu khác và tính responseMs theo giờ server', () => {
    const result = make([
      answer(1, 'p1', 900), // trước mốc mở, không hợp lệ
      answer(2, 'p1', 1_020, 'B'),
      answer(3, 'p1', 1_010, 'A'), // đáp án sau không thay câu trả lời đầu tiên hợp lệ
      answer(4, 'p2', 1_015, 'A', 'other-question'),
      answer(5, 'p3', 1_012, 'A'),
    ]);
    expect(result).toMatchObject({ totalQualified: 1, tiedOverflowCount: 0 });
    expect(result?.entries).toEqual([{
      playerId: 'p3', safeDisplayName: 'An toàn p3', rank: 1, metricValue: 12, metricUnit: 'ms', tied: false,
    }]);
  });

  it('đồng hạng cùng mili-giây, giữ thứ tự answers.id và báo số người đồng hạng bị ẩn', () => {
    const result = make([
      answer(9, 'p4', 1_010),
      answer(7, 'p2', 1_010),
      answer(5, 'p1', 1_010),
      answer(8, 'p3', 1_010),
      answer(10, 'p5', 1_020),
    ]);
    expect(result).toMatchObject({ totalQualified: 5, tiedOverflowCount: 1 });
    expect(result?.entries.map(({ playerId, rank, tied }) => ({ playerId, rank, tied }))).toEqual([
      { playerId: 'p1', rank: 1, tied: true },
      { playerId: 'p2', rank: 1, tied: true },
      { playerId: 'p3', rank: 1, tied: true },
    ]);
  });

  it('đánh số hạng theo nhóm đồng hạng, không dùng answerId để phá hoà metric', () => {
    const result = make([
      answer(1, 'p1', 1_010), answer(2, 'p2', 1_010), answer(3, 'p3', 1_020), answer(4, 'p4', 1_030),
    ]);
    expect(result?.entries.map(({ rank, tied }) => ({ rank, tied }))).toEqual([
      { rank: 1, tied: true }, { rank: 1, tied: true }, { rank: 3, tied: false },
    ]);
    expect(result?.tiedOverflowCount).toBe(0);
  });

  it('không tạo bảng nếu thiếu mốc mở hoặc câu bị void', () => {
    expect(make([answer(1, 'p1', 1_010)], null)).toBeNull();
    expect(questionTop3({
      questionInstanceId: 'q1', correctOptionId: 'A', openedAtMs: 1_000, voided: true,
      answers: [answer(1, 'p1', 1_010)],
    })).toBeNull();
  });
});

describe('stage rankings', () => {
  it('chia 15 câu thành ba chặng 5 câu; hỗ trợ số câu khác 15 và chặng cuối ngắn', () => {
    expect(stageDefinitions(15, 5)).toEqual([
      { stageId: 'STAGE_1', stageIndex: 1, firstQuestionIndex: 1, lastQuestionIndex: 5 },
      { stageId: 'STAGE_2', stageIndex: 2, firstQuestionIndex: 6, lastQuestionIndex: 10 },
      { stageId: 'STAGE_3', stageIndex: 3, firstQuestionIndex: 11, lastQuestionIndex: 15 },
    ]);
    expect(stageDefinitions(12, 5).map(({ firstQuestionIndex, lastQuestionIndex }) => [firstQuestionIndex, lastQuestionIndex]))
      .toEqual([[1, 5], [6, 10], [11, 12]]);
    expect(stageDefinitions(0, 5)).toEqual([]);
    expect(() => stageDefinitions(12, 0)).toThrow(RangeError);
  });

  it('cộng CORRECT/SPEED/STREAK và VOID_REVERSAL theo chặng; người vào muộn chỉ có mặt từ chặng đã tham gia', () => {
    const stages = stageDefinitions(6, 5);
    const questions: RankingStageQuestion[] = Array.from({ length: 6 }, (_, index) => ({
      questionInstanceId: `q${index + 1}`, questionIndex: index + 1,
    }));
    const answers: RankingStageAnswer[] = [
      { questionInstanceId: 'q1', playerId: 'a', safeDisplayName: 'An toàn A' },
      { questionInstanceId: 'q5', playerId: 'a', safeDisplayName: 'An toàn A' },
      { questionInstanceId: 'q2', playerId: 'b', safeDisplayName: 'An toàn B' },
      { questionInstanceId: 'q6', playerId: 'late', safeDisplayName: 'An toàn đến muộn' },
    ];
    const events: RankingScoreEvent[] = [
      { questionInstanceId: 'q1', playerId: 'a', reason: 'CORRECT', points: 500 },
      { questionInstanceId: 'q1', playerId: 'a', reason: 'SPEED', points: 500 },
      { questionInstanceId: 'q1', playerId: 'a', reason: 'STREAK', points: 100 },
      { questionInstanceId: 'q5', playerId: 'a', reason: 'CORRECT', points: 500 },
      { questionInstanceId: 'q5', playerId: 'a', reason: 'VOID_REVERSAL:CORRECT', points: -500 },
      { questionInstanceId: 'q5', playerId: 'a', reason: 'VOID_REVERSAL:SPEED', points: -250 },
      { questionInstanceId: 'q2', playerId: 'b', reason: 'CORRECT', points: 500 },
      { questionInstanceId: 'q6', playerId: 'late', reason: 'CORRECT', points: 600 },
    ];
    const first = stageScores(stages[0]!, questions, answers, events);
    const second = stageScores(stages[1]!, questions, answers, events);
    const firstByPlayer = new Map(first.map((entry) => [entry.playerId, entry]));
    expect(firstByPlayer.get('a')).toMatchObject({ stageScore: 850, correctCount: 1 });
    expect(firstByPlayer.get('b')).toMatchObject({ stageScore: 500, correctCount: 1 });
    expect(firstByPlayer.has('late')).toBe(false);
    expect(second).toEqual([{ playerId: 'late', safeDisplayName: 'An toàn đến muộn', stageScore: 600, correctCount: 1 }]);
    const totalsByPlayer = new Map<string, number>();
    for (const event of events) totalsByPlayer.set(event.playerId, (totalsByPlayer.get(event.playerId) ?? 0) + event.points);
    for (const stage of [first, second])
      for (const entry of stage) totalsByPlayer.set(entry.playerId, (totalsByPlayer.get(entry.playerId) ?? 0) - entry.stageScore);
    expect([...totalsByPlayer.values()].every((total) => total === 0)).toBe(true);
  });

  it('xếp theo điểm rồi số câu đúng, đồng hạng khi cả hai metric bằng nhau', () => {
    const result = stageTop3([
      { playerId: 'b', safeDisplayName: 'B', stageScore: 1_000, correctCount: 2 },
      { playerId: 'c', safeDisplayName: 'C', stageScore: 1_000, correctCount: 1 },
      { playerId: 'a', safeDisplayName: 'A', stageScore: 1_000, correctCount: 2 },
      { playerId: 'd', safeDisplayName: 'D', stageScore: 1_000, correctCount: 2 },
      { playerId: 'e', safeDisplayName: 'E', stageScore: 1_000, correctCount: 2 },
    ]);
    expect(result).toMatchObject({ totalQualified: 5, tiedOverflowCount: 1 });
    expect(result.entries.map(({ playerId, rank, tied }) => ({ playerId, rank, tied }))).toEqual([
      { playerId: 'a', rank: 1, tied: true },
      { playerId: 'b', rank: 1, tied: true },
      { playerId: 'd', rank: 1, tied: true },
    ]);
  });

  it('đo stageTop3 10.000 người với 5 câu và score events', () => {
    const count = 10_000;
    const stage = stageDefinitions(15, 5)[0]!;
    const questions = Array.from({ length: 5 }, (_, index) => ({ questionInstanceId: `q${index + 1}`, questionIndex: index + 1 }));
    const answers: RankingStageAnswer[] = [];
    const events: RankingScoreEvent[] = [];
    for (let player = 0; player < count; player += 1) {
      const playerId = `p${String(player).padStart(5, '0')}`;
      for (let q = 1; q <= 5; q += 1) {
        answers.push({ questionInstanceId: `q${q}`, playerId, safeDisplayName: `Người ${player}` });
        events.push(
          { questionInstanceId: `q${q}`, playerId, reason: 'CORRECT', points: 500 },
          { questionInstanceId: `q${q}`, playerId, reason: 'SPEED', points: player % 101 },
          { questionInstanceId: `q${q}`, playerId, reason: 'STREAK', points: q === 5 ? 100 : 0 },
        );
      }
    }
    const scoreStartedAt = performance.now();
    const scores = stageScores(stage, questions, answers, events);
    const stageScoreMs = performance.now() - scoreStartedAt;
    const rankingStartedAt = performance.now();
    const result = stageTop3(scores);
    const stageTop3Ms = performance.now() - rankingStartedAt;
    expect(scores).toHaveLength(count);
    expect(result.entries).toHaveLength(3);
    console.info(
      `BENCH 10,000 người / 5 câu / ${events.length} events: stageScores ${stageScoreMs.toFixed(2)} ms; ` +
        `stageTop3 ${stageTop3Ms.toFixed(2)} ms`,
    );
  });
});
