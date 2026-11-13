import { afterEach, describe, expect, it } from 'vitest';
import { AUTH, TOKEN, boot, command, createSession, rt, runUntil, type Harness } from './helpers';

const active: Harness[] = [];
afterEach(async () => {
  for (const h of active.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

describe('lọc tên live và API quản trị', () => {
  it('không phát/ghi tên bị gắn cờ; GET/PUT/ẩn hiện cần auth và áp dụng ngay cho overlay', async () => {
    const h = await createSession(await boot({}), { allowDemoQuestions: true });
    active.push(h);
    expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
    expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
    runUntil(h, () => rt(h).engine.state === 'ACCEPTING');
    const runtime = rt(h);
    const publicBatches: string[] = [];
    runtime.subscribe((batch) => {
      for (const item of batch) if (item.audience === 'public') publicBatches.push(JSON.stringify(item.message));
    });

    const correct = runtime.adminSnapshot().current!.correctOptionId;
    expect(runtime.ingest({ source: 'MOCK', userId: 'bad-name', displayName: 'd1t User', text: correct, eventId: 'nf-1' })).toEqual({ accepted: true });
    const badId = h.store.findPlayerId('MOCK', 'bad-name')!;
    const persistedBadName = h.store.raw.prepare('SELECT display_name AS n FROM players WHERE id = ?').get(badId) as { n: string };
    expect(persistedBadName.n).toBe('d*******');
    expect(runtime.adminSnapshot().flaggedPlayers).toContainEqual(expect.objectContaining({
      playerId: badId, originalName: 'd1t User', displayName: 'd*******', flagged: true, reasonCategory: 'PROFANITY',
    }));
    const publicName = runtime.publicSnapshot().audience!.seats.find((seat) => seat.occupant?.displayName === 'd*******');
    expect(publicName).toBeDefined();
    runUntil(h, () => runtime.engine.state === 'REVEAL');
    expect(runtime.publicSnapshot().leaderboard?.entries.map((entry) => entry.displayName)).toContain('d*******');
    h.scheduler.advance(250);
    expect(publicBatches.join('\n')).not.toContain('d1t User');

    expect((await h.quiz.app.inject({ method: 'GET', url: '/api/admin/name-filter' })).statusCode).toBe(401);
    expect((await h.quiz.app.inject({ method: 'PUT', url: '/api/admin/name-filter', payload: { rules: [], whitelist: [], hiddenPlayerIds: [] } })).statusCode).toBe(401);

    runUntil(h, () => runtime.engine.state === 'ACCEPTING' && runtime.engine.round!.questionIndex === 1);
    const nextCorrect = runtime.adminSnapshot().current!.correctOptionId;
    expect(runtime.ingest({ source: 'MOCK', userId: 'manual-name', displayName: 'Ngọc', text: nextCorrect, eventId: 'nf-2' })).toEqual({ accepted: true });
    const manualId = h.store.findPlayerId('MOCK', 'manual-name')!;
    const hide = await h.quiz.app.inject({
      method: 'POST', url: '/api/admin/name-filter/players/visibility', headers: AUTH,
      payload: { playerId: manualId, hidden: true },
    });
    expect(hide.statusCode).toBe(200);
    expect(runtime.publicSnapshot().audience!.seats.some((seat) => seat.occupant?.displayName === 'N***')).toBe(true);
    expect(runtime.adminSnapshot().flaggedPlayers).toContainEqual(expect.objectContaining({ playerId: manualId, originalName: 'Ngọc', reasonCategory: 'MANUAL' }));

    const show = await h.quiz.app.inject({
      method: 'POST', url: '/api/admin/name-filter/players/visibility', headers: AUTH,
      payload: { playerId: manualId, hidden: false },
    });
    expect(show.statusCode).toBe(200);
    expect(runtime.publicSnapshot().audience!.seats.some((seat) => seat.occupant?.displayName === 'Ngọc')).toBe(true);

    const roundId = runtime.engine.round!.roundId;
    h.store.raw.prepare(
      'INSERT INTO leaderboard_snapshots (round_id, question_instance_id, kind, entries_json, participant_count, created_at_ms) VALUES (?, NULL, ?, ?, ?, ?)',
    ).run(roundId, 'AFTER_QUESTION', JSON.stringify([{ playerId: manualId, displayName: 'Ngọc', rank: 1 }]), 1, h.scheduler.now());
    h.store.raw.prepare(
      'INSERT INTO outbox_events (session_id, state_version, type, payload_json, created_at_ms) VALUES (?, ?, ?, ?, ?)',
    ).run(h.sessionId, runtime.engine.stateVersion, 'STATE_SNAPSHOT', JSON.stringify({ displayName: 'Ngọc' }), h.scheduler.now());

    const custom = await h.quiz.app.inject({
      method: 'PUT', url: '/api/admin/name-filter', headers: AUTH,
      payload: { rules: [{ term: 'ngoc', match: 'word', category: 'CUSTOM' }], whitelist: [], hiddenPlayerIds: [] },
    });
    expect(custom.statusCode).toBe(200);
    expect(runtime.publicSnapshot().audience!.seats.some((seat) => seat.occupant?.displayName === 'N***')).toBe(true);
    expect(h.store.raw.prepare('SELECT display_name AS n FROM players WHERE id = ?').get(manualId)).toMatchObject({ n: 'N***' });
    const historicalJson = [
      ...(h.store.raw.prepare('SELECT entries_json AS json FROM leaderboard_snapshots').all() as { json: string }[]).map((row) => row.json),
      ...(h.store.raw.prepare('SELECT payload_json AS json FROM outbox_events').all() as { json: string }[]).map((row) => row.json),
    ].join('\n');
    expect(historicalJson).not.toContain('Ngọc');

    const releaseFalsePositive = await h.quiz.app.inject({
      method: 'PUT', url: '/api/admin/name-filter', headers: AUTH,
      payload: { rules: [{ term: 'ngoc', match: 'word', category: 'CUSTOM' }], whitelist: ['Ngọc'], hiddenPlayerIds: [] },
    });
    expect(releaseFalsePositive.statusCode).toBe(200);
    expect(runtime.publicSnapshot().audience!.seats.some((seat) => seat.occupant?.displayName === 'Ngọc')).toBe(true);
  });
});
