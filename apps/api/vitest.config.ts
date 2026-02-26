import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://eli:eli_secret@localhost:5432/eli_cms_test',
      JWT_SECRET: 'test-jwt-secret-min-10-chars',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-min-10-chars',
      API_PORT: '0',
    },
    globalSetup: './src/__tests__/global-setup.ts',
    setupFiles: ['./src/__tests__/helpers/setup.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
