import type Database from 'better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';

export function openSessionAnalyticsDb(path: string) {
  return new BetterSqlite3(path, { readonly: true, fileMustExist: true });
}

export type SessionAnalytics = {
  roundId: string;
  sessionId: string;
  roundNumber: number;
  questionCount: number;
  participantCount: number;
  answeredAtLeast: { one: number; five: number; allFifteen: number };
  questionDropOff: {
    position: number;
    questionInstanceId: string;
    eligibleBefore: number;
    answered: number;
    retainedFromPrevious: number;
    droppedFromPrevious: number;
    newThisQuestion: number;
  }[];
  returning: { acrossRounds: number; acrossSessions: number };
};

type Round = { id: string; sessionId: string; roundNumber: number; questionCount: number };
type Question = { id: string; position: number; openedAtMs: number | null };

function resolveRound(db: Database.Database, selection: string): Round | undefined {
  const query = selection.toLowerCase() === 'latest'
    ? `SELECT id, session_id AS sessionId, round_number AS roundNumber, question_count AS questionCount
       FROM rounds ORDER BY COALESCE(ended_at_ms, started_at_ms, created_at_ms) DESC, created_at_ms DESC LIMIT 1`
    : `SELECT id, session_id AS sessionId, round_number AS roundNumber, question_count AS questionCount
       FROM rounds WHERE id = ?`;
  return (selection.toLowerCase() === 'latest' ? db.prepare(query).get() : db.prepare(query).get(selection)) as Round | undefined;
}

/** Builds cohort metrics from player/question membership. This never treats raw answer totals as retention. */
export function buildSessionAnalytics(db: Database.Database, selection: string): SessionAnalytics {
  const round = resolveRound(db, selection);
  if (!round) throw new Error(selection.toLowerCase() === 'latest' ? 'Chưa có vòng nào trong DB.' : `Không tìm thấy roundId: ${selection}`);

  const participants = (db.prepare('SELECT player_id AS playerId, joined_at_ms AS joinedAtMs FROM round_players WHERE round_id = ?').all(round.id) as { playerId: string; joinedAtMs: number }[]);
  const answers = db.prepare('SELECT player_id AS playerId, question_instance_id AS questionId FROM answers WHERE round_id = ?').all(round.id) as { playerId: string; questionId: string }[];
  const questions = db.prepare('SELECT id, position, opened_at_ms AS openedAtMs FROM round_questions WHERE round_id = ? ORDER BY position').all(round.id) as Question[];
  const participantIds = new Set(participants.map(({ playerId }) => playerId));
  const byPlayer = new Map<string, Set<string>>();
  const byQuestion = new Map<string, Set<string>>();
  for (const answer of answers) {
    if (!participantIds.has(answer.playerId)) continue;
    let playerQuestions = byPlayer.get(answer.playerId);
    if (!playerQuestions) byPlayer.set(answer.playerId, playerQuestions = new Set());
    playerQuestions.add(answer.questionId);
    let questionPlayers = byQuestion.get(answer.questionId);
    if (!questionPlayers) byQuestion.set(answer.questionId, questionPlayers = new Set());
    questionPlayers.add(answer.playerId);
  }
  const participantCount = participants.length;
  const answeredAtLeast = { one: 0, five: 0, allFifteen: 0 };
  for (const participant of participants) {
    const count = byPlayer.get(participant.playerId)?.size ?? 0;
    if (count >= 1) answeredAtLeast.one += 1;
    if (count >= 5) answeredAtLeast.five += 1;
    if (round.questionCount === 15 && count >= 15) answeredAtLeast.allFifteen += 1;
  }

  let previous = new Set<string>();
  const questionDropOff = questions.map((question, index) => {
    const answered = byQuestion.get(question.id) ?? new Set<string>();
    const eligibleAtQuestion = new Set(participants
      .filter(({ joinedAtMs }) => question.openedAtMs === null || joinedAtMs <= question.openedAtMs)
      .map(({ playerId }) => playerId));
    const eligibleBefore = index === 0
      ? eligibleAtQuestion.size
      : previous.size;
    let retainedFromPrevious = 0;
    for (const playerId of answered) if (previous.has(playerId)) retainedFromPrevious += 1;
    const droppedFromPrevious = index === 0
      ? Math.max(0, eligibleBefore - answered.size)
      : Math.max(0, previous.size - retainedFromPrevious);
    const newThisQuestion = index === 0
      ? [...answered].filter((playerId) => !eligibleAtQuestion.has(playerId)).length
      : [...answered].filter((playerId) => !previous.has(playerId)).length;
    const result = {
      position: question.position + 1,
      questionInstanceId: question.id,
      eligibleBefore,
      answered: answered.size,
      retainedFromPrevious,
      droppedFromPrevious,
      newThisQuestion,
    };
    previous = answered;
    return result;
  });

  const returning = db.prepare(`
    WITH cohort AS (SELECT player_id FROM round_players WHERE round_id = ?)
    SELECT
      (SELECT COUNT(*) FROM cohort c WHERE (SELECT COUNT(DISTINCT rp.round_id) FROM round_players rp WHERE rp.player_id = c.player_id) > 1) AS acrossRounds,
      (SELECT COUNT(*) FROM cohort c WHERE (SELECT COUNT(DISTINCT r.session_id) FROM round_players rp JOIN rounds r ON r.id = rp.round_id WHERE rp.player_id = c.player_id) > 1) AS acrossSessions
  `).get(round.id) as { acrossRounds: number; acrossSessions: number };

  return {
    roundId: round.id,
    sessionId: round.sessionId,
    roundNumber: round.roundNumber,
    questionCount: round.questionCount,
    participantCount,
    answeredAtLeast,
    questionDropOff,
    returning,
  };
}

export function formatSessionAnalytics(report: SessionAnalytics): string {
  const rows = report.questionDropOff.map((row) =>
    `| ${row.position} | ${row.eligibleBefore} | ${row.answered} | ${row.retainedFromPrevious} | ${row.droppedFromPrevious} | ${row.newThisQuestion} |`,
  );
  return [
    `# Báo cáo phiên ${report.sessionId} / vòng ${report.roundNumber}`,
    '',
    `- Round ID: \`${report.roundId}\``,
    `- Số câu: ${report.questionCount}`,
    `- Người tham gia (có hàng round-player): ${report.participantCount}`,
    `- Trả lời ít nhất 1 câu: ${report.answeredAtLeast.one}`,
    `- Trả lời ít nhất 5 câu: ${report.answeredAtLeast.five}`,
    `- Trả lời đủ 15 câu: ${report.answeredAtLeast.allFifteen}`,
    `- Quay lại ở nhiều vòng: ${report.returning.acrossRounds}`,
    `- Quay lại ở nhiều phiên: ${report.returning.acrossSessions}`,
    '',
    '| Câu | Đủ điều kiện trước câu | Có trả lời | Giữ lại từ câu trước | Rơi sau câu trước | Người mới câu này |',
    '| ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
    'Số liệu rơi rụng được tính giao giữa từng tập người chơi của hai câu liên tiếp; không suy cohort từ tổng số đáp án.',
  ].join('\n');
}
