import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const scenes = [
  { name: 'lobby', scene: 'LOBBY' },
  { name: 'prepare', scene: 'QUESTION' },
  { name: 'question', scene: 'QUESTION' },
  { name: 'reveal', scene: 'REVEAL' },
  { name: 'top10', scene: 'INTERIM_TOP10' },
  { name: 'top10-short', scene: 'INTERIM_TOP10' },
  { name: 'round-winner', scene: 'ROUND_WINNER' },
  { name: 'victory', scene: 'VICTORY' },
  { name: 'victory-tie', scene: 'VICTORY' },
  { name: 'intermission', scene: 'INTERMISSION' },
  { name: 'connection-lost', scene: 'CONNECTION_LOST' },
  { name: 'paused', scene: 'QUESTION' },
] as const;

const screenshotDirectory = join(process.cwd(), 'test-results', 'e2e', 'screenshots');
mkdirSync(screenshotDirectory, { recursive: true });

let closestSafeMargin = Number.POSITIVE_INFINITY;
let closestSafeScene = '';

test.afterAll(() => {
  console.log(`Cảnh sát biên vùng an toàn nhất: ${closestSafeScene} (${closestSafeMargin.toFixed(1)}px).`);
});

function watchPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function openScene(page: Page, sceneName: string, expectedScene: string) {
  const errors = watchPageErrors(page);
  await page.goto(`/?mock=${encodeURIComponent(sceneName)}`, { waitUntil: 'domcontentloaded' });
  const stage = page.locator(`[data-testid="stage"][data-scene="${expectedScene}"]`);
  await expect(stage).toBeVisible();
  return { stage, errors };
}

async function expectInsideSafeZone(page: Page, stage: ReturnType<Page['locator']>, sceneName: string) {
  const viewport = page.viewportSize();
  expect(viewport).toEqual({ width: 1080, height: 1920 });
  const stageBox = await stage.boundingBox();
  expect(stageBox, `${sceneName}: stage has a bounding box`).not.toBeNull();
  if (!stageBox) return;

  const safe = await stage.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      top: Number.parseFloat(style.getPropertyValue('--safe-top')),
      right: Number.parseFloat(style.getPropertyValue('--safe-right')),
      bottom: Number.parseFloat(style.getPropertyValue('--safe-bottom')),
      left: Number.parseFloat(style.getPropertyValue('--safe-left')),
      rightFromY: Number.parseFloat(style.getPropertyValue('--safe-right-from-y')) || 0,
    };
  });
  const scaleX = stageBox.width / 1080;
  const scaleY = stageBox.height / 1920;
  const edges = {
    left: stageBox.x + safe.left * scaleX,
    right: stageBox.x + (1080 - safe.right) * scaleX,
    top: stageBox.y + safe.top * scaleY,
    bottom: stageBox.y + (1920 - safe.bottom) * scaleY,
  };

  const selectors = [
    '[data-testid="question-prompt"]',
    '[data-testid^="option-"]',
    '[data-testid="timer"]',
    '[data-testid="leaderboard-row"]',
    '[data-testid^="podium-slot-"] .nameplate',
  ];
  for (const selector of selectors) {
    const locators = page.locator(selector);
    for (let index = 0; index < await locators.count(); index += 1) {
      const box = await locators.nth(index).boundingBox();
      if (!box) continue;
      // Dải cấm phải chỉ áp dụng cho phần tử chạm tới vùng y ≥ rightFromY (thanh nút TikTok ở nửa dưới).
      const reachesRightBand = box.y + box.height > stageBox.y + safe.rightFromY * scaleY;
      const margins = [
        box.x - edges.left,
        reachesRightBand ? edges.right - (box.x + box.width) : stageBox.x + stageBox.width - (box.x + box.width),
        box.y - edges.top,
        edges.bottom - (box.y + box.height),
      ];
      const margin = Math.min(...margins);
      if (margin < closestSafeMargin) {
        closestSafeMargin = margin;
        closestSafeScene = sceneName;
      }
      expect(margin, `${sceneName} ${selector} is within the safe zone`).toBeGreaterThanOrEqual(-1);
    }
  }
}

for (const { name, scene } of scenes) {
  test(`mock scene: ${name}`, async ({ page }) => {
    const { stage, errors } = await openScene(page, name, scene);
    await expectInsideSafeZone(page, stage, name);
    await page.screenshot({ path: join(screenshotDirectory, `${name}.png`) });
    // So ảnh chuẩn chỉ khi bật E2E_SCREENSHOTS=1 (bố cục V3 còn đổi, chưa commit ảnh chuẩn — BOARD #15)
    if (process.env.E2E_SCREENSHOTS === '1') await expect(page).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio: 0.01 });
    expect(errors, `${name}: no console or page errors`).toEqual([]);
  });
}

test('prepare and question do not expose the correct answer', async ({ page }) => {
  for (const name of ['prepare', 'question']) {
    const { errors } = await openScene(page, name, 'QUESTION');
    const html = await page.locator('body').innerHTML();
    expect(html).not.toContain('correctOptionId');
    expect(await page.locator('[data-testid^="option-"][class*="correct"], [data-testid^="option-"][data-correct]').count()).toBe(0);
    expect(errors, `${name}: no console or page errors`).toEqual([]);
  }
});

test('reveal marks exactly one correct option', async ({ page }) => {
  const { errors } = await openScene(page, 'reveal', 'REVEAL');
  const correctOptions = page.locator('[data-testid^="option-"].is-correct');
  await expect(correctOptions).toHaveCount(1);
  await expect(correctOptions).toHaveAttribute('data-testid', 'option-B');
  expect(errors).toEqual([]);
});

test('XSS shaped names render as text', async ({ page }) => {
  const { errors } = await openScene(page, 'top10', 'INTERIM_TOP10');
  await expect(page.locator('.player-name').filter({ hasText: '<script>window.__xss=1</script>' })).toHaveCount(1);
  await expect(page.locator('.player-name').filter({ hasText: '<img src=x onerror="window.__xss=1">' })).toHaveCount(1);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { __xss?: number }).__xss)).toBeUndefined();
  expect(errors).toEqual([]);
});

test('top10-short shows only its three real entries', async ({ page }) => {
  const { errors } = await openScene(page, 'top10-short', 'INTERIM_TOP10');
  const rows = page.locator('[data-testid="leaderboard-row"]');
  await expect(rows).toHaveCount(3);
  for (let index = 0; index < await rows.count(); index += 1) {
    await expect(rows.nth(index).locator('.player-name')).not.toHaveText('');
  }
  expect(errors).toEqual([]);
});

test('victory-tie labels the tie and orders podium slots by x coordinate', async ({ page }) => {
  const { errors } = await openScene(page, 'victory-tie', 'VICTORY');
  await expect(page.getByText('ĐỒNG HẠNG').first()).toBeVisible();
  const xCoordinates: number[] = [];
  for (const place of [2, 1, 3]) {
    const box = await page.getByTestId(`podium-slot-${place}`).boundingBox();
    expect(box, `podium slot ${place} has a bounding box`).not.toBeNull();
    xCoordinates.push(box!.x);
  }
  expect(xCoordinates[0]).toBeLessThan(xCoordinates[1]!);
  expect(xCoordinates[1]).toBeLessThan(xCoordinates[2]!);
  expect(errors).toEqual([]);
});
