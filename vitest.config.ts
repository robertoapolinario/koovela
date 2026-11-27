import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['**/*.test.ts'], exclude: ['**/node_modules/**', '**/*.integration.test.ts', '**/*.int.test.ts', '**/e2e/**', 'apps/consumer-mobile/**', 'apps/pro-mobile/**', 'specs/**', 'bkp/**'] },
});
