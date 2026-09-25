# Distribution playbook — the assets are built, none of them shipped

**Date:** 2026-09-25 · **Status:** proposal for the owner. Nothing here is
deployed, posted or published.
**Companions:** `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` (what to build on
site), `docs/GROWTH_IDEAS.md` (the thinking behind the last round),
`docs/REVENUE_OPERATIONS.md` (the measured baseline), `docs/LAUNCH_KIT.md`
(the copy, ready to post).

> **Read `ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §2 before editing this file.**
> That document exists because a growth plan was once written without the
> constraint set and proposed four things the constraint set had already
> rejected. Every idea below is checked against C1–C9 and says so.

---

## 1. The finding

This repository contains, today, nine distribution assets that are finished,
tested and unshipped. Not one of them is in front of a human being.

| Asset | State on 2026-09-25 | What is missing |
| :--- | :--- | :--- |
| Browser extension, "Can this page upload your file?" | `extension/manifest.json` at v0.1.0, MV3, working; `extension/STORE_LISTING.md` written to character counts | Nobody submitted it to a store |
| Self-host container | `.github/workflows/selfhost-image.yml` publishes to GHCR on a `v*` tag | `git tag` is empty. No tags, so no image, so no release |
| GitHub release | — | 0 releases, 0 forks, **1 star** (GitHub API, 2026-09-25) |
| Reddit posts | `docs/LAUNCH_KIT.md` §2–§4, written as-is | Never posted |
| AlternativeTo listing | Copy written, rejection criteria read | Never submitted; their queue is months long, so the clock has not started |
| IndexNow submission | `scripts/submit-indexnow.mjs`, key file live at `public/1d4871e2…txt` | Deliberately not part of `npm run deploy`; someone has to run it |
| Embed programme | `/embed/*` shipped under ADR-019, correctly `noindex, follow` | No site has been offered one |
| CSP measurement | `scripts/measure-csp.mjs`, with BLOCKED / RESTRICTED / CAPABLE / UNKNOWN defined and an explicit rule against naming anyone | Its output has never been published in any form |
| PWA: service worker, share target, file handlers, shortcuts | All live in `public/site.webmanifest` and `public/sw.js` | Nothing tells anyone it installs |

**So the gap is not ideas and it is not code.** Sections 3–5 add new ideas
because they were asked for and some of them are good. Section 2 is the one
that decides whether any of it matters.

---

## 2. The wall that caps everything: indexing

Search Console, measured 2026-09-23 (`docs/SEARCH_CONSOLE_BASELINE_2026-09-23.md`):

| Metric | Value |
| :--- | ---: |
| Sitemap URLs served live | 1,413 |
| Indexed | **134** |
| Not indexed | **552** |
| of which "Discovered – currently not indexed" | 534 |
| Queries in 3 months | 18 |
| Impressions | ~18 |
| **Clicks** | **0** |
| Average position | 65.8 |

Read that honestly. 534 URLs where Google found the address, pattern-matched
it, and declined to spend the crawl. That is not a bug to fix in the code; it
is a rationing decision Google makes about domains it has no reason to trust
yet. The canonical self-exclusion fix (`9646639`, deployed 2026-09-23) removes
one cause and the re-check is booked for 2026-10-21. It will not remove this
one.

**Three things follow, and they are the highest-leverage items in this
document.**

### 2a. Ask for fewer pages, not more

A ten-day-old domain with one inbound link asking a crawler to take 1,413 URLs
gets throttled; the same domain asking for 150 gets them crawled. The 534 are
not waiting in a queue — they are declined, and every declined URL spends a
little of the credibility the next one needs.

**Proposal:** cut the sitemap to the pages you would actually bet on — the live
tool pages that carry their own 800-word body under `lib/seo/tool-page-depth.ts`,
the category hubs, the three `/compare/*` pages, the 15 kept guides and the
blog. Everything else stays 200, stays internally linked, and gets discovered
the ordinary way. Restore it in tranches as the indexed count moves.

This costs nothing, contradicts no constraint, and is reversible in one commit.
It also cuts KV writes, which `ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §5b names
as the near wall on the free plan.

**Constraint check:** passes all. It is a reduction.

### 2b. Run IndexNow, and stop treating Bing as the small one

`scripts/submit-indexnow.mjs` already says why, in its own header: one
submission reaches Bing, Yandex, Seznam and Naver, and **Bing backs DuckDuckGo,
Copilot and ChatGPT search.** Bing will index a new domain in days where Google
takes months, because Bing has less to lose by being wrong.

That matters beyond Bing's own share. The assistant-citation channel — someone
asking an AI "how do I compress a PDF without uploading it" — resolves through
Bing's index for a large part of the market. `app/llms.txt` and the crawler
allowances in `app/robots.ts` are already correct. The index is the missing
half.

**First step:** run it with `--all` once after the next deploy, then let the
`lastmod`-diff default handle subsequent runs. The script's idempotence rules
are in its header and they are right; follow them.

### 2c. Register with the engines that have no authority moat

Free, no spend, and each one is a search surface where a new site is not
outranked by a decade of backlinks:

- **Bing Webmaster Tools** — bulk-imports the Search Console property in one
  click, and gives an indexing report Google will not.
- **Yandex, Seznam, Naver** webmaster consoles — IndexNow already submits to
  them; the consoles are how you find out what happened.
- **Marginalia Search** — explicitly ranks non-commercial, low-JS, no-tracker
  sites. This project is close to its ideal case and there is almost no
  competition for it.
- **Mojeek**, **Brave Search** — independent crawlers, both accept submissions.
- **Kagi** — the paying-for-search audience overlaps almost exactly with the
  paying-for-privacy audience.

**Constraint check:** C9 (no spend) — all free. C8 (outward action) — each
needs the owner, as every item in §1 does.

### 2d. The title is the whole game, but not yet

Zero clicks at average position 65.8 is a *position* problem — page seven earns
nothing whatever it says. Do not rewrite titles to fix clicks today. Do write
them knowing that the moment position moves, the title is the only lever left,
and the ones that win here name what the alternative gates: no sign-up, no
watermark, no size cap, works with the network off.

---

## 3. What "ChatGPT got millions in four days" actually was, and what the
## equivalent here is

It is worth being exact about this, because the wrong model produces the wrong
plan.

That launch had three properties: **one URL**, **a capability that did not
previously exist**, and **an output people screenshot and post**. The third did
most of the work — every screenshot was an ad, and the ad was free.

This product has 691 live tool routes, a capability that plainly does exist
elsewhere, and an output that is a *file*. Nobody screenshots a merged PDF. So
the viral unit cannot be the tool, and no amount of tool-building changes that.

**The viral unit has to be the claim, and the claim has to be checkable.**
"This page is physically blocked from sending your file, here is the header,
here is the script, run it yourself — and here is what the same script says
about the rest of the category." That is a finding, not an advert, and a finding
is the shape that travels. §4a is that asset.

### A correction worth making to the pitch

The framing "everyone else is paid, we are free" does not survive contact with
the market. Every incumbent in this category has a generous free tier and
outranks this site on it today. `app/proof/page.tsx` already records the
conclusion in its own header comment: *"Every competitor is free, so 'free'
wins nothing."*

**Free is the price. Private-and-provable is the product.** Copy that leads
with free is competing on the one axis where the position is weakest.

---

## 4. New ideas, ranked

Each one states its mechanism, what it costs, which constraints it touches, and
the first step. Ranked by expected traffic × probability ÷ effort, given §1 and
§2 — not by how interesting it is.

### 4a. Publish the aggregate CSP finding — and nothing else about it

**Mechanism.** `scripts/measure-csp.mjs` measures whether a page is *capable*
of transmitting what you hand it, and its header is emphatic that it ships no
list of other people's products and names no one but us. Keep that. Publish the
**distribution** instead: *"We measured N of the most-visited free file-tool
sites on <date>. X are BLOCKED, Y RESTRICTED, Z CAPABLE. Here is the method,
here are the definitions, here is the command — run it on any site you like,
including this one."*

**Why this is the strongest item in the document.**

- It names no competitor, so it passes `lib/seo/served-copy-policy.test.ts` and
  `lib/tools/local-source-policy.test.ts`, which fail the build on a brand name
  anywhere in the served HTML.
- It is reproducible by the reader, including by the companies measured, which
  is why it is publishable at all and why it is credible.
- It is the only asset here with the shape Hacker News rewards. HN does not
  upvote "I built 550 tools". It upvotes a measurement with a method.
- CAPABLE is not an accusation and the script already says so in four places.
  Keep every one of those sentences in the published version. The honesty *is*
  the story.

**Cost:** one page, one build-time data file, one run of an existing script.

**Constraint check:** C2 — the page states a measured CSP, not an egress claim,
so it needs no release egress proof; keep the strings "0 bytes" and "zero
egress" out of it regardless. C6 — measurement happens at build time in Node,
never in the browser; the published page is static text. C4 — one page, not a
family.

**First step:** decide N and how the N are chosen, and write that rule down
*before* running it. A list assembled after seeing the results is not a
measurement.

### 4b. Ship the extension to three stores

**Mechanism.** The Chrome Web Store, Firefox AMO and Edge Add-ons each have
their own search, their own rankings, and — unlike Google — no established
incumbent for "file upload privacy". `docs/GROWTH_IDEAS.md` §2 already argues
this is the strongest idea available and calls it "not started". It is now
built: MV3 manifest, `webRequest`, popup, background worker, icons, privacy
policy and a store listing written to Chrome's character limits.

The same source ships to all three stores. Firefox review is typically the
fastest of the three and AMO's audience is disproportionately this one.

**What it is worth beyond installs:** an extension is a permanent, searchable
listing on three high-authority domains, with a link back, that does not depend
on Google indexing anything.

**Constraint check:** C8 — outward action, owner submits. The listing copy
already refuses to be an OpenTools funnel, which is both more honest and more
likely to pass review; do not let anyone "improve" that before submission.

**First step:** the Chrome developer account is a one-time $5 registration fee.
That collides with C9 (no spend up front) and is the only item in this document
that does. Firefox AMO and Edge Add-ons are free. **Recommendation: ship to AMO
and Edge first at zero cost**, and treat Chrome as an owner decision on a $5
fee rather than a blocker on the whole idea.

### 4c. Cut `v0.1.0`

**Mechanism.** One tag does four things at once: publishes the GHCR image the
workflow already builds, gives the repository a Releases tab (which is most of
what makes a repo look alive to a stranger), unblocks `awesome-selfhosted` —
which requires a published self-host path — and gives r/selfhosted something to
point at.

`docs/REVENUE_OPERATIONS.md` §2b calls the self-host release "the single
highest revenue-leverage item on this page" and it has been sitting behind one
`git tag` command since.

**Constraint check:** C8 — outward action, owner's go-ahead at release time
(decision 12 says exactly this).

### 4d. The single-file offline build

**Mechanism.** One `.html` file. Download it, keep it, open it in five years
with no internet. No install, no server, no container, no npm.

**Why this is genuinely novel.** Nothing in this category has it. It is also
the most *mirrorable* artifact possible: people re-host it, put it on USB
sticks, attach it to forum posts, hand it to colleagues — and a meaningful
share of those mirrors become links back, without anyone being asked for one.

**Audiences it reaches that the website cannot:** air-gapped work, r/selfhosted
and r/datahoarder, schools with filtered networks, field and clinic work with no
connection, anyone whose employer forbids uploading documents to a website —
which is the same compliance audience `REVENUE_OPERATIONS.md` §2b identifies as
the actual revenue path.

**Honest scope, stated up front so it does not get oversold.** The WASM and
model tools do not fit: background removal loads U²-Net plus the ONNX runtime,
and OCR loads its own data. The text, developer, data, math, subtitle, QR and
date tools are pure JavaScript and do fit. **Ship it as "the 200-odd tools that
need no model", say exactly that on the page, and never imply it is the whole
site.** A one-file build that silently omits the headline tool is worse than no
one-file build.

**Constraint check:** C1 — no branding in outputs, unchanged. C2 — it can say
"works with the network off", which `e2e/share-target.spec.ts` already proves by
disconnecting the browser; it cannot say "zero egress" without a release egress
proof.

### 4e. Get listed where this audience already is

Not a backlink campaign. Four specific places where this project genuinely
qualifies and almost nothing else in its category does:

| Where | Why it is worth more than it looks | Prerequisite |
| :--- | :--- | :--- |
| **privacyguides.org** | The highest-intent referrer that exists for this audience, and its criteria are strict enough that being listed is itself a credential | Meets criteria today; a release (§4c) makes the case easier |
| **awesome-privacy**, **free-for-dev** | No self-host requirement; both want a real, free, working thing | None |
| **awesome-selfhosted** | Defines self-hosting as running it on your own server | §4c |
| **PRISM Break** | Smaller, but the audience is exact | None |

**Constraint check:** C8 on every row. C9 — all free.

### 4f. Give the embed programme an outbound motion

**Mechanism.** `/embed/*` shipped under ADR-019, with a scoped
`frame-ancestors *` on embed routes only, `noindex, follow` so it cannot split
the ranking signal, and a test asserting every other route still sends
`frame-ancestors 'none'`. That is careful work. An embed nobody installs is
worth exactly nothing.

The highest-authority backlinks available at zero spend are `.edu` and `.gov`
how-to pages, university IT and library pages, and nonprofit resource pages —
precisely the institutions that cannot tell staff to upload documents to a
random website and currently have no alternative to offer them. One short email
each, offering a working embed and nothing else, is the entire motion.

**Constraint check:** C8 — outward. C5 — the embed carries the task, never the
user's artifact; already true by construction.

### 4g. Interface localisation with `hreflang`

**Mechanism.** Not the India vernacular pages — the owner deferred those on
2026-09-19 and that decision stands. This is the *same* pages, translated:
Spanish, Portuguese, Indonesian, Vietnamese, Turkish, Arabic, German, French.
Every incumbent ranks in English. Tool queries in those languages are enormous
and comparatively uncontested.

**Why this is not a C4 violation.** C4 forbids a new family of *near-template*
pages — different URLs saying almost the same thing, competing with each other.
A translation is the same page for a different reader, declared as such with
`hreflang`, which is the mechanism search engines provide for exactly this. It
is the one form of page multiplication the guidelines actively endorse.

**The real cost, and it is not translation.** Each locale multiplies sitemap
size and therefore KV writes, which `ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §5b
names as the near wall on the free plan — and it multiplies the thing §2a says
to shrink. **So this waits for §2 to show movement, and then ships two locales,
measured, before any third.**

**Constraint check:** C4 — passes, with the reasoning above written down. C9 —
machine translation reviewed by a speaker costs nothing but time; paid
translation is out.

### 4h. Re-raise the MCP server as an owner decision

**Mechanism.** Decision 13 defers the CLI and SDK and forbids an npm publish,
and `docs/GROWTH_IDEAS.md` §4 records that it should be "revisited deliberately
rather than assumed". Worth re-raising specifically for MCP, for a reason that
did not exist when the decision was made: an assistant asked to compress a user's
PDF has the *same* problem the product solves — it should not be uploading that
file either. This is the one channel where "private" is a technical requirement
rather than a preference.

`claude/engine` already separated the framework-free tool logic with a boundary
test that walks the real import graph.

**Constraint check:** blocked by decision 13 until the owner says otherwise.
This is an owner call, recorded as such, not an agent call. **It is listed here
as a question, not a plan.**

### 4i. Concentrate depth on the ten tools that will carry the traffic

**Mechanism.** 691 routes will not be 691 traffic sources. In every tool site
that has ever worked, a handful of operations carry most of the demand. The
800-word treatment in `lib/seo/tool-page-depth.ts` and the internal-link equity
in `lib/seo/internal-linking-graph.ts` should be concentrated where the paid
wall hurts most, not spread evenly.

**Which ten is not a guess to make now.** It is the first question the
2026-10-21 Search Console re-check can answer, and answering it from data is
the entire point of booking that date.

### 4j. Put the measured time where the result appears

**Mechanism.** The completion receipt already measures duration. A server-side
tool cannot match it and the reason is structural, not a matter of effort: the
upload alone costs more than the whole job here. "Merged in 0.3 s" is a fact,
it is already measured, and it is the one number that makes the architecture
legible to someone who does not care about architecture.

**Constraint check:** C2 — a measured duration is a measurement, not an egress
claim. Do not let it grow a byte count.

---

## 5. Not recommended, with reasons

| Idea | Why not |
| :--- | :--- |
| A scoreboard page naming the sites measured | `lib/seo/served-copy-policy.test.ts` fails the build on any competitor name in the served HTML, and `measure-csp.mjs` refuses to ship a list for the same reason. The aggregate version in §4a is stronger anyway: unnamed and reproducible beats named and contestable. |
| Opening with Show HN | `docs/LAUNCH_KIT.md` is right and the reason has not changed: a front page delivers more than the free daily request ceiling in an afternoon, the site goes dark mid-launch, and HN traffic does not come back. Everything in §4a–§4e first; HN when there is a measurement to post and a cache proof behind it. |
| Paid directory placement, sponsored posts, backlink buying | C9. |
| Any gating of downloads behind a share, star or donation | Already rejected 2026-09-18 with five independent reasons (`docs/GROWTH_IDEAS.md` §5). Not reopened here. |
| A traffic forecast for anything above | The instruments cannot produce one honestly — `ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §6 and §10. Any number in this document has a source and a date or it is not here. |

---

## 6. Sequence

Phases 0 and 1 need no new code at all.

| # | Work | Blocked on | Owner action |
| :-- | :--- | :--- | :--- |
| 0 | Run IndexNow `--all`; register Bing/Yandex/Naver/Seznam/Marginalia/Mojeek/Brave webmaster (§2b, §2c) | nothing | accounts |
| 1 | Cut `v0.1.0` (§4c); submit extension to AMO + Edge (§4b) | nothing | C8 |
| 2 | Trim the sitemap to the pages worth betting on (§2a) | nothing | review |
| 3 | Reddit sequence as written in `LAUNCH_KIT.md` §2–§3 | phase 1 gives it something to point at | C8 |
| 4 | Aggregate CSP finding (§4a) | selection rule written first | review |
| 5 | `awesome-privacy`, `free-for-dev`, PRISM Break, Privacy Guides (§4e) | phase 1 | C8 |
| 6 | Single-file offline build (§4d) | phase 2 | review |
| 7 | Embed outreach (§4f) | phase 6 gives a second thing to offer | C8 |
| 8 | Show HN, with §4a as the post | cache proof (`ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §5.1–§5.2) | C8 |
| 9 | Search Console re-check → pick the ten tools (§4i) | **2026-10-21** | review |
| 10 | Two locales (§4g) | phase 9 shows indexing moved | review |
| — | MCP server (§4h) | decision 13 revisited | owner decision |

---

## 7. What this document does not claim

It contains no traffic forecast, no conversion estimate and no timeline to a
visitor number. §2 is the reason: on 2026-09-23 this site had 134 indexed pages
and zero search clicks, and every honest projection from that baseline is a
range so wide it would not inform a decision.

What it does claim is narrower and checkable: **nine finished assets are
unshipped, 534 URLs are declined rather than queued, and the first three phases
of §6 require no code.**
