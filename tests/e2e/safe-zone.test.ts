import { expect, test, type Page } from '@playwright/test';

const scenes = [
  { name: 'LOBBY', mock: 'lobby', scene: 'LOBBY', state: 'LOBBY', required: ['[data-layer="quiz-hud"]', '[data-testid="question-prompt"]', '[data-layer="leaderboard"]', '[data-testid="event-mark"]', '[data-testid="round-card"]', '.v3-title', '[data-layer="kelly"] .v3-mc-figure'] },
  { name: 'QUESTION', mock: 'question', scene: 'QUESTION', state: 'ACCEPTING', required: ['[data-layer="quiz-hud"]', '[data-testid="timer"]', '[data-testid="question-prompt"]', '[data-testid="option-A"]', '[data-layer="leaderboard"]', '[data-testid="event-mark"]', '[data-testid="round-card"]', '.v3-title', '[data-layer="kelly"] .v3-mc-figure'] },
  { name: 'REVEAL', mock: 'reveal', scene: 'REVEAL', state: 'LEADERBOARD', required: ['[data-layer="quiz-hud"]', '[data-testid="timer"]', '[data-testid="question-prompt"]', '[data-testid="option-A"]', '[data-layer="leaderboard"]', '[data-testid="event-mark"]', '[data-testid="round-card"]', '.v3-title', '[data-layer="kelly"] .v3-mc-figure'] },
  // Hợp đồng hiện tại phát state LEADERBOARD trong scene REVEAL; ghi riêng để không bỏ sót trạng thái.
  { name: 'LEADERBOARD', mock: 'reveal', scene: 'REVEAL', state: 'LEADERBOARD', required: ['[data-layer="quiz-hud"]', '[data-testid="timer"]', '[data-testid="question-prompt"]', '[data-testid="option-A"]', '[data-layer="leaderboard"]', '[data-testid="event-mark"]', '[data-testid="round-card"]', '.v3-title', '[data-layer="kelly"] .v3-mc-figure'] },
  { name: 'INTERIM_TOP10', mock: 'top10', scene: 'INTERIM_TOP10', state: 'LEADERBOARD', required: ['[data-testid="v3-top10-large"]', '[data-testid="v3-top10-large"] [data-testid="leaderboard-row"]', '.v3-full-round', '[data-testid="event-mark"]', '[data-testid="round-card"]', '.v3-title', '[data-testid="mc-celebration"]'] },
  { name: 'INTERMISSION', mock: 'intermission', scene: 'INTERMISSION', state: 'INTERMISSION', required: ['[data-testid="intermission-message"]', '[data-testid="timer"]', '.v3-scene-kicker', '[data-testid="event-mark"]', '[data-testid="round-card"]', '.v3-title'] },
  { name: 'VICTORY', mock: 'victory', scene: 'VICTORY', state: 'VICTORY', required: ['.v3v-trophy', '.v3v-header .v3-title', '.v3v-caption', '[data-testid^="podium-slot-"] .nameplate'] },
  { name: 'CONNECTION_LOST', mock: 'connection-lost', scene: 'CONNECTION_LOST', state: 'CONNECTION_INTERRUPTED', required: ['[data-testid="connection-lost-message"]', '.v3-scene-kicker', '[data-testid="event-mark"]', '[data-testid="round-card"]', '.v3-title'] },
] as const;

const importantElements = [
  { label: 'quiz-hud', selector: '[data-layer="quiz-hud"]' },
  { label: 'timer', selector: '[data-testid="timer"]' },
  { label: 'question', selector: '[data-testid="question-prompt"]' },
  { label: 'answer', selector: '[data-testid^="option-"]:not([data-testid="option-list"])' },
  { label: 'Top10', selector: '[data-layer="leaderboard"], [data-testid="v3-top10-large"]' },
  { label: 'Top10 row', selector: '[data-testid="v3-top10-large"] [data-testid="leaderboard-row"]' },
  { label: 'round label', selector: '.v3-full-round, .v3-scene-kicker, .v3-title-ribbon, .v3v-caption' },
  { label: 'top meta', selector: '[data-testid="round-card"]' },
  { label: 'brand logo', selector: '.v3-title img, .v3-title-main, .v3-crown, [data-testid="event-mark"]' },
  { label: 'trophy', selector: '.v3v-trophy' },
  { label: 'podium name', selector: '[data-testid^="podium-slot-"] .nameplate' },
  { label: 'MC figure', selector: '[data-layer="kelly"] .v3-mc-figure' },
  { label: 'MC plate', selector: '[data-layer="kelly"] .v3-mc-plate' },
  { label: 'MC bubble', selector: '[data-testid="mc-bubble"]' },
] as const;

const hudBlockers = [
  { label: 'host pill', selectors: ['[data-testid="tiktok-live-info"]'] },
  { label: 'viewers', selectors: ['[data-testid="tiktok-viewers"]', '.tiktok-hud-live-copy small'] },
  { label: 'live chips', selectors: ['[data-testid="tiktok-live-chips"]', '[data-testid="tiktok-actions"]'] },
  { label: 'event banner', selectors: ['[data-testid="tiktok-event-banner"]', '.tiktok-hud-demo-label'] },
  { label: 'comment rail', selectors: ['[data-testid="tiktok-comments"]'] },
  { label: 'comment input', selectors: ['[data-testid="tiktok-comment-bar"]'] },
] as const;

type SafeZoneIssue = { element: string; rule: string; x: string; y: string };

async function inspectSafeZone(page: Page): Promise<{ issues: SafeZoneIssue[]; report: string[]; observedBlockers: string[] }> {
  return page.evaluate(({ important, blockers }) => {
    const stage = document.querySelector<HTMLElement>('[data-testid="stage"]');
    if (!stage) throw new Error('Không tìm thấy stage');
    const stageBox = stage.getBoundingClientRect();
    if (stageBox.width <= 0 || stageBox.height <= 0) throw new Error('Stage không có kích thước');
    const isVictoryScene = stage.querySelector('.v3v') !== null;

    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const describe = (box: DOMRect) => ({
      x1: ((box.left - stageBox.left) / stageBox.width) * 100,
      x2: ((box.right - stageBox.left) / stageBox.width) * 100,
      y1: ((box.top - stageBox.top) / stageBox.height) * 100,
      y2: ((box.bottom - stageBox.top) / stageBox.height) * 100,
    });
    const importantBoxes = important.flatMap(({ label, selector }) => {
      const elements = Array.from(stage.querySelectorAll(selector)).filter(visible);
      return elements.map((element, index) => ({
        label: elements.length > 1 ? `${label} ${index + 1}` : label,
        box: element.getBoundingClientRect(),
      }));
    });
    const blockersFound = blockers.flatMap(({ label, selectors }) => {
      const element = selectors.map((selector) => stage.querySelector(selector)).find((candidate) => candidate && visible(candidate));
      return element ? [{ label, box: element.getBoundingClientRect() }] : [];
    });

    const issues: SafeZoneIssue[] = [];
    const report = [`Phần tử | Quy tắc | x% | y%`];
    for (const item of importantBoxes) {
      const p = describe(item.box);
      const add = (rule: string) => {
        const row = { element: item.label, rule, x: `${p.x1.toFixed(1)}–${p.x2.toFixed(1)}`, y: `${p.y1.toFixed(1)}–${p.y2.toFixed(1)}` };
        issues.push(row);
        report.push(`${row.element} | ${row.rule} | ${row.x} | ${row.y}`);
      };
      const isBrandLogo = item.label.startsWith('brand logo');
      const isTopMeta = item.label.startsWith('top meta');
      const decorativeBleed = item.label === 'trophy';
      const approvedVictoryNameplate = isVictoryScene && item.label.startsWith('podium name');
      if (!decorativeBleed && !approvedVictoryNameplate && !isBrandLogo && (p.x1 < 8.9 || p.x2 > 91.1)) add('crop-fill: phải nằm trong x=9–91%');
      if (isBrandLogo) {
        const logoTopMin = isVictoryScene ? 1.8 : 0.8;
        const logoTopMax = isVictoryScene ? 3 : 1.3;
        const logoBottomLimit = isVictoryScene ? 21 : 12.1;
        if (p.y1 < logoTopMin || p.y1 > logoTopMax || p.y2 > logoBottomLimit) add(`logo: vị trí theo ref C-0073/C-0082 (y≈${logoTopMin}–${logoBottomLimit}%)`);
      } else if (isTopMeta) {
        if (p.y1 < 0.8 || p.y2 > 12.1) add('thông tin vòng phải nằm trong dải header theo ref');
      } else if (p.y1 < 14) add('HUD trên: y bắt đầu từ 14%');
      const commentBandTop = isVictoryScene ? 79 : 73;
      if (p.x1 < 70 && p.y2 > commentBandTop && p.y1 < 92) add(`cột bình luận trái: vùng x<70%, y=${commentBandTop}–92%`);
      if (p.y2 >= 92.5) add('thanh nhập: y phải nhỏ hơn 92.5%');
      for (const blocker of blockersFound) {
        // HUD có thể phủ vùng trong suốt ở mép logo BVĐC; nội dung chính của logo vẫn nằm giữa.
        if (item.label.startsWith('brand logo') && ['host pill', 'viewers', 'live chips'].includes(blocker.label)) continue;
        if (intersects(item.box, blocker.box)) add(`giao vùng HUD: ${blocker.label}`);
      }
    }
    return { issues, report, observedBlockers: blockersFound.map((blocker) => blocker.label) };
  }, { important: importantElements, blockers: hudBlockers });
}

for (const scene of scenes) {
  test(`TikTok safe-zone: ${scene.name}`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    await page.goto(`/?mock=${encodeURIComponent(scene.mock)}&hud=1`, { waitUntil: 'domcontentloaded' });
    const stage = page.locator(`[data-testid="stage"][data-scene="${scene.scene}"]`);
    await expect(stage).toBeVisible();
    await expect(page.getByTestId('tiktok-hud')).toBeVisible();
    for (const selector of scene.required) await expect(stage.locator(selector).first(), `${scene.name}: phải có ${selector}`).toBeVisible();
    if (scene.name === 'VICTORY') {
      await expect(stage.locator('[data-testid^="podium-slot-"] .nameplate')).toHaveCount(3);
      await expect(stage.getByTestId('mc-celebration')).toBeVisible();
    }
    expect(page.viewportSize()).toEqual({ width: 1080, height: 1920 });
    if (scene.name === 'VICTORY') await page.waitForTimeout(8_100);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    const { issues, report, observedBlockers } = await inspectSafeZone(page);
    expect(observedBlockers, `${scene.name}: phải đo được đủ vùng che HUD mock`).toEqual(hudBlockers.map(({ label }) => label));
    expect(runtimeErrors, `${scene.name}: lỗi runtime ngoài vùng safe-zone`).toEqual([]);
    if (issues.length) {
      console.log(`C-0067 ${scene.name} (${scene.state}) — bảng phần tử vi phạm safe-zone:\n${report.join('\n')}`);
      expect(issues, report.join('\n')).toEqual([]);
    }
  });
}
