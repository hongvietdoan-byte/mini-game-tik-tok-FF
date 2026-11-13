import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiNameModerationDataSource, createApiNameModerationPolicyDataSource, type AdminNameRoster } from './nameModerationData';

const roster: AdminNameRoster = {
  players: [{
    playerId: 'internal-1', rawDisplayName: 'Raw Name', safeDisplayName: 'Alias 01', risk: 'HIGH',
    displayAction: 'ALIAS', matchedRuleIds: ['rule-1'], matchedRuleGroups: ['IMPERSONATION'],
    requiresReview: true, hidden: false, reviewAllowed: false, policyVersion: 4, checkedAt: 123,
    rank: 1, seat: null, score: 1500,
  }],
  policyVersion: 4,
  playerNameSpeech: 'UNSUPPORTED',
};

describe('name moderation admin data source', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(roster), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('loads the private roster with the Bearer token and optional server filters', async () => {
    const source = createApiNameModerationDataSource('  admin-secret  ');

    await expect(source.loadRoster({ q: 'Raw Name', risk: 'HIGH' })).resolves.toEqual(roster);

    const [request, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request).toBe('/api/admin/name-filter/players?q=Raw+Name&risk=HIGH');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer admin-secret');
  });

  it('sends only the contract request fields for moderation mutations', async () => {
    const source = createApiNameModerationDataSource('admin-secret');

    await source.setVisibility?.(['player-1', 'player-2'], true);
    await source.setReviewAllowed?.(['player-1'], true);
    await source.recheck?.();

    expect(fetchMock.mock.calls.map(([path, init]) => [path, (init as RequestInit).method, (init as RequestInit).body])).toEqual([
      ['/api/admin/name-filter/players/visibility', 'POST', JSON.stringify({ playerIds: ['player-1', 'player-2'], hidden: true })],
      ['/api/admin/name-filter/players/review', 'POST', JSON.stringify({ playerIds: ['player-1'], allowed: true })],
      ['/api/admin/name-filter/recheck', 'POST', '{}'],
    ]);
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer admin-secret');
    }
  });

  it('refreshes the roster through the admin route and stops polling on unsubscribe', async () => {
    let tick: (() => void) | undefined;
    const clearIntervalMock = vi.fn();
    vi.stubGlobal('window', {
      setInterval: vi.fn((callback: () => void, delay: number) => {
        expect(delay).toBe(2_000);
        tick = callback;
        return 17;
      }),
      clearInterval: clearIntervalMock,
    });
    const source = createApiNameModerationDataSource('admin-secret');
    const onRoster = vi.fn();
    const unsubscribe = source.subscribe(onRoster);

    tick?.();
    await vi.waitFor(() => expect(onRoster).toHaveBeenCalledWith(roster));
    unsubscribe();
    expect(clearIntervalMock).toHaveBeenCalledWith(17);
  });

  it('uses only the published policy requests and exception rule IDs from matched rules', async () => {
    const source = createApiNameModerationPolicyDataSource('admin-secret');

    await source.addRule({ term: 'sample', aliases: [], match: 'word', group: 'PROFANITY', severity: 'HIGH' });
    await source.addException({ value: 'approved-name', ruleIds: ['matched-rule-7'] });

    expect(fetchMock.mock.calls.map(([path, init]) => [path, (init as RequestInit).method, (init as RequestInit).body])).toEqual([
      ['/api/admin/name-filter/rules', 'POST', JSON.stringify({ term: 'sample', aliases: [], match: 'word', group: 'PROFANITY', severity: 'HIGH' })],
      ['/api/admin/name-filter/exceptions', 'POST', JSON.stringify({ value: 'approved-name', ruleIds: ['matched-rule-7'] })],
    ]);
  });

  it('surfaces API failures without fabricating a roster', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'No admin token' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    }));
    const source = createApiNameModerationDataSource('bad-token');

    await expect(source.loadRoster()).rejects.toThrow('No admin token');
  });
});
