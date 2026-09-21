# Cache budget

**Why this document exists:** the site's page cache is paid for in a currency we
have very little of, and the obvious way to configure it spends all of that
currency and buys nothing.

## Update, 2026-09-20 — pages no longer draw on this budget

Every route is now prerendered at build time and served from `dist/client/` as a
static asset, so a page request writes nothing to KV and renders nothing. The
budget below still governs the **data** cache (`fetch` / `use cache`), and KV
stays bound as the fallback for anything prerender skips — but the question this
document was written to answer, *which 50 pages can we afford to cache*, no
longer has to be asked.

What forced it: on 2026-09-20, 183 of 670 sitemap URLs returned 503 (177 of them
guides). Cloudflare's log for the live Worker shows 268 of 1,241 renders killed
with `exceededCpu` against the free plan's 10ms, while surviving renders needed
30ms median and 286ms at worst. The cache could never have covered that — a full
cache is ~1,340 keys against ~1,000 writes a day, and each deploy opens a fresh
`cache:app:<build id>:` prefix, so it restarts from empty. The namespace held
4,345 keys across ten dead build IDs that morning and 792 for the live one.

## The constraint

Cloudflare Workers KV on the **free** plan allows roughly **1,000 writes a day**.
Confirmed directly, 2026-09-18, not inferred:

```
$ wrangler kv key put --namespace-id c9cf54ced0214def91278f73f69316bd "probe" "probe" --remote
your account has reached the free usage limit for this operation for today [code: 10048]
```

The billing page shows **Workers · Workers Free · Active**. The owner has decided
not to upgrade until the project earns money, so this is the budget we design
against, not a problem waiting for a cheque.

Each cached page costs **two** writes — one `:html` key and one `:rsc` key — and
**every deploy invalidates all of them**, because the keys are
`cache:app:<build-uuid>:<path>:html`.

## What went wrong before

`app/layout.tsx` exported `revalidate = 86400`. That applies to every route, so
all **649** pages tried to cache themselves: about **1,298 writes** against an
allowance of 1,000.

The result was the worst of both worlds. The writes failed, so nothing was ever
cached; and because the routes were nonetheless classified as cacheable-pending,
production served `cache-control: no-store, must-revalidate` on every page. The
site paid the whole quota and served every request uncached — which is exactly
the state that produced **1,316 `exceededResources` 503s in one hour** under
crawl load on 2026-09-16.

## What we do instead

**Caching is opted into per page, and only where it pays.** `app/layout.tsx`
sets no `revalidate` at all; each page that should be cached exports its own.

| What | Pages | Writes |
|---|---|---|
| Static pages — homepage, dedicated tool pages, hubs, `/guides`, `/support`, blog index | 59 | 118 |
| `/guides/category/:category` | 18 | 36 |
| `/blog/:slug` | 31 | 62 |
| `/templates/:slug` | 18 | 36 |
| `/guides-cached/:slug` — the 50 in `lib/seo/cached-guides.ts` | 50 | 100 |
| **Total** | **176** | **352** |

**Updated 2026-09-21.** Was 153 pages / 306 writes on 2026-09-19; the growth is
blog posts and templates being written, not routes opting in. The fourteen
`<category>/[tool]` routes left this table on the same day — see below.
`app/templates/page.tsx` is excluded because it is a `'use client'` component
and route segment config cannot be exported from one.

306 writes against ~1,000 still leaves room for three full re-warms a day — but
that ceiling stopped being the binding constraint on 2026-09-19, when the build
id was pinned to the commit (`next.config.ts`). A redeploy of identical code now
keeps its cache and costs **zero** writes; only changed code re-warms. The nine
deploys of 2026-09-18 would cost nothing today.

**Cost is demand-paced, not billed on deploy.** A page costs its two writes only
when someone actually requests it, so 306 is a ceiling reached only if every
opted-in page is visited in a day. `npm run predeploy` reads the real figure from
Cloudflare before each deploy; its `FULL_REWARM` constant must be kept in step
with this table.

## What is deliberately not cached, and why

**The other 500 `/guides/:slug` pages.** At two writes each all 550 are 1,100
writes — they do not fit inside a 1,000-write allowance *on their own*, at any
setting. They render on demand and cost no writes at all.

**Fifty of them ARE cached, as of 2026-09-19, without changing a single URL.**
`export const revalidate` is module-level and governs a whole route, so a subset
is not expressible on one route. `next.config.ts` therefore rewrites
`/guides/:slug` to `app/guides-cached/[slug]` for the 50 slugs in
`lib/seo/cached-guides.ts`; that route opts in, the original does not. A rewrite
is internal — no redirect, no URL change, canonical still `/guides/:slug`, and
the sitemap never mentions `guides-cached`. **Do not add `noindex` to that
route:** the rewrite means the tag would be served on `/guides/:slug` and
deindex the 50 best guides on the site.

Verified locally: a guide page returns `x-vinext-cache: MISS` on every request
and never becomes a `HIT`, which means it is never stored and therefore **costs
no writes at all**. A cached page goes `MISS` then `HIT`.

**The fourteen `<category>/[tool]` routes — about 600 pages.** `/math/:tool`,
`/text/:tool`, `/data/:tool` and eleven more build one page per operation from
the same lists the sitemap reads. All fourteen exported `revalidate = 86400`
until 2026-09-21, and `cache-budget.test.ts` priced a whole route at a single
page, so 600 pages were counted as 14. Counted honestly they are about 1,200
writes; on top of the 352 above that is roughly **1,552 against an allowance of
1,000** — the same shape of failure as the blanket `revalidate` in
`app/layout.tsx`, and it would have ended the same way: every write refused,
nothing cached, `no-store` on every page.

The `revalidate` was removed rather than the budget raised, because it bought
nothing in the first place. Prerendering is switched on for the whole build
(`prerender: true` in `vite.config.ts`), not per route; what a route needs to
be prerendered is `generateStaticParams` and `dynamicParams = false`, which all
fourteen already have, and not `revalidate`. `app/guides/[slug]` is the proof:
it has never exported `revalidate`, and all 567 of its pages sit in
`dist/client/`. So these pages are served as static assets, the Worker never
renders one, and `scripts/verify-static-coverage.mjs` fails the build if any
sitemap URL loses its file. `scripts/predeploy.mjs` already prices deploys on
exactly this basis: a page with a file in `dist/client/` is served as an asset,
never renders, and so never writes.

**`app/blog/**`, `app/templates/**` and `app/support/**`** are Antigravity-owned
(board §2) and are not opted in by this change. Adding them would cost about 80
more writes and still fit comfortably; it is a request on the board, not
something to take unilaterally.

## The rule to keep

`lib/seo/cache-budget.test.ts` fails the build if the estimated write cost goes
over **900**, if `app/layout.tsx` ever sets a blanket `revalidate` again, if the
guide long tail is opted in, or if a `<category>/[tool]` route opts itself back
in. Change the budget there and you have to mean it.

It also refuses to guess. A dynamic route is counted from the list its own
`generateStaticParams` reads — `<prefix>/[tool]` from `routedToolIdsForPrefix`,
everything else from `DYNAMIC_PAGE_COUNTS` — and a dynamic route with neither
now throws instead of quietly counting as one page. That silent `1` is what let
600 pages hide inside a 900-write budget.

## If the plan is ever upgraded

Delete none of this — just raise the number in the test and opt more pages in.
The per-page approach is better than a blanket one regardless of plan, because
it makes the cost of each page visible.
