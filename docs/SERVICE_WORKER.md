# Service worker

**What this is:** the reasoning behind `public/sw.js`, which answers exactly two
kinds of request and must stay that narrow. `sw.js` points here. Read this
before making it do anything more, because the obvious improvements are the ones
that took the site down on 2026-09-19.

## The constraint

Every response this site serves carries `connect-src 'none'`. That header is the
product's one real promise — the page cannot upload your file because the
browser refuses to open the connection — and `e2e/egress-proof.spec.ts` asserts
it on every build. Loosening it on a tool route is classed as a vulnerability in
`.github/SECURITY.md`, not a feature request.

`/sw.js` is served with that header too, and **a service worker inherits the
policy delivered with its own script**. `connect-src` governs `fetch()` inside a
worker exactly as it does inside a page.

So, plainly: **a service worker on this origin cannot fetch anything, ever.**
Not the network, not to fill a cache, not to revalidate.

## What the policy actually forbids

This was measured in Chromium against a real build served with the production
headers, from inside a worker on this origin:

| Call                            | Result  | Governed by                     |
| ------------------------------- | ------- | ------------------------------- |
| `fetch('/site.webmanifest')`    | refused | `connect-src 'none'`            |
| `cache.add(url)` / `addAll(url)`| refused | `connect-src` — they fetch for you |
| `importScripts('/file.js')`     | allowed | `script-src 'self'`             |
| `cache.put(url, new Response())`| allowed | stores bytes already held       |
| `new DecompressionStream('gzip')`| allowed| a local transform               |
| `request.formData()`            | allowed | parses a body already received  |
| IndexedDB read and write        | allowed | not a CSP concern               |

The distinction that matters: **fetching is refused, caching is not.** An
earlier version of this document said offline support would require serving
`/sw.js` with `connect-src 'self'`, and that was wrong. The bytes simply have to
arrive as a script rather than as a download.

`scripts/build-service-worker-precache.mjs` writes them out at build time as
`sw-precache-body-<build>.js`, the worker imports that once inside `install`,
and `cache.put` stores each file. Nothing about the policy changes, and nothing
new is permitted to the worker.

## What went wrong, once

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

This is stricter than it sounds:

```js
// WRONG — reintroduces the outage
caches.match(request).then((hit) => hit ?? fetch(request));
```

`respondWith` must be called synchronously, before the cache can be consulted,
so the promise is committed before anyone knows whether the cache will hit. When
it misses, the `fetch` fallback inside it is refused by `connect-src 'none'`,
the committed promise rejects, and the visitor gets a browser error page instead
of their tool.

## What the worker answers now

Two things, and nothing else.

**1. A POST to `/share-target`.** The Android share sheet is the only thing that
sends one. There is nothing to step aside *to* — a POST carrying a file is not
something any page here can render, and letting it through would send a document
someone chose to keep private to the origin for no purpose. The worker parses
the body, writes the file into the same IndexedDB store the home-page dropzone
uses (`lib/file-handoff.ts`), and redirects to the tool for that kind of file.
`components/handed-over-file.tsx` is mounted site-wide and puts it into the
tool's file input on arrival.

**2. A GET the browser has said it cannot make.**

```js
if (self.navigator.onLine) return; // step aside, always
```

`navigator.onLine` is unreliable in one direction only: `true` can mean a
captive portal or a dead uplink, while `false` genuinely means the browser has
no network. The worker acts solely on `false`. An online visitor is therefore
served exactly as they would be with no worker installed, and the worst a bug in
the offline path can do is fail to rescue a page that was already failing.

Do **not** replace this with cache-first or network-first to shave milliseconds.
The measured benefit is zero — HTML is edge-cached and `/_next/static/*` is
immutable — and the cost of getting it wrong is the entire site, silently, for
everyone who has ever visited.

## Cached responses carry the policy with them

A response the worker synthesises does not come from the origin, so it arrives
with none of the origin's headers. Serving a cached page without them would hand
someone the one page on this site that is **not** sealed.

So the build copies the `/*` policy out of `public/_headers` — the only header
source the Cloudflare deploy ships — into the payload, and every cached response
is stored with it plus `X-Content-Type-Options`. `lib/service-worker.test.ts`
fails the build if the worker stops stamping it or the script starts hardcoding
one, and `e2e/share-target.spec.ts` reads the header back off a page loaded with
the network switched off.

`/image/background-remover` and `/image/editor` are deliberately not precached.
They are served a looser policy so the local model can load its weights, and a
cached copy stamped with the `/*` policy would be a stricter page than the real
one.

## Before you change this file

- The `<build>` stamp is a hash of the payload's own bytes. Never make it a
  timestamp or a random id — that is the mistake that threw away the KV cache
  on every deploy.

  It does not yet give a stable id across rebuilds, and the reason is upstream.
  Measured on 2026-09-22: two builds of an identical tree produced different
  `/_next/static/chunks/*` filenames throughout (`index-CYnqNf_i.js`, then
  `index-Dt_YI4IA.js`), which changes the prerendered HTML, which changes the
  payload. While that lasts, every deploy costs an installed visitor the 0.69 MB
  payload again — and, for the same reason, costs every visitor the whole of
  `/_next/static/*` despite its day-long cache rule. Worth fixing in the build,
  not here.
- `activate` deletes every cache that is not the current one, which is how a
  broken predecessor's leftovers get cleaned up.
- Keep `skipWaiting()` and `clients.claim()`. They are what let a corrective
  version take over tabs that are already stuck on a bad one, without the
  visitor closing anything. This is the only self-heal path available — if a
  released worker breaks navigation, visitors cannot route around it themselves.
- Keep `precache()` swallowing its own failures. Throwing there fails `install`,
  and a worker that will not install takes installability and the share target
  down with it.
- Test the **second** load, not the first. This class of bug is invisible on a
  cold visit and only appears once the worker is controlling the page.
- A green `curl` proves nothing here. Verify in a real browser, twice.

## The one thing still worth an owner's attention

A share target has to be `method: "POST"`; a GET share target silently drops the
file. The worker intercepts that POST inside the browser, which is what keeps
the file on the device — but if no worker is running, the browser posts it to
the origin instead.

In practice that gap is closed by the platform: Chrome only offers a share
target for an installed app, and it will not install one without a registered
worker with a `fetch` handler. It is worth knowing about rather than assuming
away, and it is a reason never to let the worker's `install` throw.
