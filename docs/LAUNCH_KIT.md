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
- **Tags:** `pdf`, `privacy`, `no-registration`, `client-side`, `image-optimization`
  <!-- The `offline` tag was removed 2026-09-19. Route 1 gives up offline
       support for the hosted site, so the tag would attract exactly the people
       the site then disappoints. Do not add it back for the hosted listing.
       The self-hosted container still runs with --network none; if a listing
       is ever made for the CONTAINER specifically, `offline` is honest there. -->

**Description:**

> OpenTools is a set of 550 utilities across 18 categories — PDF, image, data,
> text, developer, QR, calculators and more — that run entirely inside your
> browser tab. Your files are never uploaded — the page is
> served with `connect-src 'none'`, so the browser itself blocks it from
> opening a network connection, which you can verify in devtools in a few
> seconds.
>
> No account, no upload, no watermark, no ads, no third-party trackers. Merge,
> compress, split and sign PDFs, convert PDF to Word, optimise images, reshape
> CSV and JSON, strip EXIF metadata, scrub secrets from logs, generate QR
> codes, and hundreds of other everyday jobs. MIT licensed. Free with no paid
> tier — support is voluntary.

---

## 2. r/degoogle and r/pdf — the capacity test

Read each subreddit's rules first; both allow creator posts if you are open
about it. Post one, wait a day, then the other.

**Check the flair dropdown before you hit post.** Several of these subreddits
auto-remove unflaired posts, and a removal looks identical to a post that simply
got no traction — you will waste days concluding the wrong thing. Pick the
closest of `Software`, `Tool`, `Project` or `Discussion`. If a post gets zero
views in the first hour, check whether it was removed before assuming it flopped.

**Title:** `I built 550 small tools that run entirely in your browser — the page is blocked from making network requests`

*(For r/pdf specifically, swap the title for: `PDF tools that run in your browser — the page is physically blocked from uploading your file`. That sub is PDF-only, so lead with PDF there and nowhere else.)*

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
> 550 tools across 18 categories, and that breadth is the point — PDF and
> image work, yes, but also CSV and JSON reshaping, text and writing helpers,
> developer conversions, QR and barcodes, unit and finance calculators, EXIF
> stripping, secret scrubbing for logs, date arithmetic. Every one of them runs
> the same way: in your tab, on your device.
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

### The compliant r/privacy post — a contribution, not a pitch

There **is** a post that belongs in r/privacy, and it is not about the product.
It teaches the community to verify *any* file tool's privacy claim, including
tools that are not yours. **No link, no product mention, nothing to remove.**

The test it passes: *would this still be worth posting if you had no product?*
Yes — which is exactly why it is allowed and why it will land.

**Flair:** `Discussion` or `Guide` — **not** `Software`. It is not about software
you made.

**Title:**

`You can verify a "we never upload your files" claim yourself in about 10 seconds — here's how`

**Body:**

> Every browser-based file tool says it processes things locally. Almost always
> you are trusting a sentence on a marketing page about what happens on a
> server you cannot see.
>
> There is a Content-Security-Policy directive that makes it checkable instead:
> `connect-src 'none'`. When a page is served with it, the browser refuses every
> fetch, XMLHttpRequest, WebSocket, EventSource and `sendBeacon` the page tries
> to open. Not "the site promises not to" — the browser will not let it.
>
> **To check any site:**
>
> 1. Open devtools, Network tab, and reload.
> 2. Click the document request (the first one, the HTML itself).
> 3. Response Headers, find `content-security-policy`.
>
> If it contains `connect-src 'none'`, that page cannot open a network
> connection at all. If it says `connect-src 'self'`, or there is no
> `connect-src` line, it can — which does not mean it does, but you are back to
> trusting a sentence.
>
> From a terminal, same thing:
>
>     curl -sI https://example.com | grep -i content-security-policy
>
> **What it does not prove**, because this gets oversold:
>
> - Nothing about bugs. It governs where bytes may go, not whether the code is
>   sound.
> - Nothing about tomorrow. A site can ship a different CSP whenever it likes,
>   so this is a check you repeat, not a certificate.
> - Nothing about native apps or extensions, which are not bound by page CSP.
>
> **Two gotchas if you go testing this yourself**, both of which will quietly
> give you the wrong answer:
>
> 1. **A blocked `sendBeacon` still returns `true`.** The spec returns true once
>    the beacon is queued; the policy refuses it afterwards. Checking that
>    return value tells you nothing at all.
> 2. **Chromium raises a request event for a request it is about to block** —
>    `transferSize: 0`, failure reason `csp` — where WebKit raises nothing. So
>    "no request was attempted" is the wrong thing to assert; it fails a page
>    that is behaving perfectly. Assert that nothing received a *response* and
>    that zero bytes were transferred.
>
> Small thing, but it turns a promise into something you can check.

**If someone asks in the comments whether any tools actually do this** — answer
honestly, say you built one, and link it then. A direct question is not
self-promotion. **Do not** volunteer it, do not edit the link into the post, and
do not have it ready in the first comment. If nobody asks, the post still did
its job: it is the same audience, and the name will be familiar next time.

### The longer game



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

**Title:** `I built 550 tools that all run in your browser — none of them can upload your files`

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
> 550 tools across 18 categories: PDF, images, CSV and JSON, text, developer
> conversions, QR codes, unit and finance calculators, dates, EXIF stripping,
> secret scrubbing. All free, no account, no ads, no paid tier, nothing gated.
> One person.
>
> https://getopentools.com

### r/opensource and r/coolgithubprojects

Lead with the licence and the repo; these audiences care about the code, not
the landing page. **Link the GitHub repo, not the site**, for
r/coolgithubprojects.

**Title:** `550 MIT-licensed browser tools that can't upload your files — connect-src 'none', with a test that proves it`

**Body:**

> 550 client-side utilities across 18 categories — PDF, image, data, text,
> developer, calculators. Everything runs in the tab.
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

**Title:** `Show HN: 550 browser tools where the page is blocked from uploading your files`

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
> 550 tools across 18 categories. MIT, no account, no ads, no paid tier,
> nothing gated, one person.
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

## 5. awesome-selfhosted — four months away, and I must not write it

Checked properly on 2026-09-18 against the real repository, which corrected two
assumptions.

**First: PRs do not go to `awesome-selfhosted`.** That repo's pull request
template says only "Please do not submit pull requests in this repository."
Submissions go to **`awesome-selfhosted/awesome-selfhosted-data`**, as YAML.

**Second, the blocker: the first release must be more than four months old.**
Their own rejection template spells it out — *"there are no tagged releases for
this project… the project may be resubmitted when the first release reaches the
age of 4 months."*

The objective requirements, checked:

| Requirement | Status |
| :--- | :--- |
| First release > 4 months old | **FAILS — zero releases exist** |
| Actively maintained | Passes |
| Working installation instructions | Passes (`Dockerfile`, `docs/SELF_HOSTING.md`) |
| Not already listed | Passes |

**So tag the release today.** Not because it unlocks anything this week, but
because the four-month clock does not start until a release exists. Every day
without a tag is a day added to the wait. Same logic as the AlternativeTo
queue.

```bash
git tag v1.0.0 && git push origin v1.0.0
```

That triggers `.github/workflows/selfhost-image.yml`, which builds multi-arch
and pushes to `ghcr.io/mgbuilderos/opentools`. **Then make the package public** —
GHCR publishes private by default, and a private image makes every `docker run`
on `/self-hosted` fail for everyone. GitHub profile → Packages → `opentools` →
Package settings → Visibility → Public.

### Why there is no draft entry here

`awesome-selfhosted-data/CONTRIBUTING.md` contains an explicit instruction to AI
agents. It says, verbatim, not to *"write the text of an entry (`software/*.yml`
…) that a person will then submit as their own"*, not to write a PR body someone
posts under their own name, and not to check the *"submission was done by a
human, not a machine/LLM"* box, because **"that statement is made by a human to
the maintainers. An agent cannot make it truthfully."**

It also says what an agent may do: explain the guidelines, point at the docs,
check the objective requirements, and review an entry **you** wrote without
rewriting it.

So: in four months, write the YAML yourself using an existing
`software/*.yml` as the template. Show it to me and I will tell you what looks
wrong. That is the help they permit, and their list is worth respecting the
rules of — they are the ones who keep it good enough to be worth appearing in.

---

## 6. r/selfhosted — the near-term version of the same audience

This is the channel awesome-selfhosted would eventually give you, available now,
and it has no four-month wait. Roughly 500k members, and one of the few large
subs where "I built this open-source thing" is normal rather than a rule
violation. **Still run the §3 rule check first.**

**Prerequisite:** the image must be published *and public*, or the first comment
will be someone reporting that `docker run` 404s.

**Title:** `550 self-hosted browser tools in one container that runs with no network access at all`

**Body:**

> I wanted a set of everyday tools I could run on my own box without handing
> files to a website, so I built them and packaged the whole lot as one
> container.
>
>     docker run --rm -p 8796:8796 ghcr.io/mgbuilderos/opentools:latest
>
> 550 tools across 18 categories — PDF, images, CSV/JSON, text, developer
> conversions, QR codes, unit and finance calculators, EXIF stripping, secret
> scrubbing for logs.
>
> The part this sub might actually care about: it runs with `--network none`
> and everything still works. Not "we don't upload your files" as a promise —
> the container has no network and the pages are served `connect-src 'none'`,
> so the browser refuses any request the page could make. Both are checkable in
> about a minute:
>
>     docker run --rm -d --network none --name ot ghcr.io/mgbuilderos/opentools:latest
>     docker exec ot node -e "fetch('http://127.0.0.1:8796/').then(r=>console.log(r.status))"
>
> Honest about what it is not: no TLS, no auth, single process, no clustering.
> Put it behind your reverse proxy like everything else. Image is ~692 MB
> because workerd needs glibc.
>
> MIT, no paid tier, nothing held back. Happy to take issues or PRs.
>
> https://github.com/mgbuilderos/opentools

**Expect and prepare for:** "why a container for a static site?" — the honest
answer is that it runs workerd, the same runtime as production, so the headers
and cache behave identically rather than approximately. That is a real answer
and this crowd respects it.

---

## Rules that apply everywhere

- **Lead with the breadth, not with PDF.** 550 tools across 18 categories is
  the differentiator; PDF is one example of it. Every competitor worth naming
  is single-category, so framing this as a PDF site compares it to the
  strongest opponent it has, in the one place that opponent is strongest. The
  only exception is a PDF-specific sub, where PDF is the reason people are
  there.

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
