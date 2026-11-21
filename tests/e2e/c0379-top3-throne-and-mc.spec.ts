import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { usesE2ePlaceholderAssets } from './assets';

const reviewDirectory = resolve(process.cwd(), '../../../assets-local/review/c-0379');
const longName = 'Đỗ_Nguyễn⚡TốcĐộ_2026🔥ABC';

async function waitForStableStage(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
    await new Promise<void>((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())));
  });
  await page.waitForTimeout(420);
}

async function readTop3Layout(page: import('@playwright/test').Page) {
  return page.getByTestId('stage').evaluate((stage) => {
    const bubble = stage.querySelector<HTMLElement>('.v3-question-top3')?.closest<HTMLElement>('.v3-bubble');
    const throne = stage.querySelector<HTMLElement>('[data-testid="throne-panel"]')!;
    const title = throne.querySelector<HTMLElement>('.v3-throne-title')!;
    const artImage = throne.querySelector<HTMLImageElement>('[data-testid="throne-art"]');
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    let art: ReturnType<typeof box> | null = null;
    if (artImage?.complete && artImage.naturalWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = artImage.naturalWidth;
        canvas.height = artImage.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(artImage, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let minX = canvas.width; let minY = canvas.height; let maxX = -1; let maxY = -1;
        for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3]! <= 12) continue;
          minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
        if (maxX >= minX && maxY >= minY) {
          const rect = artImage.getBoundingClientRect();
          art = {
            left: rect.left + minX * rect.width / canvas.width,
            top: rect.top + minY * rect.height / canvas.height,
            right: rect.left + (maxX + 1) * rect.width / canvas.width,
            bottom: rect.top + (maxY + 1) * rect.height / canvas.height,
            width: (maxX + 1 - minX) * rect.width / canvas.width,
            height: (maxY + 1 - minY) * rect.height / canvas.height,
          };
        }
      } catch {
        // Placeholder assets can taint canvas; use the stage's documented visible-art box below.
      }
    }
    if (!art) {
      const [left = 0, top = 0, right = 0, bottom = 0] = (throne.dataset.visibleArt ?? '').split(',').map(Number);
      art = { left, top, right, bottom, width: right - left, height: bottom - top };
    }
    const rows = [...stage.querySelectorAll<HTMLElement>('[data-testid="top3-row"]')].map((row) => {
      const name = row.querySelector<HTMLElement>('[data-testid="top3-name"]')!;
      const lines = [...name.querySelectorAll<HTMLElement>('[data-top3-name-line]')].map((line) => ({
        text: line.innerText,
        ...box(line),
        scrollWidth: line.scrollWidth,
        clientWidth: line.clientWidth,
        scrollHeight: line.scrollHeight,
        clientHeight: line.clientHeight,
      }));
      const time = row.querySelector<HTMLElement>('[data-testid="top3-time"]')!;
      return {
        ...box(row),
        rank: row.dataset.rank,
        tied: row.dataset.tied === 'true',
        name: name.textContent ?? '',
        graphemes: Number(name.dataset.graphemes),
        nameFontSize: getComputedStyle(name).fontSize,
        nameLineCount: lines.length,
        lines,
        time: time.innerText,
        timeFontVariantNumeric: getComputedStyle(time).fontVariantNumeric,
        scrollWidth: row.scrollWidth,
        clientWidth: row.clientWidth,
        scrollHeight: row.scrollHeight,
        clientHeight: row.clientHeight,
      };
    });
    const options = [...stage.querySelectorAll<HTMLElement>('.v3-options .v3-option')].map(box);
    return {
      bubble: bubble ? box(bubble) : null,
      throne: box(throne),
      art,
      title: box(title),
      padding: bubble ? [getComputedStyle(bubble).paddingTop, getComputedStyle(bubble).paddingRight, getComputedStyle(bubble).paddingBottom, getComputedStyle(bubble).paddingLeft].map(Number.parseFloat) : [],
      rows,
      overflow: stage.querySelector<HTMLElement>('[data-testid="top3-overflow"]')?.innerText ?? '',
      empty: stage.querySelector<HTMLElement>('[data-testid="question-top3"]')?.dataset.empty === 'true',
      options,
    };
  });
}

async function saveReview(page: import('@playwright/test').Page, name: string) {
  if (usesE2ePlaceholderAssets()) return;
  await mkdir(reviewDirectory, { recursive: true });
  const stage = page.getByTestId('stage');
  await stage.screenshot({ path: join(reviewDirectory, name + '-1080x1920.png'), animations: 'disabled' });
  const bubble = await page.getByTestId('question-top3').boundingBox();
  const plate = await page.locator('.v3-mc-plate').boundingBox();
  const art = await page.locator('.v3-throne-art').boundingBox();
  if (!bubble || !plate || !art) throw new Error('C-0379 zoom screenshot is missing a measured region.');
  const x = Math.max(0, Math.floor(Math.min(bubble.x, art.x, plate.x) - 24));
  const y = Math.max(0, Math.floor(Math.min(bubble.y, art.y, plate.y) - 24));
  const right = Math.min(1080, Math.ceil(Math.max(bubble.x + bubble.width, art.x + art.width, plate.x + plate.width) + 24));
  const bottom = Math.min(1920, Math.ceil(Math.max(bubble.y + bubble.height, art.y + art.height, plate.y + plate.height) + 24));
  await page.screenshot({
    path: join(reviewDirectory, name + '-zoom.png'),
    clip: { x, y, width: right - x, height: bottom - y },
    animations: 'disabled',
  });
}

const rankingCases = [
  { mock: 'top3-throne-empty-short-reveal', rows: 3, overflow: '', names: ['StormKing', 'FFVN.Kelly', 'BVD.Champion'], screenshot: 'reveal-3-short' },
  { mock: 'top3-throne-empty-long-reveal', rows: 3, overflow: '', names: [longName, longName, longName], screenshot: 'reveal-3-same-name-24' },
  { mock: 'top3-throne-empty-tie-reveal', rows: 3, overflow: '+3 người đồng hạng', names: ['StormKing', 'FFVN.Kelly', 'BVD.Champion'], screenshot: 'reveal-tie-plus-3' },
  { mock: 'top3-throne-empty-zero-reveal', rows: 0, overflow: '', names: [], screenshot: 'reveal-0' },
  { mock: 'top3-throne-held-one-reveal', rows: 1, overflow: '', names: ['Ấ'], screenshot: 'reveal-1' },
  { mock: 'top3-throne-held-two-leaderboard', rows: 2, overflow: '', names: ['Ấ', 'ĐỗNguyễn⚡Tốc'], screenshot: 'leaderboard-2-held' },
  { mock: 'top3-throne-held-short-leaderboard', rows: 3, overflow: '', names: ['StormKing', 'FFVN.Kelly', 'BVD.Champion'], screenshot: 'leaderboard-3-held' },
] as const;

for (const example of rankingCases) {
  test('C-0379 Top 3 panel fits ' + example.mock, async ({ page }) => {
    await page.goto('/?mock=' + example.mock, { waitUntil: 'domcontentloaded' });
    const stage = page.getByTestId('stage');
    await expect(stage).toHaveAttribute('data-scene', 'REVEAL');
    const expectedState = example.mock.includes('leaderboard') ? 'LEADERBOARD' : 'REVEAL';
    await expect(stage).toHaveAttribute('data-state', expectedState);
    await expect(stage.getByTestId('question-top3')).toBeVisible();
    const expectedThrone = example.mock.includes('-empty-') ? 'EMPTY' : 'HELD';
    await expect(stage.getByTestId('throne-panel')).toHaveAttribute('data-throne-state', expectedThrone);
    await waitForStableStage(page);
    const layout = await readTop3Layout(page);
    console.log('C-0379 bbox ' + example.mock + ': ' + JSON.stringify(layout));
    expect(layout.bubble).not.toBeNull();
    expect(layout.bubble!.left).toBeCloseTo(740, 0);
    expect(layout.bubble!.right).toBeCloseTo(998, 0);
    expect(layout.bubble!.width).toBeCloseTo(258, 0);
    expect(layout.bubble!.left - layout.art.right).toBeGreaterThanOrEqual(24);
    expect(layout.title.top - layout.bubble!.bottom).toBeGreaterThanOrEqual(16);
    expect(layout.bubble!.top - Math.max(...layout.options.map((option) => option.bottom))).toBeGreaterThanOrEqual(24);
    expect(layout.padding).toEqual([8, 8, 8, 8]);
    expect(layout.rows).toHaveLength(example.rows);
    expect(layout.overflow).toBe(example.overflow);
    expect(layout.empty).toBe(example.rows === 0);
    expect(layout.rows.map((row) => row.name)).toEqual(example.names);
    for (const row of layout.rows) {
      expect(row.height).toBeCloseTo(30, 0);
      expect(row.timeFontVariantNumeric).toContain('tabular-nums');
      expect(row.graphemes).toBe([...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(row.name)].length);
      expect(row.nameLineCount).toBeLessThanOrEqual(2);
      expect(Number.parseFloat(row.nameFontSize)).toBeGreaterThanOrEqual(15);
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
      expect(row.scrollHeight).toBeLessThanOrEqual(row.clientHeight);
      for (const line of row.lines) {
        expect(line.scrollWidth).toBeLessThanOrEqual(line.clientWidth);
      }
    }
    if ((example.names as readonly string[]).includes(longName)) {
      for (const row of layout.rows) expect(row.name).toBe(longName);
    }
    await saveReview(page, example.screenshot);
  });
}

test('C-0379 legacy server fallback keeps the existing single-answer card', async ({ page }) => {
  await page.goto('/?mock=fastest-throne-held-24-leaderboard', { waitUntil: 'domcontentloaded' });
  await waitForStableStage(page);
  await expect(page.getByTestId('question-top3')).toHaveCount(0);
  await expect(page.getByTestId('fastest-callout')).toContainText('NHANH NHẤT');
  await expect(page.locator('.v3-fastest-name')).toContainText(longName);
});

test('C-0379 cancelled result drops Top 3 and restores ask bubble geometry', async ({ page }) => {
  await page.goto('/?mock=top3-throne-held-cancelled', { waitUntil: 'domcontentloaded' });
  await constStageBubble(page, 'top3-throne-held-cancelled');
  const cancelled = await page.getByTestId('mc-bubble').boundingBox();
  await expect(page.getByTestId('question-top3')).toHaveCount(0);
  await page.goto('/?mock=reveal-throne-held', { waitUntil: 'domcontentloaded' });
  await constStageBubble(page, 'reveal-throne-held');
  const askGeometry = await page.getByTestId('mc-bubble').boundingBox();
  expect(cancelled).not.toBeNull();
  expect(askGeometry).not.toBeNull();
  expect(cancelled).toEqual(askGeometry);
});

async function constStageBubble(page: import('@playwright/test').Page, mock: string) {
  await expect(page.getByTestId('stage')).toHaveAttribute('data-scene', 'REVEAL');
  await expect(page.getByTestId('mc-bubble')).toBeVisible();
  await waitForStableStage(page);
  console.log('C-0379 bubble geometry ' + mock + ': ' + JSON.stringify(await page.getByTestId('mc-bubble').boundingBox()));
}

test('C-0379 long Top 3 names fit with an alternate font theme', async ({ page }) => {
  await page.route('**/api/theme', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'c0379-serif',
      name: 'C-0379 alternate font',
      version: 1,
      tokens: { 'font-body': 'Georgia, serif', 'font-display': 'Georgia, serif' },
      fonts: [],
      assets: {},
    }),
  }));
  await page.goto('/?mock=top3-throne-held-long-leaderboard', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme-id', 'c0379-serif');
  await waitForStableStage(page);
  const layout = await readTop3Layout(page);
  console.log('C-0379 alternate font layout: ' + JSON.stringify(layout.rows));
  expect(layout.rows).toHaveLength(3);
  expect(layout.rows.map((row) => row.name)).toEqual([longName, longName, longName]);
  expect(await page.locator('.v3-top3-name').first().evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Georgia');
  for (const row of layout.rows) {
    expect(Number.parseFloat(row.nameFontSize)).toBeGreaterThanOrEqual(15);
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    expect(row.scrollHeight).toBeLessThanOrEqual(row.clientHeight);
    for (const line of row.lines) {
      expect(line.scrollWidth).toBeLessThanOrEqual(line.clientWidth);
    }
  }
});

test('C-0379 MC image stays under the fixed nameplate in every scene and sampled animation frame', async ({ page }) => {
  const scenes = [
    { mock: 'throne-locked', scene: 'LOBBY', state: 'LOBBY' },
    { mock: 'throne-held', scene: 'QUESTION', state: 'ACCEPTING' },
    { mock: 'top3-throne-held-short-reveal', scene: 'REVEAL', state: 'REVEAL' },
    { mock: 'top3-throne-held-short-leaderboard', scene: 'REVEAL', state: 'LEADERBOARD' },
  ];
  const imageOffsets: number[] = [];
  for (const scene of scenes) {
    await page.goto('/?mock=' + scene.mock, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('stage')).toHaveAttribute('data-scene', scene.scene);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-state', scene.state);
    await waitForStableStage(page);
    const samples = await page.evaluate(async () => {
      const stage = document.querySelector<HTMLElement>('[data-testid="stage"]')!;
      const figure = stage.querySelector<HTMLElement>('.v3-mc-figure')!;
      const image = stage.querySelector<HTMLImageElement>('.v3-mc-figure img.mc-sequence')!;
      const pose = image.parentElement as HTMLElement;
      const plate = stage.querySelector<HTMLElement>('.v3-mc-plate')!;
      const result: Array<{ src: string; animation: string; naturalWidth: number; naturalHeight: number; overlap: number; imageOffset: number; figureHeight: number; plateZ: number; imageZ: number }> = [];
      for (let index = 0; index < 11; index += 1) {
        const imageBox = image.getBoundingClientRect();
        const figureBox = figure.getBoundingClientRect();
        const poseBox = pose.getBoundingClientRect();
        const plateBox = plate.getBoundingClientRect();
        const visibleBottom = Math.min(imageBox.bottom, figureBox.bottom, poseBox.bottom);
        result.push({
          src: image.currentSrc,
          animation: image.dataset.mcAnimation ?? '',
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          overlap: visibleBottom - plateBox.top,
          imageOffset: imageBox.top - figureBox.top,
          figureHeight: figureBox.height,
          plateZ: Number.parseInt(getComputedStyle(plate).zIndex, 10) || 0,
          imageZ: Number.parseInt(getComputedStyle(figure).zIndex, 10) || 0,
        });
        await new Promise((resolveFrame) => setTimeout(resolveFrame, 140));
      }
      return result;
    });
    console.log('C-0379 MC frame measurements ' + scene.mock + ': ' + JSON.stringify(samples));
    expect(samples.length).toBe(11);
    for (const sample of samples) {
      expect(sample.naturalWidth, scene.mock + ': loaded MC frame ' + sample.src).toBeGreaterThan(0);
      expect(sample.naturalHeight, scene.mock + ': loaded MC frame ' + sample.src).toBeGreaterThan(0);
      if (!usesE2ePlaceholderAssets()) {
        expect(sample.overlap, scene.mock + ': image overlap under nameplate').toBeGreaterThanOrEqual(12);
      }
      expect(sample.plateZ, scene.mock + ': nameplate is above MC').toBeGreaterThan(sample.imageZ);
      imageOffsets.push(sample.imageOffset);
    }
    if (scene.mock === 'top3-throne-held-short-leaderboard') await saveReview(page, 'mc-figure-leaderboard-held');
  }
  expect(Math.max(...imageOffsets) - Math.min(...imageOffsets), 'face/top position remains stable across poses').toBeLessThanOrEqual(4);
});
