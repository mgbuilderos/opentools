# The playbook — five plays, each drawn from a tool that won

**Date:** 2026-09-25 · **Status:** proposal for the owner. Nothing here is built.
**Companions:** `docs/DISTRIBUTION_PLAYBOOK.md` (what is built and unshipped),
`docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` (the constraint set C1–C9),
`docs/GROWTH_IDEAS.md`, `docs/REVENUE_OPERATIONS.md` (the measured baseline).

> **On sourcing.** This document cites **mechanisms, not metrics**. Where a
> precedent is named, the claim is about *how* that product grew, which is
> publicly documented and checkable. No user counts, revenue figures or growth
> rates appear, because I cannot source them from here and this repository's
> rule is that a number carries a source and a date or it does not go in
> (`ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §6). Every number below is from this
> repository's own measurements.

---

## 1. Diagnosis: what kind of product this is

Before the plays, the honest shape of the problem — because the wrong diagnosis
produces a plausible plan that cannot work.

**This is a utility.** Utilities have three structural disadvantages that social
products and AI assistants do not:

| | Why it hurts here |
| :--- | :--- |
| **No network effect** | Your tool is not better because someone else uses it. Nothing compounds from one user to the next. |
| **No default retention** | The job ends when the file is downloaded. There is no reason to return until the next time, which may be months. |
| **No shareable artifact** | The output is a file. Nobody screenshots a merged PDF. Every viral loop a normal product has runs on a share, and there is nothing here to share. |

And one structural advantage that is rarer than it sounds:

**A claim competitors cannot copy without rebuilding their business.** A
server-side product cannot ship `connect-src 'none'`. Not "will not" — *cannot*,
because its product is the server. That is a real moat and almost nothing else
here is.

**The evidence that breadth is not working.** 1,413 sitemap URLs, 134 indexed,
18 impressions, **0 clicks** in three months (`SEARCH_CONSOLE_BASELINE_2026-09-23.md`).
1,356 live tool routes against 1 GitHub star. The product has vastly more
capability than distribution, and adding capability does not fix distribution.

**So every play below does one of three things**, because those are the only
three growth physics a utility actually has:

1. **Manufacture a shareable artifact** where none exists (Play 1).
2. **Fix the interface** so capability becomes reachable (Plays 2, 3).
3. **Stop depending on your own traffic** by living inside other products
   (Plays 4, 5).

---

## 2. Play 1 — The Shock Report

### Precedent: Have I Been Pwned

One person, no funding, no marketing budget. The mechanism, in order:

1. **A free check that returns a personal, specific, alarming result.** Not
   "breaches are common" — *your* address, in *these* breaches.
2. **That result is inherently newsworthy**, so press covered the tool rather
   than being pitched it.
3. **The check was never gated**, so there was no friction between hearing about
   it and experiencing it.
4. **Then other products embedded it.** Password managers and browsers started
   calling it, which turned a website into infrastructure — permanent
   distribution that does not depend on anyone remembering the site.

The order matters. The shock built the reputation; the reputation made the
integrations possible; the integrations made it permanent.

### The mechanism, extracted

> A free, instant check whose output is a *specific fact about the person* they
> did not know and find alarming, is the cheapest shareable artifact a utility
> can manufacture.

### What this is here: File X-ray

Drop any file, see what is hidden in it:

- A photo's GPS coordinates — **the street it was taken on**, on a map.
- The camera's serial number, and the software that touched it.
- A PDF's author name, the machine it was made on.
- **Tracked changes and deleted text still living inside a `.docx`.**
- Revision history in a spreadsheet.

Every finding gets a one-click strip, which is a tool you already have.

**Why this is the right artifact for this product**, and not a generic idea:

- It is the **only** output you can produce that a person will screenshot. §1
  says you have none; this manufactures one.
- It **dramatises your actual thesis** without arguing it. "Your holiday photo
  contains your home address" leads straight to "and you uploaded it to a
  random website to resize it." You never have to say the second part.
- The parsers **mostly exist** — `lib/tools/metadata/`, `/image/metadata`,
  `/pdf/metadata`. This is an interface over work already done.
- It is **honest**. It reports what is in the file. No claim needs defending.

### Constraint check

C2 — it reports file contents read locally, not an egress measurement, so it
needs no release egress proof; keep "0 bytes" and "zero egress" out of it
regardless. C6 — parsing is in-tab, nothing is transmitted, and the map must be
drawn from local data rather than a tile server or it breaks `connect-src
'none'`. **That map constraint is real and is the one design problem in this
play** — coordinates as text plus a copyable link is the safe version.

### First step, and the kill criterion

**First step:** one page, photos only. GPS is the most visceral finding and JPEG
EXIF is the parser you most already have.

**Kill it if:** a sample of ordinary photos from ordinary phones rarely contains
anything alarming. Modern phones and messaging apps strip EXIF more often than
they used to. **Test that on real files before building the page** — if the
shock is not reliably there, the play does not work and no amount of design
fixes it.

---

## 3. Play 2 — Collapse the directory into one input

### Precedent: the command bar (Spotlight, Raycast, and every editor palette)

When a product has hundreds of capabilities, the interface *becomes* the
product. Nobody browses hundreds of things. Everybody can type six words. The
pattern recurs because it solves a specific failure: capability that exists but
cannot be found is worth zero.

### The mechanism, extracted

> Past roughly fifty capabilities, discovery stops being a navigation problem
> and becomes a retrieval problem. Navigation scales with the user's patience;
> retrieval scales with the size of your catalogue.

You are at 1,356. You are far past the crossover, and the sidebar, the hubs and
the SEO pages are all navigation.

### What this is here

One input on the home page: *"make this under 2MB and take my name off it."*
Parsed **on the device**, mapped onto the operation catalogue, chained, run.

**Why it is tractable rather than aspirational:**

- The hard part of intent matching is a well-described corpus, and
  `lib/seo/tool-search-copy.ts` plus the catalogue is exactly that. It was
  built for search; it works as a retrieval index.
- A **rule-based matcher needs no model at all** and would already feel
  magical against 1,356 well-named operations. A local model later makes it
  conversational; it is not required for v1.
- It is the one AI-shaped product that can honestly claim it never sees your
  prompt or your file — because it structurally cannot. "Private AI" is the
  most crowded and least verifiable claim in the market, and you can prove it
  with a response header.

### First step, and the kill criterion

**First step:** no UI. Write 50 real phrasings of things people actually want,
run them through a matcher offline, and count how many land on the right
operation.

**Kill it if:** a rule-based matcher cannot get most of those 50 right. Build
the interface only after the retrieval works, never the reverse — a command bar
that misunderstands you is worse than a menu.

---

## 4. Play 3 — Sell the job, not the capability

### Precedent: Canva

Canva did not beat established design tools on drawing primitives. It beat them
on the **entry point**: the first screen offers "Instagram post", "resume",
"poster" — jobs — where the incumbent offered "new document" and a canvas.

### The mechanism, extracted

> People do not arrive wanting a capability. They arrive wanting a job finished.
> A product organised by capability makes every user do the translation
> themselves, and most of them get it wrong or give up.

### What this is here

You have **1,356 capabilities and 20 templates**. Invert that ratio.

Nobody wakes up wanting a PDF compressor. They want to:

- get a document accepted by a government portal that keeps rejecting it;
- send a scanned contract to a client without the metadata attached;
- prepare a bundle for a court filing;
- hand a month of receipts to an accountant.

Each of those is several of your operations in sequence. Each is a page that
finishes a job rather than performing a step.

**This is also what your own evidence points at.** The bounced-upload intent in
`ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` Pillar 1 is a job, not a capability, and
it is the highest-intent traffic the product can serve.

### Constraint check

C4 forbids a new family of near-template pages, and this is the play most at
risk of becoming one. The discipline that keeps it clean: **a job page ships
only if the site can finish the whole job.** A page that does three of five
steps and links away for the rest is exactly the thin page decision 11 is
removing. Few pages, each complete.

### First step, and the kill criterion

**First step:** one job, end to end, chosen from the portal-rejection intent
where the urgency is highest.

**Kill it if:** you cannot complete the job without sending the user elsewhere.
Then the honest move is to build the missing operation first, not to publish the
page and hope.

---

## 5. Play 4 — Live inside other products

### Precedent: TinyPNG's API, HIBP's integrations, Stripe's documentation

Different products, one mechanism: **an integration is permanent distribution.**
A search ranking must be re-won every day against everyone else. An integration
keeps sending people while you sleep, and it gets *stickier* over time because
removing it is work.

For a young domain with no authority, this is the only channel where being new
is not a handicap.

### What this is here — three surfaces, in order of leverage

**a) The pre-upload snippet.** A tiny script any site adds to its own upload
form. When a user picks a file that is too large or the wrong format, it is
fixed **in their browser** before upload.

This is the strongest of the three because *the incentive belongs to the other
party*. The site gets fewer failed uploads and fewer support tickets; it adopts
this for its own reasons and distributes you as a side effect. That is the only
kind of loop that scales without you posting anything.

It is a different proposition from `/embed/*`, which asks a site to host your
tool. This helps them fix their problem.

**b) MCP.** Every assistant is asked to do things to files and none has a
private way. An assistant genuinely should not upload a user's tax return to a
third party, so here "private" is a technical requirement rather than a
preference. **Blocked by decision 13**, which defers the CLI/SDK and predates
MCP entirely. That decision is now the largest strategic constraint on this
project and deserves to be made again deliberately rather than inherited.

**c) The portable build.** Already in flight — `scripts/build-portable.mjs`
landed on main in PR #19. Its distribution property is that people *mirror* it:
re-host it, put it on USB sticks, attach it to posts. Each mirror is a link
nobody had to be asked for.

### First step, and the kill criterion

**First step:** the snippet, offered to ten sites whose upload forms visibly
reject oversized files.

**Kill it if:** ten sites hear the pitch and none integrates. That means the
value to the host is not real, and no amount of packaging fixes a proposition
the other party does not want.

---

## 6. Play 5 — Pick one tribe and be completely theirs

### Precedent: Excalidraw

Excalidraw did not try to beat the incumbent design tools for everyone. It
became **the** whiteboard inside developer documentation and RFCs: free,
instant, no sign-up, embeddable, and culturally right for that one group. The
tribe adopted it completely, and then carried it everywhere they wrote.

### The mechanism, extracted

> One tribe adopting you completely beats ten tribes sampling you. A tribe has
> shared venues, shared vocabulary and shared problems, so adoption spreads
> inside it without paid distribution — and it gives you a definition of "done"
> for the product.

### What this is here

**My pick: paralegals and small law firms.** The case, stated plainly:

- **A genuine unmet need you uniquely serve.** Redaction that proves itself —
  re-extract the text after redacting and show it is gone. Black boxes over live
  text is a recurring, career-ending real-world failure. You have
  `/pdf/redact` and `scripts/verify-redaction-proof.py`; nobody free offers the
  proof.
- **Compliance pressure is real and already felt.** They are told never to
  upload client documents, and they do it anyway because there is no
  alternative to offer.
- **They talk to each other** — dense professional forums and associations.
- **They have money**, which is the group `GROWTH_IDEAS.md` §1 identifies as the
  realistic donor: someone whose work depends on the tool.

### First step, and the kill criterion

**First step:** ten conversations, no product work. Ask what they currently do
with client PDFs and what goes wrong.

**Kill it if:** those ten do not surface a shared, urgent problem you uniquely
solve. Then pick a different tribe — accountants, school IT, journalists — and
run the same ten conversations. **Do not skip this step and build on the
hypothesis.** The cost of the wrong tribe is months.

---

## 7. What to stop

A playbook that only adds is a wish list. The hardest item here:

**Stop adding tool routes until the indexed count moves.**

Every new route is a KV write against the free-plan wall
(`ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §5b), one more page competing with your
own for a crawl budget that is already being rationed, and one more thing to
maintain forever. You have 1,356 live routes and 134 indexed pages. The
constraint is not capability, and it has not been for some time.

The re-check is booked for **2026-10-21**. 134 is the number to beat. Until it
moves, capability work is building more of the thing that is already in surplus.

---

## 8. Sequence

Ordered by (expected effect) ÷ (time), not by ambition.

| # | Play | Rough size | Gate |
| :-- | :--- | :--- | :--- |
| 1 | Ship the nine built assets (`DISTRIBUTION_PLAYBOOK.md` §1) | days | owner, C8 |
| 2 | **Play 1** — File X-ray, photos only | days | the EXIF kill criterion first |
| 3 | **Play 4a** — pre-upload snippet, ten sites | ~1 week | owner, C8 |
| 4 | **Play 5** — ten conversations | ~1 week | none |
| 5 | **Play 2** — matcher offline, then the bar | weeks | 50-phrase test |
| 6 | **Play 3** — one complete job page | weeks | can the job be finished |
| 7 | **Play 4b** — MCP | weeks | **decision 13 reopened** |

Items 1–4 are cheap and mostly not code. Items 5–7 are months. The common
mistake would be starting at 5.

## 9. What this document does not claim

No forecast, no timeline to a user number, and no claim that any play will
work. Each carries a kill criterion instead, which is the only honest form a
plan can take from a baseline of zero search clicks: **the plays are
falsifiable, and the cheap ones are sequenced first so the falsification is
cheap too.**
