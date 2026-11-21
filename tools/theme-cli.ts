import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  ACHIEVEMENT_IDS,
  THEME_DEFAULT_ACHIEVEMENTS,
  THEME_DEFAULT_TOKENS,
  THEME_DEFAULT_TOKEN_DESCRIPTIONS,
  THEME_DEFAULT_TEXTS,
  THEME_ASSET_SLOTS,
  type ThemeAssetSlot,
} from '@quiz/contracts';
import { ThemeStore } from '../apps/server/src/theme-store';

type SlotSource = { slot: ThemeAssetSlot; source: string; destination: string; directory?: boolean };

const DEFAULT_SLOT_SOURCES: SlotSource[] = [
  { slot: 'arena.background', source: 'arena/bg.jpg', destination: 'assets/arena/bg.jpg' },
  { slot: 'arena.questionBackground', source: 'arena/bg-question-user.jpg', destination: 'assets/arena/bg-question-user.jpg' },
  ...Array.from({ length: 8 }, (_, index) => ({ slot: `arena.flag.${index}` as ThemeAssetSlot, source: `arena/flags/flag-${index + 1}.png`, destination: `assets/arena/flags/flag-${index + 1}.png` })),
  { slot: 'arena.loopVideoWebm', source: 'arena/bg-loop.webm', destination: 'assets/arena/bg-loop.webm' },
  { slot: 'arena.loopVideoMp4', source: 'arena/bg-loop.mp4', destination: 'assets/arena/bg-loop.mp4' },
  { slot: 'brand.logo', source: 'brand/logo.png', destination: 'assets/brand/logo.png' },
  { slot: 'chibi.bankDir', source: 'chibi', destination: 'assets/chibi', directory: true },
  { slot: 'chibi.podiumDir', source: 'chibi/dang-top2-top3', destination: 'assets/chibi/dang-top2-top3', directory: true },
  { slot: 'throne.bankDir', source: 'throne', destination: 'assets/throne', directory: true },
  { slot: 'mc.static', source: 'mc/kelly.png', destination: 'assets/mc/kelly.png' },
  { slot: 'mc.sequenceDir', source: 'mc/kelly', destination: 'assets/mc/kelly', directory: true },
  { slot: 'victory.background', source: 'victory/bg.jpg', destination: 'assets/victory/bg.jpg' },
  { slot: 'victory.userCover', source: 'victory/bg-user-cover.jpg', destination: 'assets/victory/bg-user-cover.jpg' },
  { slot: 'victory.trophyStage', source: 'victory/trophy-stage.png', destination: 'assets/victory/trophy-stage.png' },
  ...['question-enter', 'countdown-tick', 'timeout', 'correct-answer', 'top10', 'victory', 'victory-music-1', 'victory-music-2', 'transition', 'bgm-lobby', 'bgm-game', 'bgm']
    .map((slot) => ({ slot: `audio.${slot}` as ThemeAssetSlot, source: `audio/${slot}`, destination: `assets/audio/${slot}` })),
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
      const from = join(source, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Không sao chép symlink: ${from.slice(root.length + 1)}`);
      copyTree(from, join(destination, entry.name), root, copied, warnings);
    }
  } else if (stat.isFile()) {
    const relative = source.slice(root.length + 1);
    if (stat.size > 50 * 1024 * 1024) throw new Error(`Asset ${relative} lớn hơn 50 MB.`);
    const extension = extname(source).toLowerCase();
    if (!EXPORTABLE_ASSET_EXTENSIONS.has(extension)) {
      warnings.push(`Bỏ qua tệp không hỗ trợ ${relative} (đuôi ${extension || 'không có'}).`);
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

export function validateThemeDirectory(directory: string) {
  return ThemeStore.validateDirectory(directory);
}

export function exportDefaultTheme(options: { out: string; assets: string; force?: boolean }) {
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

    const manifest = {
      schemaVersion: 1,
      id: basename(out),
      name: basename(out) === 'default' ? 'Bá Vương Đại Chiến' : basename(out),
      description: 'Theme mặc định được xuất từ asset cục bộ hiện có.',
      tokens: THEME_DEFAULT_TOKENS,
      tokenDescriptions: THEME_DEFAULT_TOKEN_DESCRIPTIONS,
      fonts: [],
      assets: manifestAssets,
      texts: THEME_DEFAULT_TEXTS,
      achievements: Object.fromEntries(ACHIEVEMENT_IDS.map((id) => [id, THEME_DEFAULT_ACHIEVEMENTS[id]])),
    };
    writeFileSync(join(staging, 'theme.json'), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8' });

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
    return { directory: out, manifest, warnings, copied };
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
  'chibi.podiumDir': { size: 'Top 2/3: 240 × 420 px; Top 1: 440 × 520 px', formats: 'PNG, JPG, WEBP, GIF, SVG', alpha: 'Nên có', scene: 'Thư mục assets/chibi/dang-top2-top3/top2 và top3; đủ hai dáng cho mỗi nhân vật có thể thắng.' },
  'mc.static': { size: 'Khung cơ sở 250 × 290 px; compact 180 × 208 px; question/reveal 280 × 390 px hoặc 205 × 158 px theo bố cục V3', formats: 'PNG, JPG, WEBP, GIF, SVG', alpha: 'Nên có', scene: 'Ảnh tĩnh dự phòng MC Kelly trong mọi cảnh.' },
  'mc.sequenceDir': { size: 'Khung cơ sở 250 × 290 px; compact 180 × 208 px; question/reveal 280 × 390 px hoặc 205 × 158 px theo bố cục V3', formats: 'PNG, JPG, WEBP, GIF, SVG, JSON manifest', alpha: 'Nên có', scene: 'Chuỗi pose MC; cần manifest và đủ khung idle/welcome/ask/react/celebrate.' },
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

function createPreparationGuide(manifest: Record<string, unknown>, assets: Record<string, string | undefined>) {
  const sourceBySlot = new Map(DEFAULT_SLOT_SOURCES.map((item) => [item.slot, item]));
  const rows = THEME_ASSET_SLOTS.map((slot) => {
    const info = SLOT_GUIDE[slot];
    const path = assets[slot] ?? sourceBySlot.get(slot)?.destination ?? 'Asset dự phòng trong ứng dụng';
    const format = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toUpperCase() : info.formats;
    return '| ' + slot + ' | ' + path + ' | ' + info.size + ' | ' + format + '; chấp nhận ' + info.formats
      + ' | ' + info.alpha + ' | ' + info.scene + ' | [ ] |';
  });
  return [
    '# Chuẩn bị theme: ' + String(manifest.name ?? ''),
    '',
    'Thay ảnh/audio/video trong assets/ hoặc cập nhật đường dẫn tương đối trong theme.json. Mỗi tệp asset tối đa 50 MB. Không đổi bố cục, vị trí hay kích thước khung.',
    '',
    'Ảnh nền phải là một lớp riêng không có chữ/khung UI. Ảnh mẫu dựng sẵn cả giao diện không dùng làm nền.',
    'Chibi và MC phải đủ số khung/dáng như bản mặc định: đủ pose MC trong manifest.json, chibi sảnh và đủ dáng Top 2/Top 3 cho từng nhân vật có thể thắng.',
    '',
    '| Slot | Tệp hiện tại / dự phòng | Kích thước px đang hiển thị | Định dạng | Trong suốt | Màn hình / khung | Đã thay? |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
    'Các khung SVG/CSS, bảng, chữ HUD và vị trí seat được cố định để giữ nguyên hình học. Theme chỉ thay asset, màu, font, âm thanh, MC/chibi và chữ tiêu đề.',
    '',
  ].join('\n');
}

export function createTheme(options: { id: string; name: string; themes: string }) {
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
    writeFileSync(join(stage, 'CAN-CHUAN-BI.md'), createPreparationGuide(parsed, assets), 'utf8');
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
  | { command: 'export-default'; options: { out: string; assets: string; force: boolean } };

function argumentsOf(argv: string[]): ParsedCliArgs {
  const [command, ...args] = argv;
  if (command === 'validate') {
    const directory = args[0];
    if (!directory || args.length !== 1) throw new Error('Cách dùng: pnpm theme:validate <thư-mục-theme>');
    return { command, directory };
  }
  if (command === 'export-default') {
    const options: { out: string; assets: string; force: boolean } = {
      out: resolve('data/themes/default'),
      assets: resolve(process.env.QUIZ_ASSETS_DIR ?? 'assets-local'),
      force: false,
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
  throw new Error('Cách dùng: pnpm theme:validate <thư-mục>, pnpm theme:new <id> --name "<Tên>" hoặc pnpm theme:export-default [--out <dir>] [--assets <dir>] [--force]');
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
      const result = createTheme(parsed);
      console.log('Đã tạo theme “' + parsed.name + '” (' + parsed.id + ') tại ' + result.directory);
      console.log('Danh sách cần chuẩn bị: ' + join(result.directory, 'CAN-CHUAN-BI.md'));
    } else {
      const result = exportDefaultTheme(parsed.options);
      console.log(`Đã xuất theme mặc định: ${result.directory}`);
      for (const warning of result.warnings) console.warn(`Cảnh báo: ${warning}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Không thể thực hiện lệnh theme.');
    process.exitCode = 1;
  }
}
