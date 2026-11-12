import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

/** Sao lưu SQLite bằng connection readonly để backup nguồn không chạy migration hay đổi pragma. */
export async function backupSqliteReadonly(sourcePath: string, destinationPath: string) {
  const source = resolve(sourcePath);
  const destination = resolve(destinationPath);
  if (source === destination) throw new Error('Từ chối backup DB vào chính file nguồn.');

  mkdirSync(dirname(destination), { recursive: true });
  const database = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await database.backup(destination);
  } finally {
    database.close();
  }
}
