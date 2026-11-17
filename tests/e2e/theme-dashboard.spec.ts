import { createServer as createNodeServer } from 'node:net';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer as createViteServer, type ViteDevServer } from '../../apps/dashboard/node_modules/vite/dist/node/index.js';
import { ManualScheduler } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import { expect, test, type Page } from '@playwright/test';
import { getE2eAssetDirectory, getE2eTempDirectory } from './assets';

const adminToken = 'e2e-theme-dashboard-token-0246';
const tempRoot = resolve(getE2eTempDirectory(), 'c-0246-theme-dashboard');
const themesDir = join(tempRoot, 'themes');
const placeholderSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#171a3d"/><circle cx="500" cy="80" r="42" fill="#ffcc58"/></svg>';
let server: QuizApp | undefined;
let store: Store | undefined;
let dashboard: ViteDevServer | undefined;
let dashboardUrl = '';

function makeTheme(id: string, name: string, tokens: Record<string, string>) {
  const folder = join(themesDir, id);
  const assets = join(folder, 'assets');
  mkdirSync(assets, { recursive: true });
  const imageSlots = {
    'arena.background': 'assets/arena.svg',
    'arena.questionBackground': 'assets/question.svg',
    'brand.logo': 'assets/logo.svg',
    'mc.static': 'assets/mc.svg',
    'victory.background': 'assets/victory.svg',
    'victory.trophyStage': 'assets/stage.svg',
    'arena.flag.0': 'assets/flag.svg',
  };
  for (const path of Object.values(imageSlots)) writeFileSync(join(folder, path), placeholderSvg, 'utf8');
  writeFileSync(join(folder, 'theme.json'), JSON.stringify({ schemaVersion: 1, id, name, description: 'Theme dùng trong test E2E.', tokens, fonts: [], assets: imageSlots }), 'utf8');
}

async function unusedPort() {
  const probe = createNodeServer();
  await new Promise<void>((resolveListen, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolveListen);
  });
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được cổng E2E tạm.');
  const { port } = address;
  await new Promise<void>((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function openThemePage(page: Page) {
  await page.addInitScript(({ token }) => {
    localStorage.clear();
    localStorage.setItem('quiz.setupDone', '1');
    sessionStorage.clear();
    sessionStorage.setItem('quiz.adminToken', token);
  }, { token: adminToken });
  await page.goto(dashboardUrl);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tạo phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'Giao diện / Theme', exact: true }).click();
  await expect(page.getByTestId('theme-page')).toBeVisible();
}

test.beforeAll(async () => {
  rmSync(tempRoot, { recursive: true, force: true });
  mkdirSync(themesDir, { recursive: true });
  makeTheme('spring-event', 'Mùa xuân', { gold: '#F2C14E', deep: '#183E35' });
  mkdirSync(join(themesDir, 'broken-event'), { recursive: true });
  writeFileSync(join(themesDir, 'broken-event', 'theme.json'), JSON.stringify({
    schemaVersion: 1, id: 'broken-event', name: 'Gói bị lỗi', tokens: { width: '1200px' }, fonts: [], assets: {},
  }), 'utf8');

  const dashboardPort = await unusedPort();
  const dashboardOrigin = `http://127.0.0.1:${dashboardPort}`;
  store = new Store(join(tempRoot, 'quiz.db'));
  server = await buildApp({
    store,
    scheduler: new ManualScheduler(),
    adminToken,
    allowedOrigins: [dashboardOrigin],
    themesDir,
    webRoots: { assets: getE2eAssetDirectory() },
  });
  await server.app.listen({ host: '127.0.0.1', port: 0 });
  const serverAddress = server.app.server.address();
  if (!serverAddress || typeof serverAddress === 'string') throw new Error('Không lấy được cổng server theme E2E.');
  const serverUrl = `http://127.0.0.1:${serverAddress.port}`;
  await server.app.inject({
    method: 'PUT',
    url: '/api/admin/themes/active',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { themeId: 'spring-event' },
  });

  const dashboardRoot = resolve(process.cwd(), 'apps/dashboard');
  dashboard = await createViteServer({
    root: dashboardRoot,
    configFile: resolve(dashboardRoot, 'vite.config.ts'),
    server: {
      host: '127.0.0.1', port: dashboardPort, strictPort: true,
      proxy: {
        '/api': { target: serverUrl, changeOrigin: true },
        '/themes': { target: serverUrl, changeOrigin: true },
        '/ws': { target: serverUrl, changeOrigin: true, ws: true },
      },
    },
  });
  await dashboard.listen();
  dashboardUrl = dashboardOrigin;
});

test.afterAll(async () => {
  await dashboard?.close();
  await server?.close();
  store?.close();
  rmSync(tempRoot, { recursive: true, force: true });
});

test('tab Theme đọc API thật, quét lại theme tạm, chặn gói lỗi và áp dụng theme hợp lệ', async ({ page }) => {
  await openThemePage(page);
  const themePage = page.getByTestId('theme-page');
  const spring = themePage.getByRole('radio', { name: /Mùa xuân/ });
  await expect(spring).toContainText('Đang dùng');
  await expect(themePage.getByText('--theme-deep')).toBeVisible();
  await expect(themePage.locator('[data-slot="arena.background"] img')).toBeVisible();
  await expect(themePage.locator('[data-slot="arena.flag.1"] .theme-image-default')).toHaveText('Dùng mặc định');

  makeTheme('summer-event', 'Mùa hè', { sky: '#4CA6DD', gold: '#F8CB46' });
  await themePage.getByRole('button', { name: 'Quét lại thư mục' }).click();
  const summer = themePage.getByRole('radio', { name: /Mùa hè/ });
  await expect(summer).toBeVisible();
  await expect(themePage.getByRole('status')).toContainText('Đã quét lại thư mục theme.');
  await summer.click();
  await expect(themePage.getByText('--theme-sky')).toBeVisible();
  await expect(themePage.locator('[data-slot="brand.logo"] img')).toBeVisible();

  await themePage.getByRole('radio', { name: /Gói bị lỗi/ }).click();
  await expect(themePage.getByText(/tokens\.width/).first()).toBeVisible();
  await expect(themePage.getByRole('button', { name: 'Áp dụng', exact: true })).toBeDisabled();

  await summer.click();
  const apply = themePage.getByRole('button', { name: 'Áp dụng', exact: true });
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(themePage.locator('.alert-success')).toContainText('Đã áp dụng theme “Mùa hè”.');
  await expect(themePage.getByText('--theme-sky')).toBeVisible();
  await expect(themePage.locator('[data-slot="brand.logo"] img')).toBeVisible();
  await expect(themePage.getByRole('radio', { name: /Mùa hè/ })).toContainText('Đang dùng');
  expect(page.url()).not.toContain(adminToken);
});
