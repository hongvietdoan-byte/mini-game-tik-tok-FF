import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { makeMockSnapshot } from '../../apps/overlay/src/mock/snapshots';

const reviewRoot = join(process.cwd(), '.claude', 'review', 'C0207');
const headerVariants = ['A', 'B'] as const;
const supportsFastestMocks = Boolean(makeMockSnapshot('fastest-a')) && Boolean(makeMockSnapshot('fastest-b'));
const seatColumns = [160, 350, 540, 730, 920];
const seatRows = [1860, 1771.67, 1683.33, 1595, 1506.67, 1418.33, 1330];
const reference = {
  top10: { x: 98, y: 345, width: 300, height: 466 },
  board: { x: 416, y: 345, width: 567, height: 470 },
  prompt: { x: 436, y: 492, width: 527, height: 160 },
  options: { x: 438, y: 667, width: 512, height: 136 },
  mc: { x: 0, y: 760, width: 1080, height: 470 },
  figure: { x: 108, y: 760, width: 280, height: 390 },
  plate: { x: 100, y: 1152, width: 280, height: 56 },
  bubble: { x: 410, y: 844, width: 568, height: 220 },
  timer: { x: 409, y: 0, width: 138, height: 138 },
} as const;

const phases = [
  { mock: 'prepare', scene: 'QUESTION', name: 'prepare' },
  { mock: 'reading', scene: 'QUESTION', name: 'reading' },
  { mock: 'question', scene: 'QUESTION', name: 'question' },
  { mock: 'reveal', scene: 'REVEAL', name: 'reveal' },
  ...(supportsFastestMocks ? [
    { mock: 'fastest-a', scene: 'REVEAL', name: 'fastest-a' },
    { mock: 'fastest-b', scene: 'REVEAL', name: 'fastest-b' },
  ] : []),
] as const;

for (const header of headerVariants) {
  test(`C-0207 header ${header}: fixed layout equals origin/main and captures review states`, async ({ page }) => {
    const reviewDir = join(reviewRoot, `header-${header}`);
    await mkdir(reviewDir, { recursive: true });

    for (const phase of phases) {
      const query = new URLSearchParams({ mock: phase.mock, header: header.toLowerCase() });
      await page.goto(`/?${query.toString()}`, { waitUntil: 'domcontentloaded' });
      const stage = page.getByTestId('stage');
      await expect(stage).toHaveAttribute('data-scene', phase.scene);
      await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

      const geometry = await stage.evaluate((root) => {
        const rect = (selector: string) => {
          const element = root.querySelector<HTMLElement>(selector);
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
        };
        const layout = (selector: string) => {
          const element = root.querySelector<HTMLElement>(selector);
          return element ? { x: element.offsetLeft, y: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight } : null;
        };
        const background = root.querySelector<HTMLImageElement>('.v3-arena-backdrop-image');
        const backgroundStyle = background ? getComputedStyle(background) : null;
        return {
          top10: rect('.v3-top10'),
          board: rect('.v3-board'),
          prompt: rect('.v3-question'),
          options: rect('.v3-options'),
          timer: layout('[data-testid="timer"]'),
          mc: rect('.v3-mc'),
          figure: rect('.v3-mc-figure'),
          plate: rect('.v3-mc-plate'),
          bubble: rect('.v3-bubble'),
          seats: [...root.querySelectorAll<HTMLElement>('.v3-seat')].map((seat) => ({
            left: Number.parseFloat(seat.style.left),
            top: Number.parseFloat(seat.style.top),
          })),
          seatCount: root.querySelectorAll('.v3-seat').length,
          nameTagCount: root.querySelectorAll('.v3-seat-name').length,
          hasMask: root.querySelector('.v3-question-banner-mask') !== null,
          background: background && backgroundStyle ? {
            src: background.getAttribute('src'),
            objectFit: backgroundStyle.objectFit,
            objectPosition: backgroundStyle.objectPosition,
            transform: backgroundStyle.transform,
            naturalWidth: background.naturalWidth,
            naturalHeight: background.naturalHeight,
          } : null,
        };
      });

      expect(geometry.top10, `${header}/${phase.name}: Top 10 frame matches origin/main`).toEqual(reference.top10);
      expect(geometry.board, `${header}/${phase.name}: question frame matches origin/main`).toEqual(reference.board);
      expect(geometry.prompt, `${header}/${phase.name}: prompt box matches origin/main`).toEqual(reference.prompt);
      expect(geometry.options, `${header}/${phase.name}: answer region matches origin/main`).toEqual(reference.options);
      expect(geometry.mc, `${header}/${phase.name}: MC frame matches origin/main`).toEqual(reference.mc);
      expect(geometry.figure, `${header}/${phase.name}: Kelly portrait matches origin/main`).toEqual(reference.figure);
      expect(geometry.plate, `${header}/${phase.name}: Kelly nameplate matches origin/main`).toEqual(reference.plate);
      expect(geometry.bubble, `${header}/${phase.name}: MC bubble matches origin/main`).toEqual(reference.bubble);
      expect(geometry.timer, `${header}/${phase.name}: timer fixed layout matches origin/main`).toEqual(phase.name === 'reading' ? null : reference.timer);
      expect(geometry.seatCount, `${header}/${phase.name}: all 35 seats remain mounted`).toBe(35);
      expect(geometry.nameTagCount, `${header}/${phase.name}: all 35 name tags remain mounted`).toBe(35);
      expect(geometry.seats, `${header}/${phase.name}: all seat coordinates match origin/main`).toEqual(
        seatRows.flatMap((top) => seatColumns.map((left) => ({ left, top }))),
      );
      expect(geometry.hasMask, `${header}/${phase.name}: baked flag strip is not masked`).toBe(false);
      expect(geometry.background?.src, `${header}/${phase.name}: question scene retains the user background`).toBe('/assets/arena/bg-question-user.jpg');
      expect(geometry.background?.objectFit).toBe('cover');
      expect(geometry.background?.objectPosition).toBe('50% 50%');
      expect(geometry.background?.transform).toBe('none');
      if (geometry.background?.naturalWidth) {
        expect(geometry.background.naturalWidth / geometry.background.naturalHeight).toBeCloseTo(1080 / 1920, 4);
      }

      const roundCard = stage.getByTestId('round-card');
      const expectedFonts = header === 'A' ? ['36px', '52px', '24px'] : ['24px', '34px', '18px'];
      const actualFonts = await Promise.all([
        roundCard.locator('.v3-round-title'),
        roundCard.getByTestId('participant-count'),
        roundCard.locator('.v3-round-label'),
      ].map((element) => element.evaluate((node) => getComputedStyle(node).fontSize)));
      expect(actualFonts, `${header}: only the round-card type scale changes`).toEqual(expectedFonts);

      console.log(`C-0207 Main · Branch ${header}/${phase.name}: ${JSON.stringify({
        Main: {
          top10: reference.top10, board: reference.board, timer: phase.name === 'reading' ? null : reference.timer,
          bubble: reference.bubble, mc: reference.mc, figure: reference.figure, plate: reference.plate, seatCount: 35,
        },
        Branch: {
          top10: geometry.top10, board: geometry.board, timer: geometry.timer, bubble: geometry.bubble,
          mc: geometry.mc, figure: geometry.figure, plate: geometry.plate, seatCount: geometry.seatCount,
        },
      })}`);

      if (['question', 'reveal', 'fastest-a', 'fastest-b'].includes(phase.name)) {
        await stage.screenshot({ path: join(reviewDir, `${phase.name}.png`) });
      }
    }

    const top10Query = new URLSearchParams({ mock: 'top10', header: header.toLowerCase() });
    await page.goto(`/?${top10Query.toString()}`, { waitUntil: 'domcontentloaded' });
    const midRound = page.getByTestId('stage');
    await expect(midRound).toHaveAttribute('data-scene', 'INTERIM_TOP10');
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await midRound.screenshot({ path: join(reviewDir, 'top10-mid-round.png') });
  });
}
