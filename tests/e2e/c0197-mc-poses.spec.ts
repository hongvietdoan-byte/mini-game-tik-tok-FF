import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

const poseStates = ['idle', 'welcome', 'ask', 'react', 'celebrate'] as const;
const mockScenes = [
  { mock: 'top10', pose: 'idle' },
  { mock: 'lobby', pose: 'welcome' },
  { mock: 'question', pose: 'ask' },
  { mock: 'reveal', pose: 'react' },
  { mock: 'question', pose: 'celebrate' },
] as const;

function placeholderSvg(pose: string): string {
  const poses: Record<string, { arms: string; accent: string }> = {
    idle: { arms: 'M58 151 Q37 178 45 217 L66 217 L83 175 M162 151 Q183 178 175 217 L154 217 L137 175', accent: '#9f8dff' },
    welcome: { arms: 'M58 151 Q28 125 21 92 L40 84 L82 145 M162 151 Q192 125 199 92 L180 84 L138 145', accent: '#5de6ff' },
    ask: { arms: 'M58 151 Q34 173 43 211 L66 211 L82 174 M162 151 Q179 127 205 116 L216 132 L138 173', accent: '#ffc84a' },
    react: { arms: 'M58 151 Q28 135 22 104 L42 96 L82 146 M162 151 Q192 135 198 104 L178 96 L138 146', accent: '#ff7cdc' },
    celebrate: { arms: 'M58 151 Q31 126 29 73 L51 67 L84 145 M162 151 Q189 126 191 73 L169 67 L136 145', accent: '#8dff9a' },
  };
  const poseInfo = poses[pose] ?? poses.idle!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="240" viewBox="0 0 220 240">
    <defs><linearGradient id="coat" x2="0" y2="1"><stop stop-color="#ffe24c"/><stop offset="1" stop-color="#f39a1d"/></linearGradient></defs>
    <ellipse cx="110" cy="229" rx="62" ry="8" fill="#090b38" opacity=".5"/>
    <path d="${poseInfo.arms}" fill="none" stroke="#ffd2b8" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M74 132 Q110 117 146 132 L163 222 L57 222Z" fill="url(#coat)" stroke="${poseInfo.accent}" stroke-width="4"/>
    <path d="M92 132 L110 168 L128 132" fill="#fff"/>
    <ellipse cx="110" cy="78" rx="43" ry="51" fill="#ffd2b8"/>
    <path d="M66 81 Q59 23 111 24 Q162 25 155 84 L146 73 Q137 44 112 48 Q88 47 73 79Z" fill="#48233b"/>
    <path d="M81 86 Q92 77 102 86 M118 86 Q130 77 140 86" fill="none" stroke="#3a2542" stroke-width="6" stroke-linecap="round"/>
    <circle cx="110" cy="110" r="4" fill="#e67f79"/>
    <rect x="59" y="196" width="102" height="24" rx="12" fill="#21164f" stroke="${poseInfo.accent}" stroke-width="2"/>
    <text x="110" y="213" text-anchor="middle" fill="#fff" font-size="13" font-family="sans-serif" font-weight="700">KELLY · ${pose.toUpperCase()} · MẪU</text>
  </svg>`;
}

test('MC supports one static image per pose and captures the five pose placeholders', async ({ page }) => {
  const reviewDir = join(process.cwd(), '.claude', 'review', 'C0197C');
  await mkdir(reviewDir, { recursive: true });
  await page.route('**/assets/mc/kelly/manifest.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'c0197-static-pose-placeholders',
      animations: Object.fromEntries(poseStates.map((pose) => [pose, { path: pose, frames: 1, fps: 1, loop: true }])),
    }),
  }));
  await page.route('**/assets/mc/kelly/**/*.png', async (route) => {
    const url = new URL(route.request().url());
    const pose = url.pathname.match(/\/kelly\/([^/]+)\/0001\.png$/)?.[1] ?? 'idle';
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: placeholderSvg(pose) });
  });
  const screenshotPage = await page.context().newPage();
  await screenshotPage.setViewportSize({ width: 220, height: 240 });

  for (const scene of mockScenes) {
    await page.goto(`/?mock=${scene.mock}&mc=${scene.pose}`, { waitUntil: 'domcontentloaded' });
    const stage = page.getByTestId('stage');
    await expect(stage).toBeVisible();
    const pose = stage.locator('[data-layer="kelly"] .mc-sequence').first();
    await expect(pose).toHaveAttribute('data-mc-animation', scene.pose);
    await expect(pose).toHaveJSProperty('complete', true);
    await expect(pose.locator('xpath=..')).toHaveAttribute('data-mc-state', scene.pose);
    await expect(pose.locator('xpath=..')).toHaveCSS('animation-name', 'v3-mc-pose-enter');
    const svg = Buffer.from(placeholderSvg(scene.pose)).toString('base64');
    await screenshotPage.setContent(`<body style="margin:0;width:220px;height:240px;background:#171344"><img width="220" height="240" src="data:image/svg+xml;base64,${svg}" /></body>`);
    await screenshotPage.screenshot({ path: join(reviewDir, `${scene.pose}.png`), animations: 'disabled' });
  }
  await screenshotPage.close();
});
