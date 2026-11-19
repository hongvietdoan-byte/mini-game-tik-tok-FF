import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { DEMO_QUESTIONS } from '../../fixtures/questions';
import { wrapPromptToLines } from '../../apps/overlay/src/v3/arenaLogic';

type Box = { x: number; y: number; width: number; height: number };

function intersects(a: Box, b: Box) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test('C-0319 — hud=tall maps the live iPhone HUD while hud=1 stays unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/?mock=question&hud=tall&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('tiktok-hud')).toBeVisible();

  const tall = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('[data-testid="stage"]')!;
    const stageBox = stage.getBoundingClientRect();
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left - stageBox.left),
        y: Math.round(rect.top - stageBox.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    return {
      host: box('[data-testid="tiktok-live-info"]'),
      viewers: box('[data-testid="tiktok-viewers"]'),
      topPill: box('[data-testid="tiktok-live-chips"]'),
      roomPill: box('[data-testid="tiktok-event-banner"]'),
      comments: box('[data-testid="tiktok-comments"]'),
      join: box('[data-testid="tiktok-join-banner"]'),
      hidden: ['[data-testid="tiktok-status-bar"]', '[data-testid="tiktok-comment-bar"]', '[data-testid="tiktok-gift-toast"]']
        .every((selector) => getComputedStyle(document.querySelector<HTMLElement>(selector)!).display === 'none'),
    };
  });

  expect(tall.host).toEqual({ x: 29, y: -61, width: 522, height: 88 });
  expect(tall.viewers).toEqual({ x: 774, y: -49, width: 281, height: 64 });
  expect(tall.topPill).toEqual({ x: 29, y: 45, width: 311, height: 52 });
  expect(tall.roomPill).toEqual({ x: 815, y: 42, width: 235, height: 61 });
  expect(tall.comments).toEqual({ x: 29, y: 1407, width: 628, height: 399 });
  expect(tall.join).toEqual({ x: 29, y: 1851, width: 491, height: 52 });
  expect(tall.hidden).toBe(true);

  await page.goto('/?mock=question&hud=1&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('tiktok-status-bar')).toBeVisible();
  const legacyHost = await page.getByTestId('tiktok-live-info').boundingBox();
  expect(legacyHost?.y).toBe(124);
});

test('C-0319 — Rule 11 reports the tall HUD masks without covering the quiz frames', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/?mock=question&hud=tall&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="stage"][data-scene="QUESTION"]')).toBeVisible();
  await expect(page.getByTestId('tiktok-hud')).toBeVisible();

  const report = await page.evaluate(() => {
    const intersects = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const box = (element: Element): Box => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    };
    const logo = document.querySelector<HTMLElement>('[data-testid="brand-logo-frame"]')!;
    const pill = document.querySelector<HTMLElement>('[data-testid="tiktok-live-chips"]')!;
    const comments = document.querySelector<HTMLElement>('[data-testid="tiktok-comments"]')!;
    const messages = Array.from(comments.querySelectorAll<HTMLElement>('p:not(.tiktok-hud-join)'));
    const seats = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="audience-seat"]'));
    const rows = new Map<number, HTMLElement[]>();
    for (const seat of seats) {
      const row = Number(seat.dataset.rowIndex);
      rows.set(row, [...(rows.get(row) ?? []), seat]);
    }
    const seatColumns = new Map<HTMLElement, number>();
    for (const rowSeats of rows.values()) rowSeats.sort((a, b) => box(a).x - box(b).x).forEach((seat, index) => seatColumns.set(seat, index + 1));
    const coveredSeats = seats.flatMap((seat) => {
      const target = seat.querySelector<HTMLElement>('.v3-seat-back') ?? seat;
      if (!messages.some((message) => intersects(box(target), box(message)))) return [];
      const rect = box(target);
      return [{ row: Number(seat.dataset.rowIndex), column: seatColumns.get(seat), x: Math.round(rect.x), y: Math.round(rect.y) }];
    });
    const frames = ['.v3-board', '.v3-top10', '.v3-timer', '.v3-mc-figure', '.v3-mc-plate']
      .map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        return { selector, covered: !!element && intersects(box(element), box(comments)) };
      });
    return {
      logoPillOverlap: intersects(box(logo), box(pill)),
      coveredSeats,
      messageBounds: messages.map((message) => box(message)),
      headerBoxes: ['.v3-title', '.v3-title-main', '.v3-title-ribbon'].flatMap((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        return element ? [{ selector, overlapsTopPill: intersects(box(element), box(pill)), box: box(element) }] : [];
      }),
      frames,
      logo: box(logo), topPill: box(pill), comments: box(comments),
    };
  });

  console.info(`C-0319 Rule 11 tall HUD report (expected top logo + bottom-left seats): ${JSON.stringify(report)}`);
  const reviewDirectory = resolve(process.cwd(), '.claude', 'review', 'C0319');
  mkdirSync(reviewDirectory, { recursive: true });
  await page.screenshot({ path: resolve(reviewDirectory, 'hud-tall-question.png'), animations: 'disabled' });
  expect(report.frames.filter(({ covered }) => covered), 'comments must not cover a question, score, timer, or MC frame').toEqual([]);
  expect(report.coveredSeats.length, 'the lower-left comment rail covers only the bottom seat rows').toBeGreaterThan(0);
  expect(report.messageBounds).toHaveLength(7);
});

for (const mock of ['question-longest', 'reading-longest']) {
  test(`C-0319 — ${mock} leaves at least 16px below the last prompt line`, async ({ page }) => {
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.goto(`/?mock=${mock}&hud=tall&role=program`, { waitUntil: 'domcontentloaded' });
    const prompt = page.getByTestId('question-prompt');
    const copy = page.getByTestId('question-prompt-copy');
    await expect(prompt).toBeVisible();
    await expect(copy).toBeVisible();
    await page.waitForFunction(() => {
      const element = document.querySelector<HTMLElement>('[data-testid="question-prompt"]');
      return element?.style.fontSize !== '';
    });
    const metrics = await page.evaluate(() => {
      const promptElement = document.querySelector<HTMLElement>('[data-testid="question-prompt"]')!;
      const copyElement = document.querySelector<HTMLElement>('[data-testid="question-prompt-copy"]')!;
      const range = document.createRange();
      range.selectNodeContents(copyElement);
      const lines = Array.from(range.getClientRects()).filter(({ width }) => width > 1).map(({ top, bottom, left, right }) => ({ top, bottom, left, right }));
      const textNode = copyElement.firstChild;
      const visualLines = new Map<number, string>();
      if (textNode?.nodeType === Node.TEXT_NODE) for (let index = 0; index < textNode.textContent!.length; index += 1) {
        const character = document.createRange();
        character.setStart(textNode, index);
        character.setEnd(textNode, index + 1);
        const rect = character.getBoundingClientRect();
        if (rect.width <= 0) continue;
        const top = Math.round(rect.top * 10) / 10;
        visualLines.set(top, `${visualLines.get(top) ?? ''}${textNode.textContent![index]}`);
      }
      const promptRect = promptElement.getBoundingClientRect();
      const style = getComputedStyle(promptElement);
      return {
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        lineCount: lines.length,
        visualLines: Array.from(visualLines.values()),
        lastLineGap: promptRect.bottom - Math.max(...lines.map(({ bottom }) => bottom)),
        truncated: promptElement.dataset.promptTruncated,
        lines,
      };
    });
    console.info(`C-0319 ${mock} prompt fit: ${JSON.stringify(metrics)}`);
    expect(metrics.lineCount).toBeGreaterThan(0);
    expect(metrics.lineCount, `${mock}: question uses no more than four lines`).toBeLessThanOrEqual(4);
    expect(Number.parseFloat(metrics.fontSize), `${mock}: question text never shrinks below 24px`).toBeGreaterThanOrEqual(24);
    if (metrics.truncated === 'true') {
      expect(metrics.visualLines.at(-1)?.trim(), `${mock}: truncated copy ends with an ellipsis`).toMatch(/…$/);
      expect(metrics.visualLines.every((line) => line.trim() !== '…'), `${mock}: ellipsis must stay attached to real text`).toBe(true);
      await expect(copy).toContainText(/…$/);
    } else {
      expect(metrics.visualLines.at(-1)?.trim(), `${mock}: full prompt ends with the live reference`).toMatch(/Battle Royale\?$/);
      await expect(copy).toContainText(/Battle Royale\?/i);
    }
    expect(metrics.lastLineGap, `${mock}: last text line needs a 16px bottom inset`).toBeGreaterThanOrEqual(16);
  });
}

const demo006 = DEMO_QUESTIONS.find(({ id }) => id === 'demo-006')!;
for (const mock of ['reading-demo-006', 'question-demo-006']) {
  test(`C-0328 — demo-006 fits in 24px in ${mock.startsWith('reading') ? 'READING' : 'ACCEPTING'}`, async ({ page }) => {
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.goto(`/?mock=${mock}&hud=tall&role=program`, { waitUntil: 'domcontentloaded' });
    const prompt = page.getByTestId('question-prompt');
    const copy = page.getByTestId('question-prompt-copy');
    await expect(prompt).toBeVisible();
    await expect(copy).toBeVisible();
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-testid="question-prompt"]')?.style.fontSize !== '');
    const metrics = await page.evaluate(() => {
      const promptElement = document.querySelector<HTMLElement>('[data-testid="question-prompt"]')!;
      const copyElement = document.querySelector<HTMLElement>('[data-testid="question-prompt-copy"]')!;
      const range = document.createRange();
      range.selectNodeContents(copyElement);
      const lines = Array.from(range.getClientRects()).filter(({ width }) => width > 1);
      const promptRect = promptElement.getBoundingClientRect();
      const style = getComputedStyle(promptElement);
      return {
        fontSize: Number.parseFloat(style.fontSize),
        lineCount: lines.length,
        lastLineGap: promptRect.bottom - Math.max(...lines.map(({ bottom }) => bottom)),
        truncated: promptElement.dataset.promptTruncated,
      };
    });
    expect([...demo006.prompt]).toHaveLength(136);
    await expect(copy).toHaveText(demo006.prompt);
    expect(metrics.fontSize, `${mock}: preserve the 24px minimum`).toBeGreaterThanOrEqual(24);
    expect(metrics.lineCount, `${mock}: use at most four lines`).toBeLessThanOrEqual(4);
    expect(metrics.truncated, `${mock}: show demo-006 in full`).toBe('false');
    expect(metrics.lastLineGap, `${mock}: keep at least 16px below the last line`).toBeGreaterThanOrEqual(16);
  });
}

test('C-0319 — demo question bank identifies prompts that reach the 24px floor', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/?mock=question-longest&hud=tall&role=program', { waitUntil: 'domcontentloaded' });
  const prompts = DEMO_QUESTIONS.filter(({ prompt }) => prompt.length > 160).map(({ id, prompt }) => ({ id, prompt }));
  const candidates = new Set<string>();
  for (const { prompt } of prompts) {
    const words = prompt.trim().split(/\s+/u);
    for (let start = 0; start < words.length; start += 1) {
      for (let end = start + 1; end <= words.length; end += 1) candidates.add(words.slice(start, end).join(' '));
    }
  }
  const measurements = await page.evaluate(({ candidateTexts }) => {
    const element = document.querySelector<HTMLElement>('[data-testid="question-prompt"]')!;
    const originalClass = element.className;
    const originalFontSize = element.style.fontSize;
    element.classList.remove('is-prompt-truncated');
    element.style.fontSize = '';
    const style = getComputedStyle(element);
    const baseSize = Number.parseFloat(style.fontSize) || 30;
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = style.font.replace(/(?:\d*\.)?\d+px/u, '24px');
    const width = element.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
    const contentHeight = element.clientHeight - (Number.parseFloat(style.paddingTop) || 0) - (Number.parseFloat(style.paddingBottom) || 0);
    const lineHeight = (Number.parseFloat(style.lineHeight) || baseSize * 1.16) * 24 / baseSize;
    const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
    const widths = Object.fromEntries(candidateTexts.map((text) => [
      text,
      context.measureText(text).width + Math.max(0, Array.from(text).length - 1) * letterSpacing,
    ]));
    element.className = originalClass;
    element.style.fontSize = originalFontSize;
    return { width, maxLines: Math.max(1, Math.min(4, Math.floor((contentHeight - 16) / lineHeight))), widths };
  }, { candidateTexts: Array.from(candidates) });
  const measured = prompts.map(({ id, prompt }) => {
    const layout = wrapPromptToLines(prompt, measurements.width, measurements.maxLines, (text) => measurements.widths[text] ?? Infinity);
    return { id, sourceCharacters: [...prompt].length, visibleLines: layout.lineCount, truncated: layout.truncated, text: layout.text };
  });
  console.info(`C-0319 demo bank prompts at 24px: ${JSON.stringify(measured)}`);
  expect(measured.map(({ id }) => id)).toEqual(['demo-001', 'demo-023']);
  expect(measured.map(({ visibleLines }) => visibleLines)).toEqual([3, 3]);
  expect(measured.every(({ truncated }) => truncated)).toBe(true);
});
