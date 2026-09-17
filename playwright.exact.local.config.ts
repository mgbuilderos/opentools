import base from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: 'http://localhost:8792' },
  webServer: {
    command:
      'npm run build && npx wrangler dev --config dist/server/wrangler.json --port 8792 --inspector-port 9232',
    url: 'http://localhost:8792',
    reuseExistingServer: true,
    timeout: 300000,
  },
});
