import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const reviewDirectory = resolve(process.cwd(), '.claude', 'review', 'C0295');

test('C-0295 — 7 and 15 early arrivals fill the top audience rows in lobby and question scenes', async ({ page }) => {
  mkdirSync(reviewDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });

  for (const scenario of [
    { mock: 'lobby-7', seated: 7, scene: 'LOBBY' },
    { mock: 'lobby-15', seated: 15, scene: 'LOBBY' },
    { mock: 'question-audience-7', seated: 7, scene: 'QUESTION' },
    { mock: 'question-audience-15', seated: 15, scene: 'QUESTION' },
  ]) {
    await page.goto(`/?mock=${scenario.mock}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('stage')).toHaveAttribute('data-scene', scenario.scene);
    if (scenario.scene === 'LOBBY') await expect(page.getByTestId('lobby-seat-count')).toHaveText(`${scenario.seated}/35`);
    else await expect(page.getByTestId('participant-count')).toContainText(String(scenario.seated));

    const layout = await page.evaluate(() => {
      const names = [...document.querySelectorAll<HTMLElement>('.v3-seat-name')];
      const seats = [...document.querySelectorAll<HTMLElement>('.v3-seat')];
      const countsByRow = names.reduce<Record<string, number>>((counts, element) => {
        const row = element.dataset.rowIndex ?? 'unknown';
        counts[row] = (counts[row] ?? 0) + 1;
        return counts;
      }, {});
      const labels = names.map((element) => ({ row: element.dataset.rowIndex, rect: element.getBoundingClientRect().toJSON() }));
      const characters = [...document.querySelectorAll<HTMLElement>('.v3-seat[data-row-index] .v3-chibi-img')]
        .map((element) => ({ row: element.closest<HTMLElement>('.v3-seat')?.dataset.rowIndex, rect: element.getBoundingClientRect().toJSON() }));
      const overlaps: Array<{ nameRow: string | undefined; characterRow: string | undefined; nameRect: unknown; characterRect: unknown }> = [];
      for (const label of labels) for (const character of characters) {
        if (label.row === character.row) continue;
        const a = label.rect;
        const b = character.rect;
        if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y)
          overlaps.push({
            nameRow: label.row,
            characterRow: character.row,
            nameRect: { x: a.x, y: a.y, width: a.width, height: a.height },
            characterRect: { x: b.x, y: b.y, width: b.width, height: b.height },
          });
      }
      return {
        occupied: seats.filter((element) => !element.classList.contains('is-empty')).length,
        names: names.length,
        characters: characters.length,
        countsByRow,
        overlaps,
      };
    });

    expect(layout.occupied).toBe(scenario.seated);
    expect(layout.names).toBe(scenario.seated);
    expect(layout.characters).toBe(scenario.seated);
    expect(layout.countsByRow['6']).toBe(5);
    expect(layout.countsByRow['5']).toBe(Math.min(Math.max(scenario.seated - 5, 0), 5));
    expect(layout.countsByRow['4'] ?? 0).toBe(Math.max(scenario.seated - 10, 0));
    await page.screenshot({
      path: join(reviewDirectory, `${scenario.mock}-1080x1920.png`),
      animations: 'disabled',
    });
    expect(layout.overlaps).toEqual([]);
  }
});

test('C-0296 — rank swaps animate for 500 ms and respect reduced motion', async ({ page }) => {
  await page.goto('/?mock=question-audience-15', { waitUntil: 'domcontentloaded' });
  const transition = await page.locator('.v3-seat-occupant').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  const nameTransition = await page.locator('.v3-seat-name').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transition).toBe('0.5s');
  expect(nameTransition).toBe('0.5s');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedTransition = await page.locator('.v3-seat-occupant').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  const reducedNameTransition = await page.locator('.v3-seat-name').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(reducedTransition).toBe('0s');
  expect(reducedNameTransition).toBe('0s');
});
