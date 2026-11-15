export type QuestionVoiceOption = { id: string; text: string };
export type QuestionVoiceScriptLine = { lineId: string; text: string };

export const QUESTION_PROMPT_PAUSE_MS = 700;
export const QUESTION_OPTION_PAUSE_MS = 400;
const QUESTION_OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

/** Giảm dần khoảng nghỉ nếu thời lượng audio + hàng đợi không còn đủ 20 giây. */
export const QUESTION_PAUSE_TIERS = [
  { promptMs: QUESTION_PROMPT_PAUSE_MS, optionMs: QUESTION_OPTION_PAUSE_MS },
  { promptMs: 500, optionMs: 300 },
  { promptMs: 300, optionMs: 150 },
  { promptMs: 0, optionMs: 0 },
] as const;

const SENTENCE_ENDING = /[.!?…]["'”’»)\]}]*$/u;

function withEnding(text: string, ending: '?' | '.') {
  const trimmed = text.trimEnd();
  return SENTENCE_ENDING.test(trimmed) ? trimmed : `${trimmed}${ending}`;
}

/** Nội dung được duyệt giữ nguyên; chỉ chuẩn hoá dấu câu và thêm nhãn đáp án để đọc thành tiếng. */
export function questionVoiceScripts(prompt: string, options: readonly QuestionVoiceOption[]): QuestionVoiceScriptLine[] {
  if (options.length !== 4 || options.some((option) => !option.id.trim() || !option.text.trim()))
    throw new Error('Câu hỏi MC Voice cần đúng bốn đáp án có nội dung.');
  return [
    { lineId: 'prompt', text: withEnding(prompt, '?') },
    ...options.map((option, index) => ({
      lineId: `option-${index + 1}`,
      text: `${QUESTION_OPTION_LABELS[index]!}: ${withEnding(option.text, '.')}`,
    })),
  ];
}

export type QuestionCueSchedule = {
  offsetsMs: number[];
  totalDurationMs: number;
  promptPauseMs: number;
  optionPauseMs: number;
};

/** Lịch cố định 5 cue: đề + A/B/C/D, không có khoảng nghỉ sau đáp án cuối. */
export function planQuestionCueSchedule(
  durationsMs: readonly number[],
  availableBudgetMs: number,
): QuestionCueSchedule | null {
  if (durationsMs.length !== 5 || durationsMs.some((duration) => !Number.isSafeInteger(duration) || duration <= 0) ||
    !Number.isFinite(availableBudgetMs) || availableBudgetMs < 0) return null;
  const audioDurationMs = durationsMs.reduce((total, duration) => total + duration, 0);
  for (const tier of QUESTION_PAUSE_TIERS) {
    const totalDurationMs = audioDurationMs + tier.promptMs + tier.optionMs * 3;
    if (totalDurationMs > availableBudgetMs) continue;
    const offsetsMs: number[] = [];
    let offsetMs = 0;
    for (let index = 0; index < durationsMs.length; index += 1) {
      offsetsMs.push(offsetMs);
      offsetMs += durationsMs[index]!;
      if (index === 0) offsetMs += tier.promptMs;
      else if (index < durationsMs.length - 1) offsetMs += tier.optionMs;
    }
    return { offsetsMs, totalDurationMs, promptPauseMs: tier.promptMs, optionPauseMs: tier.optionMs };
  }
  return null;
}
