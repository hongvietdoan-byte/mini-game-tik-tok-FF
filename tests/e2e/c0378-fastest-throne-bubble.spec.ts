import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { usesE2ePlaceholderAssets } from './assets';

const reviewDirectory = resolve(process.cwd(), '../../../assets-local/review/c-0378');
const namesByLength = {
  1: 'Ấ',
  12: 'ĐỗNguyễn⚡Tốc',
  24: 'Đỗ_Nguyễn⚡TốcĐộ_2026🔥ABC',
} as const;

type NameLength = keyof typeof namesByLength;
type ThroneState = 'empty' | 'held';
type Phase = 'reveal' | 'leaderboard';

async function waitForStableStage(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
    await new Promise<void>((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())));
  });
}

async function readLayout(page: import('@playwright/test').Page) {
  return page.getByTestId('stage').evaluate((stage) => {
    const bubble = stage.querySelector<HTMLElement>('.v3-fastest-callout')!;
    const throne = stage.querySelector<HTMLElement>('[data-testid="throne-panel"]')!;
    const title = throne.querySelector<HTMLElement>('.v3-throne-title')!;
    const image = throne.querySelector<HTMLImageElement>('[data-testid="throne-art"]');
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };

    let art: ReturnType<typeof box> | null = null;
    let artBoundsSource: 'alpha' | 'svg' | 'declared' = 'declared';
    if (image?.complete && image.naturalWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let minX = canvas.width; let minY = canvas.height; let maxX = -1; let maxY = -1;
        for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3]! <= 12) continue;
          minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
        if (maxX >= minX && maxY >= minY) {
          const rect = image.getBoundingClientRect();
          art = {
            left: rect.left + minX * rect.width / canvas.width,
            top: rect.top + minY * rect.height / canvas.height,
            right: rect.left + (maxX + 1) * rect.width / canvas.width,
            bottom: rect.top + (maxY + 1) * rect.height / canvas.height,
            width: (maxX + 1 - minX) * rect.width / canvas.width,
            height: (maxY + 1 - minY) * rect.height / canvas.height,
          };
          artBoundsSource = 'alpha';
        }
      } catch {
        // Placeholder images and local source art both fall back to the panel's declared visible-art box.
      }
    }
    if (!art) {
      const svg = throne.querySelector<SVGSVGElement>('.v3-throne-emblem');
      if (svg) {
        const path = svg.querySelector('path');
        if (path) {
          const pathBox = path.getBBox();
          const svgBox = svg.getBoundingClientRect();
          const view = svg.viewBox.baseVal;
          art = {
            left: svgBox.left + (pathBox.x - view.x) * svgBox.width / view.width,
            top: svgBox.top + (pathBox.y - view.y) * svgBox.height / view.height,
            right: svgBox.left + (pathBox.x + pathBox.width - view.x) * svgBox.width / view.width,
            bottom: svgBox.top + (pathBox.y + pathBox.height - view.y) * svgBox.height / view.height,
            width: pathBox.width * svgBox.width / view.width,
            height: pathBox.height * svgBox.height / view.height,
          };
          artBoundsSource = 'svg';
        }
      }
    }
    if (!art) {
      const [left = 0, top = 0, right = 0, bottom = 0] = (throne.dataset.visibleArt ?? '').split(',').map(Number);
      art = { left, top, right, bottom, width: right - left, height: bottom - top };
    }
    if (!art) throw new Error('C-0378 could not measure visible throne art.');

    const copy = stage.querySelector<HTMLElement>('[data-testid="fastest-callout"]')!;
    const name = copy.querySelector<HTMLElement>('.v3-fastest-name')!;
    const nameLines = [...name.querySelectorAll<HTMLElement>('.v3-fastest-name-content > span')].map((line) => ({
      text: line.innerText,
      ...box(line),
      scrollWidth: line.scrollWidth,
      clientWidth: line.clientWidth,
      scrollHeight: line.scrollHeight,
      clientHeight: line.clientHeight,
    }));
    const nameLineCount = nameLines.length;
    const text = [...copy.children].map((element) => {
      const node = element as HTMLElement;
      return {
        text: node.innerText,
        ...box(node),
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        scrollHeight: node.scrollHeight,
        clientHeight: node.clientHeight,
      };
    });
    return {
      bubble: box(bubble),
      throne: box(throne),
      art,
      artBoundsSource,
      title: box(title),
      padding: [
        getComputedStyle(bubble).paddingTop,
        getComputedStyle(bubble).paddingRight,
        getComputedStyle(bubble).paddingBottom,
        getComputedStyle(bubble).paddingLeft,
      ].map(Number.parseFloat),
      text,
      nameLines,
      nameLineCount,
      fontFamily: getComputedStyle(name).fontFamily,
      fontSize: getComputedStyle(name).fontSize,
    };
  });
}

async function assertFastestLayout(page: import('@playwright/test').Page, label: string) {
  const layout = await readLayout(page);
  console.log(`C-0378 bbox ${label}: ${JSON.stringify(layout)}`);
  expect(layout.bubble.left, `${label}: bubble left`).toBeCloseTo(740, 0);
  expect(layout.bubble.width, `${label}: bubble width`).toBeCloseTo(258, 0);
  expect(layout.bubble.right, `${label}: bubble right`).toBeCloseTo(998, 0);
  expect(layout.bubble.left - layout.art.right, `${label}: left gap from visible throne art`).toBeGreaterThanOrEqual(24);
  expect(layout.title.top - layout.bubble.bottom, `${label}: bottom gap above NGAI VÀNG`).toBeGreaterThanOrEqual(16);
  expect(layout.padding, `${label}: card inner padding`).toEqual([8, 8, 8, 8]);
  expect(layout.text).toHaveLength(3);
  expect(layout.nameLineCount, `${label}: name wraps to at most two lines`).toBeLessThanOrEqual(2);
  for (const line of layout.nameLines) {
    expect(line.scrollWidth, `${label}: horizontal name-line fit for ${line.text}`).toBeLessThanOrEqual(line.clientWidth);
    expect(line.scrollHeight, `${label}: vertical name-line fit for ${line.text}`).toBeLessThanOrEqual(line.clientHeight);
  }
  for (const row of layout.text) {
    expect(row.scrollWidth, `${label}: horizontal text fit for ${row.text}`).toBeLessThanOrEqual(row.clientWidth);
    expect(row.scrollHeight, `${label}: vertical text fit for ${row.text}`).toBeLessThanOrEqual(row.clientHeight);
    expect(row.left, `${label}: text respects left padding`).toBeGreaterThanOrEqual(layout.bubble.left + 8 - 0.5);
    expect(row.right, `${label}: text respects right padding`).toBeLessThanOrEqual(layout.bubble.right - 8 + 0.5);
  }
  return layout;
}

for (const throne of ['empty', 'held'] as const satisfies readonly ThroneState[]) {
  for (const length of [1, 12, 24] as const satisfies readonly NameLength[]) {
    for (const phase of ['reveal', 'leaderboard'] as const satisfies readonly Phase[]) {
      test(`C-0378 ${phase}, ${throne} throne, ${length}-grapheme name`, async ({ page }) => {
        const mock = `fastest-throne-${throne}-${length}-${phase}`;
        await page.goto(`/?mock=${mock}`, { waitUntil: 'domcontentloaded' });
        const stage = page.getByTestId('stage');
        await expect(stage).toHaveAttribute('data-scene', 'REVEAL');
        await expect(stage).toHaveAttribute('data-state', phase === 'reveal' ? 'REVEAL' : 'LEADERBOARD');
        await expect(stage.getByTestId('throne-panel')).toHaveAttribute('data-throne-state', throne === 'empty' ? 'EMPTY' : 'HELD');
        await expect(stage.getByTestId('fastest-callout')).toContainText('NHANH NHẤT');
        await expect(stage.locator('.v3-fastest-name')).toHaveJSProperty('textContent', namesByLength[length]);
        expect([...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(namesByLength[length])]).toHaveLength(length);
        await waitForStableStage(page);
        const layout = await assertFastestLayout(page, mock);

        if (length === 24 && !usesE2ePlaceholderAssets()) {
          await mkdir(reviewDirectory, { recursive: true });
          await stage.screenshot({ path: join(reviewDirectory, `${phase}-${throne}-name24-1080x1920.png`), animations: 'disabled' });
        }
        expect(layout.art.width).toBeGreaterThan(0);
      });
    }
  }
}

for (const throne of ['empty', 'held'] as const satisfies readonly ThroneState[]) {
  test(`C-0378 no fastest answer keeps the ${throne} throne bubble in its question slot`, async ({ page }) => {
    await page.goto(`/?mock=throne-${throne}`, { waitUntil: 'domcontentloaded' });
    const questionBubble = page.getByTestId('mc-bubble');
    await expect(page.getByTestId('stage')).toHaveAttribute('data-scene', 'QUESTION');
    const question = await questionBubble.boundingBox();
    expect(question).not.toBeNull();

    await page.goto(`/?mock=reveal-throne-${throne}`, { waitUntil: 'domcontentloaded' });
    const revealBubble = page.getByTestId('mc-bubble');
    await expect(page.getByTestId('stage')).toHaveAttribute('data-scene', 'REVEAL');
    await expect(page.getByTestId('fastest-callout')).toHaveCount(0);
    const reveal = await revealBubble.boundingBox();
    expect(reveal).not.toBeNull();
    expect(reveal).toEqual(question);
  });
}

test('C-0378 fastest throne bubble keeps fitting with an alternate font theme', async ({ page }) => {
  await page.route('**/api/theme', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'c0378-serif',
      name: 'C-0378 alternate font',
      version: 1,
      tokens: { 'font-body': 'Georgia, serif', 'font-display': 'Georgia, serif' },
      fonts: [],
      assets: {},
    }),
  }));
  await page.goto('/?mock=fastest-throne-held-24-leaderboard', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme-id', 'c0378-serif');
  await waitForStableStage(page);
  const layout = await assertFastestLayout(page, 'alternate-font-held-24-leaderboard');
  expect(layout.fontFamily).toContain('Georgia');
});
