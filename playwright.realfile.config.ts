import { defineConfig, devices } from '@playwright/test';

/**
 * Drives real files through the DEPLOYED site.
 *
 * Separate from `playwright.production.config.ts`, which runs only the egress
 * proof, and from the ordinary config, which builds and serves locally. No
 * `webServer`: nothing is built or started, so this cannot accidentally test a
 * stale server already listening on a port.
 *
 *   npx playwright test --config playwright.realfile.config.ts
 */
const TARGET = process.env.PROD_BASE_URL ?? 'https://getopentools.com';

export default defineConfig({
  testDir: './e2e-prod',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: TARGET, trace: 'off' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
