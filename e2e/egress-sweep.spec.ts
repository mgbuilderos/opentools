import { expect, test } from '@playwright/test';

import { DEDICATED_TOOL_ROUTES } from '../lib/seo/live-tools';
import { useOriginOf, watchOffOrigin } from './egress-watch';
import {
  HAND_PROBE_TO_PAGE,
  PROBE_FOR_SECTION,
  PROBE_TOKEN,
  type ProbeKind,
} from './probe-files';

/**
 * The egress proof, across every tool instead of two of them.
 *
 * `docs/EGRESS_PROOF.md` states the limit of the existing proof in its own
 * words: *"Does not: cover every tool."* It ran a real file through
 * `/image/optimize` and loaded `/image/heic-to-jpg` — two of the 67 dedicated
 * tool routes. The claim it supports is the loudest thing the product says.
 *
 * This sweep visits every dedicated route, hands a real file to any route that
 * takes one, and asserts three things per route:
 *
 *   1. No off-origin host ever answered, and anything attempted was refused by
 *      policy rather than by a network error that could go the other way.
 *   2. No request carrying a body was sent **anywhere, including to our own
 *      origin** — the case CSP does not cover and therefore the one worth
 *      watching. `connect-src 'none'` stops a fetch to a third party; it does
 *      not stop a POST home.
 *   3. The probe filename, which appears nowhere else in the codebase, never
 *      reached a URL.
 *
 * ## What it does not establish
 *
 * It exercises a tool's *intake*, not its whole pipeline: the file is handed
 * over and the page is given time to work, but no route's specific action
 * button is clicked, because 67 different buttons cannot be driven generically
 * without 67 selectors that rot. `egress-proof.spec.ts` still owns the deep
 * path — a real PNG all the way through `/image/optimize` and out the other
 * side — and this sweep owns the breadth. Neither replaces the other.
 *
 * Routes whose probe kind is `none` get a page-load proof only, and the summary
 * says which those are rather than letting a reader assume otherwise.
 */

const sectionOf = (route: string) => route.split('/')[1] ?? '';

const SECTIONS = [...new Set(DEDICATED_TOOL_ROUTES.map(sectionOf))].sort();

/**
 * Routes served `connect-src 'self'` rather than `'none'`, so the local model
 * and its WebAssembly runtime can load from our own origin.
 *
 * They are in the sweep, not excluded from it. `'self'` still forbids every
 * other host, so assertion 1 holds unchanged; what changes is only that
 * same-origin requests are expected here, and assertion 2 already tolerates
 * those unless they carry a body.
 */
const LOCAL_MODEL_ROUTES = new Set(['/image/background-remover', '/image/editor']);

/**
 * The routes that accept a file, measured on 2026-09-26 against this build.
 *
 * Regenerate with:
 *   EGRESS_SWEEP_REPORT=1 npx playwright test e2e/egress-sweep.spec.ts --project=chromium
 *
 * Do not edit it to make a run go green. A route leaving this list means its
 * file input disappeared, which is a product defect; a route arriving means a
 * new intake exists that nobody decided to sweep. Both are worth stopping for.
 *
 * Regenerated 2026-09-26, after the tool families that landed that day. Seven
 * routes arrived and none left: `/batch`, `/email/reader`, `/file/xray`,
 * `/finance/bank-statement`, `/finance/ofx-qif`, `/pdf/form-filler` and
 * `/pdf/password`. That is the arriving case above, and it is why this is a
 * regeneration rather than the edit the paragraph forbids: in the run that
 * produced these names, all seven were visited, handed a real probe file, given
 * time to act, and passed every egress assertion in the loop — nothing
 * off-origin, nothing carrying a body, the probe filename in no URL, and
 * `connect-src 'none'` still served. The five sections failed on this
 * comparison alone. The list moved because the product gained intakes, not
 * because the sweep was loosened around them.
 *
 * Worth noticing what the arrivals are: a folder runner, an email reader, a
 * whole-file inspector, two bank-statement parsers and two PDF tools, one of
 * which takes a password. Every one is a route whose whole point is that the
 * file is sensitive.
 */
const TAKES_A_FILE = new Set<string>([
  '/audio/convert',
  '/audio/loudness',
  '/audio/mp3-toolkit',
  '/batch',
  '/data/csv-to-json',
  '/data/excel',
  '/data/workbook-audit',
  '/documents/metadata',
  '/email/reader',
  '/file/archive',
  '/file/hash-calculator',
  '/file/xray',
  '/finance/bank-statement',
  '/finance/ofx-qif',
  '/image/background-remover',
  '/image/editor',
  '/image/exact-size',
  '/image/heic-to-jpg',
  '/image/heic-to-png',
  '/image/metadata',
  '/image/optimize',
  '/image/to-text',
  '/life-admin/aadhaar-pan-masker',
  '/pdf/bates',
  '/pdf/burst',
  '/pdf/compare',
  '/pdf/compress',
  '/pdf/compress-offline',
  '/pdf/drawing-register',
  '/pdf/excel-to-pdf',
  '/pdf/extract-pages',
  '/pdf/form-filler',
  '/pdf/images-to-pdf',
  '/pdf/merge',
  '/pdf/metadata',
  '/pdf/ocr',
  '/pdf/page-tools',
  '/pdf/password',
  '/pdf/preflight',
  '/pdf/redact',
  '/pdf/sign',
  '/pdf/to-excel',
  '/pdf/to-word',
  '/video/compress',
  '/video/convert',
  '/video/crop',
  '/video/extract-audio',
  '/video/merge',
  '/video/metadata',
  '/video/mute',
  '/video/resize',
  '/video/rotate',
  '/video/split',
  '/video/to-gif',
  '/video/trim',
  '/web/file-to-html',
]);

test.beforeEach(({ baseURL }) => {
  useOriginOf(baseURL);
});

test.describe('egress sweep across every dedicated tool route', () => {
  /*
   * A section can hold eighteen routes, each of which is a navigation, a wait
   * for hydration and a pause to let the tool act. That does not fit the 30s
   * default, and a timeout here reads as a product failure when it is only a
   * budget.
   */
  test.describe.configure({ timeout: 180_000 });

  for (const section of SECTIONS) {
    const routes = DEDICATED_TOOL_ROUTES.filter(
      (route) => sectionOf(route) === section,
    );
    const kind: ProbeKind = PROBE_FOR_SECTION[section] ?? 'none';

    test(`/${section} — ${routes.length} route(s) keep every byte on the device`, async ({
      page,
    }) => {
      const fedAFile: string[] = [];
      const loadOnly: string[] = [];

      for (const route of routes) {
        const watcher = watchOffOrigin(page);

        await page.goto(route);
        // Hydration must finish before the file is handed over: a `change`
        // fired at markup React has not attached to yet is discarded silently,
        // and the tool then looks broken rather than unhydrated.
        await page.waitForLoadState('networkidle');

        let handed: string | null = null;
        if (kind !== 'none') {
          handed = await page.evaluate(
            ([probeKind, token]) =>
              (
                window as unknown as {
                  __handProbe: (k: string, t: string) => Promise<string | null>;
                }
              ).__handProbe(probeKind as string, token as string),
            [kind, PROBE_TOKEN] as const,
          );
        }

        if (handed) {
          fedAFile.push(route);
          // Give the tool room to do whatever it does on intake — decode,
          // render a preview, read metadata. Anything that wanted to phone
          // home would do it here.
          await page.waitForTimeout(1500);
        } else {
          loadOnly.push(route);
        }

        watcher.assertNothingLeft(route);
        watcher.assertNothingCarriedAFile(route, PROBE_TOKEN);
        await watcher.assertZeroBytesOffOrigin(page);

        if (!LOCAL_MODEL_ROUTES.has(route)) {
          // Belt and braces: the served policy for an ordinary tool route must
          // still be the restrictive one. A route that quietly acquired the
          // model exception would pass every assertion above.
          const policy = await page.evaluate(() =>
            document
              .querySelector('meta[http-equiv="Content-Security-Policy"]')
              ?.getAttribute('content'),
          );
          if (policy) {
            expect(policy, `${route} relaxed connect-src`).toContain(
              "connect-src 'none'",
            );
          }
        }
      }

      /*
       * Guards the guard, per section, where the state actually lives.
       *
       * Every assertion above passes trivially against a page that loaded
       * nothing and received nothing, so a refactor that broke the probe
       * handover — a renamed input, a changed selector — would turn this file
       * green and silent. An earlier draft tracked this across tests in module
       * state and was wrong: `fullyParallel` puts tests in different workers,
       * so the totals were whatever one worker happened to see.
       */
      expect(
        fedAFile.length + loadOnly.length,
        `${section}: a route was skipped entirely`,
      ).toBe(routes.length);

      if (process.env.EGRESS_SWEEP_REPORT === '1') {
        console.log(
          `[sweep] ${section} fed=${JSON.stringify(fedAFile)} loadOnly=${JSON.stringify(loadOnly)}`,
        );
      }

      /*
       * Which routes take a file is pinned, not inferred.
       *
       * An earlier draft asserted "at least one route per section took a file",
       * which was a guess dressed as a measurement: it failed six sections that
       * legitimately accept typed text rather than a file. Worse, it could
       * never have caught the failure that matters — a route that silently
       * loses its file input still passes if a sibling kept one.
       *
       * So the set is measured, written down in TAKES_A_FILE, and compared.
       * Both directions fail: a route that stops accepting a file, and a route
       * that starts accepting one without anybody deciding it should be swept.
       */
      const expectedFed = routes.filter((route) => TAKES_A_FILE.has(route));
      expect(
        fedAFile.sort(),
        `${section}: the set of routes accepting a file changed`,
      ).toEqual([...expectedFed].sort());
    });
  }

  test('every tool section has an explicit probe decision', () => {
    /*
     * A section missing from PROBE_FOR_SECTION falls back to 'none' and gets a
     * page-load proof while looking, in the report, exactly like a section that
     * was deliberately load-only. A new tool family therefore has to say which
     * it is. The other lanes are adding sections right now — /email, /location,
     * /medical, /archive — and each is a route whose whole point is that the
     * file is sensitive.
     */
    const undeclared = SECTIONS.filter(
      (section) => !(section in PROBE_FOR_SECTION),
    );
    expect(
      undeclared,
      'add these to PROBE_FOR_SECTION: a probe kind, or an explicit "none"',
    ).toEqual([]);
  });
});

/**
 * Installs the probe builder into every page before the app's own scripts run.
 *
 * It is injected rather than passed inline so the builder stays readable in
 * `probe-files.ts` instead of collapsing into one `page.evaluate` argument.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    `window.__handProbe = (kind, token) => (${HAND_PROBE_TO_PAGE.toString()})(kind, token);`,
  );
});
