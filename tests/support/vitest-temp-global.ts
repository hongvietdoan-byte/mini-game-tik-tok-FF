import { readdirSync } from 'node:fs';
import { rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..', '.tmp-test');

function countSystemQuizDirs() {
  const systemTempRoot = process.env.QUIZ_SYSTEM_TEMP_ROOT ?? tmpdir();
  return readdirSync(systemTempRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name.startsWith('quiz-')).length;
}

export default async function setupTestTempRoot() {
  const systemQuizDirsBefore = countSystemQuizDirs();
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  await mkdir(root, { recursive: true });
  return async () => {
    const systemQuizDirsAfter = countSystemQuizDirs();
    console.log(`[test-temp] system quiz-* directories: before=${systemQuizDirsBefore}, after=${systemQuizDirsAfter}`);
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    if (systemQuizDirsAfter > systemQuizDirsBefore)
      throw new Error(`Bài test để lại ${systemQuizDirsAfter - systemQuizDirsBefore} thư mục quiz-* trong temp hệ thống.`);
  };
}
