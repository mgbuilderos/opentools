// Every route the catalog advertises, checked for an error banner the visitor
// never caused -- shown before any input, on first paint.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { publicTools } from '../lib/tools/catalog';

const routes = new Set<string>();
for (const tool of publicTools) {
  if (tool.searchEntries) for (const e of tool.searchEntries) routes.add(e.href);
  else routes.add(tool.href);
}

const hits: { route: string; text: string; focused: boolean }[] = [];

test.describe('error on load', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const route of routes) {
    test(`load ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(500);
      const found = await page.evaluate(() => {
        const el = document.querySelector('[role=alert]') as HTMLElement | null;
        if (!el || el.offsetParent === null) return null;
        return {
          text: (el.textContent || '').trim().slice(0, 120),
          focused: document.activeElement === el,
        };
      });
      if (found) hits.push({ route, ...found });
    });
  }

  test.afterAll(() => {
    mkdirSync('audit-out', { recursive: true });
    writeFileSync('audit-out/error-on-load.json', JSON.stringify(hits, null, 2));
  });
});
