import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import {
  filterPlayerName,
  DEFAULT_NAME_FILTER_RULES,
  DEFAULT_PROTECTED_ENTITIES,
  NAME_RULE_GROUPS,
  type NameFilterConfig,
  type NameFilterRule,
  type NameFilterUpdate,
  type NameModerationResult,
  type ProtectedEntity,
  type ScopedWhitelistEntry,
} from '@quiz/name-filter';

const RULE_ID = /^[a-z0-9][a-z0-9._-]{1,79}$/u;
export const NameFilterRuleSchema = z.object({
  id: z.string().regex(RULE_ID),
  term: z.string().trim().min(1).max(64).refine((value) => !/[<>]/u.test(value), 'Không được chứa HTML.'),
  aliases: z.array(z.string().trim().min(1).max(64).refine((value) => !/[<>]/u.test(value))).max(20).default([]),
  match: z.enum(['word', 'substring']),
  group: z.enum(NAME_RULE_GROUPS),
  severity: z.enum(['PARTIAL', 'HIGH']),
  source: z.enum(['SYSTEM', 'CUSTOM']),
  separatorInsensitive: z.boolean().optional(),
}).strict();
export const NameFilterWhitelistSchema = z.object({
  value: z.string().trim().min(1).max(80).refine((value) => !/[<>]/u.test(value), 'Không được chứa HTML.'),
  ruleIds: z.array(z.string().regex(RULE_ID)).min(1).max(100),
}).strict();
export const VerifiedOfficialAccountSchema = z.object({
  source: z.enum(['TIKTOK', 'MOCK']),
  stableUserId: z.string().trim().min(1).max(200).refine((value) => !/[<>\\s]/u.test(value)),
  entityId: z.string().trim().min(1).max(80),
}).strict();
const NameFilterUpdateShape = z.object({
  rules: z.array(NameFilterRuleSchema).max(200),
  whitelist: z.array(NameFilterWhitelistSchema).max(500),
  hiddenPlayerIds: z.array(z.string().trim().min(1).max(240)).max(500),
  allowedReviewPlayerIds: z.array(z.string().trim().min(1).max(240)).max(500).default([]),
  verifiedOfficialAccounts: z.array(VerifiedOfficialAccountSchema).max(200).default([]),
}).strict();
export const NameFilterUpdateSchema = NameFilterUpdateShape.superRefine((value, ctx) => {
  value.rules.forEach((rule, index) => {
    if (rule.source !== 'CUSTOM' || (!rule.id.startsWith('custom.') && !rule.id.startsWith('migrated.')))
      ctx.addIssue({ code: 'custom', path: ['rules', index], message: 'Chỉ được cập nhật luật tuỳ chỉnh.' });
  });
});
export const NameFilterConfigSchema = NameFilterUpdateShape.extend({
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();
export const NameFilterVisibilitySchema = z.object({
  playerIds: z.array(z.string().trim().min(1).max(240)).min(1).max(500),
  hidden: z.boolean(),
}).strict();
export const NameFilterAllowReviewSchema = z.object({
  playerIds: z.array(z.string().trim().min(1).max(240)).min(1).max(500),
  allowed: z.boolean(),
}).strict();
export const NameFilterCustomRuleSchema = NameFilterRuleSchema.omit({ id: true, source: true }).strict();
export const NameFilterExceptionSchema = z.object({
  value: NameFilterWhitelistSchema.shape.value,
  ruleIds: NameFilterWhitelistSchema.shape.ruleIds,
}).strict();
export const NameFilterOfficialAccountSchema = VerifiedOfficialAccountSchema;
export type NameFilterVisibility = z.infer<typeof NameFilterVisibilitySchema>;

export const DEFAULT_NAME_FILTER_CONFIG: NameFilterConfig = {
  rules: [],
  whitelist: [],
  hiddenPlayerIds: [],
  allowedReviewPlayerIds: [],
  verifiedOfficialAccounts: [],
  version: 0,
};

type AliasRegistry = { nextNumber: number; byPlayerId: Record<string, number> };
type NameFilterAuditEntry = {
  id: string;
  at: number;
  actor: string;
  action: string;
  policyVersion: number;
  targetCount: number;
  ruleId?: string;
};

function cloneConfig(config: NameFilterConfig): NameFilterConfig {
  return {
    ...config,
    rules: config.rules.map((rule) => ({ ...rule, aliases: [...(rule.aliases ?? [])] })),
    whitelist: config.whitelist.map((entry) => ({ value: entry.value, ruleIds: [...entry.ruleIds] })),
    hiddenPlayerIds: [...config.hiddenPlayerIds],
    allowedReviewPlayerIds: [...config.allowedReviewPlayerIds],
    verifiedOfficialAccounts: config.verifiedOfficialAccounts.map((entry) => ({ ...entry })),
  };
}

function atomicWrite(path: string, data: string) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = join(dirname(path), '.name-filter.' + process.pid + '.' + randomUUID() + '.tmp');
  try {
    writeFileSync(temp, data, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    renameSync(temp, path);
  } finally {
    rmSync(temp, { force: true });
  }
}

function migrateLegacy(value: unknown): NameFilterConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const legacy = value as Record<string, unknown>;
  if (!Array.isArray(legacy.rules) || !Array.isArray(legacy.whitelist) || !Array.isArray(legacy.hiddenPlayerIds)) return null;
  const groupMap: Record<string, NameFilterRule['group']> = {
    PROFANITY: 'PROFANITY', INSULT: 'PROFANITY', DISCRIMINATION: 'HATE_SPEECH',
    POLITICAL: 'ILLEGAL_HARMFUL', IMPERSONATION: 'IMPERSONATION', CUSTOM: 'PROFANITY',
  };
  const rules = legacy.rules.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const old = item as Record<string, unknown>;
    const parsed = NameFilterRuleSchema.safeParse({
      id: 'migrated.rule.' + index,
      term: old.term,
      aliases: [],
      match: old.match,
      group: groupMap[String(old.category)] ?? 'PROFANITY',
      severity: String(old.category) === 'INSULT' ? 'PARTIAL' : 'HIGH',
      source: 'CUSTOM',
    });
    return parsed.success ? [parsed.data] : [];
  });
  const legacyWhitelist = legacy.whitelist.flatMap((value) =>
    typeof value === 'string' && rules.length ? [{ value, ruleIds: rules.map((rule) => rule.id) }] : [],
  );
  const candidate = {
    rules,
    whitelist: legacyWhitelist,
    hiddenPlayerIds: legacy.hiddenPlayerIds.filter((id): id is string => typeof id === 'string'),
    allowedReviewPlayerIds: [],
    verifiedOfficialAccounts: [],
    version: Number.isSafeInteger(legacy.version) && Number(legacy.version) >= 0 ? Number(legacy.version) : 0,
  };
  const parsed = NameFilterConfigSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function parseConfig(raw: string): NameFilterConfig {
  const parsedJson: unknown = JSON.parse(raw);
  const parsed = NameFilterConfigSchema.safeParse(parsedJson);
  if (parsed.success) return parsed.data;
  const migrated = migrateLegacy(parsedJson);
  return migrated ?? cloneConfig(DEFAULT_NAME_FILTER_CONFIG);
}

export class NameFilterStore {
  readonly path: string;
  readonly aliasPath: string;
  readonly auditPath: string;
  private current: NameFilterConfig;
  private aliases: AliasRegistry;
  private audit: NameFilterAuditEntry[];
  private rawFlaggedNames = new Map<string, string>();
  private readonly now: () => number;
  private readonly protectedEntities: readonly ProtectedEntity[];

  constructor(dataDir: string, options: { now?: () => number; protectedEntities?: readonly ProtectedEntity[] } = {}) {
    this.path = join(dataDir, 'name-filter.json');
    this.aliasPath = join(dataDir, 'name-filter-aliases.json');
    this.auditPath = join(dataDir, 'name-filter-audit.json');
    this.now = options.now ?? Date.now;
    this.protectedEntities = options.protectedEntities ?? DEFAULT_PROTECTED_ENTITIES;
    this.current = this.load();
    this.aliases = this.loadAliases();
    this.audit = this.loadAudit();
  }

  private load(): NameFilterConfig {
    try {
      const raw = readFileSync(this.path, 'utf8');
      const config = parseConfig(raw);
      // Persist the validated migration atomically without retaining the legacy raw format.
      if (JSON.stringify(config) !== JSON.stringify(JSON.parse(raw)))
        atomicWrite(this.path, JSON.stringify(config, null, 2) + '\n');
      return config;
    } catch {
      return cloneConfig(DEFAULT_NAME_FILTER_CONFIG);
    }
  }

  private loadAliases(): AliasRegistry {
    try {
      const raw = JSON.parse(readFileSync(this.aliasPath, 'utf8')) as Partial<AliasRegistry>;
      const byPlayerId = Object.fromEntries(Object.entries(raw.byPlayerId ?? {}).filter(([, number]) =>
        Number.isSafeInteger(number) && Number(number) > 0,
      )) as Record<string, number>;
      const max = Math.max(0, ...Object.values(byPlayerId));
      return { nextNumber: Math.max(max + 1, Number.isSafeInteger(raw.nextNumber) ? Number(raw.nextNumber) : 1), byPlayerId };
    } catch {
      return { nextNumber: 1, byPlayerId: {} };
    }
  }

  private loadAudit(): NameFilterAuditEntry[] {
    try {
      const parsed = JSON.parse(readFileSync(this.auditPath, 'utf8')) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item) => this.isAuditEntry(item)).slice(-1_000) : [];
    } catch {
      return [];
    }
  }

  private isAuditEntry(value: unknown): value is NameFilterAuditEntry {
    if (!value || typeof value !== 'object') return false;
    const item = value as Record<string, unknown>;
    return typeof item.id === 'string' && typeof item.at === 'number' && typeof item.actor === 'string' &&
      typeof item.action === 'string' && typeof item.policyVersion === 'number' && typeof item.targetCount === 'number';
  }

  get(): NameFilterConfig {
    return cloneConfig(this.current);
  }

  getPublicSettings() {
    return {
      rules: this.current.rules.map((rule) => ({ ...rule, aliases: [...(rule.aliases ?? [])] })),
      whitelist: this.current.whitelist.map((entry) => ({ ...entry, ruleIds: [...entry.ruleIds] })),
      version: this.current.version,
      protectedEntities: this.protectedEntities.map((entity) => ({ ...entity, aliases: [...entity.aliases] })),
      playerNameSpeech: 'UNSUPPORTED' as const,
    };
  }

  getAdminSettings() {
    return {
      ...this.getPublicSettings(),
      hiddenPlayerIds: [...this.current.hiddenPlayerIds],
      allowedReviewPlayerIds: [...this.current.allowedReviewPlayerIds],
      verifiedOfficialAccounts: this.current.verifiedOfficialAccounts.map((entry) => ({ ...entry })),
    };
  }

  evaluate(name: string, playerId: string | null, checkedAt = this.now()): NameModerationResult {
    return filterPlayerName(name, playerId, this.current, DEFAULT_NAME_FILTER_RULES, {
      alias: () => this.aliasFor(playerId),
      checkedAt,
      protectedEntities: this.protectedEntities,
    });
  }

  rememberFlaggedName(playerId: string, originalName: string) {
    this.rawFlaggedNames.set(playerId, originalName);
  }

  forgetFlaggedName(playerId: string) {
    this.rawFlaggedNames.delete(playerId);
  }

  rawFlaggedName(playerId: string): string | undefined {
    return this.rawFlaggedNames.get(playerId);
  }

  flaggedNameEntries() {
    return [...this.rawFlaggedNames.entries()].map(([playerId, originalName]) => ({ playerId, originalName }));
  }

  aliasFor(playerId: string | null): string {
    if (!playerId) return 'Người chơi';
    let number = this.aliases.byPlayerId[playerId];
    if (!number) {
      number = this.aliases.nextNumber++;
      this.aliases.byPlayerId[playerId] = number;
      atomicWrite(this.aliasPath, JSON.stringify(this.aliases, null, 2) + '\n');
    }
    return 'Người chơi ' + number;
  }

  update(value: unknown, audit: { actor?: string; action?: string; targetCount?: number; ruleId?: string } = {}): NameFilterConfig {
    const record = value && typeof value === 'object' ? value as Partial<NameFilterUpdate> : {};
    const parsed = NameFilterUpdateSchema.parse({
      rules: record.rules ?? this.current.rules,
      whitelist: record.whitelist ?? this.current.whitelist,
      hiddenPlayerIds: record.hiddenPlayerIds ?? this.current.hiddenPlayerIds,
      allowedReviewPlayerIds: record.allowedReviewPlayerIds ?? this.current.allowedReviewPlayerIds,
      verifiedOfficialAccounts: record.verifiedOfficialAccounts ?? this.current.verifiedOfficialAccounts,
    }) as NameFilterUpdate;
    const config = NameFilterConfigSchema.parse({ ...parsed, version: this.current.version + 1 });
    this.persist(config);
    this.recordAudit(audit.action ?? 'POLICY_UPDATED', audit.actor ?? 'operator', audit.targetCount ?? 0, audit.ruleId);
    return this.get();
  }

  setPlayersHidden(playerIds: readonly string[], hidden: boolean, actor = 'operator'): NameFilterConfig {
    const hiddenPlayerIds = new Set(this.current.hiddenPlayerIds);
    for (const playerId of playerIds) hidden ? hiddenPlayerIds.add(playerId) : hiddenPlayerIds.delete(playerId);
    const updated = this.update({ ...this.current, hiddenPlayerIds: [...hiddenPlayerIds] }, {
      actor, action: hidden ? 'PLAYERS_HIDDEN' : 'PLAYERS_RESTORED', targetCount: playerIds.length,
    });
    return updated;
  }

  setReviewAllowed(playerIds: readonly string[], allowed: boolean, actor = 'operator'): NameFilterConfig {
    const allowedIds = new Set(this.current.allowedReviewPlayerIds);
    for (const playerId of playerIds) allowed ? allowedIds.add(playerId) : allowedIds.delete(playerId);
    return this.update({ ...this.current, allowedReviewPlayerIds: [...allowedIds] }, {
      actor, action: allowed ? 'REVIEW_ALLOWED' : 'REVIEW_ALLOW_REMOVED', targetCount: playerIds.length,
    });
  }

  addRule(input: unknown, actor = 'operator'): NameFilterConfig {
    const parsed = NameFilterCustomRuleSchema.parse(input);
    const id = 'custom.' + randomUUID().replace(/-/gu, '');
    const rule = NameFilterRuleSchema.parse({ ...parsed, id, source: 'CUSTOM' });
    return this.update({ ...this.current, rules: [...this.current.rules, rule] }, {
      actor, action: 'CUSTOM_RULE_ADDED', targetCount: 0, ruleId: id,
    });
  }

  addException(input: unknown, actor = 'operator'): NameFilterConfig {
    const parsed = NameFilterExceptionSchema.parse(input);
    const entry: ScopedWhitelistEntry = NameFilterWhitelistSchema.parse(parsed);
    const whitelist = [...this.current.whitelist.filter((item) =>
      !(item.value.toLocaleLowerCase('und') === entry.value.toLocaleLowerCase('und') &&
        item.ruleIds.join('\0') === entry.ruleIds.join('\0')),
    ), entry];
    return this.update({ ...this.current, whitelist }, { actor, action: 'SCOPED_EXCEPTION_ADDED', targetCount: 0 });
  }

  addVerifiedOfficial(input: unknown, actor = 'operator'): NameFilterConfig {
    const parsed = VerifiedOfficialAccountSchema.parse(input);
    const official = [...this.current.verifiedOfficialAccounts.filter((item) =>
      !(item.source === parsed.source && item.stableUserId === parsed.stableUserId),
    ), parsed];
    return this.update({ ...this.current, verifiedOfficialAccounts: official }, { actor, action: 'OFFICIAL_ACCOUNT_VERIFIED', targetCount: 1 });
  }

  recordAudit(action: string, actor: string, targetCount: number, ruleId?: string) {
    const entry: NameFilterAuditEntry = {
      id: randomUUID(),
      at: Math.floor(this.now()),
      actor: actor.replace(/[^a-zA-Z0-9_.@-]/gu, '').slice(0, 80) || 'operator',
      action: action.replace(/[^A-Z0-9_-]/gu, '').slice(0, 80),
      policyVersion: this.current.version,
      targetCount: Math.max(0, Math.floor(targetCount)),
      ...(ruleId ? { ruleId } : {}),
    };
    this.audit = [...this.audit, entry].slice(-1_000);
    atomicWrite(this.auditPath, JSON.stringify(this.audit, null, 2) + '\n');
  }

  listAudit() {
    return this.audit.map((entry) => ({ ...entry }));
  }

  private persist(config: NameFilterConfig) {
    const validated = NameFilterConfigSchema.parse(config);
    atomicWrite(this.path, JSON.stringify(validated, null, 2) + '\n');
    this.current = validated;
  }
}
