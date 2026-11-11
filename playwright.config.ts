import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const localAssetDirectory = resolve(process.cwd(), '../../../assets-local');
const serverPort = Number(process.env.PLAYWRIGHT_SERVER_PORT ?? 18787);
const overlayPort = Number(process.env.PLAYWRIGHT_OVERLAY_PORT ?? 15176);
if (!Number.isInteger(serverPort) || !Number.isInteger(overlayPort) || serverPort === overlayPort)
  throw new Error('Cổng E2E phải là hai cổng nguyên khác nhau.');
const serverUrl = 'http://127.0.0.1:' + serverPort;
const overlayUrl = 'http://127.0.0.1:' + overlayPort;

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results/e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: overlayUrl,
    channel: 'msedge',
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  },
  webServer: [
    {
      command: 'corepack pnpm --filter @quiz/server dev',
      url: serverUrl + '/health',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        QUIZ_PORT: String(serverPort),
        QUIZ_DB: ':memory:',
        QUIZ_DATA_DIR: resolve(process.cwd(), 'test-results/e2e/server-data'),
        QUIZ_ASSETS_DIR: localAssetDirectory,
      },
    },
    {
      command: 'corepack pnpm --filter @quiz/overlay dev',
      url: overlayUrl,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        QUIZ_PORT: String(serverPort),
        VITE_PORT: String(overlayPort),
      },
    },
  ],
});