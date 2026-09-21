/**
 * Service worker — the Android share target, and offline use, both built to
 * work *with* `connect-src 'none'` rather than asking for it to be relaxed.
 *
 * Read this before changing anything. Two earlier versions of this file are
 * the reason it is written the way it is.
 *
 * ## The constraint, and what it actually forbids
 *
 * Every response this site serves carries `connect-src 'none'`, `/sw.js`
 * included, and a worker inherits the policy delivered with its own script.
 * That header is the product's one real promise, `e2e/egress-proof.spec.ts`
 * asserts it on every build, and loosening it on a tool route is classed as a
 * vulnerability in `.github/SECURITY.md`. Nothing here changes it.
 *
 * What the policy stops, and what it leaves alone:
 *
 *   fetch('/anything')              refused   — connect-src
 *   cache.add(url) / addAll(url)    refused   — connect-src (they fetch for you)
 *   importScripts('/file.js')       allowed   — script-src 'self'
 *   cache.put(request, response)    allowed   — stores a Response already held
 *   new DecompressionStream('gzip') allowed   — a local transform
 *   request.formData()              allowed   — parses a body already received
 *
 * So caching is not impossible here; *fetching* is. The bytes simply have to
 * arrive as a script instead of as a download.
 * `scripts/build-service-worker-precache.mjs` writes them out at build time,
 * this file imports them once during `install`, and `cache.put` stores them.
 *
 * ## Cached responses carry the policy with them
 *
 * A response this worker synthesises does not come from the origin, so it does
 * not arrive with the origin's headers. Serving a cached page without them
 * would hand someone the one page on this site that is *not* sealed — offline
 * today, and on any future engine where `navigator.onLine` lies. So the build
 * copies the `/*` policy out of `public/_headers`, the authoritative header
 * source for the deploy, and every cached response is stored with it. The
 * cached page is governed by the same CSP as the served one, byte for byte;
 * `lib/service-worker-precache.test.ts` fails the build if the two drift.
 *
 * ## The rule that matters
 *
 * **Never call `respondWith` unless there is something real to respond with.**
 *
 * The first version of this worker was network-first with an offline notice as
 * its last resort. Its `fetch` was refused by our own header, so it always
 * threw, so the notice always won: a visitor's first page loaded, the worker
 * claimed the page, and **every navigation after that read "You are offline"
 * while the network was perfectly healthy.** It reached no log — the origin
 * kept answering 200 to every probe, because the failure was manufactured
 * inside the visitor's browser.
 *
 * This version cannot repeat that, by construction. It answers exactly two
 * kinds of request and steps aside from everything else:
 *
 *   1. A POST to `/share-target`, which only the OS share sheet ever sends,
 *      and which has no server behaviour to fall back to.
 *   2. A GET the browser has already told us it cannot make, because it
 *      reports itself offline, for a path we hold bytes for.
 *
 *      if (self.navigator.onLine) return;   // step aside, always
 *
 * `navigator.onLine` is unreliable in one direction only — `true` can mean a
 * captive portal or a dead uplink, while `false` genuinely means the browser
 * has no network. This worker acts solely on `false`. An online visitor is
 * therefore served exactly as they would be with no worker installed, and the
 * worst a bug in the offline path can do is fail to rescue a page that was
 * already failing.
 *
 * Do not replace that with a cache-first or network-first strategy to shave
 * milliseconds: the measured benefit is zero (HTML is edge-cached and
 * `/_next/static/*` is immutable for a year) and the cost of getting it wrong
 * is the entire site, silently, for everyone who has ever visited.
 */

/**
 * Stamped by `scripts/build-service-worker-precache.mjs` with a hash of the
 * payload it wrote. An unstamped worker — this file served straight out of
 * `public/` without a build — simply has no offline payload to import, and
 * says so through `STAMPED` rather than throwing on a missing file.
 */
const BUILD = '__OPENTOOLS_PRECACHE_BUILD__';
const STAMPED = !BUILD.startsWith('__OPENTOOLS');
const CACHE = `opentools-offline-${BUILD}`;

/**
 * The paths this worker holds bytes for, known synchronously.
 *
 * `respondWith` has to be called synchronously, before any cache can be
 * consulted, so the decision to answer cannot wait on an async lookup. The
 * index is a few KB of paths imported at every worker start; the bytes
 * themselves are a separate file imported once, inside `install`.
 */
let INDEX = new Set();
if (STAMPED) {
  try {
    importScripts(`/sw-precache-index-${BUILD}.js`);
    INDEX = new Set(self.__OPENTOOLS_PRECACHE_INDEX || []);
  } catch {
    // No index, so nothing is ever answered from cache and every request is
    // left to the browser. The site works; it just will not work offline.
  }
}

/* ------------------------------------------------------------------ *
 * The share target
 * ------------------------------------------------------------------ */

/**
 * Where a shared file is handed to, by kind.
 *
 * Mirrors the `isPrimary` destination of `components/smart-dropzone-actions.ts`
 * — the answer this product already gives to "someone handed us this kind of
 * file, what do they most likely want" — so the share sheet and the dropzone
 * cannot disagree. `lib/share-routing.test.ts` fails if they drift.
 *
 * Kept as a literal rather than imported because this file is served verbatim
 * out of `public/` and has no module graph to import through.
 */
const SHARE_ROUTES = {
  pdf: '/pdf/page-tools?tool=rotate-pdf',
  image: '/image/optimize',
  csv: '/data/csv-to-json',
  json: '/developer/workbench?tool=json-format',
  'generic-file': '/file/hash-calculator',
};

const SHARE_TARGET_PATH = '/share-target';

/** The marker that tells the page a file is waiting. See `lib/file-handoff.ts`. */
const HANDOFF_FLAG = 'shared';

/* The handoff record, exactly as `lib/file-handoff.ts` reads it back. */
const HANDOFF_DATABASE = 'opentools-handoff';
const HANDOFF_STORE = 'pending';
const HANDOFF_KEY = 'file';

/**
 * Which tool a file of this kind belongs in.
 *
 * Extension first, type second: Android share intents routinely arrive with
 * `application/octet-stream` for a file whose name says plainly what it is,
 * and a WhatsApp forward is the case this whole feature exists for.
 */
function destinationFor(name, type) {
  const extension = /\.([a-z0-9]+)$/iu.exec(String(name || ''))?.[1]?.toLowerCase() ?? '';
  const mime = String(type || '').toLowerCase();

  if (extension === 'pdf' || mime === 'application/pdf') return SHARE_ROUTES.pdf;
  if (extension === 'csv' || mime === 'text/csv') return SHARE_ROUTES.csv;
  if (extension === 'json' || mime === 'application/json') return SHARE_ROUTES.json;
  if (
    /^(?:png|jpe?g|gif|webp|avif|bmp|heic|heif|tiff?)$/u.test(extension) ||
    mime.startsWith('image/')
  ) {
    return SHARE_ROUTES.image;
  }
  return SHARE_ROUTES['generic-file'];
}

/** `/tool?x=1` plus the marker, whichever separator that needs. */
function withHandoffFlag(destination) {
  const url = new URL(destination, self.location.origin);
  url.searchParams.set(HANDOFF_FLAG, '1');
  return url.href;
}

/**
 * Put the shared file where the tool page will look for it.
 *
 * Deliberately the same database, store, key and record shape that
 * `lib/file-handoff.ts` writes when the home-page dropzone hands a file over,
 * so a shared file rides the collector that is already mounted on every page
 * and lands in every tool — including tools added later. `bytes` is an
 * `ArrayBuffer` rather than a `File` because WebKit refuses to store a `File`
 * here; the long note in that file has the measurements.
 */
function storeHandoff(bytes, name, type) {
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(HANDOFF_DATABASE, 1);
    } catch {
      resolve(false);
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HANDOFF_STORE)) {
        database.createObjectStore(HANDOFF_STORE);
      }
    };
    request.onerror = () => resolve(false);
    request.onblocked = () => resolve(false);
    request.onsuccess = () => {
      const database = request.result;
      let transaction;
      try {
        transaction = database.transaction(HANDOFF_STORE, 'readwrite');
      } catch {
        database.close();
        resolve(false);
        return;
      }
      transaction
        .objectStore(HANDOFF_STORE)
        .put({ bytes, name, type, storedAt: Date.now() }, HANDOFF_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve(true);
      };
      transaction.onerror = () => {
        database.close();
        resolve(false);
      };
      transaction.onabort = () => {
        database.close();
        resolve(false);
      };
    };
  });
}

/**
 * Answer the share sheet.
 *
 * This is the one request the worker answers whether or not it is online, and
 * the reason is that there is nothing to step aside *to*: a POST carrying a
 * file is not something any page on this site can render, and letting it
 * through would send a document someone chose to keep private to the origin
 * for no purpose. Reading it here keeps it on the device: `formData()` parses
 * a body the browser already handed us, and the redirect is synthesised.
 *
 * Every failure ends the same way — a redirect to a real page — because the
 * alternative is an error page in a standalone window with no address bar.
 */
async function acceptShare(request) {
  let destination = '/';
  try {
    const form = await request.formData();
    const file = form.getAll('file').find((entry) => typeof entry?.arrayBuffer === 'function');
    if (file && file.size > 0) {
      const name = file.name || 'shared-file';
      destination = withHandoffFlag(destinationFor(name, file.type));
      const stored = await storeHandoff(await file.arrayBuffer(), name, file.type || '');
      // Storage refused it. Sending someone to an empty tool with a marker
      // saying a file is waiting is worse than sending them to the front page.
      if (!stored) destination = '/';
    }
  } catch {
    // Nothing usable was shared, or storage is unavailable. Open the site.
  }
  return Response.redirect(new URL(destination, self.location.origin).href, 303);
}

/* ------------------------------------------------------------------ *
 * Offline
 * ------------------------------------------------------------------ */

/**
 * Fill the cache from the imported payload.
 *
 * The payload is one gzip stream over every file concatenated, base64'd. One
 * stream rather than one per file because the pages share a shell, and a
 * shared shell compresses to a fraction of what the same pages cost apart.
 *
 * `atob`, `DecompressionStream` and `new Response(bytes)` are all local: they
 * transform or wrap bytes that are already here. Nothing in this function
 * touches the network, which is what makes it legal under `connect-src 'none'`.
 */
async function precache() {
  if (!STAMPED) return;
  try {
    // Permitted inside `install`: the worker's state is still `installing`.
    importScripts(`/sw-precache-body-${BUILD}.js`);
    const body = self.__OPENTOOLS_PRECACHE_BODY;
    if (!body || typeof body.payload !== 'string') return;

    const gzipped = Uint8Array.from(atob(body.payload), (character) => character.charCodeAt(0));
    const inflated = new Uint8Array(
      await new Response(
        new Response(gzipped).body.pipeThrough(new DecompressionStream('gzip')),
      ).arrayBuffer(),
    );

    const cache = await caches.open(CACHE);
    for (const entry of body.entries) {
      await cache.put(
        new URL(entry.u, self.location.origin).href,
        new Response(inflated.subarray(entry.o, entry.o + entry.l), {
          headers: {
            'Content-Type': entry.t,
            // The page is sealed offline by the same policy that seals it
            // online. See the note at the top of this file.
            'Content-Security-Policy': body.csp,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
          },
        }),
      );
    }

    // Release the payload: it is in the cache now, and holding all of it in a
    // worker that may be kept alive is pure cost.
    self.__OPENTOOLS_PRECACHE_BODY = undefined;
  } catch {
    // A browser without `DecompressionStream`, or storage that refused the
    // write. Never fatal — throwing here would fail `install` and leave the
    // site uninstallable, which would cost the share target too.
  }
}

/** The cache key for a URL, ignoring the query: `?tool=` picks a panel, not a page. */
function keyFor(url) {
  return new URL(url.pathname, self.location.origin).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  // Replace the previous worker rather than waiting for every tab to close.
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      // Claim straight away so open tabs stop being controlled by an older
      // worker without needing to be closed and reopened.
      .then(() => self.clients.claim())
      .catch(() => undefined),
  );
});

/**
 * Answer the share sheet, and whatever the browser has told us it cannot fetch.
 *
 * Every other condition here is a reason to step aside, and stepping aside
 * means the request is loaded exactly as it would be with no worker at all.
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.method === 'POST' && url.pathname === SHARE_TARGET_PATH) {
    event.respondWith(acceptShare(request));
    return;
  }

  if (request.method !== 'GET') return;

  // The rescue case only. See the safety argument at the top of this file.
  if (self.navigator.onLine) return;

  const key = keyFor(url);
  if (!INDEX.has(new URL(key).pathname)) return;

  event.respondWith(
    caches
      .match(key)
      .then(
        (hit) =>
          hit ??
          // Indexed but absent: storage was evicted between deploys. The
          // browser was offline and about to fail anyway, so failing the same
          // way is honest and changes nothing.
          Response.error(),
      )
      .catch(() => Response.error()),
  );
});
