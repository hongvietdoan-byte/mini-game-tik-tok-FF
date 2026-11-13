import { rmSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..', '.tmp-test');

export default async function setupPlaywrightTempRoot() {
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  await mkdir(root, { recursive: true });
  // Playwright writes .last-run.json after global teardown; remove that final metadata at process exit too.
  process.once('exit', () => {
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });
  return async () => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
