import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_NAME_FILTER_CONFIG, NameFilterStore } from './name-filter-store';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function dataDir() {
  const dir = mkdtempSync(join(tmpdir(), 'quiz-name-filter-'));
  dirs.push(dir);
  return dir;
}

const customRule = (term: string, id = 'custom.term') => ({
  id,
  term,
  aliases: [],
  match: 'word' as const,
  group: 'PROFANITY' as const,
  severity: 'HIGH' as const,
  source: 'CUSTOM' as const,
});

describe('NameFilterStore', () => {
  it('dùng mặc định khi chưa có file hoặc file JSON hỏng', () => {
    const dir = dataDir();
    const store = new NameFilterStore(dir);
    expect(store.get()).toEqual(DEFAULT_NAME_FILTER_CONFIG);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'name-filter.json'), '{ hỏng', 'utf8');
    expect(new NameFilterStore(dir).get()).toEqual(DEFAULT_NAME_FILTER_CONFIG);
  });

  it('validate luật, ngoại lệ có phạm vi và ghi cấu hình nguyên tử có version', () => {
    const store = new NameFilterStore(dataDir());
    expect(() => store.addRule({ term: '<script>', match: 'word', group: 'PROFANITY', severity: 'HIGH' })).toThrow();
    expect(() => store.addRule({ term: 'x'.repeat(65), match: 'word', group: 'PROFANITY', severity: 'HIGH' })).toThrow();

    const first = store.addRule({ term: 'kendrick', match: 'word', group: 'PROFANITY', severity: 'HIGH' });
    const added = first.rules[0]!;
    expect(added.id).toMatch(/^custom\./u);
    expect(store.evaluate('Kendrick', 'MOCK:user-1').risk).toBe('HIGH');
    const second = store.addException({ value: 'Kendrick', ruleIds: [added.id] });
    expect(second.version).toBe(2);
    expect(store.evaluate('Kendrick', 'MOCK:user-1').risk).toBe('NONE');
    expect(JSON.parse(readFileSync(store.path, 'utf8'))).toEqual(second);
  });

  it('ẩn nhiều người, allow REVIEW và dùng alias ổn định theo ID nội bộ', () => {
    const store = new NameFilterStore(dataDir());
    const hidden = store.setPlayersHidden(['MOCK:user-42', 'MOCK:user-43'], true, 'op-1');
    expect(hidden.hiddenPlayerIds).toEqual(['MOCK:user-42', 'MOCK:user-43']);
    const result = store.evaluate('Ngọc', 'MOCK:user-42');
    expect(result).toMatchObject({ risk: 'MANUAL_HIDE', displayAction: 'ANONYMIZE', safeDisplayName: 'Người chơi 1' });
    expect(store.evaluate('Ngọc', 'MOCK:user-42').safeDisplayName).toBe('Người chơi 1');
    expect(store.evaluate('Ngọc', 'MOCK:user-43').safeDisplayName).toBe('Người chơi 2');

    store.setPlayersHidden(['MOCK:user-42'], false, 'op-1');
    store.setReviewAllowed(['MOCK:user-42'], true, 'op-1');
    expect(store.get()).toMatchObject({ version: 3, hiddenPlayerIds: ['MOCK:user-43'], allowedReviewPlayerIds: ['MOCK:user-42'] });
    expect(store.getAdminSettings().playerNameSpeech).toBe('UNSUPPORTED');
  });

  it('audit không ghi tên người chơi gốc', () => {
    const dir = dataDir();
    const store = new NameFilterStore(dir);
    store.rememberFlaggedName('MOCK:internal-1', 'Tên nhạy cảm giả định');
    store.setPlayersHidden(['MOCK:internal-1'], true, 'operator-2');
    const auditText = readFileSync(store.auditPath, 'utf8');
    expect(auditText).toContain('PLAYERS_HIDDEN');
    expect(auditText).not.toContain('Tên nhạy cảm giả định');
    expect(store.listAudit()[0]).toMatchObject({ actor: 'operator-2', targetCount: 1 });
  });
});
