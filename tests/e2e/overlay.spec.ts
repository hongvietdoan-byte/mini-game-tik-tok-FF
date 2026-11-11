import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
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
const localAssetDirectory = resolve(process.cwd(), '../../../assets-local');
const hasLocalCharacterAssets = existsSync(join(localAssetDirectory, 'chibi', 'manifest.json'));
const hasLocalKellyAsset = existsSync(join(localAssetDirectory, 'mc', 'kelly.png'));
const hasLocalBrandLogo = existsSync(join(localAssetDirectory, 'brand', 'logo.png'));

let closestSafeMargin = Number.POSITIVE_INFINITY;
let closestSafeScene = '';

test.afterAll(() => {
  console.log(`Cảnh sát biên vùng an toàn nhất: ${closestSafeScene} (${closestSafeMargin.toFixed(1)}px).`);
});

function watchPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const pathname = new URL(response.url()).pathname;
    const optionalMcManifest = pathname === '/assets/mc/kelly/manifest.json';
    const absentLocalAssetBank = !hasLocalCharacterAssets || !hasLocalKellyAsset || !hasLocalBrandLogo;
    if (optionalMcManifest || (absentLocalAssetBank && pathname.startsWith('/assets/'))) return;
    errors.push(`http ${response.status()}: ${pathname}`);
  });
  return errors;
}

async function openScene(page: Page, sceneName: string, expectedScene: string) {
  const errors = watchPageErrors(page);
  await page.goto(`/?mock=${encodeURIComponent(sceneName)}`, { waitUntil: 'domcontentloaded' });
  const stage = page.locator(`[data-testid="stage"][data-scene="${expectedScene}"]`);
  await expect(stage).toBeVisible();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
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
    await page.screenshot({ path: join(screenshotDirectory, `${name}.png`), animations: 'disabled' });
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
  const firstRow = page.locator('[data-testid="v3-top10-large"] [data-testid="leaderboard-row"]').first();
  const name = firstRow.locator('.v3-full-name-text');
  const badge = firstRow.locator('[data-testid="top1-badge"]');
  const score = firstRow.locator('.v3-full-score');
  await expect(badge).toHaveText('x3');
  await expect(badge).toBeVisible();
  const boxes = await Promise.all([name.boundingBox(), badge.boundingBox(), score.boundingBox()]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[0]!.x + boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x);
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x);
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

test('question scene loads the approved Kelly and chibi assets when the local asset bank is present', async ({ page }) => {
  test.skip(!hasLocalCharacterAssets || !hasLocalKellyAsset || !hasLocalBrandLogo, 'Local assets are excluded from Git; validate when the asset bank is available.');
  const { errors } = await openScene(page, 'question', 'QUESTION');
  const brandLogo = page.getByTestId('brand-logo');
  await expect(brandLogo).toBeVisible();
  await expect(brandLogo).toHaveAttribute('src', '/assets/brand/logo.png');
  await expect.poll(() => brandLogo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const kelly = page.locator('.v3-mc-figure img.mc-sequence');
  await expect(kelly).toBeVisible();
  await expect.poll(() => kelly.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const mcCrop = await kelly.evaluate((image: HTMLImageElement) => ({
    parentHeight: image.parentElement?.clientHeight ?? 0,
    imageHeight: image.getBoundingClientRect().height,
    overflow: image.parentElement ? getComputedStyle(image.parentElement).overflow : '',
  }));
  expect(mcCrop.overflow).toBe('hidden');
  expect(mcCrop.imageHeight).toBeGreaterThan(mcCrop.parentHeight);

  const chibis = page.locator('.v3-chibi-img img');
  await expect(chibis).toHaveCount(35);
  await expect.poll(() => chibis.evaluateAll((images) => images.filter((image) => {
    const candidate = image as HTMLImageElement;
    return candidate.complete && candidate.naturalWidth > 0;
  }).length)).toBe(35);
  await expect.poll(() => chibis.first().evaluate((image) => getComputedStyle(image).objectFit)).toBe('cover');
  await expect.poll(() => chibis.first().evaluate((image) => getComputedStyle(image).objectPosition)).toBe('50% 0%');
  await expect(page.locator('.v3-mc-placeholder, .v3-chibi')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('question crowd labels stay clear of the quiz and Top 1 badge fits its score column', async ({ page }) => {
  const { errors } = await openScene(page, 'question', 'QUESTION');
  const top10 = page.locator('[data-testid="v3-top10"]');
  const mcFigure = page.locator('.v3-mc-figure');
  const [top10Box, mcBox] = await Promise.all([top10.boundingBox(), mcFigure.boundingBox()]);
  expect(top10Box).not.toBeNull();
  expect(mcBox).not.toBeNull();
  expect(mcBox!.y).toBeGreaterThanOrEqual(top10Box!.y + top10Box!.height);

  const seatNames = page.locator('.v3-seat-name');
  await expect(page.locator('[data-testid="audience-seat"]')).toHaveCount(35);
  await expect(page.locator('.v3-seat-back')).toHaveCount(35);
  await expect(seatNames).toHaveCount(35);

  const overlaps = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="question-prompt"], [data-testid^="option-"]'));
    const names = Array.from(document.querySelectorAll<HTMLElement>('.v3-seat-name'));
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return names.flatMap((name, nameIndex) => {
      const nameBox = name.getBoundingClientRect();
      return targets.flatMap((target, targetIndex) => intersects(nameBox, target.getBoundingClientRect()) ? [`name ${nameIndex} overlaps target ${targetIndex}`] : []);
    });
  });
  expect(overlaps, 'all 35 audience nameplates stay clear of question and answer boxes').toEqual([]);

  const firstRow = page.locator('[data-testid="v3-top10"] [data-testid="leaderboard-row"]').first();
  const name = firstRow.locator('.v3-name-text');
  const badge = firstRow.locator('[data-testid="top1-badge"]');
  const score = firstRow.locator('.v3-score');
  await expect(badge).toHaveText('x3');
  await expect(badge).toBeVisible();
  const boxes = await Promise.all([name.boundingBox(), badge.boundingBox(), score.boundingBox()]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[0]!.x + boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x);
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x);
  expect(await name.evaluate((element) => ({
    clipped: element.scrollWidth > element.clientWidth,
    overflow: getComputedStyle(element).textOverflow,
  }))).toEqual({ clipped: true, overflow: 'ellipsis' });
  await expect(score).toHaveText('21.000');
  expect(errors).toEqual([]);
});

test('TikTok HUD preview shows live chrome and lets the safe zone be adjusted', async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto('/?mock=question&hud=1&safeTop=180&safeRight=140&safeBottom=120&safeLeft=20&safeRightFromY=700', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('[data-testid="stage"][data-scene="QUESTION"]');
  await expect(stage).toBeVisible();
  await expect(page.getByTestId('tiktok-hud')).toBeVisible();
  await expect(page.getByTestId('tiktok-live-info')).toContainText('LIVE');
  await expect(page.getByTestId('tiktok-actions').locator('> div')).toHaveCount(5);
  await expect(page.getByTestId('tiktok-comments').locator('p')).toHaveCount(4);
  await expect(page.getByTestId('tiktok-comment-bar')).toContainText('Bình luận');
  await expect(page.getByTestId('safe-zone-guides')).toBeVisible();
  const values = await stage.evaluate((element) => {
    const style = getComputedStyle(element);
    return ['--safe-top', '--safe-right', '--safe-bottom', '--safe-left', '--safe-right-from-y']
      .map((name) => style.getPropertyValue(name).trim());
  });
  expect(values).toEqual(['180px', '140px', '120px', '20px', '700px']);
  await page.screenshot({ path: join(screenshotDirectory, 'question-hud.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('question with 35 seats sustains 30 FPS over 10 seconds', async ({ page }) => {
  const { errors } = await openScene(page, 'question', 'QUESTION');
  await expect(page.locator('[data-testid="audience-seat"]')).toHaveCount(35);
  const seatEffects = await page.locator('.v3-seat-back, .v3-seat-name, .v3-chibi-hair, .v3-chibi-img img').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { boxShadow: style.boxShadow, filter: style.filter, animationCount: style.animationIterationCount };
  }));
  expect(seatEffects).toHaveLength(35 * 3);
  expect(seatEffects.every((effect) => effect.boxShadow === 'none' && effect.filter === 'none' && effect.animationCount !== 'infinite')).toBe(true);
  const top10Rows = await page.locator('[data-testid="v3-top10"] [data-testid="leaderboard-row"]').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationIterationCount));
  expect(top10Rows.every((count) => count !== 'infinite')).toBe(true);
  const renderStats = await page.evaluate(() => new Promise<{ averageFps: number; p5Fps: number; frames: number }>((resolve) => {
    let start = 0;
    let previous = 0;
    const intervals: number[] = [];
    const sample = (timestamp: number) => {
      if (start === 0) {
        start = timestamp;
        previous = timestamp;
      } else {
        intervals.push(timestamp - previous);
        previous = timestamp;
      }
      if (timestamp - start >= 10_000) {
        const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const sorted = [...intervals].sort((a, b) => a - b);
        const p95Interval = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? averageInterval;
        resolve({ averageFps: 1000 / averageInterval, p5Fps: 1000 / p95Interval, frames: intervals.length });
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  console.log(`FPS câu hỏi 10 giây / 35 ghế: trung bình ${renderStats.averageFps.toFixed(1)}, p5 ${renderStats.p5Fps.toFixed(1)}, ${renderStats.frames} khung hình.`);
  expect(renderStats.averageFps).toBeGreaterThanOrEqual(30);
  expect(renderStats.p5Fps).toBeGreaterThanOrEqual(30);
  expect(errors).toEqual([]);
});

test('victory-tie labels the tie and orders podium slots by x coordinate', async ({ page }) => {
  const { errors } = await openScene(page, 'victory-tie', 'VICTORY');
  await expect(page.getByText('ĐỒNG HẠNG').first()).toBeVisible();
  const champion = page.getByTestId('podium-slot-1');
  const badge = champion.locator('[data-testid="top1-badge"]').first();
  const name = champion.locator('.v3v-player-name').first();
  await expect(badge).toHaveText('x3');
  await expect(badge).toBeVisible();
  const [nameBox, badgeBox] = await Promise.all([name.boundingBox(), badge.boundingBox()]);
  expect(nameBox).not.toBeNull();
  expect(badgeBox).not.toBeNull();
  expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(badgeBox!.x);
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
