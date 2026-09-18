# Cache budget

**Why this document exists:** the site's page cache is paid for in a currency we
have very little of, and the obvious way to configure it spends all of that
currency and buys nothing.

---

> ## ⚠️ STATUS, 2026-09-19 — read this before trusting anything below
>
> **The guide allowlist described in this document is written, tested and green
> (8/8 in `lib/seo/cache-budget.test.ts`). It is UNPROVEN in production and must
> not be called working.** Nothing has been deployed: the deploy freeze from
> capsule §9.1 is in force.
>
> **Why it cannot be proven yet.** The page cache is not serving a HIT for
> *anything* right now — capsule §9.3, re-measured by the TECH lane on
> 2026-09-19: three consecutive requests to `/pdf/merge` returned
> `x-vinext-cache: MISS`, `cache-control: no-store, must-revalidate`,
> `cf-cache-status: BYPASS`. Until that is fixed, an opted-in guide would miss
> for the same reason every other page misses, and a MISS would tell us nothing
> about this allowlist.
>
> **The root cause is now known and proven** (TECH lane, `progress/LANE_TECH_2026-09-19.md`
> entry 2 — not inferred, read from vinext's source and confirmed against the
> live KV namespace):
>
> - The KV key is `cache:app:<buildId>:<path>:html`.
> - `buildId` is `safeUUID()` — **a fresh random UUID on every build** — unless
>   `generateBuildId` is configured, and this repo configures it nowhere
>   (`grep -rn "generateBuildId"` → zero matches).
> - So **a deploy does not refresh the cache, it orphans it.** Listing the
>   namespace found **2,550 live keys under three different build-id prefixes**,
>   including six unexpired copies of `/pdf/merge`, while production served MISS.
>   The cache was never failing to write. The running build simply cannot see
>   what any earlier build wrote.
>
> **What that changes for this document.** Every page-count sum below is correct
> and still worth keeping, but page count was never the binding constraint. See
> *"The constraint that actually binds"*.
>
> **Do not mark this resolved** without a `wrangler kv key put` that succeeds and
> an `x-vinext-cache: HIT` on a second request (capsule §9.3 — it has been marked
> resolved twice already on weaker evidence and was wrong both times).
> `scripts/check-cache-health.mjs` runs exactly that probe.
>
> **Owned by:** TECH owns the mechanism (the build id, and whether to move to the
> `cdn` adapter which uses Cloudflare's edge cache and zero KV writes). MAR owns
> the budget — this file. Check `progress/LANE_TECH_2026-09-19.md` before
> claiming anything about cache behaviour.

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
| Tool pages, homepage, hubs (static) | 42 | 84 |
| `/guides/category/:category` | 18 | 36 |
| `/guides/:slug` — allowlist only (see below) | 50 | 100 |
| **Total** | **110** | **220** |

220 writes against ~1,000 leaves room for **four** full re-warms a day.

*(The earlier revision of this table said 43 route files and 61 pages. 43 is the
number of `page.tsx` files that set `revalidate`, but one of them is the
`/guides/category/:category` pattern already counted as 18, so the page total
was 60, not 61. Corrected here; the conclusion did not change.)*

## What is deliberately not cached, and why

**The other 500 `/guides/:slug` pages.** All 550 at two writes each is 1,100
writes — they do not fit inside a 1,000-write allowance *on their own*, at any
setting. So a **subset** caches and the rest render on demand, which is what
every page did before, so nothing is worse than it was.

### How a subset is possible

This was the part the previous revision got wrong. It treated the guides as
all-or-nothing and left 780 writes a day unused.

`export const revalidate` cannot express "cache some of these". It is read from
the route's segment config and applied to **every** slug that is ever
requested — `generateStaticParams` does not gate it, and nothing in the runtime
consults that list before writing (`app-page-cache-finalizer.js` keys only off
the resolved revalidate). With 629 URLs now in the sitemap, one crawl sweep
would request all of them and spend the day's quota in an hour.

The route therefore sets **no module-level `revalidate`** and opts in *per
request* instead:

```ts
if (isCachedGuide(slug)) cacheLife({ revalidate: 86400, expire: 86400 });
```

This works because a segment with no `revalidate` resolves to `null` rather
than `undefined`, and `null` both passes the cache-path gate
(`revalidateSeconds === null || revalidateSeconds > 0`) and lets a
request-scoped `cacheLife` supply the policy. A slug that is not on the list
reaches the same code path, produces no policy, and the write is skipped with
*"HTML cache write skipped (no cache policy)"*. The cost is therefore the
length of the list, not the size of the catalogue.

**Measured, not assumed** — `wrangler dev` against the production build,
2026-09-19:

| Page | req 1 | req 2 | req 3 | `cache-control` |
|---|---|---|---|---|
| `/guides/health-and-fitness-bmi-calculator` (on the list) | MISS | **HIT** | **HIT** | `s-maxage=86400` |
| `/guides/pdf-reorder-pdf-pages` (not on the list) | MISS | MISS | MISS | `no-store, must-revalidate` |

The second row is the important one: it never becomes a `HIT`, so it is never
stored and costs no writes however often it is crawled.

### Which 50, and why those

`lib/seo/cached-guides.ts` holds the list, and the same list drives
`generateStaticParams`, so what is prerendered and what is cached cannot drift
apart.

There is **no per-page traffic data** — what we have is zone-level daily totals
and the guides are barely indexed — so "the 50 most visited" would be
invention. The list uses the catalogue's own ranking instead.

One correction worth recording: `rank` is **per category**, so the previous
`.slice(0, 50)` over catalogue order kept every subtitle tool and dropped whole
categories — including the BMI, age and date-difference calculators, which are
much higher-volume queries than a subtitle frame-rate converter. Sorting by
rank before slicing takes the strongest few from every category instead, which
is why the cached set now leads with the BMI, EMI, QR and basic calculators.

**`app/blog/**`, `app/templates/**` and `app/support/**`** are Antigravity-owned
(board §2) and are not opted in by this change. Adding them would cost about 80
more writes and still fit comfortably; it is a request on the board, not
something to take unilaterally.

## The constraint that actually binds: deploys, not pages

**Measured 2026-09-18, and it changes how to read everything above.** After
deploying the allowlist, production served `x-vinext-cache: MISS` and
`no-store` on *every* page — the homepage and `/pdf/merge` included, which had
been caching for days. A direct probe gave the reason:

```
$ wrangler kv key put --namespace-id c9cf54ced0214def91278f73f69316bd "quota-probe" "probe" --remote
your account has reached the free usage limit for this operation for today [code: 10048]
```

`wrangler deployments list` shows **ten deploys that UTC day**. Every deploy
invalidates every key, so the daily cost is not the size of the table above —
it is that table **times the number of deploys**:

```
writes per day  =  2  ×  cached pages  ×  deploys per day
```

| Cached pages | 1 deploy | 4 deploys | 10 deploys |
|---|---|---|---|
| 60 (before this change) | 120 | 480 | **1,200** |
| 110 (with the guide allowlist) | 220 | 880 | **2,200** |

Ten deploys busts the allowance at *either* size. The quota did not die because
too many pages are cached; it died because the site is under active daily
development and each deploy throws the whole cache away. Trimming the allowlist
does not fix this — only deploying less, or leaving the free plan, does.

### Why trimming the allowlist cannot fix it — the arithmetic, run to the end

This is the sum that settles the question, and it is the answer to the TECH
lane's cross-lane warning of 2026-09-19 (*"do not size the guide subset against
a per-day KV budget"*).

Turn the equation around and ask how many pages the allowance affords **at the
deploy rate actually observed**:

```
pages affordable  =  1000 / (2 x deploys per day)
```

| Deploys that day | Pages the allowance affords |
|---:|---:|
| 1 | 500 |
| 4 | 125 |
| **9 (observed, 2026-09-18)** | **55** |
| 10 | 50 |

**At 9 deploys the allowance affords 55 pages. Sixty were already cached before
a single guide was added.** So on a real development day the quota dies whatever
the guide allowlist contains — including if it is emptied completely. Shrinking
it buys nothing at all.

Read the other way, the allowlist's real cost is deploy headroom on a *quiet*
day:

| Configuration | Writes per deploy | Deploys survived |
|---|---:|---:|
| static only, 60 pages | 120 | 8 |
| + 25 guides, 85 pages | 170 | 5 |
| **+ 50 guides, 110 pages (shipped)** | **220** | **4** |
| all 550 guides, 610 pages | 1,220 | 0 |

**So the honest summary of this whole document:** the 50-guide allowlist halves
quiet-day deploy headroom from 8 to 4, and on a busy day it is irrelevant
because nothing fits at any size. **The lever is the build id, not the page
count.** Give vinext a stable `generateBuildId` and a deploy stops orphaning the
cache, at which point writes are paid once per content change rather than once
per deploy and this entire budget stops binding. That call belongs to the TECH
lane; this file exists to make sure nobody spends another session trimming a
list that was never the problem.

`lib/seo/cache-budget.test.ts` encodes both halves — the per-deploy floor, and
the 55-pages-at-9-deploys finding — so neither has to be rediscovered.

**What this means in practice.** On a quiet day the allowlist is comfortably
affordable and the guides cache as measured. On a heavy development day nothing
caches regardless of configuration — which is survivable, because the cache
exists for real visitors and crawlers, not for the developer. The failure is
loud and self-correcting: the quota resets at UTC midnight.

**Not verified:** whether a *failed* write still counts against the allowance.
If it does, an exhausted day is partly self-sustaining, because every request
to an uncached page attempts a write that cannot succeed. Worth measuring
before relying on the reset.

**The exit.** Workers Paid is $5/month and removes this entire class of problem
— the quota deaths, the `no-store` on every page, and the `exceededResources`
503s that come with serving every request uncached. The owner has deferred it
until the project earns money, which is a legitimate call; this section exists
so the cost of that call is visible rather than rediscovered each time the cache
goes quiet.

## The rule to keep

`lib/seo/cache-budget.test.ts` fails the build if the estimated write cost goes
over **900**, if `app/layout.tsx` ever sets a blanket `revalidate` again, if
`/guides/[slug]` ever gains a module-level `revalidate`, if the per-request
opt-in is deleted from that route, or if a full re-warm stops fitting into the
day at least **three** times. Change the budget there and you have to mean it.

That last guard is the one that matters as the site grows: every deploy
invalidates every key, so the question is never "does one warm fit" but "how
many warms does a day afford". Ship several times a day on a budget that fits
one warm and the cache is empty by lunchtime.

## If the plan is ever upgraded

Delete none of this — just raise the number in the test and opt more pages in.
The per-page approach is better than a blanket one regardless of plan, because
it makes the cost of each page visible.
