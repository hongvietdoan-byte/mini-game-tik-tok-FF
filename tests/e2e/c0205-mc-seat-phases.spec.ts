import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const reviewDir = join(process.cwd(), '.claude', 'review', 'C0205');
const phases = [
  { mock: 'prepare', scene: 'QUESTION', state: 'PREPARE', name: 'prepare', capture: 'question-prepare' },
  { mock: 'reading', scene: 'QUESTION', state: 'READING', name: 'reading', capture: 'question-reading' },
  { mock: 'question', scene: 'QUESTION', state: 'ACCEPTING', name: 'accepting', capture: 'question-accepting' },
  { mock: 'reveal', scene: 'REVEAL', state: 'LEADERBOARD', name: 'reveal / BXH ngắn', capture: 'reveal-short-bxh' },
  { mock: 'fastest-a', scene: 'REVEAL', state: 'LEADERBOARD', name: 'fastest A', capture: 'fastest-a' },
  { mock: 'fastest-b', scene: 'REVEAL', state: 'LEADERBOARD', name: 'fastest B', capture: 'fastest-b' },
] as const;

test('C-0205 MC half-body and all 35 occupied seats stay clear across question phases', async ({ page }) => {
  await mkdir(reviewDir, { recursive: true });
  let reference: Awaited<ReturnType<typeof measureLayout>> | undefined;

  for (const phase of phases) {
    await page.goto(`/?mock=${phase.mock}`, { waitUntil: 'domcontentloaded' });
    const root = page.getByTestId('stage');
    const stage = page.locator('.v3-stage');
    await expect(root).toHaveAttribute('data-state', phase.state);
    await expect(stage).toHaveAttribute('data-scene', phase.scene);
    await expect(stage).toHaveClass(/v3-stage--question-user/);

    if (phase.name === 'prepare') await expect(stage.locator('.v3-option:not(.is-hidden)')).toHaveCount(0);
    if (phase.name === 'reading') await expect(stage.getByTestId('reading-status')).toHaveText('MC ĐANG ĐỌC');
    if (phase.name === 'accepting') await expect(stage.getByTestId('answer-count')).toBeVisible();
    if (phase.name === 'reveal / BXH ngắn') await expect(stage.locator('.v3-top10')).toBeVisible();
    if (phase.name.startsWith('fastest')) await expect(stage.locator('.v3-fastest-callout')).toBeVisible();

    const layout = await measureLayout(stage);
    console.log(`C0205 ${phase.name}: MC=${layout.mc.width}x${layout.mc.height}@${layout.mc.x},${layout.mc.y}; seats=${layout.seats}; tags=${layout.nameTags}; chibis=${layout.chibis}; overlap=0`);
    expect(layout.seats).toBe(35);
    expect(layout.nameTags).toBe(35);
    expect(layout.chibis).toBe(35);
    expect(layout.coveredNames).toEqual([]);
    expect(layout.coveredSeats).toBe(0);
    expect(layout.coveredChibis).toBe(0);
    expect(layout.mc.height).toBe(208);

    if (reference) {
      expect(layout.mc).toEqual(reference.mc);
      expect(layout.mcPlate).toEqual(reference.mcPlate);
      expect(layout.seatPositions).toEqual(reference.seatPositions);
    } else {
      reference = layout;
    }

    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await stage.screenshot({ path: join(reviewDir, `${phase.capture}.png`) });
  }
});

async function measureLayout(stage: import('@playwright/test').Locator) {
  return stage.evaluate((root) => {
    const rect = (element: Element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const intersects = (a: DOMRect, b: DOMRect) =>
      a.width > 0 && a.height > 0 && a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
    const figure = root.querySelector<HTMLElement>('.v3-mc-figure')!;
    const figureRect = figure.getBoundingClientRect();
    const callout = root.querySelector<HTMLElement>('.v3-fastest-callout');
    const calloutRect = callout?.getBoundingClientRect();
    const occupiedNames = [...root.querySelectorAll('.v3-seat-name')];
    const seatBacks = [...root.querySelectorAll('.v3-seat-back')];
    const chibis = [...root.querySelectorAll('.v3-chibi-img img')];
    const covers = (element: Element) => {
      const box = element.getBoundingClientRect();
      return intersects(box, figureRect) || (!!calloutRect && intersects(box, calloutRect));
    };
    const mcPlate = root.querySelector<HTMLElement>('.v3-mc-plate')!;
    return {
      seats: seatBacks.length,
      nameTags: occupiedNames.length,
      chibis: chibis.length,
      mc: rect(figure),
      mcPlate: rect(mcPlate),
      seatPositions: [...root.querySelectorAll<HTMLElement>('.v3-seat')].map((seat) => ({
        left: seat.style.left,
        top: seat.style.top,
      })),
      coveredNames: occupiedNames.filter(covers).map((element) => element.textContent?.trim()),
      coveredSeats: seatBacks.filter(covers).length,
      coveredChibis: chibis.filter(covers).length,
    };
  });
}
