#!/usr/bin/env node
/**
 * Three fault classes the 2026-09-23 360 sweep found, guarded against return.
 *
 *   1. 78 of 1,413 live URLs shipped no `og:image`. Every one was a page that
 *      declares its own `openGraph` block: Next.js replaces the layout's block
 *      whole rather than merging it field by field, so naming `title` and
 *      `description` there silently dropped the image `app/layout.tsx` sets,
 *      while `twitter.card` stayed `summary_large_image`. Platforms reserve
 *      that slot and render it blank. The site's distribution plan is people
 *      posting links, so this was a tax on every share.
 *
 *   2. 52 URLs skipped a heading level -- `h1` then `h3`, or `h2` then `h4`.
 *      A reader moving through a page by heading level hits the gap and cannot
 *      tell whether they missed a section or the page simply has none there.
 *
 *   3. 1,335 of the same 1,413 URLs shipped ONE `og:title` between them --
 *      `OpenTools — Fast, Private Browser Utilities` -- with 79 distinct
 *      values across the whole site. The cause is the same Next.js rule as
 *      fault 1 read from the other side: a tool page that declares no
 *      `openGraph` inherits the layout's whole, so the site-level headline
 *      stood in for every tool. Fault 1 was caught by asking whether the tag
 *      is present, and it was present on all 1,335 -- which is why this needs
 *      a check of its own. The fix is in `app/layout.tsx`: state no `title`,
 *      `description` or absolute `url` there and each page fills its own.
 *
 * The third check is a population check for the same reason the other two are:
 * no page file looked wrong, and the fault existed only across the set.
 *
 * WHY THIS IS A BUILD STEP AND NOT ONLY A UNIT TEST. Neither fault was visible
 * in source. Both live in the merged metadata and the rendered markup, which
 * is the same reason `scripts/verify-no-orphans.mjs` reads `dist/client` and
 * `lib/seo/orphan-coverage.test.ts` says so in as many words: a model of the
 * rendered page built from the modules the pages import is a second, wrong
 * implementation of the site. This asks the bytes.
 *
 * The two detectors are exported so `lib/seo/share-card-coverage.test.ts` and
 * `lib/a11y/heading-order.test.ts` can prove they still detect what they were
 * written for, and re-run them over the whole population when a build is
 * present. A guard that has quietly become a no-op is worse than none.
 *
 *   node scripts/check-share-and-heading-order.mjs
 *
 * Exit 0 only when every sitemap URL passes both checks.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
export const CLIENT_DIR = path.join(ROOT, 'dist/client');

/**
 * The three tags a link preview needs. `og:url` and `og:type` are not here:
 * a card renders without them, and these three are what turns a bare URL into
 * a titled, described, illustrated card on every platform that reads any of it.
 */
export const REQUIRED_SHARE_TAGS = ['og:title', 'og:description', 'og:image'];

/**
 * Which of the required Open Graph tags this HTML does not carry.
 *
 * Matched exactly as `scripts/audit-360.mjs` matches them against the live
 * site, so a page this passes is a page the sweep passes. Next.js emits
 * `property="og:image"` on its own line; the attribute, not the element, is
 * what is looked for.
 */
export function missingShareTags(html) {
  return REQUIRED_SHARE_TAGS.filter(
    (property) => !new RegExp(`property="${property}"`).test(html),
  );
}

/**
 * The `og:title` this HTML serves, or null.
 *
 * Read with the same attribute-order assumption as `missingShareTags`, and
 * pinned by the same test, because a matcher that silently stops matching
 * would report a site of 1,413 identical cards as a site of none.
 */
export function ogTitle(html) {
  const found = html.match(/<meta property="og:title" content="([^"]*)"/);
  return found ? found[1] : null;
}

/**
 * Every `og:title` that more than one sitemap URL serves.
 *
 * Uniqueness, not a ratio. `lib/seo/meta-lengths.test.ts` already holds
 * `<title>` and `<meta name="description">` to exactly this rule across the
 * same population, and the card is the same claim made to a different reader:
 * two links that preview identically are two links a reader cannot tell apart
 * in a feed. Reported one row per shared value rather than one per page --
 * the 2026-09-23 fault would otherwise print 1,334 lines of the same fact.
 *
 * Pages with no `og:title` at all are not counted here; `missingShareTags`
 * already fails the build for those, and one fault should be reported once.
 */
export function duplicateOgTitles(pages) {
  const routesByTitle = new Map();
  for (const { urlPath, html } of pages) {
    const title = ogTitle(html);
    if (title === null) continue;
    routesByTitle.set(title, [...(routesByTitle.get(title) ?? []), urlPath]);
  }
  return [...routesByTitle.entries()]
    .filter(([, routes]) => routes.length > 1)
    .map(([title, routes]) => ({ title, routes: routes.sort() }))
    .sort((a, b) => b.routes.length - a.routes.length);
}

/**
 * The first place this HTML jumps more than one heading level, or null.
 *
 * Descending freely is fine -- an `h4` followed by an `h2` closes a subsection
 * and opens a new one, which is exactly what outlines do. Only ascending by
 * more than one is a gap, because it implies a level that was never announced.
 */
export function firstHeadingSkip(html) {
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((match) =>
    Number(match[1]),
  );
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      return `h${levels[i - 1]} followed by h${levels[i]}`;
    }
  }
  return null;
}

/** The files Cloudflare's asset layer will try, in its own order. */
function candidates(urlPath) {
  const clean = urlPath.replace(/^\/+|\/+$/g, '');
  if (clean === '') return ['index.html'];
  return [`${clean}.html`, path.join(clean, 'index.html')];
}

/**
 * Every sitemap URL paired with the HTML the build produced for it.
 *
 * A URL with no file is not reported here. `scripts/verify-static-coverage.mjs`
 * already fails the build for that, and repeating it would report one fault as
 * three.
 */
export function renderedPages(clientDir = CLIENT_DIR) {
  const sitemap = path.join(clientDir, 'sitemap.xml');
  if (!existsSync(sitemap)) return null;
  return [...readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname)
    .flatMap((urlPath) => {
      const file = candidates(urlPath)
        .map((candidate) => path.join(clientDir, candidate))
        .find((candidate) => existsSync(candidate));
      return file ? [{ urlPath, html: readFileSync(file, 'utf8') }] : [];
    });
}

/** Every fault of both classes, over every sitemap URL that has a file. */
export function auditRenderedPages(clientDir = CLIENT_DIR) {
  const pages = renderedPages(clientDir);
  if (pages === null) return null;
  const faults = [];
  for (const { urlPath, html } of pages) {
    const missing = missingShareTags(html);
    if (missing.length > 0) {
      faults.push({
        urlPath,
        check: 'share-tags',
        detail: `missing ${missing.join(', ')}`,
      });
    }
    const skip = firstHeadingSkip(html);
    if (skip) faults.push({ urlPath, check: 'heading-order', detail: skip });
  }
  for (const { title, routes } of duplicateOgTitles(pages)) {
    faults.push({
      urlPath: routes[0],
      check: 'duplicate-og-title',
      detail:
        `${routes.length} URLs share "${title}"` +
        ` (${routes.slice(1, 4).join(', ')}${routes.length > 4 ? ', ...' : ''})`,
    });
  }
  return { checked: pages.length, faults };
}

function main() {
  if (!existsSync(path.join(CLIENT_DIR, 'sitemap.xml'))) {
    console.error(
      '\n  check-share-and-heading-order: dist/client/sitemap.xml is missing.\n' +
        '  It is written by scripts/prerender-to-assets.mjs; this check has\n' +
        '  nothing to read without it.\n',
    );
    process.exit(1);
  }

  const { checked, faults } = auditRenderedPages();
  if (faults.length > 0) {
    const byCheck = new Map();
    for (const fault of faults) {
      byCheck.set(fault.check, [...(byCheck.get(fault.check) ?? []), fault]);
    }
    console.error(
      `\n  check-share-and-heading-order: ${faults.length} faults across ` +
        `${checked} sitemap URLs.\n`,
    );
    for (const [check, list] of byCheck) {
      console.error(`    ${list.length} x ${check}`);
      for (const fault of list.slice(0, 8)) {
        console.error(`      ${fault.urlPath} : ${fault.detail}`);
      }
      if (list.length > 8) {
        console.error(`      ... and ${list.length - 8} more`);
      }
      console.error('');
    }
    console.error(
      '  A page that declares its own `openGraph` must declare `images` too:\n' +
        '  Next.js replaces the layout block whole, it does not merge it.\n' +
        '  Use `shareImages()` from lib/seo/share-images.ts.\n\n' +
        '  Two URLs may not share an `og:title`. If thousands do, the cause is\n' +
        '  `app/layout.tsx` stating `openGraph.title` again: every page that\n' +
        '  declares no block of its own then inherits that one headline. Leave\n' +
        '  `title`, `description` and an absolute `url` out of the layout and\n' +
        '  each page fills them from its own metadata.\n\n' +
        '  A heading level may descend by any amount but climb by only one.\n' +
        '  Fix the level in the markup and let the class size it; do not\n' +
        '  restyle a correct heading to look like the wrong one.\n',
    );
    process.exit(1);
  }

  console.log(
    `  Verified ${checked} sitemap URLs ship a full share card with its own ` +
      `og:title and skip no heading level`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
