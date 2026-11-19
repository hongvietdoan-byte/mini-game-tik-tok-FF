import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const outputDirectory = resolve(process.cwd(), '.claude', 'review', 'C0325');
const assetRoots = [resolve(process.cwd(), 'assets-local'), resolve(process.cwd(), '..', '..', '..', 'assets-local')];

function localPng(relativePath: string): string | null {
  for (const root of assetRoots) {
    const path = resolve(root, relativePath);
    if (existsSync(path)) return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
  }
  return null;
}

const throneEmpty = localPng(join('throne', 'ngai-trong.png'));
const throneOwner = localPng(join('throne', 'ngai-chibi-007-caroline.png'));
const longOwner = 'Nguyễn Bảo Minh Tường Vi';
const spamReminder = 'Nhắc nhẹ nè: mỗi người chỉ một đáp án, bình luận đầu tiên mới được tính nhé!';
const freeChat120 = Array.from('MC gửi lời chúc mừng đến tất cả mọi người đã tham gia và cổ vũ trận đấu hôm nay nhé, cùng tiếp tục bình luận để giữ không khí thật vui nào!').slice(0, 120).join('');

const mockCss = `
.c0325-layer { position:absolute; inset:0; z-index:90; pointer-events:none; color:#fff; font-family:inherit; }
.c0325-composite { position:absolute; left:340.19px; top:797.24px; width:397.62px; height:397.62px; object-fit:contain; }
.c0325-empty { opacity:.98; }
.c0325-right { position:absolute; left:738px; top:845px; width:262px; display:flex; flex-direction:column; gap:16px; }
.c0325-bubble { box-sizing:border-box; width:262px; min-width:0; padding:14px 18px; border:2px solid #ffdf77; border-radius:16px; background:linear-gradient(145deg,rgba(36,27,92,.98),rgba(14,10,49,.98)); color:#fff; box-shadow:0 8px 22px rgba(8,4,28,.48),inset 0 0 15px rgba(255,211,83,.12); }
.c0325-bubble-label { display:block; margin:0 0 8px; color:#ffdd79; font-size:14px; line-height:16px; font-weight:950; letter-spacing:.7px; }
.c0325-bubble-copy { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden; overflow-wrap:anywhere; white-space:pre-line; margin:0; color:#fff; font-size:26px; line-height:30px; font-weight:850; text-align:left; }
.c0325-bubble.is-free-chat .c0325-bubble-copy { font-size:22px; line-height:25px; }
.c0325-owner { box-sizing:border-box; width:262px; padding:8px 12px; border:1px solid rgba(255,223,119,.74); border-radius:12px; background:linear-gradient(145deg,rgba(36,27,92,.92),rgba(14,10,49,.9)); box-shadow:0 8px 22px rgba(8,4,28,.42); display:flex; flex-direction:column; align-items:flex-start; gap:7px; min-width:0; }
.c0325-owner-kicker { color:#ffdd79; font-size:24px; line-height:28px; font-weight:950; letter-spacing:.5px; }
.c0325-owner-name { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; width:100%; margin:0; color:#fff; font-size:30px; line-height:32px; font-weight:950; }
.c0325-owner-score { display:flex; align-items:baseline; gap:8px; color:#ffd15c; }
.c0325-owner-score strong { font-size:40px; line-height:44px; font-weight:950; font-variant-numeric:tabular-nums; }
.c0325-owner-score span { color:#fff1c2; font-size:16px; font-weight:850; letter-spacing:1px; }
.c0325-right.no-bubble { top:837px; height:339px; justify-content:center; }
.c0325-right.no-bubble .c0325-owner { width:262px; }
.c0325-waiting { color:#ffe48b; font-size:24px; line-height:32px; font-weight:950; text-align:center; text-shadow:0 2px 8px #1b0e31; }
.c0325-bubble::before,.c0325-bubble::after { display:none!important; content:none!important; }
.v3-stage .v3-mc .v3-bubble { display:none!important; }
.v3-stage .v3-mc-figure,.v3-stage .v3-mc-figure * { animation:none!important; transition:none!important; }
.v3-stage .v3-mc-idle .v3-mc-figure { transform:translate(-40px,67px)!important; transform-origin:top left!important; }
.v3-stage .v3-mc-idle .v3-mc-figure img { width:200px!important; height:280px!important; max-height:none!important; object-fit:contain!important; }
.v3-stage .v3-mc-idle .v3-mc-plate { transform:translate(-40px,-16px)!important; }
.v3-stage .v3-leaderboard-full { transform:translateY(-60px) scale(.6)!important; transform-origin:top left!important; }
.v3-aux-stage[data-scene="LEADERBOARD"] .v3-mc-figure { transform:translateX(8px)!important; }
`;

type Sample = { label: string; mock: string; bubble?: string; freeChat?: boolean; owner?: string; waiting?: boolean };
const sceneSamples: Sample[] = [
  { label: 'LOBBY', mock: 'lobby-35-countdown', bubble: 'Chào mừng!\nBão Tố!', waiting: true },
  { label: 'PREPARE', mock: 'prepare', bubble: 'Câu tiếp theo sắp tới.\nChuẩn bị nhé!' },
  { label: 'READING', mock: 'reading-longest', bubble: 'Đang đọc câu hỏi và đáp án...' },
  { label: 'ACCEPTING', mock: 'question-longest', bubble: '1 đáp án/người.\nLượt đầu tính!' },
  { label: 'ACCEPTING tên dài', mock: 'question-longest', bubble: '1 đáp án/người.\nLượt đầu tính!', owner: longOwner },
  { label: 'REVEAL', mock: 'reveal-live-long', bubble: 'Đáp án: B!' },
  { label: 'LEADERBOARD', mock: 'top10', bubble: 'BXH trực tiếp!\nCùng bám sát Top 10 nhé.' },
  { label: 'ROUND_WINNER (không bóng)', mock: 'round-winner', owner: 'FFVN.Kelly' },
  { label: 'VICTORY', mock: 'victory', bubble: 'Chúc mừng\ncác nhà vô địch!' },
  { label: 'INTERMISSION', mock: 'intermission', bubble: 'Trận tiếp theo\nsắp bắt đầu.' },
  { label: 'PAUSED', mock: 'paused', bubble: 'Tạm dừng một chút nhé!' },
  { label: 'CONNECTION_LOST', mock: 'connection-lost', bubble: 'Tạm dừng một chút.\nChờ kết nối ổn định nhé!' },
  { label: 'operator-chat-120', mock: 'question-longest', bubble: freeChat120, freeChat: true },
];

type InventoryItem = { source: string; scene: string; old: string; proposal: string; display: boolean; dynamic?: boolean };
const inventory: InventoryItem[] = [
  { source: 'engine.ts · mcFor', scene: 'LOBBY/IDLE', old: 'Bình luận A/B/C/D để tham gia', proposal: 'Chọn A/B/C/D\nđể tham gia!', display: true },
  { source: 'ArenaStage.tsx · question CTA transform', scene: 'LOBBY/IDLE', old: 'Trả lời bằng cách\ncomment A, B, C hoặc D\nđể tham gia ngay!', proposal: 'Chọn A/B/C/D\nđể tham gia!', display: true },
  { source: 'engine.ts · mcFor', scene: 'PREPARE', old: 'Câu hỏi tiếp theo, chuẩn bị nhé!', proposal: 'Câu hỏi tiếp theo\nchuẩn bị nhé!', display: true },
  { source: 'engine.ts · mcFor', scene: 'READING', old: 'Đang đọc câu hỏi và đáp án...', proposal: 'Đang đọc câu hỏi\nvà đáp án…', display: true },
  { source: 'engine.ts · mcFor', scene: 'ACCEPTING', old: 'Chọn đáp án ngay! Bình luận A, B, C hoặc D', proposal: 'Chọn A/B/C/D\nđể trả lời!', display: true },
  { source: 'engine.ts · mcFor', scene: 'REVEAL', old: 'Đáp án đúng là {A–D}! / Cùng xem đáp án nào!', proposal: 'Đáp án: {A–D}!', display: true },
  { source: 'engine.ts · mcFor', scene: 'LEADERBOARD', old: 'Cùng xem bảng xếp hạng!', proposal: 'Cùng xem\nbảng xếp hạng!', display: true },
  { source: 'engine.ts · mcFor', scene: 'ROUND_END/VICTORY', old: 'Chúc mừng các nhà vô địch!', proposal: 'Chúc mừng\ncác nhà vô địch!', display: true },
  { source: 'engine.ts · mcFor / AuxiliaryStages.tsx', scene: 'INTERMISSION', old: 'Trận tiếp theo sắp bắt đầu', proposal: 'Trận tiếp theo\nsắp bắt đầu.', display: true },
  { source: 'Victory.tsx', scene: 'ROUND_WINNER', old: 'Chúc mừng các nhà vô địch! (bóng hiện đang bị ẩn)', proposal: 'Không có bubble; cột Top 1 căn giữa theo ngai.', display: false },
  { source: 'engine.ts · mcFor', scene: 'PAUSED', old: 'Tạm dừng một chút nhé!', proposal: 'Tạm dừng\nmột chút nhé!', display: true },
  { source: 'engine.ts · mcFor', scene: 'CONNECTION_LOST/ERROR', old: 'Tạm dừng một chút, chờ kết nối ổn định nhé!', proposal: 'Chờ kết nối\nổn định nhé!', display: true },
  { source: 'ArenaStage.tsx · lobby fallback', scene: 'LOBBY', old: 'CHÀO MỪNG ĐẾN VỚI\nĐẤU TRƯỜNG BÃO TỐ!', proposal: 'Chào mừng!\nBão Tố!', display: true },
  { source: 'runtime.ts · lobbyMessage', scene: 'LOBBY', old: 'Chuẩn bị vào trận…', proposal: 'Chuẩn bị vào trận…', display: true },
  { source: 'AuxiliaryStages.tsx · fallback', scene: 'LEADERBOARD', old: 'BXH trực tiếp! Cùng xem ai đang dẫn đầu và bám sát Top 10 nhé.', proposal: 'BXH trực tiếp!\nCùng bám sát Top 10 nhé.', display: true },
  { source: 'runtime.ts · SPAM_REMINDER bubbleText', scene: 'ACCEPTING (Q2/Q5/Q8)', old: spamReminder, proposal: '1 đáp án/người.\nLượt đầu tính!', display: true },
  { source: 'runtime.ts · WELCOME', scene: 'LOBBY', old: 'Chào mừng cả nhà đến với phiên đố vui! Hãy cùng sẵn sàng nhé.', proposal: 'Không đổi câu đọc; cue hiện không gửi bubbleText.', display: false },
  { source: 'runtime.ts · LOBBY_VOICE_LINES', scene: 'LOBBY', old: 'Comment Free Fire để giành ghế ngồi nhé! · Ghế đang lấp đầy nhanh lắm! · Còn chờ gì nữa, comment Free Fire ngay! · Mọi người sẵn sàng chưa? Hãy cùng tham gia nào! · Comment Free Fire và vào chỗ thôi!', proposal: 'Giữ nguyên câu đọc; các cue không gửi bubbleText.', display: false },
  { source: 'runtime.ts · lobby full countdown', scene: 'LOBBY', old: 'Đủ người rồi, vào trận sau 10 giây!', proposal: 'Giữ nguyên câu đọc; cue không gửi bubbleText.', display: false },
  { source: 'runtime.ts · COUNTDOWN_SCRIPT', scene: 'ACCEPTING', old: 'Còn 10 giây! · Năm · Bốn · Ba · Hai · Một', proposal: 'Giữ nguyên câu đọc; lịch countdown không có bubbleText.', display: false },
  { source: 'runtime.ts · TIMEOUT', scene: 'REVEAL', old: 'Hết giờ!', proposal: 'Giữ nguyên câu đọc; cue không gửi bubbleText.', display: false },
  { source: 'runtime.ts · ANSWER_REVEAL', scene: 'REVEAL/LEADERBOARD', old: 'Đáp án đúng là {id}: {nội dung phương án}', proposal: 'Giữ nguyên câu đọc; cue không gửi bubbleText.', display: false },
  { source: 'runtime.ts · generic voice', scene: 'LEADERBOARD', old: 'Bảng xếp hạng đã cập nhật. Cùng cố gắng ở câu tiếp theo nhé!', proposal: 'Giữ nguyên câu đọc; cue không gửi bubbleText.', display: false },
  { source: 'runtime.ts · generic voice', scene: 'LEADERBOARD cuối vòng', old: 'Đã xong tất cả các câu hỏi! Cùng xem ai là nhà vô địch nhé!', proposal: 'Giữ nguyên câu đọc; cue không gửi bubbleText.', display: false },
  { source: 'runtime.ts · generic voice', scene: 'VICTORY/ROUND_END', old: 'Xin chúc mừng những người chiến thắng! Cảm ơn mọi người đã tham gia.', proposal: 'Giữ nguyên câu đọc; cue không gửi bubbleText.', display: false },
  { source: 'mc-chat-presets.ts · operator preset/free chat', scene: 'Mọi cảnh', old: 'Nội dung người vận hành tự đặt; schema 1–120 ký tự, tối đa 50 preset.', proposal: 'Tự co chữ tối thiểu 22px; quá 3 dòng cắt ở dòng 3 bằng …; Dashboard ghi giới hạn 120 ký tự.', display: true, dynamic: true },
];

async function installSample(page: Page, sample: Sample) {
  await page.goto(`/?mock=${encodeURIComponent(sample.mock)}&hud=1&role=program`, { waitUntil: 'domcontentloaded' });
  const stage = page.locator('.v3-stage');
  await expect(stage).toBeVisible();
  await stage.evaluate((element, input) => {
    const layer = document.createElement('div');
    layer.className = 'c0325-layer';
    const ownerImage = input.waiting ? input.empty : input.ownerImage;
    const composite = ownerImage
      ? `<img class="c0325-composite ${input.waiting ? 'c0325-empty' : ''}" alt="${input.waiting ? 'Ngai vàng trống' : 'Ngai vàng B với chủ ngai'}" src="${ownerImage}">`
      : '<div class="c0325-composite" aria-label="Fallback ngai vàng mẫu"></div>';
    const bubble = input.bubble
      ? `<div class="c0325-bubble ${input.freeChat ? 'is-free-chat' : ''}"><span class="c0325-bubble-label">MC KELLY</span><p class="c0325-bubble-copy">${input.bubble.replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)}</p></div>`
      : '';
    const ownerInfo = input.waiting
      ? '<div class="c0325-waiting">NGAI VÀNG<br>đang chờ chủ</div>'
      : `<div class="c0325-owner"><span class="c0325-owner-kicker">NGAI VÀNG</span><strong class="c0325-owner-name">${input.ownerName.replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)}</strong><div class="c0325-owner-score"><strong>1.850</strong><span>ĐIỂM</span></div></div>`;
    layer.innerHTML = `${composite}<div class="c0325-right ${input.bubble ? '' : 'no-bubble'}">${bubble}${ownerInfo}</div>`;
    element.appendChild(layer);
    const style = document.createElement('style');
    style.textContent = input.css;
    document.head.append(style);
    const reserved = [
      { x: 372, y: 837, right: 706, bottom: 1176 },
      ...[...layer.querySelectorAll<HTMLElement>('.c0325-bubble,.c0325-owner,.c0325-waiting')].map((item) => {
        const rect = item.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
      }),
    ];
    for (const seatName of element.querySelectorAll<HTMLElement>('.v3-seat-name')) {
      const rect = seatName.getBoundingClientRect();
      if (reserved.some((region) => rect.x < region.right && rect.right > region.x && rect.y < region.bottom && rect.bottom > region.y)) seatName.style.visibility = 'hidden';
    }
    const originalBubble = element.querySelector<HTMLElement>('.v3-bubble');
    if (originalBubble) originalBubble.style.setProperty('display', 'none', 'important');
  }, {
    ownerName: sample.owner ?? 'FFVN.Kelly', waiting: sample.waiting === true, bubble: sample.bubble ?? '', freeChat: sample.freeChat === true,
    ownerImage: throneOwner, empty: throneEmpty, css: mockCss,
  });
  await page.waitForFunction(() => {
    const image = document.querySelector<HTMLImageElement>('.v3-mc-figure img');
    return !image || (image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 10_000 });
  await page.waitForTimeout(50);
  if (sample.bubble) await expect(page.locator('.c0325-bubble')).toBeVisible();
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.v3-stage')!;
    const box = (element: HTMLElement | null | undefined) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const throneImage = stage.querySelector<HTMLElement>('.c0325-composite')!;
    const image = box(throneImage)!;
    const visible = { x: image.x + image.width * 64 / 800, y: image.y + image.height * 80 / 800, right: image.x + image.width * 736 / 800, bottom: image.y + image.height * 762 / 800 };
    const bubble = box(stage.querySelector<HTMLElement>('.c0325-bubble'));
    const bubbleText = stage.querySelector<HTMLElement>('.c0325-bubble-copy');
    const name = stage.querySelector<HTMLElement>('.c0325-owner-name');
    const nameLineCount = name ? (() => { const range = document.createRange(); range.selectNodeContents(name); return new Set([...range.getClientRects()].map((rect) => Math.round(rect.y))).size; })() : null;
    const bubbleNaturalLineCount = bubbleText ? (() => { const range = document.createRange(); range.selectNodeContents(bubbleText); return new Set([...range.getClientRects()].map((rect) => Math.round(rect.y))).size; })() : null;
    const bubbleLabel = box(stage.querySelector<HTMLElement>('.c0325-bubble-label'));
    const right = stage.querySelector<HTMLElement>('.c0325-right')!;
    const info = box(right.querySelector<HTMLElement>('.c0325-owner,.c0325-waiting'));
    const question = box(stage.querySelector<HTMLElement>('.v3-question'));
    const leaderboard = box(stage.querySelector<HTMLElement>('.v3-leaderboard-full,.v3-top10'));
    const mcPlate = box(stage.querySelector<HTMLElement>('.v3-mc-plate'));
    const mcImage = box(stage.querySelector<HTMLElement>('.v3-mc-figure img'));
    const mcImageElement = stage.querySelector<HTMLImageElement>('.v3-mc-figure img');
    const mcFigure = box(stage.querySelector<HTMLElement>('.v3-mc-figure'));
    let mcVisiblePixels: { x: number; y: number; right: number; bottom: number } | null = null;
    if (mcImageElement?.complete && mcImageElement.naturalWidth > 0 && mcFigure) {
      const canvas = document.createElement('canvas');
      canvas.width = mcImageElement.naturalWidth;
      canvas.height = mcImageElement.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(mcImageElement, 0, 0);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = canvas.width; let top = canvas.height; let right = -1; let bottom = -1;
        for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
          if (data[(y * canvas.width + x) * 4 + 3]! < 24) continue;
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        if (right >= left && bottom >= top) {
          const rect = mcImageElement.getBoundingClientRect();
          const sx = rect.width / canvas.width; const sy = rect.height / canvas.height;
          const figureRight = mcFigure.x + mcFigure.width; const figureBottom = mcFigure.y + mcFigure.height;
          mcVisiblePixels = {
            x: Math.max(mcFigure.x, rect.x + left * sx), y: Math.max(mcFigure.y, rect.y + top * sy),
            right: Math.min(figureRight, rect.x + (right + 1) * sx), bottom: Math.min(figureBottom, rect.y + (bottom + 1) * sy),
          };
        }
      }
    }
    const audienceNames = [...stage.querySelectorAll<HTMLElement>('.v3-seat-name')]
      .filter((element) => getComputedStyle(element).visibility !== 'hidden')
      .map((element) => box(element)!).filter((item) => item.y >= 1170).sort((a, b) => a.y - b.y);
    const throneAudienceName = audienceNames.find((item) => item.x < visible.right && item.right > visible.x) ?? null;
    const mcAudienceName = mcVisiblePixels ? audienceNames.find((item) => item.x < mcVisiblePixels!.right && item.right > mcVisiblePixels!.x) ?? null : null;
    const gap = (a: { x: number; y: number; right: number; bottom: number }, b: { x: number; y: number; right: number; bottom: number }) => Math.max(0, Math.max(a.x - b.right, b.x - a.right, a.y - b.bottom, b.y - a.bottom));
    const textStyle = bubbleText ? getComputedStyle(bubbleText) : null;
    const nameStyle = name ? getComputedStyle(name) : null;
    const range = (text: string, fontSize: string, lineHeight: string) => {
      const probe = document.createElement('span');
      probe.textContent = text;
      Object.assign(probe.style, { position: 'fixed', left: '-5000px', top: '0', width: '226px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: getComputedStyle(stage).fontFamily, fontSize, lineHeight, fontWeight: '850' });
      document.body.append(probe);
      const textRange = document.createRange(); textRange.selectNodeContents(probe);
      const lines = new Set([...textRange.getClientRects()].map((rect) => Math.round(rect.y))).size;
      probe.remove();
      return lines;
    };
    return {
      image,
      throneVisible: { x: Math.round(visible.x), y: Math.round(visible.y), right: Math.round(visible.right), bottom: Math.round(visible.bottom), width: Math.round(visible.right - visible.x), height: Math.round(visible.bottom - visible.y) },
      bubble, bubbleText: bubbleText?.textContent ?? null, bubbleFontPx: textStyle ? Number.parseFloat(textStyle.fontSize) : null,
      bubbleLineCount: bubbleText && textStyle ? Math.round(bubbleText.clientHeight / Number.parseFloat(textStyle.lineHeight)) : null,
      bubbleNaturalLineCount, bubbleMaxLines: textStyle ? Number.parseInt(textStyle.webkitLineClamp || '0', 10) : null,
      labelFontPx: bubbleLabel ? Number.parseFloat(getComputedStyle(stage.querySelector<HTMLElement>('.c0325-bubble-label')!).fontSize) : null,
      info, nameText: name?.textContent ?? null, nameFontPx: nameStyle ? Number.parseFloat(nameStyle.fontSize) : null,
      nameLineCount, nameClamp: nameStyle ? Number.parseInt(nameStyle.webkitLineClamp || '0', 10) : null,
      question, leaderboard, mcPlate, mcImage, mcVisiblePixels, audienceName: throneAudienceName, mcAudienceName,
      gaps: {
        throneToBubble: bubble ? gap(visible, bubble) : null,
        throneToMcPlate: mcPlate ? gap(visible, mcPlate) : null,
        throneToMcImage: mcImage ? gap(visible, mcImage) : null,
        throneToMcVisiblePixels: mcVisiblePixels ? gap(visible, mcVisiblePixels) : null,
        throneToTop10: leaderboard ? gap(visible, leaderboard) : null,
        throneToQuestion: question ? gap(visible, question) : null,
        throneToAudienceName: throneAudienceName
          ? (throneAudienceName.y >= visible.bottom ? Math.ceil(throneAudienceName.y) - Math.floor(visible.bottom) : gap(visible, throneAudienceName))
          : null,
        mcImageToTop10: mcVisiblePixels && leaderboard ? gap(mcVisiblePixels, leaderboard) : null,
        mcImageToQuestion: mcVisiblePixels && question ? gap(mcVisiblePixels, question) : null,
        mcImageToBubble: mcVisiblePixels && bubble ? gap(mcVisiblePixels, bubble) : null,
        mcImageToAudienceName: mcVisiblePixels && mcAudienceName ? gap(mcVisiblePixels, mcAudienceName) : null,
      },
      oldLineCountAt26px: bubbleText ? range(bubbleText.textContent ?? '', '26px', '30px') : null,
      maxFreeChatLineCountAt22px: range('Mọi người đã cùng góp sức cho trận đấu hôm nay, hãy tiếp tục tham gia và cổ vũ người đang giữ ngai vàng nhé!', '22px', '25px'),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

function htmlEscape(value: string) { return value.replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }

test('C-0325 — phương án B theo cảnh, kiểm kê bóng MC và khoảng hở ngai vàng', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  test.skip(!throneEmpty || !throneOwner, 'C-0325 screenshots require the local ignored assets-local/throne review images');
  expect(throneEmpty, 'Tìm thấy asset ngai trống trong assets-local').not.toBeNull();
  expect(throneOwner, 'Tìm thấy composite chủ ngai trong assets-local').not.toBeNull();

  const records: Array<{ sample: Sample; metrics: Awaited<ReturnType<typeof measure>> }> = [];
  for (const sample of sceneSamples) {
    await installSample(page, sample);
    const metrics = await measure(page);
    records.push({ sample, metrics });
    const suffix = sample.label.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
    await page.screenshot({ path: join(outputDirectory, `${suffix}-hud-1-1080x1920.png`), animations: 'disabled' });
    expect(metrics.viewport).toEqual({ width: 1080, height: 1920 });
    expect(metrics.throneVisible).toEqual({ x: 372, y: 837, right: 706, bottom: 1176, width: 334, height: 339 });
    expect(metrics.labelFontPx).toBe(sample.bubble ? 14 : null);
    expect(metrics.bubbleLineCount === null || metrics.bubbleLineCount <= 3).toBe(true);
    if (sample.bubble) {
      expect(metrics.bubble).toMatchObject({ x: 738, y: 845, width: 262 });
      expect(metrics.bubbleMaxLines).toBe(3);
      expect(metrics.bubbleFontPx).toBe(sample.freeChat ? 22 : 26);
      expect(metrics.gaps.throneToBubble).toBeGreaterThanOrEqual(24);
      expect(metrics.info!.y).toBeGreaterThanOrEqual(metrics.bubble!.bottom + 16);
      expect(metrics.info!.bottom).toBeLessThanOrEqual(1176);
    }
    if (metrics.mcPlate) expect(metrics.gaps.throneToMcPlate).toBeGreaterThanOrEqual(24);
    if (metrics.mcImage) {
      expect(metrics.mcVisiblePixels, 'Đo vùng alpha hiển thị thật của ảnh MC, không dùng bbox sequence/container').not.toBeNull();
      expect(metrics.gaps.throneToMcVisiblePixels).toBeGreaterThanOrEqual(16);
      for (const [frame, clearance] of Object.entries({ Top10: metrics.gaps.mcImageToTop10, question: metrics.gaps.mcImageToQuestion, bubble: metrics.gaps.mcImageToBubble, audience: metrics.gaps.mcImageToAudienceName })) {
        if (clearance !== null) expect(clearance, `Ảnh MC thật cách ${frame} ít nhất 16px`).toBeGreaterThanOrEqual(16);
      }
    }
    expect(metrics.gaps.throneToTop10 === null || metrics.gaps.throneToTop10 >= 24).toBe(true);
    expect(metrics.gaps.throneToQuestion === null || metrics.gaps.throneToQuestion >= 24).toBe(true);
    expect(metrics.gaps.throneToAudienceName === null || metrics.gaps.throneToAudienceName >= 16).toBe(true);
    if (sample.owner === longOwner) {
      expect(metrics.nameFontPx).toBe(30);
      expect(metrics.nameLineCount).toBeLessThanOrEqual(2);
      expect(metrics.nameClamp).toBe(2);
    }
    if (sample.waiting) expect(page.locator('.c0325-composite.c0325-empty')).toBeVisible();
    if (sample.freeChat) {
      expect(sample.bubble?.length).toBe(120);
      expect(metrics.bubbleLineCount).toBe(3);
      expect(metrics.bubbleNaturalLineCount).toBeGreaterThan(3);
    }
    if (!sample.bubble) {
      expect(Math.abs((metrics.info!.y + metrics.info!.bottom) / 2 - (837 + 1176) / 2), 'Cột ngai không bóng căn giữa dọc theo ngai').toBeLessThanOrEqual(1);
    }
  }

  const measuredInventory = await page.evaluate((items) => {
    const analyzeText = (text: string, fontSize = '26px', lineHeight = '30px') => {
      const probe = document.createElement('span');
      probe.textContent = text;
      Object.assign(probe.style, { display: 'block', position: 'fixed', left: '-5000px', top: '0', width: '222px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: getComputedStyle(document.body).fontFamily, fontSize, lineHeight, fontWeight: '850' });
      document.body.append(probe);
      const node = probe.firstChild;
      const visualLines = new Map<number, string>();
      if (node) {
        const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
        const range = document.createRange();
        let offset = 0;
        for (const part of segmenter.segment(text)) {
          if (part.segment !== '\n' && part.segment !== '\r') {
            range.setStart(node, offset); range.setEnd(node, offset + part.segment.length);
            const rect = range.getBoundingClientRect();
            if (rect.height > 0) {
              const y = Math.round(rect.y);
              visualLines.set(y, (visualLines.get(y) ?? '') + part.segment);
            }
          }
          offset += part.segment.length;
        }
      }
      const lines = [...visualLines.values()];
      probe.remove();
      const graphemes = (line: string) => [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(line)].length;
      const longestLineChars = Math.max(0, ...lines.map(graphemes));
      const lastLine = lines.at(-1) ?? '';
      const priorLine = lines.at(-2) ?? '';
      const badBreak = /(?:^|\s)(?:[ABCD],?|comment|bình|luận)$/iu.test(priorLine.trim()) || (lines.length > 1 && graphemes(lastLine) <= 4);
      return { lines: lines.length, longestLineChars, badBreak };
    };
    return items.map((item) => ({
      ...item,
      oldLines: item.dynamic ? 'dynamic ≤120 ký tự' : item.display ? analyzeText(item.old).lines : null,
      oldLongestLineChars: item.dynamic ? 'dynamic' : item.display ? analyzeText(item.old).longestLineChars : null,
      oldBadBreak: item.dynamic ? 'dynamic' : item.display ? analyzeText(item.old).badBreak : null,
      newLines: item.dynamic ? '≤3 dòng, 22px' : item.display ? analyzeText(item.proposal).lines : null,
      newLongestLineChars: item.dynamic ? '≤3 dòng, 22px' : item.display ? analyzeText(item.proposal).longestLineChars : null,
      newBadBreak: item.dynamic ? 'cắt bằng … nếu dài' : item.display ? analyzeText(item.proposal).badBreak : null,
    }));
  }, inventory);
  for (const item of measuredInventory) {
    if (item.display && !item.dynamic) expect(Number(item.newLines), `${item.source} / ${item.scene}: đề xuất phải gọn trong 3 dòng`).toBeLessThanOrEqual(3);
  }
  const oldLineSummary = (item: (typeof measuredInventory)[number]) => item.dynamic
    ? 'động (1–120 ký tự)'
    : !item.display ? 'audio-only' : `${item.oldLines} dòng; dài nhất ${item.oldLongestLineChars} grapheme; ${item.oldBadBreak ? 'ngắt cần sửa' : 'ngắt ổn'}`;
  const newLineSummary = (item: (typeof measuredInventory)[number]) => item.dynamic
    ? 'tối đa 3 dòng ở 22px; dài thì cắt …'
    : !item.display ? '—' : `${item.newLines} dòng; dài nhất ${item.newLongestLineChars} grapheme; ${item.newBadBreak ? 'ngắt cần sửa' : 'ngắt ổn'}`;
  const inventoryRows = measuredInventory.map((item) => `| ${item.source} | ${item.scene} | ${item.old.replace(/\|/gu, '\\|')} | ${oldLineSummary(item)} | ${item.proposal.replace(/\n/gu, '<br>').replace(/\|/gu, '\\|')} | ${newLineSummary(item)} |`);
  const distance = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}px`;
  const screenshotRows = records.map(({ sample }) => `- \`${sample.label.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '')}-hud-1-1080x1920.png\` — hud=1, \`${sample.mock}\`.`);
  const report = [
    '# C-0325 — ngai vàng phương án B + kiểm kê thoại MC', '',
    'Đây là giai đoạn mock để coordinator duyệt; chưa sửa runtime sản phẩm. Mỗi ảnh dùng `hud=1`, `role=program`, 1080×1920.', '',
    'Để tuân khoảng hở mà vẫn giữ đúng crop ngai B: trong mock, MC idle được thu về 200×280 và dịch x−40/y+67, nameplate x−40/y−16; khung Top10 toàn màn được dịch lên 60px và scale 0,6 để đáy ở 812px. Nhãn ghế bị che bởi vùng ngai/cột Top 1 được ẩn trong mock. Đây là thông số đề xuất cho ảnh review, chưa áp dụng vào UI sản phẩm.', '',
    '## Số đo phương án B', '',
    '| Phần tử | BBox / số đo | Khoảng hở |', '|---|---:|---:|',
    '| Composite ngai 800×800 | element x=340.19, y=797.24, 397.62×397.62 | visible crop x=372–706, y=837–1176 |',
    '| Bóng MC | x=738, y=845, rộng 262; padding 14/18; nhãn 14px; chữ 26px, tối đa 3 dòng | ngai→bóng ≥24px |',
    '| Cột chủ ngai | nhãn 24px, tên 30px tối đa 2 dòng, điểm 40px | bắt đầu ≥16px sau bóng; đáy ≤1176 |',
    '| Ảnh MC thật | quét pixel alpha ≥24 trong PNG đang hiển thị, cắt theo khung ảnh | ngai→pixel MC ≥16px |',
    '| Nameplate MC | đọc bbox từ DOM hiện hành | ngai→nameplate ≥24px |',
    '| Khu tên ghế | đo tên khán giả đầu tiên ở vùng ngai | ngai→tên ghế ≥16px (ngoại lệ đúng số đo C-0325: 1192−1176) |',
    '',
    '## Khoảng hở nhỏ nhất theo cảnh',
    '',
    '| Cảnh | Ngai↔Top10 | Ngai↔câu hỏi | Ngai↔MC plate | Ngai↔pixel alpha MC | Pixel MC↔Top10 | Pixel MC↔câu hỏi | Pixel MC↔bóng | Pixel MC↔tên ghế |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...records.map(({ sample, metrics }) => `| ${sample.label} | ${distance(metrics.gaps.throneToTop10)} | ${distance(metrics.gaps.throneToQuestion)} | ${distance(metrics.gaps.throneToMcPlate)} | ${distance(metrics.gaps.throneToMcVisiblePixels)} | ${distance(metrics.gaps.mcImageToTop10)} | ${distance(metrics.gaps.mcImageToQuestion)} | ${distance(metrics.gaps.mcImageToBubble)} | ${distance(metrics.gaps.mcImageToAudienceName)} |`),
    '',
    'Tên dài mẫu `Nguyễn Bảo Minh Tường Vi` được đo ở 30px, giới hạn 2 dòng. LOBBY dùng ngai trống và “NGAI VÀNG / đang chờ chủ”; ROUND_WINNER giữ trạng thái không bóng của sản phẩm và căn cột giữa theo ngai.', '',
    '## Bảng nguồn câu thoại', '',
    '| Nguồn | Cảnh | Câu cũ | Số dòng cũ (rộng 222px, 26px; kèm độ dài/ngắt) | Câu đề xuất | Số dòng mới (kèm độ dài/ngắt) |', '|---|---|---|---:|---|---:|',
    ...inventoryRows, '',
    'Các dòng `audio-only` không thực sự được gửi vào `bubbleText`; giữ nguyên câu đọc để tránh phải sinh lại audio. Trong `runtime.ts`, `SPAM_REMINDER_TEXT` là cue có `bubbleText` thực sự, phát ở câu 2/5/8, và cùng hằng này hiện cũng tạo voice asset. Vì thế đề xuất rút gọn chỉ dành cho UI; nếu được duyệt, cần truyền bubbleText riêng và giữ nguyên câu gốc cho TTS/cache. Lịch COUNTDOWN chỉ gửi `secondsRemaining`; TIMEOUT, WELCOME, ANSWER_REVEAL và generic voice gọi scheduler không truyền `bubbleText`. Vì vậy cần phân biệt câu đọc với bóng đang hiện.',
    'Preset/user chat là dữ liệu động trong `data/mc-chat-presets.json`, không có chuỗi cố định trong class store: schema cho phép 1–120 ký tự mỗi mục, tối đa 50 preset. Dashboard nên ghi rõ “tối đa 120 ký tự”. Mẫu stress 120 ký tự được co xuống 22px rồi cắt ở dòng 3 bằng `…` trong mock.',
    '', '## Ảnh full B', '', ...screenshotRows, '',
    '## Kiểm tra', '',
    '- Playwright kiểm bbox ngai, bóng, cột Top 1, nameplate, Top 10, câu hỏi, tên ghế và giới hạn dòng cho từng ảnh.',
    '- Quy tắc 11: khung↔ngai ≥24px; pixel alpha ảnh MC/nameplate↔ngai ≥16/24px; hàng tên ghế dùng ngoại lệ riêng 16px ghi trong thư C-0325; không phần tử nào chạm hoặc đè nhau.',
  ].join('\n');
  writeFileSync(join(outputDirectory, 'c0325-throne-bubble-inventory.md'), report, 'utf8');
  writeFileSync(join(outputDirectory, 'c0325-throne-bubble-measurements.json'), JSON.stringify({ records, inventory: measuredInventory }, null, 2), 'utf8');
  console.info(`[C-0325] ${records.length} ảnh HUD, ${measuredInventory.length} dòng nguồn; review artifacts: ${outputDirectory}`);
  console.info(JSON.stringify(records.map(({ sample, metrics }) => ({ scene: sample.label, bubbleLines: metrics.bubbleLineCount, bubbleGap: metrics.gaps.throneToBubble, info: metrics.info, mcGap: metrics.gaps.throneToMcPlate, seatGap: metrics.gaps.throneToAudienceName })), null, 2));
});
