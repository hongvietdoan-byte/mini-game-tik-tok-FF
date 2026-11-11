import { OPTION_IDS, type OptionId, type Question, type QuestionSnapshot } from '@quiz/contracts';

/** PRNG tất định (mulberry32). Cùng seed → cùng chuỗi. */
export function createPrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace<T>(arr: T[], rnd: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Câu hỏi có được phép vào vòng công khai không. */
export function isEligible(q: Question, opts: { allowDemo: boolean; nowMs: number }): boolean {
  if (q.approvalStatus !== 'APPROVED') return false;
  const verified =
    q.verificationStatus === 'VERIFIED' ||
    q.verificationStatus === 'OPERATOR_VERIFIED' ||
    (opts.allowDemo && q.verificationStatus === 'DEMO');
  if (!verified) return false;
  if (q.validFrom !== null && opts.nowMs < q.validFrom) return false;
  if (q.validUntil !== null && opts.nowMs >= q.validUntil) return false;
  return true;
}

export type SelectionRequest = {
  roundId: string;
  seed: number;
  count: number;
  pool: Question[];
  /** Các questionId đã dùng trong phiên LIVE hiện tại. */
  usedInSession: ReadonlySet<string>;
  allowDemo: boolean;
  /** Operator CHỦ ĐỘNG cho phép lặp lại khi thiếu câu. Không bao giờ lặp âm thầm. */
  allowReuse: boolean;
  nowMs: number;
};

export type SelectionResult =
  | { ok: true; seed: number; snapshots: QuestionSnapshot[]; reusedQuestionIds: string[] }
  | { ok: false; code: 'INSUFFICIENT_QUESTIONS'; eligible: number; unused: number; required: number };

/**
 * Chế độ RANDOM có seed (Phase 1). SMART_RANDOM theo quota độ khó/chủ đề thuộc Phase 2.
 * Tạo sẵn toàn bộ vòng: chọn câu, xáo vị trí đáp án và ánh xạ lại đáp án đúng,
 * trả về snapshot bất biến.
 */
export function selectRound(req: SelectionRequest): SelectionResult {
  const rnd = createPrng(req.seed);
  // sắp xếp theo id trước khi xáo để kết quả không phụ thuộc thứ tự đầu vào
  const eligible = req.pool
    .filter((q) => isEligible(q, { allowDemo: req.allowDemo, nowMs: req.nowMs }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const unused = eligible.filter((q) => !req.usedInSession.has(q.id));

  let chosen: Question[];
  let reused: Question[] = [];
  if (unused.length >= req.count) {
    chosen = shuffleInPlace([...unused], rnd).slice(0, req.count);
  } else if (req.allowReuse && eligible.length >= req.count) {
    const used = eligible.filter((q) => req.usedInSession.has(q.id));
    // ưu tiên câu chưa dùng, phần thiếu lấy câu ít dùng gần đây nhất
    used.sort((a, b) => (a.lastUsedAt ?? 0) - (b.lastUsedAt ?? 0) || (a.id < b.id ? -1 : 1));
    reused = used.slice(0, req.count - unused.length);
    chosen = shuffleInPlace([...unused, ...reused], rnd);
  } else {
    return {
      ok: false,
      code: 'INSUFFICIENT_QUESTIONS',
      eligible: eligible.length,
      unused: unused.length,
      required: req.count,
    };
  }

  const snapshots = chosen.map((q, index) => snapshotQuestion(q, index, req.roundId, rnd));
  return { ok: true, seed: req.seed, snapshots, reusedQuestionIds: reused.map((q) => q.id) };
}

export function snapshotQuestion(
  q: Question,
  index: number,
  roundId: string,
  rnd: () => number,
): QuestionSnapshot {
  const shuffled = shuffleInPlace([...q.options], rnd);
  const options = shuffled.map((o, i) => ({ id: OPTION_IDS[i] as OptionId, text: o.text, originalOptionId: o.id }));
  const correct = options.find((o) => o.originalOptionId === q.correctOptionId);
  if (!correct) throw new Error(`Câu hỏi ${q.id}: không ánh xạ được đáp án đúng`);
  return {
    questionInstanceId: `${roundId}:q${String(index + 1).padStart(2, '0')}`,
    questionId: q.id,
    questionVersion: q.version,
    index,
    prompt: q.prompt,
    options,
    correctOptionId: correct.id,
    explanation: q.explanation,
    difficulty: q.difficulty,
    subtopicId: q.subtopicId,
    isDemo: q.verificationStatus === 'DEMO',
  };
}
