import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { preflightAssets } from './preflight-assets';

const roots: string[] = [];
function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'quiz-preflight-assets-'));
  roots.push(root);
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function seedAssets(root: string) {
  for (const file of ['brand/logo.png', 'victory/trophy-stage.png', 'victory/bg.jpg', 'chibi/one.png', 'mc/kelly.png']) {
    const target = join(root, file);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, 'test asset');
  }
}

describe('preflightAssets', () => {
  it('từ chối thư mục fixture dù có đủ tên asset bắt buộc', () => {
    const repositoryRoot = tempRoot();
    const fixtureRoot = join(repositoryRoot, 'fixtures', 'assets-placeholder');
    seedAssets(fixtureRoot);
    expect(preflightAssets(fixtureRoot, repositoryRoot)).toMatchObject({ status: 'FAIL' });
    expect(preflightAssets(fixtureRoot, repositoryRoot).reason).toContain('fixtures/');
  });

  it('chấp nhận kho asset riêng đầy đủ ngoài fixtures', () => {
    const repositoryRoot = tempRoot();
    const assetRoot = join(repositoryRoot, 'assets-local');
    seedAssets(assetRoot);
    expect(preflightAssets(assetRoot, repositoryRoot)).toMatchObject({ status: 'PASS' });
  });

  it('fail khi chưa cấu hình hoặc thiếu asset bắt buộc', () => {
    const repositoryRoot = tempRoot();
    expect(preflightAssets(undefined, repositoryRoot).status).toBe('FAIL');
    const assetRoot = join(repositoryRoot, 'assets-local');
    mkdirSync(assetRoot);
    expect(preflightAssets(assetRoot, repositoryRoot).status).toBe('FAIL');
  });
});
