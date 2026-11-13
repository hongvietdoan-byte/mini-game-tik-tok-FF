import {
  DEFAULT_DIFFICULTY_TARGETS,
  OPTION_IDS,
  QUESTION_DISPLAY_LIMITS,
  questionLengthWarnings,
  type Difficulty,
  type DifficultyTargets,
  type OptionId,
  type Question,
  type QuestionSnapshot,
} from '@quiz/contracts';

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
export type DifficultyCounts = Record<Difficulty, number>;

export function emptyDifficultyCounts(): DifficultyCounts {
  return { EASY: 0, MEDIUM: 0, HARD: 0 };
}

export function questionDifficulty(question: Question): Difficulty {
  // Dữ liệu cũ có thể không có trường này dù hợp đồng mới luôn chuẩn hóa về MEDIUM.
  return question.difficulty ?? 'MEDIUM';
}

export function formatDifficultyCounts(counts: DifficultyCounts): string {
  return `${counts.EASY} dễ / ${counts.MEDIUM} vừa / ${counts.HARD} khó`;
}

/** Phân bổ mục tiêu theo tỷ lệ gốc 7/5/3, dùng largest-remainder để tổng luôn đúng count. */
export function scaleDifficultyTargets(
  count: number,
  targets: DifficultyTargets = DEFAULT_DIFFICULTY_TARGETS,
): DifficultyCounts {
  const total = DIFFICULTY_ORDER.reduce((sum, difficulty) => sum + targets[difficulty], 0);
  if (total <= 0) throw new Error('Tổng mục tiêu độ khó phải lớn hơn 0.');
  const exact = Object.fromEntries(DIFFICULTY_ORDER.map((difficulty) => [difficulty, count * targets[difficulty] / total])) as DifficultyCounts;
  const scaled = Object.fromEntries(DIFFICULTY_ORDER.map((difficulty) => [difficulty, Math.floor(exact[difficulty])])) as DifficultyCounts;
  let remaining = count - DIFFICULTY_ORDER.reduce((sum, difficulty) => sum + scaled[difficulty], 0);
  const byRemainder = [...DIFFICULTY_ORDER].sort((a, b) =>
    exact[b] - scaled[b] - (exact[a] - scaled[a]) || DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b),
  );
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
    const difficulty = byRemainder[index % byRemainder.length]!;
    scaled[difficulty] += 1;
  }
  return scaled;
}

/** Dự kiến phân bố theo tồn kho; khi thiếu mức sẽ bù mức gần nhất, trước trong biên cho phép. */
export function planDifficultyCounts(
  pool: readonly Question[],
  count: number,
  targets: DifficultyTargets = DEFAULT_DIFFICULTY_TARGETS,
  tolerance = 2,
): { counts: DifficultyCounts; targetCounts: DifficultyCounts; availableCounts: DifficultyCounts } {
  const targetCounts = scaleDifficultyTargets(count, targets);
  const availableCounts = emptyDifficultyCounts();
  for (const question of pool) availableCounts[questionDifficulty(question)] += 1;

  const counts = emptyDifficultyCounts();
  for (const difficulty of DIFFICULTY_ORDER) {
    counts[difficulty] = Math.min(targetCounts[difficulty], availableCounts[difficulty]);
  }

  const distanceOrder = (origin: Difficulty) =>
    DIFFICULTY_ORDER.filter((difficulty) => difficulty !== origin).sort((a, b) =>
      Math.abs(DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(origin)) -
        Math.abs(DIFFICULTY_ORDER.indexOf(b) - DIFFICULTY_ORDER.indexOf(origin)) ||
      DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b),
    );

  // Bù thiếu theo mức gần nhất trong khoảng target ± tolerance trước.
  for (const origin of DIFFICULTY_ORDER) {
    let deficit = targetCounts[origin] - counts[origin];
    if (deficit <= 0) continue;
    for (const destination of distanceOrder(origin)) {
      const room = Math.max(0, targetCounts[destination] + tolerance - counts[destination]);
      const moved = Math.min(deficit, availableCounts[destination] - counts[destination], room);
      counts[destination] += moved;
      deficit -= moved;
      if (deficit === 0) break;
    }
    // Nếu kho tổng còn đủ nhưng cả biên ±2 đã kín, vẫn bù mức gần nhất; thiếu độ khó không chặn vòng.
    for (const destination of distanceOrder(origin)) {
      const moved = Math.min(deficit, availableCounts[destination] - counts[destination]);
      counts[destination] += moved;
      deficit -= moved;
      if (deficit === 0) break;
    }
  }
  return { counts, targetCounts, availableCounts };
}

function isQuestionDisplayable(question: Pick<Question, 'prompt' | 'options'>): boolean {
  return questionLengthWarnings(question, QUESTION_DISPLAY_LIMITS).length === 0;
}

/** Preview chỉ tính các câu có thể hiển thị trong giới hạn overlay. */
export function planPreferredDifficultyCounts(
  pool: readonly Question[],
  count: number,
  targets: DifficultyTargets = DEFAULT_DIFFICULTY_TARGETS,
  tolerance = 2,
): { counts: DifficultyCounts; targetCounts: DifficultyCounts; availableCounts: DifficultyCounts } {
  const selectablePool = pool.filter(isQuestionDisplayable);
  const plannedCount = Math.min(count, selectablePool.length);
  const plan = planDifficultyCounts(selectablePool, plannedCount, targets, tolerance);
  const availableCounts = emptyDifficultyCounts();
  for (const question of selectablePool) availableCounts[questionDifficulty(question)] += 1;
  return { counts: plan.counts, targetCounts: scaleDifficultyTargets(count, targets), availableCounts };
}

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
  /** Mặc định RANDOM để các phiên cũ giữ nguyên hành vi. */
  selectionMode?: 'RANDOM' | 'DIFFICULTY';
  difficultyTargets?: DifficultyTargets;
  difficultyTolerance?: number;
  onDistribution?: (distribution: { counts: DifficultyCounts; targetCounts: DifficultyCounts; tolerance: number }) => void;
};

export type SelectionResult =
  | {
      ok: true;
      seed: number;
      snapshots: QuestionSnapshot[];
      reusedQuestionIds: string[];
      difficultyCounts: DifficultyCounts;
      targetDifficultyCounts?: DifficultyCounts;
    }
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
    .filter(isQuestionDisplayable)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const unused = eligible.filter((q) => !req.usedInSession.has(q.id));

  let chosen: Question[];
  let reused: Question[] = [];

  if (req.selectionMode === 'DIFFICULTY') {
    const usedByRecency = eligible
      .filter((question) => req.usedInSession.has(question.id))
      .sort((a, b) => (a.lastUsedAt ?? 0) - (b.lastUsedAt ?? 0) || (a.id < b.id ? -1 : 1));
    if (unused.length < req.count && (!req.allowReuse || unused.length + usedByRecency.length < req.count)) {
      return {
        ok: false,
        code: 'INSUFFICIENT_QUESTIONS',
        eligible: eligible.length,
        unused: unused.length,
        required: req.count,
      };
    }

    const tolerance = req.difficultyTolerance ?? 2;
    const targets = req.difficultyTargets ?? DEFAULT_DIFFICULTY_TARGETS;
    let targetDifficultyCounts: DifficultyCounts;
    if (unused.length >= req.count) {
      targetDifficultyCounts = scaleDifficultyTargets(req.count, targets);
      const plan = planDifficultyCounts(unused, req.count, targets, tolerance);
      chosen = pickByDifficulty(unused, plan.counts, rnd);
    } else {
      // Nếu bật reuse do operator yêu cầu, giữ mọi câu chưa dùng rồi chỉ bù phần thiếu từ câu đã dùng.
      const reuseCount = req.count - unused.length;
      const reusePlan = planDifficultyCounts(usedByRecency, reuseCount, targets, tolerance);
      targetDifficultyCounts = scaleDifficultyTargets(req.count, targets);
      chosen = [];
      for (const difficulty of DIFFICULTY_ORDER) {
        const unusedInDifficulty = shuffleInPlace(
          unused.filter((question) => questionDifficulty(question) === difficulty), rnd,
        );
        const reusedInDifficulty = shuffleInPlace(
          usedByRecency.filter((question) => questionDifficulty(question) === difficulty), rnd,
        ).slice(0, reusePlan.counts[difficulty]);
        chosen.push(...unusedInDifficulty, ...reusedInDifficulty);
      }
      reused = chosen.filter((question) => req.usedInSession.has(question.id));
    }

    if (chosen.length < req.count) {
      // Khi total stock đủ, planner luôn lấp đủ; nhánh này chỉ bảo vệ dữ liệu ngoài hợp đồng.
      return {
        ok: false,
        code: 'INSUFFICIENT_QUESTIONS',
        eligible: eligible.length,
        unused: unused.length,
        required: req.count,
      };
    }
    const difficultyCounts = emptyDifficultyCounts();
    for (const question of chosen) difficultyCounts[questionDifficulty(question)] += 1;
    req.onDistribution?.({ counts: difficultyCounts, targetCounts: targetDifficultyCounts, tolerance });
    const snapshots = chosen.map((q, index) => snapshotQuestion(q, index, req.roundId, rnd));
    return {
      ok: true,
      seed: req.seed,
      snapshots,
      reusedQuestionIds: reused.map((q) => q.id),
      difficultyCounts,
      targetDifficultyCounts,
    };
  }

  if (unused.length >= req.count) {
    chosen = shuffleInPlace([...unused], rnd).slice(0, req.count);
  } else if (req.allowReuse && eligible.length >= req.count) {
    const compareReuse = (a: Question, b: Question) =>
      (a.lastUsedAt ?? 0) - (b.lastUsedAt ?? 0) || (a.id < b.id ? -1 : 1);
    const used = eligible.filter((q) => req.usedInSession.has(q.id));
    // Chỉ câu trong giới hạn hiển thị mới được dùng lại.
    reused = used.sort(compareReuse).slice(0, req.count - unused.length);
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

  const difficultyCounts = emptyDifficultyCounts();
  for (const question of chosen) difficultyCounts[questionDifficulty(question)] += 1;
  const snapshots = chosen.map((q, index) => snapshotQuestion(q, index, req.roundId, rnd));
  return { ok: true, seed: req.seed, snapshots, reusedQuestionIds: reused.map((q) => q.id), difficultyCounts };
}

function pickByDifficulty(
  pool: readonly Question[],
  counts: DifficultyCounts,
  rnd: () => number,
): Question[] {
  const chosen: Question[] = [];
  for (const difficulty of DIFFICULTY_ORDER) {
    const category = pool.filter((question) => questionDifficulty(question) === difficulty);
    chosen.push(...shuffleInPlace(category, rnd).slice(0, counts[difficulty]));
  }
  return chosen;
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
    difficulty: questionDifficulty(q),
    subtopicId: q.subtopicId,
    isDemo: q.verificationStatus === 'DEMO',
  };
}
