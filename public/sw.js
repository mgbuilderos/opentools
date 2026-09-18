/**
 * Service worker — deliberately minimal, and the reason is worth reading before
 * anyone makes it do more.
 *
 * **A service worker here cannot fetch anything.** Every response on this site
 * carries `connect-src 'none'`, `/sw.js` included, and a worker inherits the
 * policy delivered with its own script. `connect-src` governs `fetch()` inside
 * a worker exactly as it does inside a page. So every `fetch()` this file could
 * make is refused by the browser before it reaches the network.
 *
 * That is not a bug in the policy. `connect-src 'none'` is the product's one
 * real promise — the page cannot upload your file because the browser will not
 * let it — and it is enforced, measured and worth more than offline support.
 *
 * It does mean caching is impossible from here, and the previous version of
 * this file learned that the hard way. It was written network-first with an
 * offline notice as the last resort:
 *
 *     fetch(request).then(...).catch(() => "You are offline")
 *
 * Since `fetch` always rejected, every navigation took the `catch`, and the
 * cache it looked in first was empty for the same reason. The result on the
 * live site was that the first page loaded, this worker activated and claimed
 * the page, and **every navigation after that showed "You are offline" while
 * the network was perfectly healthy.** The site was one click deep for everyone
 * who had ever visited it.
 *
 * The rule that follows, and the one thing to keep if this file changes again:
 * **never call `respondWith` unless there is something real to respond with.**
 * Stepping aside leaves the browser to load the page normally, which is always
 * correct. Responding with a failure replaces a working page with a broken one.
 *
 * Why keep the file at all: a registered worker with a fetch handler is what
 * makes a browser offer "install this site", and that is the whole reason it
 * was added. It needs to exist and to listen. It does not need to answer.
 *
 * **To get real offline support**, `/sw.js` would have to be served with
 * `connect-src 'self'` while pages keep `connect-src 'none'`. That is a change
 * to the security posture and to a claim the project makes in public, so it is
 * an owner decision and not a quiet edit. See docs/SERVICE_WORKER.md.
 */

// Bumped from v1, whose caches are deleted on activate below. v1 could never
// populate them, but a browser that cached anything under the old names should
// not be left holding it.
const VERSION = 'opentools-v2';
const KEEP = [`${VERSION}-assets`, `${VERSION}-shell`];

self.addEventListener('install', () => {
  // No precache: `cache.add` performs a fetch, which is refused. Activating
  // immediately is what lets this version replace the one that broke the site.
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))),
      )
      // Claim straight away so open tabs stop being controlled by the old
      // worker without needing to be closed and reopened.
      .then(() => self.clients.claim())
      .catch(() => undefined),
  );
});

/**
 * Present so the browser will offer to install the site, and silent by design.
 *
 * It listens and does nothing else. `respondWith` is never called, so every
 * request is loaded by the browser exactly as it would be with no worker at
 * all — which is the only behaviour that cannot make things worse.
 *
 * It is tempting to serve cache hits here "just in case", and the first draft
 * of this rewrite did exactly that: `caches.match(request).then(hit => hit ??
 * fetch(request))`. That reintroduces the original bug. `respondWith` has to be
 * called synchronously, before the cache can be consulted, so the promise is
 * already committed — and when the cache misses, the `fetch` fallback inside it
 * is refused by `connect-src 'none'` and the committed promise rejects, which
 * shows the reader a browser error page instead of their tool.
 *
 * There is nothing to serve from anyway: no cache on this origin can ever be
 * filled while fetching is refused.
 */
self.addEventListener('fetch', () => {
  // Intentionally empty. See above: answering is what broke the site.
});
