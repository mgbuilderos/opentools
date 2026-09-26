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
| Tool pages, homepage, hubs (static) | 43 | 86 |
| `/guides/category/:category` | 18 | 36 |
| Blog index + posts | 27 | 54 |
| `/templates/:slug` | 15 | 30 |
| `/support` | 1 | 2 |
| `/guides-cached/:slug` — the 50 in `lib/seo/cached-guides.ts` | 50 | 100 |
| **Total** | **153** | **306** |

**Updated 2026-09-19.** Was 61 pages / 122 writes. `app/templates/page.tsx` is
excluded because it is a `'use client'` component and route segment config
cannot be exported from one.

306 writes against ~1,000 still leaves room for three full re-warms a day — but
that ceiling stopped being the binding constraint on 2026-09-19, when the build
id was pinned to the commit (`next.config.ts`). A redeploy of identical code now
keeps its cache and costs **zero** writes; only changed code re-warms. The nine
deploys of 2026-09-18 would cost nothing today.

**Cost is demand-paced, not billed on deploy.** A page costs its two writes only
when someone actually requests it, so 306 is a ceiling reached only if every
opted-in page is visited in a day. `npm run predeploy` reads the real figure from
Cloudflare before each deploy, and counts what a deploy will cost from the build
itself — the public URLs with no file in `dist/client`, which are the only ones
that still have to render.

**`FULL_REWARM` is the fallback for when there is no build to count**, and it is
a ceiling rather than a figure to keep in step with this table. That distinction
is the whole point, and getting it wrong cost real time: the constant was
documented as a ceiling from the day it was written while `cache-budget.test.ts`
asserted it *exactly* equalled the measured cost. Exactness made one line a
shared mutex — every branch that added a route had to edit it, so any two such
branches conflicted there, and whoever merged second resolved a conflict over a
number neither side had computed for the union. It was repriced seven times in
one day (420, 422, 424, 438, 440, 442, 444), each one a merge someone had to
stop and fix.

The test now checks a band instead, which catches both ways of being wrong:

| Bound | Catches |
| :--- | :--- |
| never below the measured cost | an optimistic verdict — says GO when the deploy cannot afford itself |
| never more than 200 writes above it | an inflated one — says WAIT on every deploy, which happened when this constant priced 163 ISR pages that had already become static files, and was overridden by hand three times in a day |
| at least one page of headroom | the band collapsing back into a mutex |

Inside the band, adding a route changes nothing. Raise it — to a round number,
not to the measured figure — only when the test says the ceiling has been
crossed.

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

**`app/blog/**`, `app/templates/**` and `app/support/**`** are Antigravity-owned
(board §2) and are not opted in by this change. Adding them would cost about 80
more writes and still fit comfortably; it is a request on the board, not
something to take unilaterally.

## The rule to keep

`lib/seo/cache-budget.test.ts` fails the build if the estimated write cost goes
over **900**, if `app/layout.tsx` ever sets a blanket `revalidate` again, or if
the guide long tail is opted in. Change the budget there and you have to mean it.

## If the plan is ever upgraded

Delete none of this — just raise the number in the test and opt more pages in.
The per-page approach is better than a blanket one regardless of plan, because
it makes the cost of each page visible.
