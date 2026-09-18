# Service worker

**What this is:** the reasoning behind `public/sw.js`, which is deliberately
inert and must stay that way. `sw.js` points here. Read this before making it do
anything, because the obvious improvements are the ones that took the site down
on 2026-09-19.

## The constraint

Every response this site serves carries `connect-src 'none'`. That header is the
product's one real promise — the page cannot upload your file because the
browser refuses to open the connection — and `e2e/egress-proof.spec.ts` asserts
it on every build.

`/sw.js` is served with that header too, and **a service worker inherits the
policy delivered with its own script**. `connect-src` governs `fetch()` inside a
worker exactly as it does inside a page.

So, plainly: **a service worker on this origin cannot fetch anything, ever.**
Not the network, not to fill a cache, not to revalidate. `cache.add()` and
`cache.put(request, ...)` both perform a fetch, so caching is equally
impossible. No cache on this origin can ever be populated from inside the
worker.

This is not a bug in the policy. The policy is worth more than offline support.

## What went wrong

The first version of `sw.js` was written network-first for navigations, with an
offline notice as its last resort:

```js
fetch(request).then(...).catch(() => "You are offline...")
```

Its `fetch` was refused by our own security header, so it always threw, so the
`catch` always fired. The cache it consulted first was empty for the same
reason. The result:

1. A visitor's first page loaded normally.
2. The worker installed and claimed the page.
3. **Every navigation after that returned a 503 reading "You are offline and
   this page has not been opened before."**

The site was one click deep for everyone who had ever visited it, while the
network was perfectly healthy. Clearing site data bought exactly one more page
load, because that load re-registered the worker.

It reached no log, no analytics and no uptime check: the origin kept answering
`200` to every probe, because the failure was manufactured inside the visitor's
own browser. A `curl` of the homepage looked fine throughout.

## The rule

**Never call `respondWith` unless there is something real to respond with.**

Declining to answer leaves the browser to load the request exactly as it would
with no worker at all, which is always correct. Answering with a failure
replaces a working page with a broken one.

This is stricter than it sounds, and the first draft of the rewrite broke it:

```js
// WRONG — reintroduces the outage
caches.match(request).then((hit) => hit ?? fetch(request))
```

`respondWith` must be called synchronously, before the cache can be consulted,
so the promise is committed before anyone knows whether the cache will hit. When
it misses, the `fetch` fallback inside it is refused by `connect-src 'none'`,
the committed promise rejects, and the visitor gets a browser error page instead
of their tool. There is nothing to serve from anyway.

## Why the file exists at all

A browser will not offer "install this site" without a registered service worker
that has a `fetch` handler. That is the entire reason `sw.js` is still here. The
handler is present and empty by design.

## Before you change this file

- Bump `VERSION`. `activate` deletes every cache not in `KEEP`, which is how a
  broken predecessor's leftovers get cleaned up.
- Keep `skipWaiting()` and `clients.claim()`. They are what let a corrective
  version take over tabs that are already stuck on a bad one, without the
  visitor closing anything. This is the only self-heal path available — if a
  released worker breaks navigation, visitors cannot route around it themselves.
- Test the **second** load, not the first. This class of bug is invisible on a
  cold visit and only appears once the worker is controlling the page.
- A green `curl` proves nothing here. Verify in a real browser, twice.

## Making offline work later

It needs the CSP relaxed for the worker's own script — serving `/sw.js` with
`connect-src 'self'` while every page keeps `connect-src 'none'`. That is an
owner decision, not a quiet edit: it widens what the worker is permitted to do,
and the egress proof must be extended to cover the worker's context before any
offline claim is made in the UI.
