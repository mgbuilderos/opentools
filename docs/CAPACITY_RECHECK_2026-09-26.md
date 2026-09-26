# Show HN capacity — re-measured 2026-09-26

**`REVENUE_OPERATIONS.md` §3 is stale, and it is the file gating the launch.**
Its conclusion — that the site hard-stops near 71,000 page views/day and would
"very likely go dark" during a Hacker News launch — rests on four premises,
**all four of which are now false**. The measured headroom is between 4× and
19× the §3 figure.

This file does not edit §3. It records what is true today and what would have
to be re-decided; §3 was right when written.

## The four premises, each re-checked

| §3 premise (17–18 Sept) | Measured 2026-09-26 |
| --- | --- |
| "Nothing is prerendered. `find dist -name "*.html"` returns **zero**." | `scripts/prerender-to-assets.mjs` writes every URL into `dist/client/`, and `verify-static-coverage.mjs` fails the build if one is missing |
| Responses fall back to `cache-control: no-store, must-revalidate`, `x-vinext-cache: MISS` on **every page, every time** | Live: `cache-control: public, max-age=0, must-revalidate, **s-maxage=3600, stale-while-revalidate=86400**`. No `x-vinext-cache` header at all — the KV/ISR path it describes is gone |
| "**every request invokes the Worker**" | A request a static file answers never reaches the Worker. Independently confirmed: `proxy.ts`'s headers and its HTTPS redirect do **not** apply to static pages, which is a bug elsewhere and proof here |
| 76 × 503/day, all on `/guides/*`, because guides render in the Worker | 30 concurrent requests to three previously-503ing guides: **30 × 301**, no render, no 503 |

## Load, measured

```
60 concurrent requests, same URL (the HN shape)
  0 non-200 · median 0.287s · p95 0.519s · max 0.550s · ~50 req/s

40 concurrent across 4 popular pages
  37 HIT / 3 MISS  = 92.5% served from edge cache, never touching the Worker

30 concurrent, unique query string per request (forced cache MISS — worst case)
  0 non-200 · median 0.285s · p95 0.482s · max 2.505s
```

The forced-MISS run is the one that matters: even when *every* request is made
to reach the origin, nothing failed.

## The ceiling, three ways

Workers Free allows 100,000 requests/day. Only a cache **miss** spends one.
Assume an HN front page delivers 50,000 visitors × 3 pages = 150,000 views.

| Model | Worker requests | % of ceiling |
| --- | --- | --- |
| A — measured 7.5% miss rate | 11,250 | **11.2%** |
| B — `s-maxage=3600`: 5 URLs × 40 PoPs × 8h | 1,600 | **1.6%** |
| C — pessimistic, 3× the measured miss rate | 33,750 | **33.8%** |

Break-even moves from §3's **71,000** page views/day to **444,000** on the
pessimistic model and **1.33M** on the measured one.

## What is NOT established here, and matters

- **The 92.5% is from one location.** Each Cloudflare PoP caches independently,
  so a globally distributed spike misses more often than a single-origin test.
  Model C exists for that reason and is the one to plan against. It is a guess
  at the multiplier, not a measurement.
- **Nobody has read the actual Workers request counter.** Everything above is
  inferred from response headers. **Before launching, open Cloudflare →
  Workers → Requests and read the real daily number.** One look beats three
  models.
- **`stale-while-revalidate=86400` is doing a lot of the work.** If a future
  change drops it from `public/_headers`, this analysis expires with it.
- **This says nothing about the other free-tier limits** §3 raises — KV writes
  and Worker CPU time on a cold render. Cache misses still render.

## The recommendation

§3's stated reason for holding Show HN no longer holds, and `LAUNCH_KIT.md`
should not be followed as though it does. But "the blocker cleared" is not
"launch on Monday": HN is one shot and does not come back, and the honest
sequence is still the one `LAUNCH_KIT.md` already gives — the small subreddits
first, **as a capacity test with real users**, watching the Workers counter
between each. What has changed is that those steps are now a rehearsal rather
than a substitute.

The $5/month Workers Paid upgrade that §3 calls "not optional" is, on these
numbers, **optional** — and that is the one conclusion here worth acting on
immediately, because it is the item that made the plan cost money.
