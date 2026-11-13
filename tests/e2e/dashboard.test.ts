import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer, type ViteDevServer } from '../../apps/dashboard/node_modules/vite/dist/node/index.js';
import { expect, test, type Page, type Route } from '@playwright/test';

let dashboardUrl = '';
const adminToken = 'e2e-admin-token-must-not-appear-in-url';
let dashboardServer: ViteDevServer | undefined;

test.beforeAll(async () => {
  const dashboardRoot = resolve(process.cwd(), 'apps/dashboard');
  dashboardServer = await createServer({
    root: dashboardRoot,
    configFile: resolve(dashboardRoot, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, strictPort: true },
  });
  await dashboardServer.listen();
  const address = dashboardServer.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Không lấy được cổng dashboard E2E.');
  dashboardUrl = 'http://127.0.0.1:' + address.port;
});

test.afterAll(async () => {
  await dashboardServer?.close();
});

async function launchDashboard(page: Page, options: { mock?: boolean; setupDone?: boolean } = {}) {
  const { mock = true, setupDone = true } = options;
  await page.addInitScript(({ completed, token }) => {
    localStorage.clear();
    sessionStorage.clear();
    if (completed) localStorage.setItem('quiz.setupDone', '1');
    sessionStorage.setItem('quiz.adminToken', token);
  }, { completed: setupDone, token: adminToken });
  await page.goto(`${dashboardUrl}/${mock ? '?mock=1' : ''}`);
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

test('kiểm duyệt tên DEMO: lọc, ẩn/cho hiện, quy tắc, ngoại lệ, audit và preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const overlayPort = process.env.PLAYWRIGHT_OVERLAY_PORT ?? '15176';
  await page.route('**/overlay/**', (route) => {
    const overlay = new URL(route.request().url());
    overlay.port = overlayPort;
    overlay.pathname = '/';
    return route.continue({ url: overlay.toString() });
  });
  await launchDashboard(page);
  await page.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  await expect(page.getByRole('heading', { name: 'Phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'Kiểm duyệt tên', exact: true }).click();

  const moderation = page.getByTestId('name-moderation-page');
  await expect(moderation.getByRole('heading', { name: 'Kiểm duyệt tên' })).toBeVisible();
  await expect(moderation.getByTestId('name-voice-notice')).toContainText('Đọc tên người chơi: Chưa hỗ trợ trong phiên bản này');
  await expect(moderation.getByRole('button', { name: /đọc tên/i })).toHaveCount(0);
  const impersonationRow = moderation.getByTestId('moderation-player-row').filter({ hasText: 'Admin Bão Tố' });
  await expect(impersonationRow.getByText('Admin Bão Tố')).toBeVisible();
  await expect(impersonationRow.getByText('Người chơi 02')).toBeVisible();

  const reviewDirectory = join(process.cwd(), 'assets-local', 'review', 'name-moderation');
  mkdirSync(reviewDirectory, { recursive: true });
  const top10Frame = moderation.frameLocator('iframe[title="Overlay preview TOP 10"]');
  const top10Stage = top10Frame.locator('[data-testid="stage"]');
  await expect(top10Stage).toBeVisible();
  await expect(top10Frame.locator('body')).not.toContainText('Bình Minh 84');
  await expect(top10Frame.locator('body')).not.toContainText('Admin Bão Tố');
  await moderation.locator('iframe[title="Overlay preview TOP 10"]').screenshot({ path: join(reviewDirectory, 'embedded-preview-top10.png'), animations: 'disabled', timeout: 8_000 });
  const overlayScene = await page.context().newPage();
  await overlayScene.setViewportSize({ width: 1080, height: 1920 });
  await overlayScene.goto(`http://127.0.0.1:${overlayPort}/?mock=top10&hud=1`);
  await expect(overlayScene.locator('[data-testid="stage"]')).toBeVisible();
  await expect(overlayScene.locator('body')).not.toContainText('Bình Minh 84');
  await expect(overlayScene.locator('body')).not.toContainText('Admin Bão Tố');
  await overlayScene.screenshot({ path: join(reviewDirectory, 'overlay-top10.png'), fullPage: true, animations: 'disabled' });
  await overlayScene.close();
  await page.screenshot({ path: join(reviewDirectory, 'flagged-list.png'), fullPage: true });
  await page.screenshot({ path: join(reviewDirectory, 'live-before-hide.png'), fullPage: true });

  const reviewRow = moderation.getByTestId('moderation-player-row').filter({ hasText: 'Bình Minh 84' });
  await reviewRow.getByRole('button', { name: 'Cho phép REVIEW' }).click();
  await expect(reviewRow.locator('.moderation-live-name')).toHaveText('Bình Minh 84');
  await expect(reviewRow.getByRole('button', { name: 'Đã cho phép' })).toBeDisabled();

  const unflagged = moderation.getByTestId('moderation-player-row').filter({ hasText: 'Nắng Tháng Ba' });
  await expect(unflagged.getByText('Bình thường')).toBeVisible();
  await unflagged.getByRole('button', { name: 'Ẩn', exact: true }).click();
  await expect(unflagged.getByText('Người chơi 05')).toBeVisible();
  await expect(unflagged).toHaveAttribute('data-hidden', 'true');

  await moderation.getByLabel('Chọn Bình Minh 84').check();
  await moderation.getByLabel('Chọn Gió Lặng 09').check();
  await moderation.getByRole('button', { name: 'Ẩn đã chọn' }).click();
  await expect(moderation.getByTestId('moderation-hidden-count')).toHaveText('4');
  await expect(moderation.getByTestId('moderation-history').getByText('Ẩn tên').first()).toBeVisible();
  await page.screenshot({ path: join(reviewDirectory, 'live-after-hide.png'), fullPage: true });

  const search = moderation.getByLabel('Tìm theo tên');
  await search.fill('Mây Xanh');
  await expect(moderation.getByTestId('moderation-player-row')).toHaveCount(1);
  await moderation.getByLabel('Lọc mức cảnh báo').selectOption('HIGH');
  await expect(moderation.getByTestId('moderation-player-row')).toHaveCount(0);
  await moderation.getByLabel('Lọc mức cảnh báo').selectOption('ALL');
  await search.clear();

  await moderation.getByLabel('Từ / cụm từ cần chặn').fill('Cụm Demo 42');
  await moderation.getByLabel('Mức xử lý').selectOption('PARTIAL');
  await moderation.getByRole('button', { name: 'Thêm từ chặn', exact: true }).click();
  const addedRule = moderation.getByLabel('Từ chặn hiện tại').getByText('Cụm Demo 42');
  await expect(addedRule).toBeVisible();
  await expect(moderation.getByLabel('Từ chặn hiện tại')).toContainText('che một phần');
  await moderation.getByLabel('Người chơi có rule áp dụng').selectOption('demo-high-002');
  await expect(moderation.getByLabel('Người chơi có rule áp dụng')).toHaveValue('demo-high-002');
  await moderation.getByLabel('Thêm ngoại lệ').fill('Đội Ánh Sao');
  await moderation.getByRole('button', { name: 'Thêm ngoại lệ', exact: true }).click();
  await expect(moderation.getByLabel('Ngoại lệ hiện tại').getByText('Đội Ánh Sao')).toBeVisible();

  await moderation.getByLabel('Cảnh preview overlay').selectOption('victory');
  await expect(moderation.getByTitle('Overlay preview VICTORY')).toBeVisible();
  const victoryFrame = moderation.frameLocator('iframe[title="Overlay preview VICTORY"]');
  const victoryStage = victoryFrame.locator('[data-testid="stage"][data-scene="VICTORY"]');
  await expect(victoryStage).toBeVisible();
  await expect(victoryFrame.locator('body')).not.toContainText('Bình Minh 84');
  await expect(victoryFrame.locator('body')).not.toContainText('Admin Bão Tố');
  const victoryOverlay = await page.context().newPage();
  await victoryOverlay.setViewportSize({ width: 1080, height: 1920 });
  await victoryOverlay.goto(`http://127.0.0.1:${overlayPort}/?mock=victory&hud=1`);
  await expect(victoryOverlay.locator('[data-testid="stage"][data-scene="VICTORY"]')).toBeVisible();
  await expect(victoryOverlay.locator('body')).not.toContainText('Bình Minh 84');
  await expect(victoryOverlay.locator('body')).not.toContainText('Admin Bão Tố');
  await victoryOverlay.screenshot({ path: join(reviewDirectory, 'overlay-victory.png'), fullPage: true, animations: 'disabled' });
  await victoryOverlay.close();
  expect(page.url()).not.toContain(adminToken);
});
