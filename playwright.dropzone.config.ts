import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 2,
  reporter: [['line']],
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:8900', trace: 'off' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run start -- --port 8900',
    url: 'http://localhost:8900',
    reuseExistingServer: false,
    timeout: 300000,
  },
});
