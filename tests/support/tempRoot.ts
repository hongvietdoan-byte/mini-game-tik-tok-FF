import { afterAll } from 'vitest';
import { cleanupTestTempRoots } from './repoTemp';

export {
  cleanupTestTempRoots,
  cleanupTestTempRootsSync,
  removeTestTempRoot,
  removeTestTempRootAsync,
  testTempRoot,
  testTempRootAsync,
  TEST_TEMP_ROOT,
} from './repoTemp';

// Fallback nếu test lỗi trước khi chạy cleanup cục bộ; global teardown xóa phần còn sót.
afterAll(async () => cleanupTestTempRoots());
