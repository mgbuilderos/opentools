/**
 * Service worker — what makes this installable, and what makes it work offline.
 *
 * Chrome will not offer to install a site without a service worker that has a
 * fetch handler, so this file is the difference between "add to home screen"
 * being available to most visitors and being available to none of them.
 *
 * Offline matters more here than it does for most sites: the tools already run
 * entirely in the browser, so once the page is cached there is genuinely
 * nothing left that needs a network. Compressing a PDF on a plane works. That
 * is not a claim a server-side competitor can make at any price.
 *
 * Two rules keep it honest:
 *
 * 1. **HTML is network-first.** A cached page that outlives a deploy shows
 *    people a stale tool and stale copy, and this project ships several times a
 *    day. The network wins whenever it is available; the cache is the fallback,
 *    not the source of truth.
 * 2. **Hashed assets are cache-first and never revalidated.** Everything under
 *    `/_next/static/` carries a content hash, so a cached copy can never be
 *    wrong — a new build produces new URLs. This is the same reasoning behind
 *    their `immutable` Cache-Control header.
 *
 * Nothing a user processes is ever cached. This stores the application, never
 * the work: no file, no input, no result passes through here. Only GET requests
 * for this origin are touched at all.
 */

// Bump on any change to this file's behaviour. `activate` deletes every cache
// that is not in this list, so a stale worker cannot leave orphans behind.
const VERSION = 'opentools-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const KEEP = [SHELL, ASSETS];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // A failed precache must not abort the install, or one 503 on a guide
      // page leaves the visitor with no service worker at all.
      .then((cache) => cache.add('/').catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isHashedAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/assets/') ||
  /\.(?:woff2|ttf)$/u.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Same-origin only. Nothing third-party is touched, and a request this worker
  // does not recognise is left entirely alone.
  if (url.origin !== self.location.origin) return;

  // Content-addressed: a hit can never be stale, so never go to the network.
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              // Not awaited on purpose: the response goes back to the page
              // now, and the cache write finishes behind it.
              void caches
                .open(ASSETS)
                .then((cache) => cache.put(request, copy))
                .catch(() => undefined);
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Pages: network first, so a deploy is visible immediately. The cached copy
  // exists only to answer when there is no network at all.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches
              .open(SHELL)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const home = await caches.match('/');
          if (home) return home;
          return new Response(
            'You are offline and this page has not been opened before.',
            { status: 503, headers: { 'Content-Type': 'text/plain' } },
          );
        }),
    );
  }
});
