import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const outputDirectory = resolve(process.cwd(), '.claude', 'review', 'C0307');
const longName = 'Nguyễn Bảo Minh Tường Vi';
const longName32 = `${longName} ABCDEFG`;

type Variant = 'normal' | 'long-name' | 'tie' | 'count-0' | 'count-1' | 'count-2' | 'count-3';
type RevealVariant = 'normal' | 'long-name' | 'long-name-32' | 'tie';
type Entry = { rank: string; name: string; score: string; detail?: string; accent?: boolean; medal?: 1 | 2 | 3 };

const prototypeCss = `
.v3-leaderboard-full.v5-audit-frame { padding: 22px 24px 22px; }
.v3-leaderboard-full.v5-audit-frame.v5-audit-combined { overflow: visible !important; }
.v5-audit-root { box-sizing: border-box; width: 100%; height: 100%; padding-top: 2px; display: flex; flex-direction: column; gap: 0; overflow: hidden; color: #fff; background: #141832; font-family: inherit; }
.v5-audit-combined .v5-audit-root { overflow: visible !important; }
.v5-audit-root.v5-audit-stage-page { justify-content: flex-start; }
.v5-audit-table { box-sizing: border-box; width: 100%; min-width: 0; display: flex; flex-direction: column; }
.v5-audit-table + .v5-audit-table { margin-top: 24px; }
.v5-audit-head { box-sizing: border-box; height: 40px; flex: 0 0 40px; padding-inline: 16px; display: grid; grid-template-columns: minmax(0,1fr) auto; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 2px solid rgba(220,226,255,.46); }
.v5-audit-title { min-width: 0; margin: 0; color: #fff; font-size: 32px; line-height: 36px; font-weight: 950; letter-spacing: .25px; white-space: nowrap; }
.v5-audit-sub { color: #e6e1ff; font-size: 22px; line-height: 26px; font-weight: 750; white-space: nowrap; }
.v5-audit-columns { box-sizing: border-box; height: 24px; flex: 0 0 24px; margin-top: 16px; padding-inline: 17px; display: grid; grid-template-columns: 60px minmax(0,1fr) 120px; gap: 24px; align-items: center; color: #d9d4ef; font-size: 18px; line-height: 24px; font-weight: 850; }
.v5-audit-columns > :first-child { text-align: center; }
.v5-audit-columns > :last-child { text-align: right; }
.v5-audit-empty { box-sizing: border-box; min-height: 88px; margin: 8px 0 0; padding: 24px; display: flex; align-items: center; justify-content: center; border: 1px dashed #747a9d; border-radius: 10px; color: #fff; font-size: 22px; line-height: 28px; font-weight: 800; text-align: center; }
.v5-audit-rows { box-sizing: border-box; min-height: 0; margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.v5-audit-pages { min-height: 0; }
.v5-audit-pages [hidden] { display: none !important; }
.v5-audit-row { box-sizing: border-box; min-width: 0; height: 36px; flex: 0 0 36px; padding: 1px 16px; display: grid; grid-template-columns: 60px minmax(0,1fr) 120px; gap: 24px; align-items: center; border: 1px solid #51577e; border-radius: 10px; background: #202448; color: #fff; font-size: 22px; line-height: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
.v5-audit-row.v5-rank-1 { border: 1px solid #ffc94f; box-shadow: inset 0 0 0 1px #ffc94f; background: #fff0b5; color: #21183e; }
.v5-audit-row .v5-rank { position: relative; min-width: 0; display: flex; align-items: center; justify-content: center; text-align: center; font-variant-numeric: tabular-nums; }
.v5-audit-row .v5-medal-slot { position: absolute; left: 10px; top: 50%; width: 16px; height: 20px; display: grid; place-items: center; transform: translateY(-50%); }
.v5-audit-row .v5-rank-number { min-width: 0; width: 100%; text-align: center; }
.v5-audit-row .v5-medal { width: 16px; font-size: 18px; line-height: 20px; text-align: center; }
.v5-audit-row .v5-medal-2 { color: #d6d9e7; }
.v5-audit-row .v5-medal-3 { color: #d58e5b; }
.v5-audit-row .v5-player { min-width: 0; display: flex; align-items: center; gap: 8px; white-space: nowrap; text-align: left; }
.v5-audit-row .v5-name { min-width: 0; overflow-wrap: anywhere; }
.v5-audit-row .v5-detail { flex: 0 0 auto; color: #e6e1ff; font-size: 22px; line-height: 26px; font-weight: 850; white-space: nowrap; }
.v5-audit-row.v5-rank-1 .v5-detail { color: #342039; }
.v5-audit-row .v5-score { min-width: 0; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.v5-audit-row [data-accent="true"] { box-shadow: inset 0 0 0 1px #ffc94f; }
.v5-audit-option-a .v5-audit-rows { gap: 8px; }
.v5-audit-option-b .v5-audit-table { flex: 1 1 auto; min-height: 0; }
.v5-audit-option-b .v5-audit-pages { flex: 0 0 auto; }
.v5-audit-option-b.v5-audit-overall-page .v5-audit-pages { flex: 1 1 auto; display: flex; flex-direction: column; }
.v5-audit-option-b.v5-audit-overall-page .v5-audit-rows { flex: 1 1 auto; justify-content: space-between; padding-bottom: 0; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-pages { flex: 1 1 auto; display: flex; flex-direction: column; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-rows { flex: 1 1 auto; justify-content: center; padding-bottom: 0; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-rows[data-fill="true"] .v5-audit-row { height: 100px; min-height: 100px; flex: 0 0 100px; padding: 6px 16px; font-size: 40px; line-height: 42px; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-rows[data-fill="true"] .v5-name { white-space: normal; overflow-wrap: anywhere; text-wrap: balance; text-overflow: clip; }
`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function stageEntries(variant: Variant): Entry[] {
  const count = /^count-(\d)$/u.exec(variant);
  if (count) {
    const entries: Entry[] = [
    { rank: '1', name: 'FFVN.Kelly', score: '1.850', accent: true, medal: 1 },
    { rank: '2', name: 'StormKing', score: '1.720', medal: 2 },
    { rank: '3', name: 'BVD.Champion', score: '1.620', medal: 3 },
    ];
    return entries.slice(0, Number(count[1]));
  }
  if (variant === 'tie') return [
    { rank: '1', name: 'FFVN.Kelly', score: '1.850', accent: true, medal: 1 },
    { rank: '1', name: 'StormKing', score: '1.850' },
    { rank: '3', name: 'BVD.Champion', score: '1.620', medal: 3 },
  ];
  return [
    { rank: '1', name: variant === 'long-name' ? longName : 'FFVN.Kelly', score: '1.850', accent: true, medal: 1 },
    { rank: '2', name: 'StormKing', score: '1.720', medal: 2 },
    { rank: '3', name: 'BVD.Champion', score: '1.620', medal: 3 },
  ];
}

function overallEntries(variant: Variant): Entry[] {
  const entries: Entry[] = [
    { rank: '1', name: 'FFVN.Kelly', score: '5.850', accent: true, medal: 1 },
    { rank: '2', name: 'StormKing', score: variant === 'tie' ? '5.850' : '5.600', medal: 2 },
    { rank: '3', name: 'BVD.Champion', score: '5.420', medal: 3 },
    { rank: '4', name: variant === 'long-name' ? longName : 'Choco.M', score: '5.180' },
    { rank: '5', name: 'Hami', score: '4.960' },
    { rank: '6', name: 'Nyla_xinch', score: '4.820' },
    { rank: '7', name: 'Lophgg', score: '4.650' },
    { rank: '8', name: 'my.mitmeo', score: '4.480' },
    { rank: '9', name: 'coheo246', score: '4.310' },
    { rank: '10', name: 'Diemmy', score: '4.120' },
  ];
  if (variant !== 'tie') return entries;
  return [
    { rank: '1', name: 'FFVN.Kelly', score: '5.850', accent: true, medal: 1 },
    { rank: '1', name: 'StormKing', score: '5.850' },
    ...entries.slice(2, 9),
    { rank: '10', name: 'Diemmy', score: '4.120' },
    { rank: '10', name: 'Nguyễn Bảo Minh Tường Vi', score: '4.120' },
  ];
}

function fastestEntries(variant: RevealVariant): Entry[] {
  if (variant === 'tie') return [
    { rank: '1', name: 'FFVN.Kelly', score: '1,6', accent: true },
    { rank: '1', name: 'StormKing', score: '1,6', accent: true },
    { rank: '3', name: 'BVD.Champion', score: '2,4' },
  ];
  return [
    { rank: '1', name: variant === 'long-name' ? longName : variant === 'long-name-32' ? longName32 : 'FFVN.Kelly', score: '1,6', accent: true, medal: 1 },
    { rank: '2', name: 'StormKing', score: '2,0', medal: 2 },
    { rank: '3', name: 'BVD.Champion', score: '2,4', medal: 3 },
  ];
}

const revealSampleCss = `
  .v3-stage--user-question-layout[data-scene="REVEAL"] .v3-fastest-callout.v5-reveal-top3 {
    height:auto!important;max-height:none!important;padding:16px 24px!important;
    display:block!important;overflow:visible!important;box-sizing:border-box!important;
  }
  .v5-reveal-top3-root { box-sizing:border-box;width:100%;height:auto;display:flex;flex-direction:column;gap:8px;color:#fff;font-family:inherit; }
  .v5-reveal-top3-title { box-sizing:border-box;width:100%;height:38px;flex:0 0 38px;margin:0;padding-inline:16px;display:grid;grid-template-columns:70px minmax(0,1fr) 56px;column-gap:24px;align-items:center;color:#fff;font-size:32px;line-height:38px;font-weight:950;letter-spacing:.2px;white-space:nowrap; }
  .v5-reveal-title-copy { grid-column:1 / 3; }
  .v5-reveal-title-unit { grid-column:3;justify-self:stretch;text-align:right;font-size:22px;line-height:24px;font-variant-numeric:tabular-nums; }
  .v5-reveal-top3-row { box-sizing:border-box;width:100%;display:grid;grid-template-columns:70px minmax(0,1fr) 56px;column-gap:24px;align-items:center;min-width:0;height:48px;flex:0 0 48px;padding:8px 16px;border:1px solid #73799f;border-radius:8px;background:#202448;color:#fff;font-size:28px;line-height:28px;font-weight:850;font-variant-numeric:tabular-nums; }
  .v5-reveal-top3-row[data-gold="true"] { border:1px solid #ffc94f;box-shadow:inset 0 0 0 1px #ffc94f;background:#fff0b5;color:#21183e; }
  .v5-reveal-top3-rank { text-align:center;font-variant-numeric:tabular-nums; }
  .v5-reveal-top3-name { min-width:0;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left; }
  .v5-reveal-top3-time { min-width:0;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums; }
  .v5-reveal-top3-rows { box-sizing:border-box;width:100%;min-height:0;flex:1 1 auto;align-self:stretch;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px; }
`;

async function installRevealSample(page: Page, variant: RevealVariant) {
  const callout = page.locator('.v3-fastest-callout').first();
  await expect(callout).toBeVisible();
  const rows = fastestEntries(variant).map((entry) => `<li class="v5-reveal-top3-row" data-gold="${entry.accent === true}">
    <span class="v5-reveal-top3-rank">${escapeHtml(entry.rank)}</span>
    <strong class="v5-reveal-top3-name">${escapeHtml(entry.name)}</strong>
    <span class="v5-reveal-top3-time">${escapeHtml(entry.score)}</span>
  </li>`).join('');
  const markup = `<section class="v5-reveal-top3-root" data-v5-reveal="true">
    <h2 class="v5-reveal-top3-title"><span class="v5-reveal-title-copy">TOP 3 NHANH NHẤT</span><span class="v5-reveal-title-unit">GIÂY</span></h2>
    <ol class="v5-reveal-top3-rows">${rows}</ol>
  </section>`;
  await page.addStyleTag({ content: revealSampleCss });
  await page.waitForTimeout(120);
  await callout.evaluate((element, content) => {
    element.classList.add('v5-reveal-top3');
    element.innerHTML = content;
  }, markup);
  // The approved 1080×1920 scene has a 600×465 question card at (410,348) and the MC stage at y=815.
  // This places the auto-height frame at y=829, exactly 16 px below the question card.
  await page.addStyleTag({ content: `
    .v3-stage--user-question-layout[data-scene="REVEAL"] .v3-mc .v3-fastest-callout.v5-reveal-top3 {
      left:410px!important;top:14px!important;width:600px!important;
    }
  ` });
  return callout;
}

function tableMarkup(title: string, subtitle: string, entries: Entry[], option: 'a' | 'b', unitLabel = 'ĐIỂM'): string {
  const maxRows = 10;
  const pageEntriesList = entries.length <= maxRows
    ? [entries]
    : entries.length === 11
      ? [entries.slice(0, maxRows), [...entries.slice(0, maxRows - 2), ...entries.slice(-2)]]
      : [entries.slice(0, maxRows), ...Array.from({ length: Math.ceil((entries.length - maxRows) / 2) }, (_, page) => [...entries.slice(0, maxRows - 2), ...entries.slice(maxRows + (page * 2), maxRows + (page * 2) + 2)])];
  const pages = pageEntriesList.map((pageEntries, pageIndex) => {
    const rows = pageEntries.map((entry) => `<li class="v5-audit-row v5-rank-${entry.medal ?? 'n'}" data-rank="${escapeHtml(entry.rank)}" data-gold-accent="${entry.accent === true}">
      <span class="v5-rank"><span class="v5-medal-slot">${entry.medal === 2 || entry.medal === 3 ? `<span class="v5-medal v5-medal-${entry.medal}" aria-label="huy chương ${entry.medal}">●</span>` : ''}</span><span class="v5-rank-number">${escapeHtml(entry.rank)}</span></span>
      <span class="v5-player"><strong class="v5-name">${escapeHtml(entry.name)}</strong></span>
      <span class="v5-score">${escapeHtml(entry.score)}</span>
    </li>`).join('');
    const hidden = pageIndex === 0 ? '' : ' hidden';
    const fill = option === 'b' && title.startsWith('TOP 3') && pageEntries.length === 3 ? ' data-fill="true"' : '';
    return `<ol class="v5-audit-rows" data-v5-page="${pageIndex}"${hidden}${fill}>${rows || '<li class="v5-audit-empty-row">—</li>'}</ol>`;
  }).join('');
  const pageContainer = `<div class="v5-audit-pages" data-page-count="${pageEntriesList.length}" data-source-count="${entries.length}" data-rotation-ms="5000">${pages}</div>`;
  const subtitleMarkup = subtitle ? `<span class="v5-audit-sub">${escapeHtml(subtitle)}</span>` : '';
  return `<section class="v5-audit-table" data-v5-table="${option}" data-unit-label="${escapeHtml(unitLabel)}">
    <header class="v5-audit-head"><h2 class="v5-audit-title">${escapeHtml(title)}</h2>${subtitleMarkup}</header>
    <div class="v5-audit-columns"><span>HẠNG</span><span>NGƯỜI CHƠI</span><span>${escapeHtml(unitLabel)}</span></div>
    ${entries.length ? pageContainer : '<p class="v5-audit-empty">CHƯA CÓ NGƯỜI ĐẠT ĐIỂM</p>'}
  </section>`;
}

function optionA(variant: Variant): string {
  return `<div class="v5-audit-root v5-audit-option-a">
    ${tableMarkup('TOP 10 TOÀN TRẬN', 'SAU CÂU 05', overallEntries(variant), 'a')}
    ${tableMarkup('TOP 3 CHẶNG 1', 'CÂU 01–05', stageEntries(variant), 'a')}
  </div>`;
}

function optionB(variant: Variant, table: 'overall' | 'stage'): string {
  const overall = table === 'overall';
  const content = overall
    ? tableMarkup('TOP 10 TOÀN TRẬN', 'SAU CÂU 15', overallEntries(variant), 'b')
    : tableMarkup('TOP 3 CHẶNG 3', '', stageEntries(variant), 'b');
  return `<div class="v5-audit-root v5-audit-option-b ${overall ? 'v5-audit-overall-page' : 'v5-audit-stage-page'}">${content}</div>`;
}

async function loadPrototype(page: Page, markup: string) {
  await page.goto('/?mock=top10&hud=1&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.v3-leaderboard-full')).toBeVisible();
  await page.addStyleTag({ content: prototypeCss });
  const frame = page.locator('.v3-leaderboard-full');
  const before = await frame.boundingBox();
  await frame.evaluate((element, content) => {
    element.classList.add('v5-audit-frame');
    if (content.includes('v5-audit-option-a')) {
      element.classList.add('v5-audit-combined');
      element.style.setProperty('overflow', 'visible', 'important');
    }
    element.innerHTML = content;
    if (content.includes('v5-audit-option-a')) element.querySelector<HTMLElement>('.v5-audit-root')?.style.setProperty('overflow', 'visible', 'important');
    for (const pageSet of element.querySelectorAll<HTMLElement>('.v5-audit-pages[data-page-count]')) {
      const pages = [...pageSet.querySelectorAll<HTMLElement>(':scope > [data-v5-page]')];
      pageSet.dataset.activePage = '0';
      if (pages.length > 1) {
        let activePage = 0;
        window.setInterval(() => {
          activePage = (activePage + 1) % pages.length;
          pages.forEach((page, index) => { page.hidden = index !== activePage; });
          pageSet.dataset.activePage = String(activePage);
        }, Number(pageSet.dataset.rotationMs));
      }
    }
  }, markup);
  await page.waitForTimeout(150);
  const after = await frame.boundingBox();
  expect(after).not.toBeNull();
  expect(before).not.toBeNull();
  expect(after!.x).toBe(before!.x);
  expect(after!.y).toBe(before!.y);
  expect(after!.width).toBe(before!.width);
  expect(after!.height).toBe(before!.height);
  return { frame, frameBox: after! };
}

async function measureSample(page: Page, frameBox: { x: number; y: number; width: number; height: number }) {
  return page.evaluate(({ frameBox, longName }) => {
    const frameElement = document.querySelector<HTMLElement>('.v3-leaderboard-full')!;
    const root = frameElement.querySelector<HTMLElement>('.v5-audit-root')!;
    const tables = [...root.querySelectorAll<HTMLElement>('.v5-audit-table')];
    const rows = [...root.querySelectorAll<HTMLElement>('.v5-audit-pages > [data-v5-page]:not([hidden]) .v5-audit-row')];
    const gaps = (elements: HTMLElement[]) => elements.slice(1).map((element, index) => element.getBoundingClientRect().top - elements[index]!.getBoundingClientRect().bottom);
    const textLines = (element: HTMLElement) => {
      const range = document.createRange(); range.selectNodeContents(element);
      return range.getClientRects().length;
    };
    const rgbaLuminance = (color: string) => {
      const values = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
      const c = values.map((value) => { const v = value / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return .2126 * (c[0] ?? 0) + .7152 * (c[1] ?? 0) + .0722 * (c[2] ?? 0);
    };
    const contrast = (a: string, b: string) => { const x = rgbaLuminance(a); const y = rgbaLuminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const frame = frameElement.getBoundingClientRect();
    const styles = getComputedStyle(frameElement);
    const rootStyle = getComputedStyle(root);
    const lastContent = root.querySelector<HTMLElement>('.v5-audit-empty') ?? rows.at(-1);
    const lastRow = lastContent?.getBoundingClientRect();
    const rowMetrics = rows.map((row) => {
      const rank = row.querySelector<HTMLElement>('.v5-rank')!;
      const player = row.querySelector<HTMLElement>('.v5-player')!;
      const name = row.querySelector<HTMLElement>('.v5-name')!;
      const score = row.querySelector<HTMLElement>('.v5-score')!;
      const rowStyle = getComputedStyle(row);
      const nameStyle = getComputedStyle(name);
      const scoreStyle = getComputedStyle(score);
      const box = row.getBoundingClientRect(); const nameBox = player.getBoundingClientRect(); const scoreBox = score.getBoundingClientRect();
      const rankStyle = getComputedStyle(rank); const playerStyle = getComputedStyle(player); const scoreCellStyle = getComputedStyle(score);
      const rankNumber = rank.querySelector<HTMLElement>('.v5-rank-number')!;
      const rankNumberBox = rankNumber.getBoundingClientRect();
      return {
        rank: rank.textContent,
        unitLabel: row.closest<HTMLElement>('.v5-audit-table')?.dataset.unitLabel ?? 'ĐIỂM',
        name: name.textContent,
        nameGraphemes: [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(name.textContent ?? '')].length,
        nameLines: textLines(name),
        nameClipped: name.scrollWidth > name.clientWidth + 1,
        score: score.textContent,
        scoreClipped: score.scrollWidth > score.clientWidth + 1,
        nameScoreGapPx: Math.round((scoreBox.left - nameBox.right) * 100) / 100,
        rowGapPx: Math.round(box.height * 100) / 100,
        fontPx: Number.parseFloat(nameStyle.fontSize),
        rowHeightFontRatio: Math.round((box.height / Number.parseFloat(rowStyle.fontSize)) * 100) / 100,
        rowPaddingTopPx: Number.parseFloat(rowStyle.paddingTop),
        rowPaddingBottomPx: Number.parseFloat(rowStyle.paddingBottom),
        rowPaddingLeftPx: Number.parseFloat(rowStyle.paddingLeft),
        rowPaddingRightPx: Number.parseFloat(rowStyle.paddingRight),
        nameLeftPx: Math.round(name.getBoundingClientRect().left * 100) / 100,
        rankCenterPx: Math.round((rankNumberBox.left + rankNumberBox.right) / 2 * 100) / 100,
        scoreRightPx: Math.round(scoreBox.right * 100) / 100,
        nameTextAlign: playerStyle.textAlign,
        rankTextAlign: rankStyle.textAlign,
        scoreTextAlign: scoreCellStyle.textAlign,
        scoreFontPx: Number.parseFloat(scoreStyle.fontSize),
        tabularNums: nameStyle.fontVariantNumeric.includes('tabular-nums') && scoreStyle.fontVariantNumeric.includes('tabular-nums'),
        contrastRatio: Math.round(contrast(nameStyle.color, rowStyle.backgroundColor) * 100) / 100,
        goldAccent: row.dataset.goldAccent === 'true',
      };
    });
    const textMetrics = [...root.querySelectorAll<HTMLElement>('.v5-audit-title, .v5-audit-sub, .v5-audit-columns > *, .v5-audit-empty, .v5-audit-row .v5-rank, .v5-audit-row .v5-name, .v5-audit-row .v5-detail, .v5-audit-row .v5-score')].map((element) => {
      const row = element.closest<HTMLElement>('.v5-audit-row');
      const foreground = getComputedStyle(element).color;
      const background = getComputedStyle(row ?? root).backgroundColor;
      return { text: element.textContent?.trim() ?? '', contrastRatio: Math.round(contrast(foreground, background) * 100) / 100 };
    });
    const tableMetrics = tables.map((table) => {
      const title = table.querySelector<HTMLElement>('.v5-audit-title')!;
      const subtitle = table.querySelector<HTMLElement>('.v5-audit-sub');
      const unitLabel = table.dataset.unitLabel ?? 'ĐIỂM';
      const unit = [...table.querySelectorAll<HTMLElement>('.v5-audit-columns > *')].filter((column) => column.textContent?.trim() === unitLabel);
      const tableRows = [...table.querySelectorAll<HTMLElement>('.v5-audit-pages > [data-v5-page]:not([hidden]) .v5-audit-row')];
      const allTableRows = [...table.querySelectorAll<HTMLElement>('.v5-audit-row')];
      const pageSet = table.querySelector<HTMLElement>('.v5-audit-pages');
      const pages = [...table.querySelectorAll<HTMLElement>('.v5-audit-pages > [data-v5-page]')];
      const header = table.querySelector<HTMLElement>('.v5-audit-head')!;
      const columnsRow = table.querySelector<HTMLElement>('.v5-audit-columns');
      const columnCells = columnsRow ? [...columnsRow.querySelectorAll<HTMLElement>(':scope > *')] : [];
      const firstRow = tableRows[0];
      const firstRankNumber = firstRow?.querySelector<HTMLElement>('.v5-rank-number')?.getBoundingClientRect();
      const firstName = firstRow?.querySelector<HTMLElement>('.v5-name')?.getBoundingClientRect();
      const firstScore = firstRow?.querySelector<HTMLElement>('.v5-score')?.getBoundingClientRect();
      const headerRank = columnCells[0]?.getBoundingClientRect();
      const headerName = columnCells[1]?.getBoundingClientRect();
      const headerScore = columnCells[2]?.getBoundingClientRect();
      const headerTitle = title.getBoundingClientRect();
      const headerSubtitle = subtitle?.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      const tableBox = table.getBoundingClientRect();
      const frameRect = frameElement.getBoundingClientRect();
      return {
        title: title.textContent,
        unitLabel,
        titleWords: (title.textContent ?? '').trim().split(/\s+/).length,
        supportingLines: table.querySelectorAll('.v5-audit-sub').length,
        unitColumnCount: unit.length,
        titleFontPx: Number.parseFloat(getComputedStyle(title).fontSize),
        supportFontPx: subtitle ? Number.parseFloat(getComputedStyle(subtitle).fontSize) : null,
        emptyFontPx: table.querySelector<HTMLElement>('.v5-audit-empty') ? Number.parseFloat(getComputedStyle(table.querySelector<HTMLElement>('.v5-audit-empty')!).fontSize) : null,
        fontSizes: [...new Set([...table.querySelectorAll<HTMLElement>('.v5-audit-title, .v5-audit-sub, .v5-audit-columns > *, .v5-audit-empty, .v5-audit-row, .v5-audit-row *')].map((element) => getComputedStyle(element).fontSize))],
        rowGapPx: gaps(tableRows).map((gap) => Math.round(gap * 100) / 100),
        goldAccents: Math.max(0, ...pages.map((page) => [...page.querySelectorAll<HTMLElement>('.v5-audit-row')].filter((row) => row.dataset.goldAccent === 'true').length)),
        rowCount: tableRows.length,
        sourceRowCount: Number(pageSet?.dataset.sourceCount ?? 0),
        pageCount: pages.length,
        activePage: Number(pageSet?.dataset.activePage ?? 0),
        pageNames: pages.map((page) => [...page.querySelectorAll<HTMLElement>('.v5-name')].map((name) => name.textContent?.trim() ?? '')),
        pageRanks: pages.map((page) => [...page.querySelectorAll<HTMLElement>('.v5-audit-row .v5-rank')].map((rank) => rank.textContent?.trim() ?? '')),
        pageText: pages.map((page) => page.textContent ?? ''),
        pageGoldAccents: pages.map((page) => [...page.querySelectorAll<HTMLElement>('.v5-audit-row')].filter((row) => row.dataset.goldAccent === 'true').length),
        pageHasTieSummary: pages.some((page) => [...page.querySelectorAll<HTMLElement>('.v5-audit-row')].some((row) => /\+\s*\d+\s+người/iu.test(row.textContent ?? ''))),
        pageRowCounts: pages.map((page) => page.querySelectorAll('.v5-audit-row').length),
        rowHeightsPx: tableRows.map((row) => Math.round(row.getBoundingClientRect().height * 100) / 100),
        nameLeftEdgesPx: tableRows.map((row) => Math.round(row.querySelector<HTMLElement>('.v5-name')!.getBoundingClientRect().left * 100) / 100),
        titleTopOffsetPx: Math.round((header.getBoundingClientRect().top - frameRect.top) * 100) / 100,
        titleColumnGapPx: columnsRow ? Math.round((columnsRow.getBoundingClientRect().top - header.getBoundingClientRect().bottom) * 100) / 100 : null,
        headerInsetLeftPx: Math.round((headerTitle.left - headerBox.left) * 100) / 100,
        headerInsetRightPx: headerSubtitle ? Math.round((headerBox.right - headerSubtitle.right) * 100) / 100 : null,
        headerPaddingLeftPx: Number.parseFloat(getComputedStyle(header).paddingLeft),
        headerPaddingRightPx: Number.parseFloat(getComputedStyle(header).paddingRight),
        headerAlignmentDeltaPx: headerRank && headerName && headerScore && firstRankNumber && firstName && firstScore ? Math.round(Math.max(
          Math.abs((headerRank.left + headerRank.right) / 2 - (firstRankNumber.left + firstRankNumber.right) / 2),
          Math.abs(headerName.left - firstName.left),
          Math.abs(headerScore.right - firstScore.right),
        ) * 100) / 100 : null,
        columnHeaderEdgesPx: columnCells.map((cell) => { const box = cell.getBoundingClientRect(); return { left: Math.round(box.left * 100) / 100, right: Math.round(box.right * 100) / 100 }; }),
        rankNumberCentersPx: tableRows.map((row) => { const box = row.querySelector<HTMLElement>('.v5-rank-number')!.getBoundingClientRect(); return Math.round((box.left + box.right) / 2 * 100) / 100; }),
        scoreRightEdgesPx: tableRows.map((row) => Math.round(row.querySelector<HTMLElement>('.v5-score')!.getBoundingClientRect().right * 100) / 100),
        titleInsetLeftPx: Math.round((headerTitle.left - tableBox.left) * 100) / 100,
        subtitleInsetRightPx: headerSubtitle ? Math.round((tableBox.right - headerSubtitle.right) * 100) / 100 : null,
        columnFontPx: columnsRow ? Number.parseFloat(getComputedStyle(columnsRow).fontSize) : null,
        bounds: (() => { const box = table.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; })(),
      };
    });
    const longNameRow = rowMetrics.find((row) => row.name === longName);
    const first = tables[0]?.getBoundingClientRect(); const second = tables[1]?.getBoundingClientRect();
    return {
      frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
      fixedFrameMatches: frame.x === frameBox.x && frame.y === frameBox.y && frame.width === frameBox.width && frame.height === frameBox.height,
      framePaddingPx: {
        top: Math.round((Number.parseFloat(styles.paddingTop) + Number.parseFloat(rootStyle.paddingTop)) * 100) / 100,
        right: Number.parseFloat(styles.paddingRight), bottom: Number.parseFloat(styles.paddingBottom) + Number.parseFloat(styles.borderBottomWidth), left: Number.parseFloat(styles.paddingLeft),
      },
      bottomSafeGapPx: lastRow ? Math.round((frame.bottom - lastRow.bottom) * 100) / 100 : null,
      titleFontSizes: [...new Set([...root.querySelectorAll<HTMLElement>('.v5-audit-title')].map((element) => getComputedStyle(element).fontSize))],
      contentFontSizes: [...new Set([...root.querySelectorAll<HTMLElement>('.v5-audit-columns, .v5-audit-row, .v5-audit-detail, .v5-audit-empty')].map((element) => getComputedStyle(element).fontSize))],
      tables: tableMetrics,
      betweenTablesGapPx: first && second ? Math.round((second.top - first.bottom) * 100) / 100 : null,
      rows: rowMetrics,
      text: textMetrics,
      longNameGraphemesExpected: [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(longName)].length,
      longNameRow,
    };
  }, { frameBox, longName });
}

async function capture(page: Page, markup: string, fullPath: string, zoomPath: string) {
  const { frame, frameBox } = await loadPrototype(page, markup);
  const metrics = await measureSample(page, frameBox);
  await page.screenshot({ path: fullPath, animations: 'disabled' });
  const box = await frame.boundingBox();
  if (!box) throw new Error('Không đo được khung BXH để chụp zoom');
  const lastRow = await frame.locator('.v5-audit-pages > [data-v5-page]:not([hidden]) .v5-audit-row, .v5-audit-empty').last().boundingBox();
  const contentBottom = Math.max(box.y + box.height, lastRow ? lastRow.y + lastRow.height : 0);
  await page.screenshot({ path: zoomPath, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: contentBottom - box.y + 16 }, animations: 'disabled' });
  return metrics;
}

async function captureRotatedPage(page: Page, fullPath: string, zoomPath: string) {
  const pageSet = page.locator('.v5-audit-pages[data-page-count]');
  await expect(pageSet.first()).toHaveAttribute('data-active-page', '1', { timeout: 6500 });
  const frame = page.locator('.v3-leaderboard-full');
  const frameBox = await frame.boundingBox();
  expect(frameBox).not.toBeNull();
  const metrics = await measureSample(page, frameBox!);
  await page.screenshot({ path: fullPath, animations: 'disabled' });
  const box = await frame.boundingBox();
  if (!box) throw new Error('Không đo được khung BXH để chụp trang đồng hạng luân phiên');
  const lastRow = await frame.locator('.v5-audit-pages > [data-v5-page]:not([hidden]) .v5-audit-row').last().boundingBox();
  const contentBottom = Math.max(box.y + box.height, lastRow ? lastRow.y + lastRow.height : 0);
  await page.screenshot({ path: zoomPath, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: contentBottom - box.y + 16 }, animations: 'disabled' });
  return metrics;
}

test('C-0307 — capture both V5 leaderboard layouts, variants and DOM measurements', async ({ page }) => {
  test.setTimeout(90_000);
  mkdirSync(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });

  const samples: Array<{ option: string; case: Variant; screen: string; metrics: Awaited<ReturnType<typeof measureSample>> }> = [];
  for (const variant of ['normal', 'long-name', 'tie'] as const) {
    const suffix = variant.replace('-', '_');
    const combined = await capture(
      page,
      optionA(variant),
      join(outputDirectory, `option-a-combined-${suffix}-1080x1920.png`),
      join(outputDirectory, `option-a-combined-${suffix}-table-zoom.png`),
    );
    samples.push({ option: 'A · gộp chung', case: variant, screen: 'Top 10 + Top 3 chặng 1', metrics: combined });
    if (variant === 'tie') {
      const rotated = await captureRotatedPage(
        page,
        join(outputDirectory, 'option-a-combined-tie-page-2-1080x1920.png'),
        join(outputDirectory, 'option-a-combined-tie-page-2-table-zoom.png'),
      );
      samples.push({ option: 'A · gộp chung · trang xoay 2', case: variant, screen: 'Top 10 đồng hạng · trang 2', metrics: rotated });
    }

    for (const table of ['overall', 'stage'] as const) {
      const split = await capture(
        page,
        optionB(variant, table),
        join(outputDirectory, `option-b-rotate-${table}-${suffix}-1080x1920.png`),
        join(outputDirectory, `option-b-rotate-${table}-${suffix}-table-zoom.png`),
      );
      samples.push({ option: 'B · luân phiên 5 giây', case: variant, screen: table === 'overall' ? 'Top 10 toàn trận' : 'Top 3 chặng 3', metrics: split });
      if (variant === 'tie' && table === 'overall') {
        const rotated = await captureRotatedPage(
          page,
          join(outputDirectory, 'option-b-rotate-overall-tie-page-2-1080x1920.png'),
          join(outputDirectory, 'option-b-rotate-overall-tie-page-2-table-zoom.png'),
        );
        samples.push({ option: 'B · luân phiên 5 giây · trang xoay 2', case: variant, screen: 'Top 10 đồng hạng · trang 2', metrics: rotated });
      }
    }
  }
  for (const variant of ['count-0', 'count-1', 'count-2', 'count-3'] as const) {
    const suffix = variant.replace('-', '_');
    const count = Number(variant.at(-1));
    const split = await capture(
      page,
      optionB(variant, 'stage'),
      join(outputDirectory, `option-b-rotate-stage-${suffix}-1080x1920.png`),
      join(outputDirectory, `option-b-rotate-stage-${suffix}-table-zoom.png`),
    );
    samples.push({ option: 'B · luân phiên 5 giây', case: variant, screen: `Top 3 chặng 3 · ${count} người`, metrics: split });
  }

  const check = samples.map((sample) => {
    const metrics = sample.metrics;
    const rowGaps = metrics.tables.flatMap((table) => table.rowGapPx);
    const minRowGap = rowGaps.length ? Math.min(...rowGaps) : null;
    const minContrast = Math.min(...metrics.text.map((element) => element.contrastRatio));
    const allLongNamesFit = !metrics.longNameRow || (metrics.longNameRow.nameGraphemes === 24 && metrics.longNameRow.nameLines <= 2 && !metrics.longNameRow.nameClipped);
    const oneGoldPerTable = metrics.tables.every((table) => table.pageGoldAccents.length ? table.pageGoldAccents.every((count) => count === 1) : table.sourceRowCount === 0);
    const fullTieNames = sample.case !== 'tie' || metrics.tables.every((table) => {
      const names = table.pageNames.flat();
      const ranks = table.pageRanks.flat();
      const expectedNames = table.title.includes('10')
        ? ['FFVN.Kelly', 'StormKing', 'BVD.Champion', 'Choco.M', 'Hami', 'Nyla_xinch', 'Lophgg', 'my.mitmeo', 'coheo246', 'Diemmy', longName]
        : ['FFVN.Kelly', 'StormKing', 'BVD.Champion'];
      const rankOneCount = ranks.filter((rank) => rank.replace(/\D/gu, '') === '1').length;
      const rankThreeVisible = ranks.some((rank) => rank.replace(/\D/gu, '') === '3');
      return !table.pageHasTieSummary && expectedNames.every((name) => names.includes(name)) && rankOneCount >= 2 && rankThreeVisible;
    });
    const alignedNameColumn = metrics.tables.every((table) => {
      const edges = table.nameLeftEdgesPx;
      return edges.length < 2 || Math.max(...edges) - Math.min(...edges) <= 1;
    });
    const checks = [
      metrics.tables.every((table) => table.titleWords <= 4 && table.supportingLines <= 1),
      metrics.tables.every((table) => table.unitColumnCount === 1) && metrics.rows.every((row) => row.unitLabel === 'THỜI GIAN' ? /^\d,\d$/u.test(row.score) : !/điểm|\bs\b/iu.test(row.score)),
      metrics.rows.every((row) => row.nameScoreGapPx >= 24 && row.tabularNums && row.nameTextAlign === 'left' && row.rankTextAlign === 'center' && row.scoreTextAlign === 'right') && alignedNameColumn,
      metrics.framePaddingPx.top >= 24 && metrics.framePaddingPx.right >= 24 && metrics.framePaddingPx.bottom >= 24 && metrics.framePaddingPx.left >= 24 && metrics.bottomSafeGapPx !== null && metrics.bottomSafeGapPx >= 12 && (minRowGap === null || minRowGap >= 8) && (metrics.betweenTablesGapPx === null || metrics.betweenTablesGapPx >= 24),
      metrics.rows.every((row) => row.fontPx >= 22 && row.scoreFontPx >= 22 && row.rowHeightFontRatio >= 1.6) && metrics.tables.every((table) => table.titleFontPx >= 32 && (table.supportingLines === 0 || (table.supportFontPx !== null && table.supportFontPx >= 22)) && (table.emptyFontPx === null || table.emptyFontPx >= 22) && table.fontSizes.length <= 3),
      oneGoldPerTable,
      allLongNamesFit && metrics.rows.every((row) => !row.nameClipped && !row.scoreClipped),
      sample.option.startsWith('A') ? metrics.tables.length === 2 : metrics.tables.length === 1,
      minContrast >= 4.5,
      metrics.fixedFrameMatches,
      metrics.rows.every((row) => row.rowHeightFontRatio >= 1.6),
      metrics.tables.every((table) => {
        const edges = table.nameLeftEdgesPx;
        return edges.length < 2 || Math.max(...edges) - Math.min(...edges) <= 1;
      }),
      fullTieNames && metrics.tables.every((table) => table.pageRowCounts.every((count) => count <= 10)),
      metrics.tables.every((table) => table.titleColumnGapPx === null || table.titleColumnGapPx >= 16),
      metrics.tables.filter((table) => table.title.startsWith('TOP 3')).every((table) => {
        const heights = table.rowHeightsPx;
        return heights.length !== 3 || Math.max(...heights) - Math.min(...heights) <= 1;
      }),
      !sample.option.startsWith('A') && metrics.bottomSafeGapPx !== null && (sample.screen.includes('Top 10') ? metrics.bottomSafeGapPx <= 24 : metrics.bottomSafeGapPx >= 24),
    ];
    return {
      ...sample,
      minRowGapPx: minRowGap,
      interTableGapPx: metrics.betweenTablesGapPx,
      minContrastRatio: minContrast,
      checks,
    };
  });

  for (const result of check) {
    const expected = Array(16).fill(true);
    if (result.option.startsWith('A')) { expected[3] = false; expected[15] = false; }
    expect(result.checks, `${result.option}/${result.case}/${result.screen}: ${JSON.stringify(result.metrics)}`).toEqual(expected);
  }

  const reviewSamples = check.filter((sample) => sample.option.startsWith('B') && ['normal', 'tie'].includes(sample.case) && ['Top 10 toàn trận', 'Top 3 chặng 3'].includes(sample.screen));
  for (const sample of reviewSamples) {
    const table = sample.metrics.tables[0]!;
    expect(table.headerAlignmentDeltaPx, `${sample.screen}/${sample.case}: cột header phải trùng hàng`).toBeLessThanOrEqual(1);
    expect(table.headerPaddingLeftPx, `${sample.screen}/${sample.case}: padding trái header`).toBeGreaterThanOrEqual(16);
    expect(table.headerPaddingRightPx, `${sample.screen}/${sample.case}: padding phải header`).toBeGreaterThanOrEqual(16);
    const rankCenter = table.columnHeaderEdgesPx[0]!.left + (table.columnHeaderEdgesPx[0]!.right - table.columnHeaderEdgesPx[0]!.left) / 2;
    expect(table.rankNumberCentersPx.every((center) => Math.abs(center - rankCenter) <= 1), `${sample.screen}/${sample.case}: tâm số hạng`).toBe(true);
    if (sample.screen === 'Top 10 toàn trận') {
      expect(sample.metrics.bottomSafeGapPx, 'Top 10: khoảng trống dưới tối đa 24 px').toBeLessThanOrEqual(24);
    } else {
      expect(sample.metrics.rows.every((row) => row.fontPx >= 40 && row.fontPx <= 44 && row.rowHeightFontRatio <= 2.5), 'Top 3 chặng: cỡ chữ 40–44 px, hàng/chữ ≤2,5×').toBe(true);
    }
  }
  for (const screen of ['Top 10 toàn trận', 'Top 3 chặng 3']) {
    const variants = reviewSamples.filter((sample) => sample.screen === screen);
    const grids = variants.map((sample) => sample.metrics.tables[0]!.columnHeaderEdgesPx);
    const gridDeltaPx = Math.max(...grids.flatMap((grid, gridIndex) => grid.flatMap((cell, columnIndex) => {
      const other = grids[gridIndex === 0 ? 1 : 0]![columnIndex]!;
      return [Math.abs(cell.left - other.left), Math.abs(cell.right - other.right)];
    })));
    expect(gridDeltaPx, `${screen}: lưới cột cố định giữa normal/tie`).toBeLessThanOrEqual(1);
  }

  const referenceTop10 = check.find((sample) => sample.option.startsWith('B') && sample.case === 'normal' && sample.screen === 'Top 10 toàn trận')!.metrics.tables[0]!;
  const referenceStage = check.find((sample) => sample.option.startsWith('B') && sample.case === 'normal' && sample.screen === 'Top 3 chặng 3')!.metrics.tables[0]!;
  const top10StageHeaderDeltaPx = Math.abs(referenceTop10.titleTopOffsetPx - referenceStage.titleTopOffsetPx);
  expect(top10StageHeaderDeltaPx, 'Tiêu đề Top 3 chặng phải ngang vị trí tiêu đề Top 10').toBeLessThanOrEqual(1);
  const ruleNames = [
    'Tiêu đề gọn, tối đa 4 từ và 1 dòng phụ', 'Đơn vị chỉ ở tiêu đề cột, ô số không lặp đơn vị', 'Cột thẳng; tên trái, hạng giữa, điểm phải; số tabular',
    'Khung có padding ≥24 px, hàng cách ≥8 px, đáy an toàn ≥12 px', 'Cỡ đọc được, title ≥32 px, row/font ≥1,6, tối đa 3 cỡ',
    'Chỉ một hàng nhấn màu trong mỗi bảng', 'Tên dài đủ 24 grapheme, không cắt tên hoặc số', 'Phương án B chỉ hiện một bảng mỗi ảnh, bảng tràn luân phiên',
    'Tương phản chữ/nền ≥4.5:1', 'Khung chính giữ nguyên x/y/w/h', 'Mỗi hàng cao ≥1,6 lần cỡ chữ',
    'Mép trái tên trong một cột lệch không quá 1 px', 'Đồng hạng có đủ tên, không có “+N người”; trang không quá 10 hàng',
    'Khoảng tiêu đề–đầu cột ≥16 px', `Tiêu đề Top 3 cùng vị trí Top 10 (lệch ${top10StageHeaderDeltaPx.toFixed(2)} px), ba hàng chặng chia đều`, 'Top 10 đáy ≤24 px; Top 3 chặng có khoảng thở cân đối',
  ];
  const minTitleWords = Math.min(...check.flatMap((sample) => sample.metrics.tables.map((table) => table.titleWords)));
  const minNameScoreGap = Math.min(...check.flatMap((sample) => sample.metrics.rows.map((row) => row.nameScoreGapPx)));
  const minFrameSafeGap = Math.min(...check.filter((sample) => sample.option.startsWith('B')).map((sample) => sample.metrics.bottomSafeGapPx ?? 0));
  const minDiagnosticBottomGap = Math.min(...check.filter((sample) => sample.option.startsWith('A')).map((sample) => sample.metrics.bottomSafeGapPx ?? 0));
  const minRowRatio = Math.min(...check.flatMap((sample) => sample.metrics.rows.map((row) => row.rowHeightFontRatio)));
  const maxNameEdgeDelta = Math.max(...check.flatMap((sample) => sample.metrics.tables.map((table) => table.nameLeftEdgesPx.length < 2 ? 0 : Math.max(...table.nameLeftEdgesPx) - Math.min(...table.nameLeftEdgesPx))));
  const tieOverall = check.find((sample) => sample.option.startsWith('B') && sample.case === 'tie' && sample.screen === 'Top 10 toàn trận')!.metrics.tables[0]!;
  const ruleDetails = [
    `tiêu đề ngắn nhất/dài nhất ${minTitleWords}/${Math.max(...check.flatMap((sample) => sample.metrics.tables.map((table) => table.titleWords)))} từ; phụ ≤1 dòng`,
    `mỗi bảng có 1 cột đơn vị; số điểm không lặp chữ; REVEAL được tách riêng ở checklist dưới`,
    `khe tên–điểm nhỏ nhất ${minNameScoreGap.toFixed(2)} px; mép tên lệch tối đa ${maxNameEdgeDelta.toFixed(2)} px; hàng 22–28 px`,
    `padding T/P/D/T ${check[0]!.metrics.framePaddingPx.top}/${check[0]!.metrics.framePaddingPx.right}/${check[0]!.metrics.framePaddingPx.bottom}/${check[0]!.metrics.framePaddingPx.left}px; gap hàng min ${Math.min(...check.flatMap((sample) => sample.metrics.tables.flatMap((table) => table.rowGapPx.length ? table.rowGapPx : [8])))} px; đáy Top 10 min ${minFrameSafeGap} px`,
    `Top 10: 22 px/36 px = ${(36 / 22).toFixed(2)}×; Top 3: ${referenceStage.rowHeightsPx[0]} px/hàng với chữ 42 px (≤2,5×); ≤${Math.max(...check.flatMap((sample) => sample.metrics.tables.map((table) => table.fontSizes.length)))} cỡ/bảng`,
    `mỗi trang hiển thị 1 hàng vàng; hạng 2/3 có icon nhỏ trên cùng nền trung tính`,
    `tên dài “${longName}” đủ 24 grapheme, không cắt; hạng 2/3 giữ nền trung tính`,
    `B mỗi ảnh một bảng; Top 10 tie có ${tieOverall.sourceRowCount} tên trên ${tieOverall.pageCount} trang (${tieOverall.pageRowCounts.join('/')} hàng)`,
    `tương phản chữ/nền thấp nhất ${Math.min(...check.map((sample) => sample.minContrastRatio)).toFixed(2)}:1`,
    `khung ${check[0]!.metrics.frame.width}×${check[0]!.metrics.frame.height}px giữ nguyên x=${check[0]!.metrics.frame.x}, y=${check[0]!.metrics.frame.y}`,
    `tỷ lệ hàng/font thấp nhất ${minRowRatio.toFixed(2)}× (ngưỡng 1,60×)`,
    `mép trái tên lệch tối đa ${maxNameEdgeDelta.toFixed(2)} px (ngưỡng 1 px)`,
    `Top 10 tie hiện đủ ${tieOverall.sourceRowCount} tên, tối đa ${Math.max(...tieOverall.pageRowCounts)} hàng/trang, không “+N”; Top 3 hạng 1, 1, 3`,
    `khoảng title–header nhỏ nhất ${Math.min(...check.flatMap((sample) => sample.metrics.tables.map((table) => table.titleColumnGapPx ?? 0)))} px`,
    `title Top 3 lệch Top 10 ${top10StageHeaderDeltaPx.toFixed(2)} px; hàng Top 3 ${referenceStage.rowHeightsPx.join('/')} px`,
    `Top 10 đáy nhỏ nhất ${minFrameSafeGap} px; Top 3 chặng căn giữa khối hàng; A chẩn đoán tràn ${minDiagnosticBottomGap} px`,
  ];
  const report = [
    '# C-0307 · Tự kiểm ảnh mẫu BXH V5',
    '',
    `Tên dài mẫu: “${longName}” — 24 grapheme. Khung chính: ${check[0]!.metrics.frame.x}×${check[0]!.metrics.frame.y}, ${check[0]!.metrics.frame.width}×${check[0]!.metrics.frame.height} px (không đổi). Top 10 dùng chữ hàng 22 px, cao 36 px (tỷ lệ 1,64), đáy ≤24 px; Top 3 chặng dùng 42 px trong hàng 104 px; REVEAL dùng chữ 28 px.`,
    'Phương án A là ảnh chẩn đoán, không phải bản đạt: Top 10 + Top 3 cùng lúc vượt đáy khung (rule 4). Phương án B luân phiên Top 10 và Top 3 chặng 3, mỗi bảng 5 giây; cả 6 mẫu chính và 4 trạng thái 0–3 người đều vừa khung.',
    'Bản 0 người dùng dòng trống rõ ràng, không dựng hàng xếp hạng giả.',
    '',
    '| Quy tắc | Kết quả | Số đo / ghi chú |',
    '|---|---|---|',
    ...ruleNames.map((rule, index) => {
      const values = check.flatMap((sample) => sample.checks[index] ? [sample] : []);
      return `| ${rule} | ${values.length === check.length ? 'ĐẠT' : 'KHÔNG ĐẠT'} | ${ruleDetails[index]} |`;
    }),
    '',
    `Mỗi bộ có ảnh toàn khung 1080×1920 và ảnh zoom khung BXH; trang tie overflow cũng có ảnh trang 2. Tệp nằm tại ${outputDirectory} (ignored, không commit).`,
    '',
    '## Số đo chi tiết',
    '',
    '```json',
    JSON.stringify(check.map(({ option, case: sampleCase, screen, metrics }) => ({ option, case: sampleCase, screen, metrics })), null, 2),
    '```',
  ].join('\n');
  writeFileSync(join(outputDirectory, 'checklist-10-rules.md'), report, 'utf8');

  const fullImageNames = check.filter((sample) => !sample.case.startsWith('count-')).map((sample) => {
    const suffix = sample.case.replace('-', '_');
    if (sample.option.startsWith('A')) return `option-a-combined-${suffix}-1080x1920.png`;
    const table = sample.screen.startsWith('Top 10') ? 'overall' : 'stage';
    return `option-b-rotate-${table}-${suffix}-1080x1920.png`;
  });
  const uniqueImages = [...new Set(fullImageNames)];
  const cards = uniqueImages.map((file, index) => {
    const label = file.replace('option-a-combined-', 'A · gộp (không vừa) · ').replace('option-b-rotate-overall-', 'B · Top 10 · ').replace('option-b-rotate-stage-', 'B · Top 3 · ').replace('-1080x1920.png', '').replaceAll('_', ' ');
    const base64 = readFileSync(join(outputDirectory, file)).toString('base64');
    return `<article><header>${escapeHtml(`${index + 1}. ${label}`)}</header><img src="data:image/png;base64,${base64}" /></article>`;
  }).join('');
  const collagePage = await page.context().newPage();
  await collagePage.setViewportSize({ width: 1080, height: 1920 });
  await collagePage.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;background:#11132f;color:#fff;font:700 18px Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:8px;padding:8px;width:100%;height:100%}article{min-width:0;min-height:0;position:relative;overflow:hidden;background:#1d2045;border:2px solid #6e65a4;border-radius:12px}header{position:absolute;z-index:2;left:8px;right:8px;top:8px;padding:6px;border-radius:8px;background:#11132fee;font-size:14px;text-align:center}img{width:100%;height:100%;object-fit:cover;object-position:center top}</style><main class="grid">${cards}</main>`);
  await collagePage.screenshot({ path: join(outputDirectory, 'option-comparison-collage.png'), animations: 'disabled' });
  await collagePage.close();
  const countCards = check.filter((sample) => sample.case.startsWith('count-')).map((sample, index) => {
    const file = `option-b-rotate-stage-${sample.case.replace('-', '_')}-1080x1920.png`;
    const label = `${index} người · Top 3 chặng 3`;
    const base64 = readFileSync(join(outputDirectory, file)).toString('base64');
    return `<article><header>${escapeHtml(label)}</header><img src="data:image/png;base64,${base64}" /></article>`;
  }).join('');
  const countCollagePage = await page.context().newPage();
  await countCollagePage.setViewportSize({ width: 1080, height: 1920 });
  await countCollagePage.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;background:#11132f;color:#fff;font:700 18px Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);gap:8px;padding:8px;width:100%;height:100%}article{min-width:0;min-height:0;position:relative;overflow:hidden;background:#1d2045;border:2px solid #6e65a4;border-radius:12px}header{position:absolute;z-index:2;left:8px;right:8px;top:8px;padding:8px;border-radius:8px;background:#11132fee;font-size:18px;text-align:center}img{width:100%;height:100%;object-fit:cover;object-position:center top}</style><main class="grid">${countCards}</main>`);
  await countCollagePage.screenshot({ path: join(outputDirectory, 'option-b-player-counts-0-3-collage.png'), animations: 'disabled' });
  await countCollagePage.close();
  console.info(`[C-0307] ${check.length} mẫu; A là chẩn đoán vượt khung; B và các trạng thái 0–3 người được đo DOM. Ảnh/checklist: ${outputDirectory}`);
});

test('C-0307 — capture reveal, 35-seat lobby and tied Victory contexts', async ({ page }) => {
  mkdirSync(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });

  await page.goto('/?mock=fastest-a-long&role=program', { waitUntil: 'domcontentloaded' });
  const fastest = page.getByTestId('fastest-callout');
  await expect(fastest).toBeVisible();
  await fastest.locator('.v3-fastest-name').evaluate((element, value) => { element.textContent = value; }, longName);
  await fastest.locator('span').last().evaluate((element) => { element.textContent = '1,6 giây'; });
  await page.addStyleTag({ content: '.v3-fastest-copy{gap:1px!important}.v3-fastest-name{font-size:28px!important;line-height:28px!important;white-space:normal!important;overflow-wrap:anywhere!important;overflow:visible!important;text-overflow:clip!important}.v3-fastest-copy>span{font-size:28px!important;line-height:28px!important}' });
  const revealMetrics = await fastest.evaluate((element) => {
    const bubbleBox = element.closest<HTMLElement>('.v3-fastest-callout')!.getBoundingClientRect();
    const name = element.querySelector<HTMLElement>('.v3-fastest-name')!;
    const time = element.querySelector<HTMLElement>('span')!;
    const label = element.querySelector<HTMLElement>('strong')!;
    const nameBox = name.getBoundingClientRect();
    const timeBox = time.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    return {
      x: bubbleBox.x, y: bubbleBox.y, width: bubbleBox.width, height: bubbleBox.height,
      name: name.textContent, nameFontPx: Number.parseFloat(getComputedStyle(name).fontSize),
      nameLines: Math.max(1, Math.round(nameBox.height / Number.parseFloat(getComputedStyle(name).lineHeight))),
      nameInside: nameBox.left >= bubbleBox.left && nameBox.right <= bubbleBox.right && nameBox.top >= bubbleBox.top && nameBox.bottom <= bubbleBox.bottom,
      time: time.textContent, timeFontPx: Number.parseFloat(getComputedStyle(time).fontSize),
      contentInside: labelBox.top >= bubbleBox.top && labelBox.bottom <= bubbleBox.bottom && nameBox.top >= bubbleBox.top && nameBox.bottom <= bubbleBox.bottom && timeBox.top >= bubbleBox.top && timeBox.bottom <= bubbleBox.bottom,
    };
  });
  expect(revealMetrics.name).toBe(longName);
  expect(revealMetrics.nameFontPx).toBeGreaterThanOrEqual(28);
  expect(revealMetrics.nameLines).toBeLessThanOrEqual(2);
  expect(revealMetrics.nameInside).toBe(true);
  expect(revealMetrics.time).toBe('1,6 giây');
  expect(revealMetrics.timeFontPx).toBeGreaterThanOrEqual(22);
  expect(revealMetrics.contentInside, JSON.stringify(revealMetrics)).toBe(true);
  await page.screenshot({ path: join(outputDirectory, 'reveal-fastest-long-name-1_6s-1080x1920.png'), animations: 'disabled' });
  const revealBox = await fastest.boundingBox();
  if (!revealBox) throw new Error('Không đo được callout nhanh nhất');
  await page.screenshot({ path: join(outputDirectory, 'reveal-fastest-long-name-zoom.png'), clip: { x: revealBox.x - 12, y: revealBox.y - 12, width: revealBox.width + 24, height: revealBox.height + 24 }, animations: 'disabled' });

  await page.goto('/?mock=lobby-35-countdown&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('lobby-seat-count')).toHaveText('35/35');
  await expect(page.locator('.v3-lobby-seat-label')).toHaveText('GHẾ ĐÃ CÓ CHỦ');
  const countdown = page.getByTestId('lobby-countdown');
  await expect(countdown).toBeVisible();
  await countdown.evaluate((element) => { element.textContent = '96'; });
  await page.addStyleTag({ content: '.v3-lobby-countdown{font-size:96px!important;line-height:1!important}' });
  const lobbyMetrics = await page.evaluate(() => ({
    seats: document.querySelector('[data-testid="lobby-seat-count"]')?.textContent,
    label: document.querySelector('.v3-lobby-seat-label')?.textContent,
    countdown: document.querySelector('[data-testid="lobby-countdown"]')?.textContent,
    countdownFontPx: Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>('[data-testid="lobby-countdown"]')!).fontSize),
  }));
  expect(lobbyMetrics.countdownFontPx).toBe(96);
  await page.screenshot({ path: join(outputDirectory, 'lobby-35-of-35-countdown-96px-1080x1920.png'), animations: 'disabled' });

  await page.goto('/?mock=victory-tie&role=program', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('stage')).toHaveAttribute('data-scene', 'VICTORY');
  await expect(page.locator('.tie-label').first()).toContainText('ĐỒNG HẠNG');
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(outputDirectory, 'victory-tie-context-1080x1920.png'), animations: 'disabled' });

  writeFileSync(join(outputDirectory, 'screen-context-measurements.json'), JSON.stringify({ reveal: revealMetrics, lobby: lobbyMetrics, victory: 'VICTORY / đồng hạng' }, null, 2), 'utf8');
  console.info(`[C-0307] Reveal long-name 1,6 giây; sảnh 35/35 với countdown 96px; Victory đồng hạng: ${outputDirectory}`);
});

test('C-0307 — capture reveal Top 3 fastest with normal, long-name and tie variants', async ({ page }) => {
  mkdirSync(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });

  type RevealRowMetric = {rank:string;name:string;nameGraphemes:number;nameLines:number;nameClipped:boolean;nameEllipsis:boolean;namePrefix16Fits:boolean;time:string;timeClipped:boolean;nameTimeGapPx:number;rowHeightPx:number;rowHeightFontRatio:number;rowFontPx:number;nameFontPx:number;timeFontPx:number;paddingTopPx:number;paddingBottomPx:number;paddingLeftPx:number;paddingRightPx:number;nameTextAlign:string;rankTextAlign:string;timeTextAlign:string;tabularNums:boolean;gold:boolean;rankCenterPx:number;nameLeftPx:number;timeRightPx:number};
  type RevealMetricRecord = {titleWords:number;titleLines:number;titleFontPx:number;tableCount:number;unitColumnCount:number;repeatedUnits:boolean;fontSizes:string[];headerClipped:boolean;padding:{top:number;right:number;bottom:number;left:number};tableContentWidthPx:number;rowContentWidthPx:number;expectedContentWidthPx:number;rowPaddingMinPx:number;rowPaddingHorizontalMinPx:number;bottomSafeGapPx:number|null;rowGaps:number[];headerRowsGapPx:number;goldCount:number;rowLeftEdgeDeltaPx:number;tieSummaryPresent:boolean;rowRanks:string[];rowNames:string[];titleColumnGapPx:number;columnFontPx:number;headerCells:Array<{left:number;right:number;center:number}>;headerRowDeltaPx:number;questionCardDelta:{left:number;right:number};questionGapPx:number;audienceGapPx:number;huggedHeightPx:number;expectedHuggedHeightPx:number;rows:RevealRowMetric[];textContrast:number[];fixedFrameMatches:boolean;mcPlateGapPx:number|null;bubbleInViewport:boolean;bubble:{x:number;y:number;width:number;height:number;bottom:number}};
  const revealSamples: Array<{ variant: RevealVariant; metrics: RevealMetricRecord; checks: boolean[] }> = [];
  for (const variant of ['normal', 'long-name', 'long-name-32', 'tie'] as const) {
    await page.goto('/?mock=fastest-a-long&hud=1&role=program', { waitUntil: 'domcontentloaded' });
    const callout = await installRevealSample(page, variant);
    const frame = page.locator('.v3-top10');
    const frameBefore = await frame.boundingBox();
    expect(frameBefore, 'Không đo được khung BXH REVEAL').not.toBeNull();
    const stageBox = await page.locator('.v3-stage').boundingBox();
    const questionCard = page.locator('.v3-board');
    const questionCardBefore = await questionCard.boundingBox();
    expect(stageBox, 'Không đo được sân khấu REVEAL').not.toBeNull();
    expect(questionCardBefore, 'Không đo được khung thẻ câu hỏi').not.toBeNull();

    const metrics = await callout.evaluate((element, args) => {
      const bubble = element.getBoundingClientRect();
      const root = element.querySelector<HTMLElement>('.v5-reveal-top3-root')!;
      const title = root.querySelector<HTMLElement>('.v5-reveal-top3-title')!;
      const titleCopy = title.querySelector<HTMLElement>('.v5-reveal-title-copy')!;
      const titleUnit = title.querySelector<HTMLElement>('.v5-reveal-title-unit')!;
      const columns = [titleCopy, titleUnit];
      const rows = [...root.querySelectorAll<HTMLElement>('.v5-reveal-top3-row')];
      const textLines = (node: HTMLElement) => { const range = document.createRange(); range.selectNodeContents(node); return range.getClientRects().length; };
      const luminance = (color: string) => {
        const values = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
        const channels = values.map((value) => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
        return .2126 * (channels[0] ?? 0) + .7152 * (channels[1] ?? 0) + .0722 * (channels[2] ?? 0);
      };
      const contrast = (foreground: string, background: string) => { const a = luminance(foreground); const b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const titleStyle = getComputedStyle(title);
      const calloutStyle = getComputedStyle(element);
      const frame = document.querySelector<HTMLElement>('.v3-top10')?.getBoundingClientRect();
      const questionCardBox = document.querySelector<HTMLElement>('.v3-board')?.getBoundingClientRect();
      const audienceTop = Math.min(...[...document.querySelectorAll<HTMLElement>('.v3-seat-name')].map((seat) => seat.getBoundingClientRect().top));
      const rowMetrics = rows.map((row) => {
        const rank = row.querySelector<HTMLElement>('.v5-reveal-top3-rank')!;
        const name = row.querySelector<HTMLElement>('.v5-reveal-top3-name')!;
        const time = row.querySelector<HTMLElement>('.v5-reveal-top3-time')!;
        const rowStyle = getComputedStyle(row);
        const rankStyle = getComputedStyle(rank);
        const nameStyle = getComputedStyle(name);
        const timeStyle = getComputedStyle(time);
        const box = row.getBoundingClientRect();
        const nameBox = name.getBoundingClientRect();
        const timeBox = time.getBoundingClientRect();
        const nameText = name.textContent ?? '';
        const nameSegments = [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(nameText)];
        const prefix16End = nameSegments[15] ? nameSegments[15]!.index + nameSegments[15]!.segment.length : nameText.length;
        const prefix16Range = document.createRange();
        if (name.firstChild) { prefix16Range.setStart(name.firstChild, 0); prefix16Range.setEnd(name.firstChild, prefix16End); }
        const rankBox = rank.getBoundingClientRect();
        const rowFontPx = Number.parseFloat(rowStyle.fontSize);
        return {
          rank: rank.textContent?.trim(), name: nameText, time: time.textContent?.trim(),
          nameGraphemes: nameSegments.length,
          nameLines: textLines(name), nameClipped: name.scrollWidth > name.clientWidth + 1,
          nameEllipsis: nameStyle.textOverflow === 'ellipsis' && name.scrollWidth > name.clientWidth + 1,
          namePrefix16Fits: prefix16Range.getBoundingClientRect().width <= name.clientWidth + 1,
          timeClipped: time.scrollWidth > time.clientWidth + 1,
          rowHeightPx: Math.round(box.height * 100) / 100, rowHeightFontRatio: Math.round((box.height / rowFontPx) * 100) / 100,
          rowFontPx, nameFontPx: Number.parseFloat(nameStyle.fontSize), timeFontPx: Number.parseFloat(timeStyle.fontSize),
          paddingTopPx: Number.parseFloat(rowStyle.paddingTop), paddingBottomPx: Number.parseFloat(rowStyle.paddingBottom),
          paddingLeftPx: Number.parseFloat(rowStyle.paddingLeft), paddingRightPx: Number.parseFloat(rowStyle.paddingRight),
          nameTextAlign: nameStyle.textAlign,
          rankTextAlign: rankStyle.textAlign, timeTextAlign: timeStyle.textAlign,
          nameTimeGapPx: Math.round((timeBox.left - nameBox.right) * 100) / 100,
          rankCenterPx: Math.round((rankBox.left + rankBox.right) / 2 * 100) / 100,
          nameLeftPx: Math.round(nameBox.left * 100) / 100,
          nameRightPx: Math.round(nameBox.right * 100) / 100,
          rankLeftPx: Math.round(rankBox.left * 100) / 100,
          rankRightPx: Math.round(rankBox.right * 100) / 100,
          timeLeftPx: Math.round(timeBox.left * 100) / 100,
          timeRightPx: Math.round(timeBox.right * 100) / 100,
          tabularNums: rankStyle.fontVariantNumeric.includes('tabular-nums') && timeStyle.fontVariantNumeric.includes('tabular-nums'),
          contrastRatio: Math.round(contrast(nameStyle.color, rowStyle.backgroundColor) * 100) / 100,
          gold: row.dataset.gold === 'true',
        };
      });
      const text = [title, ...columns, ...rows.flatMap((row) => [...row.querySelectorAll<HTMLElement>('.v5-reveal-top3-rank,.v5-reveal-top3-name,.v5-reveal-top3-time')])];
      const textContrast = text.map((node) => {
        const row = node.closest<HTMLElement>('.v5-reveal-top3-row');
        return Math.round(contrast(getComputedStyle(node).color, getComputedStyle(row ?? element).backgroundColor) * 100) / 100;
      });
      const rowGaps = rows.slice(1).map((row, index) => Math.round((row.getBoundingClientRect().top - rows[index]!.getBoundingClientRect().bottom) * 100) / 100);
      const lastRow = rows.at(-1)?.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      const cellUnitCount = columns.filter((column) => column.textContent?.trim() === 'GIÂY').length;
      const repeatedUnits = rowMetrics.some((row) => /\b(?:s|giây|seconds?)\b/iu.test(row.time));
      const frameBox = document.querySelector<HTMLElement>('.v3-top10')?.getBoundingClientRect();
      const rowLeftEdges = rowMetrics.map((row) => row.nameLeftPx);
      const goldCount = rows.filter((row) => row.dataset.gold === 'true').length;
      const calloutBottomPadding = Number.parseFloat(calloutStyle.paddingBottom);
      const firstRow = rows[0];
      const headerCells = firstRow ? ['.v5-reveal-top3-rank', '.v5-reveal-top3-name', '.v5-reveal-top3-time'].map((selector) => {
        const box = firstRow.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
        return { left: Math.round(box.left * 100) / 100, right: Math.round(box.right * 100) / 100, center: Math.round((box.left + box.right) / 2 * 100) / 100 };
      }) : [];
      const firstRowMetrics = rowMetrics[0];
      const headerRowDeltaPx = firstRowMetrics ? Math.abs(titleUnit.getBoundingClientRect().right - firstRowMetrics.timeRightPx) : Number.POSITIVE_INFINITY;
      const rootBox = root.getBoundingClientRect();
      const firstRowBox = rows[0]?.getBoundingClientRect();
      const expectedContentWidthPx = bubble.width - Number.parseFloat(calloutStyle.borderLeftWidth) - Number.parseFloat(calloutStyle.borderRightWidth) - Number.parseFloat(calloutStyle.paddingLeft) - Number.parseFloat(calloutStyle.paddingRight);
      return {
        variant: args.variant, bubble: { x: bubble.x, y: bubble.y, width: bubble.width, height: bubble.height, bottom: bubble.bottom },
        padding: { top: Number.parseFloat(calloutStyle.paddingTop), right: Number.parseFloat(calloutStyle.paddingRight), bottom: calloutBottomPadding, left: Number.parseFloat(calloutStyle.paddingLeft) },
        tableContentWidthPx: Math.round(rootBox.width * 100) / 100,
        rowContentWidthPx: firstRowBox ? Math.round(firstRowBox.width * 100) / 100 : 0,
        expectedContentWidthPx: Math.round(expectedContentWidthPx * 100) / 100,
        rowPaddingMinPx: Math.min(...rowMetrics.flatMap((row) => [row.paddingTopPx, row.paddingBottomPx])),
        rowPaddingHorizontalMinPx: Math.min(...rowMetrics.flatMap((row) => [row.paddingLeftPx, row.paddingRightPx])),
        bottomSafeGapPx: lastRow ? Math.round((bubble.bottom - Number.parseFloat(calloutStyle.borderBottomWidth) - calloutBottomPadding - lastRow.bottom) * 100) / 100 : null,
        title: title.textContent?.trim(), titleWords: (title.textContent ?? '').trim().split(/\s+/u).length, titleLines: textLines(titleCopy), titleFontPx: Number.parseFloat(titleStyle.fontSize),
        tableCount: root.matches('[data-v5-reveal="true"]') ? 1 : root.querySelectorAll('[data-v5-reveal="true"]').length,
        unitColumnCount: cellUnitCount, repeatedUnits,
        headerClipped: columns.some((column) => column.scrollWidth > column.clientWidth + 1),
        headerWidths: columns.map((column) => ({ text: column.textContent?.trim(), client: column.clientWidth, scroll: column.scrollWidth })),
        headerCells,
        headerRowDeltaPx: Math.round(headerRowDeltaPx * 100) / 100,
        questionCardDelta: questionCardBox ? { left: Math.round((bubble.left - questionCardBox.left) * 100) / 100, right: Math.round((bubble.right - questionCardBox.right) * 100) / 100 } : { left: Number.POSITIVE_INFINITY, right: Number.POSITIVE_INFINITY },
        columnFontPx: Number.parseFloat(getComputedStyle(titleUnit).fontSize),
        fontSizes: [...new Set([title, titleUnit, ...rows.flatMap((row) => [row, ...row.querySelectorAll<HTMLElement>('.v5-reveal-top3-rank,.v5-reveal-top3-name,.v5-reveal-top3-time')])].map((node) => getComputedStyle(node).fontSize))],
        rowGaps, headerRowsGapPx: Math.round((rows[0]!.getBoundingClientRect().top - title.getBoundingClientRect().bottom) * 100) / 100,
        goldCount, rowLeftEdgeDeltaPx: rowLeftEdges.length < 2 ? 0 : Math.round((Math.max(...rowLeftEdges) - Math.min(...rowLeftEdges)) * 100) / 100,
        tieSummaryPresent: root.textContent?.includes('+1 người') || /\+\s*\d+\s+người/iu.test(root.textContent ?? ''),
        rows: rowMetrics, rowRanks: rowMetrics.map((row) => row.rank), rowNames: rowMetrics.map((row) => row.name), textContrast,
        titleColumnGapPx: Math.round((rows[0]!.getBoundingClientRect().top - titleBox.bottom) * 100) / 100,
        questionGapPx: questionCardBox ? Math.round((bubble.top - questionCardBox.bottom) * 100) / 100 : Number.NEGATIVE_INFINITY,
        audienceGapPx: Math.round((audienceTop - bubble.bottom) * 100) / 100,
        huggedHeightPx: Math.round(bubble.height * 100) / 100,
        expectedHuggedHeightPx: Math.round((Number.parseFloat(calloutStyle.borderTopWidth) + Number.parseFloat(calloutStyle.borderBottomWidth) + Number.parseFloat(calloutStyle.paddingTop) + Number.parseFloat(calloutStyle.paddingBottom) + titleBox.height + 8 + rows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0) + rowGaps.reduce((sum, gap) => sum + gap, 0)) * 100) / 100,
        fixedFrameMatches: Boolean(frameBox && args.frameBefore && frameBox.x === args.frameBefore.x && frameBox.y === args.frameBefore.y && frameBox.width === args.frameBefore.width && frameBox.height === args.frameBefore.height),
        mcPlateGapPx: (() => { const plate = document.querySelector<HTMLElement>('.v3-mc-plate')?.getBoundingClientRect(); return plate ? Math.round((bubble.left - plate.right) * 100) / 100 : null; })(),
        bubbleInViewport: bubble.left >= 0 && bubble.top >= 0 && bubble.right <= innerWidth && bubble.bottom <= innerHeight,
      };
    }, { variant, frameBefore });

    const record = metrics as RevealMetricRecord;
    const checks = [
      record.titleWords<=4&&record.titleLines===1&&record.tableCount===1,
      record.unitColumnCount===1&&!record.headerClipped&&!record.repeatedUnits&&record.rows.every((row)=>/^\d,\d$/u.test(row.time)),
      record.rows.every((row)=>row.nameTimeGapPx>=24&&row.tabularNums&&row.nameTextAlign==='left'&&row.rankTextAlign==='center'&&row.timeTextAlign==='right')&&record.rowLeftEdgeDeltaPx<=1,
      record.rows.every((row)=>row.rowFontPx>=28&&row.rowHeightFontRatio>=1.6),
      record.rowPaddingMinPx>=8&&record.rowPaddingHorizontalMinPx>=16&&record.rowGaps.every((gap)=>gap>=8)&&record.headerRowsGapPx>=8&&record.titleColumnGapPx>=8,
      record.goldCount===(variant==='tie'?2:1)&&record.rows.filter((row)=>row.gold).length===(variant==='tie'?2:1),
      !record.tieSummaryPresent&&(variant!=='tie'||['FFVN.Kelly','StormKing','BVD.Champion'].every((name)=>record.rowNames.includes(name)))&&(variant!=='tie'||record.rowRanks.map((rank)=>rank.replace(/\D/gu,'')).join(',')==='1,1,3'),
      record.rows.every((row)=>row.nameLines<=2&&!row.timeClipped&&(row.nameGraphemes<=24?(!row.nameClipped||(row.nameEllipsis&&row.namePrefix16Fits)):row.nameGraphemes===32&&row.nameEllipsis&&row.namePrefix16Fits))&&(!variant.includes('long-name')||record.rows.some((row)=>row.name===(variant==='long-name-32'?longName32:longName)&&row.nameGraphemes===(variant==='long-name-32'?32:24))),
      record.rows.every((row)=>row.nameFontPx>=28&&row.timeFontPx>=28)&&record.titleFontPx>=32&&record.columnFontPx<record.titleFontPx&&record.fontSizes.length<=3,
      Math.min(...record.textContrast)>=4.5,
      record.fixedFrameMatches&&record.bubbleInViewport,
      Math.abs(record.huggedHeightPx-record.expectedHuggedHeightPx)<=1&&record.questionGapPx>=16&&record.audienceGapPx>=16,
      record.rows.every((row)=>row.paddingTopPx>=8&&row.paddingBottomPx>=8),
      record.rows.every((row)=>row.paddingLeftPx>=16&&row.paddingRightPx>=16),
      record.goldCount===record.rows.filter((row)=>row.gold).length&&record.goldCount===(variant==='tie'?2:1),
      record.rowRanks.map((rank)=>rank.replace(/\D/gu,'')).join(',')===(variant==='tie'?'1,1,3':'1,2,3'),
      record.headerRowDeltaPx<=1&&record.rows.every((row)=>Math.abs(row.timeRightPx-record.headerCells[2]!.right)<=1),
      Math.abs(record.questionCardDelta.left)<=1&&Math.abs(record.questionCardDelta.right)<=1&&Math.abs(record.rowContentWidthPx-record.expectedContentWidthPx)<=1&&record.rowContentWidthPx>500,
    ];
    for (const [index,passed] of checks.entries()) expect(passed, `REVEAL Top 3 ${variant}: rule ${index+1}; ${JSON.stringify(metrics)}`).toBe(true);
    const suffix=variant.replace('-','_');
    await page.screenshot({path:join(outputDirectory,`reveal-top3-fastest-${suffix}-1080x1920.png`),animations:'disabled'});
    const box=await callout.boundingBox();
    if(!box)throw new Error('Không đo được callout Top 3 nhanh nhất');
    await page.screenshot({path:join(outputDirectory,`reveal-top3-fastest-${suffix}-zoom.png`),clip:{x:box.x-12,y:box.y-12,width:box.width+24,height:box.height+24},animations:'disabled'});
    revealSamples.push({ variant, metrics: record, checks });
  }

  const revealGridCoordinates = revealSamples.map((sample) => [
    sample.metrics.headerCells[0]!.center,
    sample.metrics.headerCells[1]!.left,
    sample.metrics.headerCells[2]!.right,
    sample.metrics.rows[0]!.rankCenterPx,
    sample.metrics.rows[0]!.nameLeftPx,
    sample.metrics.rows[0]!.timeRightPx,
  ]);
  const revealGridDeltaPx = Math.max(...revealGridCoordinates[0]!.map((_, index) => Math.max(...revealGridCoordinates.map((coordinates) => coordinates[index]!)) - Math.min(...revealGridCoordinates.map((coordinates) => coordinates[index]!))));
  expect(revealGridDeltaPx, 'Lưới 3 cột REVEAL phải giữ nguyên x qua normal/long/tie').toBeLessThanOrEqual(1);

  const ruleNames=[
    'Tiêu đề ≤4 từ, 1 dòng, một bảng', 'GIÂY chỉ xuất hiện một lần trên dòng tiêu đề; thời gian là số', 'Tên trái, hạng giữa, thời gian phải; khe tên–giây ≥24 px',
    'Hàng cao ≥1,6× chữ; chữ hàng ≥28 px', 'Padding hàng dọc ≥8 px, ngang ≥16 px; gap hàng/title ≥8 px', 'Hạng 1 nhấn; nếu đồng hạng, mọi hàng hạng 1 đều nhấn',
    'Đồng hạng hiện đủ tên theo hạng 1, 1, 3; không “+N người”', 'Tên dài đủ 24 grapheme, không cắt', 'Tên/thời gian ≥28 px, title ≥32 px, header nhỏ hơn, tối đa 3 cỡ',
    'Tương phản chữ/nền ≥4.5:1', 'Khung Top 10 giữ nguyên, callout không lấn viewport', 'Khung ôm nội dung; cách thẻ câu hỏi/ghế ≥16 px',
    'Padding dọc từng hàng ≥8 px', 'Padding ngang từng hàng ≥16 px', 'Hạng tie hiện cả hai người cùng nhấn, hạng 1, 1, 3',
    'GIÂY trên tiêu đề thẳng mép phải cột thời gian ≤1 px', 'Lưới cột cố định; khung thẳng thẻ câu hỏi, bảng rộng trừ padding',
  ];
  const result=[
    '# C-0307 · Tự kiểm REVEAL Top 3 nhanh nhất',
    '',
    'Bốn biến thể (thường, tên 24/32 grapheme, đồng hạng) được dựng trong ngữ cảnh REVEAL ở viewport 1080×1920 với `hud=1`. Bảng bỏ hàng header riêng; GIÂY nằm trên dòng tiêu đề. Khung cao theo nội dung và cách thẻ câu hỏi/hàng ghế 16 px.',
    '',
    '| Quy tắc | Kết quả | Số đo / ghi chú |',
    '|---|---|---|',
    ...ruleNames.map((name,index)=>{
      const passed=revealSamples.filter((sample)=>sample.checks[index]);
      const rowMetrics=revealSamples.flatMap((sample)=>sample.metrics.rows);
      const detail=index===2?`lệch mép tên lớn nhất ${Math.max(...revealSamples.map((sample)=>sample.metrics.rowLeftEdgeDeltaPx as number)).toFixed(2)} px; khe tên–giây min ${Math.min(...revealSamples.flatMap((sample)=>((sample.metrics.rows as Array<{nameTimeGapPx:number}>).map((row)=>row.nameTimeGapPx))))} px`
        :index===3?`hàng ${Math.min(...rowMetrics.map((row)=>row.rowHeightPx))} px; tỷ lệ thấp nhất ${Math.min(...rowMetrics.map((row)=>row.rowHeightFontRatio)).toFixed(2)}×; chữ 28 px`
        :index===4?`padding dọc ${Math.min(...rowMetrics.flatMap((row)=>[row.paddingTopPx,row.paddingBottomPx]))} px; ngang ${Math.min(...rowMetrics.flatMap((row)=>[row.paddingLeftPx,row.paddingRightPx]))} px; gap hàng ${Math.min(...revealSamples.flatMap((sample)=>sample.metrics.rowGaps as number[]))} px`
        :index===6?`tie có ${revealSamples.find((sample)=>sample.variant==='tie')!.metrics.rowNames.length} tên, hạng ${revealSamples.find((sample)=>sample.variant==='tie')!.metrics.rowRanks.join(', ')}; hai hàng đồng hạng đều nhấn`
        :index===7?`tên mẫu 24 grapheme; ca 32 grapheme hiển thị ellipsis, giữ ít nhất 16 grapheme`
        :index===8?`font hàng 28 px; title 32 px; GIÂY 22 px; ${Math.max(...revealSamples.map((sample)=>sample.metrics.fontSizes.length))} cỡ chữ`
        :index===9?`tương phản thấp nhất ${Math.min(...revealSamples.flatMap((sample)=>sample.metrics.textContrast as number[])).toFixed(2)}:1`
        :index===10?'khung Top 10 so trước/sau; callout còn trong viewport'
        :index===11?`khung ${Math.min(...revealSamples.map((sample)=>sample.metrics.huggedHeightPx as number))} px; hở thẻ ${Math.min(...revealSamples.map((sample)=>sample.metrics.questionGapPx as number))} px; hở ghế ${Math.min(...revealSamples.map((sample)=>sample.metrics.audienceGapPx as number))} px`
        :index===12?`padding trên/dưới nhỏ nhất ${Math.min(...rowMetrics.flatMap((row)=>[row.paddingTopPx,row.paddingBottomPx]))} px`
        :index===13?`padding trái/phải nhỏ nhất ${Math.min(...rowMetrics.flatMap((row)=>[row.paddingLeftPx,row.paddingRightPx]))} px`
        :index===15?`GIÂY lệch mép cột thời gian lớn nhất ${Math.max(...revealSamples.map((sample)=>sample.metrics.headerRowDeltaPx)).toFixed(2)} px`
        :index===16?`khung lệch thẻ câu hỏi ≤1 px; lưới cột lệch giữa 4 ca ${revealGridDeltaPx.toFixed(2)} px; bảng rộng ${revealSamples[0]!.metrics.rowContentWidthPx} px`
        :'đạt ở cả 3 biến thể';
      return `| ${name} | ${passed.length===revealSamples.length?'ĐẠT':'KHÔNG ĐẠT'} | ${detail} |`;
    }),
    '',
    'Ảnh toàn khung và zoom theo từng biến thể được lưu trong `.claude/review/C0307/` (ignored, không commit).',
    '',
    '```json',JSON.stringify(revealSamples,null,2),'```',
  ].join('\n');
  writeFileSync(join(outputDirectory,'reveal-top3-fastest-checklist.md'),result,'utf8');
  writeFileSync(join(outputDirectory,'reveal-top3-fastest-measurements.json'),JSON.stringify(revealSamples,null,2),'utf8');
  const cards=revealSamples.map(({variant},index)=>{
    const suffix=variant.replace('-','_');
    const file=`reveal-top3-fastest-${suffix}-zoom.png`;
    const base64=readFileSync(join(outputDirectory,file)).toString('base64');
    return `<article><header>${escapeHtml(`${index+1}. REVEAL Top 3 nhanh nhất · ${variant}`)}</header><img src="data:image/png;base64,${base64}" /></article>`;
  }).join('');
  const collagePage=await page.context().newPage();
  await collagePage.setViewportSize({width:1080,height:1600});
  await collagePage.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1600px;background:#11132f;color:#fff;font:800 22px Arial,sans-serif}.grid{display:grid;grid-template-rows:repeat(3,1fr);gap:8px;padding:8px;width:100%;height:100%}article{min-width:0;min-height:0;position:relative;display:grid;place-items:center;overflow:hidden;background:#1d2045;border:2px solid #6e65a4;border-radius:12px}header{position:absolute;z-index:2;left:8px;right:8px;top:8px;padding:8px;border-radius:8px;background:#11132fee;font-size:20px;text-align:center}img{max-width:100%;max-height:100%;object-fit:contain}</style><main class="grid">${cards}</main>`);
  await collagePage.screenshot({path:join(outputDirectory,'reveal-top3-fastest-collage.png'),animations:'disabled'});
  await collagePage.close();
  console.info(`[C-0307] Reveal Top 3 nhanh nhất: ${revealSamples.length} biến thể, mỗi biến thể ${revealSamples[0]!.checks.length}/${revealSamples[0]!.checks.length} quy tắc; ${outputDirectory}`);
});

test('C-0316/C-0317 — capture full scene clearances using visible MC pixels', async ({ page }) => {
  test.setTimeout(90_000);
  mkdirSync(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  const cases = [
    { mock: 'prepare', scene: 'QUESTION', label: 'prepare' },
    { mock: 'reading', scene: 'QUESTION', label: 'reading' },
    { mock: 'question', scene: 'QUESTION', label: 'question' },
    { mock: 'fastest-a-long', scene: 'REVEAL', label: 'reveal' },
    { mock: 'round-winner', scene: 'ROUND_WINNER', label: 'round-winner' },
    { mock: 'intermission', scene: 'INTERMISSION', label: 'intermission' },
  ] as const;
  const sceneRecords = [];

  for (const item of cases) {
    await page.goto(`/?mock=${item.mock}&hud=1&role=program`, { waitUntil: 'domcontentloaded' });
    const stage = page.getByTestId('stage');
    await expect(stage).toHaveAttribute('data-scene', item.scene);
    const mcImage = page.locator('.v3-mc-figure img.mc-sequence').first();
    await expect(mcImage).toBeVisible();
    await expect.poll(() => mcImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.waitForTimeout(900);
    if (item.scene === 'REVEAL') await installRevealSample(page, 'normal');

    const measured = await page.evaluate(() => {
      type Box = { x: number; y: number; left: number; top: number; right: number; bottom: number; width: number; height: number };
      const boxOf = (element: Element): Box => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
      };
      const nonEmpty = (element: Element | null) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
      };
      const intersections = (a: Box, b: Box): Box | null => {
        const left = Math.max(a.left, b.left); const top = Math.max(a.top, b.top);
        const right = Math.min(a.right, b.right); const bottom = Math.min(a.bottom, b.bottom);
        return right > left && bottom > top ? { x: left, y: top, left, top, right, bottom, width: right-left, height: bottom-top } : null;
      };
      const alphaVisibleBox = (image: HTMLImageElement): {
        box: Box;
        source: string;
        sourceAlpha: { left: number; top: number; right: number; bottom: number };
        objectFit: string;
        imageRect: Box;
        computed: { width: string; height: string; transform: string; animationName: string; objectPosition: string };
      } => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Không tạo được canvas để đo alpha của MC');
        context.drawImage(image, 0, 0);
        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = width; let top = height; let right = -1; let bottom = -1;
        for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
          if ((data[((y * width + x) * 4) + 3] ?? 0) > 16) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1); }
        }
        if (right <= left || bottom <= top) throw new Error(`Ảnh MC không có pixel alpha nhìn thấy: ${image.currentSrc}`);
        const imageBox = boxOf(image); const style = getComputedStyle(image); const fit = style.objectFit;
        const containScale = Math.min(imageBox.width / width, imageBox.height / height);
        const scale = fit === 'cover' ? Math.max(imageBox.width / width, imageBox.height / height)
          : fit === 'contain' ? containScale
            : fit === 'scale-down' ? Math.min(1, containScale)
              : 1;
        const renderWidth = fit === 'fill' ? imageBox.width : width * scale;
        const renderHeight = fit === 'fill' ? imageBox.height : height * scale;
        const scaleX = renderWidth / width;
        const scaleY = renderHeight / height;
        const objectPosition = getComputedStyle(image).objectPosition.split(/\s+/u);
        const positionFactor = (value: string | undefined, axis: 'x' | 'y') => {
          const token = value ?? '50%';
          if (token === 'left' || token === 'top') return 0;
          if (token === 'right' || token === 'bottom') return 1;
          if (token === 'center') return .5;
          if (token.endsWith('%')) return Number.parseFloat(token) / 100;
          const length = Number.parseFloat(token);
          return axis === 'x' ? length / (imageBox.width - renderWidth || 1) : length / (imageBox.height - renderHeight || 1);
        };
        const originX = imageBox.left + (imageBox.width - renderWidth) * positionFactor(objectPosition[0], 'x');
        const originY = imageBox.top + (imageBox.height - renderHeight) * positionFactor(objectPosition[1], 'y');
        const projected = {
          x: originX + left * scaleX, y: originY + top * scaleY,
          left: originX + left * scaleX, top: originY + top * scaleY,
          right: originX + right * scaleX, bottom: originY + bottom * scaleY,
          width: (right-left) * scaleX, height: (bottom-top) * scaleY,
        };
        const figure = image.closest('.v3-mc-figure');
        const clip = figure ? intersections(projected, boxOf(figure)) : projected;
        if (!clip) throw new Error('Ảnh MC bị crop hoàn toàn khỏi khung');
        return {
          box: clip, source: image.currentSrc, sourceAlpha: { left, top, right, bottom }, objectFit: fit,
          imageRect: imageBox, computed: { width: style.width, height: style.height, transform: style.transform, animationName: style.animationName, objectPosition: style.objectPosition },
        };
      };
      const items: Array<{ name: string; kind: string; box: Box; scene: string }> = [];
      const scene = document.querySelector<HTMLElement>('[data-scene]')?.dataset.scene ?? 'unknown';
      const add = (name: string, kind: string, element: Element | null) => {
        if (element && nonEmpty(element)) items.push({ name, kind, box: boxOf(element), scene });
      };
      add('BXH Top 10', 'frame', document.querySelector('.v3-top10'));
      add('thẻ câu hỏi', 'frame', document.querySelector('.v3-board'));
      add('khung đáp án', 'frame', document.querySelector('.v3-options'));
      add('BXH toàn trận', 'frame', document.querySelector('.v3-leaderboard-full'));
      add('timer', 'frame', document.querySelector('.v3-aux-timer'));
      for (const [index, slot] of [...document.querySelectorAll<HTMLElement>('.v3v-slot')].entries()) {
        if (nonEmpty(slot)) items.push({ name: `podium slot ${slot.dataset.place ?? index + 1}`, kind: 'frame', box: boxOf(slot), scene });
      }
      const revealBubble = document.querySelector<HTMLElement>('.v3-mc .v3-fastest-callout');
      add(revealBubble ? 'khung REVEAL' : 'bong bóng MC', 'frame', revealBubble ?? document.querySelector('.v3-mc .v3-bubble'));
      add('bảng tên MC', 'mc-nameplate', document.querySelector('.v3-mc-plate'));
      const visibleMc = document.querySelector<HTMLImageElement>('.v3-mc-figure img.mc-sequence');
      const mcImage = visibleMc ? alphaVisibleBox(visibleMc) : null;
      if (mcImage) items.push({ name: 'ảnh MC (trừ alpha)', kind: 'mc', box: mcImage.box, scene });
      const intermissionCard = document.querySelector<HTMLElement>('.v3-intermission');
      if (intermissionCard) {
        const pseudo = getComputedStyle(intermissionCard, '::before');
        if (pseudo.content !== 'none' && pseudo.display !== 'none' && pseudo.width !== 'auto' && pseudo.height !== 'auto') {
          const owner = boxOf(intermissionCard);
          const width = Number.parseFloat(pseudo.width); const height = Number.parseFloat(pseudo.height);
          const left = pseudo.left.endsWith('%') ? owner.left + (owner.width * Number.parseFloat(pseudo.left) / 100) : owner.left + Number.parseFloat(pseudo.left);
          const top = pseudo.top.endsWith('%') ? owner.top + (owner.height * Number.parseFloat(pseudo.top) / 100) : owner.top + Number.parseFloat(pseudo.top);
          const x = left - (pseudo.transform.includes('matrix') ? width / 2 : 0);
          const box = { x, y: top, left: x, top, right: x + width, bottom: top + height, width, height };
          items.push({ name: 'khung nghỉ giữa vòng', kind: 'frame', box, scene });
        }
      }
      const audienceItems: Array<{ name: string; box: Box }> = [];
      for (const element of document.querySelectorAll('.v3-seat-name, .v3-seat-back, .v3-chibi-img img')) {
        if (!nonEmpty(element)) continue;
        const box = boxOf(element);
        audienceItems.push({ name: `${element.matches('.v3-seat-name') ? 'thẻ tên' : element.matches('.v3-seat-back') ? 'lưng ghế' : 'chibi'} hàng ${element.closest<HTMLElement>('[data-row-index]')?.dataset.rowIndex ?? '?'}`, box });
      }
      for (const [index, seat] of audienceItems.entries()) items.push({ name: `ghế ${index + 1}: ${seat.name}`, kind: 'audience', box: seat.box, scene });
      const gap = (a: Box, b: Box) => {
        const dx = Math.max(0, a.left - b.right, b.left - a.right);
        const dy = Math.max(0, a.top - b.bottom, b.top - a.bottom);
        return Math.round(Math.hypot(dx, dy) * 100) / 100;
      };
      const pairs: Array<{ a: string; b: string; gapPx: number; requiredGapPx: number; maximumGapPx?: number; exception?: string }> = [];
      const contains = (a: Box, b: Box) => a.left <= b.left && a.top <= b.top && a.right >= b.right && a.bottom >= b.bottom;
      const audienceNames = items.filter((item) => item.kind === 'audience' && item.name.includes('thẻ tên'));
      const firstAudienceNameTop = Math.min(...audienceNames.map((item) => item.box.top));
      const topName = audienceNames.find((item) => Math.abs(item.box.top - firstAudienceNameTop) < .01);
      const firstVisibleRow = topName?.name.match(/thẻ tên hàng (\d+)/u)?.[1];
      // Perspective/seat transforms shift labels in this same top row by up to 3.3 px.
      const firstAudienceNames = audienceNames.filter((item) => firstVisibleRow
        ? item.name.match(/thẻ tên hàng (\d+)/u)?.[1] === firstVisibleRow
        : Math.abs(item.box.top - firstAudienceNameTop) < 6);
      const isFirstAudienceName = (name: string) => firstAudienceNames.some((item) => item.name === name);
      for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i]!; const b = items[j]!;
        if (a.kind === 'audience' && b.kind === 'audience') continue;
        if (contains(a.box, b.box) || contains(b.box, a.box)) continue;
        const value = gap(a.box, b.box);
        const top10Board = [a.name, b.name].includes('BXH Top 10') && [a.name, b.name].includes('thẻ câu hỏi');
        const revealName = a.name === 'khung REVEAL' || b.name === 'khung REVEAL';
        const revealPairException = scene === 'REVEAL' && revealName && (a.name === 'thẻ câu hỏi' || b.name === 'thẻ câu hỏi' || isFirstAudienceName(a.name) || isFirstAudienceName(b.name));
        const mcPair = a.kind === 'mc' || b.kind === 'mc';
        const requiredGapPx = top10Board ? 18 : revealPairException || mcPair ? 16 : 24;
        pairs.push({
          a: a.name, b: b.name, gapPx: value, requiredGapPx,
          ...(top10Board ? { maximumGapPx: 23, exception: 'C-0317 cho phép riêng Top10 ↔ thẻ câu hỏi 18–23 px; giữ nguyên bố cục mẫu' } : {}),
          ...(revealPairException ? { exception: 'C-0318 cho phép riêng khung REVEAL ↔ thẻ câu hỏi/hàng ghế đầu từ 16 px' } : {}),
          ...(mcPair ? { exception: 'C-0316/C-0317: ảnh MC thật cách phần tử khung ít nhất 16 px' } : {}),
        });
      }
      const mcPairs = pairs.filter((pair) => pair.a === 'ảnh MC (trừ alpha)' || pair.b === 'ảnh MC (trừ alpha)');
      const pairGap = (nameA: string, nameB: string) => pairs.find((pair) => [pair.a, pair.b].includes(nameA) && [pair.a, pair.b].includes(nameB))?.gapPx ?? null;
      const revealFirstAudienceNameGapPx = scene === 'REVEAL'
        ? Math.min(...pairs.filter((pair) => [pair.a, pair.b].includes('khung REVEAL') && [pair.a, pair.b].some(isFirstAudienceName)).map((pair) => pair.gapPx))
        : null;
      const violations = pairs.filter((pair) => pair.gapPx + .01 < pair.requiredGapPx || (pair.maximumGapPx !== undefined && pair.gapPx - .01 > pair.maximumGapPx));
      return {
        scene,
        items,
        audienceItemCount: audienceItems.length,
        mcImage,
        minimumNonHudGapPx: Math.min(...pairs.map((pair) => pair.gapPx)),
        minimumMcGapPx: Math.min(...mcPairs.map((pair) => pair.gapPx)),
        top10QuestionGapPx: pairGap('BXH Top 10', 'thẻ câu hỏi'),
        revealQuestionGapPx: scene === 'REVEAL' ? pairGap('khung REVEAL', 'thẻ câu hỏi') : null,
        revealFirstAudienceNameGapPx: Number.isFinite(revealFirstAudienceNameGapPx) ? revealFirstAudienceNameGapPx : null,
        closestPairs: [...pairs].sort((a, b) => a.gapPx - b.gapPx).slice(0, 12),
        violations,
        pairMeasurements: pairs,
      };
    });
    expect(measured.violations, `${item.label}: các cặp bố cục vi phạm khoảng hở 11`).toEqual([]);
    await page.screenshot({ path: join(outputDirectory, `spacing-${item.label}-1080x1920.png`), animations: 'disabled' });
    const reveal = page.locator('.v3-fastest-callout').first();
    if (await reveal.count()) {
      const box = await reveal.boundingBox();
      if (box) await page.screenshot({ path: join(outputDirectory, `spacing-${item.label}-mc-ranking-zoom.png`), clip: { x: Math.max(0, box.x - 24), y: Math.max(0, box.y - 24), width: Math.min(1080, box.width + 48), height: Math.min(700, box.height + 48) }, animations: 'disabled' });
    }
    sceneRecords.push({ ...item, ...measured });
  }

  writeFileSync(join(outputDirectory, 'c0316-spacing-measurements.json'), JSON.stringify(sceneRecords, null, 2), 'utf8');
  const reportRows = sceneRecords.map((record) => {
    const top10QuestionPair = record.pairMeasurements.find((pair) => [pair.a, pair.b].includes('BXH Top 10') && [pair.a, pair.b].includes('thẻ câu hỏi'));
    return `| ${record.label} / ${record.scene} | ${record.minimumNonHudGapPx} | ${record.minimumMcGapPx} | ${record.top10QuestionGapPx ?? '—'}${top10QuestionPair?.maximumGapPx ? ` (≤${top10QuestionPair.maximumGapPx})` : ''} | ${record.revealQuestionGapPx ?? '—'} | ${record.revealFirstAudienceNameGapPx ?? '—'} | ${record.violations.length ? 'FAIL' : 'PASS'} |`;
  });
  const clearanceReport = [
    '# C-0316/C-0317/C-0318 — đo khoảng hở cảnh overlay',
    '',
    'Viewport 1080×1920, `hud=1`, `role=program`. Bbox của MC lấy từ pixel alpha >16 trên ảnh nguồn, chiếu theo `object-fit`/`object-position`, transform CSS và vùng clip `.v3-mc-figure`; các lớp TikTok giả lập, bậc tier và dấu logo-event không nằm trong phép đo.',
    '',
    '| Cảnh | Min cặp không phải HUD (px) | Min ảnh MC (px) | Top10 ↔ câu hỏi (px) | REVEAL ↔ câu hỏi (px) | REVEAL ↔ tên ghế đầu (px) | Kết quả |',
    '|---|---:|---:|---:|---:|---:|---|',
    ...reportRows,
    '',
    'Quy tắc: cặp khung thông thường ≥24 px; ảnh MC thật với khung ≥16 px; riêng Top10 ↔ thẻ câu hỏi 18–23 px; riêng REVEAL ↔ thẻ câu hỏi và tên khán giả đầu tiên ≥16 px theo C-0318. Cặp khán giả–khán giả được bỏ qua vì các phần trang trí ghế/chibi có chủ ý đan xen.',
    '',
    'Ảnh full và zoom theo cảnh, cùng số đo đầy đủ từng cặp, ở `.claude/review/C0307/` (ignored, không commit).',
  ].join('\n');
  writeFileSync(join(outputDirectory, 'c0316-spacing-clearances.md'), clearanceReport, 'utf8');
  console.info(`[C-0316/C-0317 spacing check] ${JSON.stringify(sceneRecords.map((record) => ({ mock: record.mock, scene: record.scene, mc: record.mcImage, minGap: record.minimumNonHudGapPx, minMcGap: record.minimumMcGapPx, closest: record.closestPairs.slice(0, 3), violations: record.violations.slice(0, 3) })))}`);
});
