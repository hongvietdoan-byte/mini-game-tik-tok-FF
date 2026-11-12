import { describe, expect, it } from 'vitest';
// @ts-expect-error Dự án tắt allowJs nên TS không nạp JSDoc của .mjs; hàm pure được định kiểu tại đây.
import { checkFiles as untypedCheckFiles, parseExtraPatterns as untypedParseExtraPatterns, readTrackedFiles as untypedReadTrackedFiles } from './privacy-check.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const checkFiles: (files: { path: string; content?: string; sizeBytes?: number; isSymlink?: boolean }[], extraPatterns?: string[]) => string[] = untypedCheckFiles;
const parseExtraPatterns: (environmentValue?: string, localFileContent?: string) => string[] = untypedParseExtraPatterns;
const readTrackedFiles: (root: string, paths: string[], errors?: string[]) => { path: string; content?: string }[] = untypedReadTrackedFiles;

describe('checkFiles', () => {
  it('chặn bảng tính ở mọi nơi và ảnh ngoài các thư mục cho phép', () => {
    const violations = checkFiles([
      { path: 'fixtures/source.xlsx' },
      { path: 'archive/old.xls' },
      { path: String.raw`legacy\old.xls` },
      { path: 'data/export.csv' },
      { path: 'docs/diagram.png' },
      { path: 'apps/dashboard/src/photo.webp' },
      { path: 'apps/dashboard/public/logo.jpeg' },
      { path: 'tests/e2e/__screenshots__/baseline.gif' },
    ]);

    expect(violations).toEqual(expect.arrayContaining([
      'fixtures/source.xlsx: không được theo dõi tệp Excel/CSV',
      'archive/old.xls: không được theo dõi tệp Excel/CSV',
      'legacy/old.xls: không được theo dõi tệp Excel/CSV',
      'data/export.csv: không được theo dõi tệp Excel/CSV',
      'docs/diagram.png: ảnh nằm ngoài thư mục được phép',
      'apps/dashboard/src/photo.webp: ảnh nằm ngoài thư mục được phép',
    ]));
    expect(violations.some((violation) => violation.includes('public/logo.jpeg'))).toBe(false);
    expect(violations.some((violation) => violation.includes('__screenshots__/baseline.gif'))).toBe(false);
  });

  it('chỉ cho ảnh giữ chỗ trong fixtures, với ngoại lệ kích thước nền và manifest chibi', () => {
    expect(checkFiles([
      { path: 'fixtures/assets-placeholder/chibi/chibi-01.png', sizeBytes: 4_096 },
      { path: 'fixtures/assets-placeholder/arena/bg.jpg', sizeBytes: 16_384 },
      { path: 'fixtures/assets-placeholder/chibi/manifest.json', content: '{"ids":["chibi-01"]}' },
      { path: 'fixtures/assets-placeholder/README.md', content: 'ảnh giữ chỗ DEMO' },
    ])).toEqual([]);

    expect(checkFiles([
      { path: 'fixtures/assets-placeholder/arena/bg.jpg', sizeBytes: 16_385 },
    ])).toContain('fixtures/assets-placeholder/arena/bg.jpg: ảnh giữ chỗ vượt quá 16 KB');
    expect(checkFiles([
      { path: 'fixtures/assets-placeholder/chibi/chibi-01.png' },
    ])).toContain('fixtures/assets-placeholder/chibi/chibi-01.png: không xác minh được kích thước ảnh giữ chỗ');
    expect(checkFiles([
      { path: 'fixtures/assets-placeholder/chibi/link.png', sizeBytes: 12, isSymlink: true },
    ])).toContain('fixtures/assets-placeholder/chibi/link.png: ảnh giữ chỗ không được là symlink');
    expect(checkFiles([
      { path: 'fixtures/assets-placeholder-copy/chibi/demo.png', sizeBytes: 12 },
    ])).toContain('fixtures/assets-placeholder-copy/chibi/demo.png: ảnh nằm ngoài thư mục được phép');
    expect(checkFiles([
      { path: 'fixtures/assets-placeholder/extra.bin', sizeBytes: 12 },
    ])).toContain('fixtures/assets-placeholder/extra.bin: chỉ cho ảnh giữ chỗ, manifest chibi và README.md trong thư mục này');
    expect(checkFiles([
      { path: 'fixtures/assets-placeholder/chibi/new-small-image.png', sizeBytes: 12 },
    ])).toContain('fixtures/assets-placeholder/chibi/new-small-image.png: ảnh nằm ngoài thư mục được phép');
  });

  it('xem file tracked đã bị xóa khỏi worktree là vắng mặt, không phải lỗi đọc', () => {
    const root = mkdtempSync(join(tmpdir(), 'quiz-privacy-missing-'));
    const errors: string[] = [];
    try {
      const files = readTrackedFiles(root, ['scripts/deleted-locally.ts'], errors);
      expect(files).toEqual([{ path: 'scripts/deleted-locally.ts' }]);
      expect(errors).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('chặn tên tệp nhạy cảm và thư mục kho chibi', () => {
    const violations = checkFiles([
      { path: 'docs/Ảnh ChatGPT 11_11.png' },
      { path: 'fixtures/Megasheet-notes.md', content: 'nội dung giả' },
      { path: 'assets/Screenshot-approved.png' },
      { path: 'assets/2026-11-11_chibi_kho/preview.png' },
    ]);

    expect(violations).toEqual(expect.arrayContaining([
      'docs/Ảnh ChatGPT 11_11.png: tên tệp có cụm từ bị cấm',
      'fixtures/Megasheet-notes.md: tên tệp có cụm từ bị cấm',
      'assets/Screenshot-approved.png: tên tệp có cụm từ bị cấm',
      'assets/2026-11-11_chibi_kho/preview.png: đường dẫn kho chibi không được commit',
    ]));
  });

  it('đòi phê duyệt cho mọi tệp assets ngoại trừ .gitkeep', () => {
    expect(checkFiles([
      { path: 'assets/.gitkeep' },
      { path: 'assets/new-icon.png' },
    ])).toContain('assets/new-icon.png: chưa có trong assets/ASSET_APPROVALS.json');

    expect(checkFiles([
      { path: 'assets/ASSET_APPROVALS.json', content: JSON.stringify({ approved: ['assets/new-icon.png', 'assets/icons/mark.svg'] }) },
      { path: 'assets/.gitkeep' },
      { path: 'assets/new-icon.png' },
      { path: 'assets/icons/mark.svg' },
    ])).toEqual([]);
  });

  it('phát hiện email, số điện thoại, chuỗi số fixtures và tên sheet nhạy cảm', () => {
    const violations = checkFiles([{
      path: 'fixtures/sensitive.test.ts',
      content: 'email=quiz.tester+private@example.org phone=0912345678 uid=123456789 PLAYERS INFO PlayernameOverwrite List KOL',
    }]);

    expect(violations).toEqual(expect.arrayContaining([
      'fixtures/sensitive.test.ts: chứa địa chỉ email',
      'fixtures/sensitive.test.ts: chứa số điện thoại Việt Nam',
      'fixtures/sensitive.test.ts: chứa chuỗi số dài 9–12 chữ số',
      'fixtures/sensitive.test.ts: chứa tên sheet nhạy cảm',
    ]));
  });

  it('chỉ kiểm tra chuỗi 9–12 chữ số trong fixtures', () => {
    expect(checkFiles([
      { path: 'fixtures/safe.ts', content: 'seed=20261111 and short=12345678' },
      { path: 'apps/server/src/safe.ts', content: 'test-id=123456789' },
    ])).toEqual([]);
  });
  it('gộp pattern từ env và tệp cục bộ, bỏ dòng trống/comment và loại trùng', () => {
    expect(parseExtraPatterns('api-one.invalid; api-two.invalid', '# ghi chú' + String.fromCharCode(10) + 'cdn-one.invalid' + String.fromCharCode(10) + 'api-one.invalid'))
      .toEqual(['api-one.invalid', 'api-two.invalid', 'cdn-one.invalid']);
  });

  it('áp pattern riêng lên file text và không tiết lộ giá trị pattern', () => {
    const pattern = 'fake-private-marker-0077';
    const violations = checkFiles([
      { path: 'docs/review/provider.md', content: 'nội dung có fake-private-marker-0077 để kiểm tra' },
    ], [pattern]);

    expect(violations).toEqual(['docs/review/provider.md: chứa mẫu cấm riêng']);
    expect(violations.join(' ')).not.toContain(pattern);
  });
  it('gộp pattern từ env và tệp cục bộ, bỏ dòng trống/comment và loại trùng', () => {
    const localPatterns = ['# ghi chú', 'cdn-one.invalid', 'api-one.invalid'].join(String.fromCharCode(10));
    expect(parseExtraPatterns('api-one.invalid; api-two.invalid', localPatterns))
      .toEqual(['api-one.invalid', 'api-two.invalid', 'cdn-one.invalid']);
  });

  it('áp pattern riêng lên file text và không tiết lộ giá trị pattern', () => {
    const pattern = 'fake-private-marker-0077';
    const violations = checkFiles([
      { path: 'docs/review/provider.md', content: 'nội dung có fake-private-marker-0077 để kiểm tra' },
    ], [pattern]);

    expect(violations).toEqual(['docs/review/provider.md: chứa mẫu cấm riêng']);
    expect(violations.join(' ')).not.toContain(pattern);
  });
});
