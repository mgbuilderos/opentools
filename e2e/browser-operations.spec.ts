import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import type { HarnessReport } from './operations-browser-harness';

/**
 * C3: every workbench operation, run inside a real browser.
 *
 * The Node QC (`lib/tools/all-operations-qc.test.ts`) proves the logic. This
 * proves the browser can execute it — the failures it is here to catch are the
 * ones Node cannot see: a missing browser API, a regex V8 accepts and
 * JavaScriptCore does not, an Intl or Date difference. Both engines are run,
 * because Safari is where these diverge.
 *
 * `page.evaluate` runs the bundle through the debugger, so the page's own CSP
 * (`script-src 'self'`) does not need widening for the audit.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');
const bundlePath = path.join(projectRoot, 'tmp/e2e-harness/harness.js');
const reportDir = path.join(projectRoot, 'tmp/e2e-harness');

function harnessBundle() {
  if (!existsSync(bundlePath)) {
    execFileSync(
      'npx',
      ['vite', 'build', '--config', 'e2e/harness.vite.config.ts'],
      { cwd: projectRoot, stdio: 'inherit' },
    );
  }
  return readFileSync(bundlePath, 'utf8');
}

test.describe('every operation runs in a real browser', () => {
  test('runs the whole catalog and reports what fails', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);

    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => consoleErrors.push(String(error)));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(harnessBundle());

    const report = (await page.evaluate(
      async () =>
        await (
          globalThis as unknown as {
            __runAllOperations: () => Promise<HarnessReport>;
          }
        ).__runAllOperations(),
    )) as HarnessReport;

    mkdirSync(reportDir, { recursive: true });
    writeFileSync(
      path.join(reportDir, `report-${testInfo.project.name}.json`),
      JSON.stringify({ ...report, consoleErrors }, null, 2),
    );

    const summary = report.failures
      .map((f) => `  ${f.route}?tool=${f.id} — ${f.reason}`)
      .join('\n');

    expect(report.total).toBeGreaterThan(600);
    expect(
      report.failures,
      `${report.failures.length} of ${report.total} operations failed in ${testInfo.project.name}:\n${summary}`,
    ).toEqual([]);
  });
});
