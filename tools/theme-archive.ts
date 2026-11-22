import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { MAX_THEME_FILE_BYTES, THEME_ALLOWED_EXTENSIONS } from '@quiz/contracts';
import { ThemeStore } from '../apps/server/src/theme-store';

const MAX_THEME_ARCHIVE_BYTES = 512 * 1024 * 1024;
const REQUIRED_FILES = ['theme.json', 'CAN-CHUAN-BI.md', 'SO-DO.png'];
const EXTRA_ROOT_FILES = new Set(REQUIRED_FILES);
const ASSET_JSON = /^assets\/.+\.json$/iu;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipPath(value: string, directory = false) {
  const normalized = directory ? value.slice(0, -1) : value;
  if (!normalized || normalized.startsWith('/') || normalized.includes('\\') || normalized.includes('\0')
    || /^[a-z]:/iu.test(normalized) || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new Error(`Đường dẫn trong ZIP không an toàn: ${value}`);
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..'))
    throw new Error(`Đường dẫn trong ZIP không an toàn: ${value}`);
  return normalized;
}

function allowedThemeFile(path: string) {
  if (EXTRA_ROOT_FILES.has(path)) return true;
  const extension = extname(path).toLowerCase();
  return (path.startsWith('assets/') && (ASSET_JSON.test(path) || (THEME_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)))
    || (path.startsWith('fonts/') && extension === '.woff2');
}

export type ThemeArchiveEntry = { path: string; data: Buffer };

/** Tạo ZIP32 UTF-8 với DEFLATE; không đưa thư mục cha hoặc file ngoài theme vào gói. */
export function createThemeZip(entries: readonly ThemeArchiveEntry[]) {
  if (entries.length > 5_000) throw new Error('Gói theme vượt quá 5.000 tệp.');
  const seen = new Set<string>();
  let total = 0;
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  for (const entry of [...entries].sort((left, right) => left.path.localeCompare(right.path))) {
    const path = zipPath(entry.path);
    if (!allowedThemeFile(path)) throw new Error(`Không đóng gói định dạng hoặc đường dẫn không được hỗ trợ: ${path}`);
    const key = path.toLocaleLowerCase('en-US');
    if (seen.has(key)) throw new Error(`Gói có tên tệp trùng: ${path}`);
    seen.add(key);
    if (entry.data.byteLength > MAX_THEME_FILE_BYTES) throw new Error(`${path}: tệp vượt quá 50 MB.`);
    total += entry.data.byteLength;
    if (total > MAX_THEME_ARCHIVE_BYTES) throw new Error('Tổng dung lượng theme vượt quá 512 MB.');
    const name = Buffer.from(path, 'utf8');
    if (name.byteLength > 240) throw new Error(`Đường dẫn quá dài trong ZIP: ${path}`);
    const compressed = deflateRawSync(entry.data, { level: 6 });
    if (compressed.byteLength >= 0xffffffff || entry.data.byteLength >= 0xffffffff || localOffset >= 0xffffffff)
      throw new Error('ZIP64 không được hỗ trợ; gói theme vượt giới hạn ZIP32.');
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.byteLength, 18);
    local.writeUInt32LE(entry.data.byteLength, 22);
    local.writeUInt16LE(name.byteLength, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.byteLength, 20);
    central.writeUInt32LE(entry.data.byteLength, 24);
    central.writeUInt16LE(name.byteLength, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0x81a40000, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.byteLength + name.byteLength + compressed.byteLength;
  }
  if (entries.length === 0) throw new Error('Không có tệp nào để đóng gói.');
  const centralDirectory = Buffer.concat(centralParts);
  const centralStart = localOffset;
  if (centralStart + centralDirectory.byteLength + 22 > MAX_THEME_ARCHIVE_BYTES)
    throw new Error('Gói theme nén vượt quá 512 MB.');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.byteLength, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function readU32(data: Buffer, offset: number) {
  if (offset < 0 || offset + 4 > data.byteLength) throw new Error('Gói ZIP bị cắt hoặc hỏng.');
  return data.readUInt32LE(offset);
}

/** Đọc ZIP32 an toàn: chặn traversal, symlink, ZIP bomb, trùng tên và CRC sai. */
export function readThemeZip(data: Buffer): ThemeArchiveEntry[] {
  if (data.byteLength > MAX_THEME_ARCHIVE_BYTES) throw new Error('Tệp ZIP vượt quá 512 MB.');
  const searchStart = Math.max(0, data.byteLength - 65_557);
  let endOffset = -1;
  for (let offset = data.byteLength - 22; offset >= searchStart; offset -= 1) {
    if (data.readUInt32LE(offset) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error('Không tìm thấy phần kết thúc ZIP.');
  const disk = data.readUInt16LE(endOffset + 4);
  const centralDisk = data.readUInt16LE(endOffset + 6);
  const diskCount = data.readUInt16LE(endOffset + 8);
  const count = data.readUInt16LE(endOffset + 10);
  const centralSize = readU32(data, endOffset + 12);
  const centralStart = readU32(data, endOffset + 16);
  const commentLength = data.readUInt16LE(endOffset + 20);
  if (disk !== 0 || centralDisk !== 0 || diskCount !== count || count === 0xffff
    || endOffset + 22 + commentLength !== data.byteLength || centralStart + centralSize !== endOffset)
    throw new Error('ZIP nhiều phần, ZIP64 hoặc cấu trúc ZIP không hợp lệ.');
  if (count > 5_000) throw new Error('Gói theme vượt quá 5.000 tệp.');

  let offset = centralStart;
  let total = 0;
  const seen = new Set<string>();
  const entries: ThemeArchiveEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (readU32(data, offset) !== 0x02014b50 || offset + 46 > endOffset)
      throw new Error('Danh mục ZIP bị hỏng.');
    const flags = data.readUInt16LE(offset + 8);
    const method = data.readUInt16LE(offset + 10);
    const expectedCrc = readU32(data, offset + 16);
    const compressedSize = readU32(data, offset + 20);
    const size = readU32(data, offset + 24);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentBytes = data.readUInt16LE(offset + 32);
    const diskStart = data.readUInt16LE(offset + 34);
    const externalAttributes = readU32(data, offset + 38);
    const localOffset = readU32(data, offset + 42);
    const next = offset + 46 + nameLength + extraLength + commentBytes;
    if (next > endOffset || diskStart !== 0 || size === 0xffffffff || compressedSize === 0xffffffff
      || localOffset === 0xffffffff || flags & 1 || (method !== 0 && method !== 8) || size > MAX_THEME_FILE_BYTES)
      throw new Error('ZIP có mục mã hóa, ZIP64 hoặc kích thước/định dạng không được hỗ trợ.');
    const nameBytes = data.subarray(offset + 46, offset + 46 + nameLength);
    const rawName = nameBytes.toString('utf8');
    if (!Buffer.from(rawName, 'utf8').equals(nameBytes)) throw new Error('Tên tệp ZIP không phải UTF-8 hợp lệ.');
    const directory = rawName.endsWith('/');
    const path = zipPath(rawName, directory);
    const unixMode = externalAttributes >>> 16;
    if ((unixMode & 0o170000) === 0o120000) throw new Error(`Không nhận symlink trong ZIP: ${path}`);
    if (directory) {
      if (size !== 0 || compressedSize !== 0) throw new Error(`Mục thư mục ZIP có dữ liệu: ${path}`);
      offset = next;
      continue;
    }
    if (!allowedThemeFile(path)) throw new Error(`Tệp không được phép trong gói theme: ${path}`);
    const key = path.toLocaleLowerCase('en-US');
    if (seen.has(key)) throw new Error(`Gói có tên tệp trùng: ${path}`);
    seen.add(key);
    total += size;
    if (total > MAX_THEME_ARCHIVE_BYTES) throw new Error('Tổng dung lượng theme vượt quá 512 MB.');

    if (readU32(data, localOffset) !== 0x04034b50 || localOffset + 30 > centralStart)
      throw new Error(`Header cục bộ ZIP bị hỏng: ${path}`);
    const localFlags = data.readUInt16LE(localOffset + 6);
    const localMethod = data.readUInt16LE(localOffset + 8);
    const localNameLength = data.readUInt16LE(localOffset + 26);
    const localExtraLength = data.readUInt16LE(localOffset + 28);
    const localNameAt = localOffset + 30;
    const contentAt = localNameAt + localNameLength + localExtraLength;
    const contentEnd = contentAt + compressedSize;
    if (localFlags !== flags || localMethod !== method || localNameAt + localNameLength > centralStart
      || data.subarray(localNameAt, localNameAt + localNameLength).toString('utf8') !== rawName || contentEnd > centralStart)
      throw new Error(`Dữ liệu ZIP không khớp danh mục: ${path}`);
    const compressed = data.subarray(contentAt, contentEnd);
    let content: Buffer;
    try {
      content = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: MAX_THEME_FILE_BYTES });
    } catch { throw new Error(`Không giải nén được tệp theme: ${path}`); }
    if (content.byteLength !== size || crc32(content) !== expectedCrc)
      throw new Error(`Checksum hoặc kích thước không khớp: ${path}`);
    entries.push({ path, data: content });
    offset = next;
  }
  if (offset !== endOffset) throw new Error('Danh mục ZIP có dữ liệu thừa hoặc bị cắt.');
  if (!REQUIRED_FILES.every((path) => seen.has(path.toLocaleLowerCase('en-US'))))
    throw new Error('Gói cần có theme.json, CAN-CHUAN-BI.md và SO-DO.png ở thư mục gốc.');
  return entries;
}

function collectThemeFiles(directory: string): ThemeArchiveEntry[] {
  const root = resolve(directory);
  const rootStat = lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('Đường dẫn theme phải là thư mục thường.');
  const files: ThemeArchiveEntry[] = [];
  const walk = (current: string) => {
    for (const item of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, item.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error(`Không đóng gói symlink: ${relative(root, absolute)}`);
      if (stat.isDirectory()) walk(absolute);
      else if (stat.isFile()) {
        const path = relative(root, absolute).split(sep).join('/');
        if (!allowedThemeFile(path)) throw new Error(`Tệp không được phép trong gói theme: ${path}`);
        files.push({ path, data: readFileSync(absolute) });
      } else throw new Error(`Không đóng gói loại tệp này: ${relative(root, absolute)}`);
    }
  };
  walk(root);
  for (const path of REQUIRED_FILES) if (!files.some((file) => file.path === path)) throw new Error(`Thiếu ${path}.`);
  return files;
}

export function packTheme(options: { directory: string; out: string }) {
  const directory = resolve(options.directory);
  const validation = ThemeStore.validateDirectory(directory);
  if (!validation.success) throw new Error(`Theme không hợp lệ: ${validation.error}`);
  const archive = createThemeZip(collectThemeFiles(directory));
  const out = resolve(options.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, archive, { flag: 'wx' });
  return { file: out, bytes: archive.byteLength, id: validation.manifest.id };
}

function safeExtractFile(root: string, path: string, data: Buffer) {
  const target = resolve(root, ...path.split('/'));
  const relativePath = relative(root, target);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || resolve(root) === target)
    throw new Error(`Đường dẫn trong ZIP không an toàn: ${path}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data, { flag: 'wx', mode: 0o600 });
}

export function importThemeArchive(options: { file: string; themes: string }) {
  const archivePath = resolve(options.file);
  let archive: Buffer;
  try { archive = readFileSync(archivePath); }
  catch { throw new Error('Không đọc được tệp ZIP theme đã chọn.'); }
  const entries = readThemeZip(archive);
  let manifest: { id?: unknown };
  try { manifest = JSON.parse(entries.find((entry) => entry.path === 'theme.json')!.data.toString('utf8')) as { id?: unknown }; }
  catch { throw new Error('theme.json không phải JSON hợp lệ.'); }
  if (typeof manifest.id !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u.test(manifest.id))
    throw new Error('Id trong theme.json không hợp lệ.');
  const temporaryParent = mkdtempSync(join(tmpdir(), 'quiz-theme-import-'));
  const temporaryRoot = join(temporaryParent, manifest.id);
  mkdirSync(temporaryRoot);
  let themesStage: string | null = null;
  try {
    for (const entry of entries) safeExtractFile(temporaryRoot, entry.path, entry.data);
    const validation = ThemeStore.validateDirectory(temporaryRoot);
    if (!validation.success) throw new Error(`Theme không hợp lệ: ${validation.error}`);
    const themes = resolve(options.themes);
    const target = join(themes, manifest.id);
    if (existsSync(target)) throw new Error(`Theme “${manifest.id}” đã tồn tại; không ghi đè.`);

    mkdirSync(themes, { recursive: true });
    themesStage = mkdtempSync(join(themes, `.${manifest.id}.tmp-`));
    const copy = (source: string, destination: string) => {
      for (const entry of readdirSync(source, { withFileTypes: true })) {
        const from = join(source, entry.name);
        const to = join(destination, entry.name);
        if (entry.isDirectory()) { mkdirSync(to, { recursive: true }); copy(from, to); }
        else copyFileSync(from, to);
      }
    };
    copy(temporaryRoot, themesStage);
    if (existsSync(target)) throw new Error(`Theme “${manifest.id}” đã tồn tại; không ghi đè.`);
    renameSync(themesStage, target);
    themesStage = null;
    return { directory: target, id: manifest.id, name: validation.manifest.name };
  } finally {
    rmSync(temporaryParent, { recursive: true, force: true });
    if (themesStage) rmSync(themesStage, { recursive: true, force: true });
  }
}
