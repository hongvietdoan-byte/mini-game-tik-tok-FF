import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const outputDirectory = resolve(process.cwd(), '.claude', 'review', 'C0307');
const longName = 'Nguyễn Bảo Minh Tường Vi';

type Variant = 'normal' | 'long-name' | 'tie' | 'count-0' | 'count-1' | 'count-2' | 'count-3';
type Entry = { rank: string; name: string; score: string; detail?: string; accent?: boolean; medal?: 1 | 2 | 3 };

const prototypeCss = `
.v3-leaderboard-full.v5-audit-frame { padding: 22px 24px 26px; }
.v3-leaderboard-full.v5-audit-frame.v5-audit-combined { overflow: visible !important; }
.v5-audit-root { box-sizing: border-box; width: 100%; height: 100%; padding-top: 2px; display: flex; flex-direction: column; gap: 0; overflow: hidden; color: #fff; background: #141832; font-family: inherit; }
.v5-audit-combined .v5-audit-root { overflow: visible !important; }
.v5-audit-root.v5-audit-stage-page { justify-content: flex-start; }
.v5-audit-table { box-sizing: border-box; width: 100%; min-width: 0; display: flex; flex-direction: column; }
.v5-audit-table + .v5-audit-table { margin-top: 24px; }
.v5-audit-head { box-sizing: border-box; height: 40px; flex: 0 0 40px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 2px solid rgba(220,226,255,.46); }
.v5-audit-title { min-width: 0; margin: 0; color: #fff; font-size: 32px; line-height: 36px; font-weight: 950; letter-spacing: .25px; white-space: nowrap; }
.v5-audit-sub { color: #e6e1ff; font-size: 22px; line-height: 26px; font-weight: 750; white-space: nowrap; }
.v5-audit-columns { box-sizing: border-box; height: 24px; flex: 0 0 24px; margin-top: 16px; display: grid; grid-template-columns: 96px minmax(0,1fr) 132px; gap: 24px; align-items: center; color: #d9d4ef; font-size: 18px; line-height: 24px; font-weight: 850; }
.v5-audit-columns > :first-child { text-align: center; }
.v5-audit-columns > :last-child { text-align: right; }
.v5-audit-empty { box-sizing: border-box; min-height: 88px; margin: 8px 0 0; padding: 24px; display: flex; align-items: center; justify-content: center; border: 1px dashed #747a9d; border-radius: 10px; color: #fff; font-size: 22px; line-height: 28px; font-weight: 800; text-align: center; }
.v5-audit-rows { box-sizing: border-box; min-height: 0; margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.v5-audit-pages { min-height: 0; }
.v5-audit-pages [hidden] { display: none !important; }
.v5-audit-row { box-sizing: border-box; min-width: 0; height: 36px; flex: 0 0 36px; padding: 1px 16px; display: grid; grid-template-columns: 96px minmax(0,1fr) 132px; gap: 24px; align-items: center; border: 1px solid #51577e; border-radius: 10px; background: #202448; color: #fff; font-size: 22px; line-height: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
.v5-audit-row.v5-rank-1 { border: 1px solid #ffc94f; box-shadow: inset 0 0 0 1px #ffc94f; background: #fff0b5; color: #21183e; }
.v5-audit-row .v5-rank { display: flex; align-items: center; justify-content: center; gap: 6px; text-align: center; font-variant-numeric: tabular-nums; }
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
.v5-audit-option-b.v5-audit-overall-page .v5-audit-rows { flex: 1 1 auto; justify-content: space-between; padding-bottom: 24px; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-pages { flex: 1 1 auto; display: flex; flex-direction: column; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-rows { flex: 0 0 auto; padding-bottom: 24px; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-rows[data-fill="true"] { flex: 1 1 auto; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-rows[data-fill="true"] .v5-audit-row { height: auto; min-height: 112px; flex: 1 1 0; padding: 14px 16px; font-size: 28px; line-height: 32px; }
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

function fastestEntries(variant: 'normal' | 'long-name' | 'tie'): Entry[] {
  if (variant === 'tie') return [
    { rank: '1', name: 'FFVN.Kelly', score: '1,6', accent: true },
    { rank: '1', name: 'StormKing', score: '1,6' },
    { rank: '3', name: 'BVD.Champion', score: '2,4' },
  ];
  return [
    { rank: '1', name: variant === 'long-name' ? longName : 'FFVN.Kelly', score: '1,6', accent: true, medal: 1 },
    { rank: '2', name: 'StormKing', score: '2,0', medal: 2 },
    { rank: '3', name: 'BVD.Champion', score: '2,4', medal: 3 },
  ];
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
      <span class="v5-rank">${entry.medal === 2 || entry.medal === 3 ? `<span class="v5-medal v5-medal-${entry.medal}" aria-label="huy chương ${entry.medal}">●</span>` : ''}${escapeHtml(entry.rank)}</span>
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
  await page.goto('/?mock=top10&role=program', { waitUntil: 'domcontentloaded' });
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
        right: Number.parseFloat(styles.paddingRight), bottom: Number.parseFloat(styles.paddingBottom), left: Number.parseFloat(styles.paddingLeft),
      },
      bottomSafeGapPx: lastRow ? Math.round((frame.bottom - Number.parseFloat(styles.borderBottomWidth) - Number.parseFloat(styles.paddingBottom) - lastRow.bottom) * 100) / 100 : null,
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
      !sample.option.startsWith('A') && metrics.bottomSafeGapPx !== null && metrics.bottomSafeGapPx >= 24,
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
    'Khoảng tiêu đề–đầu cột ≥16 px', `Tiêu đề Top 3 cùng vị trí Top 10 (lệch ${top10StageHeaderDeltaPx.toFixed(2)} px), ba hàng chặng chia đều`, 'Đáy bảng B còn ≥24 px',
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
    `padding T/P/D/T ${check[0]!.metrics.framePaddingPx.top}/${check[0]!.metrics.framePaddingPx.right}/${check[0]!.metrics.framePaddingPx.bottom}/${check[0]!.metrics.framePaddingPx.left}px; gap hàng min ${Math.min(...check.flatMap((sample) => sample.metrics.tables.flatMap((table) => table.rowGapPx.length ? table.rowGapPx : [8])))} px; B đáy min ${minFrameSafeGap} px`,
    `Top 10: 22 px/36 px = ${(36 / 22).toFixed(2)}×; Top 3: ${referenceStage.rowHeightsPx[0]} px/hàng với chữ 28 px; ≤${Math.max(...check.flatMap((sample) => sample.metrics.tables.map((table) => table.fontSizes.length)))} cỡ/bảng`,
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
    `B đáy an toàn nhỏ nhất ${minFrameSafeGap} px; A chẩn đoán có đáy ${minDiagnosticBottomGap} px so với khung (tràn)`,
  ];
  const report = [
    '# C-0307 · Tự kiểm ảnh mẫu BXH V5',
    '',
    `Tên dài mẫu: “${longName}” — 24 grapheme. Khung chính: ${check[0]!.metrics.frame.x}×${check[0]!.metrics.frame.y}, ${check[0]!.metrics.frame.width}×${check[0]!.metrics.frame.height} px (không đổi). Top 10 dùng chữ hàng 22 px, cao 36 px (tỷ lệ 1,64) để giữ đủ 10 hàng và đáy an toàn trong khung cố định; REVEAL vẫn dùng chữ 28 px.`,
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

  const css = `
    .v3-stage--user-question-layout.has-fastest-callout .v3-mc { top:735px!important; }
    .v3-stage--user-question-layout[data-scene="REVEAL"] .v3-fastest-callout.v5-reveal-top3 {
      top:78px!important;left:410px!important;width:650px!important;height:268px!important;max-height:268px!important;padding:8px 24px!important;
      display:block!important;overflow:hidden!important;box-sizing:border-box!important;
    }
    .v5-reveal-top3-root { box-sizing:border-box;height:100%;display:flex;flex-direction:column;gap:8px;color:#fff;font-family:inherit; }
    .v5-reveal-top3-title { min-width:0;height:32px;flex:0 0 32px;margin:0;color:#fff;font-size:32px;line-height:32px;font-weight:950;letter-spacing:.2px;white-space:nowrap; }
    .v5-reveal-top3-columns,.v5-reveal-top3-row { display:grid;grid-template-columns:70px minmax(0,1fr) 56px;column-gap:20px;align-items:center; }
    .v5-reveal-top3-columns { height:24px;flex:0 0 24px;margin-top:8px;color:#fff;font-size:22px;line-height:24px;font-weight:900; }
    .v5-reveal-top3-columns>*:first-child { text-align:center; }
    .v5-reveal-top3-columns>*:last-child { text-align:right; }
    .v5-reveal-top3-rows { min-height:0;flex:1 1 auto;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px; }
    .v5-reveal-top3-row { box-sizing:border-box;min-width:0;height:48px;flex:0 0 48px;padding:8px 16px;border:1px solid #73799f;border-radius:8px;background:#202448;color:#fff;font-size:28px;line-height:28px;font-weight:850;font-variant-numeric:tabular-nums; }
    .v5-reveal-top3-row[data-gold="true"] { border:1px solid #ffc94f;box-shadow:inset 0 0 0 1px #ffc94f;background:#fff0b5;color:#21183e; }
    .v5-reveal-top3-rank { text-align:center;font-variant-numeric:tabular-nums; }
    .v5-reveal-top3-name { min-width:0;display:block;overflow:hidden;text-overflow:clip;white-space:nowrap;text-align:left; }
    .v5-reveal-top3-time { min-width:0;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums; }
  `;

  type RevealVariant = 'normal' | 'long-name' | 'tie';
  type RevealRowMetric = {rank:string;name:string;nameGraphemes:number;nameLines:number;nameClipped:boolean;time:string;timeClipped:boolean;nameTimeGapPx:number;rowHeightPx:number;rowHeightFontRatio:number;rowFontPx:number;nameFontPx:number;timeFontPx:number;paddingTopPx:number;paddingBottomPx:number;paddingLeftPx:number;paddingRightPx:number;nameTextAlign:string;rankTextAlign:string;timeTextAlign:string;tabularNums:boolean;gold:boolean};
  type RevealMetricRecord = {titleWords:number;titleLines:number;titleFontPx:number;tableCount:number;unitColumnCount:number;repeatedUnits:boolean;fontSizes:string[];headerClipped:boolean;padding:{top:number;right:number;bottom:number;left:number};rowPaddingMinPx:number;rowPaddingHorizontalMinPx:number;bottomSafeGapPx:number|null;rowGaps:number[];headerRowsGapPx:number;goldCount:number;rowLeftEdgeDeltaPx:number;tieSummaryPresent:boolean;rowRanks:string[];rowNames:string[];titleColumnGapPx:number;columnFontPx:number;rows:RevealRowMetric[];textContrast:number[];fixedFrameMatches:boolean;mcPlateGapPx:number|null;bubbleInViewport:boolean;bubble:{x:number;y:number;width:number;height:number;bottom:number}};
  const revealSamples: Array<{ variant: RevealVariant; metrics: RevealMetricRecord; checks: boolean[] }> = [];
  for (const variant of ['normal', 'long-name', 'tie'] as const) {
    await page.goto('/?mock=fastest-a-long&role=program', { waitUntil: 'domcontentloaded' });
    const callout = page.locator('.v3-fastest-callout');
    await expect(callout).toBeVisible();
    const frame = page.locator('.v3-top10');
    const frameBefore = await frame.boundingBox();
    expect(frameBefore, 'Không đo được khung BXH REVEAL').not.toBeNull();

    const entries = fastestEntries(variant).map((entry) => ({
      rank: entry.rank,
      name: entry.name,
      time: entry.score,
      accent: entry.accent === true,
    }));
    const rows = entries.map((entry) => `<li class="v5-reveal-top3-row" data-gold="${entry.accent}">
      <span class="v5-reveal-top3-rank">${escapeHtml(entry.rank)}</span>
      <strong class="v5-reveal-top3-name">${escapeHtml(entry.name)}</strong>
      <span class="v5-reveal-top3-time">${escapeHtml(entry.time)}</span>
    </li>`).join('');
    const markup = `<section class="v5-reveal-top3-root" data-v5-reveal="true">
      <h2 class="v5-reveal-top3-title">TOP 3 NHANH NHẤT</h2>
      <div class="v5-reveal-top3-columns"><span>HẠNG</span><span>NGƯỜI CHƠI</span><span>GIÂY</span></div>
      <ol class="v5-reveal-top3-rows">${rows}</ol>
    </section>`;
    await page.addStyleTag({ content: css });
    await callout.evaluate((element, content) => {
      element.classList.add('v5-reveal-top3');
      element.innerHTML = content;
    }, markup);
    await page.waitForTimeout(120);

    const metrics = await callout.evaluate((element, args) => {
      const bubble = element.getBoundingClientRect();
      const root = element.querySelector<HTMLElement>('.v5-reveal-top3-root')!;
      const title = root.querySelector<HTMLElement>('.v5-reveal-top3-title')!;
      const columnRow = root.querySelector<HTMLElement>('.v5-reveal-top3-columns')!;
      const columns = [...columnRow.querySelectorAll<HTMLElement>(':scope > *')];
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
      const columnsBox = columnRow.getBoundingClientRect();
      const frame = document.querySelector<HTMLElement>('.v3-top10')?.getBoundingClientRect();
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
        const rowFontPx = Number.parseFloat(rowStyle.fontSize);
        return {
          rank: rank.textContent?.trim(), name: nameText, time: time.textContent?.trim(),
          nameGraphemes: [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(nameText)].length,
          nameLines: textLines(name), nameClipped: name.scrollWidth > name.clientWidth + 1, timeClipped: time.scrollWidth > time.clientWidth + 1,
          rowHeightPx: Math.round(box.height * 100) / 100, rowHeightFontRatio: Math.round((box.height / rowFontPx) * 100) / 100,
          rowFontPx, nameFontPx: Number.parseFloat(nameStyle.fontSize), timeFontPx: Number.parseFloat(timeStyle.fontSize),
          paddingTopPx: Number.parseFloat(rowStyle.paddingTop), paddingBottomPx: Number.parseFloat(rowStyle.paddingBottom),
          paddingLeftPx: Number.parseFloat(rowStyle.paddingLeft), paddingRightPx: Number.parseFloat(rowStyle.paddingRight),
          nameLeftPx: Math.round(nameBox.left * 100) / 100, nameTextAlign: nameStyle.textAlign,
          rankTextAlign: rankStyle.textAlign, timeTextAlign: timeStyle.textAlign,
          nameTimeGapPx: Math.round((timeBox.left - nameBox.right) * 100) / 100,
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
      const columnsBoxTop = columnsBox.top;
      const cellUnitCount = columns.filter((column) => column.textContent?.trim() === 'GIÂY').length;
      const repeatedUnits = rowMetrics.some((row) => /\b(?:s|giây|seconds?)\b/iu.test(row.time));
      const frameBox = document.querySelector<HTMLElement>('.v3-top10')?.getBoundingClientRect();
      const rowLeftEdges = rowMetrics.map((row) => row.nameLeftPx);
      const goldCount = rows.filter((row) => row.dataset.gold === 'true').length;
      const calloutBottomPadding = Number.parseFloat(calloutStyle.paddingBottom);
      return {
        variant: args.variant, bubble: { x: bubble.x, y: bubble.y, width: bubble.width, height: bubble.height, bottom: bubble.bottom },
        padding: { top: Number.parseFloat(calloutStyle.paddingTop), right: Number.parseFloat(calloutStyle.paddingRight), bottom: calloutBottomPadding, left: Number.parseFloat(calloutStyle.paddingLeft) },
        rowPaddingMinPx: Math.min(...rowMetrics.flatMap((row) => [row.paddingTopPx, row.paddingBottomPx])),
        rowPaddingHorizontalMinPx: Math.min(...rowMetrics.flatMap((row) => [row.paddingLeftPx, row.paddingRightPx])),
        bottomSafeGapPx: lastRow ? Math.round((bubble.bottom - Number.parseFloat(calloutStyle.borderBottomWidth) - calloutBottomPadding - lastRow.bottom) * 100) / 100 : null,
        title: title.textContent?.trim(), titleWords: (title.textContent ?? '').trim().split(/\s+/u).length, titleLines: textLines(title), titleFontPx: Number.parseFloat(titleStyle.fontSize),
        tableCount: root.matches('[data-v5-reveal="true"]') ? 1 : root.querySelectorAll('[data-v5-reveal="true"]').length,
        unitColumnCount: cellUnitCount, repeatedUnits,
        headerClipped: columns.some((column) => column.scrollWidth > column.clientWidth + 1),
        headerWidths: columns.map((column) => ({ text: column.textContent?.trim(), client: column.clientWidth, scroll: column.scrollWidth })),
        columnFontPx: Number.parseFloat(getComputedStyle(columnRow).fontSize),
        fontSizes: [...new Set([title, columnRow, ...rows.flatMap((row) => [row, ...row.querySelectorAll<HTMLElement>('.v5-reveal-top3-rank,.v5-reveal-top3-name,.v5-reveal-top3-time')])].map((node) => getComputedStyle(node).fontSize))],
        rowGaps, headerRowsGapPx: Math.round((rows[0]!.getBoundingClientRect().top - columnsBoxTop - columnsBox.height) * 100) / 100,
        goldCount, rowLeftEdgeDeltaPx: rowLeftEdges.length < 2 ? 0 : Math.round((Math.max(...rowLeftEdges) - Math.min(...rowLeftEdges)) * 100) / 100,
        tieSummaryPresent: root.textContent?.includes('+1 người') || /\+\s*\d+\s+người/iu.test(root.textContent ?? ''),
        rows: rowMetrics, rowRanks: rowMetrics.map((row) => row.rank), rowNames: rowMetrics.map((row) => row.name), textContrast,
        titleColumnGapPx: Math.round((columnsBox.top - titleBox.bottom) * 100) / 100,
        fixedFrameMatches: Boolean(frameBox && args.frameBefore && frameBox.x === args.frameBefore.x && frameBox.y === args.frameBefore.y && frameBox.width === args.frameBefore.width && frameBox.height === args.frameBefore.height),
        mcPlateGapPx: (() => { const plate = document.querySelector<HTMLElement>('.v3-mc-plate')?.getBoundingClientRect(); return plate ? Math.round((bubble.left - plate.right) * 100) / 100 : null; })(),
        bubbleInViewport: bubble.left >= 0 && bubble.top >= 0 && bubble.right <= innerWidth && bubble.bottom <= innerHeight,
      };
    }, { variant, frameBefore });

    const record = metrics as RevealMetricRecord;
    const checks = [
      record.titleWords<=4&&record.titleLines===1&&record.tableCount===1,
      record.unitColumnCount===1&&!record.headerClipped&&!record.repeatedUnits&&record.rows.every((row)=>/^\d,\d$/u.test(row.time)),
      record.rows.every((row)=>row.nameTimeGapPx>=20&&row.tabularNums&&row.nameTextAlign==='left'&&row.rankTextAlign==='center'&&row.timeTextAlign==='right')&&record.rowLeftEdgeDeltaPx<=1,
      record.rows.every((row)=>row.rowFontPx>=28&&row.rowHeightFontRatio>=1.6),
      record.rowPaddingMinPx>=8&&record.rowPaddingHorizontalMinPx>=16&&record.rowGaps.every((gap)=>gap>=8)&&record.headerRowsGapPx>=8&&record.titleColumnGapPx>=16,
      record.goldCount===1&&record.rows.filter((row)=>row.gold).length===1,
      !record.tieSummaryPresent&&(variant!=='tie'||['FFVN.Kelly','StormKing','BVD.Champion'].every((name)=>record.rowNames.includes(name)))&&(variant!=='tie'||record.rowRanks.map((rank)=>rank.replace(/\D/gu,'')).join(',')==='1,1,3'),
      record.rows.every((row)=>row.nameGraphemes<=24&&row.nameLines<=2&&!row.nameClipped&&!row.timeClipped)&&(!variant.includes('long-name')||record.rows.some((row)=>row.name===longName&&row.nameGraphemes===24)),
      record.rows.every((row)=>row.nameFontPx>=28&&row.timeFontPx>=28)&&record.titleFontPx>=32&&record.columnFontPx<record.titleFontPx&&record.fontSizes.length<=3,
      Math.min(...record.textContrast)>=4.5,
      record.fixedFrameMatches&&record.bubbleInViewport,
      record.bottomSafeGapPx!==null&&record.bottomSafeGapPx>=8,
      record.rows.every((row)=>row.paddingTopPx>=8&&row.paddingBottomPx>=8),
      record.rows.every((row)=>row.paddingLeftPx>=16&&row.paddingRightPx>=16),
      record.goldCount===record.rows.filter((row)=>row.gold).length&&record.goldCount===1,
      record.rowRanks.map((rank)=>rank.replace(/\D/gu,'')).join(',')===(variant==='tie'?'1,1,3':'1,2,3'),
    ];
    for (const [index,passed] of checks.entries()) expect(passed, `REVEAL Top 3 ${variant}: rule ${index+1}; ${JSON.stringify(metrics)}`).toBe(true);
    const suffix=variant.replace('-','_');
    await page.screenshot({path:join(outputDirectory,`reveal-top3-fastest-${suffix}-1080x1920.png`),animations:'disabled'});
    const box=await callout.boundingBox();
    if(!box)throw new Error('Không đo được callout Top 3 nhanh nhất');
    await page.screenshot({path:join(outputDirectory,`reveal-top3-fastest-${suffix}-zoom.png`),clip:{x:box.x-12,y:box.y-12,width:box.width+24,height:box.height+24},animations:'disabled'});
    revealSamples.push({ variant, metrics: record, checks });
  }

  const ruleNames=[
    'Tiêu đề ≤4 từ, 1 dòng, một bảng', 'Đơn vị GIÂY chỉ ở header, ô thời gian chỉ là số', 'Tên trái, hạng giữa, thời gian phải; cột lệch ≤1 px',
    'Hàng cao ≥1,6× chữ; chữ hàng ≥28 px', 'Padding dọc ≥8 px, ngang ≥16 px; hàng cách ≥8 px', 'Chỉ một hàng có màu nhấn',
    'Đồng hạng hiện đủ tên theo hạng 1, 1, 3; không “+N người”', 'Tên dài đủ 24 grapheme, không cắt', 'Tên/thời gian ≥28 px, title ≥32 px, header nhỏ hơn, tối đa 3 cỡ',
    'Tương phản chữ/nền ≥4.5:1', 'Khung Top 10 giữ nguyên, callout không lấn viewport', 'Đáy callout có ≥8 px khoảng thở',
    'Padding dọc từng hàng ≥8 px', 'Padding ngang từng hàng ≥16 px', 'Hạng đồng tie được kiểm đúng 1, 1, 3',
  ];
  const result=[
    '# C-0307 · Tự kiểm REVEAL Top 3 nhanh nhất',
    '',
    'Ba biến thể (thường, tên 24 grapheme, đồng hạng) được dựng trong ngữ cảnh REVEAL ở viewport 1080×1920; danh sách Top 3 nằm trong bong bóng MC. Khung BXH nền giữ nguyên; chỉ CSS/HTML prototype trong E2E thay đổi.',
    '',
    '| Quy tắc | Kết quả | Số đo / ghi chú |',
    '|---|---|---|',
    ...ruleNames.map((name,index)=>{
      const passed=revealSamples.filter((sample)=>sample.checks[index]);
      const rowMetrics=revealSamples.flatMap((sample)=>sample.metrics.rows);
      const detail=index===2?`lệch mép tên lớn nhất ${Math.max(...revealSamples.map((sample)=>sample.metrics.rowLeftEdgeDeltaPx as number)).toFixed(2)} px; khe tên–giây min ${Math.min(...revealSamples.flatMap((sample)=>((sample.metrics.rows as Array<{nameTimeGapPx:number}>).map((row)=>row.nameTimeGapPx))))} px`
        :index===3?`hàng ${Math.min(...rowMetrics.map((row)=>row.rowHeightPx))} px; tỷ lệ thấp nhất ${Math.min(...rowMetrics.map((row)=>row.rowHeightFontRatio)).toFixed(2)}×; chữ 28 px`
        :index===4?`padding dọc ${Math.min(...rowMetrics.flatMap((row)=>[row.paddingTopPx,row.paddingBottomPx]))} px; ngang ${Math.min(...rowMetrics.flatMap((row)=>[row.paddingLeftPx,row.paddingRightPx]))} px; gap hàng ${Math.min(...revealSamples.flatMap((sample)=>sample.metrics.rowGaps as number[]))} px`
        :index===6?`tie có ${revealSamples.find((sample)=>sample.variant==='tie')!.metrics.rowNames.length} tên, hạng ${revealSamples.find((sample)=>sample.variant==='tie')!.metrics.rowRanks.join(', ')}`
        :index===7?`tên dài ${[...new Intl.Segmenter('vi',{granularity:'grapheme'}).segment(longName)].length} grapheme`
        :index===8?`font hàng 28 px; title 32 px; header 22 px; ${Math.max(...revealSamples.map((sample)=>sample.metrics.fontSizes.length))} cỡ chữ`
        :index===9?`tương phản thấp nhất ${Math.min(...revealSamples.flatMap((sample)=>sample.metrics.textContrast as number[])).toFixed(2)}:1`
        :index===10?'khung Top 10 so trước/sau; callout còn trong viewport'
        :index===11?`đáy nhỏ nhất ${Math.min(...revealSamples.map((sample)=>sample.metrics.bottomSafeGapPx as number)).toFixed(2)} px`
        :index===12?`padding trên/dưới nhỏ nhất ${Math.min(...rowMetrics.flatMap((row)=>[row.paddingTopPx,row.paddingBottomPx]))} px`
        :index===13?`padding trái/phải nhỏ nhất ${Math.min(...rowMetrics.flatMap((row)=>[row.paddingLeftPx,row.paddingRightPx]))} px`
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
