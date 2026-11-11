import { describe, expect, it } from 'vitest';
import type { PublicSnapshot, WsMessage } from '@quiz/contracts';
import { applyAnswerCounts } from './useSnapshot';

function snapshot(overrides: Partial<PublicSnapshot> = {}) {
  return {
    sessionId: 'session-1',
    state: 'ACCEPTING',
    stateVersion: 7,
    question: { questionInstanceId: 'round-1-question-1' },
    answerCount: 0,
    participantCount: 0,
    ...overrides,
  } as PublicSnapshot;
}

function countsMessage(overrides: Partial<WsMessage<'ANSWER_COUNTS'>> = {}): WsMessage<'ANSWER_COUNTS'> {
  return {
    v: 1,
    type: 'ANSWER_COUNTS',
    seq: 12,
    sessionId: 'session-1',
    stateVersion: 7,
    serverTimeMs: 1_800_000_000_000,
    payload: {
      questionInstanceId: 'round-1-question-1',
      answerCount: 35,
      participantCount: 35,
    },
    ...overrides,
  };
}

describe('overlay ANSWER_COUNTS', () => {
  it('updates the current question total and participants from a newer frame', () => {
    const current = snapshot();
    const result = applyAnswerCounts(current, 11, false, countsMessage());

    expect(result.seq).toBe(12);
    expect(result.snapshot).toMatchObject({
      state: 'ACCEPTING',
      stateVersion: 7,
      question: { questionInstanceId: 'round-1-question-1' },
      answerCount: 35,
      participantCount: 35,
    });
    expect(result.snapshot).not.toBe(current);
    expect(current.answerCount).toBe(0);
  });

  it('ignores an old or duplicate seq without changing the snapshot', () => {
    const current = snapshot();
    const result = applyAnswerCounts(current, 12, false, countsMessage({ seq: 12 }));

    expect(result).toEqual({ snapshot: current, seq: 12 });
  });

  it('ignores another question while consuming its newer seq', () => {
    const current = snapshot();
    const result = applyAnswerCounts(current, 11, false, countsMessage({
      payload: { questionInstanceId: 'round-1-question-2', answerCount: 2, participantCount: 2 },
    }));

    expect(result).toEqual({ snapshot: current, seq: 12 });
  });

  it('ignores another session, another state version, and counts before a fresh snapshot', () => {
    const current = snapshot();
    expect(applyAnswerCounts(current, 11, false, countsMessage({ sessionId: 'session-2' })))
      .toEqual({ snapshot: current, seq: 11 });
    expect(applyAnswerCounts(current, 11, false, countsMessage({ stateVersion: 6 })))
      .toEqual({ snapshot: current, seq: 12 });
    expect(applyAnswerCounts(current, 11, true, countsMessage()))
      .toEqual({ snapshot: current, seq: 11 });
  });
});
