import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
    command: 'npm run build && npm run start -- --port 8788',
    url: 'http://localhost:8788',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
});
