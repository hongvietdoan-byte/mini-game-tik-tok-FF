import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', '.codex-wt/**'],
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'unit',
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
