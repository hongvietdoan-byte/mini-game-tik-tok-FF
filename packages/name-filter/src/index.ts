export type NameFilterMatch = 'word' | 'substring';
export type NameFilterCategory = 'PROFANITY' | 'INSULT' | 'DISCRIMINATION' | 'POLITICAL' | 'IMPERSONATION' | 'CUSTOM' | 'MANUAL';
export type NameFilterRule = { term: string; match: NameFilterMatch; category: Exclude<NameFilterCategory, 'MANUAL'> };
export type NameFilterConfig = {
  rules: NameFilterRule[];
  whitelist: string[];
  hiddenPlayerIds: string[];
  version: number;
};
export type NameFilterUpdate = Omit<NameFilterConfig, 'version'>;
export type FilteredPlayerName = {
  displayName: string;
  flagged: boolean;
  reasonCategory: NameFilterCategory | null;
};

const NORMALIZATION_REMOVALS = /[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeffđ]/gu;
const MARKS_AND_LEETS = /[\p{M}01!|34@5$78]/gu;
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const LEET_MAP: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b' };

function normalizedStage(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(NORMALIZATION_REMOVALS, (char) => char === 'đ' ? 'd' : '')
    .normalize('NFD')
    .replace(MARKS_AND_LEETS, (char) => LEET_MAP[char] ?? '');
}

function collapseRepeated(value: string): string {
  // Giữ ít nhất "cc" vì đây là teencode cần chặn; các chuỗi lặp khác rút về một chữ.
  return value.replace(/(cc)c*|((.)\3+)/gu, '$1$3');
}

/** Chuẩn hoá cả dấu câu/emoji chen giữa để bắt cách viết né bộ lọc. */
export function normalizeForMatch(name: string): string {
  return collapseRepeated(normalizedStage(name).replace(/[^\p{L}\p{N}]/gu, ''));
}

function wordsAndCompactedWindows(normalized: string, maxTokens: number): Set<string> {
  const tokens = (normalized.match(TOKEN_PATTERN) ?? []).map(collapseRepeated).filter(Boolean);
  const candidates = new Set(tokens);
  for (let start = 0; start < tokens.length; start += 1) {
    let joined = '';
    for (let end = start; end < Math.min(tokens.length, start + maxTokens); end += 1) {
      joined += tokens[end];
      const collapsed = collapseRepeated(joined);
      if (collapsed.length <= maxTokens) candidates.add(collapsed);
      else break;
    }
  }
  return candidates;
}

type CompiledRule = { rule: NameFilterRule; term: string };
type CompiledFilter = {
  wordRules: Map<string, CompiledRule>;
  substringRules: CompiledRule[];
  impersonationRules: CompiledRule[];
  maxTokens: number;
  whitelist: Set<string>;
};
const compiledCache = new WeakMap<NameFilterConfig, CompiledFilter>();

function compileFilter(config: NameFilterConfig, defaults: readonly NameFilterRule[]): CompiledFilter {
  const cached = compiledCache.get(config);
  if (cached) return cached;
  const rules = [...defaults, ...config.rules].map((rule) => ({ rule, term: normalizeForMatch(rule.term) })).filter(({ term }) => term);
  const compiled = {
    wordRules: new Map<string, CompiledRule>(),
    substringRules: rules.filter(({ rule }) => rule.match === 'substring'),
    impersonationRules: rules.filter(({ rule }) => rule.match === 'word' && rule.category === 'IMPERSONATION'),
    maxTokens: Math.max(1, ...rules.map(({ term }) => term.length)),
    whitelist: new Set(config.whitelist.map(normalizeForMatch).filter(Boolean)),
  };
  for (const item of rules) if (item.rule.match === 'word' && !compiled.wordRules.has(item.term)) compiled.wordRules.set(item.term, item);
  compiledCache.set(config, compiled);
  return compiled;
}

function graphemes(name: string): string[] {
  return [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name)].map((part) => part.segment);
}

/** Giữ chữ đầu, tối đa 15 dấu sao; thay emoji/ký tự đầu không an toàn bằng N. */
export function maskName(name: string): string {
  const parts = graphemes(name);
  if (parts.length === 0) return 'N';
  const first = parts[0]!;
  const safeInitial = /[\p{L}\p{N}]/u.test(first) ? first : 'N';
  return safeInitial + '*'.repeat(Math.min(15, Math.max(0, parts.length - 1)));
}

export function filterPlayerName(
  name: string,
  playerId: string | null,
  config: NameFilterConfig,
  defaultRules: readonly NameFilterRule[],
): FilteredPlayerName {
  if (playerId && config.hiddenPlayerIds.includes(playerId))
    return { displayName: maskName(name), flagged: true, reasonCategory: 'MANUAL' };
  const normalized = normalizedStage(name);
  const compacted = collapseRepeated(normalized.replace(/[^\p{L}\p{N}]/gu, ''));
  if (!compacted) return { displayName: name, flagged: false, reasonCategory: null };
  const compiled = compileFilter(config, defaultRules);
  if (compiled.whitelist.has(compacted))
    return { displayName: name, flagged: false, reasonCategory: null };
  const words = wordsAndCompactedWindows(normalized, compiled.maxTokens);
  let matched: CompiledRule | undefined;
  for (const word of words) {
    matched = compiled.wordRules.get(word);
    if (matched) break;
  }
  // Impersonation handles như admin123 là phổ biến; chỉ chấp nhận hậu tố số, không dò chuỗi con tùy ý.
  if (!matched) {
    for (const word of words) {
      matched = compiled.impersonationRules.find(({ term }) =>
        word.startsWith(term) && /^\d{1,6}$/u.test(word.slice(term.length)),
      );
      if (matched) break;
    }
  }
  if (!matched) matched = compiled.substringRules.find(({ term }) => compacted.includes(term));
  return matched
    ? { displayName: maskName(name), flagged: true, reasonCategory: matched.rule.category }
    : { displayName: name, flagged: false, reasonCategory: null };
}

export { DEFAULT_NAME_FILTER_RULES } from './default-list';
