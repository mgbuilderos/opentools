# `/telemetry/v1/*`

Nine files, one per product counter, each the same 1×1 transparent SVG.

**The file is not the point — the request is.** Nothing is stored here and
nothing is read back. A page asks for one of these paths with an `Image`, and
the only record of it is the line Cloudflare writes while serving it, which is
the same line it writes for every other request to this site. There is no
query string, no body, no cookie and no identifier, so two requests for the
same path are indistinguishable from two different people. That is deliberate:
the aggregate count is the whole of what this measures.

Served `Cache-Control: no-store` by `public/_headers` and `next.config.ts`. A
cacheable response would be served out of the browser's own cache on the second
event and the count would silently stop rising — the failure would look exactly
like nobody using the site.

They are deliberately **not** in the service worker's precache
(`scripts/build-service-worker-precache.mjs`), so an installed app with no
network fails to send the request rather than having it answered from a cache.
An offline completion is simply not counted; nothing is queued and nothing is
replayed. `lib/product-telemetry-precache.test.ts` fails if that changes.

Why an image at all, rather than `fetch` or `sendBeacon`: every response this
site serves carries `connect-src 'none'`, and those APIs are governed by it.
`img-src 'self'` already permits a same-origin image, so this needs no change
to the header that carries the product's one real promise. See
`lib/product-telemetry.ts` and `decisions/ADR-020-product-signals.md`.
