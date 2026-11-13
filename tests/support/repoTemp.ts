import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEST_TEMP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..', '.tmp-test');
const allocated = new Set<string>();

function assertOwned(path: string) {
  const target = resolve(path);
  const rel = relative(TEST_TEMP_ROOT, target);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || resolve(TEST_TEMP_ROOT) === target)
    throw new Error(`Từ chối dọn đường dẫn ngoài vùng test tạm: ${path}`);
  return target;
}

export function testTempRoot(prefix = 'quiz-') {
  mkdirSync(TEST_TEMP_ROOT, { recursive: true });
  const path = mkdtempSync(join(TEST_TEMP_ROOT, prefix));
  allocated.add(path);
  return path;
}

export async function testTempRootAsync(prefix = 'quiz-') {
  await mkdir(TEST_TEMP_ROOT, { recursive: true });
  const path = await mkdtemp(join(TEST_TEMP_ROOT, prefix));
  allocated.add(path);
  return path;
}

export function removeTestTempRoot(path: string) {
  const target = assertOwned(path);
  rmSync(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  allocated.delete(target);
}

export async function removeTestTempRootAsync(path: string) {
  const target = assertOwned(path);
  await rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  allocated.delete(target);
}

export function cleanupTestTempRootsSync() {
  for (const path of [...allocated]) removeTestTempRoot(path);
}

export async function cleanupTestTempRoots() {
  for (const path of [...allocated]) await removeTestTempRootAsync(path);
}
