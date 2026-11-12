import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFICE_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.env', '.html', '.htm', '.js', '.json', '.md', '.mdx', '.mjs', '.ps1', '.scss', '.sh',
  '.sql', '.svg', '.toml', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml',
]);
const SENSITIVE_SHEET_NAMES = [
  /PLAYERS INFO/i,
  /PlayernameOverwrite/i,
  /List KOL/i,
];
const ASSET_APPROVALS_PATH = 'assets/ASSET_APPROVALS.json';
const LOCAL_EXTRA_PATTERNS_PATH = 'assets-local/privacy-patterns.txt';
const PLACEHOLDER_ASSET_PREFIX = 'fixtures/assets-placeholder/';
const MAX_PLACEHOLDER_IMAGE_BYTES = 4 * 1024;
const MAX_PLACEHOLDER_BACKGROUND_BYTES = 16 * 1024;
const PLACEHOLDER_IMAGE_PATHS = new Set([
  'fixtures/assets-placeholder/brand/logo.png',
  'fixtures/assets-placeholder/chibi/chibi-01.png',
  'fixtures/assets-placeholder/chibi/chibi-02.png',
  'fixtures/assets-placeholder/chibi/chibi-03.png',
  'fixtures/assets-placeholder/chibi/chibi-04.png',
  'fixtures/assets-placeholder/chibi/chibi-05.png',
  'fixtures/assets-placeholder/chibi/chibi-06.png',
  'fixtures/assets-placeholder/chibi/chibi-07.png',
  'fixtures/assets-placeholder/chibi/chibi-08.png',
  'fixtures/assets-placeholder/chibi/chibi-09.png',
  'fixtures/assets-placeholder/chibi/chibi-10.png',
  'fixtures/assets-placeholder/chibi/chibi-11.png',
  'fixtures/assets-placeholder/chibi/chibi-12.png',
  'fixtures/assets-placeholder/chibi/chibi-002-a124.png',
  'fixtures/assets-placeholder/chibi/chibi-004-alvaro.png',
  'fixtures/assets-placeholder/chibi/chibi-005-andrew.png',
  'fixtures/assets-placeholder/chibi/chibi-006-antonio.png',
  'fixtures/assets-placeholder/chibi/chibi-007-caroline.png',
  'fixtures/assets-placeholder/chibi/chibi-008-clu.png',
  'fixtures/assets-placeholder/chibi/chibi-009-d-bee.png',
  'fixtures/assets-placeholder/chibi/chibi-010-dasha.png',
  'fixtures/assets-placeholder/chibi/chibi-011-dimitri.png',
  'fixtures/assets-placeholder/chibi/chibi-012-ford.png',
  'fixtures/assets-placeholder/chibi/chibi-013-hayato.png',
  'fixtures/assets-placeholder/chibi/chibi-014-homer.png',
  'fixtures/assets-placeholder/chibi/chibi-015-ignis.png',
  'fixtures/assets-placeholder/chibi/chibi-016-iris.png',
  'fixtures/assets-placeholder/chibi/chibi-017-joseph.png',
  'fixtures/assets-placeholder/chibi/chibi-018-jota.png',
  'fixtures/assets-placeholder/chibi/chibi-019-k.png',
  'fixtures/assets-placeholder/chibi/chibi-020-kairos.png',
  'fixtures/assets-placeholder/chibi/chibi-021-kapella.png',
  'fixtures/assets-placeholder/chibi/chibi-022-kassie.png',
  'fixtures/assets-placeholder/mc/kelly.png',
  'fixtures/assets-placeholder/arena/bg.jpg',
  'fixtures/assets-placeholder/arena/bg-question-user.jpg',
  'fixtures/assets-placeholder/victory/bg.jpg',
  'fixtures/assets-placeholder/victory/bg-user-cover.jpg',
  'fixtures/assets-placeholder/victory/trophy-stage.png',
].map((path) => path.toLowerCase()));

/** @typedef {{ path: string; content?: string; sizeBytes?: number; isSymlink?: boolean }} PrivacyFile */

function normalizePath(path) {
  return String(path).replaceAll('\\', '/').replace(/^\.\//, '');
}

function lowerPath(path) {
  return normalizePath(path).toLowerCase();
}

/** Chấp nhận danh sách phân tách bằng dòng mới, dấu phẩy hoặc chấm phẩy; bỏ dòng trống và comment. */
export function parseExtraPatterns(environmentValue = '', localFileContent = '') {
  const values = [environmentValue, localFileContent];
  return [...new Set(values
    .flatMap((value) => String(value ?? '').split(/[\r\n;,]+/))
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern && !pattern.startsWith('#')))];
}

function readLocalExtraPatterns(repositoryRoot) {
  const localPath = resolve(repositoryRoot, LOCAL_EXTRA_PATTERNS_PATH);
  try {
    const info = lstatSync(localPath);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error('Tệp pattern cục bộ không hợp lệ.');
    return readFileSync(localPath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return '';
    throw new Error('Không thể đọc tệp pattern quyền riêng tư cục bộ.');
  }
}

function isTextFile(path) {
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase());
}

function isTextScanPath(path) {
  const normalized = lowerPath(path);
  return /^(fixtures|apps|packages)\//.test(normalized) && isTextFile(normalized);
}

function isAllowedImagePath(path) {
  const normalized = lowerPath(path);
  return normalized.startsWith('assets/')
    || /^apps\/[^/]+\/public\//.test(normalized)
    || normalized.startsWith('tests/e2e/__screenshots__/')
    || PLACEHOLDER_IMAGE_PATHS.has(normalized);
}

function approvedAssetPaths(files) {
  const manifest = files.find((file) => lowerPath(file.path) === ASSET_APPROVALS_PATH.toLowerCase());
  if (typeof manifest?.content !== 'string') return { paths: new Set(), error: null };

  try {
    const parsed = JSON.parse(manifest.content);
    let entries = [];
    if (Array.isArray(parsed)) entries = parsed;
    else if (Array.isArray(parsed?.approved)) entries = parsed.approved;
    else if (Array.isArray(parsed?.approvedAssets)) entries = parsed.approvedAssets;
    else if (parsed && typeof parsed === 'object') {
      entries = Object.entries(parsed).filter(([, approved]) => approved === true).map(([path]) => path);
    }
    return {
      paths: new Set(entries.filter((path) => typeof path === 'string').map((path) => lowerPath(path))),
      error: null,
    };
  } catch {
    return { paths: new Set(), error: `${ASSET_APPROVALS_PATH}: JSON không hợp lệ` };
  }
}

/**
 * Kiểm tra đường dẫn và nội dung đã cung cấp mà không đọc tệp hay truy cập hệ thống.
 * @param {PrivacyFile[]} files
 * @returns {string[]}
 */
export function checkFiles(files, extraPatterns = []) {
  const normalizedFiles = files.map((file) => ({ ...file, path: normalizePath(file.path) }));
  const { paths: approvedAssets, error: manifestError } = approvedAssetPaths(normalizedFiles);
  const violations = [];
  if (manifestError) violations.push(manifestError);

  for (const file of normalizedFiles) {
    const path = file.path;
    const normalized = lowerPath(path);
    const ext = extname(normalized);

    if (OFFICE_EXTENSIONS.has(ext)) violations.push(`${path}: không được theo dõi tệp Excel/CSV`);

    const paddedPath = `/${normalized}/`;
    if (paddedPath.includes('/2026-11-11_chibi_kho/')) {
      violations.push(`${path}: đường dẫn kho chibi không được commit`);
    }

    const fileName = basename(normalized);
    if (['ảnh chatgpt', 'megasheet', 'screenshot'].some((term) => fileName.includes(term))) {
      violations.push(`${path}: tên tệp có cụm từ bị cấm`);
    }

    if (IMAGE_EXTENSIONS.has(ext) && !isAllowedImagePath(path)) {
      violations.push(`${path}: ảnh nằm ngoài thư mục được phép`);
    }

    if (normalized.startsWith(PLACEHOLDER_ASSET_PREFIX)) {
      const isPlaceholderImage = IMAGE_EXTENSIONS.has(ext);
      const isPlaceholderReadme = normalized === `${PLACEHOLDER_ASSET_PREFIX}readme.md`;
      const isPlaceholderManifest = normalized === `${PLACEHOLDER_ASSET_PREFIX}chibi/manifest.json`;
      if (!isPlaceholderImage && !isPlaceholderReadme && !isPlaceholderManifest) {
        violations.push(`${path}: chỉ cho ảnh giữ chỗ, manifest chibi và README.md trong thư mục này`);
      }
      if (isPlaceholderImage && file.isSymlink) violations.push(`${path}: ảnh giữ chỗ không được là symlink`);
      if (isPlaceholderImage) {
        if (!Number.isInteger(file.sizeBytes) || file.sizeBytes < 0) {
          violations.push(`${path}: không xác minh được kích thước ảnh giữ chỗ`);
        } else {
          const isFullSizeBackground = normalized.startsWith(`${PLACEHOLDER_ASSET_PREFIX}arena/`)
            || normalized === `${PLACEHOLDER_ASSET_PREFIX}victory/bg-user-cover.jpg`;
          const maxBytes = isFullSizeBackground
            ? MAX_PLACEHOLDER_BACKGROUND_BYTES
            : MAX_PLACEHOLDER_IMAGE_BYTES;
          if (file.sizeBytes > maxBytes) {
            violations.push(`${path}: ảnh giữ chỗ vượt quá ${Math.round(maxBytes / 1024)} KB`);
          }
        }
      }
    }

    if (normalized.startsWith('assets/') && normalized !== ASSET_APPROVALS_PATH.toLowerCase() && basename(normalized) !== '.gitkeep') {
      if (!approvedAssets.has(normalized)) {
        violations.push(`${path}: chưa có trong ${ASSET_APPROVALS_PATH}`);
      }
    }

    if (typeof file.content !== 'string') continue;
    const lowerContent = file.content.toLowerCase();
    if (extraPatterns.some((pattern) => lowerContent.includes(String(pattern).toLowerCase())))
      violations.push(path + ': chứa mẫu cấm riêng');
    if (!isTextScanPath(path)) continue;
    if (/[\w.+-]+@[\w-]+\.[\w.]+/g.test(file.content)) violations.push(`${path}: chứa địa chỉ email`);
    if (/(?:\+84|0)(?:3|5|7|8|9)\d{8}/g.test(file.content)) violations.push(`${path}: chứa số điện thoại Việt Nam`);
    if (normalized.startsWith('fixtures/') && /\d{9,12}/g.test(file.content)) {
      violations.push(`${path}: chứa chuỗi số dài 9–12 chữ số`);
    }
    if (SENSITIVE_SHEET_NAMES.some((pattern) => pattern.test(file.content))) {
      violations.push(`${path}: chứa tên sheet nhạy cảm`);
    }
  }

  return [...new Set(violations)];
}

function getRepositoryRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
}

function getTrackedPaths(repositoryRoot) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: repositoryRoot, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function readTrackedTextFile(repositoryRoot, path) {
  const absolutePath = resolve(repositoryRoot, path);
  if (lstatSync(absolutePath).isSymbolicLink()) {
    throw new Error(`${path}: từ chối đọc symlink thay cho tệp text đã theo dõi`);
  }
  return readFileSync(absolutePath, 'utf8');
}

/** Đọc metadata/content của file được Git theo dõi; file bị xóa cục bộ được xem như đã vắng mặt. */
export function readTrackedFiles(repositoryRoot, trackedPaths, readErrors = []) {
  return trackedPaths.map((path) => {
    const isApprovalManifest = lowerPath(path) === ASSET_APPROVALS_PATH.toLowerCase();
    let metadata;
    try {
      const info = lstatSync(resolve(repositoryRoot, path));
      metadata = { sizeBytes: info.size, isSymlink: info.isSymbolicLink() };
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
        readErrors.push(`${path}: không thể đọc metadata tệp đã theo dõi`);
      }
      return { path };
    }
    if (lowerPath(path).startsWith(PLACEHOLDER_ASSET_PREFIX) && metadata.isSymlink) {
      return { path, ...metadata };
    }
    if (!isApprovalManifest && !isTextFile(path)) return { path, ...metadata };
    try {
      return { path, ...metadata, content: readTrackedTextFile(repositoryRoot, path) };
    } catch {
      readErrors.push(`${path}: không thể đọc tệp text đã theo dõi`);
      return { path, ...metadata };
    }
  });
}

function runCli() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const unknownArgs = args.filter((arg) => arg !== '--json');
  if (unknownArgs.length > 0) {
    console.error('Cách dùng: node scripts/privacy-check.mjs [--json]');
    process.exitCode = 2;
    return;
  }

  let repositoryRoot;
  let trackedPaths;
  try {
    repositoryRoot = getRepositoryRoot();
    trackedPaths = getTrackedPaths(repositoryRoot);
  } catch {
    console.error('Không thể xác định thư mục Git hoặc danh sách tệp đã theo dõi.');
    process.exitCode = 2;
    return;
  }

  const readErrors = [];
  let extraPatterns = parseExtraPatterns(process.env.PRIVACY_EXTRA_PATTERNS ?? '');
  try {
    extraPatterns = parseExtraPatterns(process.env.PRIVACY_EXTRA_PATTERNS ?? '', readLocalExtraPatterns(repositoryRoot));
  } catch {
    readErrors.push(LOCAL_EXTRA_PATTERNS_PATH + ': không thể đọc tệp pattern cục bộ');
  }
  const files = readTrackedFiles(repositoryRoot, trackedPaths, readErrors);
  const violations = [...checkFiles(files, extraPatterns), ...readErrors];
  const uniqueViolations = [...new Set(violations)];

  if (json) {
    console.log(JSON.stringify({ ok: uniqueViolations.length === 0, trackedFiles: trackedPaths.length, violations: uniqueViolations }, null, 2));
  } else if (uniqueViolations.length === 0) {
    console.log(`Kiểm tra quyền riêng tư: PASS (${trackedPaths.length} tệp đã theo dõi).`);
  } else {
    console.error(`Kiểm tra quyền riêng tư: FAIL (${uniqueViolations.length} vi phạm).`);
    for (const violation of uniqueViolations) console.error(`- ${violation}`);
  }

  if (uniqueViolations.length > 0) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  runCli();
}
