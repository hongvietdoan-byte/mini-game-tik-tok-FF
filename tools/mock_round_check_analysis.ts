import type { GameState, Podium } from '@quiz/contracts';

export const MOCK_ROUND_PHASES: readonly GameState[] = [
  'READING',
  'ACCEPTING',
  'REVEAL',
  'LEADERBOARD',
  'ROUND_END',
  'VICTORY',
];

export type MockRoundSample = {
  atMs: number;
  state: GameState;
  questionCount: number | null;
  acceptedAnswers: number;
  podium: Podium | null;
};

export type MockRoundAnalysis = {
  complete: boolean;
  missingPhases: GameState[];
  phaseOrderValid: boolean;
  phaseVisits: { state: GameState; durationMs: number }[];
  acceptedAnswers: number;
  questionCount: number | null;
  top3: { place: number; rank: number; tied: boolean; displayName: string; score: number }[];
};

export function analyzeMockRound(
  samples: readonly MockRoundSample[],
  expectedQuestions: number,
  endedAtMs = samples.at(-1)?.atMs ?? 0,
): MockRoundAnalysis {
  const phaseVisits: MockRoundAnalysis['phaseVisits'] = [];
  let active: MockRoundSample | null = null;

  for (const sample of samples) {
    if (!active) {
      active = sample;
      continue;
    }
    if (sample.state === active.state) continue;
    phaseVisits.push({ state: active.state, durationMs: Math.max(0, sample.atMs - active.atMs) });
    active = sample;
  }

  if (active) {
    phaseVisits.push({ state: active.state, durationMs: Math.max(0, endedAtMs - active.atMs) });
  }

  const observedPhases = new Set(samples.map((sample) => sample.state));
  const missingPhases = MOCK_ROUND_PHASES.filter((state) => !observedPhases.has(state));
  const phaseFirstIndices = MOCK_ROUND_PHASES.map((state) => samples.findIndex((sample) => sample.state === state));
  const phaseOrderValid = phaseFirstIndices.every((index, position) =>
    index >= 0 && (position === 0 || index > phaseFirstIndices[position - 1]!),
  );
  const lastSample = samples.at(-1);
  const podium = lastSample?.podium;
  const top3 = podium?.slots.flatMap((slot) => slot.entries.map((entry) => ({
    place: slot.place,
    rank: entry.rank,
    tied: slot.tied,
    displayName: entry.displayName,
    score: entry.score,
  }))) ?? [];
  const acceptedAnswers = samples.reduce((highest, sample) => Math.max(highest, sample.acceptedAnswers), 0);
  const questionCount = lastSample?.questionCount ?? null;

  return {
    complete: missingPhases.length === 0 && phaseOrderValid && questionCount === expectedQuestions && top3.length > 0,
    missingPhases,
    phaseOrderValid,
    phaseVisits: phaseVisits.filter((visit) => MOCK_ROUND_PHASES.includes(visit.state)),
    acceptedAnswers,
    questionCount,
    top3,
  };
}
