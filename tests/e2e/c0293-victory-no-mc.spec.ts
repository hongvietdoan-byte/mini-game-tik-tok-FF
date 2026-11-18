import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const reviewDirectory = resolve(process.cwd(), '.claude', 'review', 'C0293');

test('C-0293 — MC stays off the VICTORY Top 3 while the audio layer remains mounted', async ({ page }) => {
  mkdirSync(reviewDirectory, { recursive: true });
  await page.goto('/?mock=victory&mc=celebrate', { waitUntil: 'domcontentloaded' });

  const stage = page.getByTestId('victory-stage');
  await expect(stage).toBeVisible();
  await expect(stage).toHaveAttribute('data-scene', 'VICTORY');
  await expect(stage.locator('[data-layer="kelly"]')).toHaveCount(0);
  await expect(stage.getByTestId('mc-bubble')).toHaveCount(0);
  await expect(stage.locator('.v3v-podium .v3v-slot')).toHaveCount(3);
  await expect(page.getByTestId('overlay-audio-runtime')).toHaveAttribute('data-phase', 'VICTORY');
  await page.screenshot({ path: join(reviewDirectory, 'victory-no-mc.png'), animations: 'disabled' });
});

test('C-0293 — round-winner scene keeps its existing MC presentation', async ({ page }) => {
  await page.goto('/?mock=round-winner', { waitUntil: 'domcontentloaded' });
  const stage = page.getByTestId('victory-stage');
  await expect(stage).toHaveAttribute('data-scene', 'ROUND_WINNER');
  await expect(stage.locator('[data-layer="kelly"]')).toBeVisible();
  await expect(stage.getByTestId('mc-bubble')).toBeVisible();
  await page.screenshot({ path: join(reviewDirectory, 'round-winner-mc-audit.png'), animations: 'disabled' });
});

test('C-0293 — capture MC overlays for INTERMISSION and the full leaderboard for manual overlap review', async ({ page }) => {
  mkdirSync(reviewDirectory, { recursive: true });
  for (const mock of ['intermission', 'top10']) {
    await page.goto(`/?mock=${mock}&mc=celebrate`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('stage')).toBeVisible();
    await expect(page.getByTestId('mc-bubble')).toBeVisible();
    await page.screenshot({ path: join(reviewDirectory, `${mock}-mc-audit.png`), animations: 'disabled' });
  }
});
