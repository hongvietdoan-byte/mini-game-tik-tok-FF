import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const fixture = fileURLToPath(new URL('./fixtures/c0197-arena-loop.webm', import.meta.url));
const screenshots = resolve('.claude/review/C0197D');

async function serveLoop(page: Page) {
  await page.route('**/assets/arena/bg-loop.webm', (route) => route.fulfill({
    path: fixture,
    contentType: 'video/webm',
    headers: { 'cache-control': 'no-store' },
  }));
}

test('1080x1920 question video loop plays smoothly with 35 seats', async ({ page }) => {
  await serveLoop(page);
  await page.goto('/?mock=question&hud=1', { waitUntil: 'domcontentloaded' });
  const video = page.getByTestId('arena-background-video');
  await expect(page.getByTestId('arena-background')).toBeVisible();
  await expect(page.locator('[data-testid="audience-seat"]')).toHaveCount(35);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => ({ muted: element.muted, loop: element.loop, playsInline: element.playsInline })))
    .toEqual({ muted: true, loop: true, playsInline: true });
  await expect(video).toHaveAttribute('data-video-state', 'playing', { timeout: 15_000 });
  const firstTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await page.waitForTimeout(1_500);
  const secondTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  expect(secondTime).toBeGreaterThan(firstTime + 1);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const before = await cdp.send('Performance.getMetrics');
  const taskDurationBefore = before.metrics.find((metric) => metric.name === 'TaskDuration')?.value;
  const renderStats = await page.evaluate(() => new Promise<{ averageFps: number; p5Fps: number; frames: number; durationMs: number }>((resolve) => {
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
      if (timestamp - start >= 8_000) {
        const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const sorted = [...intervals].sort((a, b) => a - b);
        const p95Interval = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? averageInterval;
        resolve({ averageFps: 1000 / averageInterval, p5Fps: 1000 / p95Interval, frames: intervals.length, durationMs: timestamp - start });
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  const after = await cdp.send('Performance.getMetrics');
  const taskDurationAfter = after.metrics.find((metric) => metric.name === 'TaskDuration')?.value;
  const mainThreadCpuPercent = taskDurationBefore !== undefined && taskDurationAfter !== undefined
    ? Math.max(0, (taskDurationAfter - taskDurationBefore) / (renderStats.durationMs / 1000) * 100)
    : null;
  console.log(`Video WebM + 35 ghế @1080x1920: FPS TB ${renderStats.averageFps.toFixed(1)}, p5 ${renderStats.p5Fps.toFixed(1)}, CPU main-thread proxy ${mainThreadCpuPercent === null ? 'n/a' : `${mainThreadCpuPercent.toFixed(1)}%`} / 8s.`);
  expect(renderStats.averageFps).toBeGreaterThanOrEqual(50);
  expect(renderStats.p5Fps).toBeGreaterThanOrEqual(45);
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: resolve(screenshots, 'question-video-35-seats.png'), fullPage: true });
});

test('victory video plays; missing loop assets retain the static background', async ({ page }) => {
  await serveLoop(page);
  await page.goto('/?mock=victory', { waitUntil: 'domcontentloaded' });
  const video = page.getByTestId('victory-background-video');
  await expect(page.getByTestId('victory-background')).toBeVisible();
  await expect(video).toHaveAttribute('data-video-state', 'playing', { timeout: 15_000 });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => ({ muted: element.muted, loop: element.loop, playsInline: element.playsInline })))
    .toEqual({ muted: true, loop: true, playsInline: true });
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: resolve(screenshots, 'victory-video.png'), fullPage: true });

  await page.unroute('**/assets/arena/bg-loop.webm');
  await page.route('**/assets/arena/bg-loop.webm', (route) => route.abort());
  await page.route('**/assets/arena/bg-loop.mp4', (route) => route.abort());
  await page.goto('/?mock=question&hud=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('arena-background-video')).toHaveCount(0, { timeout: 15_000 });
  const background = page.getByTestId('arena-background');
  await expect(background).toBeVisible();
  await expect(background).toHaveAttribute('src', /bg-question-user\.jpg/);
  await page.screenshot({ path: resolve(screenshots, 'question-static-fallback.png'), fullPage: true });
});
