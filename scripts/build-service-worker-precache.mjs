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
 * That id is now also stable across rebuilds of the same tree, which it was
 * not until 2026-09-23. Two builds of an identical tree used to produce
 * different `/_next/static/chunks/*` filenames throughout (`index-CYnqNf_i.js`
 * then `index-Dt_YI4IA.js`), so the prerendered HTML differed, so the payload
 * differed, so this hash differed -- and every deploy, including one that
 * changed nothing, cost every installed visitor the whole payload again. The
 * cause was upstream of this script and is fixed there: see
 * `lib/build/build-identity.ts`. A deploy of unchanged code now leaves an
 * installed worker alone, and leaves the year-long `immutable` rule for
 * `/_next/static/*` in `public/_headers` holding files a returning visitor
 * already has.
 *
 * THIS USED TO HOLD ONLY FROM A CLEAN TREE, AND NO LONGER DOES. Until
 * 2026-10-02 `resolvePinnedBuildId` returned `null` for a dirty tree, `null`
 * restored vinext's random id, and the chunk hashes moved again: measured on a
 * worktree with four files edited, two builds renamed **18 of the 85 precached
 * paths** (`app-shell`, `catalog`, `index`, `image-optimize-tool`,
 * `pdf-compress-tool` and eight more), which renamed every chunk the 10
 * precached HTML pages reference -- 28 of 85 entries different, a new payload
 * hash, a new worker. Anyone asking "how many KB does my change add here" from
 * that state saw the whole 1.46 MB move and read it as a regression in their
 * own change. The build ID is now a digest of the build's own inputs, so
 * uncommitted work gets a stable id of its own and two builds of it agree.
 * Measuring from a dirty tree is now the same measurement as from a clean one,
 * and an edit under `docs/` or `e2e/` moves nothing here at all.
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
  /*
    The one page on this site whose whole subject is working with no network,
    so it is the one page that would be absurd to leave out of the payload.
    `/pdf/compress-offline` mounts the same compressor as `/pdf/compress` and
    adds a readiness panel that reports, from this cache, whether the network
    can be switched off yet -- a panel served from the network on a page about
    not needing the network. `lib/seo/tool-page-depth.test.ts` reads this array
    and refuses an offline claim for any route absent from it, and
    `e2e/share-target.spec.ts` loads it with the browser disconnected.
  */
  '/pdf/compress-offline',
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

/**
 * Every `/_next/static/workers/*` script the precached pages can start.
 *
 * MEASURED, 2026-09-24, and the reason this function exists. `/pdf/compress`
 * has been in `PAGES` since this file was written, and with the network off it
 * *loaded* — and could not compress anything. Its engine is started with
 * `new Worker(new URL('/_next/static/workers/pdf-merge.worker-<hash>.js'))`,
 * and that path appears nowhere in any HTML: it is a string inside
 * `chunks/pdf-compress-tool-<hash>.js`, so `referencedAssets` above never saw
 * it, so it was never held, so the first action a visitor took offline failed
 * at the one step the page exists for. `e2e/share-target.spec.ts` proved
 * exactly what it asserted — a 200 and a working file input — and no more.
 *
 * So the referenced scripts are read for the workers they start. Deliberately
 * only `/_next/static/workers/*`, not every `/_next/static/*` string a bundle
 * mentions: that would follow the whole lazy-import graph and hand every
 * installed visitor megabytes on every worker update. A worker is the narrow
 * case where a tool cannot do its job at all without one more file, and these
 * bundles are self-contained — `pdf-merge.worker` imports nothing (536 KB
 * raw, 215 KB gzipped, shared by the compressor, the merger and the page
 * tools, so one entry makes three tools work rather than one).
 *
 * ONE LEVEL IS ENOUGH, RE-MEASURED 2026-09-29, and this is the answer to the
 * obvious worry about the function above: it reads the assets the HTML names
 * and no further, so a worker started from a chunk that is only reached by a
 * lazy import would be missed. Against this build there is no such chunk. Take
 * each precached page, take the `/_next/static/*.js|css` its HTML names, then
 * close over every further module those files import — both the absolute
 * `/_next/static/...` form and the relative `./chunk-<hash>.js` form the
 * bundler actually emits between chunks. The closure adds **nothing**: for all
 * nine pages the set of modules reachable at runtime is exactly the set the
 * HTML already lists (`/pdf/compress`: 47 in the HTML, 47 in the closure). This
 * build modulepreloads a route's whole graph, so there is no second level for a
 * worker URL to hide in. Worth re-running rather than trusting if the bundler or
 * its chunking strategy changes; the shape of the check is in this paragraph.
 *
 * Two smaller facts from the same measurement, both load-bearing. Every
 * `new Worker(new URL(...))` target is emitted as an **absolute**
 * `/_next/static/workers/...` string — zero relative worker references across
 * the build — so the pattern below cannot miss one by form. And the precached
 * pages reference **no** `/_next/static/*` file that is not `.js` or `.css`: no
 * font, no wasm, no `.mjs`, so the extensions `referencedAssets` matches are the
 * whole surface for these nine routes rather than a convenient subset.
 *
 * What proves the outcome rather than the reasoning is
 * `e2e/offline-cold-start.spec.ts`: every route in `PAGES` opened from this
 * payload with the browser disconnected and then made to finish a real piece of
 * work, failing on any request the payload does not hold. That file reads
 * `PAGES` below, so a page added here without being run offline turns it red.
 */
function referencedWorkers(assetFiles) {
  const found = new Set();
  for (const file of assetFiles) {
    if (!file || !file.endsWith('.js')) continue;
    const code = readFileSync(file, 'utf8');
    for (const match of code.matchAll(
      /\/_next\/static\/workers\/[A-Za-z0-9/_.-]+\.js/gu,
    )) {
      found.add(match[0]);
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
const workers = referencedWorkers(assets.map(fileFor));
const paths = [...routes, ...assets, ...workers];

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
