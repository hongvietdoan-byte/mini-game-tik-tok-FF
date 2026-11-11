import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import {
  QuestionSchema,
  type LeaderboardEntry,
  type OptionId,
  type Question,
  type QuestionSnapshot,
  type SessionConfig,
} from '@quiz/contracts';
import type { EngineState, LedgerEntry, PlayerTotals } from '@quiz/quiz-core';
import * as schema from './schema';

export { schema };

/** Bản đóng gói (Electron) đặt QUIZ_MIGRATIONS_DIR vì không còn đường dẫn source. Đọc lúc mở Store, không lúc nạp module. */
const migrationsDir = () =>
  process.env.QUIZ_MIGRATIONS_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export type SessionRow = {
  id: string;
  name: string;
  mode: string;
  packId: string;
  status: 'OPEN' | 'CLOSED';
  config: SessionConfig;
  stateVersion: number;
  lastHeartbeatMs: number | null;
  createdAtMs: number;
  closedAtMs: number | null;
};

export type RoundQuestionRow = {
  id: string;
  roundId: string;
  position: number;
  snapshot: QuestionSnapshot;
  status: 'PENDING' | 'OPEN' | 'CLOSED' | 'VOIDED';
  voidedAfterReveal: boolean;
};

export type StoredAnswer = { questionInstanceId: string; playerId: string; option: OptionId };

function prepareStatements(r: Database.Database) {
  return {
    playerGet: r.prepare('SELECT id FROM players WHERE source = ? AND source_user_id = ?'),
    playerInsert: r.prepare(
      'INSERT INTO players (id, source, source_user_id, display_name, first_seen_at_ms, last_seen_at_ms) VALUES (?, ?, ?, ?, ?, ?)',
    ),
    playerTouch: r.prepare('UPDATE players SET display_name = ?, last_seen_at_ms = ? WHERE id = ?'),
    answerInsert: r.prepare(
      `INSERT INTO answers (question_instance_id, round_id, player_id, option_id, received_at_ms, source_event_id)
       VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (question_instance_id, player_id) DO NOTHING`,
    ),
    roundPlayerJoin: r.prepare(
      `INSERT INTO round_players (round_id, player_id, joined_at_ms) VALUES (?, ?, ?)
       ON CONFLICT (round_id, player_id) DO NOTHING`,
    ),
    ledgerInsert: r.prepare(
      `INSERT INTO score_events (round_id, question_instance_id, player_id, score_reason, points, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (round_id, question_instance_id, player_id, score_reason) DO NOTHING`,
    ),
    roundPlayerUpsert: r.prepare(
      `INSERT INTO round_players (round_id, player_id, score, correct_count, streak, joined_at_ms)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (round_id, player_id) DO UPDATE SET score = excluded.score,
         correct_count = excluded.correct_count, streak = excluded.streak`,
    ),
    heartbeat: r.prepare('UPDATE live_sessions SET last_heartbeat_ms = ? WHERE id = ?'),
    eventMark: r.prepare(
      `INSERT INTO processed_events (source, event_id, question_instance_id, received_at_ms) VALUES (?, ?, ?, ?)
       ON CONFLICT (source, event_id) DO NOTHING`,
    ),
  };
}

/**
 * Kho lưu trữ đồng bộ trên better-sqlite3 (WAL). Mọi thay đổi trạng thái trò chơi
 * được gói trong `transaction()` bởi tầng server.
 */
export class Store {
  readonly raw: Database.Database;
  readonly db: ReturnType<typeof drizzle<typeof schema>>;
  private stmt: ReturnType<typeof prepareStatements>;

  constructor(readonly path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.raw = new Database(path);
    this.raw.pragma('journal_mode = WAL');
    this.raw.pragma('synchronous = NORMAL');
    this.raw.pragma('foreign_keys = ON');
    this.raw.pragma('busy_timeout = 5000');
    this.db = drizzle(this.raw, { schema });
    migrate(this.db, { migrationsFolder: migrationsDir() });
    this.stmt = prepareStatements(this.raw);
  }

  close() {
    if (this.raw.open) this.raw.close();
  }

  transaction<T>(fn: () => T): T {
    return this.raw.transaction(fn).immediate();
  }

  /** Sao lưu nhất quán (dùng được khi DB đang mở). */
  async backup(destPath: string) {
    mkdirSync(dirname(destPath), { recursive: true });
    await this.raw.backup(destPath);
  }

  // --- Nội dung -------------------------------------------------------------

  /** Nạp câu hỏi fixture (đã validate). Không ghi đè câu đã tồn tại. */
  seedQuestions(pack: { id: string; name: string }, list: unknown[], now: number): number {
    const parsed = list.map((q) => QuestionSchema.parse(q));
    return this.transaction(() => {
      this.raw
        .prepare(
          `INSERT INTO theme_packs (id, name, schema_version, pack_version, manifest_json) VALUES (?, ?, 1, '0.0.0', '{}')
           ON CONFLICT (id) DO NOTHING`,
        )
        .run(pack.id, pack.name);
      const sub = this.raw.prepare(
        'INSERT INTO subtopics (id, pack_id, name) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING',
      );
      const ins = this.raw.prepare(
        `INSERT INTO questions (id, pack_id, subtopic_id, prompt, options_json, correct_option_id, explanation,
           difficulty, tags_json, source_refs_json, verification_status, approval_status, version, media_json,
           valid_from_ms, valid_until_ms, updated_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
      );
      let n = 0;
      for (const q of parsed) {
        sub.run(q.subtopicId, q.packId, q.subtopicId);
        n += ins.run(
          q.id,
          q.packId,
          q.subtopicId,
          q.prompt,
          JSON.stringify(q.options),
          q.correctOptionId,
          q.explanation,
          q.difficulty,
          JSON.stringify(q.tags),
          JSON.stringify(q.sourceRefs),
          q.verificationStatus,
          q.approvalStatus,
          q.version,
          q.media ? JSON.stringify(q.media) : null,
          q.validFrom,
          q.validUntil,
          now,
        ).changes;
      }
      return n;
    });
  }

  listQuestions(packId: string): Question[] {
    const rows = this.raw.prepare('SELECT * FROM questions WHERE pack_id = ? ORDER BY id').all(packId) as any[];
    return rows.map((r) => ({
      id: r.id,
      packId: r.pack_id,
      subtopicId: r.subtopic_id,
      prompt: r.prompt,
      options: JSON.parse(r.options_json),
      correctOptionId: r.correct_option_id,
      explanation: r.explanation,
      difficulty: r.difficulty,
      tags: JSON.parse(r.tags_json),
      sourceRefs: JSON.parse(r.source_refs_json),
      verificationStatus: r.verification_status,
      approvalStatus: r.approval_status,
      version: r.version,
      media: r.media_json ? JSON.parse(r.media_json) : null,
      validFrom: r.valid_from_ms,
      validUntil: r.valid_until_ms,
      lastUsedAt: r.last_used_at_ms,
    }));
  }

  /**
   * Người dùng duyệt / từ chối một câu hỏi (tool chỉ đề xuất — BOARD #13).
   * Duyệt → APPROVED + OPERATOR_VERIFIED (được vào phiên LIVE thật). Lưu bản chụp vào question_versions để kiểm toán.
   * @returns câu hỏi sau khi cập nhật, hoặc null nếu không tồn tại.
   */
  reviewQuestion(id: string, decision: 'APPROVE' | 'REJECT', operatorId: string, now: number): Question | null {
    return this.transaction(() => {
      const r = this.raw.prepare('SELECT pack_id AS p FROM questions WHERE id = ?').get(id) as { p: string } | undefined;
      if (!r) return null;
      if (decision === 'APPROVE')
        this.raw
          .prepare("UPDATE questions SET approval_status = 'APPROVED', verification_status = 'OPERATOR_VERIFIED', updated_at_ms = ? WHERE id = ?")
          .run(now, id);
      else this.raw.prepare("UPDATE questions SET approval_status = 'REJECTED', updated_at_ms = ? WHERE id = ?").run(now, id);
      const q = this.listQuestions(r.p).find((x) => x.id === id)!;
      this.raw
        .prepare(
          `INSERT INTO question_versions (question_id, version, snapshot_json, edited_by, created_at_ms) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (question_id, version) DO UPDATE SET snapshot_json = excluded.snapshot_json, edited_by = excluded.edited_by, created_at_ms = excluded.created_at_ms`,
        )
        .run(id, q.version, JSON.stringify(q), `${decision}:${operatorId}`, now);
      return q;
    });
  }

  // --- Phiên ----------------------------------------------------------------

  createSession(s: { id: string; name: string; mode: string; packId: string; config: SessionConfig; now: number }) {
    this.raw
      .prepare(
        `INSERT INTO live_sessions (id, name, mode, pack_id, status, config_json, state_version, last_heartbeat_ms, created_at_ms)
         VALUES (?, ?, ?, ?, 'OPEN', ?, 0, ?, ?)`,
      )
      .run(s.id, s.name, s.mode, s.packId, JSON.stringify(s.config), s.now, s.now);
  }

  private mapSession(r: any): SessionRow {
    return {
      id: r.id,
      name: r.name,
      mode: r.mode,
      packId: r.pack_id,
      status: r.status,
      config: JSON.parse(r.config_json),
      stateVersion: r.state_version,
      lastHeartbeatMs: r.last_heartbeat_ms,
      createdAtMs: r.created_at_ms,
      closedAtMs: r.closed_at_ms,
    };
  }

  getSession(id: string): SessionRow | null {
    const r = this.raw.prepare('SELECT * FROM live_sessions WHERE id = ?').get(id);
    return r ? this.mapSession(r) : null;
  }

  listSessions(limit = 50): SessionRow[] {
    return (
      this.raw.prepare('SELECT * FROM live_sessions ORDER BY created_at_ms DESC LIMIT ?').all(limit) as any[]
    ).map((r) => this.mapSession(r));
  }

  latestOpenSession(): SessionRow | null {
    const r = this.raw
      .prepare("SELECT * FROM live_sessions WHERE status = 'OPEN' ORDER BY created_at_ms DESC LIMIT 1")
      .get();
    return r ? this.mapSession(r) : null;
  }

  closeSession(id: string, now: number) {
    this.raw.prepare("UPDATE live_sessions SET status = 'CLOSED', closed_at_ms = ? WHERE id = ?").run(now, id);
  }

  heartbeat(id: string, now: number) {
    this.stmt.heartbeat.run(now, id);
  }

  // --- Vòng -----------------------------------------------------------------

  createRound(r: {
    id: string;
    sessionId: string;
    roundNumber: number;
    seed: number;
    selectionMode: string;
    snapshots: QuestionSnapshot[];
    now: number;
  }) {
    this.raw
      .prepare(
        `INSERT INTO rounds (id, session_id, round_number, seed, selection_mode, question_count, status, created_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, 'PREPARED', ?)`,
      )
      .run(r.id, r.sessionId, r.roundNumber, r.seed, r.selectionMode, r.snapshots.length, r.now);
    const ins = this.raw.prepare(
      `INSERT INTO round_questions (id, round_id, question_id, question_version, position, snapshot_json, correct_option_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const used = this.raw.prepare('UPDATE questions SET last_used_at_ms = ? WHERE id = ?');
    for (const s of r.snapshots) {
      ins.run(s.questionInstanceId, r.id, s.questionId, s.questionVersion, s.index, JSON.stringify(s), s.correctOptionId);
      used.run(r.now, s.questionId);
    }
  }

  nextRoundNumber(sessionId: string): number {
    const r = this.raw
      .prepare('SELECT COALESCE(MAX(round_number), 0) AS n FROM rounds WHERE session_id = ?')
      .get(sessionId) as { n: number };
    return r.n + 1;
  }

  setRoundStatus(roundId: string, status: 'RUNNING' | 'COMPLETED' | 'ABORTED', now: number) {
    if (status === 'RUNNING')
      this.raw.prepare('UPDATE rounds SET status = ?, started_at_ms = ? WHERE id = ?').run(status, now, roundId);
    else this.raw.prepare('UPDATE rounds SET status = ?, ended_at_ms = ? WHERE id = ?').run(status, now, roundId);
  }

  usedQuestionIdsInSession(sessionId: string): Set<string> {
    const rows = this.raw
      .prepare(
        `SELECT DISTINCT rq.question_id AS id FROM round_questions rq
         JOIN rounds r ON r.id = rq.round_id WHERE r.session_id = ?`,
      )
      .all(sessionId) as { id: string }[];
    return new Set(rows.map((x) => x.id));
  }

  roundQuestions(roundId: string): RoundQuestionRow[] {
    const rows = this.raw
      .prepare('SELECT * FROM round_questions WHERE round_id = ? ORDER BY position')
      .all(roundId) as any[];
    return rows.map((r) => ({
      id: r.id,
      roundId: r.round_id,
      position: r.position,
      snapshot: JSON.parse(r.snapshot_json),
      status: r.status,
      voidedAfterReveal: !!r.voided_after_reveal,
    }));
  }

  markQuestion(id: string, status: 'OPEN' | 'CLOSED' | 'VOIDED', now: number, afterReveal = false) {
    if (status === 'OPEN')
      this.raw.prepare("UPDATE round_questions SET status = 'OPEN', opened_at_ms = ? WHERE id = ?").run(now, id);
    else if (status === 'CLOSED')
      this.raw.prepare("UPDATE round_questions SET status = 'CLOSED', closed_at_ms = ? WHERE id = ?").run(now, id);
    else
      this.raw
        .prepare("UPDATE round_questions SET status = 'VOIDED', voided_at_ms = ?, voided_after_reveal = ? WHERE id = ?")
        .run(now, afterReveal ? 1 : 0, id);
  }

  // --- Người chơi & đáp án (đường nóng) -------------------------------------

  resolvePlayer(source: string, sourceUserId: string, displayName: string, now: number): string {
    const found = this.stmt.playerGet.get(source, sourceUserId) as { id: string } | undefined;
    if (found) return found.id;
    const id = `${source}:${sourceUserId}`;
    this.stmt.playerInsert.run(id, source, sourceUserId, displayName, now, now);
    return id;
  }

  touchPlayer(id: string, displayName: string, now: number) {
    this.stmt.playerTouch.run(displayName, now, id);
  }

  /** @returns true nếu đây là đáp án ĐẦU TIÊN của người chơi cho câu này (được chấp nhận). */
  insertAnswer(a: {
    questionInstanceId: string;
    roundId: string;
    playerId: string;
    option: OptionId;
    receivedAtMs: number;
    sourceEventId: string | null;
  }): boolean {
    const res = this.stmt.answerInsert.run(
      a.questionInstanceId,
      a.roundId,
      a.playerId,
      a.option,
      Math.floor(a.receivedAtMs),
      a.sourceEventId,
    );
    if (res.changes === 1) this.stmt.roundPlayerJoin.run(a.roundId, a.playerId, Math.floor(a.receivedAtMs));
    return res.changes === 1;
  }

  /** Ghi nhận eventId của nguồn. @returns false nếu sự kiện này đã từng được xử lý (kể cả trước khi khởi động lại). */
  markEventProcessed(source: string, eventId: string, questionInstanceId: string, now: number): boolean {
    return this.stmt.eventMark.run(source, eventId, questionInstanceId, Math.floor(now)).changes === 1;
  }

  /** Dọn sự kiện cũ (mặc định giữ 7 ngày). */
  pruneProcessedEvents(beforeMs: number): number {
    return this.raw.prepare('DELETE FROM processed_events WHERE received_at_ms < ?').run(Math.floor(beforeMs)).changes;
  }

  /** Ghi rồi đọc lại một dòng settings để chứng minh DB ghi được (Connection Test bước 2). */
  probeWrite(now: number): boolean {
    const key = '__probe__';
    this.raw
      .prepare('INSERT INTO settings (key, value_json, updated_at_ms) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at_ms = excluded.updated_at_ms')
      .run(key, JSON.stringify(now), now);
    const r = this.raw.prepare('SELECT value_json AS v FROM settings WHERE key = ?').get(key) as { v: string } | undefined;
    return r?.v === JSON.stringify(now);
  }

  answersForRound(roundId: string): StoredAnswer[] {
    return this.raw
      .prepare(
        'SELECT question_instance_id AS questionInstanceId, player_id AS playerId, option_id AS option FROM answers WHERE round_id = ? ORDER BY id',
      )
      .all(roundId) as StoredAnswer[];
  }

  optionCounts(questionInstanceId: string): Record<OptionId, number> {
    const out: Record<OptionId, number> = { A: 0, B: 0, C: 0, D: 0 };
    const rows = this.raw
      .prepare('SELECT option_id AS o, COUNT(*) AS n FROM answers WHERE question_instance_id = ? GROUP BY option_id')
      .all(questionInstanceId) as { o: OptionId; n: number }[];
    for (const r of rows) out[r.o] = r.n;
    return out;
  }

  participantCount(roundId: string): number {
    return (this.raw.prepare('SELECT COUNT(*) AS n FROM round_players WHERE round_id = ?').get(roundId) as { n: number }).n;
  }

  // --- Sổ cái điểm -----------------------------------------------------------

  /** Ghi các dòng sổ cái còn thiếu (idempotent nhờ UNIQUE). @returns số dòng mới. */
  insertLedger(roundId: string, entries: LedgerEntry[], now: number): number {
    let n = 0;
    for (const e of entries)
      n += this.stmt.ledgerInsert.run(roundId, e.questionInstanceId, e.playerId, e.reason, e.points, now).changes;
    return n;
  }

  /** Bút toán đảo cho câu bị void sau reveal — không sửa/xoá dòng cũ. @returns số bút toán mới. */
  insertVoidReversals(roundId: string, questionInstanceId: string, now: number): number {
    const rows = this.raw
      .prepare(
        `SELECT player_id AS playerId, score_reason AS reason, points FROM score_events
         WHERE round_id = ? AND question_instance_id = ? AND score_reason NOT LIKE 'VOID_REVERSAL:%'`,
      )
      .all(roundId, questionInstanceId) as { playerId: string; reason: string; points: number }[];
    let n = 0;
    for (const r of rows)
      n += this.stmt.ledgerInsert.run(roundId, questionInstanceId, r.playerId, `VOID_REVERSAL:${r.reason}`, -r.points, now)
        .changes;
    return n;
  }

  ledgerTotals(roundId: string): Map<string, number> {
    const rows = this.raw
      .prepare('SELECT player_id AS p, SUM(points) AS s FROM score_events WHERE round_id = ? GROUP BY player_id')
      .all(roundId) as { p: string; s: number }[];
    return new Map(rows.map((r) => [r.p, r.s]));
  }

  ledgerRows(roundId: string) {
    return this.raw
      .prepare(
        `SELECT question_instance_id AS questionInstanceId, player_id AS playerId, score_reason AS reason, points
         FROM score_events WHERE round_id = ? ORDER BY id`,
      )
      .all(roundId) as { questionInstanceId: string; playerId: string; reason: string; points: number }[];
  }

  saveRoundPlayers(roundId: string, totals: Iterable<PlayerTotals>, now: number) {
    for (const t of totals) this.stmt.roundPlayerUpsert.run(roundId, t.playerId, t.score, t.correctCount, t.streak, now);
  }

  standings(roundId: string): { playerId: string; displayName: string; score: number; correctCount: number }[] {
    return this.raw
      .prepare(
        `SELECT rp.player_id AS playerId, p.display_name AS displayName, rp.score AS score, rp.correct_count AS correctCount
         FROM round_players rp JOIN players p ON p.id = rp.player_id WHERE rp.round_id = ?`,
      )
      .all(roundId) as any[];
  }

  saveLeaderboardSnapshot(s: {
    roundId: string;
    questionInstanceId: string | null;
    kind: 'AFTER_QUESTION' | 'AFTER_VOID' | 'FINAL';
    entries: LeaderboardEntry[];
    participantCount: number;
    now: number;
  }) {
    this.raw
      .prepare(
        `INSERT INTO leaderboard_snapshots (round_id, question_instance_id, kind, entries_json, participant_count, created_at_ms)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(s.roundId, s.questionInstanceId, s.kind, JSON.stringify(s.entries), s.participantCount, s.now);
  }

  // --- Snapshot / kiểm toán / outbox ----------------------------------------

  saveGameSnapshot(engine: EngineState, scene: string, remainingMs: number | null, now: number) {
    this.raw
      .prepare(
        `INSERT INTO game_snapshots (session_id, state_version, state, scene, remaining_ms, engine_json, created_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (session_id, state_version) DO UPDATE SET engine_json = excluded.engine_json,
           state = excluded.state, scene = excluded.scene, remaining_ms = excluded.remaining_ms`,
      )
      .run(engine.sessionId, engine.stateVersion, engine.state, scene, remainingMs, JSON.stringify(engine), now);
    this.raw
      .prepare('UPDATE live_sessions SET state_version = ?, last_heartbeat_ms = ? WHERE id = ?')
      .run(engine.stateVersion, now, engine.sessionId);
  }

  latestGameSnapshot(sessionId: string): EngineState | null {
    const r = this.raw
      .prepare('SELECT engine_json FROM game_snapshots WHERE session_id = ? ORDER BY state_version DESC LIMIT 1')
      .get(sessionId) as { engine_json: string } | undefined;
    return r ? (JSON.parse(r.engine_json) as EngineState) : null;
  }

  findAction(commandId: string): { resultJson: string } | null {
    const r = this.raw.prepare('SELECT result_json AS resultJson FROM operator_actions WHERE id = ?').get(commandId);
    return (r as { resultJson: string } | undefined) ?? null;
  }

  recordAction(a: {
    commandId: string;
    sessionId: string;
    operatorId: string;
    commandType: string;
    reason: string | null;
    expectedStateVersion: number;
    resultStateVersion: number;
    accepted: boolean;
    resultJson: string;
    requestedAtMs: number;
    now: number;
  }) {
    this.raw
      .prepare(
        `INSERT INTO operator_actions (id, session_id, operator_id, command_type, reason, expected_state_version,
           result_state_version, accepted, result_json, requested_at_ms, created_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        a.commandId,
        a.sessionId,
        a.operatorId,
        a.commandType,
        a.reason,
        a.expectedStateVersion,
        a.resultStateVersion,
        a.accepted ? 1 : 0,
        a.resultJson,
        Math.floor(a.requestedAtMs),
        a.now,
      );
  }

  addOutbox(sessionId: string, stateVersion: number, type: string, payload: unknown, now: number) {
    this.raw
      .prepare('INSERT INTO outbox_events (session_id, state_version, type, payload_json, created_at_ms) VALUES (?, ?, ?, ?, ?)')
      .run(sessionId, stateVersion, type, JSON.stringify(payload), now);
  }

  takeUnpublished(sessionId: string): { id: number; stateVersion: number; type: string; payload: unknown }[] {
    const rows = this.raw
      .prepare(
        'SELECT id, state_version AS stateVersion, type, payload_json AS p FROM outbox_events WHERE session_id = ? AND published_at_ms IS NULL ORDER BY id',
      )
      .all(sessionId) as any[];
    return rows.map((r) => ({ id: r.id, stateVersion: r.stateVersion, type: r.type, payload: JSON.parse(r.p) }));
  }

  markPublished(ids: number[], now: number) {
    const st = this.raw.prepare('UPDATE outbox_events SET published_at_ms = ? WHERE id = ?');
    for (const id of ids) st.run(now, id);
  }

  recordConnectionEvent(sessionId: string | null, source: string, status: string, detail: string | null, now: number) {
    this.raw
      .prepare('INSERT INTO connection_events (session_id, source, status, detail, created_at_ms) VALUES (?, ?, ?, ?, ?)')
      .run(sessionId, source, status, detail, now);
  }

  history(sessionId: string) {
    const roundsRows = this.raw
      .prepare(
        `SELECT id, round_number AS roundNumber, seed, question_count AS questionCount, status,
                started_at_ms AS startedAtMs, ended_at_ms AS endedAtMs FROM rounds WHERE session_id = ? ORDER BY round_number`,
      )
      .all(sessionId) as any[];
    const finals = this.raw.prepare(
      "SELECT entries_json AS e, participant_count AS n FROM leaderboard_snapshots WHERE round_id = ? AND kind = 'FINAL' ORDER BY id DESC LIMIT 1",
    );
    const actions = this.raw
      .prepare(
        `SELECT id AS commandId, operator_id AS operatorId, command_type AS commandType, reason, accepted,
                expected_state_version AS expectedStateVersion, result_state_version AS resultStateVersion,
                created_at_ms AS createdAtMs FROM operator_actions WHERE session_id = ? ORDER BY created_at_ms, rowid`,
      )
      .all(sessionId) as any[];
    return {
      rounds: roundsRows.map((r) => {
        const f = finals.get(r.id) as { e: string; n: number } | undefined;
        return { ...r, finalTop10: f ? (JSON.parse(f.e) as LeaderboardEntry[]) : null, participantCount: f?.n ?? null };
      }),
      actions: actions.map((a) => ({ ...a, accepted: !!a.accepted })),
    };
  }
}
