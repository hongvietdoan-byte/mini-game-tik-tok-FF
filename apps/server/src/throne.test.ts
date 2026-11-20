import { describe, expect, it } from 'vitest';
import type { OptionId } from '@quiz/contracts';
import { chooseThroneHolder, replayThrone, type ThroneAnswer, type ThroneCandidate, type ThroneQuestion } from './throne';

const candidate = (playerId: string, streak: number, correctElapsedMs: number, joinOrder: number): ThroneCandidate => ({
  playerId, score: 500, correctCount: 5, streak, correctElapsedMs, joinOrder,
});

describe('throne tie breaking', () => {
  it('ưu tiên streak dài hơn; khi streak hoà, chủ ngai hiện tại được giữ', () => {
    const a = candidate('a', 4, 800, 1);
    const faster = candidate('b', 4, 100, 2);
    expect(chooseThroneHolder([a, faster], 'a')?.playerId).toBe('a');
    expect(chooseThroneHolder([a, { ...faster, streak: 5 }], 'a')?.playerId).toBe('b');
  });

  it('lần đầu đồng streak thì tổng thời gian trả lời đúng thấp hơn thắng, rồi đến thứ tự vào vòng', () => {
    const slowFirst = candidate('a', 4, 300, 0);
    const fastLater = candidate('b', 4, 100, 1);
    expect(chooseThroneHolder([slowFirst, fastLater], null)?.playerId).toBe('b');
    expect(chooseThroneHolder([
      candidate('a', 4, 100, 2),
      candidate('b', 4, 100, 1),
    ], null)?.playerId).toBe('b');
  });
});

describe('replayThrone', () => {
  const questions = (closedThrough: number, count = 6): ThroneQuestion[] => Array.from({ length: count }, (_, index) => ({
    questionInstanceId: `q${index + 1}`,
    index,
    correctOptionId: 'A' as OptionId,
    closed: index < closedThrough,
    voided: false,
    openedAtMs: index * 10_000,
    windowMs: 5_000,
  }));
  const answers: ThroneAnswer[] = Array.from({ length: 5 }, (_, questionIndex) => [
    { questionInstanceId: `q${questionIndex + 1}`, playerId: 'a', option: 'A' as OptionId, receivedAtMs: questionIndex * 10_000 + 900 },
    { questionInstanceId: `q${questionIndex + 1}`, playerId: 'b', option: 'A' as OptionId, receivedAtMs: questionIndex * 10_000 + 100 },
  ]).flat();

  it('phát lại tới câu 7/9 vẫn giữ holder trước đó khi streak bằng dù đối thủ đã nhanh hơn', () => {
    const longHistory = questions(9, 9);
    const players = [{ playerId: 'a', joinOrder: 0 }, { playerId: 'b', joinOrder: 1 }];
    const historyAnswers: ThroneAnswer[] = Array.from({ length: 9 }, (_, index) => {
      const openedAtMs = index * 10_000;
      const aElapsed = index < 5 ? 900 : 10;
      const bElapsed = index < 5 ? 100 : 2_000;
      return [
        { questionInstanceId: `q${index + 1}`, playerId: 'a', option: 'A' as OptionId, receivedAtMs: openedAtMs + aElapsed },
        { questionInstanceId: `q${index + 1}`, playerId: 'b', option: 'A' as OptionId, receivedAtMs: openedAtMs + bElapsed },
      ];
    }).flat();
    const scoring = { mode: 'CLASSIC' as const, speedBonusMax: 0 };
    const atQuestion = (closedThrough: number) => replayThrone(
      longHistory.map((question, index) => ({ ...question, closed: index < closedThrough })),
      historyAnswers.filter((answer) => Number(answer.questionInstanceId.slice(1)) <= closedThrough),
      players,
      scoring,
    );

    expect(atQuestion(5).holder?.playerId).toBe('b');
    expect(atQuestion(7).holder).toMatchObject({ playerId: 'b', streak: 7 });
    expect(atQuestion(9).holder).toMatchObject({ playerId: 'b', streak: 9 });
  });

  it('khóa tới khi câu 5 chốt; replay cho cùng chủ ngai sau restart', () => {
    const players = [{ playerId: 'a', joinOrder: 0 }, { playerId: 'b', joinOrder: 1 }];
    const locked = replayThrone(questions(4), answers, players, { mode: 'CLASSIC' });
    expect(locked).toMatchObject({ unlocked: false, holder: null });

    const afterFive = replayThrone(questions(5), answers, players, { mode: 'CLASSIC' });
    expect(afterFive).toMatchObject({ unlocked: true, holder: { playerId: 'b', streak: 5 } });
    expect(replayThrone(questions(5), answers, players, { mode: 'CLASSIC' })).toEqual(afterFive);
  });

  it('không xét đổi chủ khi câu 6 đang mở; cập nhật sau khi chốt', () => {
    const input = questions(5);
    input[5]!.closed = false;
    const q6Answers: ThroneAnswer[] = [
      { questionInstanceId: 'q6', playerId: 'a', option: 'B' as OptionId, receivedAtMs: 50_900 },
      { questionInstanceId: 'q6', playerId: 'b', option: 'A' as OptionId, receivedAtMs: 50_100 },
    ];
    const during = replayThrone(input, [...answers, ...q6Answers], [{ playerId: 'a', joinOrder: 0 }, { playerId: 'b', joinOrder: 1 }], { mode: 'CLASSIC' });
    expect(during.holder?.playerId).toBe('b');

    input[5]!.closed = true;
    const after = replayThrone(input, [...answers, ...q6Answers], [{ playerId: 'a', joinOrder: 0 }, { playerId: 'b', joinOrder: 1 }], { mode: 'CLASSIC' });
    expect(after.holder?.playerId).toBe('b');
    expect(after.holder?.streak).toBe(6);
  });
});
