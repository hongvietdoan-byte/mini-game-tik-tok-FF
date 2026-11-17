import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_DEFAULT_TOKENS, type ThemeAssetSlot } from '@quiz/contracts';
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
  { slot: 'mc.static', source: 'mc/kelly.png', destination: 'assets/mc/kelly.png' },
  { slot: 'mc.sequenceDir', source: 'mc/kelly', destination: 'assets/mc/kelly', directory: true },
  { slot: 'victory.background', source: 'victory/bg.jpg', destination: 'assets/victory/bg.jpg' },
  { slot: 'victory.userCover', source: 'victory/bg-user-cover.jpg', destination: 'assets/victory/bg-user-cover.jpg' },
  { slot: 'victory.trophyStage', source: 'victory/trophy-stage.png', destination: 'assets/victory/trophy-stage.png' },
  ...['question-enter', 'countdown-tick', 'timeout', 'correct-answer', 'top10', 'victory', 'transition', 'bgm-lobby', 'bgm-game', 'bgm']
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

function copyTree(source: string, destination: string, root: string, copied: string[]) {
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error('Không sao chép symlink trong thư mục asset.');
  if (stat.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      const from = join(source, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Không sao chép symlink: ${from.slice(root.length + 1)}`);
      copyTree(from, join(destination, entry.name), root, copied);
    }
  } else if (stat.isFile()) {
    if (stat.size > 50 * 1024 * 1024) throw new Error(`Asset ${source.slice(root.length + 1)} lớn hơn 50 MB.`);
    const extension = extname(source).toLowerCase();
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.webm', '.mp4', '.mp3', '.ogg', '.wav', '.woff2', '.json'];
    if (!allowed.includes(extension)) throw new Error(`Không hỗ trợ asset ${source.slice(root.length + 1)}.`);
    mkdirSync(join(destination, '..'), { recursive: true });
    copyFileSync(source, destination);
    copied.push(source.slice(root.length + 1));
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
  mkdirSync(out, { recursive: true });
  const manifestAssets: Partial<Record<ThemeAssetSlot, string>> = {};
  const warnings: string[] = [];
  const copied: string[] = [];

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
    const destination = join(out, ...item.destination.split('/'));
    if (item.directory) {
      const sourceRoot = source;
      copyTree(source, destination, assetsRoot, copied);
      manifestAssets[item.slot] = item.destination;
      // Prevent an accidentally empty directory from being represented as an asset.
      if (copied.length === 0 && existsSync(sourceRoot)) warnings.push(`${item.slot}: thư mục hiện chưa có tệp.`);
      continue;
    }
    const relativeDestination = item.destination.replace(/\.[^.]+$/u, extname(source));
    const finalDestination = join(out, ...relativeDestination.split('/'));
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
    fonts: [],
    assets: manifestAssets,
  };
  writeFileSync(join(out, 'theme.json'), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8' });
  return { directory: out, manifest, warnings, copied };
}

type ParsedCliArgs =
  | { command: 'validate'; directory: string }
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
  throw new Error('Cách dùng: pnpm theme:validate <thư-mục> hoặc pnpm theme:export-default [--out <dir>] [--assets <dir>] [--force]');
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
