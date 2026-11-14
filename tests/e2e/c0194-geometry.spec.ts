import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

const option = (process.env.C0194_OPTION ?? 'A').toLowerCase();
const reviewDir = join(process.cwd(), '.claude', 'review', 'C0205');

test(`C-0194 option ${option.toUpperCase()} — geometry and review captures`, async ({ page }) => {
  await mkdir(reviewDir, { recursive: true });
  await page.goto('/?mock=question&hud=1', { waitUntil: 'domcontentloaded' });
  const stage = page.getByTestId('stage');
  await expect(stage).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const result = await stage.evaluate((root) => {
    const selectors = {
      title: '.v3-title', logo: '[data-testid="brand-logo"]', ribbon: '.v3-title-ribbon',
      event: '.v3-event-mark', round: '.v3-round-card', top10: '.v3-top10',
      board: '.v3-board', question: '.v3-question', timer: '.v3-timer',
      host: '[data-testid="tiktok-live-info"]', viewers: '[data-testid="tiktok-viewers"]',
      chips: '[data-testid="tiktok-live-chips"]', banner: '[data-testid="tiktok-event-banner"]',
    };
    const box = (selector: string) => {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, box(selector)]));
  });
  console.log('C0194 geometry:', JSON.stringify(result));
  const roundCard = stage.getByTestId('round-card');
  expect(await roundCard.locator('.v3-round-title').evaluate((element) => getComputedStyle(element).fontSize)).toBe(option === 'b' ? '24px' : '36px');
  expect(await roundCard.getByTestId('participant-count').evaluate((element) => getComputedStyle(element).fontSize)).toBe(option === 'b' ? '34px' : '52px');
  expect(await roundCard.locator('.v3-round-label').evaluate((element) => getComputedStyle(element).fontSize)).toBe(option === 'b' ? '18px' : '24px');
  const roundLines = await Promise.all([
    roundCard.locator('.v3-round-title'),
    roundCard.getByTestId('participant-count'),
    roundCard.locator('.v3-round-label'),
  ].map((line) => line.boundingBox().then((rect) => {
    expect(rect).not.toBeNull();
    return { top: rect!.y, bottom: rect!.y + rect!.height };
  })));
  console.log('C0194 round row bounds:', JSON.stringify(roundLines));
  expect(roundLines[0]!.bottom, 'round title and participant count do not intersect').toBeLessThanOrEqual(roundLines[1]!.top);
  expect(roundLines[1]!.bottom, 'participant count and status label do not intersect').toBeLessThanOrEqual(roundLines[2]!.top);
  const roundBounds = await roundCard.boundingBox();
  expect(roundBounds).not.toBeNull();
  expect(roundBounds!.y).toBeGreaterThanOrEqual(15);
  expect(roundBounds!.y + roundBounds!.height).toBeLessThanOrEqual(124);
  const expected = {
    logo: { x: 453.6, y: 18, width: 172.8, height: 178.5 },
    ribbon: { x: 430.4, y: 212.5, width: 325.2, height: 53 },
    event: { x: 96.4, y: 14, width: 213.3, height: 94 },
    round: { x: 760, y: 16, width: 220, height: 108 },
    top10: { x: 98, y: 620, width: 300, height: 466 },
    board: { x: 418, y: 620, width: 560, height: 512 },
    question: { x: 448, y: 796, width: 500, height: 160 },
  } as const;
  for (const [element, dimensions] of Object.entries(expected)) {
    const actual = result[element as keyof typeof result] as { x: number; y: number; width: number; height: number } | null;
    expect(actual, `${element} is measurable`).not.toBeNull();
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(actual![dimension] - dimensions[dimension]), `${element}.${dimension} stays within 1px of the reviewed geometry`).toBeLessThanOrEqual(1);
    }
  }
  const pillMetrics = await stage.locator('.v3-title-ribbon').evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { box: { x: box.x, y: box.y, width: box.width, height: box.height }, text: { x: text.x, y: text.y, width: text.width, height: text.height }, fontSize: style.fontSize, lineHeight: style.lineHeight, padding: style.padding, transform: style.transform };
  });
  console.log('C0194 pill metrics:', JSON.stringify(pillMetrics));

  await stage.screenshot({ path: join(reviewDir, `option-${option}-question.png`) });
  await stage.evaluate((root) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 1080 1920');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '99999', pointerEvents: 'none' });
    const make = (tag: string, attrs: Record<string, string>) => {
      const shape = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) shape.setAttribute(key, value);
      svg.append(shape);
    };
    make('rect', { x: '96', y: '320', width: '888', height: '1454', fill: 'rgba(48,255,164,.035)', stroke: '#3dffad', 'stroke-width': '4', 'stroke-dasharray': '18 12' });
    make('rect', { x: '0', y: '0', width: '96', height: '1920', fill: 'rgba(255,70,95,.16)' });
    make('rect', { x: '984', y: '0', width: '96', height: '1920', fill: 'rgba(255,70,95,.16)' });
    make('rect', { x: '96', y: '1774', width: '888', height: '146', fill: 'rgba(255,70,95,.16)' });
    make('line', { x1: '0', y1: '269', x2: '284', y2: '269', stroke: '#3dffad', 'stroke-width': '3', 'stroke-dasharray': '14 10' });
    make('line', { x1: '796', y1: '269', x2: '1080', y2: '269', stroke: '#3dffad', 'stroke-width': '3', 'stroke-dasharray': '14 10' });
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', '116'); label.setAttribute('y', '1850'); label.setAttribute('fill', '#3dffad');
    label.setAttribute('font-size', '20'); label.setAttribute('font-family', 'Arial, sans-serif'); label.setAttribute('font-weight', '700');
    label.textContent = 'LIVE PREVIEW SAFE ZONE · HEADER EXCEPTIONS · 9% SIDES / 7.5% BOTTOM';
    svg.append(label);
    root.append(svg);
  });
  await stage.screenshot({ path: join(reviewDir, `option-${option}-safe-zone.png`) });

  await page.goto('/?mock=top10&hud=1', { waitUntil: 'domcontentloaded' });
  const top10 = page.getByTestId('stage');
  await expect(top10).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await top10.screenshot({ path: join(reviewDir, `option-${option}-top10.png`) });
});
