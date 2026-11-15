import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseMockRoundArgs } from './mock_round_check';
import { analyzeMockRound, type MockRoundSample } from './mock_round_check_analysis';

const sample = (
  atMs: number,
  state: MockRoundSample['state'],
  acceptedAnswers = 0,
  podium: MockRoundSample['podium'] = null,
): MockRoundSample => ({ atMs, state, questionCount: 3, acceptedAnswers, podium });

test('analyzeMockRound finds ordered phases, durations, accepted answers and the final top 3', () => {
  const analysis = analyzeMockRound([
    sample(0, 'IDLE'),
    sample(10, 'READING'),
    sample(30, 'ACCEPTING', 4),
    sample(50, 'REVEAL', 5),
    sample(70, 'LEADERBOARD', 5),
    sample(100, 'ROUND_END', 9),
    sample(130, 'VICTORY', 9, {
      tieAcrossCutoff: false,
      slots: [
        { place: 1, rank: 1, tied: false, entries: [{ rank: 1, tied: false, playerId: 'p1', safeDisplayName: 'Linh', score: 900, correctCount: 3 }] },
        { place: 2, rank: 2, tied: false, entries: [{ rank: 2, tied: false, playerId: 'p2', safeDisplayName: 'Minh', score: 700, correctCount: 2 }] },
        { place: 3, rank: 3, tied: false, entries: [{ rank: 3, tied: false, playerId: 'p3', safeDisplayName: 'An', score: 500, correctCount: 2 }] },
      ],
    }),
  ], 3, 150);

  assert.equal(analysis.complete, true);
  assert.deepEqual(analysis.missingPhases, []);
  assert.equal(analysis.phaseOrderValid, true);
  assert.equal(analysis.acceptedAnswers, 9);
  assert.equal(analysis.questionCount, 3);
  assert.deepEqual(analysis.phaseVisits.map(({ state, durationMs }) => [state, durationMs]), [
    ['READING', 20], ['ACCEPTING', 20], ['REVEAL', 20], ['LEADERBOARD', 30], ['ROUND_END', 30], ['VICTORY', 20],
  ]);
  assert.deepEqual(analysis.top3.map(({ place, safeDisplayName }) => [place, safeDisplayName]), [
    [1, 'Linh'], [2, 'Minh'], [3, 'An'],
  ]);
});

test('analyzeMockRound reports missing phases and a round with the wrong question count', () => {
  const analysis = analyzeMockRound([
    sample(0, 'PREPARE'),
    sample(10, 'ACCEPTING', 0),
    sample(20, 'VICTORY'),
  ], 3, 30);

  assert.equal(analysis.complete, false);
  assert.deepEqual(analysis.missingPhases, ['READING', 'REVEAL', 'LEADERBOARD', 'ROUND_END']);
  assert.equal(analysis.phaseOrderValid, false);
  assert.equal(analysis.questionCount, 3);
});

test('script mặc định 10 câu và không nhận số lượng ngoài contract', () => {
  const defaults = parseMockRoundArgs([], 'C:/quiz');
  assert.equal('help' in defaults ? null : defaults.questions, 10);
  const selected = parseMockRoundArgs(['--questions', '15'], 'C:/quiz');
  assert.equal('help' in selected ? null : selected.questions, 15);
  assert.throws(() => parseMockRoundArgs(['--questions', '3'], 'C:/quiz'), /10, 15 hoặc 20/);
});
