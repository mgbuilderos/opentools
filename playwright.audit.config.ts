import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e-audit',
  fullyParallel: false,
  workers: 2,
  reporter: [['line']],
  use: { baseURL: 'http://localhost:8860', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start -- --port 8860',
    url: 'http://localhost:8860',
    reuseExistingServer: false,
    timeout: 300000,
  },
});
