#!/usr/bin/env node
/**
 * Fails the build when a URL the site publishes has no file to answer it.
 *
 * Every entry in `sitemap.xml` is a URL handed to Google. If the build did not
 * produce a file for one, the Worker renders it per request on a 10ms CPU
 * budget -- which is exactly how 183 of 670 URLs came to return 503 on
 * 2026-09-20 while the build reported success. The build reported success
 * because nothing compared what it promised against what it produced.
 *
 * This is that comparison. It runs on every build, so no deploy from any
 * branch can repeat it.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLIENT = path.join(ROOT, 'dist/client');
const SITEMAP = path.join(CLIENT, 'sitemap.xml');

if (!existsSync(SITEMAP)) {
  console.error(
    '\n  verify-static-coverage: dist/client/sitemap.xml is missing.\n' +
      '  It is written by scripts/prerender-to-assets.mjs; without it the\n' +
      '  Worker serves the sitemap by rebuilding it on every request.\n',
  );
  process.exit(1);
}

const paths = [
  ...readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g),
].map((match) => new URL(match[1]).pathname);

/** The files Cloudflare's asset layer will try, in its own order. */
function candidates(urlPath) {
  const clean = urlPath.replace(/^\/+|\/+$/g, '');
  if (clean === '') return ['index.html'];
  return [`${clean}.html`, path.join(clean, 'index.html')];
}

const missing = paths.filter(
  (urlPath) =>
    !candidates(urlPath).some((file) => existsSync(path.join(CLIENT, file))),
);

if (missing.length > 0) {
  console.error(
    `\n  verify-static-coverage: ${missing.length} of ${paths.length} sitemap ` +
      'URLs have no file.\n\n' +
      '  Each one renders per request on a Worker capped at 10ms CPU, which\n' +
      '  returns 503 under crawl load. Usually the route is missing from a\n' +
      '  `generateStaticParams`, or was added to the sitemap without a page.\n\n' +
      missing.map((urlPath) => `    ${urlPath}`).join('\n') +
      '\n',
  );
  process.exit(1);
}

console.log(`  Verified ${paths.length} sitemap URLs all have a file to serve`);
