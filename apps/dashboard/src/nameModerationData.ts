import {
  NameModerationAuditResponseSchema,
  NameModerationConfigMutationResponseSchema,
  NameModerationRosterSchema,
  NameModerationSettingsResponseSchema,
} from '@quiz/contracts';
import type {
  NameFilterDisplayAction,
  NameFilterRisk,
  NameFilterRuleGroup,
  NameModerationAuditEntry as ContractNameModerationAuditEntry,
  NameModerationAuditResponse as ContractNameModerationAuditResponse,
  NameModerationConfigMutationResponse as ContractNameModerationConfigMutationResponse,
  NameModerationExceptionRequest as ContractNameModerationExceptionRequest,
  NameModerationPlayer,
  NameModerationRoster,
  NameModerationRule,
  NameModerationRuleRequest as ContractNameModerationRuleRequest,
  NameModerationSettingsResponse as ContractNameModerationSettingsResponse,
  NameModerationWhitelist,
} from '@quiz/contracts';

export type NameRisk = NameFilterRisk;
export type NameRuleGroup = NameFilterRuleGroup;
export type NameDisplayAction = NameFilterDisplayAction;
export type AdminNameRosterPlayer = NameModerationPlayer;
export type AdminNameRoster = NameModerationRoster;

/** Ordinary names stay as entered; flagged or manually hidden names use the server-safe value. */
export function moderatedNameOnLive(player: Pick<AdminNameRosterPlayer, 'rawDisplayName' | 'safeDisplayName' | 'risk' | 'displayAction' | 'hidden'>) {
  return !player.hidden && (player.risk === 'NONE' || player.displayAction === 'SAFE_NAME')
    ? player.rawDisplayName : player.safeDisplayName;
}

export type NameModerationRosterQuery = { q?: string; risk?: NameRisk };
export type NameModerationRuleRequest = ContractNameModerationRuleRequest;
export type NameModerationExceptionRequest = ContractNameModerationExceptionRequest;
export type NameModerationAuditEntry = ContractNameModerationAuditEntry;
export type NameModerationAuditResponse = ContractNameModerationAuditResponse;
export type NameModerationConfigMutationResponse = ContractNameModerationConfigMutationResponse;
export type NameModerationSettingsResponse = ContractNameModerationSettingsResponse;
export type NameModerationPolicyRule = NameModerationRule;
export type NameModerationWhitelistEntry = NameModerationWhitelist;
export type NameModerationPolicyUpdate = Pick<NameModerationSettingsResponse,
  'rules' | 'whitelist' | 'hiddenPlayerIds' | 'allowedReviewPlayerIds' | 'verifiedOfficialAccounts'>;

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

/** Typed C-0181 policy responses; adapter validates all API bodies before returning them. */
export type NameModerationPolicyDataSource = {
  loadPolicy: () => Promise<NameModerationSettingsResponse>;
  loadAudit: () => Promise<NameModerationAuditResponse>;
  updatePolicy: (request: NameModerationPolicyUpdate) => Promise<NameModerationSettingsResponse>;
  addRule: (request: NameModerationRuleRequest) => Promise<NameModerationConfigMutationResponse>;
  addException: (request: NameModerationExceptionRequest) => Promise<NameModerationConfigMutationResponse>;
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

/** Runtime validation delegates to the canonical full C-0181 schema in contracts. */
export function parseNameModerationSettingsResponse(value: unknown): NameModerationSettingsResponse {
  const result = NameModerationSettingsResponseSchema.safeParse(value);
  if (!result.success) throw new Error('Phản hồi policy không đúng NameModerationSettingsResponseSchema (C-0181).');
  return result.data;
}

/** Runtime validation delegates to the canonical C-0181 mutation schema. */
export function parseNameModerationConfigMutationResponse(value: unknown): NameModerationConfigMutationResponse {
  const result = NameModerationConfigMutationResponseSchema.safeParse(value);
  if (!result.success) throw new Error('Phản hồi thao tác không đúng NameModerationConfigMutationResponseSchema (C-0181).');
  return result.data;
}

export function parseNameModerationAuditResponse(value: unknown): NameModerationAuditResponse {
  const result = NameModerationAuditResponseSchema.safeParse(value);
  if (!result.success) throw new Error('Phản hồi audit không đúng NameModerationAuditResponseSchema (C-0181).');
  return result.data;
}

export function parseAdminNameRoster(value: unknown): AdminNameRoster {
  const result = NameModerationRosterSchema.safeParse(value);
  if (!result.success) throw new Error('Phản hồi roster không đúng NameModerationRosterSchema (C-0181).');
  return result.data;
}

/** Authenticated adapter for the admin-only roster. It never reads PublicSnapshot. */
export function createApiNameModerationDataSource(token: string, pollMs = 2_000): NameModerationDataSource {
  const cleanToken = token.trim();
  const loadRoster = (query: NameModerationRosterQuery = {}) => {
    const params = new URLSearchParams();
    if (query.q?.trim()) params.set('q', query.q.trim());
    if (query.risk) params.set('risk', query.risk);
    const suffix = params.size ? `?${params.toString()}` : '';
    return adminRequest<unknown>(cleanToken, `/api/admin/name-filter/players${suffix}`).then(parseAdminNameRoster);
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

/** Uses the C-0181 settings, mutation, and audit response shapes. */
export function createApiNameModerationPolicyDataSource(token: string): NameModerationPolicyDataSource {
  const cleanToken = token.trim();
  return {
    async loadPolicy() {
      return parseNameModerationSettingsResponse(await adminRequest<unknown>(cleanToken, '/api/admin/name-filter'));
    },
    async loadAudit() {
      return parseNameModerationAuditResponse(await adminRequest<unknown>(cleanToken, '/api/admin/name-filter/audit?limit=100'));
    },
    async updatePolicy(request) {
      return parseNameModerationSettingsResponse(await adminRequest<unknown>(cleanToken, '/api/admin/name-filter', {
        method: 'PUT', body: JSON.stringify(request),
      }));
    },
    async addRule(request) {
      return parseNameModerationConfigMutationResponse(await adminRequest<unknown>(cleanToken, '/api/admin/name-filter/rules', {
        method: 'POST', body: JSON.stringify(request),
      }));
    },
    async addException(request) {
      return parseNameModerationConfigMutationResponse(await adminRequest<unknown>(cleanToken, '/api/admin/name-filter/exceptions', {
        method: 'POST', body: JSON.stringify(request),
      }));
    },
  };
}

/** Demo policy actions are applied by the dashboard's local mock state. */
export const demoNameModerationPolicyDataSource: NameModerationPolicyDataSource = {
  async loadPolicy() { return { rules: [], whitelist: [], version: 0, protectedEntities: [], playerNameSpeech: 'UNSUPPORTED', hiddenPlayerIds: [], allowedReviewPlayerIds: [], verifiedOfficialAccounts: [] }; },
  async loadAudit() { return { entries: [] }; },
  async updatePolicy(request) { return { ...request, version: 0, protectedEntities: [], playerNameSpeech: 'UNSUPPORTED' }; },
  async addRule() { return { rules: [], whitelist: [], hiddenPlayerIds: [], allowedReviewPlayerIds: [], verifiedOfficialAccounts: [], version: 0 }; },
  async addException() { return { rules: [], whitelist: [], hiddenPlayerIds: [], allowedReviewPlayerIds: [], verifiedOfficialAccounts: [], version: 0 }; },
};

export function createDemoNameRoster(now = Date.now()): AdminNameRoster {
  const players: AdminNameRosterPlayer[] = [
    { playerId: 'demo-review-001', rawDisplayName: 'Bình Minh 84', safeDisplayName: 'Người chơi 01', risk: 'REVIEW', displayAction: 'ALIAS', matchedRuleIds: ['rule-review-01'], matchedRuleGroups: ['PROFANITY'], requiresReview: true, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 85_000, rank: 1, seat: null, score: 1_500 },
    { playerId: 'demo-high-002', rawDisplayName: 'Admin Bão Tố', safeDisplayName: 'Người chơi 02', risk: 'HIGH', displayAction: 'ALIAS', matchedRuleIds: ['rule-impersonation-01'], matchedRuleGroups: ['IMPERSONATION'], requiresReview: true, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 180_000, rank: 2, seat: null, score: 1_350 },
    { playerId: 'demo-partial-003', rawDisplayName: 'Gió Lặng 09', safeDisplayName: 'Gió ••• 09', risk: 'PARTIAL', displayAction: 'PARTIAL_MASK', matchedRuleIds: ['rule-hate-01'], matchedRuleGroups: ['HATE_SPEECH'], requiresReview: true, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 310_000, rank: null, seat: { slotId: 'A-08', rowIndex: 1, seatIndex: 3 }, score: 720 },
    { playerId: 'demo-manual-004', rawDisplayName: 'Mây Xanh 24', safeDisplayName: 'Người chơi 04', risk: 'MANUAL_HIDE', displayAction: 'ALIAS', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: true, reviewAllowed: false, policyVersion: 3, checkedAt: now - 425_000, rank: null, seat: { slotId: 'A-12', rowIndex: 2, seatIndex: 2 }, score: 510 },
    { playerId: 'demo-clean-005', rawDisplayName: 'Nắng Tháng Ba', safeDisplayName: 'Nắng Tháng Ba', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 560_000, rank: 5, seat: null, score: 1_180 },
    { playerId: 'demo-clean-006', rawDisplayName: 'Mưa Nhẹ 18', safeDisplayName: 'Mưa Nhẹ 18', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 690_000, rank: null, seat: { slotId: 'A-14', rowIndex: 2, seatIndex: 4 }, score: 120 },
    { playerId: 'demo-clean-007', rawDisplayName: 'Tháng Tư 27', safeDisplayName: 'Tháng Tư 27', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 760_000, rank: 8, seat: null, score: 1_100 },
    { playerId: 'demo-clean-008', rawDisplayName: 'Trăng Non', safeDisplayName: 'Trăng Non', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 815_000, rank: null, seat: { slotId: 'A-19', rowIndex: 3, seatIndex: 4 }, score: 85 },
    { playerId: 'demo-clean-009', rawDisplayName: 'Sương Sớm 09', safeDisplayName: 'Sương Sớm 09', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 860_000, rank: 3, seat: null, score: 1_300 },
    { playerId: 'demo-clean-010', rawDisplayName: 'Mây Trắng 10', safeDisplayName: 'Mây Trắng 10', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 905_000, rank: 4, seat: null, score: 1_250 },
    { playerId: 'demo-clean-011', rawDisplayName: 'Biển Xanh 11', safeDisplayName: 'Biển Xanh 11', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 950_000, rank: 6, seat: null, score: 1_150 },
    { playerId: 'demo-clean-012', rawDisplayName: 'Đồi Gió 12', safeDisplayName: 'Đồi Gió 12', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 995_000, rank: 7, seat: null, score: 1_120 },
    { playerId: 'demo-clean-013', rawDisplayName: 'Nắng Mai 13', safeDisplayName: 'Nắng Mai 13', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 1_040_000, rank: 9, seat: null, score: 1_050 },
    { playerId: 'demo-clean-014', rawDisplayName: 'Gió Nhẹ 14', safeDisplayName: 'Gió Nhẹ 14', risk: 'NONE', displayAction: 'SAFE_NAME', matchedRuleIds: [], matchedRuleGroups: [], requiresReview: false, hidden: false, reviewAllowed: false, policyVersion: 3, checkedAt: now - 1_085_000, rank: 10, seat: null, score: 1_020 },
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
