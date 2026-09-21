import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Capped: several specs load a 16 MB model or compress a photo-heavy PDF, and
  // at the default worker count two browsers doing that at once starve each
  // other into timeouts that look like product failures.
  workers: process.env.CI ? 1 : 3,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    // The production build, not `dev`. Two reasons: the dev server pulls the
    // background remover's ONNX runtime through Vite's module graph and fails
    // on it, covering the page in a build-error dialog that has nothing to do
    // with the tools; and this is what actually ships. Port 8788, not 3000 —
    // another project on this machine listens on 3000, and reuseExistingServer
    // silently ran the whole suite against it. e2e/global-setup.ts refuses to
    // start if the server that answers is not OpenTools.
    baseURL: 'http://localhost:8788',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Safari's engine, where Node-passing operations are most likely to break.
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    // `npm run qc:release` builds immediately before the end-to-end gate, so
    // it sets E2E_SKIP_BUILD and the server starts on those bytes rather than
    // making them a second time. Run on its own, the suite still builds first:
    // `e2e/global-setup.ts` refuses to start without a local build to compare
    // the served app chunk against.
    command:
      process.env.E2E_SKIP_BUILD === '1'
        ? 'npm run start -- --port 8788'
        : 'npm run build && npm run start -- --port 8788',
    url: 'http://localhost:8788',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
});
