import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export type McPronunciationRule = {
  from: string;
  to: string;
  caseInsensitive: boolean;
};

const MAX_DICTIONARY_BYTES = 32 * 1024;
const MAX_RULES = 256;
const MAX_TERM_LENGTH = 120;

function isSafeTerm(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TERM_LENGTH &&
    !/[\u0000-\u001f\u007f]/u.test(value);
}

function parseDictionary(value: unknown): McPronunciationRule[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const document = value as Record<string, unknown>;
  if (Object.keys(document).some((key) => key !== 'version' && key !== 'entries') ||
    document.version !== 1 || !Array.isArray(document.entries) || document.entries.length > MAX_RULES) return [];

  const rules: McPronunciationRule[] = [];
  const seen = new Set<string>();
  for (const item of document.entries) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const entry = item as Record<string, unknown>;
    if (Object.keys(entry).some((key) => !['from', 'to', 'caseInsensitive'].includes(key)) ||
      !isSafeTerm(entry.from) || !isSafeTerm(entry.to) ||
      (entry.caseInsensitive !== undefined && typeof entry.caseInsensitive !== 'boolean')) return [];
    const from = entry.from.trim();
    const to = entry.to.trim();
    const caseInsensitive = entry.caseInsensitive === true;
    const identity = `${caseInsensitive ? from.toLocaleLowerCase('vi-VN') : from}\u0000${caseInsensitive}`;
    if (seen.has(identity)) return [];
    seen.add(identity);
    rules.push({ from, to, caseInsensitive });
  }
  return rules;
}

/** Loads only the operator's machine-local dictionary; malformed files fail closed without logging terms. */
export async function loadMcPronunciationDictionary(filePath = process.env.QUIZ_MC_PRONUNCIATION_FILE ?? join('data', 'mc-pronunciation.json')) {
  try {
    const path = resolve(filePath);
    const raw = await readFile(path);
    if (raw.byteLength > MAX_DICTIONARY_BYTES) return [];
    return parseDictionary(JSON.parse(raw.toString('utf8')) as unknown);
  } catch {
    return [];
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/** Replaces whole Unicode words only; this is synthesis-only and never mutates visible question text. */
export function applyMcPronunciationDictionary(text: string, rules: readonly McPronunciationRule[] = []) {
  return [...rules]
    .sort((a, b) => b.from.length - a.from.length)
    .reduce((output, rule) => {
      const flags = rule.caseInsensitive ? 'giu' : 'gu';
      const wordChar = '[\\p{L}\\p{N}_]';
      const startsWithWord = new RegExp(`^${wordChar}`, 'u').test(rule.from);
      const endsWithWord = new RegExp(`${wordChar}$`, 'u').test(rule.from);
      const startsReplacementWithWord = new RegExp(`^${wordChar}`, 'u').test(rule.to);
      const endsReplacementWithWord = new RegExp(`${wordChar}$`, 'u').test(rule.to);
      const leftBoundary = startsWithWord ? `(?<!${wordChar})` : '';
      const rightBoundary = endsWithWord ? `(?!${wordChar})` : '';
      const wholeWord = new RegExp(`${leftBoundary}${escapeRegex(rule.from)}${rightBoundary}`, flags);
      return output.replace(wholeWord, (matched, offset: number, source: string) => {
        const before = source.slice(0, offset).slice(-1);
        const after = source.slice(offset + matched.length, offset + matched.length + 1);
        const addLeadingSpace = !startsWithWord && startsReplacementWithWord && new RegExp(`^${wordChar}$`, 'u').test(before);
        const addTrailingSpace = !endsWithWord && endsReplacementWithWord && new RegExp(`^${wordChar}$`, 'u').test(after);
        return `${addLeadingSpace ? ' ' : ''}${rule.to}${addTrailingSpace ? ' ' : ''}`;
      });
    }, text);
}
