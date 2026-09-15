import { test, expect } from '@playwright/test';
import { publicTools } from '../lib/tools/catalog';

test.describe('All Tools Smoke Test', () => {
  const routesToTest = new Set<string>();

  for (const tool of publicTools) {
    if (tool.searchEntries) {
      for (const entry of tool.searchEntries) {
        routesToTest.add(entry.href);
      }
    } else {
      routesToTest.add(tool.href);
    }
  }

  for (const route of routesToTest) {
    test(`Smoke test for route: ${route}`, async ({ page }) => {
      // Add a slight timeout for each page just in case
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      // We expect the page to load without a client-side crash (e.g. Next.js error overlay)
      // Next.js error overlays usually have an ID like `nextjs-portal` or we can just check if h1 is present
      const h1 = page.locator('h1');

      // Wait for h1 to be visible as a sign that the shell rendered
      await expect(h1.first()).toBeVisible({ timeout: 10000 });

      // Check that there is no obvious Next.js error overlay
      const errorOverlay = page.locator('nextjs-portal');
      await expect(errorOverlay).toHaveCount(0);
    });
  }
});
