export type NameRisk = 'NONE' | 'REVIEW' | 'PARTIAL' | 'HIGH' | 'MANUAL_HIDE';
export type NameRuleGroup = 'PROFANITY' | 'NSFW_SEXUAL' | 'HATE_SPEECH' | 'ILLEGAL_HARMFUL' | 'IMPERSONATION';
export type NameDisplayAction = 'SAFE_NAME' | 'ALIAS' | 'PARTIAL_MASK';

/** Mirrors the admin-only roster contract; raw names must never enter a public snapshot. */
export type AdminNameRosterPlayer = {
  playerId: string;
  rawDisplayName: string;
  safeDisplayName: string;
  risk: NameRisk;
  displayAction: NameDisplayAction;
  matchedRuleIds: string[];
  matchedRuleGroups: NameRuleGroup[];
  requiresReview: boolean;
  hidden: boolean;
  reviewAllowed: boolean;
  policyVersion: number;
  checkedAt: number;
  rank: number | null;
  seat: { slotId: string; rowIndex: number; seatIndex: number } | null;
  score: number;
};

export type AdminNameRoster = {
  players: AdminNameRosterPlayer[];
  policyVersion: number;
  playerNameSpeech: 'UNSUPPORTED';
};

export type NameModerationRosterQuery = { q?: string; risk?: NameRisk };
export type NameModerationRuleRequest = {
  term: string;
  aliases: string[];
  match: 'word' | 'substring';
  group: NameRuleGroup;
  severity: 'PARTIAL' | 'HIGH';
  separatorInsensitive?: boolean;
};
export type NameModerationExceptionRequest = { value: string; ruleIds: string[] };

/**
 * Kept separate from PublicSnapshot on purpose: this authenticated roster contains
 * raw names and refreshes through the admin channel, independently of the overlay.
 */
export type NameModerationDataSource = {
  loadRoster: (query?: NameModerationRosterQuery) => Promise<AdminNameRoster>;
  subscribe: (onRoster: (roster: AdminNameRoster) => void, onError?: (error: Error) => void) => () => void;
  setVisibility?: (playerIds: string[], hidden: boolean) => Promise<void>;
  setReviewAllowed?: (playerIds: string[], allowed: boolean) => Promise<void>;
  recheck?: () => Promise<void>;
};

/** Policy responses remain unknown until Codex1 publishes their schemas (C-0181). */
export type NameModerationPolicyDataSource = {
  loadPolicy: () => Promise<unknown>;
  loadAudit: () => Promise<unknown>;
  addRule: (request: NameModerationRuleRequest) => Promise<unknown>;
  addException: (request: NameModerationExceptionRequest) => Promise<unknown>;
};

type ApiErrorBody = { message?: unknown };

async function adminRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers });
  const body = await response.json().catch(() => ({})) as ApiErrorBody;
  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : `Yêu cầu kiểm duyệt thất bại (${response.status}).`;
    throw new Error(message);
  }
  return body as T;
}

/** Authenticated adapter for the admin-only roster. It never reads PublicSnapshot. */
export function createApiNameModerationDataSource(token: string, pollMs = 2_000): NameModerationDataSource {
  const cleanToken = token.trim();
  const loadRoster = (query: NameModerationRosterQuery = {}) => {
    const params = new URLSearchParams();
    if (query.q?.trim()) params.set('q', query.q.trim());
    if (query.risk) params.set('risk', query.risk);
    const suffix = params.size ? `?${params.toString()}` : '';
    return adminRequest<AdminNameRoster>(cleanToken, `/api/admin/name-filter/players${suffix}`);
  };

  return {
    loadRoster,
    subscribe(onRoster, onError) {
      let active = true;
      let refreshing = false;
      const timer = window.setInterval(() => {
        if (refreshing) return;
        refreshing = true;
        void loadRoster().then((roster) => {
          if (active) onRoster(roster);
        }).catch((cause: unknown) => {
          if (active) onError?.(cause instanceof Error ? cause : new Error('Không tải được roster quản trị.'));
        }).finally(() => { refreshing = false; });
      }, pollMs);
      return () => { active = false; window.clearInterval(timer); };
    },
    async setVisibility(playerIds, hidden) {
      await adminRequest(cleanToken, '/api/admin/name-filter/players/visibility', {
        method: 'POST', body: JSON.stringify({ playerIds, hidden }),
      });
    },
    async setReviewAllowed(playerIds, allowed) {
      await adminRequest(cleanToken, '/api/admin/name-filter/players/review', {
        method: 'POST', body: JSON.stringify({ playerIds, allowed }),
      });
    },
    async recheck() {
      await adminRequest(cleanToken, '/api/admin/name-filter/recheck', { method: 'POST', body: '{}' });
    },
  };
}

/** Uses only the published policy request fields; response bodies stay opaque pending C-0181. */
export function createApiNameModerationPolicyDataSource(token: string): NameModerationPolicyDataSource {
  const cleanToken = token.trim();
  return {
    loadPolicy() {
      return adminRequest<unknown>(cleanToken, '/api/admin/name-filter');
    },
    loadAudit() {
      return adminRequest<unknown>(cleanToken, '/api/admin/name-filter/audit');
    },
    addRule(request) {
      return adminRequest<unknown>(cleanToken, '/api/admin/name-filter/rules', {
        method: 'POST', body: JSON.stringify(request),
      });
    },
    addException(request) {
      return adminRequest<unknown>(cleanToken, '/api/admin/name-filter/exceptions', {
        method: 'POST', body: JSON.stringify(request),
      });
    },
  };
}

/** Demo policy actions are applied by the dashboard's local mock state. */
export const demoNameModerationPolicyDataSource: NameModerationPolicyDataSource = {
  async loadPolicy() { return undefined; },
  async loadAudit() { return undefined; },
  async addRule(request) { return request; },
  async addException(request) { return request; },
};

export function createDemoNameRoster(now = Date.now()): AdminNameRoster {
  const players: AdminNameRosterPlayer[] = [
    { playerId: 'demo-review-001', rawDisplayName: 'Bình Minh 84', safeDisplayName: 'Người chơi 01', risk: 'REVIEW', displayAction: 'ALIAS', matchedRuleIds: ['rule-review-01'], matchedRuleGroups: ['PROFANITY'], requiresReview: true, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 85_000, rank: 1, seat: null, score: 1_500 },
    { playerId: 'demo-high-002', rawDisplayName: 'Admin Bão Tố', safeDisplayName: 'Người chơi 02', risk: 'HIGH', displayAction: 'ALIAS', matchedRuleIds: ['rule-impersonation-01'], matchedRuleGroups: ['IMPERSONATION'], requiresReview: true, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 180_000, rank: 2, seat: null, score: 1_350 },
    { playerId: 'demo-partial-003', rawDisplayName: 'Gió Lặng 09', safeDisplayName: 'Gió ••• 09', risk: 'PARTIAL', displayAction: 'PARTIAL_MASK', matchedRuleIds: ['rule-hate-01'], matchedRuleGroups: ['HATE_SPEECH'], requiresReview: true, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 310_000, rank: null, seat: { slotId: 'A-08', rowIndex: 1, seatIndex: 3 }, score: 720 },
    { playerId: 'demo-manual-004', rawDisplayName: 'Mây Xanh 24', safeDisplayName: 'Người chơi 04', risk: 'MANUAL_HIDE', displayAction: 'ALIAS', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: true, reviewAllowed: false, policyVersion: 3, checkedAt: now - 425_000, rank: null, seat: { slotId: 'A-12', rowIndex: 2, seatIndex: 2 }, score: 510 },
    { playerId: 'demo-clean-005', rawDisplayName: 'Nắng Tháng Ba', safeDisplayName: 'Người chơi 05', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 560_000, rank: 5, seat: null, score: 1_180 },
    { playerId: 'demo-clean-006', rawDisplayName: 'Mưa Nhẹ 18', safeDisplayName: 'Người chơi 06', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 690_000, rank: null, seat: { slotId: 'A-14', rowIndex: 2, seatIndex: 4 }, score: 120 },
    { playerId: 'demo-clean-007', rawDisplayName: 'Tháng Tư 27', safeDisplayName: 'Người chơi 07', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 760_000, rank: 8, seat: null, score: 1_100 },
    { playerId: 'demo-clean-008', rawDisplayName: 'Trăng Non', safeDisplayName: 'Người chơi 08', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 815_000, rank: null, seat: { slotId: 'A-19', rowIndex: 3, seatIndex: 4 }, score: 85 },
  ];
  return { players, policyVersion: 3, playerNameSpeech: 'UNSUPPORTED' };
}

export const demoNameModerationDataSource: NameModerationDataSource = {
  async loadRoster() {
    return createDemoNameRoster();
  },
  subscribe() {
    // The real source will use codex1's authenticated admin refresh channel.
    return () => undefined;
  },
};
