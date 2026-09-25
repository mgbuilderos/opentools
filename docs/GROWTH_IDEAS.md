# Growth ideas — the ones worth building, and the ones rejected

**Last updated:** 2026-09-19 · Companion to `docs/REVENUE_OPERATIONS.md`, which
holds the measured baseline and the arithmetic. This file holds the thinking.

> Read `REVENUE_OPERATIONS.md` §1 first. Real external traffic is far smaller
> than the dashboard suggests — a 30-day audit found 63% of requests came from
> one owner IP, plus 20.66k from the Playwright suite. Every idea below is
> sized against that, not against the raw figure.

---

## 1. The reframe that changes the target

The owner's observation, 2026-09-18, and it is a better frame than the
arithmetic that preceded it:

> *"we can bring users who alone can give 100 per day as donation as it is
> custom"*

Both channels take arbitrary amounts — UPI has no ceiling, Buy Me a Coffee
accepts any number of coffees. So the goal does not have to be
*20,000 visitors × $5*. It can be **a small number of people who give
meaningfully**, which is a completely different acquisition problem.

Who actually gives $100 to a free tool?

- Someone whose **work depends on it** — a solo practitioner, a small firm.
- Someone who **avoided a real problem** because of it.
- Someone **ideologically invested** in the fight, who funds the position
  rather than the utility.
- Someone **expensing it** on a company card below any approval threshold.

None of them are reached by ranking for "compress pdf". They are reached by
being visible where the *problem* is discussed, not where the tool is searched
for. That is the thread running through the ideas below.

---

## 2. Build: a browser extension that checks other sites

**The idea.** On any page with a file input, show whether that page is
*capable* of transmitting what you are about to hand it — reading its
Content-Security-Policy the way `scripts/measure-csp.mjs` already does.

**Why this is the strongest idea on the page:**

- **It resolves an architecture conflict rather than fighting it.** The web
  version of this checker was abandoned because reading another site's headers
  needs a server-side fetch, and `lib/tools/local-source-policy.test.ts` bans
  network primitives across `app/`, `components/` and `proxy.ts`. That guard is
  load-bearing for the product's entire claim and must not be weakened for a
  growth feature. An extension runs in the browser and needs no server at all.
- **The Chrome Web Store is a discovery surface with almost no competition
  here.** It has its own search, and "file upload privacy" is not a contested
  category the way "pdf compressor" is.
- **It appears at the moment of the problem** — while someone is about to
  upload a document to a site they have not thought about.
- **It is not copyable.** A competitor whose product uploads files cannot ship
  a tool that flags pages which upload files.

**Honest limits.** It reports *capability*, never intent — a page with no
`connect-src` restriction is not doing anything wrong, and the extension must
say so as plainly as `measure-csp.mjs` does. Review times for extensions are
unpredictable. And it is a second codebase to maintain.

**Status:** not started. Next step is a written spec — what it shows, what it
refuses to claim, and the permissions it needs.

## 3. Build: error-message SEO

Nobody wakes up wanting a PDF compressor. They hit a wall, and the wall has
exact wording:

```
Attachment size exceeds 25 MB
File must be less than 2 MB
Upload failed: file too large
```

**People paste those strings into Google verbatim.** They are high-intent — the
searcher has the problem *right now* — and low-competition, because incumbents
chase "compress pdf" instead.

This fits the existing constraint set. It is not a new family of near-template
pages (Decision 11, C4): it is a small number of hand-written pages, each
solving one concrete situation, which is what Learning 24 asks for — *"a working
tool with limits, proof, method and examples is useful content"*.

**Status:** not started. The first step is finding which error strings are
worth targeting, which needs Search Console data — currently unverified.

## 4. Build: ship the engine as an npm package and a CLI

Developers are multipliers: one adopts it, then tells a team. `npx opentools
compress file.pdf` reaches a channel a website never will, and npm has its own
discovery.

Most of the hard work exists — the `claude/engine` branch already separated the
framework-free tool logic, with a boundary test that walks the real import
graph and fails if React, `fetch`, or a site path leaks in.

**Blocked on:** owner decision 13 defers the CLI/SDK. That decision predates
this discussion and should be revisited deliberately rather than assumed.

---

## 5. Deferred and rejected — with reasons, so they are not rebuilt

### India-first vernacular tool pages — **deferred by the owner, 2026-09-19**

The case was strong on paper: India is 39.7k of 56.5k requests, every
competitor is English-only, the owner understands the paperwork, and the
queries are near-uncontested. **The owner has chosen not to pursue it for now.**
Recorded because the reasoning does not expire — if the position changes, the
opportunity is still there.

### The B2B / self-hosted business — **dropped, 2026-09-18**

See `REVENUE_OPERATIONS.md` §2c. The arithmetic held; the delivery did not. A
support subscription means answering infrastructure questions at 9pm, and the
owner is non-technical and working alone. The page was removed rather than left
up creating an obligation that cannot be met.

### Gating downloads behind a share, star or payment — **rejected, 2026-09-18**

Proposed: block the download until the user shares, stars the repo, or is asked
to support. Rejected for five independent reasons, any one of which is
sufficient:

1. **It contradicts published copy.** The README says *"no result is ever
   gated"*; `/support` says every utility stays free forever.
2. **It makes the product the thing it beats.** Gating free users is precisely
   what the incumbents do, and not doing it is the wedge.
3. **It cannot be enforced.** Output is generated client-side as a blob; anyone
   can take it from devtools or run the container. The gate would only stop
   non-technical users.
4. **Incentivised GitHub stars breach GitHub's terms** and get stripped.
5. **It inverts the funnel at the worst moment** — adding friction to very
   little traffic raises bounce, which search reads as a poor result.

The instinct behind it was right: the product gives away value and asks for
little. The answer is better timing and a better ask, which is what the
completion card and the proof card now do.

---

## 6. Shipped from this thread

| Date | Change | Why it matters |
| :--- | :--- | :--- |
| 18 Sep | Proof card (`lib/proof-card.ts`) | The only share loop the rules permit — brands our artifact, never the user's file. Drops anything resembling a filename. |
| 19 Sep | **PWA: service worker + install prompt** | The manifest was already correct; a missing service worker meant Chrome offered installation to nobody. Now installable, and the tools work with no network — which no server-side competitor can match. |
| 19 Sep | New mark, classical O | The old icon was "OT" in a square: a monogram that says nothing, for a contested name, illegible at 16px. `scripts/generate-icons.py` regenerates every size from one set of proportions. |

**Why the PWA matters beyond retention.** At current traffic there is little to
retain, and install prompts convert in single digits. Its real value is as a
*launch* asset: "works with no internet" is a stronger hook for Hacker News and
r/selfhosted than anything else available, and it is ready for whenever traffic
arrives rather than being built after it.

---

## 7. What to do next

Unchanged by anything here, and everything above is downstream of it:

1. Make the container public — one click, and `/self-hosted` is gone so the
   only remaining reasons are the awesome-selfhosted clock and r/selfhosted.
2. Verify Search Console — also the prerequisite for §3.
3. First thousand real visitors.

Then the extension (§2), which is the first genuinely novel thing on this list.
