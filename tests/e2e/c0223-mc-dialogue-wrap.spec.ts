import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mcFor, type EngineState } from '@quiz/quiz-core';
import type { GameState } from '@quiz/contracts';
import { expect, test } from '@playwright/test';
import { makeMockSnapshot, MOCK_SCENES } from '../../apps/overlay/src/mock/snapshots';
import { wrapMcBubbleText } from '../../apps/overlay/src/v3/arenaLogic';

const reviewDirectory = join(process.cwd(), '.claude', 'review', 'C0223');
const ENGINE_STATES: readonly GameState[] = [
  'CONNECTION_INTERRUPTED', 'ERROR', 'PAUSED', 'IDLE', 'LOBBY', 'PREPARE', 'READING',
  'ACCEPTING', 'REVEAL', 'LEADERBOARD', 'ROUND_END', 'VICTORY', 'INTERMISSION',
];

type Dialogue = { label: string; text: string };

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

  return [...unique].map(([text, label]) => ({ label, text }));
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

test('C-0223 balances and protects MC dialogue on every bubble scene, with a full dialogue contact sheet', async ({ page }) => {
  await mkdir(reviewDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const scenes = [
    { mock: 'lobby', file: 'lobby.png', scene: 'LOBBY' },
    { mock: 'prepare', file: 'prepare.png', scene: 'QUESTION' },
    { mock: 'reading', file: 'reading.png', scene: 'QUESTION' },
    { mock: 'question', file: 'question.png', scene: 'QUESTION' },
    { mock: 'reveal', file: 'reveal.png', scene: 'REVEAL' },
    { mock: 'fastest-a', file: 'fastest.png', scene: 'REVEAL' },
    { mock: 'fastest-a-long', file: 'fastest-long-name.png', scene: 'REVEAL' },
    { mock: 'fastest-b', file: 'fastest-b.png', scene: 'REVEAL' },
    { mock: 'top10', file: 'top10-mid-round.png', scene: 'INTERIM_TOP10' },
    { mock: 'paused', file: 'paused.png', scene: 'QUESTION' },
  ];
  const captures: { scene: string; bubble: { x: number; y: number; width: number; height: number }; image: string }[] = [];

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
    const box = await bubble.boundingBox();
    expect(box, `${item.mock}: MC bubble has geometry`).not.toBeNull();
    if (item.mock.startsWith('fastest')) {
      const noWrap = await bubble.evaluate((element) => ({
        playerName: getComputedStyle(element.querySelector('.v3-fastest-name')!).whiteSpace,
        timeWithUnit: getComputedStyle(element.querySelector('.v3-fastest-copy > span')!).whiteSpace,
      }));
      expect(noWrap).toEqual({ playerName: 'nowrap', timeWithUnit: 'nowrap' });
    }
    const image = join(reviewDirectory, item.file);
    await page.screenshot({ path: image, animations: 'disabled' });
    captures.push({ scene: item.mock, bubble: { x: box!.x, y: box!.y, width: box!.width, height: box!.height }, image: item.file });
  }

  const dialogues = allCurrentMcDialogues();
  expect(dialogues.length).toBeGreaterThanOrEqual(15);
  await page.goto('/?mock=question', { waitUntil: 'domcontentloaded' });
  const bubble = page.locator('[data-testid="mc-bubble"]');
  const paragraph = bubble.locator('p');
  await expect(paragraph).toBeVisible();
  const names = makeMockSnapshot('top10')?.leaderboard?.entries.map((entry) => entry.safeDisplayName) ?? [];
  const gridClips: { label: string; src: string }[] = [];
  const rendered: { label: string; text: string; lines: string[]; fontSize: string; overflow: number }[] = [];

  for (const dialogue of dialogues) {
    const formatted = wrapMcBubbleText(dialogue.text, names);
    await paragraph.evaluate((element, text) => {
      element.replaceChildren(document.createTextNode(text));
    }, formatted);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const layout = await paragraph.evaluate((element) => {
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
      const paragraphBox = element.getBoundingClientRect();
      const bubbleBox = element.closest('[data-testid="mc-bubble"]')!.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        lines: [...lines.values()].map((line) => line.replace(/\u00a0/gu, ' ').trim()).filter(Boolean),
        fontSize: style.fontSize,
        overflow: Math.max(0, paragraphBox.bottom - (bubbleBox.bottom - 8)),
      };
    });

    expect(layout.overflow, `${dialogue.label}: text stays inside its bubble`).toBeLessThanOrEqual(1);
    if (layout.lines.length > 1) {
      const lastLineWords = layout.lines.at(-1)!.split(/\s+/u).filter(Boolean);
      expect(lastLineWords.length, `${dialogue.label}: no one-word widow (${layout.lines.join(' / ')})`).toBeGreaterThan(1);
    }
    rendered.push({ label: dialogue.label, text: formatted, ...layout });
    const clip = await bubble.screenshot({ animations: 'disabled' });
    gridClips.push({ label: dialogue.label, src: `data:image/png;base64,${clip.toString('base64')}` });
  }

  const lobby = rendered.find((entry) => entry.label === 'UI · sảnh chờ');
  expect(lobby?.lines).toEqual(['CHÀO MỪNG ĐẾN VỚI', 'ĐẤU TRƯỜNG BÃO TỐ!']);
  const protectedPhrases = ['ĐẤU TRƯỜNG BÃO TỐ', 'Bình luận', 'Top 10', 'Free Fire', 'MC Kelly', '1,2 giây', 'A, B, C hoặc D', 'Hồ Anh Tuấn'];
  for (const entry of rendered) {
    const source = entry.text.replace(/\u00a0/gu, ' ').toLocaleLowerCase('vi');
    const lines = entry.lines.map((line) => line.toLocaleLowerCase('vi'));
    for (const phrase of protectedPhrases) {
      if (source.includes(phrase.toLocaleLowerCase('vi')))
        expect(lines.some((line) => line.includes(phrase.toLocaleLowerCase('vi'))), `${entry.label}: giữ cụm “${phrase}” trên cùng một dòng`).toBe(true);
    }
  }

  const columns = 2;
  const gridCards = gridClips.map((clip) => `<article><h2>${escapeHtml(clip.label)}</h2><img src="${clip.src}" alt="${escapeHtml(clip.label)}" /></article>`).join('');
  await page.setViewportSize({ width: 1210, height: 1900 });
  await page.setContent(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:18px;background:#0c102b;color:#f6f0ff;font:16px/1.3 Arial,sans-serif}
    h1{margin:0 0 14px;font-size:22px}main{display:grid;grid-template-columns:repeat(${columns},575px);gap:14px;align-items:start}
    article{width:575px;min-height:172px;padding:0;background:transparent;border:0;border-radius:0}
    h2{height:22px;margin:0 0 5px;color:#ffdc69;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    img{display:block;width:575px;height:145px;object-fit:fill}
  </style></head><body><h1>C-0223 · Lưới kiểm tra lời thoại MC · ${dialogues.length} lời thoại</h1><main>${gridCards}</main></body></html>`);
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await page.screenshot({ path: join(reviewDirectory, 'dialogue-grid.png'), animations: 'disabled', fullPage: true });

  const report = [
    '# C-0223 · Lời thoại MC',
    '',
    'Viewport scene: 1080×1920, ảnh sau khi chờ font/ảnh và tắt animation. Cụm Kelly, nền và khung lobby không bị di chuyển.',
    '',
    '## Ảnh từng scene',
    '',
    '| Scene | Hộp bong bóng x/y/w/h | Ảnh |',
    '|---|---:|---|',
    ...captures.map((capture) => `| ${capture.scene} | ${capture.bubble.x.toFixed(1)}/${capture.bubble.y.toFixed(1)}/${capture.bubble.width.toFixed(1)}/${capture.bubble.height.toFixed(1)} | ${capture.image} |`),
    '',
    `Lưới lời thoại (${dialogues.length} mẫu từ mọi trạng thái mcFor, snapshot mock, lời cố định lobby/Top 10/hướng dẫn): dialogue-grid.png.`,
    '',
    '## Số dòng và cỡ chữ thực tế',
    '',
    '| Nguồn / trạng thái | Lời thoại | Dòng hiển thị | Cỡ chữ | Tràn khung (px) |',
    '|---|---|---:|---:|---:|',
    ...rendered.map((entry) => `| ${entry.label} | ${entry.text.replace(/\n/gu, '<br>').replace(/\u00a0/gu, ' ')} | ${entry.lines.length}: ${entry.lines.join(' / ')} | ${entry.fontSize} | ${entry.overflow.toFixed(1)} |`),
    '',
    'Bong bóng dùng text-wrap: balance; helper wrapMcBubbleText giữ liền cụm bằng NBSP. Các hộp được kiểm tra không có chữ tràn hoặc dòng cuối một từ.',
  ];
  await writeFile(join(reviewDirectory, 'measurements.md'), `${report.join('\n')}\n`, 'utf8');
});
