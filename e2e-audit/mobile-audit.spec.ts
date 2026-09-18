// Forensic audit, not a release gate: visits every distinct tool page at phone
// width and records layout overflow, console errors and undersized controls.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { publicTools } from '../lib/tools/catalog';

// One entry per distinct PAGE. The catalog hands out hundreds of `?tool=`
// variants of the same page; auditing layout on each would be the same
// measurement hundreds of times.
const pages = new Set<string>();
for (const tool of publicTools) pages.add(tool.href.split('?')[0]);
for (const tool of publicTools)
  for (const entry of tool.searchEntries ?? []) pages.add(entry.href.split('?')[0]);

interface Finding {
  route: string;
  scrollWidth: number;
  clientWidth: number;
  overflowing: string[];
  consoleErrors: string[];
  smallTargets: { label: string; w: number; h: number }[];
  errorOnLoad: string;
  emptyOutputPromise: string;
}

const findings: Finding[] = [];

test.describe('mobile audit', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const route of pages) {
    test(`audit ${route}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
      });
      page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));

      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(400);

      const result = await page.evaluate(() => {
        const doc = document.documentElement;
        // Elements whose own box sticks out past the viewport.
        const overflowing: string[] = [];
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > doc.clientWidth + 1 || r.left < -1) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className || '').toString().slice(0, 40);
            overflowing.push(`${tag}.${cls} right=${Math.round(r.right)}`);
          }
        }
        // Interactive controls below the 24x24 CSS-pixel minimum (WCAG 2.2 AA).
        const smallTargets: { label: string; w: number; h: number }[] = [];
        for (const el of Array.from(
          document.querySelectorAll('button, a[href], input, select, textarea, [role=button]'),
        )) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.width < 24 || r.height < 24) {
            smallTargets.push({
              label: (el.getAttribute('aria-label') || el.textContent || el.tagName)
                .trim()
                .slice(0, 40),
              w: Math.round(r.width),
              h: Math.round(r.height),
            });
          }
        }
        // An error banner the visitor never caused: shown before any input.
        const alert = document.querySelector('[role=alert]');
        const errorOnLoad =
          alert && (alert as HTMLElement).offsetParent !== null
            ? (alert.textContent || '').trim().slice(0, 160)
            : '';
        return {
          errorOnLoad,
          emptyOutputPromise: '',
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          overflowing: overflowing.slice(0, 8),
          smallTargets: smallTargets.slice(0, 10),
        };
      });

      findings.push({ route, consoleErrors: [...new Set(consoleErrors)].slice(0, 5), ...result });
    });
  }

  test.afterAll(() => {
    mkdirSync('audit-out', { recursive: true });
    writeFileSync('audit-out/mobile-audit.json', JSON.stringify(findings, null, 2));
  });
});
