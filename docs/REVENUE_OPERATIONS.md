# Revenue operations — the road to $100/day

**Owner goal:** $100/day in voluntary support, organic only, no paid spend.
**Status:** not started in earnest. The blocker is traffic, by roughly 30x.
**Last updated:** 2026-09-18 by Claude Code (session `eeb46cb4`). See also
`docs/LAUNCH_KIT.md` and `docs/EGRESS_PROOF.md`.

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

## 2b. The uncomfortable part: donations alone probably do not reach $100/day

Run the arithmetic to its conclusion rather than stopping at "we need more
traffic".

$100/day is $3,000/month, or twenty $5 coffees every single day. Donation rates
for a free tool with a support page sit around **0.05%–0.2%** of visitors.
Wikipedia manages roughly 0.1% with sitewide banners nobody can miss; a quiet
support link does worse, not better.

| Donation rate | Visitors/day needed | vs today's ~230 |
| :--- | ---: | ---: |
| 0.5% (implausible) | 4,000 | 17× |
| 0.2% (very good) | 10,000 | 43× |
| 0.1% (Wikipedia-with-banners) | 20,000 | 87× |
| 0.05% (typical) | 40,000 | **174×** |

**So the realistic donation target is 20,000–40,000 visitors a day.** That is
roughly a million visits a month, on a domain that was not indexed at all a day
ago, with ~1 GitHub star, against iLovePDF and SmallPDF and their millions of
backlinks. It is a multi-year project, and it may simply never arrive.

This is not an argument to stop. Free traffic compounds, costs nothing, and
every visitor is also a candidate for the path below. It **is** an argument that
optimising the donation funnel cannot be the whole plan, because the arithmetic
does not close.

### The same $3,000/month, counted differently

| Path | What it takes |
| :--- | :--- |
| Donations | ~1,000,000 visits/month |
| **Self-hosted deployments** | **30 organisations at $100/month** — or 6 at $500, or 3 at $1,000 |

Thirty customers versus a million visits. Both are hard. One is about a hundred
times more tractable, and the asset for it **already exists and is verified**:
`claude/selfhost` builds a two-stage container that runs under `--network none`
with every page serving `connect-src 'none'` and outbound requests failing to
resolve (AGENT_BOARD §8, 2026-09-17). It was never published.

**Why this fits rather than compromises the product.** The entire thesis — files
never leave the device — is not a nice-to-have for law firms, clinics,
accountants, government departments and anyone under GDPR, HIPAA or DPDP. It is
a compliance requirement they are currently failing, because their staff upload
client documents to random free websites anyway. A self-hosted instance inside
their network is the fix, and it is worth real money to them.

**It does not touch decision 13 or rule 35.** Those govern the public site: no
paid tier, nothing gated, no differential treatment by donation amount. All of
that stays exactly as it is — every tool free forever. MIT means the software
cannot be licence-fee'd, and it is not: what an organisation pays for is
deployment, support and maintenance. That is the ordinary open-source model and
it is the one this repo's own memory already names ("code is MIT — no licence
fees; sell support").

**The two paths feed each other.** Free traffic is how a compliance officer
finds the tool in the first place; the self-host page is what converts them.
Nothing above changes the free-traffic work — it changes what that traffic is
*for*.

### What this implies, concretely

1. **Publish the self-host release.** The container is built and verified; it
   needs a tagged release and a published image. This is the single highest
   revenue-leverage item on this page.
2. It **unblocks awesome-selfhosted**, which is also the best durable fix for
   the authority problem in §4. One action, two payoffs.
3. **Write one page for organisations** — "run OpenTools inside your network" —
   stating what it is, that the software is free and MIT, and that paid help
   with deployment and support exists. That page is what a compliance officer
   forwards to their manager.
4. Keep every free-traffic action in §4 running unchanged.

**This is a strategy decision, not an implementation detail, so it is the
owner's to make.** It is recorded here because the arithmetic in §2 does not
close without it, and a plan whose arithmetic does not close should say so.

---

## 2c. B2B is dropped — owner decision, 2026-09-18

**Do not resurrect this without the owner raising it first.** The reasoning is
not that the model is wrong; it is that it does not fit who is running it.

§2b argued for selling deployment and support to organisations, and the
arithmetic there still holds. What it quietly assumed was a technical services
business: a support subscription means answering "our reverse proxy is dropping
the CSP header" at 9pm, a deployment engagement means working inside someone
else's infrastructure, bespoke tools means writing them. **The owner is
non-technical and working alone**, so none of that is deliverable, and a page
inviting organisations to deploy creates an obligation that cannot be met.

Removed: `app/self-hosted/page.tsx` and its sitemap entry, and the
organisational/compliance framing in `llms.txt`.

**Deliberately kept**, because these are traffic assets rather than commercial
ones: the `Dockerfile`, `docs/SELF_HOSTING.md`, `docker-compose.yml`, the
published container, and a factual mention of self-hosting in `llms.txt`.
r/selfhosted and awesome-selfhosted are discovery channels and both need the
capability to exist — they do not need a sales page.

`lib/security/self-host-auth.ts` stays too, with 22 passing tests, but it is
**wired to nothing** (zero references in `proxy.ts`) and therefore ships no
behaviour. Left in place rather than deleted because it is correct and cheap to
keep; do not wire it up without a reason that has nothing to do with B2B.

**What this leaves.** The monetisation paths that need no live technical
conversation, which is the real constraint:

| Path | Live technical conversation needed |
| :--- | :--- |
| Donations | None |
| The NLnet grant | None — a written application |
| ~~Support contracts~~ | Ongoing technical delivery |
| ~~Deployment work~~ | Hands-on infrastructure |

So traffic is now the entire game rather than half of it: every remaining path
converts visitors, not conversations.

---

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

## 3a. The 503s — why Google is being told to crawl less

Measured 2026-09-18: **76 × 503 in one day, every single one on `/guides/*`.**
Not one on a tool page. Meanwhile GoogleBot is actively crawling (393 requests,
plus ~1.4k from `66.249.79.x`).

That combination is the problem. Google reads repeated 503s as a struggling
origin and **throttles crawl rate** — so the site is currently teaching Google
to crawl it less, at the exact moment it started crawling at all. Every SEO,
AEO and GEO improvement is downstream of this: a page that 503s cannot be
indexed, and cannot be cited by an answer engine.

**The chain, measured end to end:**

1. **Nothing is prerendered.** `find dist -name "*.html"` returns **zero**. Every
   route builds as `?` or `ƒ`, so all 558 guides render in the Worker on every
   request. `generateStaticParams()` exists in the guides route and produces no
   files.
2. The KV page cache would absorb that, and does not — see §3.
3. Guides are the heaviest pages on the site (~3,250 words plus `HowTo`,
   `FAQPage` and `BreadcrumbList` JSON-LD), so a cold render exceeds the
   free-tier Worker CPU budget.
4. 503.

**Both escape routes are closed by the free tier, and this is the important
part.** `vite.config.ts` records why prerender is off, and the reasoning was
sound when written:

> Build-time prerender is deliberately NOT enabled: it bundles every page into
> the Worker script (3.0MB gzip vs 0.96MB) for no gain once the KV cache fills
> on the first request to each URL.

The premise — *"once the KV cache fills"* — is no longer true. It never fills,
because free KV allows 1,000 writes/day against ~1,262 needed to warm the site.
And the alternative collides with the other free limit: **a 3.0MB gzip Worker
script is at or over the free-plan script-size ceiling** (verify the current
number before attempting it; paid is far higher).

So: the KV route is blocked by the KV write cap, and the prerender route is
blocked by the script-size cap. **On the free plan the 503s are structural, not
a bug to fix.** That is the strongest argument yet for §3's conclusion, and it
now costs crawl rate rather than just speed.

Free things still worth trying first, in order:
- Cut guide render cost below the CPU budget (fewer JSON-LD blocks, lighter
  markup). Unproven, and guides are the pages whose schema you least want to
  thin.
- Prerender **only** the ~40 tool pages and leave guides dynamic, if vinext
  supports partial prerender — keeps the bundle small. Unverified.

---

## 3b. Discovery — the site was not indexed at all

Measured 2026-09-18. `site:getopentools.com` returned **no pages from the
site**, and a search for one of its own exact page titles ("Compress a PDF
without uploading it") found nothing in Bing. 631 URLs, none discoverable.

**Acted on:** `public/<key>.txt` + `scripts/submit-indexnow.mjs`, and **631 URLs
submitted to IndexNow, HTTP 200**, reaching Bing, Yandex, Seznam and Naver in
one call. Bing matters beyond Bing — it backs DuckDuckGo, Copilot and ChatGPT
search. Re-run with `npm run indexnow` after a deploy that adds or materially
changes pages; the protocol discourages resubmitting unchanged URLs, so use the
explicit-path form (`node scripts/submit-indexnow.mjs /pdf/merge`) for small
changes.

**Still open — Google.** No verification tag is being served at all:
`google-site-verification`, `msvalidate.01` and `yandex-verification` are all
unset, so Search Console is very likely not verified and the sitemap has never
been submitted to the largest engine. The plumbing exists in `app/layout.tsx`
(`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and friends); it needs the token from
Search Console and a rebuild. **Owner action, and the single highest-value one
on this page after §3.**

**Brand note, load-bearing for keyword choice:** "OpenTools" is heavily
contested — `opentools.com` is a YC company (LLM tool-use API) and
`opentools.io` is another free-tools site. **Do not spend effort ranking for the
brand name.** Everything goes into task queries where the wedge is the
differentiator: "compress pdf without uploading", "merge pdf offline",
"strip exif online private". The existing page titles already do this well.

---

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
| **awesome-selfhosted** | steady + backlinks | Durable, and the only realistic fix for the authority problem. Requires a first release over four months old. **No longer blocked on the image:** `ghcr.io/mgbuilderos/opentools` is published and public — it was never going to Docker Hub. `v0.1.0` was tagged 2026-09-18, so the gate lifts 2027-01-18. | ship self-host first |
| ~~free-for-dev~~ | — | **Ruled out 2026-09-18.** Its contributing guide scopes the list to SaaS with free tiers for DevOps practitioners. Browser utilities are out of scope; a PR would be rejected. | don't |
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
| 18 Sep | Immutable caching for hashed assets | `2a215238` | 69 files served `max-age=0, must-revalidate`; ~15 revalidations per page view removed |
| 18 Sep | IndexNow submission | `129a5601` | Site was unindexed; 631 URLs pushed to Bing/Yandex/Seznam/Naver, HTTP 200 |

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
4. **Launch kit — written, see `docs/LAUNCH_KIT.md`.** AlternativeTo and the
   smaller subreddits are safe to fire today; **Show HN is gated on item 1**,
   because an HN front page exceeds the free ceiling in an afternoon and that
   traffic does not come back.
5. **Verify Google Search Console** and submit the sitemap — see §3b. No
   verification tag is currently served.
6. Verify the free cache mitigations in §3 before assuming any of them work.
7. Re-check Search Console for rows (~mid-Oct 2026), which unblocks decision 11.

---

*Amend this file rather than starting a new one. Every number here carries the
date it was measured; if you change a number, change its date.*
