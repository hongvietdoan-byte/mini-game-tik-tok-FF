import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createThemeMapPng, createThemeReviewArtifacts } from './theme-map';
import { importThemeArchive, packTheme } from './theme-archive';
import { fileURLToPath } from 'node:url';
import {
  ACHIEVEMENT_IDS,
  THEME_DEFAULT_ACHIEVEMENTS,
  THEME_DEFAULT_TOKENS,
  THEME_DEFAULT_TOKEN_DESCRIPTIONS,
  THEME_DEFAULT_TEXTS,
  THEME_ASSET_SLOTS,
  ThemeManifestSchema,
  type ThemeAssetSlot,
} from '@quiz/contracts';
import { ThemeStore } from '../apps/server/src/theme-store';

type SlotSource = { slot: ThemeAssetSlot; source: string; destination: string; directory?: boolean };

const DEFAULT_SLOT_SOURCES: SlotSource[] = [
  { slot: 'arena.background', source: 'arena/bg.jpg', destination: 'assets/N-nen/N01-nen-sanh/bg.jpg' },
  { slot: 'arena.questionBackground', source: 'arena/bg-question-user.jpg', destination: 'assets/N-nen/N02-nen-cau-hoi/bg-question-user.jpg' },
  ...Array.from({ length: 8 }, (_, index) => ({ slot: `arena.flag.${index}` as ThemeAssetSlot, source: `arena/flags/flag-${index + 1}.png`, destination: `assets/L-thuong-hieu/L02-co-dau-truong/flag-${index + 1}.png` })),
  { slot: 'arena.loopVideoWebm', source: 'arena/bg-loop.webm', destination: 'assets/N-nen/N03-video-lap/bg-loop.webm' },
  { slot: 'arena.loopVideoMp4', source: 'arena/bg-loop.mp4', destination: 'assets/N-nen/N03-video-lap/bg-loop.mp4' },
  { slot: 'brand.logo', source: 'brand/logo.png', destination: 'assets/L-thuong-hieu/L01-logo/logo.png' },
  { slot: 'chibi.bankDir', source: 'chibi', destination: 'assets/V-nhan-vat/V01-ngan-hang-chibi', directory: true },
  { slot: 'chibi.podiumDir', source: 'chibi/dang-top2-top3', destination: 'assets/V-nhan-vat/V02-chibi-top2-top3', directory: true },
  { slot: 'throne.bankDir', source: 'throne', destination: 'assets/V-nhan-vat/V03-ngai', directory: true },
  { slot: 'mc.static', source: 'mc/kelly.png', destination: 'assets/V-nhan-vat/V04-mc-anh-tinh/kelly.png' },
  { slot: 'mc.sequenceDir', source: 'mc/kelly', destination: 'assets/V-nhan-vat/V05-mc-chuoi-dong-tac/kelly', directory: true },
  { slot: 'victory.background', source: 'victory/bg.jpg', destination: 'assets/N-nen/N04-nen-victory/bg.jpg' },
  { slot: 'victory.userCover', source: 'victory/bg-user-cover.jpg', destination: 'assets/N-nen/N05-nen-su-kien-victory/bg-user-cover.jpg' },
  { slot: 'victory.trophyStage', source: 'victory/trophy-stage.png', destination: 'assets/N-nen/N06-san-khau-victory/trophy-stage.png' },
  ...[
    ['question-enter', 'A01-mo-cau-hoi', 'Mở câu hỏi'], ['countdown-tick', 'A02-tich-dem-nguoc', 'Tích đếm ngược'],
    ['timeout', 'A03-het-gio', 'Hết giờ'], ['correct-answer', 'A04-cong-bo-dap-an', 'Công bố đáp án'],
    ['top10', 'A05-top-10', 'Chuyển Top 10'], ['victory', 'A06-chien-thang', 'Cue chiến thắng'],
    ['transition', 'A07-chuyen-canh', 'Chuyển cảnh'], ['victory-music-1', 'A08-nhac-vinh-danh-1', 'Nhạc vinh danh lượt 1'],
    ['victory-music-2', 'A09-nhac-vinh-danh-2', 'Nhạc vinh danh lượt 2'], ['bgm-lobby', 'A10-nhac-sanh', 'Nhạc nền sảnh'],
    ['bgm-game', 'A11-nhac-cau-hoi', 'Nhạc nền câu hỏi'], ['bgm', 'A12-nhac-du-phong', 'Nhạc nền dự phòng'],
  ].map(([slot, folder]) => ({ slot: `audio.${slot}` as ThemeAssetSlot, source: `audio/${slot}`, destination: `assets/A-am-thanh/${folder}/${slot}` })),
];

const DEFAULT_ASSET_FOLDERS = [
  { id: 'N01', name: 'Nền sảnh', path: 'assets/N-nen/N01-nen-sanh', slots: 'arena.background', detail: 'Ảnh nền sảnh/đấu trường.' },
  { id: 'N02', name: 'Nền câu hỏi', path: 'assets/N-nen/N02-nen-cau-hoi', slots: 'arena.questionBackground', detail: 'Ảnh nền câu hỏi và công bố đáp án.' },
  { id: 'N03', name: 'Video lặp', path: 'assets/N-nen/N03-video-lap', slots: 'arena.loopVideoWebm, arena.loopVideoMp4', detail: 'Video nền WEBM/MP4.' },
  { id: 'N04', name: 'Nền Victory', path: 'assets/N-nen/N04-nen-victory', slots: 'victory.background', detail: 'Ảnh nền màn Victory.' },
  { id: 'N05', name: 'Nền sự kiện Victory', path: 'assets/N-nen/N05-nen-su-kien-victory', slots: 'victory.userCover', detail: 'Ảnh phủ sự kiện Victory.' },
  { id: 'N06', name: 'Sân khấu Victory', path: 'assets/N-nen/N06-san-khau-victory', slots: 'victory.trophyStage', detail: 'Ảnh sân khấu có trophy stage.' },
  { id: 'L01', name: 'Logo', path: 'assets/L-thuong-hieu/L01-logo', slots: 'brand.logo', detail: 'Logo thương hiệu.' },
  { id: 'L02', name: 'Cờ đấu trường', path: 'assets/L-thuong-hieu/L02-co-dau-truong', slots: 'arena.flag.0–7', detail: 'Bộ cờ hai bên đấu trường.' },
  { id: 'V01', name: 'Ngân hàng chibi', path: 'assets/V-nhan-vat/V01-ngan-hang-chibi', slots: 'chibi.bankDir', detail: 'Danh sách nhân vật chibi.' },
  { id: 'V02', name: 'Chibi Top 2/3', path: 'assets/V-nhan-vat/V02-chibi-top2-top3', slots: 'chibi.podiumDir', detail: 'Dáng nhân vật podium Top 2/3.' },
  { id: 'V03', name: 'Ngai', path: 'assets/V-nhan-vat/V03-ngai', slots: 'throne.bankDir', detail: 'Ngai trống và ngai theo nhân vật.' },
  { id: 'V04', name: 'Ảnh tĩnh MC', path: 'assets/V-nhan-vat/V04-mc-anh-tinh', slots: 'mc.static', detail: 'Ảnh tĩnh dự phòng MC.' },
  { id: 'V05', name: 'Chuỗi động tác MC', path: 'assets/V-nhan-vat/V05-mc-chuoi-dong-tac', slots: 'mc.sequenceDir', detail: 'Các pose và manifest chuyển động MC.' },
  ...DEFAULT_SLOT_SOURCES.filter((item) => item.slot.startsWith('audio.')).map((item, index) => {
    const folder = item.destination.split('/').slice(0, -1).join('/');
    const slot = item.slot.slice('audio.'.length);
    return { id: `A${String(index + 1).padStart(2, '0')}`, name: slot, path: folder, slots: item.slot, detail: `Âm thanh ${slot}.` };
  }),
];

function safeSource(root: string, relative: string) {
  const parts = relative.split(/[\\/]/u);
  if (!relative || parts.some((part) => !part || part === '.' || part === '..')) throw new Error(`Đường dẫn asset không an toàn: ${relative}`);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Không sao chép symlink: ${relative}`);
  }
  const rel = resolve(root, relative).slice(resolve(root).length);
  if (rel.startsWith(sep + '..') || resolve(root, relative) === resolve(root)) throw new Error(`Asset nằm ngoài thư mục nguồn: ${relative}`);
  return current;
}

function renameWithRetry(source: string, destination: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      renameSync(source, destination);
      return;
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(code) || attempt === 4) throw error;
      // Windows antivirus/indexers can briefly lock a newly completed staging directory.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * (attempt + 1));
    }
  }
}

const EXPORTABLE_ASSET_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.webm', '.mp4', '.mp3', '.ogg', '.wav', '.woff2', '.json',
]);

function copyTree(source: string, destination: string, root: string, copied: string[], warnings: string[]) {
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error('Không sao chép symlink trong thư mục asset.');
  if (stat.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name === '_nhap') continue;
      const from = join(source, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Không sao chép symlink: ${from.slice(root.length + 1)}`);
      copyTree(from, join(destination, entry.name), root, copied, warnings);
    }
  } else if (stat.isFile()) {
    const relative = source.slice(root.length + 1);
    if (stat.size > 50 * 1024 * 1024) throw new Error(`Asset ${relative} lớn hơn 50 MB.`);
    const extension = extname(source).toLowerCase();
    const normalizedRelative = relative.split(sep).join('/');
    const isSlotGuide = /^assets\/[NVLAKIH]-[a-z-]+\/[NVLAKIH]\d{2,3}-[a-z0-9-]+\/DOC-TOI\.txt$/iu.test(normalizedRelative);
    if (!EXPORTABLE_ASSET_EXTENSIONS.has(extension) && !isSlotGuide) {
      const marker = `(đuôi ${extension || 'không có'})`;
      if (!warnings.some((warning) => warning.includes(marker)))
        warnings.push(`Bỏ qua tệp không hỗ trợ ${relative} ${marker}; các tệp cùng loại khác cũng bị bỏ qua.`);
      return;
    }
    mkdirSync(join(destination, '..'), { recursive: true });
    copyFileSync(source, destination);
    copied.push(relative);
  } else throw new Error(`Asset không phải file/thư mục: ${source.slice(root.length + 1)}`);
}

function pickAudioSource(root: string, base: string) {
  for (const extension of ['.mp3', '.ogg', '.wav']) {
    const candidate = `${base}${extension}`;
    try { return safeSource(root, candidate); } catch { /* thử đuôi tiếp theo */ }
  }
  return null;
}

function copyOptionalFonts(root: string, staging: string, copied: string[], warnings: string[]) {
  const fonts: Array<{ family: string; file: string; weight: number; style: 'normal' | 'italic' }> = [];
  const candidates = ['fonts', 'font'].map((name) => join(root, name)).filter((path) => existsSync(path));
  for (const candidate of candidates) {
    const rootStat = lstatSync(candidate);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error(`Thư mục font không an toàn: ${candidate}`);
    const sourceBase = candidate.slice(root.length + 1);
    for (const absolute of walkFiles(candidate)) {
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error(`Không sao chép symlink font: ${absolute.slice(root.length + 1)}`);
      if (stat.size > 50 * 1024 * 1024) throw new Error(`Font ${absolute.slice(root.length + 1)} lớn hơn 50 MB.`);
      if (extname(absolute).toLowerCase() !== '.woff2') {
        warnings.push(`Bỏ qua font không phải WOFF2 ${absolute.slice(root.length + 1)}.`);
        continue;
      }
      const relativePath = absolute.slice(root.length + 1).split(sep).join('/');
      const destination = join(staging, 'fonts', ...relativePath.slice(sourceBase.length + 1).split('/'));
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(absolute, destination);
      const file = `fonts/${relativePath.slice(sourceBase.length + 1).split(sep).join('/')}`;
      const stem = basename(absolute, extname(absolute));
      const family = stem.replace(/[-_](?:thin|extralight|light|regular|medium|semibold|demibold|bold|extrabold|black|italic)$/iu, '').replace(/[-_]+/gu, ' ').trim() || stem;
      const weight = /(?:thin|100)$/iu.test(stem) ? 100 : /(?:extralight|200)$/iu.test(stem) ? 200 : /(?:light|300)$/iu.test(stem) ? 300
        : /(?:medium|500)$/iu.test(stem) ? 500 : /(?:semibold|demibold|600)$/iu.test(stem) ? 600 : /(?:bold|700)$/iu.test(stem) ? 700
          : /(?:extrabold|800)$/iu.test(stem) ? 800 : /(?:black|900)$/iu.test(stem) ? 900 : 400;
      fonts.push({ family, file, weight, style: /italic/iu.test(stem) ? 'italic' : 'normal' });
      copied.push(relativePath);
    }
  }
  return fonts;
}

export function validateThemeDirectory(directory: string) {
  return ThemeStore.validateDirectory(directory);
}

export async function exportDefaultTheme(options: { out: string; assets: string; force?: boolean; createMap?: boolean; createSkinAssets?: boolean }) {
  const out = resolve(options.out);
  const assetsRoot = resolve(options.assets);
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(basename(out)))
    throw new Error('Tên thư mục đầu ra phải là id theme gồm chữ thường, số và dấu gạch ngang.');
  if (existsSync(out) && !options.force) throw new Error(`Thư mục đích đã tồn tại: ${out}. Dùng --force để cập nhật.`);
  mkdirSync(dirname(out), { recursive: true });
  const staging = mkdtempSync(join(dirname(out), `.${basename(out)}.tmp-`));
  const manifestAssets: Partial<Record<ThemeAssetSlot, string>> = {};
  const warnings: string[] = [];
  const copied: string[] = [];

  let backup: string | null = null;
  try {
    for (const item of DEFAULT_SLOT_SOURCES) {
      const isAudio = item.slot.startsWith('audio.');
      let source: string | null = null;
      try {
        source = isAudio ? pickAudioSource(assetsRoot, item.source) : safeSource(assetsRoot, item.source);
      } catch (error) {
        if (!existsSync(join(assetsRoot, item.source))) source = null;
        else throw error;
      }
      if (!source) {
        warnings.push(`Thiếu ${item.slot}: không có ${item.source}${isAudio ? '.mp3/.ogg/.wav' : ''}.`);
        continue;
      }
      const destination = join(staging, ...item.destination.split('/'));
      if (item.directory) {
        const copiedBefore = copied.length;
        copyTree(source, destination, assetsRoot, copied, warnings);
        if (copied.length === copiedBefore) {
          // A directory containing only ignored documents must not become an empty manifest slot.
          rmSync(destination, { recursive: true, force: true });
          warnings.push(`${item.slot}: thư mục hiện chưa có asset được hỗ trợ.`);
        } else manifestAssets[item.slot] = item.destination;
        continue;
      }
      const destinationExtension = extname(item.destination);
      const sourceExtension = extname(source);
      const relativeDestination = destinationExtension
        ? item.destination.slice(0, -destinationExtension.length) + sourceExtension
        : `${item.destination}${sourceExtension}`;
      const finalDestination = join(staging, ...relativeDestination.split('/'));
      mkdirSync(join(finalDestination, '..'), { recursive: true });
      const stat = lstatSync(source);
      if (!stat.isFile()) throw new Error(`${item.source}: cần là tệp.`);
      if (stat.size > 50 * 1024 * 1024) throw new Error(`${item.source}: vượt quá 50 MB.`);
      copyFileSync(source, finalDestination);
      copied.push(source.slice(assetsRoot.length + 1));
      manifestAssets[item.slot] = relativeDestination;
    }

    for (const folder of DEFAULT_ASSET_FOLDERS) {
      const directory = join(staging, ...folder.path.split('/'));
      if (!existsSync(directory) || !lstatSync(directory).isDirectory()) continue;
      const files = walkFiles(directory).filter((path) => basename(path) !== 'DOC-TOI.txt');
      if (!files.length) continue;
      const docPath = join(directory, 'DOC-TOI.txt');
      writeFileSync(docPath, [
        `ID: ${folder.id}`, `Tên: ${folder.name}`, `Nhóm: ${folder.id[0]}; asset mặc định.`,
        `Slot manifest: ${folder.slots}.`, folder.detail,
        'Đường dẫn tương đối với theme. Giữ tên file, định dạng và hierarchy bên trong thư mục.',
        'Mỗi file phải đúng nội dung được mô tả; nền/nhân vật có thể cần alpha theo định dạng hiện tại.',
        `File hiện có: ${files.map((path) => path.slice(directory.length + 1).split(sep).join('/')).join(', ')}.`,
        '',
      ].join('\n'), 'utf8');
      copied.push(docPath.slice(staging.length + 1));
    }

    const fonts = copyOptionalFonts(assetsRoot, staging, copied, warnings);
    const manifest = {
      schemaVersion: 1,
      id: basename(out),
      name: basename(out) === 'default' ? 'Bá Vương Đại Chiến' : basename(out),
      description: 'Theme mặc định được xuất từ asset cục bộ hiện có.',
      tokens: THEME_DEFAULT_TOKENS,
      tokenDescriptions: THEME_DEFAULT_TOKEN_DESCRIPTIONS,
      fonts,
      assets: manifestAssets,
      skinAssets: {},
      texts: THEME_DEFAULT_TEXTS,
      achievements: Object.fromEntries(ACHIEVEMENT_IDS.map((id) => [id, THEME_DEFAULT_ACHIEVEMENTS[id]])),
    };
    const baseManifest = ThemeManifestSchema.parse(manifest);
    let parsedManifest = baseManifest;
    if (options.createSkinAssets) {
      const initialReview = await createThemeReviewArtifacts(baseManifest, { themeDirectory: staging, fallbackAssets: assetsRoot, captureDefaultSkins: true });
      if (initialReview.missingSlots.length) throw new Error(`Không thể xuất theme default: chưa đo được bbox cho ${initialReview.missingSlots.join(', ')}.`);
      parsedManifest = ThemeManifestSchema.parse({ ...manifest, skinAssets: initialReview.skinAssets });
      const finalReview = await createThemeReviewArtifacts(parsedManifest, { themeDirectory: staging, fallbackAssets: assetsRoot });
      if (finalReview.missingSlots.length) throw new Error(`Không thể xuất theme default: registry còn slot chưa khớp DOM ${finalReview.missingSlots.join(', ')}.`);
    }
    writeFileSync(join(staging, 'theme.json'), `${JSON.stringify(parsedManifest, null, 2)}\n`, { encoding: 'utf8' });
    writeFileSync(join(staging, 'CAN-CHUAN-BI.md'), createPreparationGuide(parsedManifest, manifestAssets, staging), 'utf8');
    if (options.createMap !== false)
      writeFileSync(join(staging, 'SO-DO.png'), await createThemeMapPng(parsedManifest, { themeDirectory: staging, fallbackAssets: assetsRoot }));

    if (existsSync(out)) {
      if (!options.force) throw new Error(`Thư mục đích đã tồn tại: ${out}. Dùng --force để cập nhật.`);
      backup = join(dirname(out), `.${basename(out)}.backup-${randomUUID()}`);
      renameWithRetry(out, backup);
    }
    try {
      renameWithRetry(staging, out);
    } catch (error) {
      if (backup) {
        renameWithRetry(backup, out);
        backup = null;
      }
      throw error;
    }
    if (backup) {
      try { rmSync(backup, { recursive: true }); }
      catch { warnings.push(`Không dọn được bản theme cũ: ${backup}`); }
      backup = null;
    }
    return { directory: out, manifest: parsedManifest, warnings, copied };
  } catch (error) {
    if (backup && !existsSync(out)) {
      try { renameSync(backup, out); backup = null; }
      catch { /* giữ nguyên lỗi gốc; bản dự phòng vẫn còn để khôi phục thủ công */ }
    }
    try { rmSync(staging, { recursive: true, force: true }); }
    catch { /* không che lỗi export ban đầu */ }
    throw error;
  }
}


const SLOT_GUIDE: Record<ThemeAssetSlot, { size: string; formats: string; alpha: string; scene: string }> = {
  'arena.background': { size: '1080 × 1920 px (toàn khung; ảnh được cover/crop)', formats: 'JPG, PNG, WEBP', alpha: 'Không', scene: 'Sảnh/đấu trường; chỉ ảnh nền sạch, không chữ hoặc khung UI.' },
  'arena.questionBackground': { size: '1080 × 1920 px (toàn khung; ảnh được cover/crop)', formats: 'JPG, PNG, WEBP', alpha: 'Không', scene: 'Câu hỏi và công bố đáp án; chỉ ảnh nền sạch, không chữ hoặc khung UI.' },
  'arena.flag.0': { size: '70 px rộng, cao theo tỷ lệ ảnh', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có (PNG/SVG)', scene: 'Cờ 1 bên trái đấu trường.' },
  'arena.flag.1': { size: '58 px rộng, cao theo tỷ lệ ảnh', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có (PNG/SVG)', scene: 'Cờ 2 bên trái đấu trường.' },
  'arena.flag.2': { size: '58 px rộng, cao theo tỷ lệ ảnh', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có (PNG/SVG)', scene: 'Cờ 3 bên trái đấu trường.' },
  'arena.flag.3': { size: '58 px rộng, cao theo tỷ lệ ảnh', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có (PNG/SVG)', scene: 'Cờ 4 bên trái đấu trường.' },
  'arena.flag.4': { size: '58 px rộng, cao theo tỷ lệ ảnh', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có (PNG/SVG)', scene: 'Cờ 5 bên phải đấu trường.' },
  'arena.flag.5': { size: '58 px rộng, cao theo tỷ lệ ảnh', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có (PNG/SVG)', scene: 'Cờ 6 bên phải đấu trường.' },
  'arena.flag.6': { size: '58 px rộng, cao theo tỷ lệ ảnh', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có (PNG/SVG)', scene: 'Cờ 7 bên phải đấu trường.' },
  'arena.flag.7': { size: '70 px rộng, cao theo tỷ lệ ảnh', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có (PNG/SVG)', scene: 'Cờ 8 bên phải đấu trường.' },
  'arena.loopVideoWebm': { size: '1080 × 1920 px vùng phủ; ưu tiên video dọc', formats: 'WEBM', alpha: 'Không', scene: 'Video nền lặp trong câu hỏi/REVEAL và Victory.' },
  'arena.loopVideoMp4': { size: '1080 × 1920 px vùng phủ; ưu tiên video dọc', formats: 'MP4', alpha: 'Không', scene: 'Bản dự phòng video nền lặp.' },
  'brand.logo': { size: 'Header 255 × 210 px; header QUESTION/REVEAL 172.8 × 178.5 px; Victory 502.2 × 501.1 px', formats: 'PNG, WEBP, SVG', alpha: 'Nên có', scene: 'Logo header và Victory; object-fit contain, giữ nguyên khung hiển thị.' },
  'chibi.bankDir': { size: '92 × 104 px khung ghế; 70 × 78 px khi có ngai', formats: 'PNG, JPG, WEBP, GIF, SVG', alpha: 'Nên có', scene: 'Ngân hàng chibi; đủ tất cả nhân vật đang dùng và các dáng.' },
  'chibi.podiumDir': { size: 'Top 2/3: 240 × 420 px; Top 1: 440 × 520 px', formats: 'PNG, JPG, WEBP, GIF, SVG', alpha: 'Nên có', scene: 'Thư mục Top 2 và Top 3; đủ hai dáng cho mỗi nhân vật có thể thắng.' },
  'mc.static': { size: 'Khung cơ sở 250 × 290 px; compact 180 × 208 px; question/reveal 280 × 390 px hoặc 205 × 158 px theo bố cục V3', formats: 'PNG, JPG, WEBP, GIF, SVG', alpha: 'Nên có', scene: 'Ảnh tĩnh dự phòng MC Kelly trong mọi cảnh.' },
  'mc.sequenceDir': { size: 'Khung cơ sở 250 × 290 px; compact 180 × 208 px; question/reveal 280 × 390 px hoặc 205 × 158 px theo bố cục V3', formats: 'PNG, JPG, WEBP, GIF, SVG, JSON manifest', alpha: 'Nên có', scene: 'Chuỗi pose MC: idle bắt buộc; welcome/ask/react/celebrate tùy chọn, thiếu thì dùng idle.' },
  'throne.bankDir': { size: 'Ngai 400 × 400 px; khung Top 1 Victory 440 × 520 px', formats: 'PNG, JPG, WEBP, GIF, SVG', alpha: 'Nên có', scene: 'Ngai trống/ngai theo characterId; ảnh cùng slot dùng cho dáng Top 1 trong Victory.' },
  'victory.background': { size: '1080 × 1920 px (cover toàn khung)', formats: 'JPG, PNG, WEBP', alpha: 'Không', scene: 'Nền Victory.' },
  'victory.userCover': { size: '1080 × 1920 px (cover toàn khung)', formats: 'JPG, PNG, WEBP', alpha: 'Không', scene: 'Ảnh nền sự kiện Victory; ưu tiên ảnh riêng không có UI.' },
  'victory.trophyStage': { size: '1080 × 1920 px (lớp nền cover toàn stage)', formats: 'PNG, JPG, WEBP, SVG', alpha: 'Nên có', scene: 'Sân khấu Victory; khung được CSS giữ nguyên.' },
  'audio.question-enter': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Hiệu ứng mở câu hỏi.' },
  'audio.countdown-tick': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Tiếng tích đếm ngược.' },
  'audio.timeout': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Hết thời gian.' },
  'audio.correct-answer': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Công bố đáp án đúng.' },
  'audio.top10': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Chuyển sang Top 10.' },
  'audio.victory': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Cue chiến thắng ngắn.' },
  'audio.transition': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Chuyển cảnh.' },
  'audio.victory-music-1': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Nhạc vinh danh lượt 1.' },
  'audio.victory-music-2': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Nhạc vinh danh lượt 2.' },
  'audio.bgm-lobby': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Nhạc nền sảnh.' },
  'audio.bgm-game': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Nhạc nền trong câu hỏi.' },
  'audio.bgm': { size: 'Không áp dụng', formats: 'MP3, OGG, WAV', alpha: 'Không áp dụng', scene: 'Nhạc nền dự phòng.' },
};

const TOKEN_USAGE: Record<string, string> = {
  deep: 'Nền gradient sân khấu, thẻ ghế và podium.', violet: 'Nút/điểm nhấn tím, ánh sáng.', gold: 'Điểm, thời gian, viền podium và trạng thái đúng.',
  sky: 'Viền sáng, cờ/nhãn phụ.', pink: 'Điểm nhấn và trạng thái đồng hạng.', coral: 'Cảnh báo, nhấn MC.', ink: 'Nền tối sân khấu và panel.', neon: 'Quầng sáng/đường viền.', paper: 'Chữ sáng và họa tiết nền.',
  'font-body': 'Font thân bài cho toàn overlay.', 'font-display': 'Font tiêu đề/ribbon và tiêu đề màn.', 'bg-main': 'Nền chính của overlay.', 'bg-panel': 'Nền panel/thẻ.', 'bg-panel-soft': 'Nền panel câu hỏi bán trong suốt.',
  'text-primary': 'Chữ chính trên HUD và nhãn.', 'text-muted': 'Chữ phụ trên nhãn.', 'text-subtle': 'Chữ ít nhấn.', accent: 'Điểm nhấn panel và tiêu đề.',
  'answer-a': 'Viền/nhãn lựa chọn A.', 'answer-b': 'Viền/nhãn lựa chọn B.', 'answer-c': 'Viền/nhãn lựa chọn C.', 'answer-d': 'Viền/nhãn lựa chọn D.',
  correct: 'Chấm đúng, trạng thái đáp án đúng.', wrong: 'Sai/cảnh báo.', timer: 'Số và viền đồng hồ.', 'seat-accent': 'Ghế khán giả và nhãn cạnh ghế.',
  'leaderboard-row': 'Nền dòng BXH.', 'border-glow': 'Viền phát sáng của panel.', 'violet-glow': 'Quầng tím.', 'gold-glow': 'Quầng vàng.', 'sky-glow': 'Quầng xanh trời.',
  'storm-gradient': 'Nền sân khấu tổng thể.', 'question-gradient': 'Nền khung câu hỏi.', 'panel-gradient': 'Nền thẻ / panel.',
  'accent-soft': 'Nền tím nhấn bán trong suốt.', 'answer-a-soft': 'Nền lựa chọn A.', 'answer-b-soft': 'Nền lựa chọn B.', 'answer-c-soft': 'Nền lựa chọn C.', 'answer-d-soft': 'Nền lựa chọn D.',
  'coral-soft': 'Nền san hô cảnh báo.', 'correct-soft': 'Nền trạng thái đúng.', 'deep-soft': 'Nền xanh tím nhạt.', 'gold-soft': 'Nền vàng nhạt.', 'ink-soft': 'Nền tối bán trong suốt.',
  'leaderboard-row-soft': 'Nền hàng BXH bán trong suốt.', 'neon-soft': 'Quầng neon.', 'paper-soft': 'Chữ/họa tiết sáng bán trong suốt.', 'pink-soft': 'Nền hồng bán trong suốt.',
  'seat-accent-soft': 'Nền nhấn ghế bán trong suốt.', 'sky-soft': 'Nền xanh trời bán trong suốt.', 'text-primary-soft': 'Chữ chính có alpha.', 'timer-soft': 'Đồng hồ và quầng đồng hồ.',
  'violet-soft': 'Nền/quầng tím bán trong suốt.', 'wrong-soft': 'Cảnh báo sai bán trong suốt.', transparent: 'Lớp trong suốt trên nền, không tô thêm màu.',
};

const TOKEN_GROUPS: Array<[string, string[]]> = [
  ['Nền và panel', ['deep', 'ink', 'bg-main', 'bg-panel', 'bg-panel-soft', 'storm-gradient', 'question-gradient', 'panel-gradient', 'deep-soft', 'ink-soft']],
  ['Chữ và font', ['paper', 'text-primary', 'text-muted', 'text-subtle', 'text-primary-soft', 'paper-soft', 'font-body', 'font-display']],
  ['Đáp án A–D', ['answer-a', 'answer-b', 'answer-c', 'answer-d', 'answer-a-soft', 'answer-b-soft', 'answer-c-soft', 'answer-d-soft']],
  ['Đồng hồ', ['timer', 'timer-soft']],
  ['BXH và ghế', ['leaderboard-row', 'leaderboard-row-soft', 'seat-accent', 'seat-accent-soft']],
  ['Viền sáng và trạng thái', ['violet', 'gold', 'sky', 'pink', 'coral', 'neon', 'accent', 'correct', 'wrong', 'border-glow', 'violet-glow', 'gold-glow', 'sky-glow', 'accent-soft', 'coral-soft', 'correct-soft', 'gold-soft', 'neon-soft', 'pink-soft', 'sky-soft', 'violet-soft', 'wrong-soft', 'transparent']],
];

const TEXT_GUIDE: Record<string, { where: string; recommended: string; behavior: string }> = {
  brandTitleLine1: { where: 'LOBBY và logo dự phòng trong header.', recommended: '≤ 12 ký tự', behavior: 'Một dòng; co chữ tự động trong khung logo khi thay giá trị.' },
  brandTitleLine2: { where: 'LOBBY và logo dự phòng trong header.', recommended: '≤ 12 ký tự', behavior: 'Một dòng; co chữ tự động trong khung logo khi thay giá trị.' },
  brandTagline: { where: 'Dưới logo dự phòng; alt text của logo ảnh.', recommended: '≤ 28 ký tự', behavior: 'Một dòng; co chữ tự động. Alt text không hiển thị thành tiêu đề.' },
  legacyBrandTitle: { where: 'Alt text / nhãn truy cập của logo.', recommended: '≤ 36 ký tự', behavior: 'Không hiển thị trực tiếp, không cần co chữ.' },
  arenaWelcome: { where: 'LOBBY hoặc bóng thoại MC khi dùng lời chào mặc định.', recommended: '≤ 42 ký tự tổng; 24 mỗi dòng', behavior: 'Có thể xuống dòng; trong bóng thoại sẽ tự gói trong khung cố định.' },
  kicker: { where: 'Nhãn sự kiện ở phần đầu header mọi cảnh.', recommended: '≤ 24 ký tự', behavior: 'Tách theo từ thành hai dòng và tự co trong khung.' },
  arenaTitle: { where: 'Ribbon tiêu đề ở LOBBY, QUESTION và REVEAL.', recommended: '≤ 24 ký tự', behavior: 'Một dòng; tự co đến cỡ tối thiểu rồi rút gọn bằng dấu ba chấm.' },
  playingLabel: { where: 'Thẻ số người chơi trong header.', recommended: '≤ 18 ký tự', behavior: 'Co chữ trong chiều rộng cố định.' },
  roundLabel: { where: 'Tiền tố nhãn số vòng ở thẻ vòng.', recommended: '≤ 8 ký tự', behavior: 'Co chữ trong chiều rộng cố định; số vòng do game thêm sau.' },
  leaderboardTitle: { where: 'Tiêu đề panel BXH ở QUESTION/REVEAL và màn BXH.', recommended: '≤ 16 ký tự', behavior: 'Co chữ trong chiều rộng cố định.' },
  victoryTitle: { where: 'Tiêu đề tùy chọn ở màn VICTORY.', recommended: '≤ 22 ký tự', behavior: 'Co chữ trong khung; để trống thì ẩn tiêu đề.' },
};

const TEXT_IDS: Record<string, string> = Object.fromEntries(Object.keys(THEME_DEFAULT_TEXTS).map((key, index) =>
  [key, `T${String(index + 1).padStart(2, '0')}`]));

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

function readJsonFile<T>(path: string): T | null {
  try { return JSON.parse(readFileSync(path, 'utf8')) as T; } catch { return null; }
}

function createPreparationGuide(manifest: Record<string, unknown>, assets: Record<string, string | undefined>, themeDirectory: string) {
  const sourceBySlot = new Map(DEFAULT_SLOT_SOURCES.map((item) => [item.slot, item]));
  const assetPath = (slot: string, fallback: string) => assets[slot] ?? fallback;
  const assetDirectory = (slot: string, fallback: string) => join(themeDirectory, ...assetPath(slot, fallback).split('/'));
  const chibiBankPath = assetPath('chibi.bankDir', 'assets/chibi');
  const podiumPath = assetPath('chibi.podiumDir', `${chibiBankPath}/dang-top2-top3`);
  const mcStaticPath = assetPath('mc.static', 'assets/mc/kelly.png');
  const mcSequencePath = assetPath('mc.sequenceDir', 'assets/mc/kelly');
  const thronePath = assetPath('throne.bankDir', 'assets/throne');
  const rows = THEME_ASSET_SLOTS.map((slot) => {
    const info = SLOT_GUIDE[slot];
    const path = assets[slot] ?? sourceBySlot.get(slot)?.destination ?? 'Asset dự phòng trong ứng dụng';
    const format = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toUpperCase() : info.formats;
    const absolute = path === 'Asset dự phòng trong ứng dụng' ? '' : join(themeDirectory, ...path.split('/'));
    const fileCount = absolute && existsSync(absolute) ? (lstatSync(absolute).isDirectory() ? walkFiles(absolute).length : 1) : 0;
    return '| ' + slot + ' | ' + path + ' | ' + info.size + ' | ' + format + '; chấp nhận ' + info.formats
      + ' | ' + info.alpha + ' | ' + info.scene + ' | ' + fileCount + ' | [ ] |';
  });
  const slotRegistry = readJsonFile<{ slots?: Array<{
    id: string; nhom: string; lop: number; thuMuc: string; files: Array<{ ten: string; batBuoc: boolean; trangThai: string }>;
    kichThuoc: { rong: number; cao: number; tiLe: number; saiSoPx: number };
    nineSlice: { tren: number; phai: number; duoi: number; trai: number } | null; viTri: Array<{ man: string }>;
    nenTrongSuot: boolean; dungLuongToiDa: number; ghiChu: string;
  }> }>(join(themeDirectory, 'slots.json'));
  const skinRows = (slotRegistry?.slots ?? []).map((slot) => {
    const states = slot.files.map((file) => `${file.ten}: ${file.trangThai}${file.batBuoc ? ' (bắt buộc)' : ''}`).join('<br>');
    const nineSlice = slot.nineSlice ? `${slot.nineSlice.tren}/${slot.nineSlice.phai}/${slot.nineSlice.duoi}/${slot.nineSlice.trai}px` : 'Không';
    const scenes = [...new Set(slot.viTri.map((position) => position.man))].join(', ');
    return `| ${slot.id} | ${slot.nhom} | ${slot.lop} | \`${slot.thuMuc}\` | ${slot.kichThuoc.rong}×${slot.kichThuoc.cao}px (${slot.kichThuoc.tiLe.toFixed(3)}) ±${slot.kichThuoc.saiSoPx}px | ${nineSlice} | ${slot.nenTrongSuot ? 'Có' : 'Không'} | ${slot.dungLuongToiDa} byte | ${states} | ${scenes} | ${slot.ghiChu} |`;
  });
  const tokens = (manifest.tokens ?? {}) as Record<string, string>;
  const tokenDescriptions = (manifest.tokenDescriptions ?? {}) as Record<string, string>;
  const usedTokens = new Set<string>();
  const tokenGroups = TOKEN_GROUPS.map(([group, keys]) => {
    const lines = keys.filter((key) => key in tokens).map((key) => {
      usedTokens.add(key);
      const value = tokens[key]!;
      const colorSample = /^(?:#|rgba?\(|linear-gradient\(|radial-gradient\()/iu.test(value);
      const sample = value === 'transparent'
        ? '<span style="display:inline-block;width:1em;height:1em;border:1px solid #777;background:transparent"></span>'
        : colorSample
          ? `<span style="display:inline-block;width:1em;height:1em;border:1px solid #777;background:${value}"></span>`
          : '🔤';
      return `| ${key} | ${value} | ${sample} | ${tokenDescriptions[key] ?? TOKEN_USAGE[key] ?? 'Màu/font dùng trong overlay.'} ${TOKEN_USAGE[key] ?? ''} |`;
    });
    return lines.length ? [`### ${group}`, '', '| Token | Giá trị | Mẫu | Dùng ở đâu |', '|---|---|---|---|', ...lines, ''] : [];
  }).flat();
  const ungroupedTokens = Object.keys(tokens).filter((key) => !usedTokens.has(key));
  if (ungroupedTokens.length) tokenGroups.push('### Token khác', '', '| Token | Giá trị | Mẫu | Dùng ở đâu |', '|---|---|---|---|', ...ungroupedTokens.map((key) => `| ${key} | ${tokens[key]} | ◧ | ${TOKEN_USAGE[key] ?? ''} |`), '');

  const charactersPath = join(assetDirectory('chibi.bankDir', 'assets/chibi'), 'manifest.json');
  const charactersData = readJsonFile<{ characters?: Array<{ id?: string }> }>(charactersPath);
  const characters = (charactersData?.characters ?? []).map((character) => character.id).filter((id): id is string => !!id);
  const podiumRoot = assetDirectory('chibi.podiumDir', `${chibiBankPath}/dang-top2-top3`);
  const imageNames = (directory: string) => walkFiles(directory).filter((path) => /\.(?:png|jpe?g|webp|gif|svg)$/iu.test(path)).map((path) => path.slice(directory.length + 1).split(sep).join('/')).sort();
  const top2 = imageNames(join(podiumRoot, 'top2'));
  const top3 = imageNames(join(podiumRoot, 'top3'));
  const podiumRows = characters.length
    ? characters.map((id) => {
      const top2File = `top2/top2-${id}.png`;
      const top3File = `top3/top3-${id}.png`;
      return `| ${id} | ${top2File} | ${top2.includes(top2File) ? 'Có' : 'Thiếu'} | ${top3File} | ${top3.includes(top3File) ? 'Có' : 'Thiếu'} |`;
    })
    : [`| Không có \`${chibiBankPath}/manifest.json\`; số ID nhân vật chưa xác định. | \`${podiumPath}/top2-<characterId>.png\` | — | \`${podiumPath}/top3-<characterId>.png\` | — |`];
  const mcDirectory = assetDirectory('mc.sequenceDir', 'assets/mc/kelly');
  const mcManifest = readJsonFile<{ animations?: Record<string, { path?: string; frames?: number; fps?: number; loop?: boolean }>; fallback?: string }>(join(mcDirectory, 'manifest.json'));
  const mcPoses = ['idle', 'welcome', 'ask', 'react', 'celebrate'] as const;
  const mcRows = mcPoses.map((pose) => {
    const animation = mcManifest?.animations?.[pose];
    const playback = animation ? animation.loop ? 'lặp' : 'không lặp' : pose === 'idle' ? 'bắt buộc' : 'tùy chọn; thiếu thì dùng idle';
    return `| ${pose} | ${animation?.path ?? `${mcSequencePath}/${pose}`} | ${animation?.frames ?? 0} | ${animation?.fps ?? '—'} | ${playback} |`;
  });
  const throneFiles = imageNames(assetDirectory('throne.bankDir', 'assets/throne'));
  const fontFiles = (manifest.fonts ?? []) as Array<{ family?: string; file?: string; weight?: string | number; style?: string }>;
  const textRows = Object.entries(THEME_DEFAULT_TEXTS).map(([key, defaultValue]) => {
    const value = String(((manifest.texts ?? {}) as Record<string, string>)[key] ?? defaultValue);
    const guide = TEXT_GUIDE[key] ?? { where: 'HUD overlay.', recommended: '≤ 24 ký tự', behavior: 'Co/gói chữ trong vùng cố định.' };
    return `| ${TEXT_IDS[key]} | \`texts.${key}\` | ${value.replaceAll('\n', '<br>')} | ${guide.where} | ${guide.recommended} (schema tối đa 200) | ${guide.behavior} |`;
  });
  const achievements = (manifest.achievements ?? {}) as Record<string, { title?: string; subtitle?: string; accentColor?: string; icon?: string | null; enabled?: boolean; maxRows?: number }>;
  const achievementRows = ACHIEVEMENT_IDS.map((id) => {
    const base = THEME_DEFAULT_ACHIEVEMENTS[id];
    const override = achievements[id] ?? {};
    const title = override.title ?? base.title;
    const subtitle = override.subtitle ?? base.subtitle;
    return `| ${id} | ${title} | ${subtitle} | ${override.accentColor ?? base.accentColor} | ${override.icon ?? 'Không dùng icon riêng'} | ${title.length}/100 tên; ${subtitle.length}/160 phụ đề; schema tối đa 100/160 | ${override.maxRows ?? base.maxRows} |`;
  });
  const characterAssets = imageNames(assetDirectory('chibi.bankDir', 'assets/chibi'));
  const throneCount = throneFiles.length;
  const mcCount = imageNames(mcDirectory).length;
  const podiumCount = top2.length + top3.length;
  const assetFileTotal = walkFiles(join(themeDirectory, 'assets')).length;
  return [
    '# Chuẩn bị theme: ' + String(manifest.name ?? ''),
    '',
    'ID trong sơ đồ `SO-DO.png` trùng mã ở bảng asset (`01`–`33`) và bảng chữ (`T01`–`T11`). Mẫu màu là ô tham khảo; hãy đối chiếu giá trị hex/RGBA/gradient bên cạnh.',
    'Thay asset trong `assets/`, màu/chữ trong `theme.json`. Mỗi tệp tối đa 50 MB. Không đổi bố cục hoặc hình học khung.',
    ...(manifest.id === 'default' ? ['Gói `default` giữ CSS đang có để bảo đảm hình ảnh 0 px lệch; `default.png` của K/I/H là ảnh tham chiếu để vẽ theme mới. Theme khác bật ảnh skin khi ảnh hợp lệ tải xong.'] : []),
    '',
    'Ảnh nền là lớp riêng, không dính chữ/khung UI. Số lượng asset đã xuất: **' + assetFileTotal + ' tệp**; asset ảnh trong kho chibi: **' + characterAssets.length + '**; chibi Top 2/3: **' + podiumCount + '**; frame/ảnh MC: **' + mcCount + '**; ngai: **' + throneCount + '**.',
    '',
    '## 1. Asset và vị trí',
    '',
    '| ID | Slot | Tệp hiện tại / dự phòng | Kích thước px đang hiển thị | Định dạng | Trong suốt | Màn hình / khung | Số file | Đã thay? |',
    '|---:|---|---|---|---|---|---|---:|---|',
    ...rows.map((row, index) => row.replace('| ', `| ${String(index + 1).padStart(2, '0')} | `)),
    '',
    '## 1A. Khung, biểu tượng, hiệu ứng (nguồn duy nhất: `slots.json`)',
    '',
    'Nhóm H là hiệu ứng động: xem ảnh asset riêng; kiểm thật bằng chạy thử overlay.',
    '',
    '| ID | Nhóm | Lớp | Thư mục | Kích thước/tỉ lệ | 9-slice (trên/phải/dưới/trái) | Trong suốt | Tối đa | File và trạng thái | Màn | Ghi chú |',
    '|---|---|---:|---|---|---|---|---:|---|---|---|',
    ...(skinRows.length ? skinRows : ['| Chưa đo | — | — | — | Chạy `pnpm theme:map <id>` | — | — | — | — | — | Registry chưa có dữ liệu. |']),
    '',
    '## 2. Màu (55 token CSS)',
    '',
    ...tokenGroups,
    'Token font chỉ đổi họ chữ, không làm đổi cỡ/khung. Bộ CSS vẫn kiểm tra từ chối tên token vị trí/kích thước.',
    '',
    '## 3. Font',
    '',
    ...(fontFiles.length ? fontFiles.map((font) => `- **${font.family ?? 'Font theme'}** — \`${font.file ?? '—'}\`, weight ${font.weight ?? 400}, ${font.style ?? 'normal'}; dùng theo \`font-body\`/\`font-display\`.`) : ['- Không có file font riêng trong manifest. Font hiện tại là `"Segoe UI", "Be Vietnam Pro", Roboto, Arial, sans-serif`; chữ nội dung và tiêu đề dùng hai token `font-body`/`font-display`. Nếu thêm font, chỉ nhận `.woff2`.']),
    '- Kiểm tra mẫu ký tự Việt trước khi bàn giao: `ĐẶNG THỊ ÁNH · ă â ê ô ơ ư đ Ắ Ế Ộ Ơ Ư`.',
    '',
    '## 4. Chữ tiêu đề (`texts`)',
    '',
    '| ID | Khóa | Giá trị đang dùng | Hiện ở đâu | Giới hạn khuyến nghị | Quá dài thì |',
    '|---|---|---|---|---|---|',
    ...textRows,
    'Giới hạn schema kỹ thuật là 200 ký tự mỗi khóa; các giới hạn khuyến nghị phía trên để giữ chữ dễ đọc.',
    '',
    '## 5. Danh hiệu (`achievements`)',
    '',
    '| Mã | Tên | Phụ đề | Màu | Icon | Độ dài hiện tại / tối đa | Số dòng |',
    '|---|---|---|---|---|---|---:|',
    ...achievementRows,
    '',
    '## 6. Chibi, MC và ngai',
    '',
    `- **Chibi bank:** ${characters.length} nhân vật trong \`${chibiBankPath}/manifest.json\`; ${characterAssets.length} file ảnh hiện có. Tên ID nhân vật lấy nguyên từ manifest.`,
    `- Top 2/Top 3: mỗi nhân vật có thể thắng cần đủ hai file trong \`${podiumPath}/top2\` và \`${podiumPath}/top3\`.`,
    '| Character ID | File Top 2 | Có? | File Top 3 | Có? |', '|---|---|---|---|---|', ...podiumRows,
    '',
    `- **MC:** ảnh tĩnh dự phòng \`${mcStaticPath}\`; thư mục sequence \`${mcSequencePath}\` có ${mcCount} ảnh/frame. \`idle\` là pose bắt buộc; \`welcome\`, \`ask\`, \`react\`, \`celebrate\` có thể thiếu và sẽ dùng \`idle\`. Mỗi frame dùng tên \`0001.png\`, \`0002.png\`… dưới thư mục pose; bảng ghi số frame/FPS/loop từ manifest, hoặc 0 nếu pose chưa có.`,
    '| Pose | Thư mục con | Số khung | FPS | Phát |', '|---|---|---:|---:|---|',
    ...mcRows,
    '',
    `- **Ngai:** ${throneCount} ảnh; thay đủ các file hiện có trong \`${thronePath}/\` theo tên nhân vật.`,
    ...(throneFiles.length ? [`  - ${throneFiles.map((name) => `\`${name}\``).join(', ')}`] : ['  - Theme hiện không có file ngai riêng.']),
    '',
    '## 7. Những gì theme không đổi',
    '',
    'Theme không đổi vị trí, kích thước, z-index, thứ tự lớp, ghế/tọa độ người chơi, dữ liệu câu hỏi/đáp án/điểm hoặc luật. Ảnh skin K, icon I và hiệu ứng H thay pixel trong bbox đã đo; thiếu ảnh thì CSS hiện tại tiếp tục làm dự phòng. `slots.json` là nguồn duy nhất của danh sách slot, kích thước và lớp.',
    '',
  ].join('\n');
}

export async function createTheme(options: { id: string; name: string; themes: string }) {
  const themesRoot = resolve(options.themes);
  const template = join(themesRoot, 'default');
  const out = join(themesRoot, options.id);
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(options.id))
    throw new Error('Id theme chỉ gồm chữ thường, số và dấu gạch ngang.');
  if (!existsSync(template) || !lstatSync(template).isDirectory())
    throw new Error('Chưa có theme mặc định tại ' + template + '. Hãy chạy theme:export-default trước.');
  if (existsSync(out)) throw new Error('Theme đích đã tồn tại: ' + out + '.');
  const stage = mkdtempSync(join(themesRoot, '.' + options.id + '.tmp-'));
  const copied: string[] = [];
  const warnings: string[] = [];
  try {
    copyTree(template, stage, template, copied, warnings);
    const manifestPath = join(stage, 'theme.json');
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    parsed.id = options.id;
    parsed.name = options.name;
    parsed.texts = { ...THEME_DEFAULT_TEXTS, ...(parsed.texts as Record<string, string> | undefined) };
    const assets = (parsed.assets ?? {}) as Record<string, string | undefined>;
    writeFileSync(manifestPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
    const validatedManifest = ThemeManifestSchema.parse(parsed);
    writeFileSync(join(stage, 'CAN-CHUAN-BI.md'), createPreparationGuide(parsed, assets, stage), 'utf8');
    await createThemeReviewArtifacts(validatedManifest, {
      themeDirectory: stage,
      fallbackAssets: resolve(process.env.QUIZ_ASSETS_DIR ?? 'fixtures/assets-placeholder'),
    });
    writeFileSync(join(stage, 'SO-DO.png'), await createThemeMapPng(validatedManifest, {
      themeDirectory: stage,
      fallbackAssets: resolve(process.env.QUIZ_ASSETS_DIR ?? 'fixtures/assets-placeholder'),
    }));
    renameSync(stage, out);
    return { directory: out, copied, warnings };
  } catch (error) {
    rmSync(stage, { recursive: true, force: true });
    throw error;
  }
}

type ParsedCliArgs =
  | { command: 'validate'; directory: string }
  | { command: 'new'; id: string; name: string; themes: string }
  | { command: 'map'; id: string; themes: string }
  | { command: 'pack'; id: string; themes: string; out: string }
  | { command: 'import'; file: string; themes: string }
  | { command: 'export-default'; options: { out: string; assets: string; force: boolean; createSkinAssets: true } };

function argumentsOf(argv: string[]): ParsedCliArgs {
  const [command, ...args] = argv;
  if (command === 'validate') {
    const directory = args[0];
    if (!directory || args.length !== 1) throw new Error('Cách dùng: pnpm theme:validate <thư-mục-theme>');
    return { command, directory };
  }
  if (command === 'export-default') {
    const options: { out: string; assets: string; force: boolean; createSkinAssets: true } = {
      out: resolve('data/themes/default'),
      assets: resolve(process.env.QUIZ_ASSETS_DIR ?? 'assets-local'),
      force: false,
      createSkinAssets: true,
    };
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === '--force') options.force = true;
      else if (arg === '--out' || arg === '--assets') {
        const value = args[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`Thiếu đường dẫn sau ${arg}.`);
        options[arg === '--out' ? 'out' : 'assets'] = resolve(value);
        index += 1;
      } else throw new Error(`Tham số không hỗ trợ: ${arg}`);
    }
    return { command, options };
  }
  if (command === 'new') {
    const id = args[0];
    if (!id || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(id))
      throw new Error('Id theme chỉ gồm chữ thường, số và dấu gạch ngang.');
    let name = '';
    let themes = resolve(process.env.QUIZ_THEMES_DIR ?? 'data/themes');
    for (let index = 1; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === '--name' || arg === '--themes') {
        const value = args[index + 1];
        if (!value || value.startsWith('--')) throw new Error('Thiếu giá trị sau ' + arg + '.');
        if (arg === '--name') name = value;
        else themes = resolve(value);
        index += 1;
      } else throw new Error('Tham số không hỗ trợ: ' + arg);
    }
    if (!name.trim()) throw new Error('Cách dùng: pnpm theme:new <id> --name "<Tên>"');
    if (name.trim().length > 100) throw new Error('Tên theme tối đa 100 ký tự.');
    return { command, id, name: name.trim(), themes };
  }
  if (command === 'map') {
    const id = args[0];
    if (!id || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(id)) throw new Error('Cách dùng: pnpm theme:map <id> [--themes <thư-mục>]');
    let themes = resolve(process.env.QUIZ_THEMES_DIR ?? 'data/themes');
    if (args.length > 1) {
      if (args.length !== 3 || args[1] !== '--themes' || !args[2] || args[2].startsWith('--')) throw new Error('Cách dùng: pnpm theme:map <id> [--themes <thư-mục>]');
      themes = resolve(args[2]);
    }
    return { command, id, themes };
  }
  if (command === 'pack') {
    const id = args[0];
    if (!id || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(id)) throw new Error('Cách dùng: pnpm theme:pack <id> [--themes <thư-mục>] [--out <fichier.zip>]');
    let themes = resolve(process.env.QUIZ_THEMES_DIR ?? 'data/themes');
    let out = resolve(`${id}.zip`);
    for (let index = 1; index < args.length; index += 1) {
      const arg = args[index];
      if ((arg !== '--themes' && arg !== '--out') || !args[index + 1] || args[index + 1]!.startsWith('--')) throw new Error('Cách dùng: pnpm theme:pack <id> [--themes <thư-mục>] [--out <tệp.zip>]');
      if (arg === '--themes') themes = resolve(args[index + 1]!);
      else out = resolve(args[index + 1]!);
      index += 1;
    }
    return { command, id, themes, out };
  }
  if (command === 'import') {
    const file = args[0];
    if (!file) throw new Error('Cách dùng: pnpm theme:import <file.zip> [--themes <thư-mục>]');
    let themes = resolve(process.env.QUIZ_THEMES_DIR ?? 'data/themes');
    for (let index = 1; index < args.length; index += 1) {
      if (args[index] !== '--themes' || !args[index + 1] || args[index + 1]!.startsWith('--') || index + 2 < args.length)
        throw new Error('Cách dùng: pnpm theme:import <file.zip> [--themes <thư-mục>]');
      themes = resolve(args[index + 1]!);
      index += 1;
    }
    if (extname(file).toLowerCase() !== '.zip') throw new Error('Chỉ nhận tệp gói .zip.');
    return { command, file, themes };
  }
  throw new Error('Cách dùng: pnpm theme:validate <thư-mục>, pnpm theme:new <id> --name "<Tên>", pnpm theme:map <id>, pnpm theme:pack <id>, pnpm theme:import <file.zip> hoặc pnpm theme:export-default [--out <dir>] [--assets <dir>] [--force]');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const parsed = argumentsOf(process.argv.slice(2));
    if (parsed.command === 'validate') {
      const result = validateThemeDirectory(parsed.directory);
      if (!result.success) {
        console.error(`Theme không hợp lệ: ${result.error}`);
        process.exitCode = 1;
      } else console.log(`Theme “${result.manifest.name}” (${result.manifest.id}) hợp lệ.`);
    } else if (parsed.command === 'new') {
      const result = await createTheme(parsed);
      console.log('Đã tạo theme “' + parsed.name + '” (' + parsed.id + ') tại ' + result.directory);
      console.log('Danh sách cần chuẩn bị: ' + join(result.directory, 'CAN-CHUAN-BI.md'));
      console.log('Sơ đồ vị trí: ' + join(result.directory, 'SO-DO.png'));
    } else if (parsed.command === 'map') {
      const directory = join(parsed.themes, parsed.id);
      const result = validateThemeDirectory(directory);
      if (!result.success) throw new Error(`Theme không hợp lệ: ${result.error}`);
      const review = await createThemeReviewArtifacts(result.manifest.manifest, {
        themeDirectory: directory,
        fallbackAssets: resolve(process.env.QUIZ_ASSETS_DIR ?? 'fixtures/assets-placeholder'),
      });
      if (review.missingSlots.length)
        throw new Error(`theme:map không đủ bbox hiển thị cho slot ${review.missingSlots.join(', ')}.`);
      writeFileSync(join(directory, 'SO-DO.png'), await createThemeMapPng(result.manifest.manifest, {
        themeDirectory: directory,
        fallbackAssets: resolve(process.env.QUIZ_ASSETS_DIR ?? 'fixtures/assets-placeholder'),
      }));
      writeFileSync(join(directory, 'CAN-CHUAN-BI.md'), createPreparationGuide(result.manifest.manifest, result.manifest.manifest.assets, directory), 'utf8');
      console.log('Đã tạo sơ đồ vị trí: ' + join(directory, 'SO-DO.png'));
    } else if (parsed.command === 'pack') {
      const result = packTheme({ directory: join(parsed.themes, parsed.id), out: parsed.out });
      console.log(`Đã đóng gói theme “${result.id}”: ${result.file} (${result.bytes} byte).`);
    } else if (parsed.command === 'import') {
      const result = importThemeArchive(parsed);
      console.log(`Đã kiểm tra và nhập theme “${result.name}” (${result.id}) vào ${result.directory}.`);
    } else {
      const result = await exportDefaultTheme(parsed.options);
      console.log(`Đã xuất theme mặc định: ${result.directory}`);
      console.log('Danh sách cần chuẩn bị: ' + join(result.directory, 'CAN-CHUAN-BI.md'));
      console.log('Sơ đồ vị trí: ' + join(result.directory, 'SO-DO.png'));
      for (const warning of result.warnings) console.warn(`Cảnh báo: ${warning}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Không thể thực hiện lệnh theme.');
    process.exitCode = 1;
  }
}
