import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

const reviewDir = join(process.cwd(), '.claude', 'review', 'C0197B');

for (const variant of ['a', 'b'] as const) {
  test(`C-0197 B option ${variant.toUpperCase()} — fastest correct callout`, async ({ page }) => {
    await mkdir(reviewDir, { recursive: true });
    await page.goto(`/?mock=fastest-${variant}`, { waitUntil: 'domcontentloaded' });
    const stage = page.getByTestId('stage');
    await expect(stage).toBeVisible();
    await expect(stage.getByTestId('tiktok-hud')).toHaveCount(0);
    await expect(stage).toHaveAttribute('data-scene', 'REVEAL');

    const callout = stage.getByTestId('fastest-callout');
    await expect(callout).toContainText('NHANH NHẤT');
    await expect(callout).toContainText('StormKing');
    await expect(callout).toContainText('1,2 giây');
    await expect(stage.locator('.v3-seat.is-fastest')).toHaveCount(1);
    await expect(stage.locator('.v3-seat-name.is-fastest')).toHaveCount(1);
    await expect(stage.getByTestId('fastest-row-badge')).toHaveCount(variant === 'b' ? 1 : 0);

    const renderedText = await stage.innerText();
    expect(renderedText).not.toContain('demo-player-2');
    expect(renderedText).not.toContain('seat-');
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await stage.screenshot({ path: join(reviewDir, `option-${variant}.png`) });
  });
}

test('C-0197 B — do not show fastest responder before reveal', async ({ page }) => {
  await page.goto('/?mock=question', { waitUntil: 'domcontentloaded' });
  const stage = page.getByTestId('stage');
  await expect(stage).toHaveAttribute('data-scene', 'QUESTION');
  await expect(stage.getByTestId('fastest-callout')).toHaveCount(0);
  await expect(stage.locator('.v3-seat.is-fastest')).toHaveCount(0);
  await expect(stage.getByTestId('fastest-row-badge')).toHaveCount(0);
});
