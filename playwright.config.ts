import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const localAssetDirectory = resolve(process.cwd(), '../../../assets-local');

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results/e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5176',
    channel: 'msedge',
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  },
  webServer: [
    {
      command: 'corepack pnpm --filter @quiz/server dev',
      url: 'http://127.0.0.1:8788/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        QUIZ_PORT: '8788',
        QUIZ_DB: ':memory:',
        QUIZ_DATA_DIR: resolve(process.cwd(), 'test-results/e2e/server-data'),
        QUIZ_ASSETS_DIR: localAssetDirectory,
      },
    },
    {
      command: 'corepack pnpm --filter @quiz/overlay dev',
      url: 'http://127.0.0.1:5176',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        QUIZ_PORT: '8788',
        VITE_PORT: '5176',
      },
    },
  ],
});
