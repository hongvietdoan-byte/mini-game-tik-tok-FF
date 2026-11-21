import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const screenshotDirectory = resolve(process.cwd(), 'assets-local', 'review', 'c-sau-live-ui');
const longName = 'Đỗ_Nguyễn⚡TốcĐộ_2026🔥ABC';

async function verifySample(page: Page, sample: { mock: string; times: string[]; longNames: boolean; screenshot: string }) {
  await page.goto('/?mock=' + sample.mock, { waitUntil: 'domcontentloaded' });
  const stage = page.getByTestId('stage');
  await expect(stage).toHaveAttribute('data-scene', 'REVEAL');
  const panel = page.getByTestId('question-top3');
  await expect(panel).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
    await new Promise<void>((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())));
  });
  await page.waitForTimeout(420);

  const box = await panel.evaluate((element) => {
    const frame = element.closest<HTMLElement>('.v3-bubble');
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  expect(box).not.toBeNull();
  if (!box) throw new Error('Không đo được khung Top 3.');
  expect(box.x).toBeCloseTo(740, 0);
  expect(box.x + box.width).toBeCloseTo(998, 0);
  const rows = page.getByTestId('top3-row');
  await expect(rows).toHaveCount(3);
  const metrics = await rows.evaluateAll((elements) => elements.map((row) => {
    const cells = [...row.querySelectorAll<HTMLElement>('.v3-top3-rank, .v3-top3-name, .v3-top3-time')];
    const name = row.querySelector<HTMLElement>('[data-testid="top3-name"]')!;
    const time = row.querySelector<HTMLElement>('[data-testid="top3-time"]')!;
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = getComputedStyle(time).font;
    const lines = [...name.querySelectorAll<HTMLElement>('[data-top3-name-line]')];
    return {
      rowScrollWidth: row.scrollWidth,
      rowClientWidth: row.clientWidth,
      nameText: name.textContent ?? '',
      nameFontPx: Number.parseFloat(getComputedStyle(name).fontSize),
      maxTimeLabelWidth: context.measureText('99,9 giây').width,
      timeClientWidth: time.clientWidth,
      lines: lines.map((line) => ({ text: line.textContent ?? '', scrollWidth: line.scrollWidth, clientWidth: line.clientWidth, scrollHeight: line.scrollHeight, clientHeight: line.clientHeight })),
      cells: cells.map((cell) => ({
        text: cell.textContent ?? '',
        scrollWidth: cell.scrollWidth,
        clientWidth: cell.clientWidth,
        scrollHeight: cell.scrollHeight,
        clientHeight: cell.clientHeight,
        overflow: getComputedStyle(cell).textOverflow,
      })),
    };
  }));

  for (let index = 0; index < metrics.length; index += 1) {
    const row = metrics[index]!;
    expect(row.nameText).toBe(sample.longNames ? longName : ['StormKing', 'FFVN.Kelly', 'BVD.Champion'][index]);
    expect(row.lines.length).toBeLessThanOrEqual(2);
    if (sample.longNames) expect(row.nameFontPx >= 15 || row.lines.length === 2).toBe(true);
    expect(row.rowScrollWidth).toBeLessThanOrEqual(row.rowClientWidth);
    expect(row.cells.map((cell) => cell.text)).toContain(sample.times[index]!);
    expect(row.maxTimeLabelWidth).toBeLessThanOrEqual(row.timeClientWidth);
    for (const cell of row.cells) {
      expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
      expect(cell.text).not.toContain('…');
      expect(cell.overflow).not.toBe('ellipsis');
    }
    for (const line of row.lines) {
      expect(line.scrollWidth).toBeLessThanOrEqual(line.clientWidth);
    }
  }
  console.info(`C-0383 C ${sample.mock} metrics: ${JSON.stringify({ panel: box, times: sample.times, rows: metrics })}`);
  await page.screenshot({ path: resolve(screenshotDirectory, `${sample.screenshot}-full.png`), animations: 'disabled' });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${sample.screenshot}-close-up.png`),
    clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: Math.min(1080 - box.x + 8, box.width + 16), height: box.height + 16 },
    animations: 'disabled',
  });
}

test('C-0383 C — Top 3 hiển thị đủ giây 10,3–19,9 và tên 24 ký tự', async ({ page }) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  await verifySample(page, {
    mock: 'top3-throne-held-times-short-leaderboard',
    times: ['10,3 giây', '15,0 giây', '19,9 giây'],
    longNames: false,
    screenshot: 'C-top3-10-3-to-19-9',
  });
  await verifySample(page, {
    mock: 'top3-throne-held-times-long-leaderboard',
    times: ['19,9 giây', '19,9 giây', '19,9 giây'],
    longNames: true,
    screenshot: 'C-top3-24-char-name-19-9',
  });
});
