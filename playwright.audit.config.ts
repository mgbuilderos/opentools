import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e-audit',
  fullyParallel: false,
  workers: 2,
  reporter: [['line']],
  use: { baseURL: 'http://localhost:9300', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start -- --port 9300',
    url: 'http://localhost:9300',
    reuseExistingServer: false,
    timeout: 300000,
  },
});
