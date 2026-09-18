# Revenue operations — the road to $100/day

**Owner goal:** $100/day in voluntary support, organic only, no paid spend.
**Status:** not started in earnest. The blocker is traffic, by roughly 30x.
**Last updated:** 2026-09-18 by Claude Code (session `eeb46cb4`).

> **If you are a new agent session picking this up cold, read this file first,
> then `AGENT_BOARD.md` §1–§3 at the blueprint root.** Everything below is
> measured unless it says otherwise. Do not replace a measured number with an
> estimate; re-measure it and update the number with its date.

---

## 1. The measured baseline

Cloudflare zone analytics, `getopentools.com`, complete days 14–17 Sept 2026.
Free plan retains about five days, so this window is all that exists — re-pull
before trusting it (query in §7).

| Metric | Value |
| :--- | :--- |
| Unique visitors / day | **~230** (98, 259, 321, 234) |
| Page requests / day | ~1,727 (17 Sept) |
| `/support` views / day | **11** — 0.6% of page requests |
| Guides | 558 pages drawing 293 views/day between them |
| Revenue | **Unknown.** Nothing records it. See §6. |

Traffic leans international (Germany, Canada, Brazil, Spain lead), so Buy Me a
Coffee at $5 is the realistic channel and UPI is the smaller one. A visible
slice of page requests are vulnerability scanners hitting `/xmlrpc.php` and
`/wp-login`, so the true human number is somewhat under 230.

## 2. The arithmetic

$100/day is twenty $5 coffees a day. The unknown is what share of visitors
give; nothing measures it here yet, so these are **scenarios, not facts**:

| Assumed conversion | Visitors/day needed | Multiple of today |
| :--- | ---: | ---: |
| 0.5% (excellent) | 4,000 | 17× |
| 0.2% (good) | 10,000 | 43× |
| 0.1% (typical) | 20,000 | 87× |

**The constraint is traffic, not the payment page.** A perfect funnel on 230
visitors still yields a few dollars a day.

## 3. ⚠️ The infrastructure ceiling — read before driving any traffic

**The account is on the Cloudflare free tier.** Verified 2026-09-18, not
inferred — a KV write is rejected with:

```
your account has reached the free usage limit for this operation for today [code: 10048]
```

That has a consequence chain which currently caps the entire business:

1. Free KV allows **1,000 writes/day**. The site has **631 URLs × 2 keys ≈
   1,262 writes** just to warm, and every deploy restarts the count.
2. So the KV-backed ISR cache **never populates**. `app/layout.tsx` sets
   `export const revalidate = 86400` intending a one-day edge cache.
3. With no cache entry, responses fall back to **`cache-control: no-store,
   must-revalidate`** and `x-vinext-cache: MISS`. Confirmed live on `/`,
   `/pdf/compress` and `/guides/pdf-merge-pdf` — **every page, every time**.
4. Nothing is cached at the edge or in the browser, so **every request invokes
   the Worker**.
5. Workers free allows **100,000 requests/day**. Measured ratio on 17 Sept:
   2,857 Worker requests for 2,022 page views ≈ **1.4 Worker requests per page
   view**.

**Therefore the site hard-stops somewhere around 70,000 page views in a day.**
A Hacker News front page delivers 20k–60k visitors in a few hours, at 2+ pages
each. The site would very likely go dark during the launch — and HN traffic
does not come back.

**This makes the $100/day goal unreachable on the current plan**, independent of
anything else in this document. Workers Paid is **$5/month** and includes 10M
requests and 1M KV writes — at the target, one day's revenue covers twenty
months of it. This is the hosting floor, not marketing spend. **It is the one
thing on this list that costs money, and it is not optional.**

Free mitigations worth trying first, in order (none verified yet — see §8):

- Stop warming all 631 URLs. Spend the 1,000 daily KV writes on the ~40 pages
  that actually get traffic instead, so those at least cache.
- Check whether a zone-level **Cache Rule** can serve HTML from Cloudflare's
  cache without invoking the Worker. Cache Rules exist on the free plan. Whether
  they bypass a Worker route needs verifying before being relied on.
- Cut the sitemap's 558 near-dormant guides out of the warm set.

## 4. Where traffic comes from — and where it does not

The technical SEO foundation is **good**, which surprised an earlier read of
this file. Verified 2026-09-18:

- `robots.txt` allows all, and explicitly allows `GPTBot`, `ClaudeBot`,
  `PerplexityBot`, `Google-Extended`, `Applebot`, `cohere-ai`. Good for AI
  search, which is a real and growing free channel.
- JSON-LD is present and rich: `SoftwareApplication`, `WebSite`, `Organization`
  on tool pages; `HowTo`, `FAQPage`, `BreadcrumbList` on guides.
- Titles target the wedge precisely — "Compress a PDF without uploading it".
- Guides are **~3,250 words**, not thin. The earlier "thin content" theory in
  this file was wrong and has been removed.

So guides get 0.5 views/day each because the domain has **no authority**, not
because the pages are bad. The property is new, the repo has ~1 star, and head
terms belong to iLovePDF and SmallPDF with millions of backlinks.

| Channel | Realistic first hit | Why it fits | Effort |
| :--- | :--- | :--- | :--- |
| **Show HN** | 10k–60k in 24h | Highest free single-day ceiling. **One shot** — do not fire before §3 is fixed. | One post |
| **awesome-selfhosted, awesome-privacy, free-for-dev** | steady + backlinks | Durable, and the backlinks are the only realistic fix for the authority problem. | A PR each |
| **r/selfhosted, r/privacy, r/degoogle** | 2k–15k per post | Ideologically aligned and donation-friendly. | One post each |
| **AlternativeTo, Product Hunt** | steady | Listed as the local alternative to SmallPDF. Compounds for years. | A listing each |
| **More guide pages** | ≈ 0 | Measured at 0.5 views/day each; decision 11 says consolidate, not multiply. | **Don't** |

## 5. What has shipped toward this goal

All live. None of it creates traffic — it makes sure traffic converts when it
arrives, and that the launch does not get torn apart.

| Date | Change | Version | Effect |
| :--- | :--- | :--- | :--- |
| 18 Sep | Support page usable on a phone | `9d6e1af2` | Pay button y=1805 → **y=600**; page 2147px → 1492px |
| 18 Sep | 3 tools could never ask for support | `f3393b10` | math-workbench had no `data-receipt-download`; 2 of 6 utility tools passed no `metrics`. Guarded. |
| 18 Sep | Egress proof made executable | `6fa3515a` | `e2e/egress-proof.spec.ts`, 6/6 Chromium + WebKit. Unearnable claims removed. See `docs/EGRESS_PROOF.md` |
| 18 Sep | Support button in header at every width | `2754c388` | 0 → 1 support links on the mobile first screen; sticky across scroll |
| 18 Sep | Open Graph share card | `a52ba99a` | `twitter:card` was `summary_large_image` with **no image** — every share rendered blank |

## 6. Measurement — what exists and what does not

**Nothing measures revenue.** That is rung 0 of any plan here: open the Buy Me
a Coffee dashboard and the UPI history, write down what has actually arrived to
date. Until that number exists, everything above is navigating blind.

Owner decision 6 forbids client-side analytics and that is not going to change,
so the instruments are: Cloudflare zone analytics (§7), the server visit log in
`proxy.ts`, and Search Console — which the owner checked on 2026-09-17 and found
too new to report rows. Re-check ~mid-October 2026; decision 11's guide
consolidation is gated on it.

Do not propose a metric the instruments cannot produce. Rule 38 deliberately
forbids the join key that would make conversion measurable.

## 7. How to re-pull the numbers

The wrangler OAuth token works for analytics. It does **not** have permission
for billing, subscriptions, or Web Analytics (RUM) — those return
`Authentication error` and need the dashboard.

```bash
TOKEN=$(python3 -c "
import re,io,os
p=os.path.expanduser('~/Library/Preferences/.wrangler/config/default.toml')
print(re.search(r'oauth_token\s*=\s*\"([^\"]+)\"',io.open(p,encoding='utf8').read()).group(1))
")
ZONE=8d0717d6296765daae4ec9b9621187fe   # getopentools.com
ACCT=00f21e5724f9ebf7b1ab0cb42ae76b1e
```

- **Daily visitors:** `httpRequests1dGroups` with `uniq { uniques }` and
  `sum { pageViews requests }`, filtered by `date_geq`.
- **Per-path traffic:** `httpRequestsAdaptiveGroups` with
  `dimensions { clientRequestPath }`. **The free plan refuses a range wider
  than one day** — query a single day at a time.
- **Worker requests:** `workersInvocationsAdaptive`, `scriptName:
  "local-tools-canary"`.
- **Tier check:** attempt a remote KV write. Code `10048` means free tier.

## 8. Open, in priority order

1. **Fix the §3 ceiling.** Owner decision: $5/month Workers Paid, or accept that
   the goal is capped. Everything else is downstream of this.
2. **Rung 0 — read the actual revenue.** Owner action, one evening.
3. **Turn off the Cloudflare analytics beacon** at source — it is edge-injected
   and currently blocked only by our CSP. See `docs/EGRESS_PROOF.md`.
4. **Launch kit** — Show HN text, subreddit posts, three awesome-list PRs.
   Drafted on request; **fires only after item 1**.
5. Verify the free cache mitigations in §3 before assuming any of them work.
6. Re-check Search Console for rows (~mid-Oct 2026), which unblocks decision 11.

---

*Amend this file rather than starting a new one. Every number here carries the
date it was measured; if you change a number, change its date.*
