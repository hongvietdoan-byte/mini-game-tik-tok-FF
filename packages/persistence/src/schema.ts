import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Schema SQLite. Thời gian là epoch-ms (integer). JSON lưu dạng text.
 * KHÔNG có cột nào cho email / số điện thoại / ngày sinh / UID game / thông tin liên hệ.
 */

const createdAt = () =>
  integer('created_at_ms')
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);

// --- Nội dung --------------------------------------------------------------

export const themePacks = sqliteTable('theme_packs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  packVersion: text('pack_version').notNull(),
  manifestJson: text('manifest_json').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAtMs: createdAt(),
});

export const subtopics = sqliteTable(
  'subtopics',
  {
    id: text('id').primaryKey(),
    packId: text('pack_id')
      .notNull()
      .references(() => themePacks.id),
    name: text('name').notNull(),
    factKind: text('fact_kind').notNull().default('GENERAL'), // GENERAL | SCHEDULED | COMPLETED
  },
  (t) => [index('subtopics_pack_idx').on(t.packId)],
);

export const questions = sqliteTable(
  'questions',
  {
    id: text('id').primaryKey(),
    packId: text('pack_id')
      .notNull()
      .references(() => themePacks.id),
    subtopicId: text('subtopic_id')
      .notNull()
      .references(() => subtopics.id),
    prompt: text('prompt').notNull(),
    optionsJson: text('options_json').notNull(),
    correctOptionId: text('correct_option_id').notNull(),
    explanation: text('explanation').notNull().default(''),
    difficulty: text('difficulty').notNull(),
    tagsJson: text('tags_json').notNull().default('[]'),
    sourceRefsJson: text('source_refs_json').notNull().default('[]'),
    verificationStatus: text('verification_status').notNull(),
    approvalStatus: text('approval_status').notNull(),
    version: integer('version').notNull().default(1),
    mediaJson: text('media_json'),
    validFromMs: integer('valid_from_ms'),
    validUntilMs: integer('valid_until_ms'),
    lastUsedAtMs: integer('last_used_at_ms'),
    createdAtMs: createdAt(),
    updatedAtMs: integer('updated_at_ms'),
  },
  (t) => [
    index('questions_pack_status_idx').on(t.packId, t.approvalStatus, t.verificationStatus),
    index('questions_subtopic_idx').on(t.subtopicId),
  ],
);

export const questionVersions = sqliteTable(
  'question_versions',
  {
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id),
    version: integer('version').notNull(),
    snapshotJson: text('snapshot_json').notNull(),
    editedBy: text('edited_by'),
    createdAtMs: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.version] })],
);

export const questionSources = sqliteTable(
  'question_sources',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id').references(() => questions.id),
    sourceKind: text('source_kind').notNull(), // TEXT | PDF | IMAGE | URL | OPERATOR
    sourceLabel: text('source_label').notNull(),
    excerpt: text('excerpt'),
    locator: text('locator'),
    observedAtMs: integer('observed_at_ms'),
    /** Tín hiệu nội bộ, không phải chứng nhận sự thật. */
    confidence: integer('confidence'),
    accessLevel: text('access_level').notNull().default('INTERNAL'), // INTERNAL | PUBLIC_APPROVED
    createdAtMs: createdAt(),
  },
  (t) => [index('question_sources_question_idx').on(t.questionId)],
);

export const generationJobs = sqliteTable('generation_jobs', {
  id: text('id').primaryKey(),
  packId: text('pack_id').references(() => themePacks.id),
  status: text('status').notNull(),
  provider: text('provider'),
  requestJson: text('request_json').notNull(),
  resultJson: text('result_json'),
  estimatedCostMicros: integer('estimated_cost_micros'),
  error: text('error'),
  createdAtMs: createdAt(),
  finishedAtMs: integer('finished_at_ms'),
});

// --- Phiên / vòng ----------------------------------------------------------

export const liveSessions = sqliteTable('live_sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mode: text('mode').notNull(),
  packId: text('pack_id').notNull(),
  status: text('status').notNull().default('OPEN'), // OPEN | CLOSED
  configJson: text('config_json').notNull(),
  stateVersion: integer('state_version').notNull().default(0),
  lastHeartbeatMs: integer('last_heartbeat_ms'),
  createdAtMs: createdAt(),
  closedAtMs: integer('closed_at_ms'),
});

export const rounds = sqliteTable(
  'rounds',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => liveSessions.id),
    roundNumber: integer('round_number').notNull(),
    seed: integer('seed').notNull(),
    selectionMode: text('selection_mode').notNull(),
    questionCount: integer('question_count').notNull(),
    status: text('status').notNull().default('PREPARED'), // PREPARED | RUNNING | COMPLETED | ABORTED
    packVersion: text('pack_version'),
    startedAtMs: integer('started_at_ms'),
    endedAtMs: integer('ended_at_ms'),
    createdAtMs: createdAt(),
  },
  (t) => [index('rounds_session_idx').on(t.sessionId)],
);

export const roundQuestions = sqliteTable(
  'round_questions',
  {
    /** questionInstanceId */
    id: text('id').primaryKey(),
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id),
    questionVersion: integer('question_version').notNull(),
    position: integer('position').notNull(),
    /** Snapshot bất biến (đã xáo đáp án + ánh xạ). */
    snapshotJson: text('snapshot_json').notNull(),
    correctOptionId: text('correct_option_id').notNull(),
    status: text('status').notNull().default('PENDING'), // PENDING | OPEN | CLOSED | VOIDED
    openedAtMs: integer('opened_at_ms'),
    closedAtMs: integer('closed_at_ms'),
    voidedAtMs: integer('voided_at_ms'),
    voidedAfterReveal: integer('voided_after_reveal', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [uniqueIndex('round_questions_round_pos_uq').on(t.roundId, t.position)],
);

// --- Người chơi / đáp án / điểm --------------------------------------------

export const players = sqliteTable(
  'players',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    /** Định danh ổn định do nguồn cấp. Chỉ lưu tối thiểu: id + tên hiển thị đã làm sạch. */
    sourceUserId: text('source_user_id').notNull(),
    displayName: text('display_name').notNull(),
    firstSeenAtMs: integer('first_seen_at_ms').notNull(),
    lastSeenAtMs: integer('last_seen_at_ms').notNull(),
  },
  (t) => [uniqueIndex('players_source_user_uq').on(t.source, t.sourceUserId)],
);

export const roundPlayers = sqliteTable(
  'round_players',
  {
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id),
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    score: integer('score').notNull().default(0),
    correctCount: integer('correct_count').notNull().default(0),
    streak: integer('streak').notNull().default(0),
    joinedAtMs: integer('joined_at_ms').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.roundId, t.playerId] }),
    index('round_players_rank_idx').on(t.roundId, t.score),
  ],
);

export const answers = sqliteTable(
  'answers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    questionInstanceId: text('question_instance_id')
      .notNull()
      .references(() => roundQuestions.id),
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id),
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    optionId: text('option_id').notNull(),
    receivedAtMs: integer('received_at_ms').notNull(),
    sourceEventId: text('source_event_id'),
  },
  (t) => [
    // THẨM QUYỀN CUỐI CÙNG: mỗi người chơi một đáp án cho mỗi câu — đáp án đầu tiên thắng.
    uniqueIndex('answers_question_player_uq').on(t.questionInstanceId, t.playerId),
    index('answers_round_idx').on(t.roundId),
  ],
);

export const scoreEvents = sqliteTable(
  'score_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id),
    questionInstanceId: text('question_instance_id')
      .notNull()
      .references(() => roundQuestions.id),
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    /** CORRECT | STREAK_3 | STREAK_5 | STREAK_10 | VOID_REVERSAL:<reason> */
    scoreReason: text('score_reason').notNull(),
    points: integer('points').notNull(),
    createdAtMs: integer('created_at_ms').notNull(),
  },
  (t) => [
    // Sổ cái chỉ-ghi-thêm; khoá duy nhất làm việc chấm lại trở nên idempotent.
    uniqueIndex('score_events_ledger_uq').on(t.roundId, t.questionInstanceId, t.playerId, t.scoreReason),
    index('score_events_round_player_idx').on(t.roundId, t.playerId),
  ],
);

export const leaderboardSnapshots = sqliteTable(
  'leaderboard_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id),
    questionInstanceId: text('question_instance_id'),
    kind: text('kind').notNull(), // AFTER_QUESTION | AFTER_VOID | FINAL
    entriesJson: text('entries_json').notNull(),
    participantCount: integer('participant_count').notNull(),
    createdAtMs: integer('created_at_ms').notNull(),
  },
  (t) => [index('leaderboard_snapshots_round_idx').on(t.roundId)],
);

// --- Trạng thái / kiểm toán -------------------------------------------------

export const gameSnapshots = sqliteTable(
  'game_snapshots',
  {
    sessionId: text('session_id')
      .notNull()
      .references(() => liveSessions.id),
    stateVersion: integer('state_version').notNull(),
    state: text('state').notNull(),
    scene: text('scene').notNull(),
    remainingMs: integer('remaining_ms'),
    engineJson: text('engine_json').notNull(),
    packVersion: text('pack_version'),
    createdAtMs: integer('created_at_ms').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.stateVersion] })],
);

export const operatorActions = sqliteTable(
  'operator_actions',
  {
    /** = commandId (khoá idempotency). */
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => liveSessions.id),
    operatorId: text('operator_id').notNull(),
    commandType: text('command_type').notNull(),
    reason: text('reason'),
    expectedStateVersion: integer('expected_state_version').notNull(),
    resultStateVersion: integer('result_state_version').notNull(),
    accepted: integer('accepted', { mode: 'boolean' }).notNull(),
    resultJson: text('result_json').notNull(),
    requestedAtMs: integer('requested_at_ms').notNull(),
    createdAtMs: integer('created_at_ms').notNull(),
  },
  (t) => [index('operator_actions_session_idx').on(t.sessionId, t.createdAtMs)],
);

export const outboxEvents = sqliteTable(
  'outbox_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id')
      .notNull()
      .references(() => liveSessions.id),
    stateVersion: integer('state_version').notNull(),
    type: text('type').notNull(),
    payloadJson: text('payload_json').notNull(),
    createdAtMs: integer('created_at_ms').notNull(),
    publishedAtMs: integer('published_at_ms'),
  },
  (t) => [index('outbox_session_idx').on(t.sessionId, t.id)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAtMs: integer('updated_at_ms').notNull(),
});

export const connectionEvents = sqliteTable(
  'connection_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id').references(() => liveSessions.id),
    source: text('source').notNull(),
    status: text('status').notNull(),
    detail: text('detail'),
    createdAtMs: integer('created_at_ms').notNull(),
  },
  (t) => [index('connection_events_session_idx').on(t.sessionId, t.id)],
);

/**
 * Sự kiện comment đã xử lý (chỉ các comment là đáp án hợp lệ trong cửa sổ nhận).
 * Bền qua khởi động lại: nguồn phát lại comment cũ (cùng eventId) sau reconnect/restart không bao giờ được tính lại.
 */
export const processedEvents = sqliteTable(
  'processed_events',
  {
    source: text('source').notNull(),
    eventId: text('event_id').notNull(),
    questionInstanceId: text('question_instance_id').notNull(),
    receivedAtMs: integer('received_at_ms').notNull(),
  },
  (t) => [primaryKey({ columns: [t.source, t.eventId] }), index('processed_events_received_idx').on(t.receivedAtMs)],
);

/** Trạng thái 35 ghế khán giả của một vòng (V3 §6) — khôi phục đúng bố cục sau khi khởi động lại. */
export const audienceStates = sqliteTable('audience_states', {
  roundId: text('round_id')
    .primaryKey()
    .references(() => rounds.id),
  rotationId: integer('rotation_id').notNull(),
  stateJson: text('state_json').notNull(),
  updatedAtMs: integer('updated_at_ms').notNull(),
});

/** Nhân vật chibi gán cho người chơi trong vòng — cố định suốt vòng, không random lại khi render/reload. */
export const characterAssignments = sqliteTable(
  'character_assignments',
  {
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id),
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    characterId: text('character_id').notNull(),
    assignedAtMs: integer('assigned_at_ms').notNull(),
  },
  (t) => [primaryKey({ columns: [t.roundId, t.playerId] })],
);
