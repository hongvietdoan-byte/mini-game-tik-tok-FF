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
.v5-audit-root.v5-audit-stage-page { justify-content: center; }
.v5-audit-table { box-sizing: border-box; width: 100%; min-width: 0; display: flex; flex-direction: column; }
.v5-audit-table + .v5-audit-table { margin-top: 24px; }
.v5-audit-head { box-sizing: border-box; height: 40px; flex: 0 0 40px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 2px solid rgba(220,226,255,.46); }
.v5-audit-title { min-width: 0; margin: 0; color: #fff; font-size: 32px; line-height: 36px; font-weight: 950; letter-spacing: .25px; white-space: nowrap; }
.v5-audit-sub { color: #e6e1ff; font-size: 22px; line-height: 26px; font-weight: 750; white-space: nowrap; }
.v5-audit-columns { box-sizing: border-box; height: 32px; flex: 0 0 32px; display: grid; grid-template-columns: 96px minmax(0,1fr) 132px; gap: 24px; align-items: center; color: #fff; font-size: 28px; line-height: 30px; font-weight: 900; }
.v5-audit-columns > :first-child { text-align: center; }
.v5-audit-columns > :last-child { text-align: right; }
.v5-audit-empty { box-sizing: border-box; min-height: 88px; margin: 8px 0 0; padding: 24px; display: flex; align-items: center; justify-content: center; border: 1px dashed #747a9d; border-radius: 10px; color: #fff; font-size: 28px; line-height: 32px; font-weight: 800; text-align: center; }
.v5-audit-rows { box-sizing: border-box; min-height: 0; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.v5-audit-row { box-sizing: border-box; min-width: 0; height: 36px; flex: 0 0 36px; padding: 1px 8px; display: grid; grid-template-columns: 96px minmax(0,1fr) 132px; gap: 24px; align-items: center; border: 1px solid #51577e; border-radius: 10px; background: #202448; color: #fff; font-size: 28px; line-height: 30px; font-weight: 800; font-variant-numeric: tabular-nums; }
.v5-audit-row.v5-rank-1 { border: 2px solid #ffc94f; background: #fff0b5; color: #21183e; }
.v5-audit-row.v5-rank-2 { border-color: #6b629c; background: #332e65; }
.v5-audit-row.v5-rank-3 { border-color: #497086; background: #244354; }
.v5-audit-row .v5-rank { text-align: center; font-variant-numeric: tabular-nums; }
.v5-audit-row .v5-player { min-width: 0; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.v5-audit-row .v5-name { min-width: 0; overflow-wrap: anywhere; }
.v5-audit-row .v5-detail { flex: 0 0 auto; color: #e6e1ff; font-size: 22px; line-height: 26px; font-weight: 850; white-space: nowrap; }
.v5-audit-row.v5-rank-1 .v5-detail { color: #342039; }
.v5-audit-row .v5-score { min-width: 0; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.v5-audit-row [data-accent="true"] { box-shadow: inset 0 0 0 1px #ffc94f; }
.v5-audit-option-a .v5-audit-rows { gap: 8px; }
.v5-audit-option-a .v5-audit-row { height: 36px; flex-basis: 36px; }
.v5-audit-option-b .v5-audit-rows { gap: 8px; }
.v5-audit-option-b .v5-audit-row { height: 36px; flex-basis: 36px; padding: 1px 8px; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-row { height: 112px; flex-basis: 112px; padding: 14px 16px; font-size: 28px; line-height: 32px; }
.v5-audit-option-b.v5-audit-stage-page .v5-audit-row .v5-detail { font-size: 22px; }
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
    { rank: '1', name: 'FFVN.Kelly', score: '1.850', detail: '+1 người đồng hạng', accent: true, medal: 1 },
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
    { rank: '1', name: 'FFVN.Kelly', score: '5.850', detail: '+1 người đồng hạng', accent: true, medal: 1 },
    ...entries.slice(2),
  ];
}

function fastestEntries(variant: 'normal' | 'long-name' | 'tie'): Entry[] {
  if (variant === 'tie') return [
    { rank: '1', name: 'FFVN.Kelly', score: '1,6 s', detail: '+1 người đồng hạng', accent: true, medal: 1 },
    { rank: '3', name: 'BVD.Champion', score: '2,4 s', medal: 3 },
  ];
  return [
    { rank: '1', name: variant === 'long-name' ? longName : 'FFVN.Kelly', score: '1,6 s', accent: true, medal: 1 },
    { rank: '2', name: 'StormKing', score: '2,0 s', medal: 2 },
    { rank: '3', name: 'BVD.Champion', score: '2,4 s', medal: 3 },
  ];
}

function tableMarkup(title: string, subtitle: string, entries: Entry[], option: 'a' | 'b', unitLabel = 'ĐIỂM'): string {
  const rows = entries.map((entry) => `<li class="v5-audit-row v5-rank-${entry.medal ?? 'n'}" data-rank="${escapeHtml(entry.rank)}" data-gold-accent="${entry.accent === true}">
    <span class="v5-rank">${escapeHtml(entry.rank)}</span>
    <span class="v5-player"><strong class="v5-name">${escapeHtml(entry.name)}</strong>${entry.detail ? `<small class="v5-detail">${escapeHtml(entry.detail)}</small>` : ''}</span>
    <span class="v5-score">${escapeHtml(entry.score)}</span>
  </li>`).join('');
  return `<section class="v5-audit-table" data-v5-table="${option}" data-unit-label="${escapeHtml(unitLabel)}">
    <header class="v5-audit-head"><h2 class="v5-audit-title">${escapeHtml(title)}</h2><span class="v5-audit-sub">${escapeHtml(subtitle)}</span></header>
    <div class="v5-audit-columns"><span>HẠNG</span><span>NGƯỜI CHƠI</span><span>${escapeHtml(unitLabel)}</span></div>
    ${entries.length ? `<ol class="v5-audit-rows">${rows}</ol>` : '<p class="v5-audit-empty">CHƯA CÓ NGƯỜI ĐẠT ĐIỂM</p>'}
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
    : tableMarkup('TOP 3 CHẶNG 3', 'CÂU 11–15', stageEntries(variant), 'b');
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
    const rows = [...root.querySelectorAll<HTMLElement>('.v5-audit-row')];
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
      const subtitle = table.querySelector<HTMLElement>('.v5-audit-sub')!;
      const unitLabel = table.dataset.unitLabel ?? 'ĐIỂM';
      const unit = [...table.querySelectorAll<HTMLElement>('.v5-audit-columns > *')].filter((column) => column.textContent?.trim() === unitLabel);
      const tableRows = [...table.querySelectorAll<HTMLElement>('.v5-audit-row')];
      return {
        title: title.textContent,
        unitLabel,
        titleWords: (title.textContent ?? '').trim().split(/\s+/).length,
        supportingLines: table.querySelectorAll('.v5-audit-sub').length,
        unitColumnCount: unit.length,
        titleFontPx: Number.parseFloat(getComputedStyle(title).fontSize),
        supportFontPx: Number.parseFloat(getComputedStyle(subtitle).fontSize),
        emptyFontPx: table.querySelector<HTMLElement>('.v5-audit-empty') ? Number.parseFloat(getComputedStyle(table.querySelector<HTMLElement>('.v5-audit-empty')!).fontSize) : null,
        fontSizes: [...new Set([...table.querySelectorAll<HTMLElement>('.v5-audit-title, .v5-audit-sub, .v5-audit-columns > *, .v5-audit-empty, .v5-audit-row, .v5-audit-row *')].map((element) => getComputedStyle(element).fontSize))],
        rowGapPx: gaps(tableRows).map((gap) => Math.round(gap * 100) / 100),
        goldAccents: table.querySelectorAll('[data-gold-accent="true"]').length,
        rowCount: tableRows.length,
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
  const lastRow = await frame.locator('.v5-audit-row, .v5-audit-empty').last().boundingBox();
  const contentBottom = Math.max(box.y + box.height, lastRow ? lastRow.y + lastRow.height : 0);
  await page.screenshot({ path: zoomPath, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: contentBottom - box.y + 16 }, animations: 'disabled' });
  return metrics;
}

test('C-0307 — capture both V5 leaderboard layouts, variants and DOM measurements', async ({ page }) => {
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

    for (const table of ['overall', 'stage'] as const) {
      const split = await capture(
        page,
        optionB(variant, table),
        join(outputDirectory, `option-b-rotate-${table}-${suffix}-1080x1920.png`),
        join(outputDirectory, `option-b-rotate-${table}-${suffix}-table-zoom.png`),
      );
      samples.push({ option: 'B · luân phiên 5 giây', case: variant, screen: table === 'overall' ? 'Top 10 toàn trận' : 'Top 3 chặng 3', metrics: split });
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
    const oneGoldPerTable = metrics.tables.every((table) => table.goldAccents === (table.rowCount ? 1 : 0));
    const checks = [
      metrics.tables.every((table) => table.titleWords <= 4 && table.supportingLines <= 1),
      metrics.tables.every((table) => table.unitColumnCount === 1) && metrics.rows.every((row) => row.unitLabel === 'THỜI GIAN' ? /^\d,\d s$/u.test(row.score) : !/điểm/i.test(row.score)),
      metrics.rows.every((row) => row.nameScoreGapPx >= 24 && row.tabularNums),
      metrics.framePaddingPx.top >= 24 && metrics.framePaddingPx.right >= 24 && metrics.framePaddingPx.bottom >= 24 && metrics.framePaddingPx.left >= 24 && metrics.bottomSafeGapPx !== null && metrics.bottomSafeGapPx >= 12 && (minRowGap === null || minRowGap >= 8) && (metrics.betweenTablesGapPx === null || metrics.betweenTablesGapPx >= 24),
      metrics.rows.every((row) => row.fontPx >= 28 && row.scoreFontPx >= 28) && metrics.tables.every((table) => table.titleFontPx >= 32 && table.supportFontPx >= 22 && (table.emptyFontPx === null || table.emptyFontPx >= 28) && table.fontSizes.length <= 3),
      oneGoldPerTable,
      allLongNamesFit && metrics.rows.every((row) => !row.nameClipped && !row.scoreClipped),
      sample.option.startsWith('A') ? metrics.tables.length === 2 : metrics.tables.length === 1,
      minContrast >= 4.5,
      metrics.fixedFrameMatches,
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
    const expected = result.option.startsWith('A') ? Array.from({ length: 10 }, (_, index) => index !== 3) : Array(10).fill(true);
    expect(result.checks, `${result.option}/${result.case}/${result.screen}: ${JSON.stringify(result.metrics)}`).toEqual(expected);
  }

  const ruleNames = [
    'Một tiêu đề ≤4 từ, tối đa một dòng phụ', 'Đơn vị điểm chỉ xuất hiện ở đầu cột', 'Cột thẳng hàng, cách tên–điểm ≥24 px, tabular nums',
    'Padding ≥24 px, hàng cách ≥8 px, hai khối cách ≥24 px, đáy ≥12 px', 'Tên/điểm ≥28 px, tiêu đề ≥32 px, dòng phụ ≥22 px, tối đa 3 cỡ',
    'Một điểm nhấn vàng mỗi bảng', 'Tên 24 grapheme đủ nguyên, tối đa 2 dòng; không tràn tên/số', 'B chỉ hiện một bảng mỗi lượt luân phiên',
    'Tương phản chữ/nền ≥4.5:1', 'Khung chính giữ nguyên x/y/w/h',
  ];
  const report = [
    '# C-0307 · Tự kiểm ảnh mẫu BXH V5',
    '',
    `Tên dài mẫu: “${longName}” — 24 grapheme. Khung chính: ${check[0]!.metrics.frame.x}×${check[0]!.metrics.frame.y}, ${check[0]!.metrics.frame.width}×${check[0]!.metrics.frame.height} px (không đổi).`,
    'Phương án A là ảnh chẩn đoán, không phải bản đạt: Top 10 + Top 3 cùng lúc vượt đáy khung (rule 4). Phương án B luân phiên Top 10 và Top 3 chặng 3, mỗi bảng 5 giây; cả 6 mẫu chính và 4 trạng thái 0–3 người đều vừa khung.',
    'Bản 0 người dùng dòng trống rõ ràng, không dựng hàng xếp hạng giả.',
    '',
    '| Quy tắc | Kết quả | Số đo / ghi chú |',
    '|---|---|---|',
    ...ruleNames.map((rule, index) => {
      const values = check.flatMap((sample) => sample.checks[index] ? [sample] : []);
      const detail = index === 2 ? `khe min ${Math.min(...check.flatMap((sample) => sample.metrics.rows.map((row) => row.nameScoreGapPx)))} px; tabular nums`
        : index === 3 ? `padding T/P/D/T ${check[0]!.metrics.framePaddingPx.top}/${check[0]!.metrics.framePaddingPx.right}/${check[0]!.metrics.framePaddingPx.bottom}/${check[0]!.metrics.framePaddingPx.left}px; hàng min ${Math.min(...check.map((sample) => sample.minRowGapPx).filter((gap): gap is number => gap !== null))} px; A dư ${Math.abs(Math.min(...check.filter((sample) => sample.option.startsWith('A')).map((sample) => sample.metrics.bottomSafeGapPx ?? 0)))} px khỏi khung, B đáy min ${Math.min(...check.filter((sample) => sample.option.startsWith('B')).map((sample) => sample.metrics.bottomSafeGapPx ?? 0))} px`
        : index === 4 ? `cỡ lớn nhất ${Math.max(...check.flatMap((sample) => sample.metrics.tables.map((table) => table.fontSizes.length)))} cỡ/bảng; tên/điểm ≥28 px, tiêu đề ≥32 px, phụ ≥22 px`
        : index === 6 ? `đủ ${[...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(longName)].length} grapheme; tối đa 1 dòng trong mẫu`
        : index === 8 ? `tương phản thấp nhất ${Math.min(...check.map((sample) => sample.minContrastRatio))}:1`
        : index === 9 ? `x=${check[0]!.metrics.frame.x}, y=${check[0]!.metrics.frame.y}, w=${check[0]!.metrics.frame.width}, h=${check[0]!.metrics.frame.height} px trước/sau`
        : index === 7 ? 'A: 2 bảng gộp; B: 1 bảng mỗi ảnh, luân phiên 5 giây'
        : 'đã đo trên DOM ở tất cả 13 mẫu';
      return `| ${rule} | ${values.length === check.length ? 'ĐẠT' : 'KHÔNG ĐẠT'} | ${detail} |`;
    }),
    '',
    'Mỗi bộ có ảnh toàn khung 1080×1920 và ảnh zoom khung BXH. Ảnh ghép so sánh được lưu riêng.',
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
  console.info(`[C-0307] 10 mẫu B đạt 10 quy tắc; 3 ảnh A chẩn đoán lỗi không đủ chỗ; thêm các trạng thái 0–3 người. Ảnh và checklist: ${outputDirectory}`);
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
      top:78px!important;left:410px!important;width:650px!important;height:252px!important;max-height:252px!important;padding:24px!important;
      display:block!important;overflow:hidden!important;box-sizing:border-box!important;
    }
    .v5-reveal-top3-root { height:100%;display:flex;flex-direction:column;gap:10px;color:#fff;font-family:inherit; }
    .v5-reveal-top3-title { min-width:0;height:32px;flex:0 0 32px;margin:0;color:#fff;font-size:32px;line-height:32px;font-weight:950;letter-spacing:.2px;white-space:nowrap; }
    .v5-reveal-top3-columns,.v5-reveal-top3-row { display:grid;grid-template-columns:70px minmax(0,1fr) 72px;column-gap:24px;align-items:center; }
    .v5-reveal-top3-columns { height:24px;flex:0 0 24px;color:#fff;font-size:22px;line-height:24px;font-weight:900; }
    .v5-reveal-top3-columns>*:first-child { text-align:center; }
    .v5-reveal-top3-columns>*:last-child { text-align:right; }
    .v5-reveal-top3-rows { min-height:0;flex:1 1 auto;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:28px;line-height:28px; }
    .v5-reveal-top3-row { min-width:0;height:30px;flex:0 0 30px;padding:0;border:1px solid #73799f;border-radius:8px;background:#202448;color:#fff;font-size:28px;line-height:28px;font-weight:850;font-variant-numeric:tabular-nums; }
    .v5-reveal-top3-row[data-gold="true"] { border:2px solid #ffc94f;background:#fff0b5;color:#21183e; }
    .v5-reveal-top3-rank { text-align:center;font-variant-numeric:tabular-nums; }
    .v5-reveal-top3-row > :nth-child(2) { min-width:0;overflow:hidden;white-space:nowrap; }
    .v5-reveal-top3-name { min-width:0;overflow:hidden;text-overflow:clip;white-space:nowrap; }
    .v5-reveal-top3-detail { margin-left:6px;color:#342039;font-size:22px;line-height:24px;font-weight:850;white-space:nowrap; }
    .v5-reveal-top3-time { min-width:0;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums; }
  `;

  type RevealVariant = 'normal' | 'long-name' | 'tie';
  const revealSamples: Array<{ variant: RevealVariant; metrics: Record<string, unknown>; checks: boolean[] }> = [];
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
      detail: entry.detail,
      accent: entry.accent === true,
    }));
    const rows = entries.map((entry) => `<li class="v5-reveal-top3-row" data-gold="${entry.accent}">
      <span class="v5-reveal-top3-rank">${escapeHtml(entry.rank)}</span>
      <span><strong class="v5-reveal-top3-name">${escapeHtml(entry.name)}</strong>${entry.detail ? `<small class="v5-reveal-top3-detail">${escapeHtml(entry.detail)}</small>` : ''}</span>
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
      const columns = [...root.querySelectorAll<HTMLElement>('.v5-reveal-top3-columns > *')];
      const columnsRow = root.querySelector<HTMLElement>('.v5-reveal-top3-columns')!;
      const rows = [...root.querySelectorAll<HTMLElement>('.v5-reveal-top3-row')];
      const nameRange = (name: HTMLElement) => { const range = document.createRange(); range.selectNodeContents(name); return range.getClientRects().length; };
      const lum = (color: string) => {
        const values = color.match(/[\d.]+/g)?.slice(0,3).map(Number) ?? [];
        const channels = values.map((value) => { const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; });
        return .2126*(channels[0]??0)+.7152*(channels[1]??0)+.0722*(channels[2]??0);
      };
      const contrast = (a:string,b:string) => { const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
      const titleBox = title.getBoundingClientRect();
      const titleStyle = getComputedStyle(title);
      const bubbleStyle = getComputedStyle(element);
      const columnsBox = root.querySelector<HTMLElement>('.v5-reveal-top3-columns')!.getBoundingClientRect();
      const frame = document.querySelector<HTMLElement>('.v3-top10')?.getBoundingClientRect();
      const rowsMetrics = rows.map((row) => {
        const cells = [...row.children] as HTMLElement[];
        const name = row.querySelector<HTMLElement>('.v5-reveal-top3-name')!;
        const nameWrap = name.parentElement!;
        const time = row.querySelector<HTMLElement>('.v5-reveal-top3-time')!;
        const rowStyle = getComputedStyle(row);
        const nameStyle = getComputedStyle(name);
        const timeStyle = getComputedStyle(time);
        const nameBox = nameWrap.getBoundingClientRect();
        const timeBox = time.getBoundingClientRect();
        const nameText = name.textContent ?? '';
        return {
          rank: cells[0]?.textContent?.trim(),name:nameText,
          nameGraphemes:[...new Intl.Segmenter('vi',{granularity:'grapheme'}).segment(nameText)].length,
          nameLines:nameRange(name),nameClipped:name.scrollWidth>name.clientWidth+1,
          playerWidth:nameWrap.clientWidth,playerScrollWidth:nameWrap.scrollWidth,
          time:time.textContent?.trim(),timeClipped:time.scrollWidth>time.clientWidth+1,playerClipped:nameWrap.scrollWidth>nameWrap.clientWidth+1,
          nameTimeGapPx:Math.round((timeBox.left-nameBox.right)*100)/100,
          rowGapPx:Math.round(row.getBoundingClientRect().height*100)/100,
          nameFontPx:Number.parseFloat(nameStyle.fontSize),timeFontPx:Number.parseFloat(timeStyle.fontSize),
          tabularNums:nameStyle.fontVariantNumeric.includes('tabular-nums')&&timeStyle.fontVariantNumeric.includes('tabular-nums'),
          contrastRatio:Math.round(contrast(nameStyle.color,rowStyle.backgroundColor)*100)/100,
          gold:row.dataset.gold==='true',detailFontPx:row.querySelector<HTMLElement>('.v5-reveal-top3-detail')?Number.parseFloat(getComputedStyle(row.querySelector<HTMLElement>('.v5-reveal-top3-detail')!).fontSize):null,
        };
      });
      const text = [title,...columns,...rows.flatMap((row) => [...row.querySelectorAll<HTMLElement>('.v5-reveal-top3-rank,.v5-reveal-top3-name,.v5-reveal-top3-detail,.v5-reveal-top3-time')])];
      const textContrast = text.map((item) => {
        const row=item.closest<HTMLElement>('.v5-reveal-top3-row');
        return Math.round(contrast(getComputedStyle(item).color,getComputedStyle(row??element).backgroundColor)*100)/100;
      });
      const gaps=rows.slice(1).map((row,index)=>Math.round((row.getBoundingClientRect().top-rows[index]!.getBoundingClientRect().bottom)*100)/100);
      const last=rows.at(-1)?.getBoundingClientRect();
      const borderBottom=Number.parseFloat(bubbleStyle.borderBottomWidth);
      const borderTop=Number.parseFloat(bubbleStyle.borderTopWidth);
      const borderLeft=Number.parseFloat(bubbleStyle.borderLeftWidth);
      const borderRight=Number.parseFloat(bubbleStyle.borderRightWidth);
      return {
        variant:args.variant,bubble:{x:bubble.x,y:bubble.y,width:bubble.width,height:bubble.height,bottom:bubble.bottom},
        padding:{top:Number.parseFloat(bubbleStyle.paddingTop),right:Number.parseFloat(bubbleStyle.paddingRight),bottom:Number.parseFloat(bubbleStyle.paddingBottom),left:Number.parseFloat(bubbleStyle.paddingLeft)},
        bottomSafeGapPx:last?Math.round((bubble.bottom-borderBottom-Number.parseFloat(bubbleStyle.paddingBottom)-last.bottom)*100)/100:null,
        title:title.textContent?.trim(),titleWords:(title.textContent??'').trim().split(/\s+/u).length,titleLines:nameRange(title),titleFontPx:Number.parseFloat(titleStyle.fontSize),
        supportLines:root.querySelectorAll('.v5-reveal-top3-support').length,tableCount:Number(root.matches('[data-v5-reveal="true"]'))+root.querySelectorAll('[data-v5-reveal="true"]').length,
        unitColumnCount:columns.filter((column)=>column.textContent?.trim()==='GIÂY').length,
        headerClipped:columns.some((column)=>column.scrollWidth>column.clientWidth+1),headerWidths:columns.map((column)=>({text:column.textContent?.trim(),client:column.clientWidth,scroll:column.scrollWidth})),
        fontSizes:[...new Set([title,columnsRow,...rows.flatMap((row)=>[row,...row.querySelectorAll<HTMLElement>('.v5-reveal-top3-rank,.v5-reveal-top3-name,.v5-reveal-top3-detail,.v5-reveal-top3-time')])].map((item)=>getComputedStyle(item).fontSize))],
        rowGaps:gaps,headerRowsGapPx:Math.round((rows[0]!.getBoundingClientRect().top-columnsBox.bottom)*100)/100,goldCount:root.querySelectorAll('[data-gold="true"]').length,rows:rowsMetrics,textContrast,
        fixedFrameMatches:Boolean(frame&&args.frameBefore&&frame.x===args.frameBefore.x&&frame.y===args.frameBefore.y&&frame.width===args.frameBefore.width&&frame.height===args.frameBefore.height),
        mcPlateGapPx:(()=>{const plate=document.querySelector<HTMLElement>('.v3-mc-plate')?.getBoundingClientRect();return plate?Math.round((bubble.left-plate.right)*100)/100:null;})(),
        bubbleInViewport:bubble.left>=0&&bubble.top>=0&&bubble.right<=innerWidth&&bubble.bottom<=innerHeight,
      };
    }, { variant, frameBefore });

    const record = metrics as {
      titleWords:number;titleLines:number;titleFontPx:number;supportLines:number;tableCount:number;unitColumnCount:number;
      fontSizes:string[];headerClipped:boolean;padding:{top:number;right:number;bottom:number;left:number};bottomSafeGapPx:number|null;
      rowGaps:number[];headerRowsGapPx:number;goldCount:number;rows:Array<{name:string;nameGraphemes:number;nameLines:number;nameClipped:boolean;playerClipped:boolean;time:string;timeClipped:boolean;nameTimeGapPx:number;nameFontPx:number;timeFontPx:number;tabularNums:boolean;gold:boolean;detailFontPx:number|null}>;
      textContrast:number[];fixedFrameMatches:boolean;mcPlateGapPx:number|null;bubbleInViewport:boolean;bubble:{x:number;y:number;width:number;height:number;bottom:number};
    };
    const checks = [
      record.titleWords<=4&&record.titleLines===1&&record.supportLines<=1,
      record.unitColumnCount===1&&!record.headerClipped&&record.rows.every((row)=>/^\d,\d s$/u.test(row.time)),
      record.rows.every((row)=>row.nameTimeGapPx>=24&&row.tabularNums),
      record.padding.top>=24&&record.padding.right>=24&&record.padding.bottom>=24&&record.padding.left>=24&&record.bottomSafeGapPx!==null&&record.bottomSafeGapPx>=12&&record.rowGaps.every((gap)=>gap>=8)&&record.headerRowsGapPx>=10,
      record.rows.every((row)=>row.nameFontPx>=28&&row.timeFontPx>=28)&&record.titleFontPx>=32&&record.fontSizes.length<=3&&record.rows.every((row)=>row.detailFontPx===null||row.detailFontPx>=22),
      record.goldCount===1&&record.rows.filter((row)=>row.gold).length===1,
      record.rows.every((row)=>row.nameGraphemes<=24&&row.nameLines<=2&&!row.nameClipped&&!row.playerClipped&&!row.timeClipped)&&(!variant.includes('long-name')||record.rows.some((row)=>row.name===longName&&row.nameGraphemes===24)),
      record.tableCount===1,
      Math.min(...record.textContrast)>=4.5,
      record.fixedFrameMatches&&record.bubbleInViewport&&(record.mcPlateGapPx===null||record.mcPlateGapPx>=24),
    ];
    for (const [index,passed] of checks.entries()) expect(passed, `REVEAL Top 3 ${variant}: rule ${index+1}; ${JSON.stringify(metrics)}`).toBe(true);
    const suffix=variant.replace('-','_');
    await page.screenshot({path:join(outputDirectory,`reveal-top3-fastest-${suffix}-1080x1920.png`),animations:'disabled'});
    const box=await callout.boundingBox();
    if(!box)throw new Error('Không đo được callout Top 3 nhanh nhất');
    await page.screenshot({path:join(outputDirectory,`reveal-top3-fastest-${suffix}-zoom.png`),clip:{x:box.x-12,y:box.y-12,width:box.width+24,height:box.height+24},animations:'disabled'});
    revealSamples.push({variant,metrics:metrics as Record<string,unknown>,checks});
  }

  const ruleNames=[
    'Tiêu đề ≤4 từ, tối đa 1 dòng phụ','Đơn vị giây chỉ một lần ở tiêu đề cột','Khoảng tên–giây ≥24px, số tabular',
    'Padding ≥24px, hàng cách ≥8px, đáy an toàn ≥12px','Tên/thời gian ≥28px, tiêu đề ≥32px, ≤3 cỡ chữ','Chỉ một điểm nhấn vàng',
    'Tên ≤24 grapheme, tối đa 2 dòng, không cắt','Một danh sách Top 3 trong callout','Tương phản chữ/nền ≥4.5:1','Khung Top 10 giữ nguyên, callout cách plate MC ≥24px',
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
      const detail=index===2?`khe tên–thời gian nhỏ nhất ${Math.min(...revealSamples.flatMap((sample)=>((sample.metrics.rows as Array<{nameTimeGapPx:number}>).map((row)=>row.nameTimeGapPx))))} px; số tabular`
        :index===3?`padding 24 px; đáy an toàn nhỏ nhất ${Math.min(...revealSamples.map((sample)=>(sample.metrics.bottomSafeGapPx as number??0)))} px; hàng cách ≥8 px`
        :index===4?`cỡ lớn nhất ${Math.max(...revealSamples.map((sample)=>(sample.metrics.fontSizes as string[]).length))} cỡ; tên/thời gian 28 px, tiêu đề 32 px`
        :index===6?`tên dài ${[...new Intl.Segmenter('vi',{granularity:'grapheme'}).segment(longName)].length} grapheme`
        :index===8?`tương phản thấp nhất ${Math.min(...revealSamples.flatMap((sample)=>sample.metrics.textContrast as number[])).toFixed(2)}:1`
        :index===9?'khung Top 10 so trước/sau; bubble cách plate MC'
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
  console.info(`[C-0307] Reveal Top 3 nhanh nhất: ${revealSamples.length} biến thể, mỗi biến thể 10/10 quy tắc; ${outputDirectory}`);
});
