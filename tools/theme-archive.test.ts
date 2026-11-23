import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createThemeZip, importThemeArchive, packTheme, readThemeZip } from './theme-archive';

const roots: string[] = [];
function temp() {
  const root = mkdtempSync(join(tmpdir(), 'quiz-theme-archive-'));
  roots.push(root);
  return root;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function writeTheme(directory: string, id = 'tet-2027', manifest = { schemaVersion: 1, id, name: 'Tết 2027', tokens: {}, fonts: [], assets: {} }) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'theme.json'), JSON.stringify(manifest));
  writeFileSync(join(directory, 'CAN-CHUAN-BI.md'), '# Chuẩn bị theme');
  writeFileSync(join(directory, 'SO-DO.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

describe('theme ZIP CLI', () => {
  it('đóng gói/đọc ZIP32 UTF-8 và nhập nguyên bộ theme hợp lệ', () => {
    const root = temp();
    const source = join(root, 'tet-2027');
    const themes = join(root, 'themes');
    writeTheme(source);
    mkdirSync(join(source, 'assets', 'brand'), { recursive: true });
    writeFileSync(join(source, 'assets', 'brand', 'logo.png'), Buffer.from('placeholder'));
    const archiveFile = join(root, 'tet-2027.zip');
    const packed = packTheme({ directory: source, out: archiveFile });
    expect(packed.id).toBe('tet-2027');
    const entries = readThemeZip(readFileSync(archiveFile));
    expect(entries.map((entry) => entry.path)).toEqual(expect.arrayContaining(['theme.json', 'CAN-CHUAN-BI.md', 'SO-DO.png', 'assets/brand/logo.png']));
    const imported = importThemeArchive({ file: archiveFile, themes });
    expect(imported).toMatchObject({ id: 'tet-2027', name: 'Tết 2027' });
    expect(readFileSync(join(themes, 'tet-2027', 'assets', 'brand', 'logo.png'), 'utf8')).toBe('placeholder');
    expect(existsSync(join(themes, 'tet-2027', 'SO-DO.png'))).toBe(true);
  });

  it('không chép gói có manifest sai vào kho theme', () => {
    const root = temp();
    const themes = join(root, 'themes');
    const archiveFile = join(root, 'broken.zip');
    const zip = createThemeZip([
      { path: 'theme.json', data: Buffer.from(JSON.stringify({ schemaVersion: 1, id: 'khong hop le', name: 'Lỗi', tokens: {}, fonts: [], assets: {} })) },
      { path: 'CAN-CHUAN-BI.md', data: Buffer.from('# Hướng dẫn') },
      { path: 'SO-DO.png', data: Buffer.from('ảnh') },
    ]);
    writeFileSync(archiveFile, zip);
    expect(() => importThemeArchive({ file: archiveFile, themes })).toThrow(/Id trong theme.json không hợp lệ/u);
    expect(existsSync(join(themes, 'khong hop le'))).toBe(false);
  });

  it('từ chối ZIP có checksum sai trước khi giải nén', () => {
    const valid = createThemeZip([
      { path: 'theme.json', data: Buffer.from('{}') },
      { path: 'CAN-CHUAN-BI.md', data: Buffer.from('# Hướng dẫn') },
      { path: 'SO-DO.png', data: Buffer.from('sơ đồ') },
    ]);
    const corrupted = Buffer.from(valid);
    const centralEntry = corrupted.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    expect(centralEntry).toBeGreaterThanOrEqual(0);
    const crcOffset = centralEntry + 16;
    corrupted.writeUInt32LE((corrupted.readUInt32LE(crcOffset) ^ 0xff) >>> 0, crcOffset);
    expect(() => readThemeZip(corrupted)).toThrow(/Checksum hoặc kích thước/u);
  });
});
