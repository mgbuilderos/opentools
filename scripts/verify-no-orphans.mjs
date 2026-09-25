#!/usr/bin/env node
/**
 * Fails the build when a URL the site publishes has no inbound internal link.
 *
 * A page nothing links to is reachable only from the sitemap. That is the
 * weakest discovery signal Google accepts: minimal crawl priority, and no
 * internal authority from anywhere, because authority only flows along links.
 * On 2026-09-23 a sweep of all 1,392 live URLs found 12 in that state while
 * Search Console reported 134 indexed against 552 not indexed.
 *
 * WHY THIS READS THE BUILT HTML AND NOT THE SOURCE. The first attempt at this
 * guard rebuilt the link graph from the same modules the pages import, and
 * reported 771 orphans against the 12 that really exist -- the model could not
 * see the guide pages, the related-tool cards or the conversion hubs, all of
 * which link tools. A model of the graph is a second implementation of the
 * site, and it is wrong the moment it disagrees. `dist/client` is the bytes a
 * crawler will actually get, so it is asked instead: run against the build of
 * 2026-09-23 this reported exactly the 12 URLs the live sweep reported, and
 * zero after the fix in `lib/seo/internal-linking-graph.ts`.
 *
 * It sits beside `verify-static-coverage.mjs` for the same reason that one
 * exists: unit tests cannot see rendered output, and the last two SEO faults
 * on this site were both invisible in source and obvious in the served bytes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLIENT = path.join(ROOT, 'dist/client');
const SITEMAP = path.join(CLIENT, 'sitemap.xml');

if (!existsSync(SITEMAP)) {
  console.error(
    '\n  verify-no-orphans: dist/client/sitemap.xml is missing.\n' +
      '  It is written by scripts/prerender-to-assets.mjs.\n',
  );
  process.exit(1);
}

const sitemapPaths = [
  ...readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g),
].map((match) => new URL(match[1]).pathname.replace(/\/$/, '') || '/');

if (sitemapPaths.length === 0) {
  console.error('\n  verify-no-orphans: the sitemap is empty.\n');
  process.exit(1);
}

function htmlFiles(directory, found = []) {
  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) htmlFiles(absolute, found);
    else if (entry.endsWith('.html')) found.push(absolute);
  }
  return found;
}

/**
 * Only a bare path counts. `href="/developer/advanced?tool=json-to-zod"`
 * addresses an operation inside a page, not the page, and Google treats the
 * query string as part of the URL -- so it is no link to `/developer/advanced`
 * at all. The same exclusion is what `scripts/audit-360.mjs` applies to the
 * live site, which is why the two agree.
 */
const linkTargets = new Set();
for (const file of htmlFiles(CLIENT)) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    linkTargets.add(match[1].replace(/\/$/, '') || '/');
  }
}

const orphans = sitemapPaths.filter(
  (urlPath) => urlPath !== '/' && !linkTargets.has(urlPath),
);

if (orphans.length > 0) {
  console.error(
    `\n  verify-no-orphans: ${orphans.length} of ${sitemapPaths.length} ` +
      'sitemap URLs have no inbound internal link.\n\n' +
      '  Each one is reachable only from the sitemap, so it gets minimal\n' +
      '  crawl priority and no internal authority. Usually the route is in\n' +
      '  LIVE_TOOL_ROUTES but not in lib/seo/tool-catalog-data.ts, so no\n' +
      '  catalog-driven surface can reach it. Link it from somewhere it\n' +
      '  genuinely belongs -- see CATEGORY_HUB_LINKS in\n' +
      '  lib/seo/internal-linking-graph.ts.\n\n' +
      orphans.map((urlPath) => `    ${urlPath}`).join('\n') +
      '\n',
  );
  process.exit(1);
}

console.log(
  `  Verified ${sitemapPaths.length} sitemap URLs all have an inbound link`,
);
