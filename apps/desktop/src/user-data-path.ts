import { join } from 'node:path';

export const QUIZ_PRODUCT_NAME = 'Nhà Thông Thái Free Fire';
export const LEGACY_USER_DATA_FOLDER = 'Storm Arena LIVE Quiz';

type ElectronAppPaths = {
  setName(name: string): void;
  getPath(name: 'appData'): string;
  setPath(name: 'userData', path: string): void;
};

/** Giữ nguyên thư mục người dùng cũ sau khi đổi tên sản phẩm Electron. */
export function pinLegacyUserDataPath(app: ElectronAppPaths) {
  app.setName(QUIZ_PRODUCT_NAME);
  const userDataPath = join(app.getPath('appData'), LEGACY_USER_DATA_FOLDER);
  app.setPath('userData', userDataPath);
  return userDataPath;
}
