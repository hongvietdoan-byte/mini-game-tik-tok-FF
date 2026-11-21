import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DEFAULT_HUD_CONFIG, type HudConfig } from '@quiz/contracts';
import { createServer, type ViteDevServer } from '../../apps/dashboard/node_modules/vite/dist/node/index.js';
import { expect, test, type Page, type Route } from '@playwright/test';
import { SessionConfigSchema, type AdminSnapshot, type CommandEnvelope, type CreateSessionRequest } from '@quiz/contracts';
import { mockClient } from '../../apps/dashboard/src/api/mockClient';
import type { NameModerationSettingsResponse, NameRuleGroup } from '../../apps/dashboard/src/nameModerationData';

let dashboardUrl = '';
const adminToken = 'e2e-admin-token-must-not-appear-in-url';
let dashboardServer: ViteDevServer | undefined;

test.beforeAll(async ({}, workerInfo) => {
  const dashboardRoot = resolve(process.cwd(), 'apps/dashboard');
  const serverPort = Number(process.env.PLAYWRIGHT_SERVER_PORT ?? 18787);
  const dashboardPort = 20_000 + (process.pid % 10_000) + workerInfo.workerIndex;
  dashboardServer = await createServer({
    root: dashboardRoot,
    configFile: resolve(dashboardRoot, 'vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port: dashboardPort,
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

async function launchDashboard(page: Page, options: { mock?: boolean; mockSeatCapacity?: number; setupDone?: boolean; overlayUrl?: string } = {}) {
  const { mock = true, mockSeatCapacity, setupDone = true, overlayUrl } = options;
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
  const query = new URLSearchParams();
  if (mock) query.set('mock', '1');
  if (mockSeatCapacity !== undefined) query.set('mockSeatCapacity', String(mockSeatCapacity));
  await page.goto(`${dashboardUrl}/${query.size ? `?${query.toString()}` : ''}`);
}

test('C-0383 dashboard shows round winners and TikTok profile fallbacks', async ({ page }) => {
  await launchDashboard(page);
  await page.getByRole('button', { name: 'Người thắng' }).click();

  const winners = page.getByTestId('winners-page');
  await expect(winners.getByRole('heading', { name: 'Người thắng' })).toBeVisible();
  await expect(winners.getByTestId('winner-row')).toHaveCount(3);
  await expect(winners).toContainText('Phiên DEMO cũ');
  await expect(winners).toContainText('@rong_lua');
  const profileLinks = winners.getByRole('link', { name: 'Mở TikTok ↗' });
  await expect(profileLinks.nth(0)).toHaveAttribute('href', 'https://www.tiktok.com/@rong_lua');
  await expect(profileLinks.nth(1)).toHaveAttribute('href', 'https://www.tiktok.com/share/user/demo-tiktok-7124');

  const reviewDir = resolve(process.cwd(), 'assets-local/review/c-sau-live-ui');
  mkdirSync(reviewDir, { recursive: true });
  await winners.screenshot({ path: resolve(reviewDir, 'D-winners-dashboard.png') });
});

async function stopDashboardSession(page: Page) {
  await page.locator('.danger-actions').getByRole('button', { name: 'Dừng phiên' }).click();
  const dialog = page.getByRole('dialog', { name: 'Xác nhận: Dừng phiên' });
  await dialog.getByLabel('Lý do').fill('Kết thúc phiên kiểm thử');
  await dialog.getByRole('button', { name: 'Xác nhận' }).click();
}

test('C-0335 cấu hình chủ đề ưu tiên trong Dashboard MOCK', async ({ page }) => {
  await launchDashboard(page);
  await page.getByRole('button', { name: 'Duyệt câu hỏi' }).click();
  const settings = page.getByTestId('priority-topic-settings');
  await expect(settings.getByRole('heading', { name: 'Chủ đề ưu tiên' })).toBeVisible();
  await expect(settings.getByRole('checkbox', { name: 'Ưu tiên FFA 2026' })).toBeVisible();
  await expect(settings.getByText('0 câu APPROVED').first()).toBeVisible();
  mkdirSync(resolve(process.cwd(), 'test-results/C0335'), { recursive: true });
  await settings.screenshot({ path: resolve(process.cwd(), 'test-results/C0335/priority-topic-settings.png') });

  await settings.getByRole('textbox', { name: 'Thêm tên chủ đề' }).fill('Giải thử nghiệm');
  await settings.getByRole('button', { name: 'Thêm' }).click();
  const share = settings.getByRole('spinbutton', { name: 'Tỉ lệ ưu tiên (%)' });
  await share.fill('100');
  await expect(share).toHaveValue('100');
  await settings.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(settings.getByText(/Đã lưu/)).toBeVisible();
});

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

test('form cấu hình thời gian chờ giọng câu 1 cho MOCK/TikTok và false khi tắt giọng', async ({ page }) => {
  const requests: CreateSessionRequest[] = [];
  await page.route('**/api/sessions/current', (route) => route.fulfill({ json: { sessionId: null } }));
  await page.route('**/api/questions', (route) => route.fulfill({ json: makeQuestions(10, 10) }));
  await page.route('**/api/sessions', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: { sessionId: null } });
    requests.push(route.request().postDataJSON() as CreateSessionRequest);
    await route.fulfill({ status: 500, json: { message: 'Đã ghi nhận payload kiểm thử.' } });
  });
  await launchDashboard(page, { mock: false });
  await page.getByLabel('Mã quản trị').fill(adminToken);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tạo phiên MOCK' })).toBeVisible();

  const voiceToggle = page.getByRole('checkbox', { name: 'Giọng MC' });
  const voiceWait = page.getByLabel('Thời gian chờ giọng câu 1');
  const createButton = page.getByRole('button', { name: 'Tạo phiên và mở Live Control' });
  await expect(voiceToggle).toBeChecked();
  await expect(voiceWait).toHaveValue('30');
  await createButton.click();
  await expect(page.getByRole('alert')).toContainText('Đã ghi nhận payload kiểm thử.');
  expect(requests[0]?.config).toMatchObject({ mode: 'MOCK', mcVoiceEnabled: true, mcVoiceStartWaitMs: 30_000 });

  await page.getByRole('button', { name: 'TikTok LIVE', exact: true }).click();
  await page.getByLabel('Số câu mỗi vòng').selectOption('10');
  await page.getByLabel('TikTok username').fill('@quiz_codex');
  await voiceWait.fill('12');
  await expect(createButton).toBeEnabled();
  await expect(voiceToggle).toBeChecked();
  await createButton.click();
  await expect(page.getByRole('alert')).toContainText('Đã ghi nhận payload kiểm thử.');
  expect(requests[1]?.config).toMatchObject({ mode: 'TIKTOK', tiktokUsername: '@quiz_codex', mcVoiceEnabled: true, mcVoiceStartWaitMs: 12_000 });

  await voiceToggle.uncheck();
  await expect(voiceWait).toHaveCount(0);
  await createButton.click();
  await expect(page.getByRole('alert')).toContainText('Đã ghi nhận payload kiểm thử.');
  expect(requests[2]?.config).toMatchObject({ mode: 'TIKTOK', tiktokUsername: '@quiz_codex', mcVoiceEnabled: false, mcVoiceStartWaitMs: 12_000 });
});

test('Live Control hiển thị giọng MC bật/tắt và preflight mcVoice', async ({ page }) => {
  await launchDashboard(page);
  await page.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  const voiceStatus = page.getByTestId('mc-voice-session-status');
  await expect(voiceStatus).toContainText('Giọng MC Bật');
  await expect(voiceStatus).toContainText('Preflight mcVoice: Cảnh báo');

  await page.goto(`${dashboardUrl}/?mock=1`);
  await page.getByRole('checkbox', { name: 'Giọng MC' }).uncheck();
  await page.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  await expect(page.getByTestId('mc-voice-session-status')).toContainText('Giọng MC Tắt');
  await expect(page.getByTestId('mc-voice-session-status')).toContainText('Giọng MC đang tắt');
});

test('MC chat hoạt động trong MOCK và câu mẫu gửi lại được', async ({ page }) => {
  await launchDashboard(page);
  await page.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  await expect(page.getByTestId('mc-chat-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Mở sảnh' }).click();

  const message = 'Nhớ theo dõi kênh để xem vòng sau!';
  await page.getByLabel('Câu muốn gửi').fill(message);
  await page.getByLabel('Đọc giọng').uncheck();
  await page.getByRole('button', { name: 'Lưu mẫu' }).click();
  await expect(page.getByRole('listitem').getByText(message, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gửi mẫu' }).click();
  await expect(page.getByTestId('mc-chat-queue-item').first()).toHaveAttribute('data-status', 'PLAYING');
  await expect(page.getByTestId('mc-chat-mock-note')).toContainText('không gọi dịch vụ sinh giọng');
});

test('C-0283: MOCK bình luận giành ghế, huỷ đếm ngược rồi tự vào vòng sau 10 giây', async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install({ time: new Date('2026-11-18T10:00:00.000Z') });
  await launchDashboard(page, { mockSeatCapacity: 30 });
  await page.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  await page.getByRole('button', { name: 'Mở sảnh' }).click();

  const autoStart = page.getByRole('checkbox', { name: 'Tự bắt đầu khi đủ ghế' });
  await expect(autoStart).not.toBeChecked();
  await expect(page.getByTestId('lobby-seat-status')).toHaveText('Đã ngồi 0/30');
  const commentForm = page.locator('.comment-form');
  for (let index = 1; index <= 30; index += 1) {
    await commentForm.locator('input[name="userId"]').fill(`c0283-viewer-${index}`);
    await commentForm.locator('input[name="displayName"]').fill(`Người xem ${index}`);
    await commentForm.locator('input[name="text"]').fill('FF FREE FIRE!!!');
    await commentForm.getByRole('button', { name: 'Gửi bình luận' }).click();
    await expect(page.getByTestId('lobby-seat-status')).toHaveText(index === 30 ? 'Đã đủ ghế' : `Đã ngồi ${index}/30`);
    if (index === 24) await expect(page.getByTestId('lobby-seat-status')).toHaveText('Đã ngồi 24/30');
  }
  await expect(page.getByTestId('lobby-auto-start-countdown')).toHaveCount(0);
  const reviewDirectory = resolve(process.cwd(), 'assets-local/review/c-sau-live-ui');
  mkdirSync(reviewDirectory, { recursive: true });
  await page.getByTestId('lobby-seat-status').screenshot({ path: resolve(reviewDirectory, 'A-lobby-seat-30-of-30.png') });

  await autoStart.check();
  const countdown = page.getByTestId('lobby-auto-start-countdown');
  await expect(countdown).toContainText('Vào trận sau 10…');
  await autoStart.uncheck();
  await expect(autoStart).not.toBeChecked();
  await expect(countdown).toHaveCount(0);
  await page.clock.fastForward(10_000);
  await expect(page.getByTestId('lobby-seat-status')).toHaveText('Đã đủ ghế');

  await autoStart.check();
  await expect(countdown).toContainText('Vào trận sau 10…');
  await page.clock.fastForward(10_000);
  await expect(page.getByTestId('lobby-auto-start-control')).toHaveCount(0);
  await expect(page.getByTestId('mc-bubble')).toContainText('Sẵn sàng nhé!');
});

test('C-0270: tự gửi lại PAUSE một lần với stateVersion mới và khoá nút khi đang chờ', async ({ page }) => {
  test.setTimeout(30_000);
  const previousSessionId = await mockClient.currentSession();
  if (previousSessionId) {
    const previous = await mockClient.getState('', previousSessionId);
    await mockClient.sendCommand('', previousSessionId, {
      commandId: 'c0270-cleanup-existing-session',
      expectedStateVersion: previous.public.stateVersion,
      operatorId: 'e2e',
      requestedAtMs: Date.now(),
      command: { type: 'STOP', reason: 'Dọn trạng thái giữa các bài E2E' },
    });
  }
  const created = await mockClient.createSession('', {
    name: 'C-0270 stale retry',
    config: SessionConfigSchema.parse({ mode: 'MOCK', allowDemoQuestions: true }),
  });
  let snapshot: AdminSnapshot = created.snapshot;
  const openLobby = await mockClient.sendCommand('', created.sessionId, {
    commandId: 'c0270-open-lobby', expectedStateVersion: snapshot.public.stateVersion,
    operatorId: 'e2e', requestedAtMs: Date.now(), command: { type: 'OPEN_LOBBY' },
  });
  expect(openLobby.result.ok).toBe(true);
  snapshot = await mockClient.getState('', created.sessionId);
  const startRound = await mockClient.sendCommand('', created.sessionId, {
    commandId: 'c0270-start-round', expectedStateVersion: snapshot.public.stateVersion,
    operatorId: 'e2e', requestedAtMs: Date.now(), command: { type: 'START_ROUND', questionCount: 20 },
  });
  expect(startRound.result.ok).toBe(true);
  snapshot = await mockClient.getState('', created.sessionId);

  const pauseEnvelopes: CommandEnvelope[] = [];
  let signalFirstPause!: () => void;
  const firstPauseReached = new Promise<void>((resolve) => { signalFirstPause = resolve; });
  let releaseStaleResponse!: () => void;
  const staleResponseReleased = new Promise<void>((resolve) => { releaseStaleResponse = resolve; });

  // Tắt snapshot websocket để buộc dashboard làm mới state sau xung đột phiên bản.
  await page.routeWebSocket('**/ws**', (socket) => socket.onMessage(() => {}));
  await page.route('**/api/sessions/current', (route) => route.fulfill({ json: { sessionId: null } }));
  await page.route('**/api/questions', (route) => route.fulfill({ json: makeQuestions(20, 20) }));
  await page.route('**/api/preflight', (route) => route.fulfill({ json: { checks: [] } }));
  await page.route('**/api/sessions', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: { sessionId: null } });
    return route.fulfill({ json: { sessionId: created.sessionId, snapshot } });
  });
  await page.route('**/api/sessions/*/state', (route) => route.fulfill({ json: snapshot }));
  await page.route('**/api/sessions/*/commands', async (route) => {
    const envelope = route.request().postDataJSON() as CommandEnvelope;
    if (envelope.command.type === 'PAUSE') {
      pauseEnvelopes.push(envelope);
      if (pauseEnvelopes.length === 1) {
        const latest = await mockClient.getState('', created.sessionId);
        const concurrent: CommandEnvelope = {
          ...envelope,
          commandId: 'c0270-concurrent-auto-mode',
          expectedStateVersion: latest.public.stateVersion,
          command: { type: 'SET_AUTO_MODE', enabled: true },
        };
        const concurrentResponse = await mockClient.sendCommand('', created.sessionId, concurrent);
        expect(concurrentResponse.status).toBe(200);
        snapshot = await mockClient.getState('', created.sessionId);
        signalFirstPause();
        await staleResponseReleased;
        return route.fulfill({ status: 409, json: {
          ok: false, code: 'STALE_STATE_VERSION', message: 'Trạng thái đã thay đổi.',
          stateVersion: snapshot.public.stateVersion, duplicate: false,
        } });
      }
    }
    const response = await mockClient.sendCommand('', created.sessionId, envelope);
    snapshot = await mockClient.getState('', created.sessionId);
    return route.fulfill({ status: response.status, json: response.result });
  });

  await launchDashboard(page, { mock: false });
  await page.getByLabel('Mã quản trị').fill(adminToken);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tạo phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  await expect(page.getByRole('heading', { name: 'Phiên MOCK' })).toBeVisible();
  const pauseButton = page.getByRole('button', { name: 'Tạm dừng', exact: true });
  await expect(pauseButton).toBeEnabled();

  const pauseClick = pauseButton.click();
  await firstPauseReached;
  await expect(pauseButton).toBeDisabled();
  releaseStaleResponse();
  await pauseClick;

  await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeVisible();
  await expect(page.locator('.alert-success')).toContainText('Đã gửi lệnh.');
  expect(pauseEnvelopes).toHaveLength(2);
  expect(pauseEnvelopes[1]!.expectedStateVersion).toBeGreaterThan(pauseEnvelopes[0]!.expectedStateVersion);

  const latest = await mockClient.getState('', created.sessionId);
  const stopped = await mockClient.sendCommand('', created.sessionId, {
    commandId: 'c0270-cleanup-session', expectedStateVersion: latest.public.stateVersion,
    operatorId: 'e2e', requestedAtMs: Date.now(),
    command: { type: 'STOP', reason: 'Dọn trạng thái giữa các bài E2E' },
  });
  expect(stopped.result.ok).toBe(true);
});

test('sau STOP hiện Tạo phiên mới, giữ lựa chọn và tạo phiên kế tiếp không cần tải lại', async ({ page }) => {
  const openSession = await mockClient.currentSession();
  await launchDashboard(page);
  if (openSession) {
    await expect(page.locator('.session-heading')).toBeVisible();
    await stopDashboardSession(page);
    await expect(page.getByTestId('closed-session')).toBeVisible();
    await page.getByRole('button', { name: 'Tạo phiên mới' }).click();
  }

  const form = page.locator('.create-form');
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: 'TikTok LIVE', exact: true }).click();
  await form.getByLabel('Số câu mỗi vòng').selectOption('10');
  await form.getByLabel('TikTok username').fill('@quiz_codex_stop');
  await form.getByLabel('Giọng MC').uncheck();
  await form.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  await expect(page.locator('.session-heading')).toContainText('Phiên LIVE');
  await expect(page.locator('.tiktok-account')).toContainText('@quiz_codex_stop');

  await stopDashboardSession(page);
  const closed = page.getByTestId('closed-session');
  await expect(closed).toBeVisible();
  await expect(closed.getByRole('button', { name: 'Tạo phiên mới' })).toBeEnabled();
  await expect(page.locator('.actions-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tạo phiên mới' }).click();

  await expect(form).toBeVisible();
  await expect(form.getByRole('button', { name: 'TikTok LIVE', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(form.getByLabel('TikTok username')).toHaveValue('@quiz_codex_stop');
  await expect(form.getByLabel('Giọng MC')).not.toBeChecked();
  await form.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();

  await expect(page.locator('.session-heading')).toContainText('Phiên LIVE');
  await expect(page.locator('.tiktok-account')).toContainText('@quiz_codex_stop');
  await expect(page.getByTestId('mc-voice-session-status')).toContainText('Giọng MC Tắt');
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

  const topicFilter = page.locator('.review-toolbar').getByLabel('Chủ đề');
  await topicFilter.selectOption('clash-squad');
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

  await topicFilter.selectOption('');
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
  const top10Preview = moderation.getByTestId('moderation-preview-top10');
  await expect(top10Preview.locator('.moderation-preview-rows > li')).toHaveCount(10);
  await expect(top10Preview).toContainText('Nắng Tháng Ba');
  await expect(top10Preview).not.toContainText('Người chơi 05');
  await top10Preview.screenshot({ path: join(reviewDirectory, 'preview-top10.png'), animations: 'disabled' });
  await moderation.getByLabel('Cảnh xem trước').selectOption('victory');
  const victoryPreview = moderation.getByTestId('moderation-preview-victory');
  await expect(victoryPreview.locator('.moderation-preview-rows > li')).toHaveCount(3);
  await victoryPreview.screenshot({ path: join(reviewDirectory, 'preview-victory.png'), animations: 'disabled' });
  await moderation.getByLabel('Cảnh xem trước').selectOption('top10');
  await expect(moderation.getByTestId('moderation-hidden-count')).toHaveText('3');
  const normalRow = moderation.getByTestId('moderation-player-row').filter({ hasText: 'Nắng Tháng Ba' });
  await expect(normalRow.locator('.moderation-live-name')).toHaveText('Nắng Tháng Ba');
  await expect(normalRow.locator('td').nth(2).locator('small')).toHaveText('Đang hiển thị');
  await page.screenshot({ path: join(reviewDirectory, 'flagged-list.png'), fullPage: true });
  await page.screenshot({ path: join(reviewDirectory, 'live-before-hide.png'), fullPage: true });

  const reviewRow = moderation.getByTestId('moderation-player-row').filter({ hasText: 'Bình Minh 84' });
  await reviewRow.getByRole('button', { name: 'Cho phép hiện' }).click();
  await expect(reviewRow.locator('.moderation-live-name')).toHaveText('Bình Minh 84');
  await expect(reviewRow.getByRole('button', { name: 'Đã cho phép' })).toBeDisabled();

  await moderation.getByLabel('Chọn Nắng Tháng Ba').check();
  await moderation.getByLabel('Chọn Mưa Nhẹ 18').check();
  await moderation.getByRole('button', { name: 'Ẩn đã chọn' }).click();
  await expect(moderation.getByTestId('moderation-hidden-count')).toHaveText('4');
  await expect(moderation.locator('.moderation-notice.alert-success')).toContainText('Đã ẩn 2 tên trong dữ liệu DEMO.');
  await expect(moderation.locator('[data-risk="MANUAL_HIDE"]')).toHaveCount(3);
  await expect(moderation.getByTestId('moderation-player-row').filter({ hasText: 'Nắng Tháng Ba' }).locator('.moderation-live-name')).toHaveText('Người chơi 05');
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
  await moderation.getByLabel('Người chơi có quy tắc áp dụng').selectOption('demo-high-002');
  await expect(moderation.getByLabel('Người chơi có quy tắc áp dụng')).toHaveValue('demo-high-002');
  await moderation.getByLabel('Thêm ngoại lệ').fill('Đội Ánh Sao');
  await moderation.getByRole('button', { name: 'Thêm ngoại lệ', exact: true }).click();
  await expect(moderation.getByLabel('Ngoại lệ hiện tại').getByText('Đội Ánh Sao')).toBeVisible();

  await moderation.getByLabel('Cảnh xem trước').selectOption('victory');
  await expect(moderation.getByTestId('moderation-preview-victory')).toBeVisible();
  await expect(moderation.getByTestId('moderation-preview-victory')).toContainText('Sương Sớm 09');
  expect(page.url()).not.toContain(adminToken);
});

test('kiểm duyệt tên LIVE dùng đúng schema settings, mutation, audit và tải lại roster sau visibility/review', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { snapshot } = await mockClient.createSession('e2e', {
    name: 'C-0183 API DEMO',
    config: SessionConfigSchema.parse({ mode: 'MOCK', allowDemoQuestions: true }),
  });

  let playersGetCount = 0;
  let settingsGetCount = 0;
  let auditGetCount = 0;
  const authHeaders: string[] = [];
  let players = [{
    playerId: 'api-player-01', rawDisplayName: 'Người Chơi Demo 01', safeDisplayName: 'Người chơi 01',
    risk: 'REVIEW', displayAction: 'ALIAS', matchedRuleIds: ['custom.rule1'], matchedRuleGroups: ['PROFANITY'],
    requiresReview: true, hidden: false, reviewAllowed: false, policyVersion: 4, checkedAt: 1_700_000_000_000,
    rank: 1, seat: null, score: 900,
  }];
  let settings: NameModerationSettingsResponse = {
    rules: [{ id: 'custom.rule1', term: 'demo-rule', aliases: [], match: 'word', group: 'PROFANITY', severity: 'HIGH', source: 'CUSTOM' }],
    whitelist: [{ value: 'Demo Allow', ruleIds: ['custom.rule1'] }],
    version: 4,
    protectedEntities: [{ id: 'storm-arena', label: 'Storm Arena', aliases: ['Storm Arena'], kind: 'BRAND', source: 'SYSTEM', scope: 'PLAYER_DISPLAY_NAME', rule: 'REVIEW_OR_HIGH_CONTEXT' }],
    playerNameSpeech: 'UNSUPPORTED',
    hiddenPlayerIds: [], allowedReviewPlayerIds: [], verifiedOfficialAccounts: [],
  };
  let auditEntries = [{ id: 'audit-1', at: 1_700_000_000_000, actor: 'Người vận hành', action: 'PLAYERS_HIDDEN', policyVersion: 4, targetCount: 1 }];
  const recordAudit = (action: string, targetCount: number, ruleId?: string) => {
    auditEntries = [{ id: `audit-${Date.now()}`, at: Date.now(), actor: 'Người vận hành', action, policyVersion: settings.version, targetCount, ...(ruleId ? { ruleId } : {}) }, ...auditEntries];
  };
  const mutationResponse = () => ({
    rules: settings.rules, whitelist: settings.whitelist, hiddenPlayerIds: settings.hiddenPlayerIds,
    allowedReviewPlayerIds: settings.allowedReviewPlayerIds, verifiedOfficialAccounts: settings.verifiedOfficialAccounts,
    version: settings.version,
  });

  await page.route('**/api/sessions/current', (route) => route.fulfill({ json: { sessionId: null } }));
  await page.route('**/api/questions', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/sessions', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: { sessionId: null } });
    await route.fulfill({ json: { sessionId: 'c0183-session', snapshot } });
  });
  await page.route('**/api/admin/name-filter**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    authHeaders.push(route.request().headers().authorization ?? '');
    if (path.endsWith('/players') && method === 'GET') {
      playersGetCount += 1;
      return route.fulfill({ json: { players, policyVersion: settings.version, playerNameSpeech: 'UNSUPPORTED' } });
    }
    if (path.endsWith('/players/visibility') && method === 'POST') {
      const body = route.request().postDataJSON() as { playerIds: string[]; hidden: boolean };
      players = players.map((player) => body.playerIds.includes(player.playerId) ? {
        ...player, hidden: body.hidden, risk: body.hidden ? 'MANUAL_HIDE' : 'REVIEW',
        safeDisplayName: body.hidden ? 'Người chơi 01' : player.reviewAllowed ? player.rawDisplayName : 'Người chơi 01',
      } : player);
      settings = { ...settings, hiddenPlayerIds: body.hidden ? body.playerIds : [] , version: settings.version + 1 };
      recordAudit(body.hidden ? 'PLAYERS_HIDDEN' : 'PLAYERS_RESTORED', body.playerIds.length);
      return route.fulfill({ json: mutationResponse() });
    }
    if (path.endsWith('/players/review') && method === 'POST') {
      const body = route.request().postDataJSON() as { playerIds: string[]; allowed: boolean };
      players = players.map((player) => body.playerIds.includes(player.playerId) ? {
        ...player, reviewAllowed: body.allowed, safeDisplayName: body.allowed ? player.rawDisplayName : 'Người chơi 01',
      } : player);
      settings = { ...settings, allowedReviewPlayerIds: body.allowed ? body.playerIds : [], version: settings.version + 1 };
      recordAudit(body.allowed ? 'REVIEW_ALLOWED' : 'REVIEW_ALLOW_REMOVED', body.playerIds.length);
      return route.fulfill({ json: mutationResponse() });
    }
    if (path === '/api/admin/name-filter' && method === 'GET') {
      settingsGetCount += 1;
      return route.fulfill({ json: settings });
    }
    if (path === '/api/admin/name-filter' && method === 'PUT') {
      const body = route.request().postDataJSON() as typeof settings;
      settings = { ...settings, ...body, version: settings.version + 1 };
      recordAudit('POLICY_UPDATED', 0);
      return route.fulfill({ json: settings });
    }
    if (path === '/api/admin/name-filter/audit' && method === 'GET') {
      auditGetCount += 1;
      return route.fulfill({ json: { entries: auditEntries.slice(0, Number(url.searchParams.get('limit') ?? 100)) } });
    }
    if (path === '/api/admin/name-filter/rules' && method === 'POST') {
      const body = route.request().postDataJSON() as { term: string; aliases: string[]; match: 'word' | 'substring'; group: NameRuleGroup; severity: 'PARTIAL' | 'HIGH' };
      const rule = { ...body, id: `custom.rule${settings.rules.length + 1}`, source: 'CUSTOM' as const };
      settings = { ...settings, rules: [...settings.rules, rule], version: settings.version + 1 };
      recordAudit('CUSTOM_RULE_ADDED', 0, rule.id);
      return route.fulfill({ json: mutationResponse() });
    }
    if (path === '/api/admin/name-filter/exceptions' && method === 'POST') {
      const body = route.request().postDataJSON() as { value: string; ruleIds: string[] };
      settings = { ...settings, whitelist: [...settings.whitelist, body], version: settings.version + 1 };
      recordAudit('SCOPED_EXCEPTION_ADDED', 0);
      return route.fulfill({ json: mutationResponse() });
    }
    if (path === '/api/admin/name-filter/recheck' && method === 'POST')
      return route.fulfill({ json: { policyVersion: settings.version, checked: players.length, changed: 0, flagged: 1 } });
    return route.fulfill({ status: 404, json: { message: `Unexpected moderation request: ${method} ${path}` } });
  });

  await launchDashboard(page, { mock: false });
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tạo phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo phiên và mở Live Control' }).click();
  await expect(page.getByRole('heading', { name: 'Phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'Kiểm duyệt tên', exact: true }).click();

  const moderation = page.getByTestId('name-moderation-page');
  await expect(moderation.locator('iframe')).toHaveCount(0);
  await expect(moderation.getByText('Bộ từ mặc định (SYSTEM) không hiển thị trong API này', { exact: false })).toBeVisible();
  await expect(moderation.getByLabel('Từ chặn hiện tại')).toContainText('demo-rule');
  await expect(moderation.getByLabel('Ngoại lệ hiện tại')).toContainText('Demo Allow');
  await expect(moderation.getByTestId('moderation-history')).toContainText('Ẩn tên');
  await expect(moderation.getByTestId('moderation-history')).toContainText('Người vận hành');
  await expect.poll(() => settingsGetCount).toBeGreaterThan(0);
  await expect.poll(() => auditGetCount).toBeGreaterThan(0);
  expect(new Set(authHeaders)).toEqual(new Set([`Bearer ${adminToken}`]));

  const row = moderation.getByTestId('moderation-player-row').filter({ hasText: 'Người Chơi Demo 01' });
  const initialPlayersGets = playersGetCount;
  await row.getByRole('button', { name: 'Cho phép hiện' }).click();
  await expect.poll(() => playersGetCount).toBeGreaterThan(initialPlayersGets);
  await expect(row.locator('.moderation-live-name')).toHaveText('Người Chơi Demo 01');
  await expect(row.getByRole('button', { name: 'Đã cho phép' })).toBeDisabled();

  const afterReviewGets = playersGetCount;
  await row.getByRole('button', { name: 'Ẩn', exact: true }).click();
  await expect.poll(() => playersGetCount).toBeGreaterThan(afterReviewGets);
  await expect(row.locator('.moderation-live-name')).toHaveText('Người chơi 01');

  await moderation.getByLabel('Từ / cụm từ cần chặn').fill('rule mới');
  await moderation.getByRole('button', { name: 'Thêm từ chặn', exact: true }).click();
  await expect(moderation.getByLabel('Từ chặn hiện tại')).toContainText('rule mới');
  await expect.poll(() => settingsGetCount).toBeGreaterThan(1);
  await moderation.getByLabel('Người chơi có quy tắc áp dụng').selectOption('api-player-01');
  await moderation.getByLabel('Thêm ngoại lệ').fill('Ngoại lệ API');
  await moderation.getByRole('button', { name: 'Thêm ngoại lệ', exact: true }).click();
  await expect(moderation.getByLabel('Ngoại lệ hiện tại')).toContainText('Ngoại lệ API');

  await moderation.getByRole('button', { name: 'Xoá ngoại lệ Ngoại lệ API' }).click();
  await expect(moderation.getByLabel('Ngoại lệ hiện tại')).not.toContainText('Ngoại lệ API');
  const putsBeforeRemoval = authHeaders.length;
  await moderation.getByRole('button', { name: 'Xoá quy tắc chặn rule mới' }).click();
  await expect(moderation.getByLabel('Từ chặn hiện tại')).not.toContainText('rule mới');
  await expect.poll(() => authHeaders.length).toBeGreaterThan(putsBeforeRemoval);
  await expect(moderation.getByTestId('moderation-history')).toContainText('Cập nhật chính sách');
  expect(page.url()).not.toContain(adminToken);
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
    await expect(previewFrame.locator('.v3-round-title')).toHaveCSS('font-size', '26px');
    await expect(previewFrame.getByTestId('participant-count')).toHaveCSS('font-size', '44px');
    await expect(previewFrame.locator('.v3-round-label')).toHaveCSS('font-size', '20px');
  };

  const kicker = page.getByLabel('Tên sự kiện góc trái');
  await expect(kicker).toHaveValue('STORM ARENA');
  await waitForPreview();
  await page.screenshot({ path: join(reviewDirectory, 'dashboard-default.png'), fullPage: true, animations: 'disabled' });
  await kicker.fill('A'.repeat(201));
  await expect(settings.locator('.hud-text-field').filter({ has: kicker }).locator('em')).toHaveText('Tối đa 200 ký tự hiển thị.');
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

test('Theme mock có theme demo, preview token/ảnh và vô hiệu hóa theme lỗi', async ({ page }) => {
  await launchDashboard(page);
  await page.getByRole('button', { name: 'Giao diện / Theme', exact: true }).click();
  const themePage = page.getByTestId('theme-page');
  await expect(themePage).toBeVisible();
  await expect(themePage.getByRole('radio', { name: /Đấu trường Neon/ })).toContainText('Đang dùng');
  await expect(themePage.getByText('--theme-gold')).toBeVisible();
  await expect(themePage.locator('.theme-image-card img').first()).toBeVisible();
  await themePage.getByRole('radio', { name: /Gói theme lỗi/ }).click();
  await expect(themePage.getByRole('button', { name: 'Dùng theme này', exact: true })).toBeDisabled();
  await expect(themePage).toContainText('tokens.width');
});

test('C-0301 thẻ bù trễ LIVE đổi AUTO/MANUAL, báo lỗi API và khoá khi phiên đóng', async ({ page }) => {
  test.setTimeout(30_000);
  const previousSessionId = await mockClient.currentSession();
  if (previousSessionId) {
    const previous = await mockClient.getState('', previousSessionId);
    await mockClient.sendCommand('', previousSessionId, {
      commandId: 'c0301-cleanup-existing-session', expectedStateVersion: previous.public.stateVersion,
      operatorId: 'e2e', requestedAtMs: Date.now(), command: { type: 'STOP', reason: 'Dọn phiên trước C-0301' },
    });
  }
  const created = await mockClient.createSession('', {
    name: 'C-0301 bù trễ LIVE',
    config: SessionConfigSchema.parse({ mode: 'TIKTOK', tiktokUsername: '@stream_delay_demo' }),
  });
  let sessionOpen = false;
  let streamDelay: { mode: 'AUTO' | 'MANUAL'; nextQuestionDelayMs: number; activeQuestionDelayMs: number | null; manualDelayMs: number } = {
    mode: 'AUTO', nextQuestionDelayMs: 2_000, activeQuestionDelayMs: null, manualDelayMs: 2_000,
  };
  let failNextDelayUpdate = false;
  type SnapshotWithStreamDelay = AdminSnapshot & { streamDelay: typeof streamDelay };
  let snapshot: SnapshotWithStreamDelay = { ...created.snapshot, streamDelay };
  await page.routeWebSocket('**/ws**', (socket) => socket.onMessage(() => {}));
  await page.route('**/api/questions', (route) => route.fulfill({ json: makeQuestions(20, 20) }));
  await page.route('**/api/preflight', (route) => route.fulfill({ json: { checks: [] } }));
  await page.route('**/api/sessions/current', (route) => route.fulfill({ json: { sessionId: sessionOpen ? created.sessionId : null } }));
  await page.route('**/api/sessions', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ status: 404, json: { message: 'Không có phiên.' } });
    sessionOpen = true;
    return route.fulfill({ json: { sessionId: created.sessionId, snapshot } });
  });
  await page.route('**/api/sessions/*/state', (route) => route.fulfill({ json: snapshot }));
  await page.route('**/api/sessions/*/stream-delay', async (route) => {
    if (failNextDelayUpdate) {
      failNextDelayUpdate = false;
      return route.fulfill({ status: 503, json: { message: 'Máy chủ đang bận, hãy thử lại.' } });
    }
    const update = route.request().postDataJSON() as { mode: 'AUTO' | 'MANUAL'; manualDelayMs?: number };
    const nextQuestionDelayMs = update.mode === 'MANUAL' ? update.manualDelayMs ?? streamDelay.manualDelayMs : 2_000;
    streamDelay = { ...streamDelay, mode: update.mode, nextQuestionDelayMs, manualDelayMs: update.manualDelayMs ?? streamDelay.manualDelayMs };
    snapshot = { ...snapshot, streamDelay };
    return route.fulfill({ json: { ok: true, streamDelay } });
  });
  await page.route('**/api/sessions/*/commands', async (route) => {
    const envelope = route.request().postDataJSON() as CommandEnvelope;
    const response = await mockClient.sendCommand('', created.sessionId, envelope);
    snapshot = { ...await mockClient.getState('', created.sessionId), streamDelay };
    if (envelope.command.type === 'STOP') sessionOpen = false;
    return route.fulfill({ status: response.status, json: response.result });
  });
  await launchDashboard(page, { mock: false });
  await page.getByLabel('Mã quản trị').fill(adminToken);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tạo phiên MOCK' })).toBeVisible();
  await page.getByRole('button', { name: 'TikTok LIVE', exact: true }).click();
  await page.getByLabel('Số câu mỗi vòng').selectOption('10');
  await page.getByLabel('TikTok username').fill('@stream_delay_demo');
  const createButton = page.getByRole('button', { name: 'Tạo phiên và mở Live Control' });
  await expect(createButton).toBeEnabled();
  await createButton.click();

  const card = page.getByTestId('stream-delay-card');
  const modeSwitch = card.getByRole('switch', { name: 'Chế độ bù độ trễ LIVE' });
  await expect(card).toBeVisible();
  await expect(card.getByTestId('stream-delay-mode')).toHaveText('Tự động');
  await expect(card.getByTestId('stream-delay-active')).toHaveText('—');
  await expect(card.getByTestId('stream-delay-next')).toHaveText('2,0 s');
  const reviewDirectory = join(process.cwd(), '.claude', 'review', 'C0301');
  await mkdir(reviewDirectory, { recursive: true });
  await card.screenshot({ path: join(reviewDirectory, 'stream-delay-auto.png'), animations: 'disabled' });

  await modeSwitch.click();
  await expect(card.getByTestId('stream-delay-mode')).toHaveText('Thủ công');
  const manualInput = card.getByLabel('Mức bù trễ thủ công (giây)');
  await expect(manualInput).toHaveAttribute('min', '0');
  await expect(manualInput).toHaveAttribute('max', '6');
  await expect(manualInput).toHaveAttribute('step', '0.5');
  await manualInput.fill('3.5');
  await card.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(card.getByTestId('stream-delay-next')).toHaveText('3,5 s');
  await expect(card.getByRole('status')).toContainText('Đã áp dụng từ câu kế tiếp.');
  await card.screenshot({ path: join(reviewDirectory, 'stream-delay-manual.png'), animations: 'disabled' });

  failNextDelayUpdate = true;
  await modeSwitch.click();
  await expect(card.getByRole('alert')).toHaveText('Máy chủ đang bận, hãy thử lại.');
  await expect(modeSwitch).toBeEnabled();

  await stopDashboardSession(page);
  await expect(page.getByTestId('closed-session')).toBeVisible();
  await expect(page.getByTestId('stream-delay-card')).toHaveCount(0);
});
