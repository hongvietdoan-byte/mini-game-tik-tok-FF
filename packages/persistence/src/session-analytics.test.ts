import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Store } from '@quiz/persistence';
import { buildSessionAnalytics, formatSessionAnalytics } from './session-analytics';

const roots: string[] = [];
function fixture() {
  const root = join(process.cwd(), '.tmp-test', `c0289-analytics-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  roots.push(root);
  const store = new Store(join(root, 'analytics.db'));
  store.seedQuestions({ id: 'demo', name: 'Demo' }, Array.from({ length: 15 }, (_, index) => ({
    id: `analytics-q-${index + 1}`, packId: 'demo', subtopicId: 'analytics-topic', prompt: `Câu ${index + 1}`,
    options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: id })), correctOptionId: 'A', explanation: '',
    difficulty: 'EASY', verificationStatus: 'DEMO', approvalStatus: 'APPROVED',
  })), 1_000);
  const raw = store.raw;
  const session = (id: string, createdAt: number, status = 'CLOSED', closedAt: number | null = createdAt) => raw.prepare(
    `INSERT INTO live_sessions (id,name,mode,pack_id,status,config_json,state_version,created_at_ms,closed_at_ms)
     VALUES (?, ?, 'MOCK', 'demo', ?, '{}', 0, ?, ?)`,
  ).run(id, id, status, createdAt, closedAt);
  const round = (id: string, sessionId: string, createdAt: number, number: number) => raw.prepare(
    `INSERT INTO rounds (id,session_id,round_number,seed,selection_mode,question_count,status,created_at_ms,started_at_ms,ended_at_ms)
     VALUES (?, ?, ?, 1, 'RANDOM', 15, 'COMPLETED', ?, ?, ?)`,
  ).run(id, sessionId, number, createdAt, createdAt, createdAt + 1);
  const player = (id: string, at: number) => raw.prepare(
    `INSERT INTO players (id,source,source_user_id,display_name,first_seen_at_ms,last_seen_at_ms) VALUES (?, 'MOCK', ?, ?, ?, ?)`,
  ).run(id, id, id, at, at);
  const question = raw.prepare(
    `INSERT INTO round_questions (id,round_id,question_id,question_version,position,snapshot_json,correct_option_id,status,opened_at_ms,closed_at_ms)
     VALUES (?, ?, ?, 1, ?, '{}', 'A', 'CLOSED', ?, ?)`,
  );
  return { root, store, session, round, player, question };
}

afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('session analytics', () => {
  it('đếm người chơi theo mức trả lời, tính rơi rụng giao cohort và người quay lại giữa vòng/phiên', () => {
    const f = fixture();
    try {
      f.session('session-current', 10_000);
      f.round('round-current', 'session-current', 10_000, 1);
      f.session('session-other', 20_000);
      f.round('round-other', 'session-other', 20_000, 1);
      f.round('round-current-2', 'session-current', 30_000, 2);
      const players = ['p1', 'p2', 'p3'];
      players.forEach((id) => f.player(id, 1_000));
      f.store.raw.prepare('INSERT INTO round_players (round_id,player_id,joined_at_ms) VALUES (?, ?, ?)')
        .run('round-current', 'p1', 1_000);
      f.store.raw.prepare('INSERT INTO round_players (round_id,player_id,joined_at_ms) VALUES (?, ?, ?)')
        .run('round-current', 'p2', 1_000);
      f.store.raw.prepare('INSERT INTO round_players (round_id,player_id,joined_at_ms) VALUES (?, ?, ?)')
        .run('round-current', 'p3', 3_000);
      for (const [roundId, playerId] of [
        ['round-other', 'p1'], ['round-current-2', 'p1'], ['round-other', 'p2'],
      ]) f.store.raw.prepare('INSERT INTO round_players (round_id,player_id,joined_at_ms) VALUES (?, ?, ?)').run(roundId, playerId, 20_000);
      const qids = Array.from({ length: 15 }, (_, index) => {
        const id = `round-current:q${index + 1}`;
        f.question.run(id, 'round-current', `analytics-q-${index + 1}`, index, 1_000 + index * 1_000, 1_500 + index * 1_000);
        return id;
      });
      const insertAnswer = f.store.raw.prepare('INSERT INTO answers (question_instance_id,round_id,player_id,option_id,received_at_ms) VALUES (?, ?, ?, ?, ?)');
      const answer = (pid: string, positions: number[]) => positions.forEach((position) => insertAnswer.run(qids[position - 1], 'round-current', pid, 'A', 1_100 + position * 1_000));
      answer('p1', Array.from({ length: 15 }, (_, i) => i + 1));
      answer('p2', [1, 2, 3, 4, 5]);
      answer('p3', [3, 4, 10]);

      const report = buildSessionAnalytics(f.store.raw, 'round-current');
      expect(report).toMatchObject({
        participantCount: 3,
        answeredAtLeast: { one: 3, five: 2, allFifteen: 1 },
        returning: { acrossRounds: 2, acrossSessions: 2 },
      });
      expect(report.questionDropOff[2]).toMatchObject({ eligibleBefore: 2, answered: 3, retainedFromPrevious: 2, droppedFromPrevious: 0, newThisQuestion: 1 });
      expect(formatSessionAnalytics(report)).toContain('không suy cohort từ tổng số đáp án');
      expect(buildSessionAnalytics(f.store.raw, 'latest').roundId).toBe('round-current-2');
    } finally { f.store.close(); }
  });

  it('báo đủ 15 câu bằng 0 khi vòng có số câu khác 15', () => {
    const f = fixture();
    try {
      f.session('s', 10_000);
      f.round('r', 's', 10_000, 1);
      f.store.raw.prepare('UPDATE rounds SET question_count = 10 WHERE id = ?').run('r');
      f.player('p', 1);
      f.store.raw.prepare('INSERT INTO round_players (round_id,player_id,joined_at_ms) VALUES (?, ?, ?)').run('r', 'p', 1);
      expect(buildSessionAnalytics(f.store.raw, 'r').answeredAtLeast.allFifteen).toBe(0);
    } finally { f.store.close(); }
  });
});
