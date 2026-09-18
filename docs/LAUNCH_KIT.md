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
| 1 | **AlternativeTo** | No spike. Pure compounding. Safe to do today. | none |
| 2 | **r/degoogle**, **r/pdf** | Small, forgiving, real feedback. A capacity test. | none |
| 3 | **r/privacy** | Bigger. Watch the Cloudflare dashboard during. | survived #2 |
| 4 | **Show HN** | One shot. Highest ceiling. | **§3 resolved** |
| 5 | awesome-selfhosted | Needs a published release — see the note at the bottom. | self-host ships |

Between each, check `Workers → Requests` in the Cloudflare dashboard. If you
approach 100k in a day, stop and fix the cache before going further.

---

## 1. AlternativeTo — do this today

Submit at `alternativeto.net/manage/new-app/`. Listed as an alternative to:
**Smallpdf**, **iLovePDF**, **PDF24**, **TinyPNG**.

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

## 3. r/privacy — once #2 survived

Same substance, but this audience cares about the proof and is allergic to
marketing. Lead with the mechanism, not the tool list.

**Title:** `A CSP directive (connect-src 'none') is a much stronger privacy claim than "we don't store your files" — so I built a tool site around it`

**Body:**

> Every "private" file tool says it deletes your uploads. You cannot verify
> that. You are trusting a sentence on a marketing page about what happens on a
> server you cannot see.
>
> There is a version of this that is checkable. If a page is served with
> `connect-src 'none'`, the browser refuses every fetch, XHR, WebSocket and
> `sendBeacon` it attempts. The file physically cannot go anywhere, and you can
> confirm the header yourself rather than believing me.
>
> I built a set of PDF/image/text tools on that basis. All processing is in the
> tab. On every release, a test actively tries to exfiltrate data five different
> ways and fails the build if anything gets through, then runs a real file
> through a real tool and asserts zero off-origin bytes.
>
> Two things I will not claim, because I cannot prove them: that there are no
> bugs, and that this covers every browser and device. The evidence covers
> Chromium and WebKit on the deployed build. The write-up is in the repo.
>
> MIT, no account, no ads, no paid tier.
> https://getopentools.com

**Do not** claim "zero data leaks" or "military-grade" anything. This audience
will find it and it will be the top comment.

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
- **Say you built it, in the first line.** Every one of these communities
  tolerates creators and bans people who pretend not to be one.
- **Answer every comment for the first six hours.** This matters more than the
  post.
- **Never ask for money in the post.** The support page exists; linking the
  tool is enough. Asking converts worse and reads badly in all four places.
- **One link per post.** Multiple links reads as spam to automod.
