import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export type PreflightAssetResult = { status: 'PASS' | 'FAIL'; reason: string };

function isInside(parent: string, child: string) {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/** Xác nhận assets-local là asset cục bộ thật, không phải fixture giữ chỗ trong repo. */
export function preflightAssets(assetRoot: string | undefined, repositoryRoot: string): PreflightAssetResult {
  if (!assetRoot) return { status: 'FAIL', reason: 'Chưa cấu hình thư mục assets-local.' };

  let resolvedAssetRoot: string;
  try {
    resolvedAssetRoot = realpathSync(assetRoot);
  } catch {
    return { status: 'FAIL', reason: `Không tìm thấy thư mục asset ${assetRoot}.` };
  }

  const fixturesRoot = resolve(repositoryRoot, 'fixtures');
  try {
    if (isInside(realpathSync(fixturesRoot), resolvedAssetRoot)) {
      return { status: 'FAIL', reason: `Asset đang trỏ vào fixtures/ giữ chỗ: ${assetRoot}.` };
    }
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
      return { status: 'FAIL', reason: 'Không thể xác minh đường dẫn fixtures/ của checkout.' };
    }
  }

  const missingFiles = ['brand/logo.png', 'victory/trophy-stage.png', 'victory/bg.jpg']
    .filter((file) => !existsSync(join(resolvedAssetRoot, file)));
  let hasChibi = false;
  try {
    hasChibi = readdirSync(join(resolvedAssetRoot, 'chibi'), { withFileTypes: true })
      .some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'));
  } catch {
    hasChibi = false;
  }
  const hasMc = existsSync(join(resolvedAssetRoot, 'mc', 'kelly.png'))
    || existsSync(join(resolvedAssetRoot, 'mc', 'kelly', 'poster.png'));
  if (!hasChibi) missingFiles.push('chibi/*.png');
  if (!hasMc) missingFiles.push('mc/kelly.png hoặc mc/kelly/poster.png');
  return missingFiles.length === 0
    ? { status: 'PASS', reason: `Đủ logo, trophy-stage, bg, chibi và MC trong ${resolvedAssetRoot}.` }
    : { status: 'FAIL', reason: `Thiếu ${missingFiles.join(', ')} trong ${resolvedAssetRoot}.` };
}
