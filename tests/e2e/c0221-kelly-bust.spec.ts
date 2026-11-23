import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { getE2eAssetDirectory, usesE2ePlaceholderAssets } from './assets';

const repositoryRoot = resolve(process.cwd(), '..', '..', '..');
const reviewRoot = join(process.cwd(), '.claude', 'review', 'C0221');
const placeholderAssets = usesE2ePlaceholderAssets();
const samplePath = placeholderAssets
  ? join(getE2eAssetDirectory(), 'mc', 'kelly.png')
  : join(repositoryRoot, 'assets-local', 'review', 'mau-nguoi-dung', 'mau-1114.png');
// Visual landmark on the approved 273×640 kelly.png: the bottom point of the chin.
const chinSourceY = 280;

type Rect = { x: number; y: number; width: number; height: number; right: number; bottom: number };

test('C-0221 Kelly bust crops cleanly in question/fastest and Top 10 guide sits against the leaderboard', async ({ page }) => {
  await mkdir(reviewRoot, { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const captures = [
    { mock: 'question-ref', scene: 'QUESTION', file: 'question.png' },
    { mock: 'fastest-a-ref', scene: 'REVEAL', file: 'fastest.png' },
    { mock: 'top10-ref', scene: 'INTERIM_TOP10', file: 'top10-mid-round.png' },
  ] as const;
  const rows: string[] = [];
  const screenshotPaths = new Map<string, string>();

  for (const capture of captures) {
    await page.goto(`/?mock=${capture.mock}`, { waitUntil: 'domcontentloaded' });
    const stage = page.locator(`[data-testid="stage"][data-scene="${capture.scene}"]`);
    await expect(stage).toBeVisible();
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    expect(page.viewportSize()).toEqual({ width: 1080, height: 1920 });

    if (capture.scene === 'INTERIM_TOP10') {
      const geometry = await stage.evaluate((root) => {
        const rect = (element: Element): Rect => {
          const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
          return Object.fromEntries(Object.entries({ x, y, width, height, right, bottom }).map(([key, value]) => [key, Math.round(value * 100) / 100])) as Rect;
        };
        const guide = root.querySelector<HTMLElement>('[data-testid="top10-guide"]')!;
        const board = root.querySelector<HTMLElement>('[data-layer="leaderboard-full"]')!;
        const figure = guide.querySelector<HTMLElement>('.v3-mc-figure')!;
        const image = figure.querySelector<HTMLImageElement>('img')!;
        return {
          guide: rect(guide), board: rect(board), figure: rect(figure), image: {
            ...rect(image), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
          },
        };
      });
      expect(geometry.guide.x).toBe(744);
      expect(geometry.guide.y).toBe(1138);
      expect(geometry.guide.right).toBe(968);
      expect(geometry.guide.bottom).toBe(1512);
      expect(geometry.guide.y - geometry.board.bottom).toBeGreaterThanOrEqual(12);
      expect(geometry.guide.y - geometry.board.bottom).toBeLessThanOrEqual(20);
      expect(geometry.figure).toMatchObject({ x: 744, y: 1138, width: 224, height: 225 });
      expect(geometry.image.width).toBe(180);
      expect(geometry.image.naturalWidth).toBeGreaterThan(0);
      expect(geometry.image.naturalHeight).toBeGreaterThan(0);
      expect(geometry.image.height / geometry.image.width).toBeCloseTo(geometry.image.naturalHeight / geometry.image.naturalWidth, 2);
      const visibleSourceHeight = Math.round((geometry.figure.height / geometry.image.height) * geometry.image.naturalHeight);
      if (!placeholderAssets) expect(visibleSourceHeight).toBeGreaterThanOrEqual(330);
      rows.push(`| Top 10 giữa vòng | x=${geometry.guide.x} y=${geometry.guide.y} w=${geometry.guide.width} h=${geometry.guide.height} | bảng đáy y=${geometry.board.bottom}; cách ${geometry.guide.y - geometry.board.bottom}px; mép phải ${geometry.guide.right} | ${placeholderAssets ? 'placeholder' : 'Kelly'} frame ${geometry.figure.x}/${geometry.figure.y}/${geometry.figure.width}/${geometry.figure.height}; ảnh ${geometry.image.width}×${Math.round(geometry.image.height)} giữ tỉ lệ${placeholderAssets ? '' : `; thấy ${visibleSourceHeight}px nguồn`} |`);
    } else {
      const geometry = await stage.evaluate((root) => {
        const rect = (element: Element): Rect => {
          const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
          return Object.fromEntries(Object.entries({ x, y, width, height, right, bottom }).map(([key, value]) => [key, Math.round(value * 100) / 100])) as Rect;
        };
        const figure = root.querySelector<HTMLElement>('.v3-mc .v3-mc-figure')!;
        const image = figure.querySelector<HTMLImageElement>('img')!;
        const plate = root.querySelector<HTMLElement>('.v3-mc .v3-mc-plate')!;
        return {
          figure: rect(figure),
          image: { ...rect(image), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight },
          plate: rect(plate),
          overflow: getComputedStyle(figure).overflow,
        };
      });
      // The supported throne layout keeps the portrait frame at its 30-seat geometry.
      expect(geometry.figure).toMatchObject({ x: 130, y: 826, width: 205, height: 210 });
      expect(geometry.plate).toMatchObject({ x: 92, y: 1013, width: 252, height: 49 });
      expect(geometry.overflow).toBe('hidden');
      // Keep the approved image scale while measuring its visible source in the throne frame.
      expect(geometry.image.width).toBeCloseTo(134.4, 1);
      expect(geometry.image.x).toBeCloseTo(geometry.figure.x + (geometry.figure.width - geometry.image.width) / 2, 0);
      expect(geometry.image.y).toBe(geometry.figure.y);
      expect(geometry.image.naturalWidth).toBeGreaterThan(0);
      expect(geometry.image.naturalHeight).toBeGreaterThan(0);
      expect(geometry.image.height / geometry.image.width).toBeCloseTo(geometry.image.naturalHeight / geometry.image.naturalWidth, 2);
      const visibleSourceBottom = Math.round(((geometry.figure.bottom - geometry.image.y) / geometry.image.height) * geometry.image.naturalHeight);
      let cropNote = `placeholder; thấy ${visibleSourceBottom}px nguồn`;
      if (!placeholderAssets) {
        // C-0317's 80% image scale remains; this measures the current throne-frame crop.
        expect(visibleSourceBottom).toBeGreaterThanOrEqual(420);
        expect(visibleSourceBottom).toBeLessThanOrEqual(440);
        const chinY = Math.round(geometry.image.y + (chinSourceY / geometry.image.naturalHeight) * geometry.image.height);
        expect(chinY).toBeGreaterThan(geometry.figure.y + geometry.figure.height * 0.6);
        expect(chinY).toBeLessThan(geometry.figure.bottom);
        cropNote = `tóc trên y=${geometry.image.y}; cằm y≈${chinY}; mép dưới ô y=${geometry.figure.bottom}; thấy y≈${visibleSourceBottom} ảnh nguồn, cắt ngang ngực`;
      }
      rows.push(`| ${placeholderAssets ? 'Placeholder MC' : 'Kelly'} ${capture.scene === 'QUESTION' ? 'QUESTION' : 'FASTEST'} | frame ${geometry.figure.x}/${geometry.figure.y}/${geometry.figure.width}/${geometry.figure.height}; nameplate ${geometry.plate.x}/${geometry.plate.y}/${geometry.plate.width}/${geometry.plate.height} | ${cropNote} | ảnh ${geometry.image.width}×${Math.round(geometry.image.height)} giữ tỉ lệ |`);
    }

    const output = join(reviewRoot, capture.file);
    await stage.screenshot({ path: output, animations: 'disabled' });
    screenshotPaths.set(capture.file, output);
  }

  const sample = await readFile(samplePath);
  const question = await readFile(screenshotPaths.get('question.png')!);
  const comparison = await page.context().newPage();
  await comparison.setViewportSize({ width: 2160, height: 1920 });
  await comparison.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}html,body{margin:0;width:2160px;height:1920px;background:#080c29;color:#fff;font:700 32px system-ui}
    main{display:grid;grid-template-columns:1080px 1080px;width:2160px;height:1920px}
    section{position:relative;width:1080px;height:1920px;overflow:hidden}
    h1{position:absolute;z-index:2;top:20px;left:24px;margin:0;padding:10px 18px;border-radius:12px;background:#17114cdd;font-size:30px}
    img{display:block;width:1080px;height:1920px;object-fit:contain}
  </style></head><body><main>
    <section><h1>${placeholderAssets ? 'PLACEHOLDER DEMO · MC' : 'MẪU · ẢNH NGƯỜI DÙNG'}</h1><img src="data:image/png;base64,${sample.toString('base64')}"></section>
    <section><h1>${placeholderAssets ? 'PLACEHOLDER DEMO · QUESTION' : 'BẢN DỰNG · QUESTION'}</h1><img src="data:image/png;base64,${question.toString('base64')}"></section>
  </main></body></html>`);
  await comparison.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
  await comparison.screenshot({ path: join(reviewRoot, 'question-side-by-side.png'), animations: 'disabled' });
  await comparison.close();

  const report = [
    '# C-0221 · Kelly bán thân và vị trí Top 10',
    '',
    placeholderAssets
      ? 'Viewport kiểm tra: 1080×1920 với asset placeholder. E2E xác minh ảnh placeholder tải được, giữ tỉ lệ, và các khung MC/Top 10 đúng vị trí; số đo cằm/crop chỉ áp dụng khi có asset Kelly thật.'
      : 'Viewport kiểm tra: 1080×1920. Ảnh Kelly giữ tỉ lệ gốc, được phóng bên trong cửa sổ cắt cố định; mục Top 10 chỉ đổi vị trí cụm MC.',
    '',
    '| Pha / phần | Hộp đo | Số đo / khoảng cách | Đo ảnh Kelly |',
    '|---|---|---|---|',
    ...rows,
    '',
    placeholderAssets
      ? 'C-0317 đặt khung MC QUESTION/FASTEST tại 130/826/205/158 để chừa hàng chibi; bảng tên y=1013 giữ khe 29px (x=92, 250×49). Cụm Top 10 giữ kích thước, mép phải căn với bảng; khoảng cách dọc 12–20px.'
      : 'C-0317 đặt khung Kelly QUESTION/FASTEST tại 130/826/205/158 để chừa hàng chibi; bảng tên y=1013 giữ khe 29px (x=92, 250×49). Cụm Top 10 giữ kích thước, mép phải căn với bảng; khoảng cách dọc 12–20px.',
  ].join('\n');
  await writeFile(join(reviewRoot, 'measurements.md'), report, 'utf8');
});
