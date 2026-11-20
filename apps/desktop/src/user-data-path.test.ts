import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGACY_USER_DATA_FOLDER, pinLegacyUserDataPath, QUIZ_PRODUCT_NAME } from './user-data-path';

describe('Electron app identity migration', () => {
  it('changes the product label while pinning userData to the existing folder', () => {
    const calls: Array<[string, string]> = [];
    const app = {
      setName: (name: string) => calls.push(['name', name]),
      getPath: (name: 'appData') => {
        calls.push(['getPath', name]);
        return join('profile', 'AppData', 'Roaming');
      },
      setPath: (name: 'userData', path: string) => calls.push([name, path]),
    };

    const result = pinLegacyUserDataPath(app);

    expect(calls).toEqual([
      ['name', QUIZ_PRODUCT_NAME],
      ['getPath', 'appData'],
      ['userData', join('profile', 'AppData', 'Roaming', LEGACY_USER_DATA_FOLDER)],
    ]);
    expect(result).toBe(join('profile', 'AppData', 'Roaming', 'Storm Arena LIVE Quiz'));
  });
});
