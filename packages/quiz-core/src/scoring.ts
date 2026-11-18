import type { LeaderboardEntry, OptionId, Podium, PodiumSlot } from '@quiz/contracts';
import { effectiveElapsedMs, MIN_DISPLAY_MS } from './stream-delay';

export const SCORE_RULES = {
  correct: 100,
  streakMilestones: [
    { streak: 3, bonus: 30 },
    { streak: 5, bonus: 50 },
    { streak: 10, bonus: 100 },
  ],
} as const;

export type ScoreReason = 'CORRECT' | 'SPEED' | 'STREAK' | 'STREAK_3' | 'STREAK_5' | 'STREAK_10';

/**
 * Chế độ tính điểm.
 * - KAHOOT (mặc định từ 11/11, người dùng chốt): câu đúng = round(1000 × (1 − (t/T)/2)) → 500…1000;
 *   ghi sổ thành CORRECT 500 + SPEED 0…500. Chuỗi đúng liên tiếp: từ câu thứ 2 cộng +100 × (chuỗi − 1), tối đa +500 (dòng STREAK).
 * - CLASSIC (bản cũ): +100, thưởng tốc độ tuỳ chọn (speedBonusMax), mốc chuỗi 3/5/10 → +30/+50/+100.
 */
export type ScoringMode = 'KAHOOT' | 'CLASSIC';
export const KAHOOT_RULES = { maxPoints: 1000, streakStep: 100, streakMax: 500 } as const;

/** Điểm Kahoot cho một câu đúng (số học nguyên, làm tròn như Kahoot). Không biết thời gian → coi như hết giờ (500). */
export function kahootPoints(elapsedMs: number | null, windowMs: number, max: number = KAHOOT_RULES.maxPoints): number {
  if (!(windowMs > 0) || elapsedMs === null || !Number.isFinite(elapsedMs)) return max / 2;
  const e = Math.min(windowMs, Math.max(0, Math.round(elapsedMs)));
  return Math.round((max * (2 * windowMs - e)) / (2 * windowMs));
}

export function kahootStreakBonus(streak: number): number {
  return Math.min(KAHOOT_RULES.streakMax, KAHOOT_RULES.streakStep * Math.max(0, streak - 1));
}

/**
 * Thưởng tốc độ (người dùng chốt 11/11): chỉ cho câu ĐÚNG, giảm tuyến tính từ `max` (trả lời ngay khi mở)
 * về 0 (hết giờ), tính theo thời điểm SERVER nhận đáp án. Làm tròn xuống số nguyên.
 */
export function speedBonus(elapsedMs: number, windowMs: number, max: number): number {
  if (!(max > 0) || !(windowMs > 0) || !Number.isFinite(elapsedMs)) return 0;
  // số học nguyên (tránh sai số dấu phẩy động: 1 − 0,9 = 0,0999…)
  const remain = Math.min(windowMs, Math.max(0, windowMs - Math.round(elapsedMs)));
  return Math.floor((max * remain) / windowMs);
}

export type RoundQuestionInput = {
  questionInstanceId: string;
  index: number;
  correctOptionId: OptionId;
  /** Câu đã chốt (đã qua ACCEPTING). Câu chưa chốt không được chấm. */
  closed: boolean;
  voided: boolean;
  /** Thời điểm mở nhận đáp án (server) — cần cho thưởng tốc độ. */
  openedAtMs?: number | null;
  /** Độ dài cửa sổ nhận đáp án (ms). */
  windowMs?: number;
  /** Độ trễ đã chốt lúc mở câu; null/undefined giữ nguyên luật cũ cho dữ liệu lịch sử. */
  streamDelayMs?: number | null;
};

export type AnswerInput = { questionInstanceId: string; playerId: string; option: OptionId; receivedAtMs?: number };

export type ScoringOptions = {
  /** Mặc định CLASSIC ở mức hàm thuần (giữ tương thích); phiên mới mặc định KAHOOT (SessionConfig.scoringMode). */
  mode?: ScoringMode;
  /** CLASSIC: thưởng tốc độ tối đa cho một câu đúng (0 = tắt). */
  speedBonusMax?: number;
};

export type LedgerEntry = {
  questionInstanceId: string;
  playerId: string;
  reason: ScoreReason;
  points: number;
};

export type PlayerTotals = { playerId: string; score: number; correctCount: number; streak: number };

/**
 * Tính lại TOÀN BỘ điểm của một vòng từ dữ liệu gốc (câu hỏi + câu trả lời đã chấp nhận).
 * Hàm thuần, tất định → gọi lại bao nhiêu lần cũng cho cùng kết quả (idempotent).
 *
 * Luật:
 *  - đúng +100; sai/không trả lời +0;
 *  - thưởng tốc độ (tuỳ chọn) cho câu đúng: tối đa speedBonusMax, giảm tuyến tính theo thời gian server nhận;
 *  - mốc chuỗi đúng 3/5/10 cộng thưởng MỘT LẦN ngay tại câu đạt mốc;
 *  - sai hoặc bỏ lỡ câu (sau khi đã tham gia) → chuỗi về 0;
 *  - người vào giữa vòng bắt đầu từ 0, không bị tính các câu trước khi tham gia;
 *  - câu bị void không cho điểm và không ảnh hưởng chuỗi.
 */
export function computeRoundScores(
  questions: RoundQuestionInput[],
  answers: AnswerInput[],
  opts: ScoringOptions = {},
): { ledger: LedgerEntry[]; totals: Map<string, PlayerTotals> } {
  const byQuestion = new Map<string, Map<string, OptionId>>();
  const receivedAt = new Map<string, number>();
  for (const a of answers) {
    let m = byQuestion.get(a.questionInstanceId);
    if (!m) byQuestion.set(a.questionInstanceId, (m = new Map()));
    // câu trả lời đầu tiên thắng — DB đã đảm bảo UNIQUE, ở đây phòng thủ thêm
    if (!m.has(a.playerId)) {
      m.set(a.playerId, a.option);
      if (a.receivedAtMs !== undefined) receivedAt.set(`${a.questionInstanceId}\u0000${a.playerId}`, a.receivedAtMs);
    }
  }
  const ordered = [...questions].sort((x, y) => x.index - y.index);
  const totals = new Map<string, PlayerTotals>();
  const ledger: LedgerEntry[] = [];

  for (const q of ordered) {
    const qa = byQuestion.get(q.questionInstanceId) ?? new Map<string, OptionId>();
    // Người chơi "tham gia" vòng tại câu trả lời được chấp nhận đầu tiên (kể cả câu sau đó bị void).
    for (const playerId of qa.keys())
      if (!totals.has(playerId)) totals.set(playerId, { playerId, score: 0, correctCount: 0, streak: 0 });

    if (!q.closed || q.voided) continue;

    for (const t of totals.values()) {
      const option = qa.get(t.playerId);
      const at = receivedAt.get(`${q.questionInstanceId}\u0000${t.playerId}`);
      appendQuestionScore(t, q, option, at, opts, ledger);
    }
  }
  return { ledger, totals };
}

/** Chấm một câu đã đóng từ tổng vòng trước và đáp án câu hiện tại. */
export function computeQuestionScoreDelta(
  question: RoundQuestionInput,
  previousTotals: Iterable<PlayerTotals>,
  answers: AnswerInput[],
  opts: ScoringOptions = {},
): { ledger: LedgerEntry[]; totals: Map<string, PlayerTotals> } {
  const totals = new Map<string, PlayerTotals>();
  for (const total of previousTotals) totals.set(total.playerId, { ...total });

  const answersByPlayer = new Map<string, AnswerInput>();
  for (const answer of answers) {
    if (answer.questionInstanceId === question.questionInstanceId && !answersByPlayer.has(answer.playerId))
      answersByPlayer.set(answer.playerId, answer);
  }
  for (const playerId of answersByPlayer.keys()) {
    if (!totals.has(playerId)) totals.set(playerId, { playerId, score: 0, correctCount: 0, streak: 0 });
  }

  const ledger: LedgerEntry[] = [];
  if (!question.closed || question.voided) return { ledger, totals };
  for (const total of totals.values()) {
    const answer = answersByPlayer.get(total.playerId);
    appendQuestionScore(total, question, answer?.option, answer?.receivedAtMs, opts, ledger);
  }
  return { ledger, totals };
}

/**
 * Đường chấm nhanh khi kho đã lọc sẵn đáp án đúng và kèm tổng điểm hiện tại.
 * Không dựng hai Map trung gian như hàm tổng quát; giữ nguyên quy tắc tạo sổ cái.
 */
export function computeQuestionScoreDeltaFromCorrectRows(
  question: RoundQuestionInput,
  rows: Array<AnswerInput & PlayerTotals>,
  opts: ScoringOptions = {},
): { ledger: LedgerEntry[]; totals: PlayerTotals[] } {
  const ledger: LedgerEntry[] = [];
  const totals: PlayerTotals[] = [];
  if (!question.closed || question.voided) return { ledger, totals };

  for (const row of rows) {
    if (row.questionInstanceId !== question.questionInstanceId || row.option !== question.correctOptionId) continue;
    const total = {
      playerId: row.playerId,
      score: row.score,
      correctCount: row.correctCount,
      streak: row.streak,
    };
    appendQuestionScore(total, question, row.option, row.receivedAtMs, opts, ledger);
    totals.push(total);
  }
  return { ledger, totals };
}

function appendQuestionScore(
  total: PlayerTotals,
  question: RoundQuestionInput,
  option: OptionId | undefined,
  receivedAtMs: number | undefined,
  opts: ScoringOptions,
  ledger: LedgerEntry[],
) {
  if (option === undefined || option !== question.correctOptionId) {
    // Sai hoặc bỏ lỡ câu đã chốt sẽ ngắt chuỗi.
    total.streak = 0;
    return;
  }

  total.streak += 1;
  total.correctCount += 1;
  if (opts.mode === 'KAHOOT') {
    const elapsed = question.openedAtMs != null && receivedAtMs !== undefined
      ? question.streamDelayMs == null
        ? receivedAtMs - question.openedAtMs
        : effectiveElapsedMs(receivedAtMs - question.openedAtMs, question.streamDelayMs)
      : null;
    const points = question.streamDelayMs != null && elapsed !== null && elapsed <= MIN_DISPLAY_MS
      ? KAHOOT_RULES.maxPoints
      : kahootPoints(elapsed, question.windowMs ?? 0);
    const base = KAHOOT_RULES.maxPoints / 2;
    total.score += points;
    ledger.push({ questionInstanceId: question.questionInstanceId, playerId: total.playerId, reason: 'CORRECT', points: base });
    if (points > base)
      ledger.push({ questionInstanceId: question.questionInstanceId, playerId: total.playerId, reason: 'SPEED', points: points - base });
    const bonus = kahootStreakBonus(total.streak);
    if (bonus > 0) {
      total.score += bonus;
      ledger.push({ questionInstanceId: question.questionInstanceId, playerId: total.playerId, reason: 'STREAK', points: bonus });
    }
    return;
  }

  total.score += SCORE_RULES.correct;
  ledger.push({
    questionInstanceId: question.questionInstanceId,
    playerId: total.playerId,
    reason: 'CORRECT',
    points: SCORE_RULES.correct,
  });
  if ((opts.speedBonusMax ?? 0) > 0 && question.openedAtMs != null && question.windowMs && receivedAtMs !== undefined) {
    const elapsed = question.streamDelayMs == null
      ? receivedAtMs - question.openedAtMs
      : effectiveElapsedMs(receivedAtMs - question.openedAtMs, question.streamDelayMs);
    const bonus = question.streamDelayMs != null && elapsed <= MIN_DISPLAY_MS
      ? opts.speedBonusMax!
      : speedBonus(elapsed, question.windowMs, opts.speedBonusMax!);
    if (bonus > 0) {
      total.score += bonus;
      ledger.push({ questionInstanceId: question.questionInstanceId, playerId: total.playerId, reason: 'SPEED', points: bonus });
    }
  }
  const milestone = SCORE_RULES.streakMilestones.find((entry) => entry.streak === total.streak);
  if (milestone) {
    total.score += milestone.bonus;
    ledger.push({
      questionInstanceId: question.questionInstanceId,
      playerId: total.playerId,
      reason: `STREAK_${milestone.streak}` as ScoreReason,
      points: milestone.bonus,
    });
  }
}

export type RankInput = { playerId: string; displayName: string; score: number; correctCount: number };

/**
 * Xếp hạng: điểm giảm dần → số câu đúng giảm dần → HOÀ TUYỆT ĐỐI DÙNG CHUNG HẠNG (1,1,3…).
 * Thứ tự hiển thị trong nhóm hoà: theo playerId ổn định (không phá vỡ tính bằng hạng).
 */
export function rankPlayers(players: RankInput[]): LeaderboardEntry[] {
  const sorted = [...players].sort(
    (a, b) =>
      b.score - a.score ||
      b.correctCount - a.correctCount ||
      (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0),
  );
  return rankSortedPlayers(sorted);
}

/** Gán hạng cho danh sách đã sắp theo cùng thứ tự với `rankPlayers`. */
export function rankSortedPlayers(sorted: readonly RankInput[]): LeaderboardEntry[] {
  const out: LeaderboardEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    const prev = out[i - 1];
    const same = prev !== undefined && prev.score === p.score && prev.correctCount === p.correctCount;
    const next = sorted[i + 1];
    const tied = same || (next !== undefined && next.score === p.score && next.correctCount === p.correctCount);
    out.push({
      rank: same ? prev.rank : i + 1,
      tied,
      playerId: p.playerId,
      displayName: p.displayName,
      score: p.score,
      correctCount: p.correctCount,
    });
  }
  return out;
}

/** Top N — không bao giờ bịa thêm người chơi; không cắt đôi dữ liệu hạng (hạng vẫn là hạng thật). */
export function topN(ranked: LeaderboardEntry[], n: number): LeaderboardEntry[] {
  return ranked.slice(0, n);
}

/**
 * Bục vinh danh Top 3 có xử lý hoà.
 * Mỗi slot là một NHÓM đồng hạng. Nếu nhóm đồng hạng vắt qua ngưỡng 3 người
 * (ví dụ hạng 3 có 2 người, hoặc hạng 1 có 4 người) → tieAcrossCutoff = true để UI hiển thị "ĐỒNG HẠNG"
 * thay vì gán sai các hạng khác nhau.
 */
export function buildPodium(ranked: LeaderboardEntry[]): Podium {
  const slots: PodiumSlot[] = [];
  let taken = 0;
  let i = 0;
  while (i < ranked.length && taken < 3) {
    const rank = ranked[i]!.rank;
    const group: LeaderboardEntry[] = [];
    while (i < ranked.length && ranked[i]!.rank === rank) group.push(ranked[i++]!);
    slots.push({ place: (slots.length + 1) as 1 | 2 | 3, rank, tied: group.length > 1, entries: group });
    taken += group.length;
  }
  return { slots, tieAcrossCutoff: taken > 3 };
}

/**
 * Chuỗi đứng Top 1 liên tiếp (người dùng yêu cầu 11/11: huy hiệu vàng x2, x3…).
 * `history` = bảng xếp hạng sau từng câu theo thứ tự thời gian (câu bị huỷ sau công bố: dùng bảng tính lại — bản sau cùng của câu đó).
 * Kết quả: với người ĐANG hạng 1 ở bảng mới nhất → số lần liên tiếp gần nhất đứng hạng 1 (đồng hạng 1 cũng tính). Người khác không có mặt.
 */
export function top1Streaks(history: { questionInstanceId: string | null; entries: { playerId: string; rank: number }[] }[]): Map<string, number> {
  const lastPerQuestion = new Map<string, { playerId: string; rank: number }[]>();
  for (const h of history) if (h.questionInstanceId) lastPerQuestion.set(h.questionInstanceId, h.entries);
  const boards = [...lastPerQuestion.values()].map((e) => new Set(e.filter((x) => x.rank === 1).map((x) => x.playerId)));
  const out = new Map<string, number>();
  const latest = boards.at(-1);
  if (!latest) return out;
  for (const pid of latest) {
    let n = 0;
    for (let i = boards.length - 1; i >= 0 && boards[i]!.has(pid); i--) n++;
    out.set(pid, n);
  }
  return out;
}
