import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke-tests the deployed site rather than a local build. Used to confirm a
 * release actually works in production, where the module worker and the KV
 * cache are in play; the day-to-day suite runs against the local build.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'pdf-compress.spec.ts',
  workers: 1,
  reporter: 'line',
  use: { baseURL: 'https://getopentools.com' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
