import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    restoreMocks: true,
    setupFiles: ['./src/renderer/__helpers__/setup.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.d.ts', 'build/**', 'dist/**', '**/__tests__/**'],
    },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
