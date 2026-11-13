import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { DEFAULT_HUD_CONFIG, type HudConfig } from '@quiz/contracts';
import { createServer, type ViteDevServer } from '../../apps/dashboard/node_modules/vite/dist/node/index.js';
import { expect, test, type Page, type Route } from '@playwright/test';

let dashboardUrl = '';
const adminToken = 'e2e-admin-token-must-not-appear-in-url';
let dashboardServer: ViteDevServer | undefined;

test.beforeAll(async () => {
  const dashboardRoot = resolve(process.cwd(), 'apps/dashboard');
  const serverPort = Number(process.env.PLAYWRIGHT_SERVER_PORT ?? 18787);
  dashboardServer = await createServer({
    root: dashboardRoot,
    configFile: resolve(dashboardRoot, 'vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: true,
      proxy: {
        '/api': { target: `http://127.0.0.1:${serverPort}`, changeOrigin: true },
        '/assets': { target: `http://127.0.0.1:${serverPort}`, changeOrigin: true },
        '/hud-assets': { target: `http://127.0.0.1:${serverPort}`, changeOrigin: true },
        '/ws': { target: `http://127.0.0.1:${serverPort}`, changeOrigin: true, ws: true },
      },
    },
  });
  await dashboardServer.listen();
  const address = dashboardServer.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được cổng dashboard E2E.');
  dashboardUrl = 'http://127.0.0.1:' + address.port;
});

test.afterAll(async () => {
  await dashboardServer?.close();
});

async function launchDashboard(page: Page, options: { mock?: boolean; setupDone?: boolean; overlayUrl?: string } = {}) {
  const { mock = true, setupDone = true, overlayUrl } = options;
  await page.addInitScript(({ completed, token, previewOverlayUrl }) => {
    localStorage.clear();
    sessionStorage.clear();
    if (completed) localStorage.setItem('quiz.setupDone', '1');
    sessionStorage.setItem('quiz.adminToken', token);
    if (previewOverlayUrl) {
      (window as Window & { stormArena?: { getAdminToken: () => Promise<string>; getInfo: () => Promise<{ version: string; overlayUrl: string; dataDir: string }> } }).stormArena = {
        getAdminToken: async () => token,
        getInfo: async () => ({ version: 'e2e', overlayUrl: previewOverlayUrl, dataDir: 'e2e' }),
      };
    }
  }, { completed: setupDone, token: adminToken, previewOverlayUrl: overlayUrl });
  await page.goto(`${dashboardUrl}/${mock ? '?mock=1' : ''}`);
}

async function createReviewPlaceholder(page: Page, kind: 'logo' | 'background'): Promise<Buffer> {
  const base64 = await page.evaluate((imageKind) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageKind === 'logo' ? 600 : 1080;
    canvas.height = imageKind === 'logo' ? 400 : 1920;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không tạo được ảnh placeholder HUD.');

    if (imageKind === 'logo') {
      const gradient = context.createLinearGradient(0, 0, 600, 400);
      gradient.addColorStop(0, '#141b63');
      gradient.addColorStop(1, '#42125e');
      context.fillStyle = gradient;
      context.beginPath();
      context.roundRect(18, 18, 564, 364, 54);
      context.fill();
      context.strokeStyle = '#f179ff';
      context.lineWidth = 12;
      context.shadowColor = '#ce47ff';
      context.shadowBlur = 24;
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = '#fff';
      context.textAlign = 'center';
      context.font = '900 112px sans-serif';
      context.fillText('NOVA', 300, 174);
      context.fillStyle = '#ffd652';
      context.font = '800 60px sans-serif';
      context.fillText('ARENA', 300, 258);
    } else {
      const gradient = context.createLinearGradient(0, 0, 0, 1920);
      gradient.addColorStop(0, '#07104d');
      gradient.addColorStop(.52, '#291278');
      gradient.addColorStop(1, '#080d2b');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const glow = context.createRadialGradient(540, 880, 50, 540, 880, 950);
      glow.addColorStop(0, 'rgba(111,71,255,.42)');
      glow.addColorStop(1, 'rgba(111,71,255,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = '#e548ff';
      context.shadowColor = '#ce47ff';
      context.shadowBlur = 36;
      context.lineWidth = 20;
      context.strokeRect(34, 34, 1012, 1852);
      context.shadowBlur = 0;
      context.strokeStyle = '#39d8ff';
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(0, 760);
      context.lineTo(310, 600);
      context.lineTo(540, 820);
      context.lineTo(1080, 490);
      context.stroke();
    }
    return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
  }, kind);
  return Buffer.from(base64, 'base64');
}

async function installWizardApi(page: Page, overlay: 'PASS' | 'FAIL' | 'NOT_TESTED', updated: 'PASS' | 'FAIL' | 'NOT_TESTED') {
  await page.route('**/health', async (route) => route.fulfill({
    json: { ok: true, contractVersion: 1, sessionId: null },
  }));
  await page.route('**/api/system/checks', async (route) => {
    const statusById: Record<string, 'PASS' | 'FAIL' | 'NOT_TESTED'> = {
      backend: 'PASS',
      database: 'PASS',
      theme: 'NOT_TESTED',
      overlay,
      mockComment: 'NOT_TESTED',
      tiktokConnector: 'NOT_TESTED',
      testComment: 'NOT_TESTED',
      engineRecorded: 'NOT_TESTED',
      overlayUpdated: updated,
    };
    const checks = Object.entries(statusById).map(([id, status]) => ({
      id,
      label: id,
      status,
      detail: `Kiểm tra ${id}: ${status}`,
      checkedAtMs: Date.now(),
    }));
    await route.fulfill({ json: { checks, live: null, overlay: { clients: 0, lastAck: null, audioState: 'suspended' } } });
  });
  await page.route('**/api/preflight', async (route) => {
    const status = updated === 'PASS' || updated === 'FAIL' ? updated : 'WARN';
    await route.fulfill({ json: { checks: [{ id: 'overlayAck', label: 'Overlay đã ACK', status, reason: `ACK program: ${status}` }] } });
  });
}

async function goToOverlayStep(page: Page) {
  const wizard = page.getByTestId('setup-wizard');
  const next = () => wizard.getByRole('button', { name: 'Tiếp', exact: true }).click();

  await expect(page.getByTestId('setup-step-health')).toBeVisible();
  await expect(page.getByTestId('setup-step-health')).toContainText('Đang hoạt động');
  await next();
  await expect(page.getByTestId('setup-step-database')).toContainText('PASS');
  await next();
  await expect(page.getByTestId('setup-step-theme')).toContainText('NOT_TESTED');
  await next();
  await expect(page.getByTestId('setup-step-tiktok')).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ qua — chạy offline' }).click();
  await expect(page.getByTestId('setup-step-mock')).toBeVisible();
  await next();
  await expect(page.getByTestId('setup-step-obs')).toBeVisible();
  await expect(page.getByTestId('program-audio-status')).toHaveAttribute('data-audio-state', 'suspended');
  await expect(page.getByTestId('program-audio-status')).toContainText('trình duyệt chặn');
  await next();
  await expect(page.getByTestId('setup-step-overlay')).toBeVisible();
}

function makeQuestions(approvedCount: number, totalCount: number) {
  return Array.from({ length: totalCount }, (_, index) => {
    const approved = index < approvedCount;
    return {
      id: `e2e-question-${index + 1}`,
      packId: 'e2e',
      subtopicId: index % 2 === 0 ? 'e2e-topic-a' : 'e2e-topic-b',
      prompt: `Câu hỏi E2E số ${index + 1}?`,
      options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: `Lựa chọn ${id}` })),
      correctOptionId: 'B',
      explanation: 'Giải thích kiểm thử.',
      difficulty: (['EASY', 'MEDIUM', 'HARD'] as const)[index % 3],
      tags: [],
      sourceRefs: [],
      verificationStatus: approved ? 'OPERATOR_VERIFIED' : 'DEMO',
      approvalStatus: approved ? 'APPROVED' : 'PENDING_REVIEW',
      version: 1,
      media: null,
      validFrom: null,
      validUntil: null,
      lastUsedAt: null,
    };
  });
}

for (const scenario of [
  { overlay: 'PASS', updated: 'PASS', expected: 'PASS' },
  { overlay: 'FAIL', updated: 'NOT_TESTED', expected: 'FAIL' },
  { overlay: 'NOT_TESTED', updated: 'NOT_TESTED', expected: 'NOT_TESTED' },
] as const) {
  test(`Setup Wizard giữ trạng thái Overlay ${scenario.expected} khi tiếp tục`, async ({ page }) => {
    await installWizardApi(page, scenario.overlay, scenario.updated);
    await launchDashboard(page, { mock: false, setupDone: false });
    await goToOverlayStep(page);

    const overlayStep = page.getByTestId('setup-step-overlay');
    const checks = overlayStep.locator('.setup-check-detail');
    await expect(checks.nth(0).getByText(scenario.overlay, { exact: true })).toBeVisible();
    await expect(checks.nth(1).getByText(scenario.updated, { exact: true })).toBeVisible();
    await expect(page.locator('.setup-stage-heading .setup-status')).toHaveText(scenario.expected);

    expect(page.url()).not.toContain(adminToken);
    const overlayHref = await overlayStep.getByRole('link', { name: /Mở Overlay URL/ }).getAttribute('href');
    expect(overlayHref).not.toContain(adminToken);
    expect(overlayHref).toContain('role=program');
    const previewHref = await overlayStep.getByRole('link', { name: /Mở tab xem thử/ }).getAttribute('href');
    expect(previewHref).not.toContain('role=program');

    await page.getByTestId('setup-wizard').getByRole('button', { name: 'Tiếp', exact: true }).click();
    const summary = page.getByTestId('setup-step-summary');
    await expect(summary).toContainText('Chế độ offline');
    const overlayRow = summary.locator('.setup-summary-row').filter({ hasText: 'Kiểm tra Overlay' });
    await expect(overlayRow.getByText(scenario.expected, { exact: true })).toBeVisible();
    await expect(page.getByText('BƯỚC 8 / 8')).toBeVisible();
  });
}

test('chỉ nút “Kiểm tra sau” đổi trạng thái Overlay thành BỎ QUA', async ({ page }) => {
  await installWizardApi(page, 'PASS', 'PASS');
  await launchDashboard(page, { mock: false, setupDone: false });
  await goToOverlayStep(page);
  await expect(page.locator('.setup-stage-heading .setup-status')).toHaveText('PASS');

  await page.getByTestId('setup-step-overlay').getByRole('button', { name: 'Kiểm tra sau' }).click();

  const summary = page.getByTestId('setup-step-summary');
  await expect(summary).toContainText('Chế độ offline');
  const overlayRow = summary.locator('.setup-summary-row').filter({ hasText: 'Kiểm tra Overlay' });
  await expect(overlayRow.getByText('BỎ QUA', { exact: true })).toBeVisible();
});

test('phiên TikTok chặn username trống, ẩn tuỳ chọn MOCK và tạo được khi đủ 10 câu', async ({ page }) => {
  await launchDashboard(page);
  await page.getByRole('button', { name: 'TikTok LIVE', exact: true }).click();

  const form = page.locator('.create-form');
  const username = form.getByLabel('TikTok username');
  const questionCount = form.getByLabel('Số câu mỗi vòng');
  const speedBonus = form.getByLabel('Thưởng tốc độ tối đa');
  const createButton = form.getByRole('button', { name: 'Tạo phiên và mở Live Control' });
  await questionCount.selectOption('10');
  await expect(form.locator('.approved-question-gate')).toContainText('Đã duyệt 10 / cần 10');
  await expect(speedBonus).toHaveValue('50');
  await expect(speedBonus).toHaveAttribute('min', '0');
  await expect(speedBonus).toHaveAttribute('max', '500');
  await expect(form.getByLabel('Tốc độ MOCK')).toHaveCount(0);
  await expect(form.getByText(/Cho phép câu hỏi DEMO/)).toHaveCount(0);
  await expect(createButton).toBeEnabled();

  await createButton.click();
  expect(await username.evaluate((element) => (element as HTMLInputElement).validity.valueMissing)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Tạo phiên TikTok LIVE' })).toBeVisible();

  await username.fill('@quiz_codex');
  await createButton.click();
  await expect(page.getByRole('heading', { name: 'Phiên LIVE' })).toBeVisible();
  await expect(page.getByText('@quiz_codex', { exact: true })).toBeVisible();
  expect(page.url()).not.toContain(adminToken);
});

test('chặn tạo phiên TikTok khi có ít hơn 10 câu đã duyệt', async ({ page }) => {
  let createRequests = 0;
  await page.route('**/api/sessions/current', async (route: Route) => route.fulfill({ json: { sessionId: null } }));
  await page.route('**/api/questions', async (route: Route) => route.fulfill({ json: makeQuestions(9, 12) }));
  await page.route('**/api/sessions', async (route: Route) => {
    if (route.request().method() === 'POST') createRequests += 1;
    await route.fulfill({ status: 500, json: { message: 'Không được gọi khi chưa đủ câu.' } });
  });
  await launchDashboard(page, { mock: false });

  await page.getByLabel('Mã quản trị').fill(adminToken);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tạo phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'TikTok LIVE', exact: true }).click();
  await page.getByLabel('Số câu mỗi vòng').selectOption('10');

  await expect(page.locator('.approved-question-gate')).toContainText('Đã duyệt 9 / cần 10');
  await expect(page.getByRole('button', { name: 'Tạo phiên và mở Live Control' })).toBeDisabled();
  expect(createRequests).toBe(0);
});

test('lọc câu hỏi, xác nhận duyệt hàng loạt và bắt buộc nhập lý do từ chối', async ({ page }) => {
  await launchDashboard(page);
  await page.getByRole('button', { name: 'Duyệt câu hỏi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Duyệt câu hỏi' })).toBeVisible();

  const status = page.getByLabel('Trạng thái');
  await status.selectOption('APPROVED');
  await expect(page.locator('.review-result-count')).toHaveText('10 câu');
  await status.selectOption('PENDING');

  await page.getByLabel('Chủ đề').selectOption('clash-squad');
  await page.getByLabel('Độ khó').selectOption('EASY');
  await expect(page.locator('.review-result-count')).toHaveText('1 câu');
  const bulkButton = page.getByRole('button', { name: 'Duyệt tất cả câu đang lọc (1)' });
  await bulkButton.click();
  const bulkDialog = page.getByRole('dialog', { name: 'Duyệt 1 câu hỏi?' });
  await expect(bulkDialog).toBeVisible();
  await expect(page.locator('.review-summary')).toContainText('Đã duyệt 10 / cần 15');
  await bulkDialog.getByRole('button', { name: 'Xác nhận duyệt' }).click();
  await expect(page.getByRole('status')).toContainText('Đã duyệt 1 câu hỏi.');
  await expect(page.locator('.review-summary')).toContainText('Đã duyệt 11 / cần 15');

  await page.getByLabel('Chủ đề').selectOption('');
  await page.getByLabel('Độ khó').selectOption('');
  await page.getByRole('button', { name: 'Từ chối', exact: true }).first().click();
  const rejectDialog = page.getByRole('dialog', { name: 'Nhập lý do từ chối' });
  const reason = rejectDialog.getByLabel('Lý do');
  const rejectButton = rejectDialog.getByRole('button', { name: 'Từ chối câu hỏi' });
  await expect(rejectButton).toBeDisabled();
  await reason.fill('   ');
  await expect(rejectButton).toBeDisabled();
  await reason.fill('Câu hỏi trùng nội dung');
  await expect(rejectButton).toBeEnabled();
  await rejectButton.click();
  await expect(page.getByRole('status')).toContainText('Đã từ chối câu hỏi.');
});

test('Giao diện HUD đếm grapheme, lưu chữ, tải/reset ảnh và đổi cảnh preview', async ({ page }) => {
  const overlayPort = Number(process.env.PLAYWRIGHT_OVERLAY_PORT ?? 15176);
  await launchDashboard(page, { overlayUrl: `http://127.0.0.1:${overlayPort}/` });
  await page.setViewportSize({ width: 1440, height: 960 });
  let previewHudConfig: HudConfig = JSON.parse(JSON.stringify(DEFAULT_HUD_CONFIG)) as HudConfig;
  const previewAssets = new Map<string, Buffer>();
  await page.route('**/api/hud', (route) => route.fulfill({ json: previewHudConfig }));
  await page.route('**/hud-assets/**', (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1) ?? '');
    const image = previewAssets.get(id);
    return image
      ? route.fulfill({ status: 200, contentType: 'image/png', body: image })
      : route.fulfill({ status: 404, body: '' });
  });
  await page.getByRole('button', { name: 'Giao diện HUD', exact: true }).click();
  const settings = page.getByTestId('hud-settings-page');
  await expect(settings.getByRole('heading', { name: 'Giao diện HUD' })).toBeVisible();
  const reviewDirectory = join(process.cwd(), 'assets-local', 'review', 'hud');
  mkdirSync(reviewDirectory, { recursive: true });
  const preview = page.getByTestId('hud-preview');
  const previewFrame = page.frameLocator('[data-testid="hud-preview"]');
  const waitForPreview = async () => {
    await expect(preview).toHaveAttribute('src', `http://127.0.0.1:${overlayPort}/?role=preview&mock=question`);
    await expect(previewFrame.locator('.v3-stage')).toBeVisible();
    await expect(previewFrame.locator('.v3-title-ribbon')).toHaveCSS('font-size', '38px');
    await expect(previewFrame.locator('.v3-round-title')).toHaveCSS('font-size', '36px');
    await expect(previewFrame.getByTestId('participant-count')).toHaveCSS('font-size', '52px');
    await expect(previewFrame.locator('.v3-round-label')).toHaveCSS('font-size', '24px');
  };

  const kicker = page.getByLabel('Tên sự kiện góc trái');
  await expect(kicker).toHaveValue('STORM ARENA');
  await waitForPreview();
  await page.screenshot({ path: join(reviewDirectory, 'dashboard-default.png'), fullPage: true, animations: 'disabled' });
  await kicker.fill('A'.repeat(25));
  await expect(settings.locator('.hud-text-field').filter({ has: kicker }).locator('em')).toHaveText('Tối đa 24 ký tự hiển thị.');
  await expect(settings.getByRole('button', { name: 'Lưu giao diện' })).toBeDisabled();
  await page.screenshot({ path: join(reviewDirectory, 'dashboard-edit-validation.png'), fullPage: true, animations: 'disabled' });

  const logoPng = await createReviewPlaceholder(page, 'logo');
  const backgroundPng = await createReviewPlaceholder(page, 'background');
  const logoId = `${createHash('sha256').update(logoPng).digest('hex')}.png`;
  const backgroundId = `${createHash('sha256').update(backgroundPng).digest('hex')}.png`;
  previewAssets.set(logoId, logoPng);
  previewAssets.set(backgroundId, backgroundPng);

  await kicker.fill('LIVE ARENA');
  previewHudConfig = {
    ...previewHudConfig,
    version: previewHudConfig.version + 1,
    texts: { ...previewHudConfig.texts, kicker: 'LIVE ARENA' },
  };
  await settings.getByRole('button', { name: 'Lưu giao diện' }).click();
  await expect(settings.getByRole('status')).toContainText('Đã lưu giao diện HUD');
  await expect.poll(() => previewFrame.getByTestId('event-mark').getAttribute('aria-label')).toBe('LIVE ARENA');

  const logoSlot = page.getByTestId('hud-image-logo');
  await logoSlot.getByLabel('Tải ảnh').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: logoPng,
  });
  await expect(logoSlot.locator('code')).toHaveText(logoId);
  await expect(settings.getByRole('status')).toContainText('600 × 400px');
  previewHudConfig = {
    ...previewHudConfig,
    version: previewHudConfig.version + 1,
    images: { ...previewHudConfig.images, logo: logoId },
  };
  await expect.poll(() => previewFrame.getByTestId('brand-logo').getAttribute('src')).toBe(`/hud-assets/${logoId}`);
  await expect.poll(() => previewFrame.getByTestId('brand-logo').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(600);

  const questionBackground = page.getByTestId('hud-image-bgQuestion');
  await questionBackground.getByLabel('Tải ảnh').setInputFiles({
    name: 'background.png',
    mimeType: 'image/png',
    buffer: backgroundPng,
  });
  await expect(questionBackground.locator('code')).toHaveText(backgroundId);
  await expect(settings.getByRole('status')).toContainText('1080 × 1920px');
  previewHudConfig = {
    ...previewHudConfig,
    version: previewHudConfig.version + 1,
    images: { ...previewHudConfig.images, bgQuestion: backgroundId },
  };
  await expect.poll(() => previewFrame.getByTestId('arena-background').getAttribute('src')).toBe(`/hud-assets/${backgroundId}`);
  await expect.poll(() => previewFrame.getByTestId('arena-background').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(1080);
  await page.screenshot({ path: join(reviewDirectory, 'dashboard-uploaded.png'), fullPage: true, animations: 'disabled' });
  await logoSlot.getByRole('button', { name: 'Về mặc định ô này' }).click();
  await expect(logoSlot.getByText('Đang dùng ảnh mặc định')).toBeVisible();

  await page.getByLabel('Cảnh xem trước').selectOption('top10');
  await expect(preview).toHaveAttribute('src', /role=preview/);
  await expect(preview).toHaveAttribute('src', /mock=top10/);

  await settings.getByRole('button', { name: 'Về mặc định toàn bộ' }).click();
  await expect(kicker).toHaveValue('STORM ARENA');
  previewHudConfig = { ...DEFAULT_HUD_CONFIG, version: previewHudConfig.version + 1 };
  await page.getByLabel('Cảnh xem trước').selectOption('question');
  await expect(questionBackground.getByText('Đang dùng ảnh mặc định')).toBeVisible();
  await waitForPreview();
  await page.screenshot({ path: join(reviewDirectory, 'dashboard-reset.png'), fullPage: true, animations: 'disabled' });
});
