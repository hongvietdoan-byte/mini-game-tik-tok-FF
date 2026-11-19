import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { usesE2ePlaceholderAssets } from './assets';

const reviewDirectory = resolve(process.cwd(), 'test-results', 'c0339-review', usesE2ePlaceholderAssets() ? 'placeholder' : 'actual');

async function capture(page: import('@playwright/test').Page, label: string) {
  await page.evaluate(() => new Promise<void>((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))));
  await page.screenshot({ path: join(reviewDirectory, `${label}-1080x1920.png`), fullPage: true, animations: 'disabled' });
  const detail = page.locator('[data-testid="throne-panel"], [data-testid="podium-slot-1"]');
  if (await detail.count()) await detail.first().screenshot({ path: join(reviewDirectory, `${label}-detail.png`), animations: 'disabled' });
}

async function throneOverlaps(page: import('@playwright/test').Page) {
  return page.getByTestId('throne-panel').evaluate((panel) => {
    const image = panel.querySelector<HTMLImageElement>('[data-testid="throne-art"]');
    let art: { left: number; top: number; right: number; bottom: number } | null = null;
    if (image?.complete && image.naturalWidth > 0) {
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
      const rect = image.getBoundingClientRect();
      art = {
        left: rect.left + minX * rect.width / canvas.width,
        top: rect.top + minY * rect.height / canvas.height,
        right: rect.left + (maxX + 1) * rect.width / canvas.width,
        bottom: rect.top + (maxY + 1) * rect.height / canvas.height,
      };
    } else {
      const svg = panel.querySelector<SVGSVGElement>('.v3-throne-emblem');
      if (svg) {
        const local = svg.getBBox();
        const rect = svg.getBoundingClientRect();
        const view = svg.viewBox.baseVal;
        art = {
          left: rect.left + (local.x - view.x) * rect.width / view.width,
          top: rect.top + (local.y - view.y) * rect.height / view.height,
          right: rect.left + (local.x + local.width - view.x) * rect.width / view.width,
          bottom: rect.top + (local.y + local.height - view.y) * rect.height / view.height,
        };
      }
    }
    if (!art) return ['no-visible-throne-art'];
    const overlaps = (candidate: DOMRect) => candidate.width > 0 && candidate.height > 0 &&
      art!.left < candidate.right && art!.right > candidate.left && art!.top < candidate.bottom && art!.bottom > candidate.top;
    const selectors = [
      '.v3-bubble', '.v3-board-tab', '.v3-question:not(.is-lobby)', '.v3-options',
      '.v3-seat-back', '.v3-seat-name', '.v3-mc-plate',
    ];
    return selectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => overlaps(element.getBoundingClientRect()))
      .map((element) => `${selector}:${element.textContent?.trim() ?? ''}`));
  });
}

async function seatOverlapIssues(page: import('@playwright/test').Page) {
  return page.getByTestId('stage').evaluate((stage) => {
    const boxes = (selector: string) => [...stage.querySelectorAll<HTMLElement>(selector)].map((element) => ({
      id: element.dataset.slotId ?? element.closest<HTMLElement>('[data-testid="audience-seat"]')?.dataset.slotId ?? 'unknown',
      box: element.getBoundingClientRect(),
      selector,
    }));
    const tags = boxes('.v3-seat-name');
    const mcFigures = boxes('.v3-mc .v3-mc-figure');
    const mcPlates = boxes('.v3-mc-plate');
    const alphaBounds = new Map<string, { left: number; top: number; right: number; bottom: number } | null>();
    const characters = [...stage.querySelectorAll<HTMLElement>('.v3-chibi-img')].map((wrapper) => {
      const id = wrapper.closest<HTMLElement>('[data-testid="audience-seat"]')?.dataset.slotId ?? 'unknown';
      const image = wrapper.querySelector<HTMLImageElement>('img');
      const elementBox = wrapper.getBoundingClientRect();
      if (!image || !image.complete || image.naturalWidth === 0) return { id, box: elementBox, selector: '.v3-chibi-img' };
      const source = image.currentSrc || image.src;
      let sourceBounds = alphaBounds.get(source);
      if (sourceBounds === undefined) {
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
        sourceBounds = maxX < 0 ? null : { left: minX, top: minY, right: maxX + 1, bottom: maxY + 1 };
        alphaBounds.set(source, sourceBounds);
      }
      if (!sourceBounds) return { id, box: { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 } as DOMRect, selector: '.v3-chibi-img' };
      const style = getComputedStyle(image);
      const fitScale = style.objectFit === 'cover'
        ? Math.max(elementBox.width / image.naturalWidth, elementBox.height / image.naturalHeight)
        : Math.min(elementBox.width / image.naturalWidth, elementBox.height / image.naturalHeight);
      const renderedWidth = image.naturalWidth * fitScale;
      const renderedHeight = image.naturalHeight * fitScale;
      const position = style.objectPosition.split(/\s+/u);
      const alignment = (value: string | undefined) => value === 'right' || value === 'bottom' ? 1 : value === 'center' || value === undefined ? .5 : value.endsWith('%') ? Number.parseFloat(value) / 100 : 0;
      const offsetX = elementBox.left + (elementBox.width - renderedWidth) * alignment(position[0]);
      const offsetY = elementBox.top + (elementBox.height - renderedHeight) * alignment(position[1] ?? '50%');
      const clip = (left: number, top: number, right: number, bottom: number) => ({
        left: Math.max(elementBox.left, left), top: Math.max(elementBox.top, top),
        right: Math.min(elementBox.right, right), bottom: Math.min(elementBox.bottom, bottom),
      });
      const box = clip(
        offsetX + sourceBounds.left * fitScale,
        offsetY + sourceBounds.top * fitScale,
        offsetX + sourceBounds.right * fitScale,
        offsetY + sourceBounds.bottom * fitScale,
      );
      return { id, box: { ...box, width: box.right - box.left, height: box.bottom - box.top } as DOMRect, selector: '.v3-chibi-img' };
    });
    const backs = boxes('.v3-seat-back');
    const all = [...tags, ...characters, ...backs, ...mcFigures, ...mcPlates];
    const issues: string[] = [];
    for (const item of all) {
      if (item.box.width <= 0 || item.box.height <= 0) continue;
      if (item.box.left < -1 || item.box.top < -1 || item.box.right > 1081 || item.box.bottom > 1921)
        issues.push(`outside:${item.selector}:${item.id}`);
    }
    const overlaps = (left: DOMRect, right: DOMRect) => left.left < right.right - 1 && left.right > right.left + 1 && left.top < right.bottom - 1 && left.bottom > right.top + 1;
    for (let i = 0; i < tags.length; i += 1) for (let j = i + 1; j < tags.length; j += 1)
      if (overlaps(tags[i]!.box, tags[j]!.box)) issues.push(`tag-tag:${tags[i]!.id}:${tags[j]!.id}`);
    for (const tag of tags) for (const character of characters)
      if (overlaps(tag.box, character.box)) issues.push(`tag-character:${tag.id}:${character.id}:${JSON.stringify({ tag: { top: tag.box.top, bottom: tag.box.bottom }, character: { top: character.box.top, bottom: character.box.bottom } })}`);
    for (const tag of tags) for (const element of [...mcFigures, ...mcPlates])
      if (overlaps(tag.box, element.box)) issues.push(`tag-mc:${tag.id}:${element.selector}`);
    for (const character of characters) for (const element of [...mcFigures, ...mcPlates])
      if (overlaps(character.box, element.box)) issues.push(`character-mc:${character.id}:${element.selector}`);
    for (const back of backs) for (const element of [...mcFigures, ...mcPlates])
      if (overlaps(back.box, element.box)) issues.push(`chair-mc:${back.id}:${element.selector}`);
    for (let i = 0; i < characters.length; i += 1) for (let j = i + 1; j < characters.length; j += 1)
      if (overlaps(characters[i]!.box, characters[j]!.box)) issues.push(`character-character:${characters[i]!.id}:${characters[j]!.id}`);
    for (let i = 0; i < backs.length; i += 1) for (let j = i + 1; j < backs.length; j += 1)
      if (overlaps(backs[i]!.box, backs[j]!.box)) issues.push(`chair-chair:${backs[i]!.id}:${backs[j]!.id}`);
    return issues;
  });
}

async function throneMetrics(page: import('@playwright/test').Page) {
  return page.getByTestId('throne-panel').evaluate((panel) => {
    const bounds = (element: Element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const image = panel.querySelector<HTMLImageElement>('[data-testid="throne-art"]');
    let visibleArt: ReturnType<typeof bounds> | null = null;
    if (image?.complete && image.naturalWidth > 0) {
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
      const rect = image.getBoundingClientRect();
      visibleArt = {
        left: rect.left + minX * rect.width / canvas.width,
        top: rect.top + minY * rect.height / canvas.height,
        right: rect.left + (maxX + 1) * rect.width / canvas.width,
        bottom: rect.top + (maxY + 1) * rect.height / canvas.height,
        width: (maxX + 1 - minX) * rect.width / canvas.width,
        height: (maxY + 1 - minY) * rect.height / canvas.height,
      };
    } else {
      const svg = panel.querySelector<SVGSVGElement>('.v3-throne-emblem');
      if (svg) {
        const local = svg.getBBox();
        const rect = svg.getBoundingClientRect();
        const view = svg.viewBox.baseVal;
        visibleArt = {
          left: rect.left + (local.x - view.x) * rect.width / view.width,
          top: rect.top + (local.y - view.y) * rect.height / view.height,
          right: rect.left + (local.x + local.width - view.x) * rect.width / view.width,
          bottom: rect.top + (local.y + local.height - view.y) * rect.height / view.height,
          width: local.width * rect.width / view.width,
          height: local.height * rect.height / view.height,
        };
      }
    }
    const bubble = document.querySelector<HTMLElement>('.v3-mc .v3-bubble')!;
    const bubbleText = bubble.querySelector<HTMLElement>('p')!;
    const range = document.createRange();
    range.selectNodeContents(bubbleText);
    const textLines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
    const copy = panel.querySelector<HTMLElement>('.v3-throne-copy')!;
    const title = copy.querySelector<HTMLElement>('.v3-throne-title')!;
    const board = document.querySelector<HTMLElement>('.v3-board')!;
    const top10 = document.querySelector<HTMLElement>('.v3-top10')!;
    const mcFigure = document.querySelector<HTMLElement>('.v3-mc .v3-mc-figure')!;
    const mcImage = mcFigure.querySelector<HTMLImageElement>('img');
    const mcPlate = document.querySelector<HTMLElement>('.v3-mc-plate')!;
    let mcVisible: { left: number; top: number; right: number; bottom: number } | null = null;
    if (mcImage?.complete && mcImage.naturalWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = mcImage.naturalWidth;
      canvas.height = mcImage.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(mcImage, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width; let minY = canvas.height; let maxX = -1; let maxY = -1;
      for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3]! <= 12) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (maxX >= 0) {
        const imageBounds = mcImage.getBoundingClientRect();
        const frame = mcFigure.getBoundingClientRect();
        mcVisible = {
          left: Math.max(frame.left, imageBounds.left + minX * imageBounds.width / canvas.width),
          top: Math.max(frame.top, imageBounds.top + minY * imageBounds.height / canvas.height),
          right: Math.min(frame.right, imageBounds.left + (maxX + 1) * imageBounds.width / canvas.width),
          bottom: Math.min(frame.bottom, imageBounds.top + (maxY + 1) * imageBounds.height / canvas.height),
        };
      }
    }
    const seatRowTops = [...new Set([...panel.ownerDocument.querySelectorAll<HTMLElement>('.v3-seat-name')]
      .map((tag) => Math.round(tag.getBoundingClientRect().top)))].sort((left, right) => left - right);
    return {
      art: visibleArt,
      bubble: bounds(bubble),
      bubbleLines: textLines.size,
      copy: bounds(copy),
      title: bounds(title),
      board: bounds(board),
      top10: bounds(top10),
      mcFigure: bounds(mcFigure),
      mcVisible,
      mcPlate: bounds(mcPlate),
      seatRowTops,
    };
  });
}

async function expectThroneArt(throne: import('@playwright/test').Locator, src: string, fallbackForPlaceholder = false) {
  if (usesE2ePlaceholderAssets() && fallbackForPlaceholder) {
    await expect(throne.locator('svg.v3-throne-emblem')).toBeVisible();
    await expect(throne.getByTestId('throne-art')).toHaveCount(0);
    return;
  }
  const image = throne.getByTestId('throne-art');
  await expect(image).toHaveAttribute('src', src);
  await expect(image).toHaveJSProperty('naturalWidth', 800);
}

async function expectThroneBLayout(page: import('@playwright/test').Page) {
  const metrics = await throneMetrics(page);
  const bubble = page.getByTestId('mc-bubble');
  expect(metrics.art).not.toBeNull();
  expect(metrics.bubble.left).toBeCloseTo(738, 0);
  expect(metrics.bubble.top).toBeCloseTo(845, 0);
  expect(metrics.bubble.width).toBeCloseTo(262, 0);
  expect(metrics.bubble.height).toBeCloseTo(146, 0);
  expect(metrics.copy.left).toBeCloseTo(738, 0);
  expect(metrics.title.top - metrics.bubble.bottom, 'throne title must clear MC bubble by at least 24 px')
    .toBeGreaterThanOrEqual(24);
  expect(metrics.copy.top).toBeGreaterThanOrEqual(metrics.bubble.bottom + 15);
  expect(metrics.copy.right).toBeLessThanOrEqual(1001);
  expect(metrics.bubbleLines).toBeLessThanOrEqual(3);
  expect(metrics.board.bottom).toBeLessThanOrEqual(813.5);
  expect(metrics.top10.bottom).toBeLessThanOrEqual(812);
  expect(metrics.mcPlate.left).toBeGreaterThanOrEqual(24);
  expect(metrics.mcPlate.right).toBeLessThanOrEqual(1056);
  expect(metrics.mcPlate.bottom).toBeLessThanOrEqual(1168);
  if (new URL(page.url()).searchParams.get('mock') === 'throne-locked') {
    expect(metrics.mcFigure.top).toBeGreaterThanOrEqual(836);
    expect(metrics.mcFigure.bottom).toBeLessThanOrEqual(1024);
    expect(metrics.mcVisible).not.toBeNull();
    expect(metrics.mcVisible!.top - metrics.top10.bottom).toBeGreaterThanOrEqual(24);
    expect(metrics.mcPlate.top - metrics.mcVisible!.bottom).toBeGreaterThanOrEqual(16);
  }
  await expect(bubble.locator('.v3-throne-bubble-label')).toHaveText('MC KELLY');
  expect(await bubble.locator('p').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(26, 0);
  expect(metrics.seatRowTops.length).toBeGreaterThanOrEqual(2);
  expect(metrics.seatRowTops[1]! - metrics.art!.bottom).toBeGreaterThanOrEqual(16);
  expect(await throneOverlaps(page)).toEqual([]);
  expect(await seatOverlapIssues(page)).toEqual([]);
  if (!usesE2ePlaceholderAssets()) {
    expect(metrics.art!.left).toBeGreaterThanOrEqual(368);
    expect(metrics.art!.left).toBeLessThanOrEqual(376);
    expect(metrics.art!.right).toBeGreaterThanOrEqual(702);
    expect(metrics.art!.right).toBeLessThanOrEqual(710);
    expect(metrics.art!.top).toBeGreaterThanOrEqual(833);
    expect(metrics.art!.top).toBeLessThanOrEqual(841);
    expect(metrics.art!.bottom).toBeGreaterThanOrEqual(1172);
    expect(metrics.art!.bottom).toBeLessThanOrEqual(1180);
  }
}

test('C-0339 locked throne shows 18/30, unlock cue on one line, and keeps geometry clear', async ({ page }) => {
  await mkdir(reviewDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/?mock=throne-locked', { waitUntil: 'domcontentloaded' });

  const stage = page.getByTestId('stage');
  const throne = page.getByTestId('throne-panel');
  await expect(stage).toHaveAttribute('data-scene', 'LOBBY');
  await expect(stage.locator('.v3-seat')).toHaveCount(30);
  await expect(stage.locator('.v3-seat:not(.is-empty)')).toHaveCount(18);
  await expect(stage.getByTestId('lobby-seat-count')).toHaveText('18/30');
  await expect(throne).toHaveAttribute('data-throne-state', 'LOCKED');
  const lockCue = throne.getByTestId('throne-status');
  await expect(lockCue).toHaveText('Mở sau câu 5');
  expect(await lockCue.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length;
  })).toBe(1);
  await expectThroneArt(throne, '/assets/throne/ngai-trong.png', true);
  await expectThroneBLayout(page);
  await capture(page, 'throne-locked');
});

test('C-0339 LOCKED question 3, HELD question 7 and EMPTY use the public throne contract', async ({ page }) => {
  await mkdir(reviewDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });

  await page.goto('/?mock=throne-locked-question', { waitUntil: 'domcontentloaded' });
  const lockedStage = page.getByTestId('stage');
  const lockedThrone = page.getByTestId('throne-panel');
  await expect(lockedStage.getByTestId('question-tab')).toContainText('CÂU HỎI 3');
  await expect(lockedThrone).toHaveAttribute('data-throne-state', 'LOCKED');
  await expectThroneArt(lockedThrone, '/assets/throne/ngai-trong.png', true);
  await expectThroneBLayout(page);
  await capture(page, 'throne-locked-question');

  await page.goto('/?mock=throne-held', { waitUntil: 'domcontentloaded' });
  const stage = page.getByTestId('stage');
  const throne = page.getByTestId('throne-panel');
  await expect(stage.getByTestId('question-tab')).toContainText('CÂU HỎI 7');
  await expect(throne).toHaveAttribute('data-throne-state', 'HELD');
  await expect(stage.locator('.v3-seat')).toHaveCount(30);
  await expect(stage.locator('.v3-seat:not(.is-empty)')).toHaveCount(29);
  await expect(throne.getByTestId('throne-holder-name')).toHaveText('FFVN.Kelly');
  await expect(throne.getByTestId('throne-holder-score')).toHaveText('1.500 ĐIỂM');
  await expect(throne).toHaveAttribute('data-holder-id', 'demo-player-1');
  expect(await stage.locator('.v3-seat-name').allTextContents()).not.toContain('FFVN.Kelly');
  const throneCopyFits = await throne.evaluate((panel) => {
    const bounds = panel.querySelector('.v3-throne-copy')!.getBoundingClientRect();
    return [...panel.querySelectorAll<HTMLElement>('.v3-throne-title, .v3-throne-name, .v3-throne-score')].every((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= bounds.left - 1 && box.right <= bounds.right + 1 && element.scrollWidth <= element.clientWidth + 1;
    });
  });
  expect(throneCopyFits).toBe(true);
  await expectThroneArt(throne, '/assets/throne/ngai-chibi-020-kairos.png');
  await expect(stage.locator('.v3-top10 li').filter({ hasText: 'FFVN.Kelly' }).locator('.v3-score')).toHaveText('1.500');
  const throneTypography = await throne.evaluate((panel) => ({
    name: Number.parseFloat(getComputedStyle(panel.querySelector<HTMLElement>('.v3-throne-name')!).fontSize),
    score: Number.parseFloat(getComputedStyle(panel.querySelector<HTMLElement>('.v3-throne-score')!).fontSize),
  }));
  expect(throneTypography.name).toBeGreaterThanOrEqual(28);
  expect(throneTypography.name).toBeGreaterThanOrEqual(30);
  expect(throneTypography.score).toBeGreaterThanOrEqual(40);
  await expectThroneBLayout(page);
  await capture(page, 'throne-held');

  await page.goto('/?mock=throne-empty', { waitUntil: 'domcontentloaded' });
  const emptyThrone = page.getByTestId('throne-panel');
  await expect(emptyThrone).toHaveAttribute('data-throne-state', 'EMPTY');
  await expect(emptyThrone.getByTestId('throne-status')).toHaveText('đang chờ chủ');
  await expect(emptyThrone.getByTestId('throne-holder-name')).toHaveCount(0);
  await expect(emptyThrone.getByTestId('throne-holder-score')).toHaveCount(0);
  await expectThroneArt(emptyThrone, '/assets/throne/ngai-trong.png', true);
  await expectThroneBLayout(page);
  await capture(page, 'throne-empty');
});

test('C-0339 holder change animates and carries the same player identity into the tied podium', async ({ page }) => {
  await mkdir(reviewDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/?mock=throne-change', { waitUntil: 'domcontentloaded' });
  const changingThrone = page.getByTestId('throne-panel');
  await expect(changingThrone).toHaveAttribute('data-holder-id', 'demo-player-2');
  await expect(changingThrone).toHaveClass(/is-changing/u);
  await expect(changingThrone.getByTestId('throne-holder-name')).toHaveText('StormKing');
  await expect(changingThrone.getByTestId('throne-holder-score')).toHaveText('1.500 ĐIỂM');
  expect(await page.getByTestId('stage').locator('.v3-seat-name').allTextContents()).not.toContain('StormKing');
  await expect(page.getByTestId('stage').locator('.v3-top10 li').first()).toContainText('StormKing');
  await capture(page, 'throne-change');

  await page.goto('/?mock=throne-tie-top10', { waitUntil: 'domcontentloaded' });
  const tiedThrone = page.getByTestId('throne-panel');
  await expect(tiedThrone).toHaveAttribute('data-holder-id', 'demo-player-2');
  await expect(page.getByTestId('stage').locator('.v3-top10 li').first()).toContainText('StormKing');
  await capture(page, 'throne-tie-top10');

  await page.goto('/?mock=throne-tie', { waitUntil: 'domcontentloaded' });
  const victory = page.getByTestId('victory-stage');
  const podium = victory.locator('.v3v-podium');
  const champion = podium.getByTestId('podium-slot-1');
  await expect(victory).toHaveAttribute('data-scene', 'VICTORY');
  await expect(victory).toHaveAttribute('data-holder-id', 'demo-player-2');
  await expect(champion.getByTestId('podium-rank')).toHaveText('TOP 1');
  await expect(champion).toContainText('StormKing');
  await expect(champion).toHaveAttribute('data-score', '1500');
  await expect(champion.getByTestId('podium-character')).toHaveAttribute('data-podium-role', 'top1');
  await expect(champion.getByTestId('podium-character')).toHaveAttribute('data-character-id', 'chibi-016-iris');
  await expect(champion.getByTestId('podium-character')).toHaveAttribute('src', '/assets/throne/ngai-chibi-016-iris.png');
  await expect(champion.getByTestId('podium-character')).toHaveJSProperty('naturalWidth', 800);
  const winnerAsset = await champion.getByTestId('podium-character').evaluate((element) => {
    const image = element as HTMLImageElement;
    return {
    naturalRatio: image.naturalWidth / image.naturalHeight,
    objectFit: getComputedStyle(image).objectFit,
    objectPosition: getComputedStyle(image).objectPosition,
    transform: getComputedStyle(image).transform,
    };
  });
  if (!usesE2ePlaceholderAssets()) expect(winnerAsset.naturalRatio).toBeCloseTo(1, 1);
  expect(winnerAsset.objectFit).toBe('contain');
  expect(winnerAsset.objectPosition).toContain('100%');
  expect(winnerAsset.transform).toBe('none');
  await expect(podium.getByTestId('podium-slot-2').getByTestId('podium-character'))
    .toHaveAttribute('src', '/assets/chibi/dang-top2-top3/top2/top2-chibi-020-kairos.png');
  await expect(podium.getByTestId('podium-slot-3').getByTestId('podium-character'))
    .toHaveAttribute('src', '/assets/chibi/dang-top2-top3/top3/top3-chibi-013-hayato.png');
  await expect(podium.getByTestId('podium-character-missing')).toHaveCount(0);

  await podium.evaluate((root) => {
    for (const element of root.querySelectorAll<HTMLElement>('.v3v-figure, .v3v-nameplate'))
      for (const animation of element.getAnimations()) if (animation.playState === 'running') animation.finish();
  });

  const podiumGeometry = await podium.evaluate((root) => [...root.querySelectorAll<HTMLElement>('.v3v-slot')].map((slot) => {
    const figure = slot.querySelector<HTMLElement>('.v3v-figure')!.getBoundingClientRect();
    const nameplate = slot.querySelector<HTMLElement>('.v3v-nameplate')!.getBoundingClientRect();
    const crown = slot.querySelector<HTMLElement>('[data-testid="podium-crown"]')!.getBoundingClientRect();
    const crownStyle = getComputedStyle(slot.querySelector<HTMLElement>('[data-testid="podium-crown"]')!);
    const image = slot.querySelector<HTMLImageElement>('[data-testid="podium-character"]')!.getBoundingClientRect();
    const name = slot.querySelector<HTMLElement>('.v3v-player-name')!.getBoundingClientRect();
    const score = slot.querySelector<HTMLElement>('.v3v-names i')!.getBoundingClientRect();
    const tieLabelElement = slot.querySelector<HTMLElement>('.tie-label');
    let tieLabel: { top: number; bottom: number } | null = null;
    if (tieLabelElement) {
      const range = document.createRange();
      range.selectNodeContents(tieLabelElement);
      const text = range.getBoundingClientRect();
      tieLabel = { top: text.top, bottom: text.bottom };
    }
    const badgeElement = slot.querySelector<HTMLElement>('.v3-top1-badge');
    const badge = badgeElement?.getBoundingClientRect() ?? null;
    const horizontalBadgeScoreGap = badge ? Math.max(0, score.left - badge.right, badge.left - score.right) : null;
    const verticalBadgeScoreGap = badge ? Math.max(0, score.top - badge.bottom, badge.top - score.bottom) : null;
    return {
      place: slot.getAttribute('data-place'),
      feetGap: Math.round((nameplate.top - figure.bottom) * 10) / 10,
      figure: { top: figure.top, bottom: figure.bottom },
      nameplate: { top: nameplate.top, bottom: nameplate.bottom },
      crown: { left: crown.left, top: crown.top, right: crown.right, bottom: crown.bottom },
      crownVisible: crownStyle.visibility === 'visible' && Number.parseFloat(crownStyle.opacity) > 0,
      crownZIndex: Number.parseInt(crownStyle.zIndex, 10),
      image: { width: image.width, height: image.height },
      nameFont: Number.parseFloat(getComputedStyle(slot.querySelector<HTMLElement>('.v3v-player-name')!).fontSize),
      scoreFont: Number.parseFloat(getComputedStyle(slot.querySelector<HTMLElement>('.v3v-names i')!).fontSize),
      nameInside: name.left >= nameplate.left && name.right <= nameplate.right && name.top >= nameplate.top && name.bottom <= nameplate.bottom,
      scoreInside: score.left >= nameplate.left && score.right <= nameplate.right && score.top >= nameplate.top && score.bottom <= nameplate.bottom,
      tieLabelBottomClearance: tieLabel ? nameplate.bottom - 4 - tieLabel.bottom : null,
      badgeTopInset: badge ? badge.top - nameplate.top : null,
      badgeRightInset: badge ? nameplate.right - badge.right : null,
      badgeScoreGap: badge ? Math.hypot(horizontalBadgeScoreGap!, verticalBadgeScoreGap!) : null,
      plateInsideViewport: nameplate.left >= 24 && nameplate.right <= 1056,
      crownInsideViewport: crown.left >= 24 && crown.right <= 1056 && crown.top >= 0 && crown.bottom <= 1920,
    };
  }));
  expect(podiumGeometry).toHaveLength(3);
  for (const slot of podiumGeometry) {
    expect(slot.feetGap, `top${slot.place} figure/nameplate gap`).toBeGreaterThanOrEqual(8);
    expect(slot.nameFont, `top${slot.place} name font`).toBeGreaterThanOrEqual(28);
    expect(slot.scoreFont, `top${slot.place} score font`).toBeGreaterThanOrEqual(32);
    expect(slot.nameInside, `top${slot.place} name stays inside plate`).toBe(true);
    expect(slot.scoreInside, `top${slot.place} score stays inside plate`).toBe(true);
    if (slot.tieLabelBottomClearance !== null)
      expect(slot.tieLabelBottomClearance, `top${slot.place} tie label clears inner gold border by 8 px`).toBeGreaterThanOrEqual(8);
    if (slot.badgeScoreGap !== null) {
      expect(slot.badgeTopInset, `top${slot.place} streak badge moves to upper right`).toBeGreaterThanOrEqual(8);
      expect(slot.badgeRightInset, `top${slot.place} streak badge stays inside right border`).toBeGreaterThanOrEqual(8);
      expect(slot.badgeScoreGap, `top${slot.place} streak badge clears PTS by 8 px`).toBeGreaterThanOrEqual(8);
    }
    expect(slot.plateInsideViewport, `top${slot.place} plate stays within safe margins`).toBe(true);
    expect(slot.crownInsideViewport, `top${slot.place} crown stays visible`).toBe(true);
    expect(slot.crownVisible, `top${slot.place} crown has visible paint`).toBe(true);
    expect(slot.crownZIndex, `top${slot.place} crown stays above its plate`).toBeGreaterThanOrEqual(5);
  }
  const winner = podiumGeometry.find((slot) => slot.place === '1')!;
  const runnersUp = podiumGeometry.filter((slot) => slot.place !== '1');
  expect(winner.image.height).toBeGreaterThan(Math.max(...runnersUp.map((slot) => slot.image.height)) * 1.15);
  expect(await podium.evaluate((root) => Number.parseInt(getComputedStyle(root).zIndex, 10))).toBeGreaterThan(0);
  await capture(page, 'throne-tie-victory');

  await page.goto('/?mock=victory', { waitUntil: 'domcontentloaded' });
  const normalVictory = page.getByTestId('victory-stage');
  const normalChampion = normalVictory.getByTestId('podium-slot-1');
  await expect(normalVictory).toHaveAttribute('data-scene', 'VICTORY');
  await expect(normalChampion.getByTestId('top1-badge')).toHaveText('x3');
  await normalVictory.evaluate((root) => {
    for (const element of root.querySelectorAll<HTMLElement>('.v3v-figure, .v3v-nameplate'))
      for (const animation of element.getAnimations()) if (animation.playState === 'running') animation.finish();
  });
  const normalBadgeGeometry = await normalChampion.evaluate((slot) => {
    const plate = slot.querySelector<HTMLElement>('.v3v-nameplate')!.getBoundingClientRect();
    const badge = slot.querySelector<HTMLElement>('.v3-top1-badge')!.getBoundingClientRect();
    const score = slot.querySelector<HTMLElement>('.v3v-names i')!;
    const range = document.createRange();
    range.selectNodeContents(score);
    const pts = range.getBoundingClientRect();
    const horizontalGap = Math.max(0, pts.left - badge.right, badge.left - pts.right);
    const verticalGap = Math.max(0, pts.top - badge.bottom, badge.top - pts.bottom);
    return {
      topInset: badge.top - plate.top,
      rightInset: plate.right - badge.right,
      scoreGap: Math.hypot(horizontalGap, verticalGap),
    };
  });
  expect(normalBadgeGeometry.topInset).toBeGreaterThanOrEqual(8);
  expect(normalBadgeGeometry.rightInset).toBeGreaterThanOrEqual(8);
  expect(normalBadgeGeometry.scoreGap).toBeGreaterThanOrEqual(8);
  await capture(page, 'victory');
});
