import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const reviewDirectory = resolve(process.cwd(), '.claude', 'review', 'C0306', 'prompt-and-copy');
const c0311ReviewDirectory = resolve(process.cwd(), '.claude', 'review', 'C0311');

type Rect = { left: number; top: number; right: number; bottom: number };

async function screenshotMcZoom(page: import('@playwright/test').Page, path: string) {
  const clip = await page.evaluate(() => {
    const boxes = ['.v3-mc-figure', '.v3-mc-plate', '.v3-bubble']
      .map((selector) => document.querySelector<HTMLElement>(selector)?.getBoundingClientRect())
      .filter((box): box is DOMRect => !!box);
    const left = Math.max(0, Math.floor(Math.min(...boxes.map((box) => box.left)) - 24));
    const top = Math.max(0, Math.floor(Math.min(...boxes.map((box) => box.top)) - 24));
    const right = Math.min(window.innerWidth, Math.ceil(Math.max(...boxes.map((box) => box.right)) + 24));
    const bottom = Math.min(window.innerHeight, Math.ceil(Math.max(...boxes.map((box) => box.bottom)) + 24));
    return { x: left, y: top, width: right - left, height: bottom - top };
  });
  await page.screenshot({ path, clip, animations: 'disabled' });
}

test('C-0306 — the explicit ellipsis stays inside the question frame and warning is preview-only', async ({ page }) => {
  mkdirSync(reviewDirectory, { recursive: true });
  for (const role of ['preview', 'program'] as const) {
    await page.goto(`/?mock=question-longest&role=${role}`, { waitUntil: 'domcontentloaded' });
    const prompt = page.getByTestId('question-prompt');
    const copy = page.getByTestId('question-prompt-copy');
    await expect(prompt).toHaveAttribute('data-prompt-truncated', 'true');
    await expect(copy).toContainText(/…$/);

    const geometry = await prompt.evaluate((frame) => {
      const copy = frame.querySelector<HTMLElement>('[data-testid="question-prompt-copy"]')!;
      const value = copy.textContent ?? '';
      const text = copy.firstChild!;
      const range = document.createRange();
      range.selectNodeContents(copy);
      const lines = [...range.getClientRects()];
      const ellipsis = document.createRange();
      const ellipsisOffset = value.lastIndexOf('…');
      ellipsis.setStart(text, ellipsisOffset);
      ellipsis.setEnd(text, ellipsisOffset + 1);
      const ellipsisRect = ellipsis.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      return {
        lineTops: [...new Set(lines.map((line) => Math.round(line.top * 10) / 10))],
        ellipsis: { top: ellipsisRect.top, right: ellipsisRect.right, bottom: ellipsisRect.bottom, left: ellipsisRect.left },
        frame: { top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom, left: frameRect.left },
      };
    });
    expect(geometry.lineTops.length).toBeLessThanOrEqual(3);
    expect(geometry.ellipsis.right).toBeLessThanOrEqual(geometry.frame.right - 4);
    expect(geometry.ellipsis.bottom).toBeLessThanOrEqual(geometry.frame.bottom - 4);

    if (role === 'program') await expect(page.getByTestId('prompt-truncation-warning')).toHaveCount(0);
    else await expect(page.getByTestId('prompt-truncation-warning')).toBeVisible();
    await page.screenshot({ path: join(reviewDirectory, `question-longest-${role}.png`), animations: 'disabled' });
  }
});

test('C-0311 — intermission puts Kelly on the empty floor without covering the card, timer or header', async ({ page }) => {
  mkdirSync(c0311ReviewDirectory, { recursive: true });
  await page.goto('/?mock=intermission&role=program', { waitUntil: 'domcontentloaded' });
  const bubble = page.getByTestId('mc-bubble');
  await expect(bubble).toContainText('Chặng tiếp theo sắp bắt đầu');
  await expect(bubble).not.toContainText(/comment A, B, C hoặc D/i);
  await expect(page.getByTestId('timer')).toBeVisible();

  const geometry = await page.evaluate(() => {
    const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const read = (element: Element | null, label: string): Rect => {
      if (!element) throw new Error(`Missing ${label}`);
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    };
    const intermission = document.querySelector<HTMLElement>('.v3-intermission');
    if (!intermission) throw new Error('Missing intermission panel');
    const panelBox = intermission.getBoundingClientRect();
    const panelStyle = getComputedStyle(intermission, '::before');
    const panelWidth = Number.parseFloat(panelStyle.width);
    const panelHeight = Number.parseFloat(panelStyle.height);
    const panelTop = panelBox.top + Number.parseFloat(panelStyle.top);
    const panelLeft = panelBox.left + panelBox.width / 2 - panelWidth / 2;
    const parts = [
      ['figure', '.v3-mc-figure'],
      ['name plate', '.v3-mc-plate'],
      ['bubble', '.v3-mc .v3-bubble'],
    ] as const;
    const blockers = [
      ['visible intermission card', { left: panelLeft, top: panelTop, right: panelLeft + panelWidth, bottom: panelTop + panelHeight }],
      ['timer', read(document.querySelector('.v3-aux-timer'), 'timer')],
      ['header', read(document.querySelector('.v3-header'), 'header')],
    ] as const;
    const intersections = parts.flatMap(([part, selector]) => {
      const partBox = read(document.querySelector(selector), part);
      return blockers.filter(([, blockerBox]) => overlaps(partBox, blockerBox)).map(([blocker]) => `${part} ↔ ${blocker}`);
    });
    const text = document.querySelector<HTMLElement>('.v3-mc .v3-bubble p');
    const bubbleBox = read(document.querySelector('.v3-mc .v3-bubble'), 'bubble');
    return {
      intersections,
      bubbleBottomGap: window.innerHeight - bubbleBox.bottom,
      bubbleFontSize: Number.parseFloat(text ? getComputedStyle(text).fontSize : '0'),
      parts: Object.fromEntries(parts.map(([part, selector]) => [part, read(document.querySelector(selector), part)])),
    };
  });
  expect(geometry.intersections, JSON.stringify(geometry)).toEqual([]);
  expect(geometry.bubbleBottomGap).toBeGreaterThanOrEqual(24);
  expect(geometry.bubbleFontSize).toBeGreaterThanOrEqual(28);

  await page.screenshot({ path: join(c0311ReviewDirectory, 'intermission-1080x1920-full.png'), animations: 'disabled' });
  await screenshotMcZoom(page, join(c0311ReviewDirectory, 'intermission-mc-zoom.png'));
  console.info(`[C-0311 intermission bbox] ${JSON.stringify(geometry)}`);
});

test('C-0311 — round winner shows three podium winners and keeps Kelly clear with voice-only cue', async ({ page }) => {
  mkdirSync(c0311ReviewDirectory, { recursive: true });
  await page.goto('/?mock=round-winner&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid^="podium-slot-"]')).toHaveCount(3);
  await expect(page.locator('.v3-mc--voice-only')).toBeVisible();
  await expect(page.locator('.v3-bubble')).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const read = (element: Element, label: string): Rect => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    };
    const mcParts = ['.v3-mc-figure', '.v3-mc-plate'].map((selector) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing MC part ${selector}`);
      return [selector, read(element, selector)] as const;
    });
    const winnerParts = [...document.querySelectorAll('.v3v-slot')].flatMap((slot, index) => {
      const selectors = ['.v3v-figure', '.v3v-nameplate', '.v3v-player-name', '.v3v-nameplate i'];
      return selectors.map((selector) => {
        const elements = [...slot.querySelectorAll(selector)];
        if (!elements.length) throw new Error(`Winner ${index + 1} missing ${selector}`);
        return elements.map((element, elementIndex) => [`winner ${index + 1} ${selector} ${elementIndex + 1}`, read(element, selector)] as const);
      });
    }).flat();
    // Safe visual regions of the fixed 1080×1920 trophy-stage background (not the full-screen img box).
    const fixedArtRegions: Array<[string, Rect]> = [
      ['trophy', { left: 237.6, top: 441.6, right: 842.4, bottom: 1267.2 }],
      ['podium floor', { left: 70, top: 1160, right: 1010, bottom: 1400 }],
    ];
    const obstacles = [...winnerParts, ...fixedArtRegions];
    const intersections = mcParts.flatMap(([part, box]) => obstacles.filter(([, obstacle]) => overlaps(box, obstacle)).map(([label]) => `${part} ↔ ${label}`));
    return {
      intersections,
      mc: Object.fromEntries(mcParts),
      winners: [...document.querySelectorAll('.v3v-slot')].map((slot) => read(slot, 'winner slot')),
      fixedArtRegions: Object.fromEntries(fixedArtRegions),
    };
  });
  expect(geometry.intersections, JSON.stringify(geometry)).toEqual([]);

  await page.screenshot({ path: join(c0311ReviewDirectory, 'round-winner-1080x1920-full.png'), animations: 'disabled' });
  await screenshotMcZoom(page, join(c0311ReviewDirectory, 'round-winner-mc-zoom.png'));
  console.info(`[C-0311 round-winner bbox] ${JSON.stringify(geometry)}`);
});

test('C-0312 — round-winner keeps MC clear with long names and a tied podium', async ({ page }) => {
  for (const mock of ['round-winner-long-name', 'round-winner-tie']) {
    await page.goto(`/?mock=${mock}&role=program`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid^="podium-slot-"]')).toHaveCount(3);
    await expect(page.locator('.v3-bubble')).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const mcParts = [...document.querySelectorAll<HTMLElement>('.v3-mc-figure, .v3-mc-plate')].map((element) => element.getBoundingClientRect());
      const podiumParts = [...document.querySelectorAll<HTMLElement>('.v3v-slot, .v3v-slot *')].map((element) => element.getBoundingClientRect());
      return {
        intersections: mcParts.flatMap((mc, index) => podiumParts.flatMap((podium, otherIndex) => overlaps(mc, podium) ? [`MC ${index + 1} ↔ podium ${otherIndex + 1}`] : [])),
        mcParts: mcParts.map(({ left, top, right, bottom }) => ({ left, top, right, bottom })),
        podiumParts: podiumParts.map(({ left, top, right, bottom }) => ({ left, top, right, bottom })),
      };
    });
    expect(geometry.intersections, `${mock}: ${JSON.stringify(geometry)}`).toEqual([]);
  }
});

test('C-0311 — Kelly stays clear of the TikTok comment rail and input bar on intermission and round winner', async ({ page }) => {
  for (const mock of ['intermission', 'round-winner', 'round-winner-long-name']) {
    await page.goto(`/?mock=${mock}&hud=1&role=program`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.v3-mc-figure')).toBeVisible();
    await expect(page.getByTestId('tiktok-comments')).toBeVisible();
    const geometry = await page.evaluate(() => {
      const box = (element: Element) => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
      const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const mcParts = [...document.querySelectorAll('.v3-mc-figure, .v3-mc-plate, .v3-mc .v3-bubble')].map((element) => [element.className, box(element)] as const);
      const tiktok = [['comment rail', '[data-testid="tiktok-comments"]'], ['comment input', '[data-testid="tiktok-comment-bar"]']]
        .map(([label, selector]) => { const element = document.querySelector(selector); if (!element) throw new Error(`Missing ${label}`); return [label, box(element)] as const; });
      return {
        intersections: mcParts.flatMap(([part, partBox]) => tiktok.filter(([, other]) => overlaps(partBox, other)).map(([label]) => `${part} ↔ ${label}`)),
        mcParts, tiktok,
      };
    });
    expect(geometry.intersections, `${mock}: ${JSON.stringify(geometry)}`).toEqual([]);
  }
});
