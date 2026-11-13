import { afterAll } from 'vitest';
import { cleanupTestTempRoots } from './repoTemp';

afterAll(async () => cleanupTestTempRoots());
