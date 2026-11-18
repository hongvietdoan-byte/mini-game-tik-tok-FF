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
      // Mỗi chibi phải ngồi trên đệm ghế của chính ô đó như mẫu 14/11: chân chạm/đè lên mép trên đệm,
      // không lơ lửng phía trên (lỗi C-0305) và không tụt sâu xuống dưới đệm.
      const seating = seats.flatMap((seat) => {
        const back = seat.querySelector<HTMLElement>('.v3-seat-back')?.getBoundingClientRect();
        const chibi = seat.querySelector<HTMLElement>('.v3-chibi-img')?.getBoundingClientRect();
        if (!back || !chibi || chibi.width === 0) return [];
        return [{ row: seat.dataset.rowIndex, overlap: Math.round(chibi.bottom - back.top), centerDx: Math.round(Math.abs((chibi.left + chibi.right) / 2 - (back.left + back.right) / 2)) }];
      });
      const misplaced = seating.filter((entry) => entry.overlap < 5 || entry.overlap > 40 || entry.centerDx > 6);
      return {
        occupied: seats.filter((element) => !element.classList.contains('is-empty')).length,
        names: names.length,
        characters: document.querySelectorAll('.v3-seat[data-row-index] .v3-chibi-img').length,
        countsByRow,
        misplaced,
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
    expect(layout.misplaced).toEqual([]);
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
