import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['app/**/*.{test,spec}.ts'],
    setupFiles: ['./app/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '#imports': resolve(__dirname, 'app/__tests__/nuxt-stubs.ts'),
      '#app': resolve(__dirname, 'app/__tests__/nuxt-stubs.ts'),
    },
  },
});
