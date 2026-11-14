import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

const reviewDir = join(process.cwd(), '.claude', 'review', 'C0205');

for (const variant of ['a', 'b'] as const) {
  test(`C-0197 B option ${variant.toUpperCase()} — fastest correct callout`, async ({ page }) => {
    await mkdir(reviewDir, { recursive: true });
    await page.goto(`/?mock=fastest-${variant}`, { waitUntil: 'domcontentloaded' });
    const stage = page.getByTestId('stage');
    await expect(stage).toBeVisible();
    await expect(stage.getByTestId('tiktok-hud')).toHaveCount(0);
    await expect(stage).toHaveAttribute('data-scene', 'REVEAL');

    const callout = stage.locator('.v3-fastest-callout');
    const copy = stage.getByTestId('fastest-callout');
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
    const calloutBox = await callout.boundingBox();
    const timeBox = await copy.locator(':scope > span').boundingBox();
    expect(calloutBox).not.toBeNull();
    expect(timeBox).not.toBeNull();
    expect(timeBox!.y).toBeGreaterThanOrEqual(calloutBox!.y + 3);
    expect(timeBox!.y + timeBox!.height).toBeLessThanOrEqual(calloutBox!.y + calloutBox!.height - 3);
    await stage.screenshot({ path: join(reviewDir, `after-fastest-${variant}.png`) });
  });
}

test('C-0202 fastest A — 24-character safe name and 12,3 giây stay inside the card', async ({ page }) => {
  await mkdir(reviewDir, { recursive: true });
  await page.goto('/?mock=fastest-a-long', { waitUntil: 'domcontentloaded' });
  const stage = page.getByTestId('stage');
  const callout = stage.locator('.v3-fastest-callout');
  const copy = stage.getByTestId('fastest-callout');
  const name = copy.locator('.v3-fastest-name');
  const time = copy.locator(':scope > span');
  await expect(stage).toHaveAttribute('data-scene', 'REVEAL');
  await expect(copy).toContainText('StormKingChampion123456');
  await expect(copy).toContainText('12,3 giây');
  await expect(name).toHaveCSS('text-overflow', 'ellipsis');

  const boxes = await Promise.all([callout, copy.locator(':scope > strong'), name, time].map((element) => element.boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  const outer = boxes[0]!;
  const heading = boxes[1]!;
  const playerName = boxes[2]!;
  const responseTime = boxes[3]!;
  expect(heading.y).toBeGreaterThanOrEqual(outer.y + 6);
  expect(heading.y + heading.height).toBeLessThanOrEqual(playerName.y);
  expect(playerName.y + playerName.height).toBeLessThanOrEqual(responseTime.y);
  expect(responseTime.y + responseTime.height).toBeLessThanOrEqual(outer.y + outer.height - 6);

  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await stage.screenshot({ path: join(reviewDir, 'after-fastest-a-long.png') });
});

test('C-0202 — MC does not cover occupied chairs or name tags on either fastest layout', async ({ page }) => {
  for (const variant of ['a', 'b'] as const) {
    await page.goto(`/?mock=fastest-${variant}`, { waitUntil: 'domcontentloaded' });
    const stage = page.getByTestId('stage');
    await expect(stage).toHaveAttribute('data-scene', 'REVEAL');
    const visibility = await stage.evaluate((root) => {
      const figure = root.querySelector<HTMLElement>('.v3-mc-figure')!.getBoundingClientRect();
      const callout = root.querySelector<HTMLElement>('.v3-fastest-callout')!.getBoundingClientRect();
      const intersects = (box: DOMRect, overlay: DOMRect) =>
        box.width > 0 && box.height > 0 && box.right > overlay.left && box.left < overlay.right && box.bottom > overlay.top && box.top < overlay.bottom;
      const isCovered = (element: Element) => {
        const box = element.getBoundingClientRect();
        return intersects(box, figure) || intersects(box, callout);
      };
      const nameTags = [...root.querySelectorAll('.v3-seat-name')];
      const seatBacks = [...root.querySelectorAll('.v3-seat-back')];
      const chibis = [...root.querySelectorAll('.v3-chibi-img img')];
      return {
        names: nameTags.length,
        chibis: chibis.length,
        seatBacks: seatBacks.length,
        hiddenNames: nameTags.filter(isCovered).map((element) => element.textContent?.trim()),
        coveredSeats: seatBacks.filter(isCovered).length,
        coveredChibis: chibis.filter(isCovered).length,
      };
    });
    console.log(`C0202 MC visibility ${variant.toUpperCase()}:`, JSON.stringify(visibility));
    expect(visibility.names).toBe(35);
    expect(visibility.chibis).toBe(35);
    expect(visibility.seatBacks).toBe(35);
    expect(visibility.hiddenNames).toEqual([]);
    expect(visibility.coveredSeats).toBe(0);
    expect(visibility.coveredChibis).toBe(0);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await stage.screenshot({ path: join(reviewDir, `after-mc-${variant}.png`) });
  }
});

test('C-0197 B — do not show fastest responder before reveal', async ({ page }) => {
  await page.goto('/?mock=question', { waitUntil: 'domcontentloaded' });
  const stage = page.getByTestId('stage');
  await expect(stage).toHaveAttribute('data-scene', 'QUESTION');
  await expect(stage.getByTestId('fastest-callout')).toHaveCount(0);
  await expect(stage.locator('.v3-seat.is-fastest')).toHaveCount(0);
  await expect(stage.getByTestId('fastest-row-badge')).toHaveCount(0);
});
