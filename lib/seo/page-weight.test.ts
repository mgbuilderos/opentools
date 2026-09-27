import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * How much JavaScript a page makes the browser fetch before it can be used.
 *
 * ## What this found
 *
 * Measured 2026-09-26 against a real build: the **median** page ships
 * **3,653 KB** of eager JavaScript. Not the worst page — the middle one. The
 * lightest page on the site is 532 KB, so roughly three megabytes of the
 * typical page is one import chain:
 *
 * ```
 * components/tool-explainer.tsx          (132 lines, no interactivity at all)
 *   -> lib/seo/guide-content.ts          1.81 MB of hand-written explainers
 *        -> lib/seo/live-tools.ts        980 KB catalogue of all 568 tools
 * ```
 *
 * `guide-content.ts` holds every tool's explainer, and `ToolExplainerSection`
 * resolves one of them by id *in the browser*, so every page carrying an
 * explainer downloads all of them plus the whole catalogue: **2.84 MB, on
 * 1,209 of 1,545 pages.** `/developer/uuid-generator` ships 3.66 MB of
 * JavaScript to render a UUID.
 *
 * The text itself is prerendered into the HTML, so the payload buys nothing a
 * reader can see — it is there to hydrate a component with no state, no
 * effects and no handlers.
 *
 * ## Why it is a test and not a ticket
 *
 * This is the same instrument as `cache-budget.test.ts`, for the same reason:
 * a cost nobody measures grows until something breaks, and by then nobody can
 * say which change caused it. The numbers below are a ratchet, not a target —
 * they are today's figures, so the size can fall freely and cannot rise.
 *
 * It matters beyond the bytes. Core Web Vitals is a ranking input, this site
 * has 0 Search Console clicks against 134 indexed URLs, and 3.6 MB of
 * JavaScript on a phone is not a page Google has any reason to rank.
 *
 * ## The fix, diagnosed 2026-09-27
 *
 * It is two separable halves, and the smaller one is much cheaper than it
 * looks.
 *
 * **The 980 KB catalogue half.** `guide-content.ts` is ~19,000 lines and
 * references `LIVE_TOOL_CATALOG` in exactly two places — lines 18677 and
 * 18689, inside `getToolExplainerById` and `getToolExplainer`. Both use it for
 * one thing only: mapping a tool id or URL to the slug that keys
 * `GUIDE_DETAILS`. Nothing else in the client's reach needs it.
 * (`getLiveToolBySlug` at 18919 is used by `getGuideBySlug`, which only
 * `app/guides/[slug]/page.tsx` imports — server-side.) Replace those two
 * lookups with a precomputed id→slug index of the ~105 slugs that actually
 * have an explainer, and Rollup can drop the catalogue from the client graph
 * entirely. Roughly 10 KB of generated index in place of 980 KB, on 1,209
 * pages, with no change to any caller's API.
 *
 * **The 1.81 MB corpus half.** `GUIDE_DETAILS` spans lines 167–18630 and is
 * the explainer text itself. This one cannot be solved by passing a single
 * pre-resolved detail down, which is the obvious fix and the wrong one: the
 * workbenches switch tools *client-side* and re-render the explainer for
 * whichever tool is selected, so a fixed block of prose would be wrong the
 * moment somebody switched — `file-workbench-tool.tsx` says so in a comment
 * beside the call. What a server page can pass is a map of only the
 * explainers belonging to that page's own operations, which for most pages is
 * one entry and for a workbench is a handful.
 *
 * Only two client modules import `guide-content` at all —
 * `components/tool-explainer.tsx` and `components/utility-tools.tsx` — so the
 * blast radius is smaller than 1,209 pages suggests.
 *
 * Expected result: the median page falls from ~3,653 KB to ~810 KB.
 */
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const CLIENT_DIR = path.join(projectRoot, 'dist', 'client');

/** Today's measurement, with a little headroom. Lower these; never raise them. */
const WORST_PAGE_KB = 3_800;
const MEDIAN_PAGE_KB = 3_700;
const PAGES_OVER_1MB = 1_218;

function htmlFiles(directory: string, found: string[] = []): string[] {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) htmlFiles(absolute, found);
    else if (entry.endsWith('.html')) found.push(absolute);
  }
  return found;
}

/**
 * Eager JavaScript only: `<script src>` and `<link rel=modulepreload>`.
 *
 * Both are fetched before the page is interactive, which is the cost being
 * measured. A chunk named in a runtime import map but never requested is not
 * counted — an earlier version of this measurement did count those and
 * overstated the problem by including pages that never download the chunk.
 */
const weighed: { route: string; kb: number }[] = [];

beforeAll(() => {
  const sizes = new Map<string, number>();
  const bytesOf = (file: string) => {
    if (!sizes.has(file))
      sizes.set(file, existsSync(file) ? statSync(file).size : 0);
    return sizes.get(file)!;
  };

  for (const file of htmlFiles(CLIENT_DIR)) {
    const markup = readFileSync(file, 'utf8');
    const sources = new Set(
      [...markup.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/gu)].map(
        (match) => match[1]!,
      ),
    );
    let bytes = 0;
    for (const source of sources)
      bytes += bytesOf(path.join(CLIENT_DIR, source));
    weighed.push({
      route: path.relative(CLIENT_DIR, file).replace(/\.html$/u, '') || '/',
      kb: Math.round(bytes / 1024),
    });
  }
  weighed.sort((a, b) => b.kb - a.kb);
}, 120_000);

describe('a page does not make the browser fetch more JavaScript than it did', () => {
  it('has a build to weigh', () => {
    expect(
      existsSync(CLIENT_DIR),
      'run `npm run build` before this suite',
    ).toBe(true);
    // Guards the guard: an empty dist would pass every budget below.
    expect(weighed.length).toBeGreaterThan(1_000);
  });

  it('keeps the heaviest page inside its budget', () => {
    const worst = weighed[0]!;
    expect(
      worst.kb,
      `${worst.route} now fetches ${worst.kb} KB of JavaScript, over the ` +
        `${WORST_PAGE_KB} KB ceiling. Something was added to the eager graph ` +
        `of the heaviest page. See this file's header for the import chain ` +
        `that already costs ~2.8 MB.`,
    ).toBeLessThanOrEqual(WORST_PAGE_KB);
  });

  /*
   * The median, not the mean. One enormous page is a page to fix; a median of
   * 3.6 MB means the site's normal state is heavy, which is the finding.
   */
  it('keeps the typical page inside its budget', () => {
    const median = weighed[Math.floor(weighed.length / 2)]!;
    expect(
      median.kb,
      `the median page now fetches ${median.kb} KB, over the ` +
        `${MEDIAN_PAGE_KB} KB ceiling. This number falling is the goal; it ` +
        `rising means a cost was added to most of the site at once.`,
    ).toBeLessThanOrEqual(MEDIAN_PAGE_KB);
  });

  it('does not spread the weight to more pages', () => {
    const heavy = weighed.filter(({ kb }) => kb > 1_024);
    expect(
      heavy.length,
      `${heavy.length} pages now fetch over 1 MB of JavaScript, up from ` +
        `${PAGES_OVER_1MB}. A client component that statically imports ` +
        `lib/seo/guide-content or lib/seo/live-tools pulls 2.84 MB onto ` +
        `every page that renders it — check what was added to the eager ` +
        `graph rather than raising this number.`,
    ).toBeLessThanOrEqual(PAGES_OVER_1MB);
  });

  /*
   * The lightest page proves the weight is not inherent to the framework:
   * whatever /text/case-converter manages, every page could manage. Without
   * this, a change that made *every* page heavy would still satisfy the
   * ratchets above by moving them together.
   */
  it('still has pages that are genuinely light', () => {
    const lightest = weighed[weighed.length - 1]!;
    expect(
      lightest.kb,
      `the lightest page is now ${lightest.kb} KB. If even this one is heavy, ` +
        `the cost moved into the shared graph and every budget above became ` +
        `easier to pass for the wrong reason.`,
    ).toBeLessThanOrEqual(600);
  });
});
