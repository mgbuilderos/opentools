# Revenue operations — the road to $100/day

**Owner goal:** $100/day in voluntary support, organic only, no paid spend.
**Status:** not started in earnest. The blocker is traffic, by **roughly 700x**
at a typical donation rate — *not* the 30x this line claimed until 2026-09-19.
See §1 for the corrected baseline and §2 for the corrected arithmetic.
**Last updated:** 2026-09-19 by Claude Code (lane `Mar`). Previously 2026-09-18
(session `eeb46cb4`). See also `docs/LAUNCH_KIT.md` and `docs/EGRESS_PROOF.md`.

> **If you are a new agent session picking this up cold, read this file first,
> then `AGENT_BOARD.md` §1–§3 at the blueprint root.** Everything below is
> measured unless it says otherwise. Do not replace a measured number with an
> estimate; re-measure it and update the number with its date.

---

> # 🔴 EVERY CONVERSION CONCLUSION IN THIS FILE IS VOID
>
> **Established 2026-09-19 by the DEBUG lane, proven and independently
> re-verified. This is the most important thing on this page.**
>
> **The site has been unusable past the first page view.** `/sw.js` is served
> with `connect-src 'none'`. A service worker inherits the CSP of its own
> script's response headers, so the worker's navigate branch calls `fetch()`,
> the fetch is blocked, it throws, and the `.catch()` returns
> *"You are offline and this page has not been opened before."*
>
> So the sequence every visitor experienced was: **first page loads fine → the
> service worker installs and takes control → every navigation after that shows
> an offline error while their internet is working perfectly.** Measured on
> production in desktop Chrome, desktop Safari, and an emulated iPhone.
>
> **What that means for this document.** Nobody has been able to reach a tool, a
> guide, or `/support` after their first page view. Therefore:
>
> - **Zero voluntary support is fully explained by a broken product** — not by
>   weak copy, weak channels, a badly placed Support button, or weak conversion
>   mechanics. Every hour spent on funnel optimisation was spent on a site that
>   did not work.
> - **Every sentence in this file that reasons about conversion rate, funnel
>   behaviour, or supporter behaviour was measuring that broken site, and is
>   void.** They are marked **⚠️ VOID (2026-09-19)** where they appear. They are
>   *not deleted* — a record of what was wrongly concluded, and why, is worth
>   more than a clean page.
> - **The traffic numbers are unaffected.** §1's 27 visitors/day stands. The
>   failure happened inside the visitor's browser and **never reached
>   Cloudflare**, so it is in no log and no analytics. The data is not wrong; it
>   simply never saw this.
> - **"Traffic is the blocker" is still true, and is no longer the whole truth.**
>   27 visitors who can use the site are worth more than 27 who cannot, and every
>   Reddit post and indexed guide so far sent people to a site that failed on
>   their second click. Fixing this is a prerequisite to the traffic work, not a
>   competitor with it.
>
> **Status 2026-09-19: the route is chosen, the fix is NOT deployed.** ~~it needs
> an owner decision between two routes first~~ — the owner chose **Route 1**
> (*"route 1, run the checks and get it ready"*). The fix is being prepared and
> checked now. **It is not live.** **Do not assume it is live**, and do not
> re-open any conversion conclusion until it is live and a real visitor can
> reach `/support` on their second click.
>
> **Route 1 has a marketing price, and it is now this lane's problem, not
> DEBUG's:** the worker steps aside for navigations, which fixes the bug and
> **gives up offline support**. Every claim that the website works with no
> internet is now false. They have been found and dealt with — **see §9 for the
> complete list and the one decision it leaves you.**

---

## 1. The measured baseline

> **Corrected 2026-09-19.** This section said **~230 unique visitors/day**. That
> was a real measurement of the wrong population and it overstated the audience
> by about 8x. The corrected figure is **27/day**. Everything downstream of it —
> §2, §2b, and the "30x" in the header — was wrong in the optimistic direction.
> The old number is left visible below rather than quietly deleted, because the
> reason it was wrong is the same reason it will go wrong again.

**Headline, measured 2026-09-18, zone-only:**

| Metric | Value | Measured |
| :--- | :--- | :--- |
| **Unique visitors / 30 days** | **821** | 2026-09-18, 30-day zone audit |
| **Unique visitors / day** | **27.4** (821 ÷ 30) | derived from the above |
| Requests / 24h | 5,997 | `analytics/daily.jsonl`, window `2026-09-17T07:41:30Z → 2026-09-18T07:40:30Z` |
| …of which from a **named browser** | **749 (12.5%)** | same snapshot |
| 503 responses / 24h | **75** | same snapshot — see §3 |
| 404 responses / 24h | 946 | deliberate de-index |
| `/support` views / day | ~~11 — 0.6% of page requests~~ **⚠️ VOID (2026-09-19)** | measured 2026-09-17 on a site where most visitors *could not reach `/support` at all* — see the red block above. Not a conversion signal. |
| Guides | 558 pages | catalogue, not traffic — see the warning below |
| Revenue | **Unknown.** Nothing records it. See §6. | — |

**Why the old ~230 was wrong.** It was the mean of four daily `unique_visitors`
counts in `docs/traffic-log.csv` (98, 259, 321, 234 — mean exactly 228.0). The
audit row `2026-09-18-NOTE` in that same file records what those counts
contained: of 56.52k requests over 30 days, **35.72k (63%) came from a single
owner IP**, plus ChromeHeadless 20.66k (our own e2e suite), curl 5.04k, and an
`OpenTools-*` cache warmer. GoogleBot's 852 was the only real crawler signal.

**Why 230/day and 27/day can both be correct measurements.** A *daily* unique
count counts the owner's laptop, CI and the warmer once **every day**. A *30-day*
unique count counts each of them **once in total**. So adding up daily uniques
inflates the number by roughly the number of days; the 30-day zone figure does
not. **Use the 30-day figure. Never average daily uniques to get a visitor rate.**

**Two traps that produced wrong numbers here before (capsule §10, items 6 and 9):**

1. **Raw request counts are not visitors.** 5,997 requests, 749 from a browser —
   quoting the big number makes the site look 8x busier than it is. Use
   `estimatedBrowserRequests`, or zone unique visitors. Never `requests`.
2. **There is no per-page traffic data.** `docs/traffic-log.csv` is zone-level
   daily totals only, and the guides are barely indexed. "Top guides by traffic"
   **cannot be computed today.** Do not invent a ranking; the catalogue rank in
   `lib/seo/cached-guides.ts` is what the site actually uses, and it is a
   catalogue ordering, not a traffic ordering.

Traffic leans international (US 2,412 and IN 2,254 lead by request count, then
DE, NL, SG, CA), so Buy Me a Coffee at $5 is the realistic channel and UPI is
the smaller one. A visible slice of requests are vulnerability scanners hitting
`/config/.env`, `/admin/.env` and `/config/mail.php` — they are in the 946 404s.

**⚠️ This baseline is one day old and cannot currently be refreshed.**
`analytics/daily.jsonl` holds **one line**. The scheduled task
`opentools-traffic-snapshot` only fires while the Claude desktop app is open,
and Cloudflare discards the detail after a few days on the free plan — so
**every day the collector does not run is a day permanently lost.** How to
re-pull: §7. Owner action: §8 item 0.

## 2. The arithmetic

$100/day is twenty $5 coffees a day. The unknown is what share of visitors
give; nothing measures it here yet, so these are **scenarios, not facts**.
Recomputed 2026-09-19 against the corrected 27.4 visitors/day:

| Assumed donation rate | Visitors/day needed | Multiple of today | *(old, vs the wrong 230)* |
| :--- | ---: | ---: | ---: |
| 0.5% (implausible) | 4,000 | **146×** | ~~17×~~ |
| 0.2% (very good) | 10,000 | **365×** | ~~43×~~ |
| 0.1% (Wikipedia-with-banners) | 20,000 | **731×** | ~~87×~~ |
| 0.05% (typical for a quiet link) | 40,000 | **1,462×** | ~~174×~~ |

And the same arithmetic run forwards — what today's traffic is actually worth:

| Donation rate | $/day at 27.4 visitors | $/month |
| :--- | ---: | ---: |
| 0.5% | $0.68 | $20.53 |
| 0.2% | $0.27 | $8.21 |
| **0.1%** | **$0.14** | **$4.11** |
| 0.05% | $0.07 | $2.05 |

**The "30x" that headed this file until 2026-09-19 was wrong by more than
twenty-fold.** 30× of 27/day is ~820 visitors/day, which at a typical 0.1%
donation rate is about **$4/day, not $100**. Whoever repeats "we are roughly
30x away" is quoting a number that no longer exists.

**The constraint is traffic, not the payment page** — that part was always
right. A perfect funnel on 27 visitors yields cents. But the corrected
multiples change what follows from it: see §2b, whose conclusion the new
numbers strengthen rather than overturn.

> **⚠️ Amended 2026-09-19.** "The constraint is traffic, not the payment page"
> was used in this file to mean *the mechanics are fine, only the volume is
> missing*. The first half of that is now known to be false: the mechanics were
> not fine, because **most visitors could not reach the payment page at all**
> (see the red block at the top). The sentence survives as arithmetic — volume
> genuinely is the binding constraint on the $100/day goal — but it must no
> longer be read as evidence that the product side is done. There are now two
> constraints, and the product one is cheaper to fix.
>
> **The rates in the tables above and in §2b are external benchmarks** (what
> donation rates look like for free tools generally). Those are unaffected by
> our bug and remain the right planning assumptions. What is void is any
> inference drawn from *our own* observed behaviour.

## 2b. The uncomfortable part: donations alone probably do not reach $100/day

Run the arithmetic to its conclusion rather than stopping at "we need more
traffic".

$100/day is $3,000/month, or twenty $5 coffees every single day. Donation rates
for a free tool with a support page sit around **0.05%–0.2%** of visitors.
Wikipedia manages roughly 0.1% with sitewide banners nobody can miss; a quiet
support link does worse, not better.

| Donation rate | Visitors/day needed | vs today's **27** *(was: vs ~230)* |
| :--- | ---: | ---: |
| 0.5% (implausible) | 4,000 | **146×** *(~~17×~~)* |
| 0.2% (very good) | 10,000 | **365×** *(~~43×~~)* |
| 0.1% (Wikipedia-with-banners) | 20,000 | **731×** *(~~87×~~)* |
| 0.05% (typical) | 40,000 | **1,462×** *(~~174×~~)* |

**So the realistic donation target is 20,000–40,000 visitors a day.** That is
roughly a million visits a month, on a domain that was not indexed at all a day
ago, with ~1 GitHub star, and their millions of backlinks. It is a multi-year
project, and it may simply never arrive.

> **Corrected 2026-09-19.** The multiples above were computed against the wrong
> ~230/day baseline; against the real 27/day they are **8.5× larger than
> stated**. The conclusion of this section was already that "the arithmetic does
> not close" — the corrected numbers make that conclusion considerably stronger,
> not weaker. Nothing in §2b's reasoning had to be reversed; only its
> optimism.

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
| **Show HN** | 10k–60k in 24h | Highest free single-day ceiling. **One shot.** ⛔ **HELD — see §4a.** | One post |
| **awesome-selfhosted** | steady + backlinks | Durable, and the only realistic fix for the authority problem. ⛔ **Still blocked, but not for the reason stated here before — see §4a.** | see §4a |
| ~~free-for-dev~~ | — | **Ruled out 2026-09-18.** Its contributing guide scopes the list to SaaS with free tiers for DevOps practitioners. Browser utilities are out of scope; a PR would be rejected. | don't |
| **r/selfhosted, r/privacy, r/degoogle** | 2k–15k per post | Ideologically aligned and donation-friendly. ⛔ **HELD — see §4a.** r/privacy also blocks self-promotion. | One post each |
| **AlternativeTo, Product Hunt** | steady | Compounds for years. Product Hunt is one-shot and **HELD**; AlternativeTo is a listing, not an event, and is not held. | A listing each |
| **More guide pages** | ≈ 0 | Measured at 0.5 views/day each; decision 11 says consolidate, not multiply. | **Don't** |

## 4a. Channel status, re-measured 2026-09-19 — two corrections and one decision

Everything here was measured in this session, not carried forward.

### The site is four days old, and that reframes the rest

```
GET https://api.github.com/repos/mgbuilderos/opentools
  created_at : 2026-09-15T12:45:40Z      ← the public repository is 4 days old
  stars      : 1 · license: MIT · private: false
  description: "All-in-one micro tools"
```

27 visitors/day and 1 star on a four-day-old site is not an underperforming
business; it is a site that has barely been discovered. §2's arithmetic is still
true and still uncomfortable, but read it against this: nothing has had time to
compound, and search — the only channel that plausibly reaches thousands a day —
pays out over months.

### Correction 1 — the container is public; that line was stale

```
ghcr.io anonymous token → issued
GET /v2/mgbuilderos/opentools/manifests/latest → HTTP 200
```
The image is on GHCR and pulls anonymously. "Docker Hub 404s" no longer applies.

### Correction 2 — awesome-selfhosted is blocked by *time*, not by the release

This is the useful finding, and it saves a public rejection.

**The submission process moved.** The main repository refuses PRs outright:
`.github/PULL_REQUEST_TEMPLATE.md` reads *"Please do not submit pull requests in
this repository. Use .../awesome-selfhosted-data instead."* Following the old
plan means opening a PR in the wrong repo.

**The requirement we fail** — `awesome-selfhosted-data/CONTRIBUTING.md` line 21:
*"first release more than four months old, actively maintained, working
installation instructions, not already listed elsewhere"*, and line 152:
*"This count initiates only after a release has been created."*

**Our position:** `GET /repos/mgbuilderos/opentools/releases` → **no releases**.
There is a tag `v0.1.0` but no Release object, **so the four-month clock has not
started at all.** A PR today is closed publicly with that exact message.

> **Therefore: create a GitHub Release for `v0.1.0` today.** Nothing else starts
> the clock, it costs two minutes, and every day it is not created is a day
> added to the earliest submission date. Released today → eligible **2027-01-19**.
>
> **⚠️ Re-measured 2026-09-19, 20:52Z: still zero releases.** The clock is still
> at zero and the earliest eligible date has already moved. Step-by-step
> instructions and a table of what each day of delay costs are in §11.

### The decision: the one-shot channels are held

Show HN, Product Hunt and the large subreddits are **single-use**. Their value is
spent on the day they fire, whatever the site does that day.

Measured this session, twice, with a full browser UA:

```
GET https://getopentools.com/pdf/merge
  HTTP/2 200 · cf-cache-status: BYPASS
  cache-control: no-store, must-revalidate · x-vinext-cache: MISS  (both)
```

Every request re-renders uncached. That is precisely the condition that produced
**1,316 `exceededResources` 503s in one hour** on 2026-09-16, and 75 503s were
still recorded in the 24h to 2026-09-18. A Show HN front page is 10k–60k visits
in a day.

**Firing a one-shot channel into an uncached site does not fail gracefully — it
converts the largest free traffic event available into an outage, and the
channel does not come back.**

**And there is now a second, worse reason to hold — the decisive one.** DEBUG
proved on 2026-09-19 that the service worker shows *"You are offline"* on
**every navigation after a visitor's first page view** (see the red block at the
top of this file). A Show HN front page sent to that site does not produce an
outage; it produces 30,000 people who click one thing, get an error, and never
return. **That is worse than not posting at all**, and it is the clearest
possible argument for holding: the ammunition would be spent showing the largest
technical audience available a broken site.

**Held until all three are true:**

1. The service-worker fix is **deployed and verified on production** — a real
   second click reaches a tool and `/support`. *(DEBUG; **Route 1 chosen
   2026-09-19**, being prepared and checked, ~~owner must choose between two
   routes~~ — still **not deployed**, and the deploy is the owner's call.)*
   **When the launch copy is written, remember Route 1 removed "works offline"
   from the pitch — §9.**
2. `x-vinext-cache: HIT` on a second request — capsule §9.3's bar. *(TECH.)*
3. Capsule §9.1 formally closed.

This lane's job is to have everything ready for that day and not to spend the
ammunition early.

*(From the same measurement, and consistent with DEBUG's diagnosis: the **served
HTML is correct** — 60,614 bytes, `<title>Merge PDF · OpenTools`, and **zero**
occurrences of "You are offline". The offline text is generated by the service
worker inside the visitor's browser, which is why it never appeared in any
server log, in Cloudflare analytics, or in `analytics/daily.jsonl`. Our traffic
data is not wrong — it simply never saw this failure. `/robots.txt` allows all
major and AI crawlers, and `/sitemap.xml` serves 651 URLs.)*

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

**Rewritten 2026-09-19.** Items 3 and 5 of the previous list are **done** (the
Cloudflare beacon is off at source and verified gone; the sitemap is submitted
and serving 651 URLs). The order below is what is actually open, and the top
three are all owner actions that take minutes.

### Owner actions — nothing here needs technical knowledge

| # | Action | Why it is above everything else | Time |
| :--- | :--- | :--- | :--- |
| **A0** | ~~Decide which of DEBUG's two routes fixes the service worker~~ **DECIDED: Route 1.** ⭐ **Now: let the fix deploy.** | **Half of this is done.** You chose Route 1 on 2026-09-19 (*"route 1, run the checks and get it ready"*). The fix is being prepared and is **NOT live** — it still needs your go-ahead to deploy. Until it deploys, the site is still unusable past the first page view (red block at the top), every visitor this lane attracts is still wasted, and no revenue work can be evaluated. **What Route 1 costs is in §9 — read it, because it is a marketing cost, not just a technical one.** | one go-ahead |
| **A1** | **Open the Claude desktop app daily so `opentools-traffic-snapshot` fires**, or run `node analytics/collect-daily.mjs` by hand | `analytics/daily.jsonl` has **one line**. On the free plan Cloudflare discards the detail after a few days, so a day not collected is a day **permanently lost** — and every future decision here is made against this history. | 1 min/day |
| **A2** | **Send the FUTO email to `grantapps@futo.org`.** The whole email is written. **You need to write two short bits yourself — see §10 for exactly what they are, in plain words.** | **Near-term revenue is grants, not donations.** §2 shows donations yield about $4/day at today's traffic. A grant is $1,000–$5,000. The draft is finished and every link in it has been checked. It is waiting only on two paragraphs nobody else can write. | 20 min |
| **A3** | **Create a GitHub Release for `v0.1.0`.** ⚠️ **Re-measured 2026-09-19 (20:52Z): still not done — the API reports zero releases.** | The awesome-selfhosted four-month clock has **not started** — there is a tag (`v0.1.0`, `9850a8e8`) but no Release object, and only a Release starts the clock. **Every day this is not done adds a day to the earliest submission date**, which is the only thing standing between this project and the one directory that would fix its authority problem. GitHub → Releases → Draft a new release → choose the existing `v0.1.0` tag → Publish. See §4a. | 2 min |
| **A4** | **Fix the repository's front door — description *and* topics.** Both are on the same settings panel, one visit. ⚠️ **Re-measured 2026-09-19: neither is done.** | See §11 — it has the exact text to paste. The description still reads *"All-in-one micro tools"*, which is the first thing a grant reviewer or anyone following any link sees, and it says nothing about the one property every pitch rests on. **New finding: the repo's topics are `apps` and `tools`** — the two most crowded, least specific tags on GitHub. Topics are how people *browse* GitHub, and this is a free, reversible, non-one-shot discovery channel that is currently switched off. | 3 min |
| **A5** | **Check Search Console → Indexing → Pages** | 651 URLs submitted, nobody has looked at how many are *indexed*. Search is the only channel that reaches thousands/day; this is the only instrument that shows whether it is working. Also unblocks decision 11. | 5 min |
| **A6** | **Rung 0 — read the actual revenue.** Open the Buy Me a Coffee dashboard and the UPI history and write down what has arrived | Nothing records revenue. Until that number exists, every projection here is navigating blind. | 30 min |
| **A7** | **Decide on Workers Paid, $5/month** | Standing answer is no spend until it earns, which is legitimate. §3 and `docs/CACHE_BUDGET.md` exist so the cost of that answer stays visible rather than being rediscovered each time the cache goes quiet. | — |

### Blocked on other lanes — do not spend these early

1. **The one-shot channels (Show HN, Product Hunt, the large subreddits) are
   HELD.** Measured 2026-09-19: the cache serves MISS on every request. Firing a
   single-use channel into an uncached site turns the largest free traffic event
   available into an outage, permanently. Release condition: `x-vinext-cache:
   HIT` on a second request, and capsule §9.1 closed. See §4a.
2. **The guide cache allowlist is written, green and UNPROVEN.** See
   `docs/CACHE_BUDGET.md` — including the finding that trimming the allowlist
   cannot fix the write quota at any size, because at the observed deploy rate
   the allowance affords fewer pages than are already cached. The lever is the
   build id, which is the TECH lane's.
3. ~~**The OTF application is drafted and BLOCKED on board queue C5** — the EXIF
   scrubber returns bytes unchanged for WebP, HEIC, AVIF, TIFF and GIF while
   telling the user everything was stripped.~~
   **✅ UNBLOCKED 2026-09-19. It was never still broken — it was fixed on
   2026-09-17 and nobody closed the ticket.** Verified in this lane against the
   code *and* against the JavaScript the live site actually serves: the scrubber
   now cleans JPEG and PNG and **refuses HEIC, AVIF, WebP, TIFF and GIF by name,
   producing no file for them**, and the sentence *"All EXIF, GPS locations,
   camera serials… completely stripped"* appears nowhere on the live site.
   24 of 24 tests pass.
   **Note what "fixed" means here, because it changes the application:** the
   claim was narrowed to match what the tool can do, not the other way round.
   **HEIC is the default camera format on every recent iPhone**, so someone
   stripping location from a phone photo gets an honest refusal rather than a
   clean file. The OTF draft now asks for funding to close exactly that gap
   instead of implying it is already closed. See `docs/OTF_APPLICATION_DRAFT.md`
   — remaining before sending: confirm on `opentech.fund` which fund is open,
   and the same two `[YOU]` paragraphs as FUTO.

### Standing

- **NLnet last**, and keep the geography warning in
  `docs/NLNET_APPLICATION_DRAFT.md` intact: EU / Horizon inhabitants are
  prioritised and others need "a clear European dimension". **Do not restate
  that it has no geographic restriction** — that error has been made once.
- **Do not build more guide pages.** Measured at 0.5 views/day each.

---

## 9. Route 1 and the offline claims — added 2026-09-19

### What this costs you, in one paragraph

**You approved the right fix, and it has a price in marketing that nobody had
written down yet.** Route 1 repairs the bug that made the site unusable after
one click. The way it does that is by switching off the part that let the site
work with your internet turned off. So from the moment it deploys, **"works
offline" is no longer true of the website, and every place we said it becomes a
false claim.** That is not a reason to reconsider — a site that works only
online beats a site that doesn't work at all — but the claims have to come down
with it, and this section is the list.

**The good news, and it is genuinely good:** the claim that actually sells this
project is untouched. *Your files are never uploaded, and you can check that
yourself in thirty seconds* is enforced by the browser, proven on every release,
and completely unaffected by Route 1. It was always the stronger line. Launch on
it.

### Two different things are both called "offline" — keep them apart

Collapsing these is how the false claim gets written again, so it is worth
thirty seconds:

| | Does Route 1 break it? |
| :--- | :--- |
| **"The website loads and works with your internet off."** The installed-app / PWA promise. | **YES — dead.** Remove every instance. |
| **"Your file is processed on your own machine and never uploaded."** Zero-egress. | **No.** Untouched, still enforced by `connect-src 'none'`, still proven per release. |
| **"The self-hosted container runs with no network at all."** (`--network none`) | **No.** Untouched and still verified. Offline *self-hosting* survives. |

### The complete list — every place that claimed the website works offline

Swept 2026-09-19 across the whole repository, not just this lane's files.

**Fixed in this session** (claims removed, each with the reason recorded beside
it in the file so nobody restores it):

| Where | What it said | Now |
| :--- | :--- | :--- |
| `components/install-prompt.tsx` — **the banner real visitors see** | "Works offline afterwards" (iPhone) and "Install it and every tool keeps working — even with no internet." (Chrome/Android) | "Opens in its own window, one tap from your home screen." Still a real benefit, and true. |
| `docs/GROWTH_IDEAS.md` — **the launch plan** | *"'works with no internet' is a stronger hook for Hacker News and r/selfhosted than anything else available"* | Struck through, marked VOID. **This was our best launch headline and there is no equal replacement.** |
| `docs/GROWTH_IDEAS.md` — changelog row | "Now installable, and the tools work with no network — which no server-side competitor can match" | Struck through, marked VOID |
| `docs/LAUNCH_KIT.md` — **the store listing** | `offline` in the tag list | Tag removed |
| `CLAUDE_CODE_OPENSOURCE_AND_SUPPORT_PROMPT.md` | "100% Private & Offline-Ready" badge | "100% Private & Zero-Upload" |
| `lib/tools/writing-workbench.ts` | sample document asserting OpenTools "Works offline" | Replaced with a verification row that is true |
| `lib/tools/creator-workbench.ts` | mockup default tagline "Private Offline Utilities in Your Pocket" | "Private Utilities That Never Upload Your Files" |
| `README.md` | "go offline, and run a tool" — true, but a reader who *reloaded* while offline would think we were lying | Made precise: load the tool first, don't reload while offline |

**Not this lane's to touch — someone else has to do these:**

| Where | What | Whose |
| :--- | :--- | :--- |
| `public/sw.js` | The worker's own *"You are offline and this page has not been opened before."* — the sentence at the centre of the whole bug | **DEBUG**, as part of Route 1 |
| `app/support/page.tsx` line 126 | "offline PDF page operations" — ambiguous. It reads as "PDF work done locally", which stays true, so it is **not urgent**; it is listed only so the sweep is complete. | **Antigravity** owns `/support`. Needs your word in chat before anyone edits it. |

**A decision for you — I deliberately did not change these on my own:**

These are **search keywords**, not sentences a visitor reads. Removing them
costs traffic, which is the one thing this project cannot spare; keeping them is
a small honesty risk, because someone searching "offline pdf tools" may want a
tool that works with the internet off.

| Where | What |
| :--- | :--- |
| `app/layout.tsx` | keywords `offline pdf tools`, `pdf merge offline` |
| `lib/seo/blog-data.ts` | keywords `combine pdf offline`, `developer base64 tool offline`, `typescript zod generator offline`, and the live URL slug `how-to-convert-json-to-zod-schema-offline` |

**Recommendation: keep them.** In this niche "offline tool" is how people search
for *"doesn't upload my file"*, which is exactly what we are. The keyword tag
itself is invisible to visitors and has been ignored by Google since 2009, and
the slug is a live indexed URL — changing it throws away the indexing we are
trying to build. **The rule that matters is the one already applied above: never
make the offline claim in a sentence a human reads.** Say so if you disagree and
it is a five-minute change.

**Checked and deliberately left alone — these are TRUE and say something else:**

`app/llms.txt/route.ts` (the container runs with `--network none`),
`docs/SELF_HOSTING.md`, `docs/NLNET_APPLICATION_DRAFT.md` line 82,
`.github/SECURITY.md` line 80 (the egress proof, correctly ordered),
`lib/tools/document-workbench.ts` (processing is client-side, which stays true),
`lib/tools/qr-barcode-workbench.ts` (describes the *output file*),
`lib/templates/templates-data.ts` (about Obsidian, not this site),
`components/smart-dropzone.tsx` (sample JSON), and
`docs/SYSTEMS_ARCHITECTURE_AND_PRE_MORTEM.md` (`OfflineAudioContext`, a browser
API name).

**Nothing to do, verified clean:** `public/site.webmanifest` and
`extension/manifest.json` make no offline claim; all **39** tools in
`lib/tools/catalog.ts` are already marked `offlineReady: false`; the **FUTO and
OTF grant drafts contain no offline claim at all**. `dist/**` is build output and
regenerates.

---

## 10. The two things only you can write — for the FUTO email (A2)

**Plain version: the email is finished. Two short bits are marked `[YOU]` in
`docs/FUTO_APPLICATION_DRAFT.md`, and they are the two bits that cannot be
ghostwritten. Neither is technical. Send to `grantapps@futo.org`.**

**1. Who you are and why you built this** — one or two sentences, near the end
of the email (line 75).

Not a CV, not a company, not a pitch. They fund people. Something in the shape
of: *who you are, and the reason these tools exist.* If the honest reason is "I
wanted these tools to exist and did not want to upload my files to anyone", that
is a good answer — it is the same reason FUTO exists.

**You do not have to claim to be an engineer, and you should not.** The draft
(`docs/FUTO_APPLICATION_DRAFT.md`, "Will they ask a technical question?") makes
the case that saying plainly you are not from an IT background is a legitimate
choice and some reviewers respond well to it. What would cost you the
application is answering a technical question with a guess. If one arrives,
bring it here and it gets answered properly before you reply.

**2. Your name and an email address you actually check** — the sign-off (line
80). That is all. It is a real application; they will reply to that address.

**Before you hit send**, two things are already done and need nothing from you:
every link in the email has been clicked and verified, and the traffic figure in
it is the corrected ~27/day, not the old wrong 230. Nothing else is outstanding.

**The same two paragraphs unlock OTF**, which is now unblocked (§8). Write them
once and they serve both applications.

---

## 11. The repository front door — exact text to paste (A3, A4)

**Why this is worth three minutes of your time.** The GitHub repository is where
every grant reviewer, every Reddit reader and every directory moderator lands
after clicking any link we send them. Right now it says *"All-in-one micro
tools"* and is filed under *"apps"* and *"tools"*. Nothing about it tells anyone
what this project is, and the four-month clock that gates the single best
directory listing has not started ticking.

**Re-measured 2026-09-19, 20:52Z, from the GitHub API** — all three still open:

```
created_at        2026-09-15T12:45:40Z    (the public repo is 4 days old)
description       "All-in-one micro tools"
topics            ['apps', 'tools']
releases          0                        <- the clock has NOT started
tags              v0.1.0  9850a8e8         <- a tag is not a Release
stars             1
license           MIT
homepage          https://getopentools.com/
```

### 1. Description — paste this

> `550 browser tools that are provably unable to upload your files — MIT, no server, no account`

It is your repository, so change the wording if you prefer. The one thing to
keep is the verifiable claim; that is what every application, post and listing
rests on.

### 2. Topics — replace `apps`, `tools` with these

> `privacy` `privacy-tools` `client-side` `browser-tools` `webassembly`
> `pdf-tools` `image-processing` `self-hosted` `docker` `no-tracking`

Same settings panel as the description. Topics are reversible at any time and
cost nothing.

> **⚠️ Do not add the topic `local-first`, even though it looks like a perfect
> fit.** In developer usage "local-first" means *works offline and syncs later*.
> After Route 1 that is exactly what this site no longer does (§9), so it would
> quietly reintroduce the claim we have just spent this session removing — in the
> one place nobody would think to check. Noted here because it is a trap, not an
> oversight.

### 3. Release — GitHub → Releases → Draft a new release → tag `v0.1.0` → Publish

**This is the one with a clock.** `awesome-selfhosted` requires a first release
**more than four months old**, and their own wording is that the count *"initiates
only after a release has been created"*. There is a tag but no Release, so as of
today the count stands at **zero days**.

| If the Release is published on | Earliest eligible submission |
| :--- | :--- |
| Today, 2026-09-19 | **2027-01-19** |
| A week from now | 2027-01-26 |
| A month from now | 2027-02-19 |

Nothing else about the project changes this date, and no amount of later work
brings it forward. It is two minutes, today, for four months of waiting that is
already running in the background.

---

*Amend this file rather than starting a new one. Every number here carries the
date it was measured; if you change a number, change its date.*
