/**
 * Dựng thư mục app cho Electron: apps/desktop/build/app
 *   main.mjs (esbuild: server + engine + fixtures), preload.cjs, migrations/, web/{dashboard,overlay}/,
 *   node_modules/{better-sqlite3 (bản dựng sẵn cho ABI Electron), bindings, file-uri-to-path}
 * Không đụng node_modules dùng chung của repo (test vẫn chạy với better-sqlite3 bản Node).
 */
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const DESKTOP = resolve(here, '..');
const ROOT = resolve(DESKTOP, '..', '..');
const OUT = join(DESKTOP, 'build', 'app');
const CACHE = join(DESKTOP, 'build', 'cache');
const require = createRequire(join(DESKTOP, 'package.json'));

const electronPkg = JSON.parse(readFileSync(require.resolve('electron/package.json'), 'utf8'));
const electronDir = dirname(require.resolve('electron/package.json'));
const abi = readFileSync(join(electronDir, 'abi_version'), 'utf8').trim();
const sqliteDir = dirname(require.resolve('better-sqlite3/package.json'));
const sqlitePkg = JSON.parse(readFileSync(join(sqliteDir, 'package.json'), 'utf8'));

const step = (m) => console.log(`[bundle] ${m}`);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(CACHE, { recursive: true });

// 1. Web (dashboard + overlay) bản build với base /dashboard/ và /overlay/
step('vite build dashboard + overlay');
// Gọi vite.js bằng node (không qua shell — đường dẫn repo có khoảng trắng)
const viteBin = join(dirname(createRequire(join(ROOT, 'apps', 'overlay', 'package.json')).resolve('vite/package.json')), 'bin', 'vite.js');
for (const [name, base] of [['dashboard', '/dashboard/'], ['overlay', '/overlay/']]) {
  execFileSync(process.execPath, [viteBin, 'build', join(ROOT, 'apps', name), '--base', base, '--outDir', join(OUT, 'web', name), '--emptyOutDir'], {
    stdio: 'inherit',
  });
}

// 2. Tiến trình chính (ESM) — giữ ngoài: electron, better-sqlite3 (native)
step('esbuild main.mjs');
await build({
  entryPoints: [join(DESKTOP, 'src', 'main.ts')],
  outfile: join(OUT, 'main.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['electron', 'better-sqlite3'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  sourcemap: false,
  logLevel: 'warning',
});
cpSync(join(DESKTOP, 'src', 'preload.cjs'), join(OUT, 'preload.cjs'));
cpSync(join(ROOT, 'packages', 'persistence', 'migrations'), join(OUT, 'migrations'), { recursive: true });

// 3. better-sqlite3 cho Electron: chép package + tải bản dựng sẵn đúng ABI (không biên dịch)
step(`better-sqlite3 ${sqlitePkg.version} cho Electron ${electronPkg.version} (ABI ${abi})`);
const nm = join(OUT, 'node_modules');
// Chép một package, bỏ node_modules lồng BÊN TRONG package (đường dẫn nguồn của pnpm vốn đã nằm trong node_modules)
// (lọc khi chép thay vì xoá sau: file trong kho pnpm có thể chỉ-đọc → EPERM)
const copyPkg = (from, name, skipTop = []) =>
  cpSync(from, join(nm, name), {
    recursive: true,
    dereference: true,
    filter: (p) => {
      const parts = relative(from, p).split(sep);
      return !parts.includes('node_modules') && !skipTop.includes(parts[0]);
    },
  });
// bỏ build/ (bản Node), deps/ + src/ (mã C — không cần khi đã có bản dựng sẵn)
copyPkg(sqliteDir, 'better-sqlite3', ['build', 'deps', 'src']);
const reqSqlite = createRequire(join(sqliteDir, 'package.json'));
const bindingsDir = dirname(reqSqlite.resolve('bindings/package.json'));
copyPkg(bindingsDir, 'bindings');
const reqBindings = createRequire(join(bindingsDir, 'package.json'));
copyPkg(dirname(reqBindings.resolve('file-uri-to-path/package.json')), 'file-uri-to-path');

const tarName = `better-sqlite3-v${sqlitePkg.version}-electron-v${abi}-win32-x64.tar.gz`;
const tarPath = join(CACHE, tarName);
if (!existsSync(tarPath)) {
  const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${sqlitePkg.version}/${tarName}`;
  step(`tải ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được bản dựng sẵn (${res.status}). Electron ABI ${abi} có thể chưa được better-sqlite3 hỗ trợ.`);
  await pipeline(res.body, createWriteStream(tarPath));
}
// tar.exe của Windows (GNU tar trong Git Bash hiểu nhầm "E:" là máy từ xa)
const tarBin = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tarBin, ['-xzf', tarPath, '-C', join(nm, 'better-sqlite3')], { stdio: 'inherit' });
if (!existsSync(join(nm, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'))) throw new Error('Thiếu better_sqlite3.node sau khi giải nén');
// File chép từ kho pnpm giữ thuộc tính chỉ-đọc → bỏ để lần dựng sau xoá được
const makeWritable = (dir) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    chmodSync(p, 0o666 | (statSync(p).isDirectory() ? 0o111 : 0));
    if (statSync(p).isDirectory()) makeWritable(p);
  }
};
makeWritable(nm);

// 4. package.json của app
writeFileSync(
  join(OUT, 'package.json'),
  JSON.stringify(
    {
      name: 'storm-arena-live-quiz',
      productName: 'Storm Arena LIVE Quiz',
      version: JSON.parse(readFileSync(join(DESKTOP, 'package.json'), 'utf8')).version,
      description: 'Storm Arena LIVE Quiz',
      main: 'main.mjs',
      type: 'module',
      dependencies: { 'better-sqlite3': sqlitePkg.version },
    },
    null,
    2,
  ),
);
step(`xong → ${OUT}`);
