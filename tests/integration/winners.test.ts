import { afterEach, describe, expect, it } from 'vitest';
import { AUTH, boot, command, createSession, rt, type Harness } from './helpers';

const open: Harness[] = [];
afterEach(async () => {
  for (const harness of open.splice(0)) {
    await harness.quiz.close().catch(() => {});
    harness.store.close();
  }
});

describe('Admin winners', () => {
  it('persists a validated TikTok handle from ingest without publishing it', async () => {
    const harness = await createSession(await boot({ questions: 2 }));
    open.push(harness);
    const runtime = rt(harness);
    await command(harness, { type: 'OPEN_LOBBY' });

    expect(runtime.ingest({
      source: 'TIKTOK', userId: 'ingest-user-1', uniqueId: '  ten_nguoi_xem  ',
      displayName: 'Người xem', text: 'free fire', eventId: 'ingest-user-1-lobby',
    })).toEqual({ accepted: true });
    const stored = harness.store.raw.prepare('SELECT unique_id FROM players WHERE source_user_id = ?').get('ingest-user-1') as { unique_id: string | null };
    expect(stored.unique_id).toBe('ten_nguoi_xem');
    expect(JSON.stringify(runtime.publicSnapshot())).not.toContain('ten_nguoi_xem');
  });

  it('requires the admin token and keeps TikTok handles out of public snapshots', async () => {
    const harness = await createSession(await boot({ questions: 2 }));
    open.push(harness);
    harness.store.createSession({
      id: 'old-session', name: 'Phiên cũ', mode: 'MOCK', packId: 'demo', config: rt(harness).config, now: 100,
    });

    const addRound = (roundId: string, sessionId: string, roundNumber: number, endedAt: number) => {
      harness.store.createRound({
        id: roundId, sessionId, roundNumber, seed: roundNumber, selectionMode: 'RANDOM', snapshots: [], now: endedAt - 1_000,
      });
      for (const [index, score] of [300, 200, 100].entries()) {
        const userId = `${roundId}-user-${index + 1}`;
        const uniqueId = index === 1 ? null : `${roundId}.winner${index + 1}`;
        const playerId = harness.store.resolvePlayer('TIKTOK', userId, `Người thắng ${index + 1}`, endedAt, uniqueId);
        harness.store.raw.prepare('INSERT INTO round_players (round_id, player_id, score, correct_count, streak, joined_at_ms) VALUES (?, ?, ?, ?, 0, ?)')
          .run(roundId, playerId, score, index + 1, endedAt + index);
      }
      harness.store.setRoundStatus(roundId, 'COMPLETED', endedAt);
    };
    addRound('old-round', 'old-session', 1, 2_000);
    addRound('current-round', harness.sessionId, 1, 3_000);

    const unauthorized = await harness.quiz.app.inject({ method: 'GET', url: '/api/admin/winners' });
    expect(unauthorized.statusCode).toBe(401);

    const authorized = await harness.quiz.app.inject({ method: 'GET', url: '/api/admin/winners', headers: AUTH });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json().winners).toHaveLength(6);
    expect(authorized.json().winners[0]).toMatchObject({
      sessionId: harness.sessionId,
      roundId: 'current-round',
      rank: 1,
      uniqueId: 'current-round.winner1',
      sourceUserId: 'current-round-user-1',
    });
    expect(authorized.json().winners).toContainEqual(expect.objectContaining({
      sessionId: 'old-session', roundId: 'old-round', rank: 2, uniqueId: null, sourceUserId: 'old-round-user-2',
    }));

    const publicState = JSON.stringify(rt(harness).publicSnapshot());
    expect(publicState).not.toContain('current-round.winner1');
    expect(publicState).not.toContain('old-round.winner1');
  });
});
