import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://app.koovela.localhost:4170', ...devices['Desktop Chrome'] },
  webServer: { command: 'PORT=4170 NODE_ENV=production node server.ts', url: 'http://127.0.0.1:4170/healthz', reuseExistingServer: false, timeout: 60_000 },
});
