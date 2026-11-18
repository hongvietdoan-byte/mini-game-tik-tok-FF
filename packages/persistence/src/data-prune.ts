import { mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';

const CTE = `
WITH prune_sessions AS (
  SELECT s.id FROM live_sessions s
  WHERE s.status = 'CLOSED' AND s.closed_at_ms IS NOT NULL AND s.closed_at_ms < ?
    AND NOT EXISTS (
      SELECT 1 FROM rounds r WHERE r.session_id = s.id
        AND (r.status NOT IN ('COMPLETED', 'ABORTED') OR COALESCE(r.ended_at_ms, r.created_at_ms) >= ?)
    )
), prune_rounds AS (
  SELECT r.id FROM rounds r WHERE r.session_id IN (SELECT id FROM prune_sessions)
), prune_questions AS (
  SELECT q.id FROM round_questions q WHERE q.round_id IN (SELECT id FROM prune_rounds)
)
`;

const TABLES = [
  { table: 'answers', column: 'round_id', kind: 'round' },
  { table: 'score_events', column: 'round_id', kind: 'round' },
  { table: 'achievement_awards', column: 'round_id', kind: 'round' },
  { table: 'ranking_snapshots', column: 'round_id', kind: 'round' },
  { table: 'leaderboard_snapshots', column: 'round_id', kind: 'round' },
  { table: 'round_players', column: 'round_id', kind: 'round' },
  { table: 'character_assignments', column: 'round_id', kind: 'round' },
  { table: 'audience_states', column: 'round_id', kind: 'round' },
  { table: 'processed_events', column: 'question_instance_id', kind: 'question' },
  { table: 'round_questions', column: 'round_id', kind: 'round' },
  { table: 'game_snapshots', column: 'session_id', kind: 'session' },
  { table: 'operator_actions', column: 'session_id', kind: 'session' },
  { table: 'outbox_events', column: 'session_id', kind: 'session' },
  { table: 'connection_events', column: 'session_id', kind: 'session' },
  { table: 'rounds', column: 'id', kind: 'round-id' },
  { table: 'live_sessions', column: 'id', kind: 'session-id' },
] as const;

function cutoffFor(days: number, nowMs: number) {
  if (!Number.isInteger(days) || days < 1) throw new Error('--older-than phải là số nguyên ngày dương.');
  return nowMs - days * 24 * 60 * 60 * 1000;
}

function predicate(kind: (typeof TABLES)[number]['kind'], column: string) {
  if (kind === 'session') return `${column} IN (SELECT id FROM prune_sessions)`;
  if (kind === 'round') return `${column} IN (SELECT id FROM prune_rounds)`;
  if (kind === 'question') return `${column} IN (SELECT id FROM prune_questions)`;
  if (kind === 'round-id') return `${column} IN (SELECT id FROM prune_rounds)`;
  return `${column} IN (SELECT id FROM prune_sessions)`;
}

const ORPHAN_PLAYERS = `
  NOT EXISTS (SELECT 1 FROM round_players x WHERE x.player_id = players.id)
  AND NOT EXISTS (SELECT 1 FROM answers x WHERE x.player_id = players.id)
  AND NOT EXISTS (SELECT 1 FROM score_events x WHERE x.player_id = players.id)
  AND NOT EXISTS (SELECT 1 FROM achievement_awards x WHERE x.player_id = players.id)
  AND NOT EXISTS (SELECT 1 FROM character_assignments x WHERE x.player_id = players.id)
`;

export type PrunePlan = { olderThanDays: number; cutoffMs: number; sessions: number; rowsByTable: Record<string, number> };

export function createPrunePlan(db: Database.Database, days: number, nowMs = Date.now()): PrunePlan {
  const cutoffMs = cutoffFor(days, nowMs);
  const sessions = db.prepare(`${CTE} SELECT COUNT(*) AS n FROM prune_sessions`).get(cutoffMs, cutoffMs) as { n: number };
  const rowsByTable: Record<string, number> = {};
  for (const item of TABLES) {
    const result = db.prepare(`${CTE} SELECT COUNT(*) AS n FROM ${item.table} WHERE ${predicate(item.kind, item.column)}`).get(cutoffMs, cutoffMs) as { n: number };
    rowsByTable[item.table] = result.n;
  }
  rowsByTable.players = (db.prepare(`${CTE} SELECT COUNT(*) AS n FROM players WHERE last_seen_at_ms < ? AND (${ORPHAN_PLAYERS})`).get(cutoffMs, cutoffMs, cutoffMs) as { n: number }).n;
  return { olderThanDays: days, cutoffMs, sessions: sessions.n, rowsByTable };
}

export function applyPrunePlan(db: Database.Database, plan: PrunePlan) {
  db.pragma('foreign_keys = ON');
  db.transaction(() => {
    for (const item of TABLES) {
      db.prepare(`${CTE} DELETE FROM ${item.table} WHERE ${predicate(item.kind, item.column)}`).run(plan.cutoffMs, plan.cutoffMs);
    }
    db.prepare(`${CTE} DELETE FROM players WHERE last_seen_at_ms < ? AND (${ORPHAN_PLAYERS})`)
      .run(plan.cutoffMs, plan.cutoffMs, plan.cutoffMs);
  }).immediate();
}

export async function pruneDatabaseFile(dbPath: string, days: number, apply: boolean, nowMs = Date.now()) {
  const path = resolve(dbPath);
  if (!apply) {
    const db = new Database(path, { readonly: true, fileMustExist: true });
    try { return { plan: createPrunePlan(db, days, nowMs), backupPath: null as string | null, applied: false }; }
    finally { db.close(); }
  }

  const backupDirectory = join(dirname(path), 'backups');
  mkdirSync(backupDirectory, { recursive: true });
  const backupPath = join(backupDirectory, `${basename(path, '.db')}-pre-prune-${new Date(nowMs).toISOString().replace(/[:.]/gu, '-')}.db`);
  const db = new Database(path, { fileMustExist: true });
  db.pragma('foreign_keys = ON');
  try {
    await db.backup(backupPath);
    const plan = createPrunePlan(db, days, nowMs);
    applyPrunePlan(db, plan);
    return { plan, backupPath, applied: true };
  } finally { db.close(); }
}

export function formatPrunePlan(result: Awaited<ReturnType<typeof pruneDatabaseFile>>) {
  const verb = result.applied ? 'Đã xoá' : 'Sẽ xoá (dry-run)';
  return [
    `# ${verb} dữ liệu cũ`,
    '',
    `- Ngưỡng: ${result.plan.olderThanDays} ngày (cutoff epoch-ms: ${result.plan.cutoffMs})`,
    `- Phiên đóng đủ hạn: ${result.plan.sessions}`,
    ...Object.entries(result.plan.rowsByTable).map(([table, count]) => `- ${table}: ${count}`),
    ...(result.backupPath ? [`- Backup trước khi xoá: ${result.backupPath}`] : []),
  ].join('\n');
}

