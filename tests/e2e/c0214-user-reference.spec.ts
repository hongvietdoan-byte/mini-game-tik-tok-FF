import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const reviewRoot = join(process.cwd(), '.claude', 'review', 'C0214');
const targetBoxes = {
  'Logo + tagline frame': { x: 400, y: 30, width: 255, height: 210 },
  'Storm Arena': { x: 82, y: 133, width: 230, height: 92 },
  'Round card': { x: 770, y: 133, width: 230, height: 95 },
  'Title ribbon + arrow tips': { x: 220, y: 250, width: 635, height: 72 },
  'Top 10': { x: 88, y: 348, width: 317, height: 462 },
  'Question board': { x: 425, y: 348, width: 570, height: 465 },
  Timer: { x: 830, y: 368, width: 128, height: 128 },
  'Question tab': { x: 455, y: 370, width: 225, height: 55 },
  'Prompt frame': { x: 450, y: 510, width: 525, height: 145 },
  'Answer grid': { x: 447, y: 670, width: 531, height: 125 },
  'Kelly portrait': { x: 130, y: 815, width: 205, height: 205 },
  'Kelly nameplate': { x: 92, y: 1018, width: 250, height: 49 },
  'MC bubble': { x: 410, y: 860, width: 575, height: 145 },
} as const;

const box = (root: Element, selector: string) => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
};

test('C-0214 capture the five user-reference screenshots and check C-0216 geometry', async ({ page }) => {
  await mkdir(reviewRoot, { recursive: true });
  const captures = [
    { mock: 'question-ref', scene: 'QUESTION', output: 'question.png' },
    { mock: 'reveal-ref', scene: 'REVEAL', output: 'reveal.png' },
    { mock: 'fastest-a-ref', scene: 'REVEAL', output: 'fastest.png' },
    { mock: 'top10-ref', scene: 'INTERIM_TOP10', output: 'top10-mid-round.png' },
    { mock: 'lobby-ref', scene: 'LOBBY', output: 'lobby.png' },
  ] as const;
  const measurements: Array<{ name: string; phase: string; target: typeof targetBoxes[keyof typeof targetBoxes]; actual: ReturnType<typeof box> }> = [];
  let audienceMeasurement = '| 5×7 audience | hàng tên đầu x=158/350/541/733/925, y=1091; bục dưới cùng y=1795–1845 | — | — |';
  let fastestStackMeasurement = 'Fastest StormKing: chưa đo.';

  for (const capture of captures) {
    await page.goto(`/?mock=${capture.mock}`, { waitUntil: 'domcontentloaded' });
    const stage = page.locator(`[data-testid="stage"][data-scene="${capture.scene}"]`);
    await expect(stage).toBeVisible();
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
    expect(page.viewportSize()).toEqual({ width: 1080, height: 1920 });

    if (capture.mock === 'question-ref') {
      await expect(stage.getByTestId('question-tab')).toHaveText('CÂU HỎI 5');
      await expect(stage.getByTestId('timer')).toContainText('00:12');
      await expect(stage.getByTestId('answer-count')).toHaveCount(0);
      await expect(stage.locator('[data-testid^="option-"].is-correct')).toHaveCount(0);
      await expect(stage.locator('.v3-seat-name[data-row-index="6"]')).toHaveCount(5);
    }
    if (capture.mock === 'lobby-ref') {
      const lobbyBody = await stage.evaluate((root) => ['.v3-top10', '.v3-board', '.v3-mc'].map((selector) => {
        const element = root.querySelector<HTMLElement>(selector)!;
        const rect = element.getBoundingClientRect();
        return { selector, x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
      }));
      expect(lobbyBody).toEqual([
        { selector: '.v3-top10', x: 98, y: 345, width: 300, height: 466 },
        { selector: '.v3-board', x: 416, y: 345, width: 567, height: 470 },
        { selector: '.v3-mc', x: 0, y: 760, width: 1080, height: 470 },
      ]);
    }
    if (capture.mock === 'reveal-ref') {
      await expect(stage.locator('[data-testid^="option-"].is-correct')).toHaveAttribute('data-testid', 'option-B');
      await expect(stage.getByTestId('answer-count')).toHaveCount(0);
    }
    if (capture.mock === 'fastest-a-ref') {
      await expect(stage.getByTestId('fastest-callout')).toContainText('NHANH NHẤT');
      await expect(stage.getByTestId('fastest-callout')).toContainText('StormKing');
      await expect(stage.getByTestId('fastest-callout')).toContainText('1,2 giây');
      await expect(stage.locator('.v3-seat-name.is-fastest')).toHaveText('StormKing');
      const fastestSeatStack = await stage.evaluate((root) => {
        const fastestSeat = root.querySelector<HTMLElement>('.v3-seat.is-fastest')!;
        const fastestTag = root.querySelector<HTMLElement>('.v3-seat-name.is-fastest')!;
        const nameLayer = root.querySelector<HTMLElement>('.v3-nametags')!;
        const tagRect = fastestTag.getBoundingClientRect();
        const nextRowTags = Array.from(root.querySelectorAll<HTMLElement>('.v3-seat-name[data-row-index="5"]'));
        const fastestCenter = tagRect.left + tagRect.width / 2;
        const nextRowTag = nextRowTags.sort((a, b) => Math.abs(a.getBoundingClientRect().left + a.getBoundingClientRect().width / 2 - fastestCenter) - Math.abs(b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2 - fastestCenter))[0]!;
        const nextRowRect = nextRowTag.getBoundingClientRect();
        const fastChibi = fastestSeat.querySelector<HTMLElement>('.v3-chibi-img')!.getBoundingClientRect();
        const back = fastestSeat.querySelector<HTMLElement>('.v3-seat-back')!.getBoundingClientRect();
        return {
          nameLayer: Number.parseInt(getComputedStyle(nameLayer).zIndex, 10),
          fastestSeatLayer: Number.parseInt(getComputedStyle(fastestSeat).zIndex, 10),
          fastestTagText: fastestTag.textContent?.trim(),
          fastestTagOverlapsAvatar: tagRect.left < fastChibi.right && tagRect.right > fastChibi.left && tagRect.top < fastChibi.bottom && tagRect.bottom > fastChibi.top,
          fastestTagTop: Math.round(tagRect.top),
          fastestAvatarTop: Math.round(fastChibi.top),
          fastestBackTop: Math.round(back.top),
          fastestBackBottom: Math.round(back.bottom),
          nextRowTagTop: Math.round(nextRowRect.top),
          nextRowTagOverlapsSeatBack: back.left < nextRowRect.right && back.right > nextRowRect.left && back.top < nextRowRect.bottom && back.bottom > nextRowRect.top,
          nextRowTagLayer: Number.parseInt(getComputedStyle(nameLayer).zIndex, 10),
        };
      });
      expect(fastestSeatStack.fastestTagText).toBe('StormKing');
      expect(fastestSeatStack.fastestTagOverlapsAvatar).toBe(true);
      expect(fastestSeatStack.nameLayer).toBeGreaterThan(fastestSeatStack.fastestSeatLayer);
      expect(fastestSeatStack.nextRowTagOverlapsSeatBack).toBe(true);
      expect(fastestSeatStack.nextRowTagLayer).toBeGreaterThan(fastestSeatStack.fastestSeatLayer);
      fastestStackMeasurement = `| Ghế nhanh nhất | fastest/row 2 | StormKing nhãn y≈1091; ghế vàng y≈1174–1217; nhãn hàng 2 y≈1192 | nhãn y=${fastestSeatStack.fastestTagTop}; ghế y=${fastestSeatStack.fastestBackTop}–${fastestSeatStack.fastestBackBottom}; hàng 2 y=${fastestSeatStack.nextRowTagTop}; lớp nhãn ${fastestSeatStack.nameLayer} > ghế ${fastestSeatStack.fastestSeatLayer} | thứ tự lớp đã sửa |`;
      const fastestBox = await stage.getByTestId('mc-bubble').evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, background: style.backgroundImage, border: style.border, display: style.display };
      });
      expect(fastestBox.background).toContain('linear-gradient');
      expect(fastestBox.border).toContain('3px');
    }

    for (const [name, target] of Object.entries(targetBoxes)) {
      const selectors: Record<string, string> = {
        'Logo + tagline frame': '[data-testid="brand-logo-frame"]',
        'Storm Arena': '.v3-event-mark',
        'Round card': '[data-testid="round-card"]',
        'Title ribbon + arrow tips': '.v3-title-ribbon',
        'Top 10': '.v3-top10',
        'Question board': '.v3-board',
        Timer: '.v3-timer',
        'Question tab': '.v3-board-tab',
        'Prompt frame': '.v3-question',
        'Answer grid': '.v3-options',
        'Kelly portrait': '.v3-mc-figure',
        'Kelly nameplate': '.v3-mc-plate',
        'MC bubble': '.v3-bubble',
      };
      const actual = await stage.evaluate((root, { selector }) => {
        const element = root.querySelector<HTMLElement>(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
      }, { selector: selectors[name]! });
      if (capture.mock === 'question-ref' || capture.mock === 'fastest-a-ref') {
        if (capture.mock === 'question-ref') measurements.push({ name, phase: 'question + fastest', target, actual });
        expect(actual, `${name} must be measurable`).not.toBeNull();
        for (const dimension of ['x', 'y', 'width', 'height'] as const) {
          expect(Math.abs(actual![dimension] - target[dimension]), `${name}.${dimension} must stay within 12px of C-0216`).toBeLessThanOrEqual(12);
        }
      }
    }
    if (capture.mock === 'question-ref') {
      const rows = await stage.locator('.v3-seat-name[data-row-index="6"]').evaluateAll((elements) => elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { centerX: Math.round(rect.x + rect.width / 2), topY: Math.round(rect.y) };
      }));
      for (const [index, expected] of [158, 350, 541, 733, 925].entries()) {
        expect(Math.abs(rows[index]!.centerX - expected), `top row column ${index + 1}`).toBeLessThanOrEqual(12);
        expect(Math.abs(rows[index]!.topY - 1091), `top row label ${index + 1}`).toBeLessThanOrEqual(12);
      }
      const lowerPodium = await stage.locator('.v3-seat[data-row-index="0"]').first().evaluate((seat) => {
        const back = seat.querySelector<HTMLElement>('.v3-seat-back')!.getBoundingClientRect();
        return { top: Math.round(back.top), bottom: Math.round(back.bottom) };
      });
      expect(Math.abs(lowerPodium.top - 1795)).toBeLessThanOrEqual(5);
      expect(Math.abs(lowerPodium.bottom - 1845)).toBeLessThanOrEqual(5);
      const centers = rows.map((row) => row.centerX).join('/');
      const rowLabels = [...new Set(rows.map((row) => row.topY))].join('/');
      const audienceDelta = Math.max(
        ...rows.flatMap((row, index) => [Math.abs(row.centerX - [158, 350, 541, 733, 925][index]!), Math.abs(row.topY - 1091)]),
        Math.abs(lowerPodium.top - 1795),
        Math.abs(lowerPodium.bottom - 1845),
      );
      audienceMeasurement = `| 5×7 audience | tâm cột 158/350/541/733/925; nhãn y=1091; bục y=1795–1845 | tâm ${centers}; nhãn y=${rowLabels}; bục y=${lowerPodium.top}–${lowerPodium.bottom} | ${audienceDelta}px |`;
    }
    await stage.screenshot({ path: join(reviewRoot, capture.output), animations: 'disabled' });
  }

  const report = [
    '# C-0214 / C-0216 / C-0220 đo hình học',
    '',
    'Ảnh kiểm tra ở viewport 1080×1920; dung sai ±12px cho khung, tiêu đề, bảng câu hỏi, đáp án, MC và bong bóng.',
    '',
    '| Phần | Pha đo | Mẫu x/y/w/h | Bản dựng x/y/w/h | Lệch tuyệt đối lớn nhất |',
    '|---|---|---:|---:|---:|',
    ...measurements.map(({ name, phase, target, actual }) => {
      const targetText = `${target.x}/${target.y}/${target.width}/${target.height}`;
      const actualText = actual ? `${actual.x}/${actual.y}/${actual.width}/${actual.height}` : 'không đo được';
      const delta = actual ? Math.max(...(['x', 'y', 'width', 'height'] as const).map((key) => Math.abs(actual[key] - target[key]))) : '—';
      return `| ${name} | ${phase} | ${targetText} | ${actualText} | ${delta}px |`;
    }),
    fastestStackMeasurement,
    audienceMeasurement,
    '',
    'Mục 6–13 dùng một biến CSS dịch dọc −180px. Hàng ghế 5×7 giữ bục cuối trong ±5px; các hàng được giãn đều. Tên người chơi nằm trên chibi và bục theo thứ tự chiều sâu ghế, kể cả StormKing nhanh nhất. Nền `bg-question-user.jpg` giữ nguyên, không mask; khung Top 10/bảng đè khoảng 86px đáy cờ như C-0217. C-0067 ghi nhận các phần header giao HUD giả lập: ô VÒNG giao viewers/event banner; dải tiêu đề giao live chips/event banner. Các giao vùng này đi kèm toạ độ mẫu đã chốt; những kiểm tra crop còn lại vẫn chạy.',
  ].join('\n');
  await writeFile(join(reviewRoot, 'measurements.md'), report, 'utf8');
});
