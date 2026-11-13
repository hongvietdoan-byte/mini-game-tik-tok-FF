export const NAME_RISKS = ['NONE', 'REVIEW', 'PARTIAL', 'HIGH', 'MANUAL_HIDE'] as const;
export type NameRisk = (typeof NAME_RISKS)[number];
export const NAME_RULE_GROUPS = ['PROFANITY', 'NSFW_SEXUAL', 'HATE_SPEECH', 'ILLEGAL_HARMFUL', 'IMPERSONATION'] as const;
export type NameRuleGroup = (typeof NAME_RULE_GROUPS)[number];
export type NameFilterMatch = 'word' | 'substring';
export type NameFilterRule = {
  id: string;
  term: string;
  aliases?: string[];
  match: NameFilterMatch;
  group: NameRuleGroup;
  severity: 'PARTIAL' | 'HIGH';
  source: 'SYSTEM' | 'CUSTOM';
  /** Một số teencode ngắn chỉ khớp khi các chữ nằm ở ranh giới từ sau khi bỏ dấu phân cách. */
  separatorInsensitive?: boolean;
};
export type ProtectedEntity = {
  id: string;
  label: string;
  aliases: string[];
  kind: 'BRAND' | 'ORGANIZATION' | 'ROLE';
  source: 'SYSTEM' | 'OPERATOR';
  scope: 'PLAYER_DISPLAY_NAME';
  rule: 'REVIEW_OR_HIGH_CONTEXT';
};
export type ScopedWhitelistEntry = { value: string; ruleIds: string[] };
export type VerifiedOfficialAccount = { source: string; stableUserId: string; entityId: string };
export type NameFilterConfig = {
  rules: NameFilterRule[];
  whitelist: ScopedWhitelistEntry[];
  hiddenPlayerIds: string[];
  allowedReviewPlayerIds: string[];
  verifiedOfficialAccounts: VerifiedOfficialAccount[];
  version: number;
};
export type NameFilterUpdate = Omit<NameFilterConfig, 'version'>;
export type DisplayAction = 'ALLOW' | 'PARTIAL_MASK' | 'ANONYMIZE';
export type NameModerationResult = {
  safeDisplayName: string;
  /** @deprecated Dùng safeDisplayName ở mọi ranh giới public. */
  displayName: string;
  flagged: boolean;
  reasonCategory: NameRuleGroup | 'MANUAL' | null;
  risk: NameRisk;
  displayAction: DisplayAction;
  matchedRuleIds: string[];
  matchedRuleGroups: NameRuleGroup[];
  requiresReview: boolean;
  policyVersion: number;
  checkedAt: number;
};
export type FilteredPlayerName = NameModerationResult;

const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu;
const MARKS = /\p{M}/gu;
const ALNUM = /[\p{L}\p{N}]/u;
const SIMPLE_LATIN_NAME = /^[\p{Script=Latin}\p{N} ._-]*$/u;
const GRAPHEME_SEGMENTER = new Intl.Segmenter('vi', { granularity: 'grapheme' });
const MAPPED_PART_CACHE = new Map<string, readonly string[]>();
const MAPPED_PART_CACHE_LIMIT = 2_048;
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b' };
const HOMOGLYPH: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', і: 'i', ј: 'j', у: 'y', к: 'k', м: 'm', т: 't', в: 'b', н: 'h', ӏ: 'l',
};

function baseText(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('und').replace(CONTROL, '').replace(/đ/gu, 'd').replace(/Đ/gu, 'd');
}
function accentless(value: string) {
  return baseText(value).normalize('NFD').replace(MARKS, '');
}
function leet(value: string) {
  return [...accentless(value)].map((char) => LEET[char] ?? HOMOGLYPH[char] ?? char).join('');
}
function collapseText(value: string) {
  return value.replace(/(.)\1+/gu, (run, char: string) => char === 'c' ? 'cc' : char);
}
function compact(value: string) {
  return [...value].filter(isAlnum).join('');
}
function isAlnum(char: string) {
  if (char.length === 1) {
    const code = char.charCodeAt(0);
    if (code < 0x80) return (code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
  }
  return ALNUM.test(char);
}

/** Tạo key đơn giản dùng cho so khớp/bộ benchmark. Matching thực tế vẫn giữ nhiều representation. */
export function normalizeForMatch(name: string): string {
  return collapseText(compact(leet(name)));
}

function graphemes(value: string): string[] {
  // Most TikTok display names use precomposed Latin letters. They are already
  // one code point per grapheme; avoid the much slower Segmenter path there.
  if (SIMPLE_LATIN_NAME.test(value)) return [...value];
  return [...GRAPHEME_SEGMENTER.segment(value)].map((part) => part.segment);
}
function mappedAlnumChars(part: string): readonly string[] {
  const cached = MAPPED_PART_CACHE.get(part);
  if (cached) return cached;
  let normalized: string;
  if (part.length === 1 && part.charCodeAt(0) < 0x80) {
    const code = part.charCodeAt(0);
    normalized = code >= 0x41 && code <= 0x5a ? String.fromCharCode(code + 0x20) : part;
  } else {
    normalized = part.normalize('NFKC').toLocaleLowerCase('und').replace(CONTROL, '').replace(/đ/gu, 'd');
  }
  const folded = normalized.length === 1 && normalized.charCodeAt(0) < 0x80
    ? normalized
    : normalized.normalize('NFD').replace(MARKS, '');
  const mapped: string[] = [];
  for (const char of folded) {
    const value = LEET[char] ?? HOMOGLYPH[char] ?? char;
    if (isAlnum(value)) mapped.push(value);
  }
  if (part.length <= 4 && MAPPED_PART_CACHE.size < MAPPED_PART_CACHE_LIMIT) MAPPED_PART_CACHE.set(part, mapped);
  return mapped;
}
function safeText(value: string) {
  return value.normalize('NFC').replace(CONTROL, '').replace(/\s+/gu, ' ').trim();
}
function truncateGraphemes(value: string, limit = 16) {
  return graphemes(safeText(value)).slice(0, limit).join('');
}
function safeAlias(value: string) {
  const safe = truncateGraphemes(value);
  return safe || 'Người chơi';
}
function resolveSafeAlias(options: { alias?: string | (() => string) }) {
  return safeAlias(typeof options.alias === 'function' ? options.alias() : options.alias ?? 'Người chơi');
}

export function maskName(name: string): string {
  const chars = graphemes(safeText(name));
  if (chars.length === 0) return 'N';
  const first = /[\p{L}\p{N}]/u.test(chars[0]!) ? chars[0]! : 'N';
  return first + '*'.repeat(Math.min(15, Math.max(0, chars.length - 1)));
}

type MappedChar = { value: string; start: number; end: number };
type Representation = { id: string; chars: MappedChar[] };
type NameRepresentations = { graphemes: string[]; variants: Representation[] };

function buildRepresentations(name: string): NameRepresentations {
  const parts = graphemes(name);
  const leets: MappedChar[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    for (const char of mappedAlnumChars(parts[index]!)) leets.push({ value: char, start: index, end: index });
  }
  const collapsed = (chars: MappedChar[]) => {
    let out: MappedChar[] | undefined;
    for (let i = 0; i < chars.length;) {
      let end = i + 1;
      while (end < chars.length && chars[end]!.value === chars[i]!.value) end += 1;
      const keep = chars[i]!.value === 'c' ? Math.min(2, end - i) : 1;
      if (end - i > 1 || out) {
        out ??= chars.slice(0, i);
        for (let n = 0; n < keep; n += 1) out.push({ value: chars[i]!.value, start: chars[i]!.start, end: chars[end - 1]!.end });
      }
      i = end;
    }
    return out ?? chars;
  };
  return {
    graphemes: parts,
    variants: [
      { id: 'leet', chars: leets },
      { id: 'leet-repeated', chars: collapsed(leets) },
    ],
  };
}

type Span = { start: number; end: number };
type RuleMatch = { rule: NameFilterRule; spans: Span[] };
type EntityMatch = { entity: ProtectedEntity; spans: Span[] };
type CompiledItem = { kind: 'RULE'; rule: NameFilterRule } | { kind: 'ENTITY'; entity: ProtectedEntity };
type MatcherEntry = { value: string; item: CompiledItem };
type TrieOutput = { length: number; items: CompiledItem[] };
type TrieNode = { next: Map<string, number>; failure: number; outputs: TrieOutput[] };
type CompiledMatcher = { nodes: TrieNode[] };
type CompiledFilter = {
  representations: Record<'leet' | 'leet-repeated', CompiledMatcher>;
  plainText: CompiledMatcher;
  defaultRules: readonly NameFilterRule[];
  protectedEntities: readonly ProtectedEntity[];
};
const compiledFilters = new WeakMap<NameFilterConfig, CompiledFilter>();
const EMPTY_RULE_IDS: ReadonlySet<string> = new Set();
function candidatesByRepresentation(term: string): Record<'original' | 'accentless' | 'leet' | 'leet-repeated', string> {
  return {
    original: compact(baseText(term)),
    accentless: compact(accentless(term)),
    leet: compact(leet(term)),
    'leet-repeated': collapseText(compact(leet(term))),
  };
}
function makeMatcher(entries: readonly MatcherEntry[]): CompiledMatcher {
  const itemsByValue = new Map<string, CompiledItem[]>();
  for (const entry of entries) {
    if (!entry.value) continue;
    const found = itemsByValue.get(entry.value) ?? [];
    found.push(entry.item);
    itemsByValue.set(entry.value, found);
  }
  const nodes: TrieNode[] = [{ next: new Map(), failure: 0, outputs: [] }];
  for (const [value, items] of itemsByValue) {
    const chars = [...value];
    let nodeIndex = 0;
    for (const char of chars) {
      let nextIndex = nodes[nodeIndex]!.next.get(char);
      if (nextIndex === undefined) {
        nextIndex = nodes.length;
        nodes[nodeIndex]!.next.set(char, nextIndex);
        nodes.push({ next: new Map(), failure: 0, outputs: [] });
      }
      nodeIndex = nextIndex;
    }
    nodes[nodeIndex]!.outputs.push({ length: chars.length, items });
  }
  const queue: number[] = [];
  for (const child of nodes[0]!.next.values()) queue.push(child);
  for (let head = 0; head < queue.length; head += 1) {
    const nodeIndex = queue[head]!;
    for (const [char, childIndex] of nodes[nodeIndex]!.next) {
      let failure = nodes[nodeIndex]!.failure;
      while (failure > 0 && !nodes[failure]!.next.has(char)) failure = nodes[failure]!.failure;
      const fallback = nodes[failure]!.next.get(char);
      nodes[childIndex]!.failure = fallback !== undefined && fallback !== childIndex ? fallback : 0;
      nodes[childIndex]!.outputs.push(...nodes[nodes[childIndex]!.failure]!.outputs);
      queue.push(childIndex);
    }
  }
  return { nodes };
}
function compileFilter(
  config: NameFilterConfig,
  defaults: readonly NameFilterRule[],
  protectedEntities: readonly ProtectedEntity[],
): CompiledFilter {
  const cached = compiledFilters.get(config);
  if (cached && cached.defaultRules === defaults && cached.protectedEntities === protectedEntities) return cached;
  const rules = [...defaults, ...config.rules].map((rule) => ({ kind: 'RULE' as const, rule }));
  const entities = protectedEntities.map((entity) => ({ kind: 'ENTITY' as const, entity }));
  const entriesFor = (id: 'leet' | 'leet-repeated'): MatcherEntry[] => [
    ...rules.flatMap(({ rule, ...item }) =>
      [rule.term, ...(rule.aliases ?? [])].map((term) => ({ value: candidatesByRepresentation(term)[id], item: { ...item, rule } as CompiledItem })),
    ),
    ...entities.flatMap(({ entity, ...item }) =>
      [entity.label, ...entity.aliases].map((term) => ({ value: candidatesByRepresentation(term)[id], item: { ...item, entity } as CompiledItem })),
    ),
  ];
  const leetEntries = entriesFor('leet');
  const repeatedEntries = entriesFor('leet-repeated');
  const compiled: CompiledFilter = {
    representations: { leet: makeMatcher(leetEntries), 'leet-repeated': makeMatcher(repeatedEntries) },
    plainText: makeMatcher([...leetEntries, ...repeatedEntries]),
    defaultRules: defaults,
    protectedEntities,
  };
  compiledFilters.set(config, compiled);
  return compiled;
}

function runMatcher(
  input: NameRepresentations,
  representationId: keyof CompiledFilter['representations'],
  matcher: CompiledMatcher,
  skippedRuleIds: ReadonlySet<string> = new Set(),
): Array<{ item: CompiledItem; span: Span }> {
  if (matcher.nodes.length === 1 && matcher.nodes[0]!.next.size === 0) return [];
  const representation = input.variants.find((variant) => variant.id === representationId)!;
  const matches: Array<{ item: CompiledItem; span: Span }> = [];
  const boundaryHasAlnum = (part: string) => {
    for (const char of leet(part)) if (ALNUM.test(char)) return true;
    return false;
  };
  let state = 0;
  for (let index = 0; index < representation.chars.length; index += 1) {
    const char = representation.chars[index]!.value;
    while (state > 0 && !matcher.nodes[state]!.next.has(char)) state = matcher.nodes[state]!.failure;
    state = matcher.nodes[state]!.next.get(char) ?? 0;
    for (const output of matcher.nodes[state]!.outputs) {
      const startIndex = index - output.length + 1;
      if (startIndex < 0) continue;
      const first = representation.chars[startIndex]!;
      const last = representation.chars[index]!;
      const left = input.graphemes[first.start - 1] ?? '';
      const right = input.graphemes[last.end + 1] ?? '';
      const wordBoundary = !boundaryHasAlnum(left) && !boundaryHasAlnum(right);
      for (const item of output.items) {
        const requiresBoundary = item.kind === 'ENTITY' || item.rule.match === 'word';
        if ((!requiresBoundary || wordBoundary) && (item.kind === 'ENTITY' || !skippedRuleIds.has(item.rule.id))) {
          matches.push({ item, span: { start: first.start, end: last.end } });
        }
      }
    }
  }
  return matches;
}

function exactWhitelistValue(value: string) {
  return safeText(value).toLocaleLowerCase('und');
}

function collectMatches(
  matches: Array<{ item: CompiledItem; span: Span }>,
  rulesFound: Map<string, RuleMatch>,
  entitiesFound: Map<string, EntityMatch>,
) {
  for (const { item, span } of matches) {
    if (item.kind === 'RULE') {
      const value = rulesFound.get(item.rule.id) ?? { rule: item.rule, spans: [] };
      value.spans.push(span);
      rulesFound.set(item.rule.id, value);
    } else {
      const value = entitiesFound.get(item.entity.id) ?? { entity: item.entity, spans: [] };
      value.spans.push(span);
      entitiesFound.set(item.entity.id, value);
    }
  }
}

function buildMatches(input: NameRepresentations, config: NameFilterConfig, compiled: CompiledFilter) {
  let skipped: ReadonlySet<string> = EMPTY_RULE_IDS;
  if (config.whitelist.length) {
    const whitelistValue = exactWhitelistValue(input.graphemes.join(''));
    const matchingRuleIds = config.whitelist.flatMap((entry) =>
      exactWhitelistValue(entry.value) === whitelistValue ? entry.ruleIds : [],
    );
    if (matchingRuleIds.length) skipped = new Set(matchingRuleIds);
  }
  const rulesFound = new Map<string, RuleMatch>();
  const entitiesFound = new Map<string, EntityMatch>();
  const leetText = input.variants[0]!;
  const repeatedText = input.variants[1]!;
  if (leetText.chars === repeatedText.chars) {
    collectMatches(runMatcher(input, 'leet', compiled.plainText, skipped), rulesFound, entitiesFound);
  } else {
    collectMatches(runMatcher(input, 'leet', compiled.representations.leet, skipped), rulesFound, entitiesFound);
    collectMatches(runMatcher(input, 'leet-repeated', compiled.representations['leet-repeated'], skipped), rulesFound, entitiesFound);
  }
  return { rules: [...rulesFound.values()], entities: [...entitiesFound.values()] };
}

function isVerified(playerId: string | null, config: NameFilterConfig) {
  if (!playerId) return false;
  const separator = playerId.indexOf(':');
  if (separator < 1) return false;
  const source = playerId.slice(0, separator);
  const stableUserId = playerId.slice(separator + 1);
  return config.verifiedOfficialAccounts.some((item) => item.source === source && item.stableUserId === stableUserId);
}

function result(
  safeDisplayName: string,
  risk: NameRisk,
  displayAction: DisplayAction,
  matchedRuleIds: string[],
  matchedRuleGroups: NameRuleGroup[],
  policyVersion: number,
  checkedAt: number,
  safeNameAlreadyValidated = false,
): NameModerationResult {
  const safe = safeNameAlreadyValidated ? safeDisplayName : safeAlias(safeDisplayName);
  const reasonCategory = risk === 'MANUAL_HIDE' ? 'MANUAL' : matchedRuleGroups[0] ?? null;
  return {
    safeDisplayName: safe,
    displayName: safe,
    flagged: risk !== 'NONE',
    reasonCategory,
    risk,
    displayAction,
    matchedRuleIds: matchedRuleIds.length ? [...new Set(matchedRuleIds)] : [],
    matchedRuleGroups: matchedRuleGroups.length ? [...new Set(matchedRuleGroups)] : [],
    requiresReview: risk === 'REVIEW' || risk === 'PARTIAL' || risk === 'HIGH',
    policyVersion,
    checkedAt,
  };
}

function partialMask(input: NameRepresentations, spans: readonly Span[]): string {
  const masked = new Set<number>();
  for (const span of spans) for (let i = span.start; i <= span.end; i += 1) masked.add(i);
  return input.graphemes.map((part, index) => masked.has(index) ? '*' : part).join('');
}

export function filterPlayerName(
  name: string,
  playerId: string | null,
  config: NameFilterConfig,
  defaultRules: readonly NameFilterRule[],
  options: { alias?: string | (() => string); checkedAt?: number; protectedEntities?: readonly ProtectedEntity[] } = {},
): NameModerationResult {
  const normalizedName = safeText(name);
  const input = buildRepresentations(normalizedName);
  const checkedAt = options.checkedAt ?? Date.now();
  if (playerId && config.hiddenPlayerIds.includes(playerId))
    return result(resolveSafeAlias(options), 'MANUAL_HIDE', 'ANONYMIZE', ['MANUAL_HIDE'], [], config.version, checkedAt);
  if (!normalizedName)
    return result(resolveSafeAlias(options), 'REVIEW', 'ANONYMIZE', ['NAME_EMPTY'], [], config.version, checkedAt);

  const entities = options.protectedEntities ?? [];
  const compiled = compileFilter(config, defaultRules, entities);
  const matches = buildMatches(input, config, compiled);
  const protectedMatches = matches.entities;
  const ruleMatches = matches.rules.flatMap((item) => item.spans.map((span) => ({ ...span, rule: item.rule })));
  const hasProtected = protectedMatches.length > 0;
  const hasImpersonationCue = matches.rules.some((item) => item.rule.group === 'IMPERSONATION');
  const protectedIds = protectedMatches.map((item) => item.entity.id);
  const highMatches = ruleMatches.filter((item) => item.rule.severity === 'HIGH');
  const partialMatches = ruleMatches.filter((item) => item.rule.severity === 'PARTIAL');
  const verifiedProtected = hasProtected && isVerified(playerId, config) && !highMatches.length;
  const combinedProtectedRisk = hasProtected && (highMatches.length > 0 || hasImpersonationCue);
  const ids = [...ruleMatches.map((item) => item.rule.id), ...protectedIds];
  const groups = ruleMatches.map((item) => item.rule.group);

  if (highMatches.length || (combinedProtectedRisk && !verifiedProtected))
    return result(resolveSafeAlias(options), 'HIGH', 'ANONYMIZE', ids, groups, config.version, checkedAt);

  if (partialMatches.length) {
    const masked = partialMask(input, partialMatches);
    const maskedInput = buildRepresentations(masked);
    const rechecked = buildMatches(maskedInput, config, compiled);
    if (rechecked.rules.length || rechecked.entities.length)
      return result(resolveSafeAlias(options), rechecked.entities.length ? 'REVIEW' : 'HIGH', 'ANONYMIZE', ids, groups, config.version, checkedAt);
    return result(masked, 'PARTIAL', 'PARTIAL_MASK', ids, groups, config.version, checkedAt);
  }

  const reviewAllowed = !!playerId && config.allowedReviewPlayerIds.includes(playerId);
  if (hasProtected && !verifiedProtected && !reviewAllowed)
    return result(resolveSafeAlias(options), 'REVIEW', 'ANONYMIZE', protectedIds, [], config.version, checkedAt);

  return result(input.graphemes.slice(0, 16).join(''), 'NONE', 'ALLOW', [], [], config.version, checkedAt, true);
}

export { DEFAULT_NAME_FILTER_RULES, DEFAULT_PROTECTED_ENTITIES } from './default-list';
