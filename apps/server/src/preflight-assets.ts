import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export type PreflightAssetResult = { status: 'PASS' | 'FAIL'; reason: string };
export type MissingCharacterAssets = { id: string; files: string[] };

function isInside(parent: string, child: string) {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

const characterAssetPaths = (id: string) => [
  `chibi/${id}.png`,
  `throne/ngai-${id}.png`,
  `chibi/dang-top2-top3/top2/top2-${id}.png`,
  `chibi/dang-top2-top3/top3/top3-${id}.png`,
];

/** Chỉ kiểm tra sự tồn tại của 4 file, không mở nội dung ảnh. */
export function checkCharacterAssets(assetRoot: string, ids: readonly string[]) {
  const root = resolve(assetRoot);
  const missing: MissingCharacterAssets[] = [];
  for (const id of ids) {
    const files = characterAssetPaths(id).filter((file) => {
      const fullPath = resolve(root, file);
      return !isInside(root, fullPath) || !existsSync(fullPath);
    });
    if (files.length > 0) missing.push({ id, files });
  }
  return { missing };
}

function idsFromManifest(assetRoot: string): { ids?: string[]; invalid?: boolean } {
  const manifestPath = join(assetRoot, 'chibi', 'manifest.json');
  if (!existsSync(manifestPath)) return {};
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { characters?: unknown };
    if (!Array.isArray(manifest.characters)) return { invalid: true };
    const ids: string[] = [];
    for (const character of manifest.characters) {
      if (!character || typeof character !== 'object' || !('id' in character) || typeof character.id !== 'string' || !character.id) {
        return { invalid: true };
      }
      ids.push(character.id);
    }
    return { ids };
  } catch {
    return { invalid: true };
  }
}

function missingCharacterReason(missing: readonly MissingCharacterAssets[]) {
  const listed = missing.slice(0, 5).map(({ id, files }) => `${id} (${files.join(', ')})`);
  if (missing.length > 5) listed.push(`+${missing.length - 5} nhân vật khác`);
  return `Thiếu ảnh nhân vật: ${listed.join('; ')}.`;
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

  const manifest = idsFromManifest(resolvedAssetRoot);
  let characterFailureReason: string | null = null;
  if (manifest.invalid) {
    missingFiles.push('chibi/manifest.json (không hợp lệ)');
  } else if (manifest.ids) {
    const characterAssets = checkCharacterAssets(resolvedAssetRoot, manifest.ids);
    if (characterAssets.missing.length > 0) {
      characterFailureReason = missingCharacterReason(characterAssets.missing);
    }
  }

  if (missingFiles.length === 0 && !characterFailureReason) {
    return { status: 'PASS', reason: `Đủ logo, trophy-stage, bg, chibi và MC trong ${resolvedAssetRoot}.` };
  }
  const reasons = [
    ...(missingFiles.length > 0 ? [`Thiếu ${missingFiles.join(', ')} trong ${resolvedAssetRoot}.`] : []),
    ...(characterFailureReason ? [characterFailureReason] : []),
  ];
  return { status: 'FAIL', reason: reasons.join(' ') };
}
