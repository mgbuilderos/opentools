#!/usr/bin/env node
/**
 * Write the service worker's offline payload, and stamp the worker with its id.
 *
 * Why this exists rather than the worker downloading what it needs: every
 * response this site serves carries `connect-src 'none'`, `/sw.js` included,
 * and a worker inherits the policy delivered with its own script. `fetch()`
 * and `cache.add()` inside the worker are refused by our own header. Measured
 * against this build, served with the production headers, in Chromium:
 *
 *   fetch('/site.webmanifest')   TypeError: Failed to fetch   refused
 *   cache.add('/site.webmanifest') TypeError: Failed to fetch refused
 *   importScripts('/file.js')                                 allowed
 *   cache.put(url, new Response(bytes))                       allowed
 *   new DecompressionStream('gzip')                           allowed
 *
 * So the bytes are shipped to the worker as a script and stored from memory.
 * Nothing about the policy changes. See the long note in `public/sw.js`.
 *
 * Output, all into `dist/client`:
 *
 *   sw-precache-index-<build>.js  the paths, a few KB, imported at every start
 *   sw-precache-body-<build>.js   the bytes, imported once inside `install`
 *   sw.js                         the worker, with `<build>` stamped into it
 *
 * `<build>` is a hash of the payload's own bytes — never the clock and never a
 * random id, which is the mistake that threw away the KV cache on every deploy.
 * Any real change renames all three files and the browser installs the new
 * worker.
 *
 * What that does *not* currently buy is a stable id across rebuilds, and it is
 * worth knowing why rather than assuming otherwise. Measured on 2026-09-22:
 * two builds of an identical tree produced different `/_next/static/chunks/*`
 * filenames throughout (`index-CYnqNf_i.js` then `index-Dt_YI4IA.js`), so the
 * prerendered HTML differs, so the payload differs, so this hash differs. The
 * non-determinism is upstream in the bundler, not here; while it lasts, every
 * deploy costs an installed visitor the payload again. That is the same
 * property that already renames every file under the year-long
 * `/_next/static/*` cache rule, so it is a build question rather than a
 * service-worker one.
 *
 * Runs after `prerender-to-assets.mjs`, because it reads what that wrote.
 */
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLIENT = path.join(ROOT, 'dist/client');

if (!existsSync(CLIENT)) {
  process.stderr.write(
    '[SW PRECACHE] dist/client is missing. Run the build first.\n',
  );
  process.exit(1);
}

const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webmanifest', 'application/manifest+json'],
]);

/**
 * The app shell: what an installed app needs before it can show anything, plus
 * the icons a standalone window draws itself with.
 */
const SHELL = [
  '/',
  '/site.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

/**
 * The pages worth holding, and no more.
 *
 * Every path here costs every installed visitor its bytes on every worker
 * update, so this is the share target's five landing pages — a file arriving
 * from the share sheet has to have somewhere to land with no network — plus
 * the page that receives the share itself and the two most-used PDF tools.
 *
 * `/image/background-remover` and `/image/editor` are deliberately absent.
 * They are the two routes served a different, looser policy (`connect-src
 * 'self'`, for the local model's weights), and a cached copy stamped with the
 * `/*` policy below would be a *stricter* page than the real one — it would
 * simply fail to load its model. They also pull a 16MB model that no offline
 * payload should carry.
 */
const PAGES = [
  '/share-target',
  '/pdf/page-tools',
  '/pdf/merge',
  '/pdf/compress',
  '/image/optimize',
  '/data/csv-to-json',
  '/developer/workbench',
  '/file/hash-calculator',
];

/**
 * The policy a cached response is stored with.
 *
 * Read out of `public/_headers` rather than written here, because that file is
 * the only header source the Cloudflare deploy ships — so a cached page is
 * governed by the same bytes as a served one, and cannot quietly fall behind
 * it. A synthesised response carries no origin headers of its own, and a page
 * served offline without `connect-src 'none'` would be the one page on this
 * site that is not sealed.
 */
function policyFromHeaders() {
  const headers = readFileSync(path.join(ROOT, 'public/_headers'), 'utf8');
  const lines = headers.split('\n');
  const start = lines.findIndex((line) => line.trim() === '/*');
  if (start === -1) {
    process.stderr.write(
      '[SW PRECACHE] BLOCKED — public/_headers has no /* rule to read the policy from.\n',
    );
    process.exit(1);
  }
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    // The rule ends at the next unindented line.
    if (line.trim() && !/^\s/u.test(line)) break;
    const match = /^\s*Content-Security-Policy:\s*(.+?)\s*$/u.exec(line);
    if (match) return match[1];
  }
  process.stderr.write(
    '[SW PRECACHE] BLOCKED — the /* rule in public/_headers sets no Content-Security-Policy.\n',
  );
  process.exit(1);
}

/** Local file for a path, following the asset layer's own resolution order. */
function fileFor(urlPath) {
  const clean = urlPath.replace(/^\/+|\/+$/gu, '');
  if (clean === '') return path.join(CLIENT, 'index.html');
  const candidates = path.extname(clean)
    ? [path.join(CLIENT, clean)]
    : [
        path.join(CLIENT, `${clean}.html`),
        path.join(CLIENT, clean, 'index.html'),
      ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * Every `/_next/static/*` script and stylesheet the given pages reference.
 *
 * Read out of the built HTML rather than listed by hand: the filenames carry
 * content hashes and change on most builds, so any hand-written list would be
 * wrong by the next deploy and the pages would open offline with no styles.
 */
function referencedAssets(htmlFiles) {
  const found = new Set();
  for (const file of htmlFiles) {
    if (!file.endsWith('.html')) continue;
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(
      /["'](\/_next\/static\/[A-Za-z0-9/_.-]+\.(?:js|css))["']/gu,
    )) {
      found.add(match[1]);
    }
  }
  return [...found].sort((left, right) => left.localeCompare(right));
}

const routes = [...SHELL, ...PAGES];
const missing = routes.filter((route) => fileFor(route) === null);
if (missing.length) {
  process.stderr.write(
    `[SW PRECACHE] BLOCKED — ${missing.length} precache path(s) have no built file:\n${missing
      .map((entry) => `- ${entry}`)
      .join(
        '\n',
      )}\nEither the route was renamed or the build did not prerender it.\n`,
  );
  process.exit(1);
}

const assets = referencedAssets(routes.map(fileFor));
const paths = [...routes, ...assets];

const entries = [];
const chunks = [];
let offset = 0;

for (const entryPath of paths) {
  const file = fileFor(entryPath);
  if (!file) continue;
  const bytes = readFileSync(file);
  entries.push({
    u: entryPath,
    t: CONTENT_TYPES.get(path.extname(file)) ?? 'application/octet-stream',
    o: offset,
    l: bytes.length,
  });
  chunks.push(bytes);
  offset += bytes.length;
}

const blob = Buffer.concat(chunks);
const gzipped = gzipSync(blob, { level: 9 });
const payload = gzipped.toString('base64');
const csp = policyFromHeaders();
const build = createHash('sha256')
  .update(gzipped)
  .update(csp)
  .digest('hex')
  .slice(0, 16);

writeFileSync(
  path.join(CLIENT, `sw-precache-index-${build}.js`),
  `self.__OPENTOOLS_PRECACHE_INDEX=${JSON.stringify(entries.map((entry) => entry.u))};\n`,
);
writeFileSync(
  path.join(CLIENT, `sw-precache-body-${build}.js`),
  `self.__OPENTOOLS_PRECACHE_BODY={csp:${JSON.stringify(csp)},entries:${JSON.stringify(
    entries,
  )},payload:"${payload}"};\n`,
);

const workerFile = path.join(CLIENT, 'sw.js');
const worker = readFileSync(workerFile, 'utf8');
const placeholder = '__OPENTOOLS_PRECACHE_BUILD__';
if (!worker.includes(placeholder)) {
  process.stderr.write(
    `[SW PRECACHE] BLOCKED — ${placeholder} is not in dist/client/sw.js, so the worker would ship unstamped and never precache.\n`,
  );
  process.exit(1);
}
writeFileSync(workerFile, worker.split(placeholder).join(build));

const mb = (value) => `${(value / 1_000_000).toFixed(2)} MB`;
process.stdout.write(
  `  Service worker precache: ${entries.length} files (${routes.length} pages and shell, ${assets.length} assets) — ${mb(
    blob.length,
  )} raw, ${mb(gzipped.length)} gzipped, build ${build}\n`,
);
