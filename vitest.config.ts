import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web/src')
    }
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/web/src/**/*.test.ts', 'tests/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/**/*.ts', 'apps/web/src/**/*.ts']
    }
  }
});
