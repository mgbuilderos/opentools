# Launch kit — ready to fire

Everything here is written to be posted **as-is**. The one thing I cannot do is
post it: these are outward actions under your own name, in communities that ban
accounts for looking automated.

**Read `docs/REVENUE_OPERATIONS.md` first** — particularly §3, the free-tier
ceiling. The ordering below exists because of it.

---

## The order matters, and it is not the obvious one

Do **not** open with Hacker News. The site currently serves every request from
the Worker with no cache (`cf-cache-status: BYPASS` on every page) against a
free ceiling of 100,000 requests/day. An HN front page delivers more than that
in an afternoon, the site goes dark mid-launch, and HN traffic does not return.

| # | Channel | Why here | Prerequisite |
| :-- | :--- | :--- | :--- |
| 1 | **AlternativeTo** | Submit and forget. **Free queue is months long** — see below. | none |
| 2 | **r/degoogle**, **r/pdf** | Small, forgiving, real feedback. A capacity test. | none |
| 3 | **r/SideProject**, **r/opensource**, **r/coolgithubprojects** | Permit self-promotion. r/privacy does **not** — see §3. | survived #2 |
| 4 | **Show HN** | One shot. Highest ceiling. | **§3 resolved** |
| 5 | awesome-selfhosted | Needs a published release — see the note at the bottom. | self-host ships |

Between each, check `Workers → Requests` in the Cloudflare dashboard. If you
approach 100k in a day, stop and fix the cache before going further.

**What actually moves traffic this week is #2 and #3, not #1.** AlternativeTo is
a months-long queue; the subreddits are same-day. Submit AlternativeTo because
it costs ten minutes and compounds, then go straight to the Reddit posts.

---

## 1. AlternativeTo — submit and forget

**Set expectations honestly: this is not a traffic source this month.** Checked
2026-09-18 against their FAQ — a new app "usually sits in the backlog for at
least a few months before anyone looks at it". There is a $5 priority option
that gets review in 1–2 business days; at no spend, take the free queue and
forget about it. It is still worth doing on day one precisely because the clock
only starts when you submit.

**There is no listing for OpenTools today** — confirmed by checking the
Smallpdf alternatives page, so this is a clean first submission.

**How:** register, then click the **user icon, top right → "Suggest new
application"**. (There is no public deep link; the form is behind sign-in.)
Listed as an alternative to: **Smallpdf**, **iLovePDF**, **PDF24**, **TinyPNG**.

Read their "Why wasn't my software approved?" page before submitting — the
common rejection is a listing that reads like marketing rather than a
description. The copy below is written to pass that.

- **Name:** OpenTools
- **URL:** https://getopentools.com
- **Licence:** Open Source · MIT · Free
- **Platforms:** Web, Self-Hosted (once that ships)
- **Tags:** `pdf`, `privacy`, `offline`, `no-registration`, `client-side`, `image-optimization`

**Description:**

> OpenTools is a set of PDF, image, text and developer utilities that run
> entirely inside your browser tab. Your files are never uploaded — the page is
> served with `connect-src 'none'`, so the browser itself blocks it from
> opening a network connection, which you can verify in devtools in a few
> seconds.
>
> No account, no upload, no watermark, no ads, no third-party trackers. Merge,
> compress, split and sign PDFs, convert PDF to Word, optimise images, strip
> EXIF metadata, scrub secrets from logs, and around thirty other jobs. MIT
> licensed. Free with no paid tier — support is voluntary.

---

## 2. r/degoogle and r/pdf — the capacity test

Read each subreddit's rules first; both allow creator posts if you are open
about it. Post one, wait a day, then the other.

**Check the flair dropdown before you hit post.** Several of these subreddits
auto-remove unflaired posts, and a removal looks identical to a post that simply
got no traction — you will waste days concluding the wrong thing. Pick the
closest of `Software`, `Tool`, `Project` or `Discussion`. If a post gets zero
views in the first hour, check whether it was removed before assuming it flopped.

**Title:** `I built a set of PDF and image tools that never upload your files — the page is blocked from making network requests`

**Body:**

> I kept needing to compress or merge a PDF and not wanting to hand the file to
> a random website, so I built tools that do it in the browser tab instead.
>
> The part I think is actually interesting: the pages are served with
> `connect-src 'none'`. That is a Content-Security-Policy directive which makes
> the browser refuse every fetch, XHR, WebSocket and beacon the page tries to
> open. It is not a promise from me — it is enforced by your browser, and you
> can check it in devtools in about ten seconds. I also have a test that tries
> five different ways to exfiltrate data on every release and fails the build if
> any of them get through.
>
> Around thirty tools: merge/compress/split/sign PDF, PDF to Word, image
> optimise and convert, EXIF stripping, secret scrubbing for logs, JSON/CSV
> work, QR codes.
>
> MIT licensed, no account, no upload, no ads, no paid tier. I am one person and
> it is free — there is a support page if it saves you time, but nothing is
> gated.
>
> https://getopentools.com
>
> Happy to answer anything about how it works.

**If asked "how is this different from the dozens of others" — the honest answer,
which is your strongest one:**

> Most of them upload. The ones that claim they do not usually cannot show you.
> Mine is checkable: open devtools, look at the CSP header, try to make the page
> talk to anything. That is the whole pitch.

---

## 3. r/privacy is CLOSED — do not post there

**Corrected 2026-09-18.** r/privacy bans self-promotion; posts asking people to
look at your own app are removed. The post that used to sit here would have
been taken down.

**That was my mistake and it is worth naming, because it is the failure mode of
this whole document:** Reddit is unreachable from the environment these posts
were written in, so the subreddit rules were never read. Advice written without
reading the rules is a guess wearing a confident voice.

**So run this 60-second check before every post below.** It is not optional:

1. Open the subreddit. Read the sidebar rules end to end.
2. Search the sub for "self promotion" and for "I built" — see whether posts
   like yours survive, and whether they carry a flair.
3. Look for a scheduled thread ("Showoff Saturday", "Self-Promo Monday"). Many
   subs that ban self-promotion in the main feed allow it there, and that is
   the compliant way in.
4. Check whether the sub requires flair. An auto-removed post looks identical
   to one nobody upvoted.

If a sub bans it, **do not post anyway**. A removal costs nothing; a ban costs
the channel permanently.

### What to do about r/privacy instead

It is the best-matched audience you have, so it is worth earning rather than
abandoning. That is a months-long play, not a launch:

- Answer questions there where the tool is genuinely the right answer, without
  linking it. Build a real comment history.
- Once you have one, a "I made this, here is the CSP proof" post from a known
  contributor is received completely differently — and you may still need to
  ask a moderator first.
- Never link-drop. That is what the rule exists to stop, and this audience
  spots it instantly.

---

## 3b. Where to actually post — subs that permit it

Ordered by how confident I am that self-promotion is allowed. **Still run the
60-second check on each** — I could not read these rules either.

| Sub | Self-promo | Format |
| :--- | :--- | :--- |
| **r/SideProject** | Built for it | Self-post, casual |
| **r/coolgithubprojects** | Built for it | Link to the GitHub repo, not the site |
| **r/somethingimade** | Built for it | Self-post |
| **r/opensource** | Limited, allowed | Lead with MIT and the repo |
| **r/InternetIsBeautiful** | Check first | Link post, descriptive title, no "I built" |
| **r/degoogle**, **r/pdf** | Check first | Self-post |
| **r/selfhosted** | Blocked | Needs a real self-host release |

### r/SideProject and r/somethingimade

**Title:** `I built PDF and image tools that are physically blocked from uploading your files`

**Body:**

> Kept needing to compress a PDF and not wanting to hand the file to a random
> website, so I built tools that do it in the browser tab instead.
>
> The bit I am actually pleased with: the pages are served with
> `connect-src 'none'`, a Content-Security-Policy directive that makes the
> browser refuse every fetch, XHR, WebSocket and beacon the page attempts. So
> "we don't upload your files" stops being a promise and becomes something you
> can check in devtools in ten seconds. There is a test that tries five
> different ways to exfiltrate data on every release and fails the build if any
> get through.
>
> ~30 tools — merge/compress/split/sign PDF, PDF to Word, image optimise, EXIF
> stripping, secret scrubbing for logs, JSON/CSV, QR codes. MIT, no account, no
> ads, no paid tier. One person, free.
>
> https://getopentools.com

### r/opensource and r/coolgithubprojects

Lead with the licence and the repo; these audiences care about the code, not
the landing page. **Link the GitHub repo, not the site**, for
r/coolgithubprojects.

**Title:** `OpenTools — MIT-licensed browser utilities that can't upload your files (connect-src 'none', with a test that proves it)`

**Body:**

> A set of client-side PDF/image/text utilities. Everything runs in the tab.
>
> The interesting part is the enforcement rather than the tools: pages ship
> `connect-src 'none'`, so the browser blocks all network egress from the page.
> `e2e/egress-proof.spec.ts` attempts five exfiltration vectors on every
> release, then pushes a real file through a real tool and asserts no
> off-origin response and zero off-origin bytes, in Chromium and WebKit.
>
> Two gotchas I hit writing it, in case they save someone time:
> a CSP-blocked `navigator.sendBeacon` still returns `true` (the spec returns
> true once queued and the policy refuses it after), and Chromium fires a
> request event for a request it is about to block where WebKit fires nothing —
> so asserting "nothing was attempted" fails a clean page on Chromium.
>
> MIT. No account, no telemetry, no paid tier.
> https://github.com/mgbuilderos/opentools

### r/InternetIsBeautiful

Different format: a **link post** with a descriptive title, written about the
site rather than about you. Check their rules on self-submission first.

**Title:** `A set of PDF and image tools where the browser itself blocks the page from uploading your files`

---

## 4. Show HN — only after the capacity fix

Post Tue–Thu, around 09:00–11:00 ET. Then stay at the keyboard for six hours
and answer every comment. HN rewards the author being present more than it
rewards the product.

**Title:** `Show HN: Browser tools where the page is blocked from uploading your files`

*(Keep it under 80 chars. No exclamation marks. "Show HN:" prefix is required.)*

**Body (first comment, posted by you immediately after submitting):**

> I got tired of uploading PDFs to random sites to compress them, so I built
> tools that run in the tab instead.
>
> The mechanism is the interesting bit rather than the tools. Pages are served
> `connect-src 'none'`, so the browser blocks every fetch/XHR/WebSocket/beacon
> the page can attempt. That turns "we don't keep your files" from a promise
> into something you can check in devtools.
>
> I found two things while writing the test for it that I had not expected:
>
> 1. A `sendBeacon` blocked by CSP still returns `true` — the spec returns true
>    once it is queued, and the policy refuses it afterwards. Any check that
>    asserts on the return value records a leak as a pass.
> 2. Chromium fires a request event for a request it is about to block (failure
>    reason `csp`, zero bytes transferred) where WebKit fires nothing at all. So
>    a test asserting "nothing was attempted" fails Chromium on a page behaving
>    perfectly. The proof asserts on responses and bytes instead.
>
> The release test tries five exfiltration vectors, then pushes a real PNG
> through a real tool and asserts no off-origin response and zero off-origin
> bytes, in both engines. I also checked the detector is not vacuous — pointed
> at a page that does load a cross-origin resource, it fails.
>
> ~30 tools. MIT, no account, no ads, no paid tier, one person.
>
> Things it is not: it does not prove the absence of bugs, and the evidence
> covers two engines on one build, not every browser and device.

**Why this body:** HN's audience responds to a specific technical finding far
more than to a product tour. The two gotchas are genuinely useful to anyone
who has written a CSP test, and they establish that you actually did the work.

**Have ready for the comments:**

- *"Why not just use local software?"* — Because you are on someone else's
  machine, or a phone, or you need it once.
- *"CSP can be bypassed / what about a malicious update?"* — True, and worth
  saying plainly: CSP protects against the page exfiltrating, not against you
  shipping a malicious build. That is what MIT source and self-hosting are for.
- *"How do you make money?"* — I do not. Voluntary support, no paid tier. Say
  exactly that; do not oversell it.

---

## 5. awesome-selfhosted — blocked, and here is why

Checked 2026-09-18: the list requires the software to be genuinely
self-hostable. `claude/selfhost` has a `Dockerfile` but the branch is unmerged
and no image is published (Docker Hub returns 404 for `mgbuilderos/opentools`).
A PR today would be rejected, which burns the one good first impression with
those maintainers.

**Also checked and ruled out: `free-for-dev`.** Its contributing guide scopes it
to SaaS with free tiers aimed at DevOps practitioners. Browser utilities for
general users are out of scope. Do not submit there.

Ship the self-host release first, then the PR is worth making — the backlink
from that repo is one of the few durable fixes for the authority problem in
`REVENUE_OPERATIONS.md` §4.

---

## Rules that apply everywhere

- **Never claim what is not proven.** "Zero data leaks" was removed from the
  product for this reason (`docs/EGRESS_PROOF.md`). Claiming it in a post
  invites exactly the person who will check.
- **Verify the sub allows self-promotion before writing a word.** r/privacy
  does not, and that was discovered only after a post had been drafted for it.
  The 60-second check is in §3.
- **Say you built it, in the first line** — in the subs that permit it. They
  tolerate creators and ban people who pretend not to be one. In subs that
  don't permit it, the answer is not to disguise it; it is to not post.
- **Answer every comment for the first six hours.** This matters more than the
  post.
- **Never ask for money in the post.** The support page exists; linking the
  tool is enough. Asking converts worse and reads badly in all four places.
- **One link per post.** Multiple links reads as spam to automod.

---

## The schedule — now actually scheduled

Created 2026-09-18 as real scheduled tasks, not a list to remember. They run
while the Claude desktop app is open; if it is closed when one is due, it runs
at next launch. Manage them under **Scheduled** in the sidebar.

| Task | When | What it does |
| :--- | :--- | :--- |
| `opentools-traffic-snapshot` | **daily 09:00** | Pulls yesterday's traffic and appends to `docs/traffic-log.csv`. **The important one** — Cloudflare's free plan keeps only ~5 days, so every missed day destroys that data permanently. |
| `opentools-launch-day-1` | 19 Sep, 10:00 | Capacity check, then AlternativeTo + the first subreddit post. |
| `opentools-launch-day-4` | 22 Sep, 10:00 | Measures what Day 1 did, then the second subreddit — or says why the first one flopped. |
| `opentools-launch-day-8-rprivacy` | 26 Sep, 10:00 | r/privacy, gated on headroom against the 100k/day ceiling. |
| `opentools-weekly-revenue-review` | **Mondays 10:00** | Traffic, funnel, revenue, capacity, and the single best next action. Amends `REVENUE_OPERATIONS.md`. |

Show HN is deliberately **not** scheduled. It is one shot and it stays blocked
until the free-tier ceiling in `REVENUE_OPERATIONS.md` §3 is resolved; putting a
date on it would invite firing it early.

Each launch task hands over the post text and the reasoning — none of them post
anything. Posting is an outward action under the owner's identity, in
communities that ban accounts for looking automated.
