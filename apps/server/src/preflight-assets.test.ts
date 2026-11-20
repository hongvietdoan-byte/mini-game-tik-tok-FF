import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkCharacterAssets, preflightAssets } from './preflight-assets';
import { testTempRoot } from '../../../tests/support/tempRoot';

const roots: string[] = [];
const COMMON_FILES = ['brand/logo.png', 'victory/trophy-stage.png', 'victory/bg.jpg', 'chibi/standalone.png', 'mc/kelly.png'];
const characterPaths = (id: string) => [
  `chibi/${id}.png`,
  `throne/ngai-${id}.png`,
  `chibi/dang-top2-top3/top2/top2-${id}.png`,
  `chibi/dang-top2-top3/top3/top3-${id}.png`,
];

function tempRoot() {
  const root = testTempRoot('quiz-preflight-assets-');
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

function seedAssets(root: string) {
  for (const file of COMMON_FILES) {
    const target = join(root, file);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, 'test asset');
  }
}

function seedManifest(root: string, ids: readonly string[]) {
  const manifestPath = join(root, 'chibi', 'manifest.json');
  mkdirSync(join(manifestPath, '..'), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify({ characters: ids.map((id) => ({ id })) }));
}

function seedCharacter(root: string, id: string) {
  for (const file of characterPaths(id)) {
    const target = join(root, file);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, 'test image placeholder');
  }
}

describe('preflightAssets', () => {
  it('từ chối thư mục fixture dù có đủ asset chung', () => {
    const repositoryRoot = tempRoot();
    const fixtureRoot = join(repositoryRoot, 'fixtures', 'assets-placeholder');
    seedAssets(fixtureRoot);
    const result = preflightAssets(fixtureRoot, repositoryRoot);
    expect(result).toMatchObject({ status: 'FAIL' });
    expect(result.reason).toContain('fixtures/');
  });

  it('giữ hành vi cũ khi chưa có manifest nhân vật', () => {
    const repositoryRoot = tempRoot();
    const assetRoot = join(repositoryRoot, 'assets-local');
    seedAssets(assetRoot);
    expect(preflightAssets(assetRoot, repositoryRoot)).toMatchObject({ status: 'PASS' });
  });

  it.each(characterPaths('chibi-test'))('báo đúng file tương đối nếu thiếu %s', (missingFile) => {
    const repositoryRoot = tempRoot();
    const assetRoot = join(repositoryRoot, 'assets-local');
    seedAssets(assetRoot);
    seedManifest(assetRoot, ['chibi-test']);
    seedCharacter(assetRoot, 'chibi-test');
    rmSync(join(assetRoot, missingFile));

    const checked = checkCharacterAssets(assetRoot, ['chibi-test']);
    expect(checked.missing).toEqual([{ id: 'chibi-test', files: [missingFile] }]);
    const result = preflightAssets(assetRoot, repositoryRoot);
    expect(result.status).toBe('FAIL');
    expect(result.reason).toContain(`chibi-test (${missingFile})`);
    expect(result.reason).not.toContain(assetRoot);
  });

  it('chỉ liệt kê tối đa 5 id thiếu ảnh rồi ghi số còn lại', () => {
    const repositoryRoot = tempRoot();
    const assetRoot = join(repositoryRoot, 'assets-local');
    const ids = Array.from({ length: 7 }, (_, index) => `chibi-test-${index + 1}`);
    seedAssets(assetRoot);
    seedManifest(assetRoot, ids);

    const result = preflightAssets(assetRoot, repositoryRoot);
    expect(result.status).toBe('FAIL');
    for (const id of ids.slice(0, 5)) expect(result.reason).toContain(id);
    expect(result.reason).toContain('+2 nhân vật khác');
    expect(result.reason).not.toContain(ids[5]!);
    expect(result.reason).not.toContain(ids[6]!);
  });

  it('chấp nhận manifest đầy đủ ngoài fixtures', () => {
    const repositoryRoot = tempRoot();
    const assetRoot = join(repositoryRoot, 'assets-local');
    seedAssets(assetRoot);
    seedManifest(assetRoot, ['chibi-test']);
    seedCharacter(assetRoot, 'chibi-test');
    expect(preflightAssets(assetRoot, repositoryRoot)).toMatchObject({ status: 'PASS' });
  });

  it('fail khi chưa cấu hình hoặc thiếu asset chung bắt buộc', () => {
    const repositoryRoot = tempRoot();
    expect(preflightAssets(undefined, repositoryRoot).status).toBe('FAIL');
    const assetRoot = join(repositoryRoot, 'assets-local');
    mkdirSync(assetRoot);
    expect(preflightAssets(assetRoot, repositoryRoot).status).toBe('FAIL');
  });
});
