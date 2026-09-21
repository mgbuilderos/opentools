import { expect, test, type Page } from '@playwright/test';

import {
  LIVE_TOOL_ROUTES,
  operationIdsForRoute,
} from '../lib/seo/live-tool-routes';

/**
 * Every advertised tool URL must offer the visitor a way in or a way out.
 *
 * WHY THIS FILE EXISTS. `lorem-ipsum-generator` and `random-word-generator`
 * shipped producing nothing at all, for as long as the error-box fix recorded
 * at `AGENT_BOARD.md:521` had been live. That fix made the text workbench
 * "skip a run that can only fail" as `if (!input) return` -- but the two
 * operations that declare `needsInput: false` render no textarea, so their
 * input is permanently empty and the run was skipped forever. The page drew
 * its heading, its tool picker and its number box, said "Auto-running locally",
 * and never produced a line.
 *
 * Nothing caught it. `all-tools-smoke.spec.ts` asserts an `<h1>` is visible and
 * no error overlay exists -- both true of a tool that does nothing.
 * `lib/tools/text-workbench.test.ts` calls the engine directly with `''` and
 * passes, because the engine was never the broken half. And the measurement
 * that signed off the error-box fix counted error boxes, not missing output.
 *
 * So this spec asserts the product claim instead of the render:
 *
 *   a page with nowhere to type, nothing to drop, and no button to press
 *   must already be showing a result.
 *
 * Anything else is a dead end -- the visitor can read it and can do nothing
 * with it. A page that takes text or a file is exempt (it is right to wait),
 * and so is one with an action button (the visitor can press it).
 */

const TOOL_URLS = LIVE_TOOL_ROUTES.flatMap((route) => {
  const ids = operationIdsForRoute(route);
  return ids?.size
    ? [...ids].map((id) => `${route}?tool=${id}`)
    : [route];
});

/** Buttons that visibly offer to do the work when nothing runs on its own. */
const ACTION_LABEL =
  /^(run|generate|convert|create|calculate|apply|format|build|make|encode|decode|compress|extract|analy[sz]e|render|process|compute|start|go|shorten|split|merge|count|check|clean|fix|trim|resize|download)\b/i;

interface Probe {
  canType: boolean;
  canPress: boolean;
  hasResult: boolean;
  heading: string;
}

async function probe(page: Page): Promise<Probe> {
  return page.evaluate((actionSource) => {
    const action = new RegExp(actionSource, 'i');
    const shown = (el: Element) =>
      (el as HTMLElement).offsetParent !== null ||
      el.getClientRects().length > 0;
    // Scoped to <main>, and that is load-bearing. The site header carries a
    // search box and a Support button on every page; counted, they make every
    // route look usable and this spec can never fail. Only the tool's own
    // surface counts.
    const main = document.querySelector('main');
    if (!main) {
      return { canType: false, canPress: false, hasResult: false, heading: '' };
    }
    const all = (selector: string) => Array.from(main.querySelectorAll(selector));
    // A styled drop zone hides its real <input type=file> behind the visible
    // "browse" affordance, so file inputs count whether or not they are painted.
    const canType =
      all('input[type=file]').length > 0 ||
      all(
        'textarea, [contenteditable=""], [contenteditable="true"], input[type=text], input[type=search], input[type=url], input[type=email], input[type=tel], input:not([type])',
      ).some(shown);
    const canPress = all('button')
      .filter(shown)
      .some((b) => action.test(((b as HTMLElement).innerText || '').trim()));
    const text = (main as HTMLElement).innerText;
    return {
      canType,
      canPress,
      // Both workbench shells print a summary line and a timing receipt once
      // an operation has actually produced something.
      hasResult: /Done —|Completed in/.test(text),
      heading: document.querySelector('h1')?.textContent?.trim() ?? '',
    };
  }, ACTION_LABEL.source);
}

test.describe('Every advertised tool is usable on arrival', () => {
  // One browser engine is enough: this asserts wiring, not rendering.
  test.skip(({ browserName }) => browserName !== 'chromium');
  test.setTimeout(30 * 60 * 1000);

  test(`no dead ends across ${TOOL_URLS.length} tool URLs`, async ({
    browser,
  }) => {
    const queue = [...TOOL_URLS];
    const deadEnds: string[] = [];
    const unreachable: string[] = [];

    const worker = async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      // A tool throwing in the console is a different spec's business.
      page.on('pageerror', () => {});
      for (let url = queue.pop(); url; url = queue.pop()) {
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 25_000 });
          // The workbench shells debounce their auto-run by 250 ms.
          await page.waitForTimeout(900);
          const seen = await probe(page);
          if (!seen.canType && !seen.canPress && !seen.hasResult) {
            deadEnds.push(`${url}  (heading: ${seen.heading || '—'})`);
          }
        } catch (caught) {
          unreachable.push(
            `${url}  (${String(caught).split('\n')[0]?.slice(0, 120)})`,
          );
        }
      }
      await context.close();
    };

    await Promise.all(Array.from({ length: 5 }, worker));

    // Reported together: a URL that would not load is not evidence of health.
    expect(
      unreachable.sort(),
      `${unreachable.length} tool URLs did not load`,
    ).toEqual([]);
    expect(
      deadEnds.sort(),
      `${deadEnds.length} tool URLs render nothing to use: no way to type, ` +
        `no file to drop, no button to press, and no result on screen`,
    ).toEqual([]);
  });
});
