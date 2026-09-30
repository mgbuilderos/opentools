# Distribution to 10,000 a day

**Written:** 2026-09-30. **Status:** proposal for the owner. Nothing here is
submitted, posted or published. **Companion to** `docs/LAUNCH_KIT.md` (the copy),
`docs/APP_CATALOGUES.md` (the self-host stores), `docs/GROWTH_IDEAS.md` (the
thinking), `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` (the constraint set) and
`docs/REVENUE_OPERATIONS.md` (what the traffic is for).

> **The constraint set in `ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §2 (C1–C9)
> governs this document too.** Nothing below asks to weaken it. Where a tactic
> touches C9 (no spend) it is named as a decision for the owner rather than
> slipped in as a cost.
>
> **Every number below carries its source and date.** Where a figure is a
> requirement rather than a measurement, it says so in the same sentence. The
> failure mode this repository keeps catching — a growth number that was
> generated rather than looked up — is the one this document is most exposed to.

---

## 1. Where we actually are

Measured, with dates. Nothing here is estimated.

| Measure | Value | Source, date |
| :--- | ---: | :--- |
| External arrivals / day | **483 – 1,101** | `docs/traffic-log.csv`, 20–23 Sep 2026 |
| Of those, loaded 2+ pages | **37 – 187** | same rows |
| `/support` views / day | **5 – 13** | same rows |
| Search clicks, 3 months | **0** | `SEARCH_CONSOLE_BASELINE_2026-09-23.md` |
| Search impressions, 3 months | ~18, across 18 queries | same |
| Average position | **65.8** | same |
| URLs indexed / not indexed | **134 / 552** | same |
| — of which *discovered, not indexed* | **534** | same |
| Sitemap URLs served live | 1,413 | same |
| Live tool routes | 691 | `README.md`, generated data |
| GitHub stars / forks | **1 / 0** | GitHub API, 2026-09-30 |
| Repository age | **15 days** | created 2026-09-15 |
| Releases | `v0.1.0` (18 Sep), `v0.2.0` (30 Sep) | `CHANGELOG.md` |

**The honest read of that table.** Somewhere between 150 and 200 people a day
actually look around. Search contributes nothing at all — not "a little", zero
clicks in three months. Essentially every arrival today comes from a link
someone followed, and there are almost no links.

The gap to 10,000 a day is **roughly 10× on raw arrivals and 50× on people who
engage.** That is the size of the problem, stated before any plan.

---

## 2. The finding this document exists for

The instinct behind "we need a very strong distribution" is right, and the
diagnosis usually attached to it is wrong. It is not a content problem — 691
live tool routes for a 15-day-old site is already more product than the
distribution can carry.

**It is a surface problem. There is exactly one live surface — a website that
Google is declining to index — and six more are built and unshipped.**

| Surface | State in this repository, 2026-09-30 | Live anywhere? |
| :--- | :--- | :--- |
| Browser extension | `extension/` — MV3 manifest, packaged by `npm run extension:package`, store copy written in `extension/STORE_LISTING.md`, verdict logic shared with the site and parity-tested (`lib/egress/verdict-parity.test.ts`) | **No** |
| Unraid Community Applications | `packaging/unraid/opentools.xml` + root `ca_profile.xml` | **No** |
| CasaOS / Runtipi / Portainer | `packaging/*` manifests, category corrected to `Productivity`, images pinned to `0.2.0` | **No** |
| Umbrel | passes `npm run lint:apps -- opentools --check-images` in their own checkout; only `submission` (the PR URL) is outstanding | **No** |
| PWA / installed app | service worker, install prompt, `share_target`, `file_handlers` all shipped | Live, **unmeasured** |
| Portable build | `npm run portable` | **No** |
| AlternativeTo | copy written, never submitted; their free queue is months long, so the clock has not started | **No** |

Each of those stores has **its own search engine, its own ranking, and no
opinion whatsoever about getopentools.com's domain authority.** That is the
whole reason they matter at this stage: they are the only discovery surfaces
available to a 15-day-old domain with one star.

**So the largest single available step involves no new code at all.** It is
submitting the things that are finished.

---

## 3. What 10,000 a day would have to be made of

This is arithmetic on the target, **not a forecast.** Each row is a requirement
to be tested against the leading indicator beside it. No row is a prediction,
and no row should ever be quoted as one.

| Surface | Share of 10,000 | What would have to be true | Leading indicator we can actually read |
| :--- | ---: | :--- | :--- |
| Organic search | **~6,000** | roughly 600 URLs each earning ~10 clicks/day — indexed count from 134 into the high hundreds, average position from 65.8 into the first page | Search Console indexed count and position |
| Returning / installed | **~1,500** | a few thousand weekly-active installed copies | `start_url` path hits in the visit log (§7) |
| Browser extension | **~800** | store installs, a fraction of whom open the site | store dashboard installs |
| Referral residue | **~700** | durable links from the pulses, directories and stores | `referer_source` category in the visit log |
| AI answer engines / MCP | **~500** | being the answer rather than a result | `referer_source`, registry listing |
| Direct / brand | **~300** | people typing the name | brand query cluster in Search Console |
| Self-host catalogues | **~200** | installs — mostly *not* web traffic | catalogue listing live |

**Read the first row again, because it is the whole strategy.** Search has to
carry about 60% of the target. It is the only channel here with an unbounded
ceiling. It is also the one currently sitting at zero. Everything else in this
document is either a way to unblock it or a way to survive while it is blocked.

---

## 4. The binding constraint is indexing, and more pages make it worse

On 2026-09-23 Google had found 686 URLs here, indexed 134, and **declined to
spend crawl budget on 534 of them.** That is four of every five URLs it knows
about, refused.

Two consequences follow, and they are the two most important sentences in this
file.

1. **Publishing more pages does not help; it competes for a budget that is
   already being refused.** The 512 unit-pair pages are the proof already in
   hand: measured on 2026-09-23 they produced **15 page-opens between them**,
   and 501 of them were folded onto their converters on 2026-09-28. Eight
   locales of a dead family is 4,096 dead pages — the case
   `docs/GROWTH_IDEAS.md` §5 already makes.
2. **What lifts crawl budget is off-site signal** — links from places that are
   themselves crawled often, and real engagement. There is no on-site edit that
   produces it.

So the community work, the store listings and the directory entries are **not
"also nice while we wait for SEO".** They are the input SEO is waiting on. The
correct order is:

```
  SURFACES  →  SIGNAL  →  SEARCH  →  RETENTION
  ship what's   links and     crawl budget   the multiplier
  already       installs      recovers,      that lowers the
  built         from them     the 691 routes number of new
                             finally enter  arrivals needed
```

Not: more pages → more index → more traffic. That is the loop that has already
returned zero.

**One thing to fix before the signal arrives.** The sitemap served 1,413 URLs
against 134 indexed. Crawl budget spread across URLs Google has already refused
is budget not spent on the tool pages that convert. Worth a deliberate pass:
the sitemap should carry the pages that deserve the crawl, not every page that
exists. Measure after the 2026-10-21 read, not before — changing two things at
once destroys the only clean attribution the project has.

---

## 5. The channels, in the order they should be fired

### A. Browser extension stores — the flagship, and it is finished

**Why this is the strongest channel available.** Not because it sends traffic —
it is deliberately built *not* to be a funnel — but because of what it is:

- It appears **at the moment of the problem**, on someone else's page, while a
  person is about to hand a file to a site they have not thought about.
- The Chrome Web Store, Edge Add-ons and Firefox AMO each have **their own
  search**, and "file upload privacy" is not a contested category the way
  "pdf compressor" is. Incumbents cannot follow: a product that uploads files
  cannot ship a tool that flags pages which upload files.
- It is the project's **only press-shaped object**. "A browser extension that
  tells you whether the page you are on can upload your file" is a story. "568
  browser tools" is a directory listing.

**State:** built, packaged, listing copy written, name and description held to
Chrome's 132-character limit by `scripts/package-extension.test.ts`, verdict
logic parity-tested against the site's.

**The C9 decision, stated rather than assumed.** Edge Add-ons and Firefox AMO
are free to publish. **Chrome charges a one-time $5 developer registration.**
Under C9 as written that is out. It is also the highest-return five dollars
available anywhere in this document, and it is one-time rather than recurring.
**Owner's call — flagged, not assumed.** If the answer is no, Edge and Firefox
still ship today and cost nothing.

**First action:** submit to Firefox AMO and Edge Add-ons. Both free, both
same-week review in the normal case.

### B. Self-host catalogues — submit this week

Every prerequisite is verified (`docs/APP_CATALOGUES.md`, checked 2026-09-26 and
2026-09-28): tagged release, public multi-arch GHCR image, build provenance, an
install page at `/self-host`, and manifests that pass Umbrel's own linter.

Be clear-eyed about what this returns: **installs, credibility and links —
not web traffic.** It belongs in the sequence early because it costs a template
file rather than a written pitch, and because a listing in Unraid CA is a
durable, crawled link from a domain Google trusts, which is §4's input.

**Order:** Unraid CA (largest installed base, reads the repository rather than
taking a PR) → CasaOS → Runtipi → Portainer → Umbrel (needs the v0.2.0 multi-arch
digest, which now exists).

**awesome-selfhosted is 2027-01-18** — four months after `v0.1.0`, their rule,
nothing makes it sooner. And their CONTRIBUTING forbids an agent writing the
entry or the PR body; that one is the owner's to write.

### C. Community pulses — spend the shots in the right order

`docs/LAUNCH_KIT.md` holds the copy, already correct on the tool count because
`scripts/launch-claims.test.ts` fails the build when it drifts from the
catalogue. The ordering there stands. Two additions:

- **r/selfhosted is now a much better post than it was**, because v0.2.0 shipped
  the access gate and SSO-via-your-own-proxy. That sub's first question about
  any container is "can I put it behind auth", and the answer changed on
  2026-09-30.
- **Product Hunt and Lobsters are separate shots** from Show HN and are not in
  the kit. Neither costs anything. Both should wait behind the same gate Show HN
  waits behind: the smaller subreddits first, so the obvious holes are found by
  a forgiving audience.

**What a pulse is actually for.** It delivers a spike that decays inside 72
hours. Its durable value is the **links and the crawl it triggers** — §4's
input again. Judge a pulse on what it leaves behind, not on the spike.

### D. Directories and lists

AlternativeTo today (the queue is months long, which is the argument for
submitting on day one, not against it). `free-for-dev` and `awesome-privacy`
have no self-host requirement and are reachable now.

### E. Search — the only unbounded channel, and what not to do

Do: fix indexing (§4), read the **2026-10-21** Search Console check against the
baseline, and separate the 59 previously-canonical-excluded pages from the new
routes when reading it, exactly as the baseline instructs.

Do not: add a new near-template page family before that read. It breaks C4, and
it destroys the only clean attribution the project has on whether the canonical
fix worked.

**The wedge, once the read comes back.** Error-string intent — `file must be
less than 2 MB`, `attachment size exceeds 25 MB`, `photo size should be between
20kb and 50kb`. High intent, low competition, and the product to serve it
already exists: the command bar, the portal presets with their 90-day expiry,
and Fix My Upload. A small number of hand-written pages, each with a live tool,
each declared before the next Search Console read so the attribution survives.

### F. AI answer engines and MCP — the surface nobody here has costed

`llms.txt` exists and now says what each tool does. That is the passive half.

The active half is an **MCP server**, and it is currently blocked by the CLI/npm
deferral recorded in `docs/GROWTH_IDEAS.md` §4. That deferral was made before
MCP registries became a discovery surface with their own search and a very small
installed-base fight. The engine separation work that would be needed already
exists, with a boundary test that walks the real import graph.

**This is a decision to re-open deliberately, not to assume either way.** The
argument for: it puts the tools inside the assistant where the person is already
describing their problem in words, which is the same insight the home-page box
is built on. The argument against is unchanged and real: it is a second
artifact to maintain, and publishing to npm is an outward action under C8.

### G. The one asset that travels without you

Every channel above is a push. The project has exactly one thing with pull
potential that is not a tool: **the measurement.** `scripts/measure-csp.mjs` and
`lib/egress/verdict.ts` already implement it, with the honesty rules already
settled — `CAPABLE` is not an accusation, `UNKNOWN` is never rendered as a
finding, and the script ships no list of other people's products.

That last rule is deliberate and it blocks the obvious version of this idea (a
named league table of competitors). It should stay blocked; a stale claim about
a named company is the one unrecoverable mistake here.

**The version that survives the rule:** publish the *aggregate*, naming nobody.
"Of N file-handling pages measured on `<date>`, X were `BLOCKED`, Y `RESTRICTED`,
Z `CAPABLE` — here is the script, point it at whatever you like." Run at build
time in CI, so it carries a date and is reproducible by any reader, including by
the companies in the sample. It names no one, it makes no accusation, and it is
the most citable thing this repository could publish.

The extension in §A is the same asset in the reader's own hands. They reinforce
each other and should launch together.

### H. Where the problem is actually discussed

Not "compress pdf". The person whose USCIS upload just bounced is in an
immigration forum, not a search box for a PDF compressor. Being genuinely useful
there — answering the question, with no link where a link would be spam — is
slow, does not scale to 10,000, and is how the first properly-engaged thousand
arrive. It is also the only channel that reaches the person
`docs/GROWTH_IDEAS.md` §1 identifies as the one who gives $100.

---

## 6. Retention: 10,000 a day is not 10,000 new people a day

The cheapest multiplier in this document, and it is currently **invisible**.

A site where nobody returns needs 10,000 strangers every day. A site where a
third of the day's users are returning installs needs ~6,700. That difference is
larger than any single channel in §5 will ever deliver, and the asset for it
already shipped: the PWA is installable, precaches the tools, works offline, and
declares a share target and a file handler.

**What is missing is the ability to see it.** `public/site.webmanifest` has
`"start_url": "/"`, which is indistinguishable in the visit log from a normal
arrival. Give it a distinguishable start path and installed launches appear in
the log the project already keeps — **no new instrumentation, no client
analytics, fully inside C6.** It is roughly a one-line change and it converts
the single largest unmeasured lever into a measured one.

Do this before, not after, the pulses in §5C — a launch is when installs happen,
and a launch you cannot measure teaches you nothing.

---

## 7. The wall at 10,000 a day, and the one place C9 gets exercised

`ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §5b costed the free plan at a lower
target and concluded the $5 was not needed. **At 10,000 a day that conclusion
has to be re-derived, because the request cap moves into range.**

Cloudflare Workers free plan, checked 2026-09-18: **100,000 requests/day**,
100,000 KV reads/day, 1,000 KV writes to distinct keys/day.

Requests per zone-unique, from `docs/traffic-log.csv`:

| Date | Zone uniques | Requests | Ratio |
| :--- | ---: | ---: | ---: |
| 2026-09-20 | 1,137 | 19,472 | 17.1 |
| 2026-09-21 | 2,093 | 19,528 | 9.3 |
| 2026-09-22 | 929 | 10,070 | 10.8 |

Carry the 9–17 range to 10,000 uniques and the day lands at **90,000–170,000
requests — at or over the free ceiling.**

**Two things make that a bound rather than a bill, and both need measuring
rather than assuming.** Those rows include scanners and crawlers, which inflate
the ratio against real humans. And v0.2.0 prerendered the whole route set on
**2026-09-30**, *after* every row above — static assets served from the edge
should not be counted as Worker invocations at all, so the real per-visitor
invocation count may be far lower.

**Action: re-measure the ratio on a post-v0.2.0 day before treating any of this
as a cost.** If the measured ratio still puts 10,000 visitors over 100,000
invocations, then 10,000/day is the threshold at which C9's own stated exemption
— *"the one place money can appear is infrastructure, and only if this works"* —
gets exercised, at $5/month. That is not a growth tactic bought with money; it
is the bill for having succeeded, and it should be decided in advance rather
than discovered from a 503 rate mid-launch.

**Also restore the daily 503 watcher** before any pulse. Cloudflare's
`workersInvocationsAdaptive` dataset retains roughly three days, so a crawl or
launch event that goes unwatched is unrecoverable.

---

## 8. Decisions only the owner can make

Listed separately because none of them is an implementation detail, and every
outward action below is a C8 item needing the go-ahead at the time.

1. **Chrome Web Store's one-time $5 developer registration** — yes or no. Edge
   and Firefox proceed either way.
2. **MCP server / CLI** — re-open the deferral, or confirm it stands.
3. **Publishing the aggregate measurement** (§5G) — naming nobody, dated,
   reproducible. Yes or no.
4. **$5/month Workers Paid**, *if and only if* the re-measured ratio in §7 says
   10,000/day breaches the free cap.
5. **Every submission and post** in §5 — each is an outward action under your own
   name.

---

## 9. Sequence, with gates

No phase starts before its gate passes. Each phase is small enough to abandon.

| # | Work | Gate | Cost |
| :-- | :--- | :--- | :--- |
| 0 | Distinguishable PWA `start_url`; restore the 503 watcher; re-measure requests-per-visitor on a post-v0.2.0 day | none | none |
| 1 | Submit: Firefox AMO, Edge Add-ons; Unraid CA, CasaOS, Runtipi, Portainer, Umbrel; AlternativeTo | phase 0 | none (Chrome: $5, §8.1) |
| 2 | Reddit sequence per `LAUNCH_KIT.md` — r/degoogle, r/pdf, then r/SideProject, r/opensource, r/coolgithubprojects, r/selfhosted | survived phase 1 review; watcher running | none |
| 3 | Aggregate measurement page + extension launch, together | §8.3 approved; extension live in ≥1 store | none |
| 4 | Show HN, then Product Hunt / Lobsters as separate shots | survived phase 2 | none |
| 5 | **2026-10-21 — read Search Console against the baseline** | calendar | none |
| 6 | Sitemap discipline; then the error-string intent pages, few and hand-written | phase 5 read is in | none |
| 7 | MCP / CLI, if §8.2 re-opens it | decision | none |
| 8 | `free-for-dev`, `awesome-privacy` | traction from phases 2–4 | none |
| 9 | **2027-01-18 — awesome-selfhosted**, entry written by the owner | calendar | none |

Phases 0 and 1 are unblocked today. Phase 0 needs no decision at all.

---

## 10. What this document does not claim

It contains **no traffic forecast**, and §3 is a decomposition of the target
rather than a prediction of any channel's yield. The instruments described in
`ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §6 cannot produce a forecast honestly,
and a number invented to fill that gap is the specific error this repository has
already corrected twice.

It also does not claim 10,000/day is a 90-day outcome. Phases 0–4 are the work
that makes search possible; search is the only thing that reaches 10,000, and it
starts from zero clicks and a refused crawl budget. **The next real checkpoint is
not a traffic number — it is the indexed count on 2026-10-21.** If that has
moved, the 691 routes are an asset and this plan scales. If it has not, the
constraint is still authority, and phases 1–4 are the only answer to it.
