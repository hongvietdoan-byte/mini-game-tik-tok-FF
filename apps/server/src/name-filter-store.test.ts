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

describe('NameFilterStore', () => {
  it('dùng mặc định khi chưa có file hoặc file JSON hỏng', () => {
    const dir = dataDir();
    const store = new NameFilterStore(dir);
    expect(store.get()).toEqual(DEFAULT_NAME_FILTER_CONFIG);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'name-filter.json'), '{ hỏng', 'utf8');
    expect(new NameFilterStore(dir).get()).toEqual(DEFAULT_NAME_FILTER_CONFIG);
  });

  it('validate luật, whitelist, id nội bộ; ghi nguyên tử và tăng version', () => {
    const dir = dataDir();
    const store = new NameFilterStore(dir);
    expect(() => store.update({ rules: [{ term: '<script>', match: 'word', category: 'CUSTOM' }], whitelist: [], hiddenPlayerIds: [] })).toThrow();
    expect(() => store.update({ rules: [{ term: 'a'.repeat(65), match: 'word', category: 'CUSTOM' }], whitelist: [], hiddenPlayerIds: [] })).toThrow();

    const first = store.update({
      rules: [{ term: 'từ cấm', match: 'word', category: 'CUSTOM' }],
      whitelist: ['tên sạch'],
      hiddenPlayerIds: ['MOCK:user-42'],
    });
    expect(first.version).toBe(1);
    expect(JSON.parse(readFileSync(store.path, 'utf8'))).toEqual(first);
    expect(store.evaluate('abc', 'MOCK:user-42')).toMatchObject({ flagged: true, reasonCategory: 'MANUAL' });
    expect(store.setPlayerHidden('MOCK:user-42', false).version).toBe(2);
    expect(store.get().hiddenPlayerIds).toEqual([]);
  });
});
