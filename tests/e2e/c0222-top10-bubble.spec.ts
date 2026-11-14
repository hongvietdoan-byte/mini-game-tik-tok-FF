import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const reviewDirectory = join(process.cwd(), '.claude', 'review', 'C0222');

type Rect = { x: number; y: number; width: number; height: number; right: number; bottom: number };

test('C-0222 puts a wide question-style bubble beside Kelly in mid-round Top 10', async ({ page }) => {
  await mkdir(reviewDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?mock=top10', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('[data-testid="stage"][data-scene="INTERIM_TOP10"]');
  await expect(stage).toBeVisible();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });

  const geometry = await page.evaluate(() => {
    const rect = (element: Element): Rect => {
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      const rounded = (value: number) => Math.round(value * 100) / 100;
      return { x: rounded(x), y: rounded(y), width: rounded(width), height: rounded(height), right: rounded(right), bottom: rounded(bottom) };
    };
    const root = document.querySelector<HTMLElement>('[data-testid="stage"][data-scene="INTERIM_TOP10"]')!;
    const guide = root.querySelector<HTMLElement>('[data-testid="top10-guide"]')!;
    const bubble = guide.querySelector<HTMLElement>('[data-testid="mc-bubble"]')!;
    const mcStyle = getComputedStyle(guide.querySelector<HTMLElement>('.v3-mc')!);
    const paragraph = bubble.querySelector('p')!;
    const image = guide.querySelector<HTMLImageElement>('.v3-mc-figure img')!;
    const style = getComputedStyle(bubble);
    const textStyle = getComputedStyle(paragraph);
    return {
      board: rect(root.querySelector('[data-layer="leaderboard-full"]')!),
      guide: rect(guide),
      bubble: rect(bubble),
      figure: rect(guide.querySelector('.v3-mc-figure')!),
      image: { ...rect(image), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight },
      plate: rect(guide.querySelector('.v3-mc-plate')!),
      mcContain: mcStyle.contain,
      bubbleStyle: {
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        borderTopLeftRadius: style.borderTopLeftRadius,
        backgroundImage: style.backgroundImage,
        boxShadow: style.boxShadow,
        paddingTop: style.paddingTop,
        paddingLeft: style.paddingLeft,
      },
      textStyle: {
        fontSize: textStyle.fontSize,
        fontStyle: textStyle.fontStyle,
        fontWeight: textStyle.fontWeight,
        lineHeight: textStyle.lineHeight,
      },
    };
  });

  expect(geometry.board).toMatchObject({ x: 112, y: 500, right: 968, bottom: 1120 });
  expect(geometry.guide).toMatchObject({ x: 744, y: 1138, width: 224, height: 374, right: 968 });
  expect(geometry.bubble).toMatchObject({ x: 115, y: 1178, width: 633, height: 145, right: 748, bottom: 1323 });
  expect(geometry.image.x - geometry.bubble.right).toBe(18);
  expect(geometry.mcContain).toBe('layout');
  expect(geometry.bubble.y + geometry.bubble.height / 2).toBe(geometry.figure.y + geometry.figure.height / 2);
  expect(geometry.figure).toMatchObject({ x: 744, y: 1138, width: 224, height: 225 });
  expect(geometry.image).toMatchObject({ x: 766, y: 1138, width: 180 });
  expect(geometry.image.height / geometry.image.width).toBeCloseTo(geometry.image.naturalHeight / geometry.image.naturalWidth, 2);
  expect(geometry.plate).toMatchObject({ x: 744, y: 1348, width: 224, height: 42 });

  await page.goto('/?mock=question', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="stage"][data-scene="QUESTION"]')).toBeVisible();
  const questionBubbleStyle = await page.locator('[data-testid="mc-bubble"]').evaluate((bubble) => {
    const style = getComputedStyle(bubble);
    const textStyle = getComputedStyle(bubble.querySelector('p')!);
    return {
      height: style.height,
      borderTopWidth: style.borderTopWidth,
      borderTopColor: style.borderTopColor,
      borderTopLeftRadius: style.borderTopLeftRadius,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      paddingTop: style.paddingTop,
      paddingLeft: style.paddingLeft,
      fontSize: textStyle.fontSize,
      fontStyle: textStyle.fontStyle,
      fontWeight: textStyle.fontWeight,
      lineHeight: textStyle.lineHeight,
    };
  });
  expect(questionBubbleStyle).toEqual({
    height: `${geometry.bubble.height}px`,
    ...geometry.bubbleStyle,
    ...geometry.textStyle,
  });

  await page.goto('/?mock=top10', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="stage"][data-scene="INTERIM_TOP10"]')).toBeVisible();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.screenshot({ path: join(reviewDirectory, 'top10-mid-round.png'), animations: 'disabled' });

  await page.goto('/?mock=top10&hud=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('tiktok-hud')).toBeVisible();
  await expect(page.locator('[data-testid="mc-bubble"]')).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const hudAudit = await page.evaluate(() => {
    const rect = (selector: string): Rect => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing HUD element ${selector}`);
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      const rounded = (value: number) => Math.round(value * 100) / 100;
      return { x: rounded(x), y: rounded(y), width: rounded(width), height: rounded(height), right: rounded(right), bottom: rounded(bottom) };
    };
    const bubble = rect('[data-testid="mc-bubble"]');
    const hud = {
      commentRail: rect('[data-testid="tiktok-comments"]'),
      commentInput: rect('[data-testid="tiktok-comment-bar"]'),
      giftToast: rect('[data-testid="tiktok-gift-toast"]'),
      eventBanner: rect('[data-testid="tiktok-event-banner"]'),
      viewers: rect('[data-testid="tiktok-viewers"]'),
      liveInfo: rect('[data-testid="tiktok-live-info"]'),
      liveChips: rect('[data-testid="tiktok-live-chips"]'),
    };
    const overlaps = Object.entries(hud).map(([name, target]) => {
      const x = Math.max(bubble.x, target.x);
      const y = Math.max(bubble.y, target.y);
      const width = Math.max(0, Math.min(bubble.right, target.right) - x);
      const height = Math.max(0, Math.min(bubble.bottom, target.bottom) - y);
      return { name, x, y, width, height, area: width * height };
    }).filter((entry) => entry.area > 0).map((entry) => {
      const rounded = (value: number) => Math.round(value * 100) / 100;
      return { name: entry.name, x: rounded(entry.x), y: rounded(entry.y), width: rounded(entry.width), height: rounded(entry.height), area: rounded(entry.area) };
    });
    return { bubble, hud, overlaps };
  });
  expect(hudAudit.overlaps.map(({ name }) => name)).toEqual(['giftToast']);
  const toastOverlap = hudAudit.overlaps[0]!;
  expect(toastOverlap.width).toBeCloseTo(255.81, 1);
  expect(toastOverlap.height).toBe(58);
  await page.screenshot({ path: join(reviewDirectory, 'top10-mid-round-hud.png'), animations: 'disabled' });

  const measurementReport = [
    '# C-0222 · Bong bóng MC ngang ở Top 10 giữa vòng',
    '',
    'Viewport 1080×1920. Bong bóng ngang cùng hàng và căn giữa theo khung Kelly; giữ ảnh và nameplate theo C-0221.',
    '',
    '| Phần tử | Hộp đo x/y/w/h | Ghi chú |',
    '|---|---|---|',
    `| Bảng Top 10 | ${geometry.board.x}/${geometry.board.y}/${geometry.board.width}/${geometry.board.height} | đáy y=${geometry.board.bottom} |`,
    `| Cụm Kelly | ${geometry.guide.x}/${geometry.guide.y}/${geometry.guide.width}/${geometry.guide.height} | mép phải ${geometry.guide.right}; giữ C-0221 |`,
    `| Bong bóng MC | ${geometry.bubble.x}/${geometry.bubble.y}/${geometry.bubble.width}/${geometry.bubble.height} | mép trái thẳng bảng; mép phải cách ảnh ${geometry.image.x - geometry.bubble.right}px; giữa dọc với khung ảnh |`,
    `| Ảnh Kelly | ${geometry.image.x}/${geometry.image.y}/${geometry.image.width}/${geometry.image.height} | tự nhiên ${geometry.image.naturalWidth}×${geometry.image.naturalHeight}, giữ tỉ lệ |`,
    `| Bảng tên Kelly | ${geometry.plate.x}/${geometry.plate.y}/${geometry.plate.width}/${geometry.plate.height} | giữ nguyên |`,
    '',
    `Kiểu bong bóng và chữ được so trực tiếp với QUESTION: ${JSON.stringify(geometry.bubbleStyle)}; chữ ${JSON.stringify(geometry.textStyle)}.`,
    '',
    'HUD an toàn: không giao comment rail, ô nhập, banner, viewers, live info hoặc live chips.',
    `Giao gift toast: ${JSON.stringify(hudAudit.overlaps)}.`,
    `Lưu ý: gift toast HUD mô phỏng là phần tử duy nhất giao bong bóng (${toastOverlap.width}×${toastOverlap.height}px tại ${toastOverlap.x}/${toastOverlap.y}); toast nằm trên overlay nên che một phần câu chữ trong ảnh HUD.`,
  ].join('\n');
  await writeFile(join(reviewDirectory, 'measurements.md'), measurementReport, 'utf8');
  console.log(`C-0222 geometry: ${JSON.stringify({ geometry, hudAudit })}`);
});
