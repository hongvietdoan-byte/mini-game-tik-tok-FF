import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { Store } from '@quiz/persistence';
import { pruneDatabaseFile } from './data-prune';

const roots: string[] = [];
function fixture() {
  const root = join(process.cwd(), '.tmp-test', `c0289-prune-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  roots.push(root);
  const path = join(root, 'analytics.db');
  const store = new Store(path);
  store.seedQuestions({ id: 'demo', name: 'Demo' }, [{
    id: 'prune-q', packId: 'demo', subtopicId: 'prune-topic', prompt: 'Q',
    options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: id })), correctOptionId: 'A', explanation: '',
    difficulty: 'EASY', verificationStatus: 'DEMO', approvalStatus: 'APPROVED',
  }], 1);
  const raw = store.raw;
  const now = Date.UTC(2026, 0, 1);
  const old = now - 60 * 24 * 60 * 60 * 1000;
  raw.prepare(`INSERT INTO live_sessions (id,name,mode,pack_id,status,config_json,state_version,created_at_ms,closed_at_ms)
    VALUES ('old','Old','MOCK','demo','CLOSED','{}',0,?,?)`).run(old, old);
  raw.prepare(`INSERT INTO live_sessions (id,name,mode,pack_id,status,config_json,state_version,created_at_ms)
    VALUES ('live','Live','MOCK','demo','OPEN','{}',0,?)`).run(now);
  raw.prepare(`INSERT INTO rounds (id,session_id,round_number,seed,selection_mode,question_count,status,created_at_ms,started_at_ms,ended_at_ms)
    VALUES ('old-round','old',1,1,'RANDOM',1,'COMPLETED',?,?,?)`).run(old, old, old + 1);
  raw.prepare(`INSERT INTO rounds (id,session_id,round_number,seed,selection_mode,question_count,status,created_at_ms,started_at_ms)
    VALUES ('live-round','live',1,1,'RANDOM',1,'RUNNING',?,?)`).run(now, now);
  raw.prepare(`INSERT INTO round_questions (id,round_id,question_id,question_version,position,snapshot_json,correct_option_id,status,opened_at_ms,closed_at_ms)
    VALUES ('old-round:q1','old-round','prune-q',1,0,'{}','A','CLOSED',?,?)`).run(old, old + 1);
  raw.prepare(`INSERT INTO round_questions (id,round_id,question_id,question_version,position,snapshot_json,correct_option_id,status,opened_at_ms)
    VALUES ('live-round:q1','live-round','prune-q',1,0,'{}','A','OPEN',?)`).run(now);
  raw.prepare(`INSERT INTO players (id,source,source_user_id,display_name,first_seen_at_ms,last_seen_at_ms)
    VALUES ('old-player','MOCK','old-id','Old player',?,?),('shared-player','MOCK','shared-id','Shared player',?,?)`).run(old, old, old, old);
  raw.prepare("INSERT INTO round_players (round_id,player_id,joined_at_ms) VALUES ('old-round','old-player',?),('old-round','shared-player',?),('live-round','shared-player',?)").run(old, old, now);
  raw.prepare("INSERT INTO answers (question_instance_id,round_id,player_id,option_id,received_at_ms) VALUES ('old-round:q1','old-round','old-player','A',?)").run(old);
  raw.prepare("INSERT INTO score_events (round_id,question_instance_id,player_id,score_reason,points,created_at_ms) VALUES ('old-round','old-round:q1','old-player','CORRECT',100,?)").run(old);
  store.close();
  return { root, path, old, now };
}

afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('data prune', () => {
  it('dry-run chỉ đọc, apply backup trước rồi chỉ xoá phiên đóng quá hạn', async () => {
    const f = fixture();
    const dry = await pruneDatabaseFile(f.path, 30, false, f.now);
    expect(dry.applied).toBe(false);
    expect(dry.plan).toMatchObject({ sessions: 1, rowsByTable: { answers: 1, score_events: 1, rounds: 1, live_sessions: 1 } });
    expect(dry.backupPath).toBeNull();
    const check = new Database(f.path, { readonly: true });
    expect((check.prepare("SELECT COUNT(*) AS n FROM rounds WHERE id='old-round'").get() as { n: number }).n).toBe(1);
    check.close();

    const applied = await pruneDatabaseFile(f.path, 30, true, f.now);
    expect(applied.applied).toBe(true);
    expect(applied.backupPath).toBeTruthy();
    expect(existsSync(applied.backupPath!)).toBe(true);
    const backup = new Database(applied.backupPath!, { readonly: true, fileMustExist: true });
    expect((backup.prepare("SELECT COUNT(*) AS n FROM score_events WHERE round_id='old-round'").get() as { n: number }).n).toBe(1);
    backup.close();
    const after = new Database(f.path, { readonly: true });
    expect((after.prepare("SELECT COUNT(*) AS n FROM rounds WHERE id='old-round'").get() as { n: number }).n).toBe(0);
    expect((after.prepare("SELECT COUNT(*) AS n FROM rounds WHERE id='live-round'").get() as { n: number }).n).toBe(1);
    expect((after.prepare("SELECT COUNT(*) AS n FROM players WHERE id='old-player'").get() as { n: number }).n).toBe(0);
    expect((after.prepare("SELECT COUNT(*) AS n FROM players WHERE id='shared-player'").get() as { n: number }).n).toBe(1);
    after.close();
  });
});
