import { defineConfig } from 'vitest/config';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const systemTempRoot = tmpdir();
const repoRoot = dirname(fileURLToPath(import.meta.url));
const repoTempRoot = resolve(repoRoot, '.tmp-test');
process.env.QUIZ_SYSTEM_TEMP_ROOT = systemTempRoot;
process.env.TMPDIR = repoTempRoot;
process.env.TMP = repoTempRoot;
process.env.TEMP = repoTempRoot;

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', '.codex-wt/**'],
    passWithNoTests: true,
    setupFiles: ['./tests/support/vitest-temp-setup.ts'],
    globalSetup: ['./tests/support/vitest-temp-global.ts'],
    projects: [
      {
        test: {
          name: 'unit',
          // test thuộc tính (200 seed) có thể > 5 s khi máy chạy song song nhiều bộ test
          testTimeout: 20_000,
          include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'fixtures/**/*.test.ts', 'scripts/**/*.test.ts'],
          environment: 'node',
          exclude: ['**/node_modules/**', '.claude/**'],
        },
      },
      { test: { name: 'integration', include: ['tests/integration/**/*.test.ts'], environment: 'node', testTimeout: 60_000 } },
      { test: { name: 'load', include: ['tests/load/**/*.test.ts'], environment: 'node', testTimeout: 120_000 } },
    ],
  },
});
