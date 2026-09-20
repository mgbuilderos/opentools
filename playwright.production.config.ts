import { defineConfig, devices } from '@playwright/test';

/**
 * Runs the egress proof against a DEPLOYED site rather than a local build.
 *
 * This is what ADR-014 means by "formal deployed egress evidence": the ordinary
 * config builds and serves locally, which proves things about an artifact on
 * this laptop, not about what a visitor actually receives.
 *
 *   npx playwright test --config playwright.production.config.ts
 *   EGRESS_BASE_URL=https://staging.example npx playwright test --config playwright.production.config.ts
 *
 * No `webServer`: nothing is built or started, so it cannot accidentally
 * measure a stale server already listening on the port.
 */
const TARGET = process.env.EGRESS_BASE_URL ?? 'https://getopentools.com';

export default defineConfig({
  testDir: './e2e',
  testMatch: /egress-proof\.spec\.ts/u,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.production.ts',
  use: { baseURL: TARGET, trace: 'off' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
