import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/report-question-length.test.ts'],
    environment: 'node',
  },
});
