import type { LeaderboardEntry, OptionId, Podium, PodiumSlot } from '@quiz/contracts';

export const SCORE_RULES = {
  correct: 100,
  streakMilestones: [
    { streak: 3, bonus: 30 },
    { streak: 5, bonus: 50 },
    { streak: 10, bonus: 100 },
  ],
} as const;

export type ScoreReason = 'CORRECT' | 'STREAK_3' | 'STREAK_5' | 'STREAK_10';

export type RoundQuestionInput = {
  questionInstanceId: string;
  index: number;
  correctOptionId: OptionId;
  /** Câu đã chốt (đã qua ACCEPTING). Câu chưa chốt không được chấm. */
  closed: boolean;
  voided: boolean;
};

export type AnswerInput = { questionInstanceId: string; playerId: string; option: OptionId };

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
 *  - mốc chuỗi đúng 3/5/10 cộng thưởng MỘT LẦN ngay tại câu đạt mốc;
 *  - sai hoặc bỏ lỡ câu (sau khi đã tham gia) → chuỗi về 0;
 *  - người vào giữa vòng bắt đầu từ 0, không bị tính các câu trước khi tham gia;
 *  - câu bị void không cho điểm và không ảnh hưởng chuỗi.
 */
export function computeRoundScores(
  questions: RoundQuestionInput[],
  answers: AnswerInput[],
): { ledger: LedgerEntry[]; totals: Map<string, PlayerTotals> } {
  const byQuestion = new Map<string, Map<string, OptionId>>();
  for (const a of answers) {
    let m = byQuestion.get(a.questionInstanceId);
    if (!m) byQuestion.set(a.questionInstanceId, (m = new Map()));
    // câu trả lời đầu tiên thắng — DB đã đảm bảo UNIQUE, ở đây phòng thủ thêm
    if (!m.has(a.playerId)) m.set(a.playerId, a.option);
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
      if (option !== undefined && option === q.correctOptionId) {
        t.streak += 1;
        t.correctCount += 1;
        t.score += SCORE_RULES.correct;
        ledger.push({
          questionInstanceId: q.questionInstanceId,
          playerId: t.playerId,
          reason: 'CORRECT',
          points: SCORE_RULES.correct,
        });
        const m = SCORE_RULES.streakMilestones.find((x) => x.streak === t.streak);
        if (m) {
          t.score += m.bonus;
          ledger.push({
            questionInstanceId: q.questionInstanceId,
            playerId: t.playerId,
            reason: `STREAK_${m.streak}` as ScoreReason,
            points: m.bonus,
          });
        }
      } else {
        // sai hoặc bỏ lỡ
        t.streak = 0;
      }
    }
  }
  return { ledger, totals };
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
  const out: LeaderboardEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    const prev = out[i - 1];
    const same = prev !== undefined && prev.score === p.score && prev.correctCount === p.correctCount;
    out.push({
      rank: same ? prev.rank : i + 1,
      tied: false,
      playerId: p.playerId,
      displayName: p.displayName,
      score: p.score,
      correctCount: p.correctCount,
    });
  }
  const rankCounts = new Map<number, number>();
  for (const e of out) rankCounts.set(e.rank, (rankCounts.get(e.rank) ?? 0) + 1);
  for (const e of out) e.tied = (rankCounts.get(e.rank) ?? 0) > 1;
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
