import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mcFor, type EngineState } from '@quiz/quiz-core';
import type { GameState } from '@quiz/contracts';
import { expect, test } from '@playwright/test';
import { makeMockSnapshot, MOCK_SCENES } from '../../apps/overlay/src/mock/snapshots';
import { wrapMcBubbleText } from '../../apps/overlay/src/v3/arenaLogic';

const reviewDirectory = join(process.cwd(), '.claude', 'review', 'C0224');
const ENGINE_STATES: readonly GameState[] = [
  'CONNECTION_INTERRUPTED', 'ERROR', 'PAUSED', 'IDLE', 'LOBBY', 'PREPARE', 'READING',
  'ACCEPTING', 'REVEAL', 'LEADERBOARD', 'ROUND_END', 'VICTORY', 'INTERMISSION',
];

type BubbleLayout = 'lobby' | 'question' | 'top10';
type Dialogue = { label: string; text: string; layout: BubbleLayout };

function bubbleLayoutFor(label: string): BubbleLayout {
  if (/lobby|sảnh chờ/iu.test(label)) return 'lobby';
  if (/top\s*10|leaderboard|round_end/iu.test(label)) return 'top10';
  return 'question';
}

function allCurrentMcDialogues(): Dialogue[] {
  const unique = new Map<string, string>();
  const add = (label: string, text: string) => {
    const value = text.trim();
    if (value && !unique.has(value)) unique.set(value, label);
  };

  for (const state of ENGINE_STATES) {
    if (state !== 'REVEAL') add(`engine · ${state}`, mcFor({ state } as EngineState, null).bubble);
    else {
      add('engine · REVEAL, chưa có câu trả lời đúng', mcFor({ state } as EngineState, null).bubble);
      for (const optionId of ['A', 'B', 'C', 'D'] as const)
        add(`engine · REVEAL đáp án ${optionId}`, mcFor({ state } as EngineState, { correctOptionId: optionId }).bubble);
    }
  }

  for (const mockName of MOCK_SCENES) {
    const snapshot = makeMockSnapshot(mockName);
    if (snapshot) add(`mock · ${mockName}`, snapshot.mc.bubble);
  }

  add('UI · sảnh chờ', 'CHÀO MỪNG ĐẾN VỚI\nĐẤU TRƯỜNG BÃO TỐ!');
  add('UI · hướng dẫn bình luận', 'Trả lời bằng cách\ncomment A, B, C hoặc D\nđể tham gia ngay!');
  add('UI · Top 10 giữa vòng', 'BXH trực tiếp! Cùng xem ai đang dẫn đầu và bám sát Top 10 nhé.');
  add('test · cụm và đơn vị', 'MC Kelly theo dõi Free Fire · Top 10 · 1,2 giây · A, B, C hoặc D cùng Hồ Anh Tuấn.');

  return [...unique].map(([text, label]) => ({ label, text, layout: bubbleLayoutFor(label) }));
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function sentenceLineCandidates(text: string): string[] {
  const candidates = new Set<string>();
  for (const line of text.split('\n')) {
    const sentences = line.split(/(?<=[.!?])\s+(?=\p{Lu})/u);
    for (let start = 0; start < sentences.length; start++) {
      let candidate = '';
      for (let end = start; end < sentences.length; end++) {
        candidate = candidate ? `${candidate} ${sentences[end]}` : sentences[end]!;
        candidates.add(candidate);
      }
    }
    const words = [...line.matchAll(/\S+/gu)];
    for (let start = 0; start < words.length; start++) {
      for (let end = start + 1; end <= words.length; end++) {
        const first = words[start]!;
        const last = words[end - 1]!;
        const original = line.slice(first.index!, last.index! + last[0].length);
        const parts = words.slice(start, end).map((word) => word[0]);
        candidates.add(original);
        candidates.add(parts.join(' '));
      }
    }
  }
  return [...candidates];
}

async function wrapWithBrowserMetrics(page: import('@playwright/test').Page, paragraph: import('@playwright/test').Locator, text: string, playerNames: string[]) {
  const protectedText = wrapMcBubbleText(text, playerNames);
  const candidates = sentenceLineCandidates(protectedText);
  const measurement = await paragraph.evaluate((element, lines) => {
    const style = getComputedStyle(element);
    const probe = document.createElement('span');
    Object.assign(probe.style, {
      position: 'fixed', left: '-10000px', top: '0', display: 'inline-block', width: 'max-content',
      whiteSpace: 'pre', textWrap: 'nowrap', visibility: 'hidden', font: style.font,
      letterSpacing: style.letterSpacing, wordSpacing: style.wordSpacing, textTransform: style.textTransform,
      fontFeatureSettings: style.fontFeatureSettings, fontVariationSettings: style.fontVariationSettings,
    });
    document.body.append(probe);
    const widths = Object.fromEntries(lines.map((line) => {
      probe.textContent = line;
      return [line, probe.getBoundingClientRect().width];
    }));
    probe.remove();
    return { maxWidth: element.clientWidth, widths };
  }, candidates);
  const result = wrapMcBubbleText(text, playerNames, {
    maxWidth: measurement.maxWidth,
    measureText: (line) => measurement.widths[line] ?? Number.POSITIVE_INFINITY,
  });
  return result;
}

async function renderedLines(paragraph: import('@playwright/test').Locator): Promise<string[]> {
  return paragraph.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const lines = new Map<number, string>();
    const range = document.createRange();
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';
      let offset = 0;
      for (const char of Array.from(text)) {
        const start = offset;
        offset += char.length;
        if (char === '\n') continue;
        range.setStart(node, start);
        range.setEnd(node, offset);
        const rect = range.getBoundingClientRect();
        if (!rect.height) continue;
        const top = Math.round(rect.top * 10) / 10;
        lines.set(top, `${lines.get(top) ?? ''}${char}`);
      }
    }
    return [...lines.values()].map((line) => line.replace(/\u00a0/gu, ' ').trim()).filter(Boolean);
  });
}

async function protectedPhrasesThatFit(paragraph: import('@playwright/test').Locator, phrases: string[]) {
  return paragraph.evaluate((element, values) => {
    const style = getComputedStyle(element);
    const probe = document.createElement('span');
    Object.assign(probe.style, {
      position: 'fixed', left: '-10000px', top: '0', display: 'inline-block', width: 'max-content',
      whiteSpace: 'pre', textWrap: 'nowrap', visibility: 'hidden', font: style.font,
      letterSpacing: style.letterSpacing, wordSpacing: style.wordSpacing, textTransform: style.textTransform,
      fontFeatureSettings: style.fontFeatureSettings, fontVariationSettings: style.fontVariationSettings,
    });
    document.body.append(probe);
    const safeWidth = element.clientWidth * 0.94;
    const fits = Object.fromEntries(values.map((phrase) => {
      probe.textContent = phrase.replace(/\s+/gu, '\u00a0');
      return [phrase, probe.getBoundingClientRect().width <= safeWidth];
    }));
    probe.remove();
    return fits;
  }, phrases);
}

test('C-0224 prefers sentence breaks and captures MC dialogue at real bubble sizes', async ({ page }) => {
  await mkdir(reviewDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const scenes: { mock: string; scene: string; expectedLines?: string[] }[] = [
    { mock: 'lobby', scene: 'LOBBY', expectedLines: ['Vào sảnh nhé!'] },
    { mock: 'prepare', scene: 'QUESTION', expectedLines: ['Sẵn sàng nhé!', 'Câu hỏi', 'Free Fire sắp', 'bắt đầu.'] },
    { mock: 'reading', scene: 'QUESTION' },
    { mock: 'question', scene: 'QUESTION' },
    { mock: 'reveal', scene: 'REVEAL', expectedLines: ['Chính xác!', 'Đáp án B.', 'Cùng xem bảng', 'xếp hạng nhé!'] },
    { mock: 'fastest-a', scene: 'REVEAL' },
    { mock: 'fastest-a-long', scene: 'REVEAL' },
    { mock: 'fastest-b', scene: 'REVEAL' },
    { mock: 'top10', scene: 'INTERIM_TOP10' },
    { mock: 'paused', scene: 'QUESTION' },
  ];
  const captures: { scene: string; bubble: { x: number; y: number; width: number; height: number; fontSize?: string } }[] = [];

  for (const item of scenes) {
    await page.goto(`/?mock=${item.mock}`, { waitUntil: 'domcontentloaded' });
    const stage = page.locator(`[data-testid="stage"][data-scene="${item.scene}"]`);
    await expect(stage).toBeVisible();
    const bubble = stage.locator('[data-testid="mc-bubble"]');
    await expect(bubble).toBeVisible();
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    await bubble.scrollIntoViewIfNeeded();
    const box = await bubble.boundingBox();
    expect(box, `${item.mock}: MC bubble has geometry`).not.toBeNull();
    let fontSize: string | undefined;
    if (item.mock === 'lobby' || item.expectedLines) {
      const paragraph = bubble.locator('p');
      await expect(paragraph).toBeVisible();
      const style = await paragraph.evaluate((element) => getComputedStyle(element).fontSize);
      fontSize = style;
      if (item.mock === 'lobby') expect(Number.parseFloat(style), 'lobby dialogue remains readable in the throne bubble').toBeGreaterThanOrEqual(26);
      if (item.expectedLines) await expect.poll(() => renderedLines(paragraph)).toEqual(item.expectedLines);
    }
    if (item.mock.startsWith('fastest')) {
      const noWrap = await bubble.evaluate((element) => ({
        playerName: getComputedStyle(element.querySelector('.v3-fastest-name')!).whiteSpace,
        timeWithUnit: getComputedStyle(element.querySelector('.v3-fastest-copy > span')!).whiteSpace,
      }));
      expect(noWrap).toEqual({ playerName: 'normal', timeWithUnit: 'nowrap' });
    }
    captures.push({ scene: item.mock, bubble: { x: box!.x, y: box!.y, width: box!.width, height: box!.height, fontSize } });
  }

  const dialogues = allCurrentMcDialogues();
  expect(dialogues.length).toBeGreaterThanOrEqual(15);
  const names = makeMockSnapshot('top10')?.leaderboard?.entries.map((entry) => entry.safeDisplayName) ?? [];
  const layoutDimensions: Record<BubbleLayout, { width: number; height: number; route: string; scene: string }> = {
    lobby: { width: 262, height: 146, route: 'lobby', scene: 'LOBBY' },
    question: { width: 262, height: 146, route: 'question', scene: 'QUESTION' },
    top10: { width: 633, height: 145, route: 'top10', scene: 'INTERIM_TOP10' },
  };
  const gridClips: { label: string; src: string; layout: BubbleLayout; width: number; height: number; fontSize: string }[] = [];
  const rendered: { label: string; text: string; lines: string[]; layout: BubbleLayout; width: number; height: number; fontSize: string; overflow: number; protectedFits: Record<string, boolean> }[] = [];
  const protectedPhrases = ['ĐẤU TRƯỜNG BÃO TỐ', 'Bình luận', 'Top 10', 'Free Fire', 'MC Kelly', '1,2 giây', 'A, B, C hoặc D', 'Hồ Anh Tuấn'];

  for (const layoutName of ['lobby', 'question', 'top10'] as const) {
    const layoutSpec = layoutDimensions[layoutName];
    const layoutDialogues = dialogues.filter((dialogue) => dialogue.layout === layoutName);
    if (!layoutDialogues.length) continue;
    await page.goto(`/?mock=${layoutSpec.route}`, { waitUntil: 'domcontentloaded' });
    const stage = page.locator(`[data-testid="stage"][data-scene="${layoutSpec.scene}"]`);
    const bubble = stage.locator('[data-testid="mc-bubble"]');
    const paragraph = bubble.locator('p');
    await expect(paragraph).toBeVisible();
    await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>('[data-testid="mc-bubble"] img')).every((image) => image.complete));
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('[data-testid="mc-bubble"] img'));
      await Promise.all(images.filter((image) => image.naturalWidth > 0).map((image) => image.decode()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    await paragraph.evaluate((element, size) => {
      const target = element.closest('[data-testid="mc-bubble"]') as HTMLElement;
      target.style.boxSizing = 'border-box';
      target.style.width = `${size.width}px`;
      target.style.height = `${size.height}px`;
    }, layoutSpec);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    for (const dialogue of layoutDialogues) {
      const formatted = await wrapWithBrowserMetrics(page, paragraph, dialogue.text, names);
      await paragraph.evaluate((element, text) => {
        element.replaceChildren(document.createTextNode(text));
      }, formatted);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const geometry = await bubble.evaluate((element) => {
        const paragraph = element.querySelector('p')!;
        const bubbleBox = element.getBoundingClientRect();
        const paragraphBox = paragraph.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        const textRects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0);
        const scaleX = paragraph.offsetWidth ? paragraphBox.width / paragraph.offsetWidth : 1;
        const contentLeft = paragraphBox.left + paragraph.clientLeft * scaleX;
        const contentRight = contentLeft + paragraph.clientWidth * scaleX;
        const textLeft = Math.min(...textRects.map((rect) => rect.x));
        const textRight = Math.max(...textRects.map((rect) => rect.x + rect.width));
        const horizontalOverflow = Math.max(0, contentLeft - textLeft, textRight - contentRight);
        return {
          width: bubbleBox.width,
          height: bubbleBox.height,
          fontSize: getComputedStyle(paragraph).fontSize,
          clientWidth: paragraph.clientWidth,
          scrollWidth: paragraph.scrollWidth,
          overflow: Math.max(0, paragraphBox.bottom - (bubbleBox.bottom - 8)),
          horizontalOverflow,
        };
      }, layoutSpec);
      expect(geometry.width, `${layoutName} contact bubble width`).toBe(layoutSpec.width);
      expect(geometry.height, `${layoutName} contact bubble height`).toBe(layoutSpec.height);
      expect(geometry.overflow, `${dialogue.label}: text stays inside its bubble`).toBeLessThanOrEqual(1);
      const lines = await renderedLines(paragraph);
      expect(geometry.horizontalOverflow, `${dialogue.label}: no horizontal text overflow; text=${JSON.stringify(formatted)}; lines=${JSON.stringify(lines)}; geometry=${JSON.stringify(geometry)}`).toBeLessThanOrEqual(1);
      if (dialogue.label === 'mock · prepare') expect(lines).toEqual(['Sẵn sàng nhé!', 'Câu hỏi', 'Free Fire sắp', 'bắt đầu.']);
      if (dialogue.label === 'mock · reveal') expect(lines).toEqual(['Chính xác!', 'Đáp án B.', 'Cùng xem bảng', 'xếp hạng nhé!']);
      if (lines.length > 1) {
        const lastLineWords = lines.at(-1)!.split(/\s+/u).filter(Boolean);
        expect(lastLineWords.length, `${dialogue.label}: no one-word widow (${lines.join(' / ')})`).toBeGreaterThan(1);
      }
      const protectedFits = await protectedPhrasesThatFit(paragraph, protectedPhrases);
      rendered.push({ label: dialogue.label, text: formatted, lines, layout: layoutName, width: geometry.width, height: geometry.height, fontSize: geometry.fontSize, overflow: geometry.overflow, protectedFits });
      await bubble.scrollIntoViewIfNeeded();
      const bubbleBox = await bubble.boundingBox();
      expect(bubbleBox, `${dialogue.label}: bubble has screenshot geometry`).not.toBeNull();
      const clip = await page.screenshot({ clip: bubbleBox!, animations: 'disabled', scale: 'css' });
      gridClips.push({ label: dialogue.label, src: `data:image/png;base64,${clip.toString('base64')}`, layout: layoutName, width: geometry.width, height: geometry.height, fontSize: geometry.fontSize });
    }
  }

  const lobby = rendered.find((entry) => entry.label === 'UI · sảnh chờ');
  expect(lobby?.lines).toEqual(['CHÀO MỪNG', 'ĐẾN VỚI', 'ĐẤU TRƯỜNG', 'BÃO TỐ!']);
  for (const entry of rendered) {
    const source = entry.text.replace(/\u00a0/gu, ' ').toLocaleLowerCase('vi');
    const lines = entry.lines.map((line) => line.toLocaleLowerCase('vi'));
    for (const phrase of protectedPhrases) {
      if (source.includes(phrase.toLocaleLowerCase('vi')) && entry.protectedFits[phrase])
        expect(lines.some((line) => line.includes(phrase.toLocaleLowerCase('vi'))), `${entry.label}: giữ cụm “${phrase}” trên cùng một dòng`).toBe(true);
    }
  }

  const columns = 2;
  const gridCards = gridClips.map((clip) => `<article><h2>${escapeHtml(clip.label)} · ${clip.layout} · ${clip.width}×${clip.height} · ${clip.fontSize}</h2><img src="${clip.src}" alt="${escapeHtml(clip.label)}" width="${clip.width}" height="${clip.height}" /></article>`).join('');
  await page.setViewportSize({ width: 1360, height: 1900 });
  await page.setContent(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:18px;background:#0c102b;color:#f6f0ff;font:16px/1.3 Arial,sans-serif}
    h1{margin:0 0 14px;font-size:22px}main{display:grid;grid-template-columns:repeat(${columns},max-content);gap:18px;align-items:start}
    article{width:max-content;min-height:0;padding:0;background:transparent;border:0;border-radius:0}
    h2{height:22px;margin:0 0 5px;color:#ffdc69;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    img{display:block;width:auto;height:auto;max-width:none;object-fit:unset}
  </style></head><body><h1>C-0224 · Contact sheet lời thoại MC · ${dialogues.length} lời thoại</h1><main>${gridCards}</main></body></html>`);
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.screenshot({ path: join(reviewDirectory, 'dialogue-grid.png'), animations: 'disabled', fullPage: true });

  const report = [
    '# C-0224 · Lời thoại MC',
    '',
    'Viewport scene: 1080×1920; ghi lại tọa độ bubble sau khi chờ font/ảnh và hai frame layout. Ảnh contact sheet phía dưới chụp bubble thật theo đúng CSS scale.',
    '',
    '## Tọa độ bubble theo scene',
    '',
    '| Scene | Hộp bong bóng x/y/w/h |',
    '|---|---:|',
    ...captures.map((capture) => `| ${capture.scene} | ${capture.bubble.x.toFixed(1)}/${capture.bubble.y.toFixed(1)}/${capture.bubble.width.toFixed(1)}/${capture.bubble.height.toFixed(1)} |`),
    '',
    `Lưới lời thoại (${dialogues.length} mẫu từ mọi trạng thái mcFor, snapshot mock, lời cố định lobby/Top 10/hướng dẫn): dialogue-grid.png. Mỗi ô dùng CSS scale gốc, không kéo giãn; lobby/question 262×146 theo bố cục ngai, Top 10 633×145.`,
    '',
    '## Số dòng và cỡ chữ thực tế',
    '',
    '| Nguồn / trạng thái | Bố cục | Kích thước | Lời thoại | Dòng hiển thị | Cỡ chữ | Tràn khung (px) |',
    '|---|---|---:|---|---:|---:|---:|',
    ...rendered.map((entry) => `| ${entry.label} | ${entry.layout} | ${entry.width}×${entry.height} | ${entry.text.replace(/\n/gu, '<br>').replace(/\u00a0/gu, ' ')} | ${entry.lines.length}: ${entry.lines.join(' / ')} | ${entry.fontSize} | ${entry.overflow.toFixed(1)} |`),
    '',
    'Bong bóng dùng text-wrap: balance; helper wrapMcBubbleText giữ liền cụm bằng NBSP và chủ động nhóm câu ở dấu câu nếu từng vế đo vừa một dòng. Contact sheet chụp các bong bóng thật, đúng cỡ và cỡ chữ, không kéo giãn.',
  ];
  await writeFile(join(reviewDirectory, 'measurements.md'), `${report.join('\n')}\n`, 'utf8');
});
