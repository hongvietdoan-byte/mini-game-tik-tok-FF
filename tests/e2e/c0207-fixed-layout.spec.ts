import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { makeMockSnapshot } from '../../apps/overlay/src/mock/snapshots';

const reviewRoot = join(process.cwd(), '.claude', 'review', 'C0214');
const headerVariants = ['A', 'B'] as const;
const supportsFastestMocks = Boolean(makeMockSnapshot('fastest-a')) && Boolean(makeMockSnapshot('fastest-b'));
const seatColumns = [160, 350, 540, 730, 920];
  const seatRows = [1839, 1734.33, 1629.67, 1525, 1420.33, 1315.67, 1211];
const reference = {
  top10: { x: 88, y: 348, width: 317, height: 462 },
  board: { x: 425, y: 348, width: 570, height: 465 },
  prompt: { x: 450, y: 510, width: 525, height: 145 },
  options: { x: 447, y: 670, width: 531, height: 125 },
  mc: { x: 0, y: 815, width: 1080, height: 252 },
  figure: { x: 130, y: 815, width: 205, height: 205 },
  plate: { x: 92, y: 1018, width: 250, height: 49 },
  bubble: { x: 410, y: 860, width: 575, height: 145 },
  timer: { x: 830, y: 368, width: 128, height: 128 },
  logoFrame: { x: 400, y: 30, width: 255, height: 210 },
  ribbon: { x: 220, y: 250, width: 635, height: 72 },
  event: { x: 82, y: 133, width: 230, height: 92 },
  round: { x: 770, y: 133, width: 230, height: 95 },
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
  test(`C-0207/header ${header}: user mockup C-0216 geometry stays fixed across question phases`, async ({ page }) => {
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
        const background = root.querySelector<HTMLImageElement>('.v3-arena-backdrop-image');
        const backgroundStyle = background ? getComputedStyle(background) : null;
        return {
          top10: rect('.v3-top10'),
          board: rect('.v3-board'),
          prompt: rect('.v3-question'),
          options: rect('.v3-options'),
          timer: rect('[data-testid="timer"]'),
          mc: rect('.v3-mc'),
          figure: rect('.v3-mc-figure'),
          plate: rect('.v3-mc-plate'),
          bubble: rect('.v3-bubble'),
          logoFrame: rect('[data-testid="brand-logo-frame"]'),
          ribbon: rect('.v3-title-ribbon'),
          event: rect('.v3-event-mark'),
          round: rect('[data-testid="round-card"]'),
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

      expect(geometry.top10, `${header}/${phase.name}: Top 10 follows the user's reference`).toEqual(reference.top10);
      expect(geometry.board, `${header}/${phase.name}: question frame follows the user's reference`).toEqual(reference.board);
      expect(geometry.prompt, `${header}/${phase.name}: prompt follows the user's reference`).toEqual(reference.prompt);
      expect(geometry.options, `${header}/${phase.name}: answer grid follows the user's reference`).toEqual(reference.options);
      expect(geometry.mc, `${header}/${phase.name}: MC stage follows the user's reference`).toEqual(reference.mc);
      expect(geometry.figure, `${header}/${phase.name}: head-and-shoulders portrait follows the user's reference`).toEqual(reference.figure);
      expect(geometry.plate, `${header}/${phase.name}: Kelly nameplate follows the user's reference`).toEqual(reference.plate);
      expect(geometry.bubble, `${header}/${phase.name}: MC bubble follows the user's reference`).toEqual(reference.bubble);
      expect(geometry.logoFrame, `${header}/${phase.name}: event logo frame`).toEqual(reference.logoFrame);
      expect(geometry.ribbon, `${header}/${phase.name}: arrow ribbon`).toEqual(reference.ribbon);
      expect(geometry.event, `${header}/${phase.name}: Storm Arena mark`).toEqual(reference.event);
      expect(geometry.round, `${header}/${phase.name}: three-row round card`).toEqual(reference.round);
      expect(geometry.timer, `${header}/${phase.name}: inset timer`).toEqual(phase.name === 'reading' ? null : reference.timer);
      expect(geometry.seatCount, `${header}/${phase.name}: all 35 seats remain mounted`).toBe(35);
      expect(geometry.nameTagCount, `${header}/${phase.name}: all 35 name tags remain mounted`).toBe(35);
      expect(geometry.seats, `${header}/${phase.name}: audience rows match C-0219`).toEqual(
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
      const expectedFonts = ['26px', '44px', '20px'];
      const actualFonts = await Promise.all([
        roundCard.locator('.v3-round-title'),
        roundCard.getByTestId('participant-count'),
        roundCard.locator('.v3-round-label'),
      ].map((element) => element.evaluate((node) => getComputedStyle(node).fontSize)));
      expect(actualFonts, `${header}: only the round-card type scale changes`).toEqual(expectedFonts);

      console.log(`C-0216 user reference · ${header}/${phase.name}: ${JSON.stringify({
        Target: {
          top10: reference.top10, board: reference.board, timer: phase.name === 'reading' ? null : reference.timer,
          bubble: reference.bubble, mc: reference.mc, figure: reference.figure, plate: reference.plate, seatCount: 35,
        },
        Render: {
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
