import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

function mainCheckoutRoot(cwd = process.cwd()) {
  try {
    const commonGitDirectory = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return resolve(commonGitDirectory, '..');
  } catch {
    return cwd;
  }
}

/** Honor QUIZ_ASSETS_DIR; otherwise use assets-local from the main checkout, including in a linked worktree. */
export function getE2eAssetDirectory(cwd = process.cwd()) {
  const configured = process.env.QUIZ_ASSETS_DIR?.trim();
  return configured ? resolve(cwd, configured) : resolve(mainCheckoutRoot(cwd), 'assets-local');
}

export function usesE2ePlaceholderAssets(cwd = process.cwd()) {
  const configuredAssets = resolve(cwd, getE2eAssetDirectory(cwd));
  const placeholderPaths = [
    resolve(cwd, 'fixtures/assets-placeholder'),
    resolve(mainCheckoutRoot(cwd), 'fixtures/assets-placeholder'),
  ].map((path) => path.toLocaleLowerCase('en'));
  return placeholderPaths.includes(configuredAssets.toLocaleLowerCase('en'));
}
