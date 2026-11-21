import type { PublicSnapshot, QuestionTop3View, RankedEntry } from '@quiz/contracts';

export type QuestionTop3Presentation = {
  entries: RankedEntry[];
  tiedOverflowCount: number;
  empty: boolean;
};

/** Accept only a ranking for the result currently being shown. */
export function activeQuestionTop3(snapshot: PublicSnapshot): QuestionTop3View | null {
  const top3 = snapshot.questionTop3;
  if (snapshot.scene !== 'REVEAL' || (snapshot.state !== 'REVEAL' && snapshot.state !== 'LEADERBOARD') ||
    !snapshot.reveal || !top3 || top3.questionInstanceId !== snapshot.reveal.questionInstanceId) return null;
  return top3;
}

export function questionTop3Presentation(top3: QuestionTop3View): QuestionTop3Presentation {
  const entries = top3.entries.slice(0, 3);
  const overflow = Number.isSafeInteger(top3.tiedOverflowCount) && top3.tiedOverflowCount > 0
    ? top3.tiedOverflowCount
    : 0;
  return { entries, tiedOverflowCount: overflow, empty: entries.length === 0 };
}
