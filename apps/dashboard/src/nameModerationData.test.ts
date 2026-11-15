import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApiNameModerationDataSource,
  createApiNameModerationPolicyDataSource,
  moderatedNameOnLive,
  type AdminNameRoster,
  type NameModerationAuditResponse,
  type NameModerationConfigMutationResponse,
  type NameModerationSettingsResponse,
} from './nameModerationData';

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

const settings: NameModerationSettingsResponse = {
  rules: [{ id: 'custom.rule1', term: 'sample', aliases: [], match: 'word', group: 'PROFANITY', severity: 'HIGH', source: 'CUSTOM' }],
  whitelist: [{ value: 'allowed-name', ruleIds: ['custom.rule1'] }],
  version: 4,
  protectedEntities: [{ id: 'brand1', label: 'Storm Arena', aliases: ['Storm Arena'], kind: 'BRAND', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' }],
  playerNameSpeech: 'UNSUPPORTED',
  hiddenPlayerIds: ['player-1'],
  allowedReviewPlayerIds: ['player-2'],
  verifiedOfficialAccounts: [{ source: 'MOCK', stableUserId: 'mock-user', entityId: 'brand1' }],
};
const mutation: NameModerationConfigMutationResponse = {
  rules: settings.rules, whitelist: settings.whitelist, hiddenPlayerIds: settings.hiddenPlayerIds,
  allowedReviewPlayerIds: settings.allowedReviewPlayerIds, verifiedOfficialAccounts: settings.verifiedOfficialAccounts, version: 4,
};
const audit: NameModerationAuditResponse = {
  entries: [{ id: 'audit-1', at: 1_700_000_000_000, actor: 'operator', action: 'PLAYERS_HIDDEN', policyVersion: 4, targetCount: 1 }],
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

  it('keeps a normal roster name even if a stale safe-name value contains an alias', () => {
    expect(moderatedNameOnLive({
      rawDisplayName: 'Tên bình thường', safeDisplayName: 'Người chơi 05', risk: 'NONE', displayAction: 'ALIAS', hidden: false,
    })).toBe('Tên bình thường');
    expect(moderatedNameOnLive({
      rawDisplayName: 'Tên cần ẩn', safeDisplayName: 'Người chơi 06', risk: 'NONE', displayAction: 'SAFE_NAME', hidden: true,
    })).toBe('Người chơi 06');
  });

  it('loads the private roster with the Bearer token and optional server filters', async () => {
    const source = createApiNameModerationDataSource('  admin-secret  ');

    await expect(source.loadRoster({ q: 'Raw Name', risk: 'HIGH' })).resolves.toEqual(roster);

    const [request, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request).toBe('/api/admin/name-filter/players?q=Raw+Name&risk=HIGH');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer admin-secret');
  });

  it('validates the authenticated roster with the shared C-0181 contract schema', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ...roster, policyVersion: -1 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const source = createApiNameModerationDataSource('admin-secret');

    await expect(source.loadRoster()).rejects.toThrow('NameModerationRosterSchema');
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
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(mutation), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })));
    const source = createApiNameModerationPolicyDataSource('admin-secret');

    await source.addRule({ term: 'sample', aliases: [], match: 'word', group: 'PROFANITY', severity: 'HIGH' });
    await source.addException({ value: 'approved-name', ruleIds: ['matched-rule-7'] });

    expect(fetchMock.mock.calls.map(([path, init]) => [path, (init as RequestInit).method, (init as RequestInit).body])).toEqual([
      ['/api/admin/name-filter/rules', 'POST', JSON.stringify({ term: 'sample', aliases: [], match: 'word', group: 'PROFANITY', severity: 'HIGH' })],
      ['/api/admin/name-filter/exceptions', 'POST', JSON.stringify({ value: 'approved-name', ruleIds: ['matched-rule-7'] })],
    ]);
  });

  it('parses the full C-0181 settings response and newest-first audit response', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(settings), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(audit), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const source = createApiNameModerationPolicyDataSource('admin-secret');

    await expect(source.loadPolicy()).resolves.toEqual(settings);
    await expect(source.loadAudit()).resolves.toEqual(audit);

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/admin/name-filter', '/api/admin/name-filter/audit?limit=100',
    ]);
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer admin-secret');
    }
  });

  it('updates the full policy through the settings route and validates its response schema', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(settings), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const source = createApiNameModerationPolicyDataSource('admin-secret');
    const request = {
      rules: settings.rules, whitelist: settings.whitelist, hiddenPlayerIds: settings.hiddenPlayerIds,
      allowedReviewPlayerIds: settings.allowedReviewPlayerIds, verifiedOfficialAccounts: settings.verifiedOfficialAccounts,
    };

    await expect(source.updatePolicy(request)).resolves.toEqual(settings);
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/admin/name-filter');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify(request));
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer admin-secret');
  });

  it('rejects responses that confuse full settings with mutation config or omit audit fields', async () => {
    const source = createApiNameModerationPolicyDataSource('admin-secret');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(mutation), { status: 200 }));
    await expect(source.loadPolicy()).rejects.toThrow('NameModerationSettingsResponseSchema');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ entries: [{ id: 'audit-1' }] }), { status: 200 }));
    await expect(source.loadAudit()).rejects.toThrow('NameModerationAuditResponseSchema');
  });

  it('surfaces API failures without fabricating a roster', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'No admin token' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    }));
    const source = createApiNameModerationDataSource('bad-token');

    await expect(source.loadRoster()).rejects.toThrow('No admin token');
  });
});
