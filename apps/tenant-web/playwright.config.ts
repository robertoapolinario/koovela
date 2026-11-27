import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://painel.koovela.localhost:4171', ...devices['Desktop Chrome'] },
  webServer: { command: 'node ../../tools/dev/spa-serve.ts build/client 4171', url: 'http://127.0.0.1:4171/healthz', reuseExistingServer: false, timeout: 60_000 },
});
