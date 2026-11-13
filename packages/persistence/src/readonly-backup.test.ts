import { createHash } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { backupSqliteReadonly } from './readonly-backup';
import { testTempRoot } from '../../../tests/support/tempRoot';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

describe('backupSqliteReadonly', () => {
  it('sao chép DB cũ mà không thay đổi file nguồn hay chạy migration', async () => {
    const root = testTempRoot('quiz-readonly-backup-');
    roots.push(root);
    const source = join(root, 'source.db');
    const destination = join(root, 'nested', 'copy.db');
    const legacy = new Database(source);
    legacy.exec('CREATE TABLE legacy_fixture (value TEXT NOT NULL); INSERT INTO legacy_fixture VALUES (\'kept\'); PRAGMA user_version = 1;');
    legacy.close();
    const hashBefore = createHash('sha256').update(readFileSync(source)).digest('hex');

    await backupSqliteReadonly(source, destination);

    expect(createHash('sha256').update(readFileSync(source)).digest('hex')).toBe(hashBefore);
    const copy = new Database(destination, { readonly: true });
    try {
      expect((copy.prepare('SELECT value FROM legacy_fixture').get() as { value: string }).value).toBe('kept');
      expect(copy.pragma('user_version', { simple: true })).toBe(1);
      expect(copy.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '__drizzle%'").all()).toEqual([]);
    } finally {
      copy.close();
    }
  });

  it('từ chối đích trùng đường dẫn nguồn', async () => {
    await expect(backupSqliteReadonly('source.db', './source.db')).rejects.toThrow('chính file nguồn');
  });
});
