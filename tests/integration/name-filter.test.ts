import { afterEach, describe, expect, it } from 'vitest';
import {
  NameModerationAuditResponseSchema,
  NameModerationAuditQuerySchema,
  NameModerationExceptionMutationResponseSchema,
  NameModerationReviewResponseSchema,
  NameModerationRosterSchema,
  NameModerationRuleMutationResponseSchema,
  NameModerationSettingsResponseSchema,
  NameModerationSettingsSchema,
  NameModerationVisibilityResponseSchema,
} from '@quiz/contracts';
import { ManualScheduler } from '@quiz/live-adapters';
import { AUTH, boot, command, createSession, rt, runUntil, tempDbPath, type Harness } from './helpers';

const active: Harness[] = [];
afterEach(async () => {
  for (const h of active.splice(0)) {
    await h.quiz.close().catch(() => {});
    h.store.close();
  }
});

async function acceptingSession() {
  const h = await createSession(await boot({}), { allowDemoQuestions: true });
  active.push(h);
  expect((await command(h, { type: 'OPEN_LOBBY' })).status).toBe(200);
  expect((await command(h, { type: 'START_ROUND' })).status).toBe(200);
  runUntil(h, () => rt(h).engine.state === 'ACCEPTING');
  return h;
}

describe('lọc tên live và API quản trị', () => {
  it('giữ tên gốc ngoài DB/public WS và chỉ trả raw name qua roster admin có token', async () => {
    const h = await acceptingSession();
    const runtime = rt(h);
    const publicBatches: string[] = [];
    runtime.subscribe((batch) => {
      for (const item of batch) if (item.audience === 'public') publicBatches.push(JSON.stringify(item.message));
    });

    const correct = runtime.adminSnapshot().current!.correctOptionId;
    expect(runtime.ingest({ source: 'MOCK', userId: 'bad-name', displayName: 'd1t User', text: correct, eventId: 'nf-1' })).toEqual({ accepted: true });
    const playerId = h.store.findPlayerId('MOCK', 'bad-name')!;
    const persisted = h.store.raw.prepare('SELECT display_name AS name FROM players WHERE id = ?').get(playerId) as { name: string };
    expect(persisted.name).toBe('Người chơi 1');

    runUntil(h, () => runtime.engine.state === 'REVEAL');
    const publicSnapshot = runtime.publicSnapshot();
    const entry = publicSnapshot.leaderboard!.entries[0]!;
    expect(entry.safeDisplayName).toBe('Người chơi 1');
    expect(entry).not.toHaveProperty('displayName');
    expect(entry.playerId).not.toBe(playerId);
    const publicPayloads = [JSON.stringify(publicSnapshot), ...publicBatches].join('\n');
    expect(publicPayloads).not.toContain('d1t User');
    expect(publicPayloads).not.toContain('MOCK:bad-name');
    expect(publicPayloads).not.toContain('bad-name');

    expect((await h.quiz.app.inject({ method: 'GET', url: '/api/admin/name-filter' })).statusCode).toBe(401);
    expect((await h.quiz.app.inject({ method: 'GET', url: '/api/admin/name-filter/players' })).statusCode).toBe(401);
    expect((await h.quiz.app.inject({ method: 'POST', url: '/api/admin/name-filter/recheck' })).statusCode).toBe(401);

    const settings = await h.quiz.app.inject({ method: 'GET', url: '/api/admin/name-filter', headers: AUTH });
    expect(settings.statusCode).toBe(200);
    expect(settings.json()).toMatchObject({ version: 0, playerNameSpeech: 'UNSUPPORTED' });
    expect(settings.json().protectedEntities[0]).toMatchObject({
      source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT',
    });
    expect(settings.json().rules).toEqual([]); // System defaults are not exposed by this endpoint yet.
    expect(NameModerationSettingsSchema.safeParse(settings.json()).success).toBe(true);
    expect(NameModerationSettingsResponseSchema.safeParse(settings.json()).success).toBe(true);

    const roster = await h.quiz.app.inject({ method: 'GET', url: '/api/admin/name-filter/players?q=d1t&risk=HIGH', headers: AUTH });
    expect(roster.statusCode).toBe(200);
    expect(NameModerationRosterSchema.safeParse(roster.json()).success).toBe(true);
    expect(roster.json()).toMatchObject({
      policyVersion: 0,
      players: [{
        playerId,
        rawDisplayName: 'd1t User',
        safeDisplayName: 'Người chơi 1',
        risk: 'HIGH',
        displayAction: 'ALIAS',
        matchedRuleGroups: ['PROFANITY'],
        requiresReview: true,
        hidden: false,
        reviewAllowed: false,
        rank: 1,
        score: expect.any(Number),
      }],
    });
    expect(roster.json().players[0]?.playerId).toBe(playerId);
    expect(JSON.stringify(h.store.raw.prepare('SELECT entries_json AS json FROM leaderboard_snapshots').all())).not.toContain('d1t User');
    expect(JSON.stringify(h.store.raw.prepare('SELECT payload_json AS json FROM outbox_events').all())).not.toContain('d1t User');
  });

  it('ẩn hàng loạt, cho phép REVIEW, thêm luật/ngoại lệ và phát lại snapshot ngay', async () => {
    const h = await acceptingSession();
    const runtime = rt(h);
    const correct = runtime.adminSnapshot().current!.correctOptionId;
    expect(runtime.ingest({ source: 'MOCK', userId: 'clean-name', displayName: 'Ngọc', text: correct, eventId: 'nf-clean' })).toEqual({ accepted: true });
    expect(runtime.ingest({ source: 'MOCK', userId: 'brand-name', displayName: 'Garena', text: correct, eventId: 'nf-brand' })).toEqual({ accepted: true });
    runUntil(h, () => runtime.engine.state === 'REVEAL');

    const cleanId = h.store.findPlayerId('MOCK', 'clean-name')!;
    const brandId = h.store.findPlayerId('MOCK', 'brand-name')!;
    const hide = await h.quiz.app.inject({
      method: 'POST', url: '/api/admin/name-filter/players/visibility', headers: AUTH,
      payload: { playerIds: [cleanId], hidden: true },
    });
    expect(hide.statusCode).toBe(200);
    expect(NameModerationVisibilityResponseSchema.safeParse(hide.json()).success).toBe(true);
    expect(hide.json()).not.toHaveProperty('players'); // Re-fetch the roster after mutation.
    expect(runtime.publicSnapshot().leaderboard!.entries.some((entry) => entry.safeDisplayName === 'Người chơi 1')).toBe(true);
    expect(runtime.publicSnapshot().leaderboard!.entries.some((entry) => entry.safeDisplayName === 'Người chơi 2')).toBe(true);

    const allow = await h.quiz.app.inject({
      method: 'POST', url: '/api/admin/name-filter/players/review', headers: AUTH,
      payload: { playerIds: [brandId], allowed: true },
    });
    expect(allow.statusCode).toBe(200);
    expect(NameModerationReviewResponseSchema.safeParse(allow.json()).success).toBe(true);
    expect(runtime.publicSnapshot().leaderboard!.entries.some((entry) => entry.safeDisplayName === 'Garena')).toBe(true);

    const rule = await h.quiz.app.inject({
      method: 'POST', url: '/api/admin/name-filter/rules', headers: AUTH,
      payload: { term: 'championx', aliases: [], match: 'word', group: 'PROFANITY', severity: 'HIGH' },
    });
    expect(rule.statusCode).toBe(200);
    expect(NameModerationRuleMutationResponseSchema.safeParse(rule.json()).success).toBe(true);
    const ruleId = rule.json().rules.find((item: { id: string }) => item.id.startsWith('custom.'))!.id as string;
    expect(rule.json().rules.find((item: { id: string }) => item.id === ruleId)).toMatchObject({
      source: 'CUSTOM', severity: 'HIGH', term: 'championx',
    });
    const exception = await h.quiz.app.inject({
      method: 'POST', url: '/api/admin/name-filter/exceptions', headers: AUTH,
      payload: { value: 'CleanChampionX', ruleIds: [ruleId] },
    });
    expect(exception.statusCode).toBe(200);
    expect(NameModerationExceptionMutationResponseSchema.safeParse(exception.json()).success).toBe(true);
    expect(exception.json().whitelist[0]).toMatchObject({ value: 'CleanChampionX', ruleIds: [ruleId] });
    expect(exception.json().whitelist[0]).not.toHaveProperty('id');

    const recheck = await h.quiz.app.inject({ method: 'POST', url: '/api/admin/name-filter/recheck', headers: AUTH, payload: {} });
    expect(recheck.statusCode).toBe(200);
    expect(recheck.json()).toMatchObject({ policyVersion: 4, checked: expect.any(Number), changed: expect.any(Number), flagged: expect.any(Number) });

    const audit = await h.quiz.app.inject({ method: 'GET', url: '/api/admin/name-filter/audit', headers: AUTH });
    expect(audit.statusCode).toBe(200);
    expect(NameModerationAuditResponseSchema.safeParse(audit.json()).success).toBe(true);
    expect(NameModerationAuditQuerySchema.parse({ limit: '1' })).toEqual({ limit: 1 });
    const oneAuditEntry = await h.quiz.app.inject({ method: 'GET', url: '/api/admin/name-filter/audit?limit=1', headers: AUTH });
    expect(NameModerationAuditResponseSchema.safeParse(oneAuditEntry.json()).success).toBe(true);
    expect(oneAuditEntry.json().entries).toHaveLength(1);
    const auditText = JSON.stringify(audit.json());
    expect(auditText).toContain('PLAYERS_HIDDEN');
    expect(auditText).toContain('REVIEW_ALLOWED');
    expect(auditText).not.toContain('Ngọc');
    expect(auditText).not.toContain('Garena');
  });

  it('đổi tên giữa trận giữ playerId nội bộ và vẫn an toàn sau khi server reconnect', async () => {
    const dbPath = tempDbPath();
    const h = await createSession(await boot({ dbPath }), { allowDemoQuestions: true });
    active.push(h);
    await command(h, { type: 'OPEN_LOBBY' });
    await command(h, { type: 'START_ROUND' });
    const runtime = rt(h);
    runUntil(h, () => runtime.engine.state === 'ACCEPTING');
    const firstCorrect = runtime.adminSnapshot().current!.correctOptionId;
    expect(runtime.ingest({ source: 'MOCK', userId: 'rename-user', displayName: 'Ngọc', text: firstCorrect, eventId: 'rename-1' })).toEqual({ accepted: true });
    const internalId = h.store.findPlayerId('MOCK', 'rename-user')!;

    runUntil(h, () => runtime.engine.state === 'ACCEPTING' && runtime.engine.round!.questionIndex === 1);
    const secondCorrect = runtime.adminSnapshot().current!.correctOptionId;
    expect(runtime.ingest({ source: 'MOCK', userId: 'rename-user', displayName: 'd1t User', text: secondCorrect, eventId: 'rename-2' })).toEqual({ accepted: true });
    expect(h.store.findPlayerId('MOCK', 'rename-user')).toBe(internalId);
    expect(h.store.raw.prepare('SELECT display_name AS name FROM players WHERE id = ?').get(internalId)).toMatchObject({ name: 'Người chơi 1' });
    const persistedHistory = [
      ...(h.store.raw.prepare('SELECT entries_json AS json FROM leaderboard_snapshots').all() as { json: string }[]).map((row) => row.json),
      ...(h.store.raw.prepare('SELECT payload_json AS json FROM outbox_events').all() as { json: string }[]).map((row) => row.json),
    ].join('\n');
    expect(persistedHistory).not.toContain('d1t User');

    await h.quiz.close();
    h.store.close();
    active.splice(active.indexOf(h), 1);
    const restarted = await boot({ dbPath, scheduler: new ManualScheduler(h.scheduler.now() + 10_000), seedQuestions: false });
    await restarted.quiz.recover();
    const recovered: Harness = { ...restarted, sessionId: h.sessionId };
    active.push(recovered);
    const publicText = JSON.stringify(rt(recovered).publicSnapshot());
    expect(publicText).toContain('Người chơi 1');
    expect(publicText).not.toContain('d1t User');
    expect(publicText).not.toContain('MOCK:rename-user');
  });
});
