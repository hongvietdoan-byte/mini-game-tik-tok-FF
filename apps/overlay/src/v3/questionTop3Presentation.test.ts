import { describe, expect, it } from 'vitest';
import type { PublicSnapshot, QuestionTop3View, RankedEntry } from '@quiz/contracts';
import { activeQuestionTop3, questionTop3Presentation } from './questionTop3Presentation';

const entry = (rank: number, name: string, tied = false): RankedEntry => ({
  playerId: 'player-' + rank + '-' + name,
  safeDisplayName: name,
  rank,
  metricValue: 1_240,
  metricUnit: 'ms',
  tied,
});

function top3(entries: RankedEntry[], tiedOverflowCount = 0): QuestionTop3View {
  return { questionInstanceId: 'q-5', entries, totalQualified: entries.length + tiedOverflowCount, tiedOverflowCount, revision: 1 };
}

describe('questionTop3Presentation', () => {
  it('shows the empty-result copy when nobody answered correctly', () => {
    expect(questionTop3Presentation(top3([]))).toEqual({ entries: [], tiedOverflowCount: 0, empty: true });
  });

  it.each([1, 2, 3])('keeps exactly %i ranked entries', (count) => {
    const result = questionTop3Presentation(top3(Array.from({ length: count }, (_, index) => entry(index + 1, 'Player'))));
    expect(result.entries).toHaveLength(count);
    expect(result.empty).toBe(false);
  });

  it('preserves equal ranks and emphasis for tied players and reports omitted tied entries', () => {
    const entries = [entry(1, 'A', true), entry(1, 'B', true), entry(1, 'C', true)];
    const result = questionTop3Presentation(top3(entries, 4));
    expect(result.entries.map((row) => [row.rank, row.tied])).toEqual([[1, true], [1, true], [1, true]]);
    expect(result.tiedOverflowCount).toBe(4);
  });

  it('rejects a stale, mismatched, or non-result ranking', () => {
    const snapshot = {
      scene: 'REVEAL', state: 'LEADERBOARD', reveal: { questionInstanceId: 'q-5' }, questionTop3: top3([entry(1, 'Player')]),
    } as PublicSnapshot;
    expect(activeQuestionTop3(snapshot)).not.toBeNull();
    expect(activeQuestionTop3({ ...snapshot, questionTop3: top3For('q-4') })).toBeNull();
    expect(activeQuestionTop3({ ...snapshot, state: 'ACCEPTING' })).toBeNull();
    expect(activeQuestionTop3({ ...snapshot, scene: 'QUESTION' })).toBeNull();
    expect(activeQuestionTop3({ ...snapshot, reveal: null })).toBeNull();
  });
});

function top3For(questionInstanceId: string): QuestionTop3View {
  return { ...top3([entry(1, 'Player')]), questionInstanceId };
}
