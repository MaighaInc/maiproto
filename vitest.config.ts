import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
      reporter: ['text', 'json', 'html'],
      exclude: ['**/dist/**', '**/__tests__/**', '**/node_modules/**'],
    },
  },
});
