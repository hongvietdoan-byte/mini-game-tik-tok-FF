import { createServer as createNodeServer } from 'node:net';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer as createViteServer, type ViteDevServer } from '../../apps/dashboard/node_modules/vite/dist/node/index.js';
import { ManualScheduler } from '@quiz/live-adapters';
import { DEFAULT_HUD_CONFIG, THEME_DEFAULT_TEXTS, ThemeManifestSchema, type ThemeTexts } from '@quiz/contracts';
import { Store } from '@quiz/persistence';
import { buildApp, type QuizApp } from '@quiz/server';
import { DEMO_PACK, DEMO_QUESTIONS } from '../../fixtures/questions';
import { expect, test, type Page } from '@playwright/test';
import { getE2eAssetDirectory, getE2eTempDirectory } from './assets';

const adminToken = 'e2e-theme-dashboard-token-0246';
const tempRoot = resolve(getE2eTempDirectory(), 'c-0246-theme-dashboard');
const themesDir = join(tempRoot, 'themes');
const placeholderSvg = (tokens: Record<string, string>) => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${tokens.deep ?? '#171a3d'}"/><circle cx="500" cy="80" r="42" fill="${tokens.gold ?? '#ffcc58'}"/></svg>`;
const sampleTexts: ThemeTexts = {
  ...THEME_DEFAULT_TEXTS,
  brandTitleLine1: 'HỘI',
  brandTitleLine2: 'THỬ THÁCH MÀU SẮC RỰC RỠ',
  brandTagline: 'MỘT SÂN CHƠI MÀU SẮC RỰC RỠ ĐANG CHỜ BẠN',
  legacyBrandTitle: 'SÂN CHƠI MÀU SẮC RỰC RỠ MÙA HÈ 2026',
  arenaWelcome: 'CHÀO MỪNG ĐẾN ĐẤU TRƯỜNG SẮC MÀU MỚI',
  kicker: 'LỄ HỘI SẮC MÀU',
  arenaTitle: 'ĐẤU TRƯỜNG SẮC MÀU MỚI',
  playingLabel: 'ĐANG TRANH TÀI',
  roundLabel: 'CHẶNG',
  leaderboardTitle: 'BẢNG VINH DANH',
  victoryTitle: 'VINH DANH NHÀ VUA',
};
let server: QuizApp | undefined;
let store: Store | undefined;
let scheduler: ManualScheduler | undefined;
let dashboard: ViteDevServer | undefined;
let dashboardUrl = '';

function makeTheme(id: string, name: string, tokens: Record<string, string>, texts: Partial<ThemeTexts> = {}, fastestTitle = 'ĐÚNG NHANH NHẤT') {
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
  const svg = placeholderSvg(tokens);
  for (const path of Object.values(imageSlots)) writeFileSync(join(folder, path), svg, 'utf8');
  writeFileSync(join(folder, 'theme.json'), JSON.stringify({
    schemaVersion: 1, id, name, description: 'Theme dùng trong test E2E.', tokens, fonts: [], assets: imageSlots,
    texts: { ...THEME_DEFAULT_TEXTS, ...texts },
    achievements: { FASTEST_CORRECT: {
      enabled: true, title: fastestTitle, subtitle: `Top 3 ${name}`, accentColor: tokens.gold ?? '#FFCC58', maxRows: 3, displaySlot: 'question-reveal',
    } },
  }), 'utf8');
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
  await expect(page).toHaveTitle('Nhà Thông Thái Free Fire · Dashboard LIVE');
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tạo phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'Giao diện / Theme', exact: true }).click();
  await expect(page.getByTestId('theme-page')).toBeVisible();
}

test.beforeAll(async () => {
  rmSync(tempRoot, { recursive: true, force: true });
  mkdirSync(themesDir, { recursive: true });
  makeTheme('spring-event', 'Mùa xuân', { gold: '#F2C14E', deep: '#183E35' }, { kicker: 'HỘI XUÂN' }, 'ĐÚNG NHANH NHẤT');
  makeTheme('summer-event', 'Mùa hè', { sky: '#4CA6DD', gold: '#F8CB46', deep: '#112A55' }, sampleTexts, 'TỐC ĐỘ MÙA HÈ');
  mkdirSync(join(themesDir, 'broken-event'), { recursive: true });
  writeFileSync(join(themesDir, 'broken-event', 'theme.json'), JSON.stringify({
    schemaVersion: 1, id: 'broken-event', name: 'Gói bị lỗi', tokens: { width: '1200px' }, fonts: [], assets: {},
  }), 'utf8');

  const dashboardPort = await unusedPort();
  const dashboardOrigin = `http://127.0.0.1:${dashboardPort}`;
  store = new Store(join(tempRoot, 'quiz.db'));
  scheduler = new ManualScheduler();
  store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, scheduler.now());
  server = await buildApp({
    store,
    scheduler,
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

test.afterEach(() => {
  const runtime = server?.runtime();
  if (runtime) runtime.systemCommand({ type: 'STOP', reason: 'Kết thúc phiên E2E theme.' });
});

test('tab Theme đọc API thật, tải lại theme, chặn gói lỗi, xác nhận chữ tùy chỉnh và áp dụng theme hợp lệ', async ({ page }) => {
  await openThemePage(page);
  await expect(page.locator('.brand')).toContainText('NHÀ THÔNG THÁI');
  const themePage = page.getByTestId('theme-page');
  const spring = themePage.getByRole('radio', { name: /Mùa xuân/ });
  await expect(spring).toContainText('Đang dùng');
  await expect(themePage.getByText('--theme-deep')).toBeVisible();
  await expect(themePage.locator('[data-slot="arena.background"] img')).toBeVisible();
  await expect(themePage.locator('[data-slot="arena.flag.1"] .theme-image-default')).toHaveText('Dùng mặc định');

  await themePage.getByRole('button', { name: 'Tải lại danh sách theme' }).click();
  const summerCard = themePage.getByTestId('theme-choice-summer-event');
  const summer = summerCard.getByRole('radio', { name: /Mùa hè/ });
  await expect(summer).toBeVisible();
  await expect(themePage.locator('.alert-success')).toContainText('Đã tải lại danh sách theme.');
  await summer.click();
  await expect(themePage.getByText('--theme-sky')).toBeVisible();
  await expect(themePage.locator('[data-slot="brand.logo"] img')).toBeVisible();

  const brokenCard = themePage.getByTestId('theme-choice-broken-event');
  await brokenCard.getByRole('radio', { name: /Gói bị lỗi/ }).click();
  await expect(themePage.getByText(/tokens\.width/).first()).toBeVisible();
  await expect(brokenCard.getByRole('button', { name: 'Dùng theme này' })).toBeDisabled();

  await summer.click();
  const customHud = { ...DEFAULT_HUD_CONFIG.texts, kicker: 'HUD TÙY CHỈNH' };
  const savedHud = await server!.app.inject({
    method: 'PUT', url: '/api/hud', headers: { authorization: `Bearer ${adminToken}` },
    payload: { texts: customHud, images: DEFAULT_HUD_CONFIG.images },
  });
  expect(savedHud.statusCode).toBe(200);
  const apply = summerCard.getByRole('button', { name: 'Dùng theme này' });
  await expect(apply).toBeEnabled();
  const applyDialog = page.waitForEvent('dialog');
  const applyClick = apply.click();
  const dialog = await applyDialog;
  expect(dialog.message()).toBe('Dùng chữ của theme mới?');
  await dialog.accept();
  await applyClick;
  await expect(themePage.locator('.alert-success')).toContainText('Đã áp dụng theme “Mùa hè” và cập nhật chữ tiêu đề.');
  await expect(themePage.getByText('--theme-sky')).toBeVisible();
  await expect(themePage.locator('[data-slot="brand.logo"] img')).toBeVisible();
  await expect(summer).toContainText('Đang dùng');
  const achievement = themePage.locator('[data-achievement="FASTEST_CORRECT"]');
  await expect(achievement.getByLabel('FASTEST_CORRECT · tên')).toHaveValue('TỐC ĐỘ MÙA HÈ');
  const hudAfterApply = await server!.app.inject({ method: 'GET', url: '/api/hud' });
  expect(hudAfterApply.json().texts).toMatchObject(sampleTexts);

  const reviewDirectory = resolve(process.cwd(), 'assets-local/review/c-theme-kit');
  mkdirSync(reviewDirectory, { recursive: true });
  await page.screenshot({ path: join(reviewDirectory, 'dashboard-theme.png'), fullPage: true, animations: 'disabled' });

  await server!.app.inject({
    method: 'PUT', url: '/api/hud', headers: { authorization: `Bearer ${adminToken}` },
    payload: { texts: customHud, images: DEFAULT_HUD_CONFIG.images },
  });
  const springCard = themePage.getByTestId('theme-choice-spring-event');
  await springCard.getByRole('radio', { name: /Mùa xuân/ }).click();
  const keepCustom = page.waitForEvent('dialog');
  const keepCustomClick = springCard.getByRole('button', { name: 'Dùng theme này' }).click();
  const declineDialog = await keepCustom;
  expect(declineDialog.message()).toBe('Dùng chữ của theme mới?');
  await declineDialog.dismiss();
  await keepCustomClick;
  await expect(themePage.locator('.alert-success')).toContainText('Giữ nguyên chữ HUD đã tùy chỉnh.');
  const hudAfterDecline = await server!.app.inject({ method: 'GET', url: '/api/hud' });
  expect(hudAfterDecline.json().texts.kicker).toBe('HUD TÙY CHỈNH');
  expect(page.url()).not.toContain(adminToken);
});

test('C-0386: đang PREPARE thì theme bị khóa và hiển thị lý do', async ({ page }) => {
  await openThemePage(page);
  await page.getByRole('button', { name: 'Live Control', exact: true }).click();
  await page.getByLabel('Giọng MC').uncheck();
  await page.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  await expect(page.getByRole('heading', { name: 'Phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'Mở sảnh', exact: true }).click();
  await expect(page.locator('.state-chip')).toHaveText('LOBBY');
  await page.getByRole('button', { name: 'Bắt đầu vòng', exact: true }).click();
  const startImmediately = page.getByRole('button', { name: 'Bắt đầu ngay', exact: true });
  if (await startImmediately.isVisible().catch(() => false)) await startImmediately.click();
  await expect(page.locator('.state-chip')).toHaveText('QUESTION');
  await page.getByRole('button', { name: 'Giao diện / Theme', exact: true }).click();
  const themePage = page.getByTestId('theme-page');
  await expect(themePage).toBeVisible();
  await expect(themePage.getByText('Chỉ có thể đổi theme khi phiên ở trạng thái IDLE hoặc LOBBY.').first()).toBeVisible();
  const alternateTheme = themePage.getByTestId('theme-choice-summer-event');
  await expect(alternateTheme.getByRole('button', { name: 'Dùng theme này' })).toBeDisabled();
  const themeList = await server!.app.inject({ method: 'GET', url: '/api/admin/themes', headers: { authorization: `Bearer ${adminToken}` } });
  expect(themeList.json().activeThemeId).toBe('spring-event');
  expect(scheduler).toBeDefined();
});

test('C-0290 trang danh hiệu theo chủ đề preview, validate và lưu qua endpoint có backup', async ({ page }) => {
  await openThemePage(page);
  await page.getByRole('radio', { name: /Mùa xuân/ }).click();
  const editor = page.getByTestId('achievement-editor');
  await expect(editor.getByRole('heading', { name: 'Danh hiệu theo chủ đề' })).toBeVisible();
  const fastest = editor.locator('[data-achievement="FASTEST_CORRECT"]');
  await expect(fastest.getByLabel('FASTEST_CORRECT · tên')).toHaveValue('ĐÚNG NHANH NHẤT');
  await fastest.getByLabel('FASTEST_CORRECT · tên').fill('Tốc độ Mùa Xuân');
  await fastest.getByLabel('FASTEST_CORRECT · subtitle').fill('Ba người trả lời nhanh nhất');
  await editor.getByRole('button', { name: 'Validate' }).click();
  await expect(page.locator('.alert-success')).toContainText('hợp lệ theo schema C-0288');
  await expect(editor.getByTestId('achievement-preview')).toContainText('Tốc độ Mùa Xuân');

  await fastest.getByLabel('FASTEST_CORRECT · vị trí').selectOption('question-reveal');
  await editor.getByRole('button', { name: 'Lưu danh hiệu' }).click();
  await expect(page.locator('.alert-success')).toContainText('máy chủ đã tạo bản sao lưu theme.json.bak-');
  await expect(editor).toContainText('Tốc độ Mùa Xuân');

  const downloadPromise = page.waitForEvent('download');
  await editor.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('spring-event-theme.json');
  const downloadedPath = await download.path();
  if (!downloadedPath) throw new Error('Dashboard không tạo file Export JSON.');
  const exportedManifest = ThemeManifestSchema.parse(JSON.parse(readFileSync(downloadedPath, 'utf8')));
  expect(exportedManifest).toMatchObject({
    schemaVersion: 1,
    id: 'spring-event',
    name: 'Mùa xuân',
    achievements: { FASTEST_CORRECT: { title: 'Tốc độ Mùa Xuân', subtitle: 'Ba người trả lời nhanh nhất', displaySlot: 'question-reveal' } },
  });

  const reviewDirectory = resolve(process.cwd(), '.claude/review/C0290');
  mkdirSync(reviewDirectory, { recursive: true });
  await editor.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(reviewDirectory, 'dashboard-achievements.png'), fullPage: true, animations: 'disabled' });

  await editor.getByRole('button', { name: 'Reset về mặc định' }).click();
  await expect(page.locator('.alert-success')).toContainText('đặt danh hiệu');
  await expect(editor.getByTestId('achievement-preview')).toContainText('ĐÚNG NHANH NHẤT');
});
