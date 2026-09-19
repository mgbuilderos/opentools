# The $50/day playbook

> **Target**: $50/day in voluntary support — about **$1,500/month** — from
> organic traffic only, no paid spend (C9).
> **Status**: plan. Nothing here is deployed.
> **Companion to**: `ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md`, which produces the
> traffic this converts.

---

## 1. The number, and the two shapes it can take

$50/day is not one problem. It is two, with very different costs:

| Shape | What it takes | What it scales with |
| :--- | :--- | :--- |
| **One-off tips** at ~$3 | ~17 tips **every day**, ~500/month | **Traffic.** Tip rates on free utilities are small fractions of completed tasks, so this needs a large site. |
| **Recurring** at $5/month | **300 members.** That is the whole requirement. | **Audience.** 300 people who want the thing to keep existing. |

Solve it the other way and the asymmetry is stark. At a 0.1% tip rate, 17 tips a
day needs ~17,000 completed tasks a day. At 0.5%, ~3,400 a day. The true rate
here is unknown — nothing has been measured, and §6 of the growth playbook
explains why it cannot be until Search Console has rows — but **every plausible
rate puts one-off tips in the hundreds-of-thousands-of-tasks-a-month range.**

300 recurring members is a different kind of hard. It is not a traffic problem.

**So the strategy is: recurring is the floor, tips are the upside.** Build the
membership base from communities that fund infrastructure they believe in, and
let one-off tips ride on top of the search traffic the growth playbook produces.
Both engines, but recurring is the one that gets to $50/day first and holds it
on a day when traffic dips.

Buy Me a Coffee supports both. **It takes a platform fee on each transaction —
confirm the current rate — so the gross needed is above $1,500. UPI is 0%, which
makes routing Indian supporters to UPI and everyone else to BMC a real margin
decision, not a convenience.**

---

## 2. Why anyone pays for a free MIT tool

Nobody pays for the tool. The tool is free and always will be — that is a
non-negotiable invariant, and removing it would destroy the reason people trust
the product.

People pay for three things, and only three:

1. **The stance.** No tracking, no upsell, no account, no file leaving the
   device. Patronage audiences fund stances. This is why Pi-hole, Syncthing and
   uBlock-adjacent projects sustain themselves while better-funded competitors
   with the same features do not.
2. **Continuity.** "This solved my problem and I want it to exist next year."
3. **Being seen.** A supporter wall, a thank-you, a public accounting of where
   the money went.

Every tactic below serves one of those three. Anything that serves none of them
is decoration.

---

## 3. Three engines

### Engine A — Recurring base (the floor)

**Target: 300 members at $5/month. This is the whole $50/day.**

The audience is not "people who need to compress a PDF". It is
**self-hosters, privacy advocates, IT and compliance staff, and developers who
recommend tools inside their company.** They fund infrastructure. They are
reachable without any search traffic at all.

The single highest-leverage unlock is already in flight: **the self-host
edition** (owner decision 12, `apps/claude-selfhost`). Someone who runs your
Docker image on their own box is the archetype of a recurring supporter — and it
is the entry ticket to `awesome-selfhosted` and r/selfhosted, which are where
that audience actually is. **Ship self-host, and Engine A has a door. Without
it, Engine A is knocking on a wall.**

**The ask surface exists, and as of 2026-09-19 it is used.**
`milestone-modal.tsx` fires at 10, 50 and 100 completed tasks, counted in
`localStorage` — device local, no server, no tracking, fully compliant. Someone
who has used the site **fifty times** is the best membership prospect the
product will ever have.

~~The modal shows them a generic "Support our development" link.~~ **RESOLVED
2026-09-19.** It names the count, and offers the rail the visitor can actually
use — UPI for a visitor the browser's own locale places in India, Buy Me a
Coffee otherwise. Two things it used to do were worse than the generic link and
are also gone: it opened a full-screen modal from the completion event, landing
over the receipt's moment before the person could click Save, and it ignored
the support preference, so someone who had said "don't ask again" was asked
anyway. It now decides once per page load and never mid-task, and it reads that
preference without spending it, so a milestone never costs the receipt an ask.
**Do not re-raise the generic link.**

**What is still unbuilt is the recurring ask, not the surface.** The copy below
asks for $5 a month and there is no recurring rail: UPI and Buy Me a Coffee
both take one-off amounts today, and nothing here can bill anyone monthly.
Turning this moment into a membership therefore waits on Engine A having a
door at all, which is the self-host point above — not on the modal, which is
now ready to carry whatever ask it is given:

> **You've used this 50 times.**
> No account, no uploads, no ads — and it stays that way.
> $5/month keeps it running. Optional, and nothing changes if you don't.

Note what it does not do: no guilt, no invented time-saved, no scarcity, and it
states the non-consequence of declining. It converts because the fact is true
and the person already knows it.

### Engine B — Tips at the moment of relief (the upside)

Tips convert at the point of gratitude, not on a pricing page. That point is the
completed task — which is why `completion-value-dialog.tsx` matters more than
`/support`, and why the receipt must carry the job's own facts. **Built as of
2026-09-19:** `announceCompletion` measures them, the dialog gates the offer on
them and waits 400ms after the save click, and `lib/proof-card.ts` draws them
onto a shareable 1200x630 card. Per-tool wiring is the remaining work — a tool
that passes no metrics silently never asks, which `lib/completion.test.ts` now
fails the build over.

The strongest tip context this product has is the **bounced upload**: someone
rejected by a portal, who just got unstuck. Their gratitude is real and
immediate. That is the same wedge the growth playbook's Pillar 1 targets, which
means Engine B and the search strategy are the same investment.

### Engine C — Radical transparency (the multiplier)

A public page showing **the real monthly cost of running this, and the real
amount that came in.** Actual numbers, updated, including the months where it
does not cover costs.

This is the highest-converting patronage tactic there is, it costs nothing, and
it is uniquely available here because the product's entire identity is already
"we tell you the truth about what happens to your file". A project that publishes
its own shortfall is a project people fund.

**It only works with real figures.** Inventing them would be the exact failure
this repository's rules exist to prevent, and would be worse than not doing it.

---

## 4. Channels, all free

Ordered by cost-to-first-supporter, cheapest first.

| Channel | Engine | Prerequisite |
| :--- | :--- | :--- |
| BMC page live and linked everywhere | both | **done** — committed in `support-config.ts`, not env-dependent |
| `milestone-modal` one-off ask | B | **done 2026-09-19** |
| `milestone-modal` *recurring* ask | A | a recurring rail — none exists yet |
| Receipt facts in the completion dialog | B | **done 2026-09-19** |
| AlternativeTo profile | B | none — do it now |
| r/selfhosted, r/privacy, r/opensource | A | self-host edition shipped |
| `awesome-selfhosted`, `free-for-dev`, `awesome-privacy` | A | self-host edition; then a PR each |
| Show HN | both | one genuinely novel thing to show (§5) |
| Answer-first presence in portal-upload threads | B | the exact-size tool live |
| GitHub README + repo badge | A | repo already public |
| Transparency page | C | real cost figures from the owner |

**Answer-first, not link-dropping.** The rule that keeps this from being spam
and getting the domain burned: find the question, answer it completely in the
thread including the manual method, and mention the tool once as one way to do
it. A comment that is useful when the link is removed is a comment that survives.

---

## 5. The thing worth showing

Show HN and the privacy communities need one genuinely novel thing, not a list
of forty tools. The product now has one:

**A file-size tool that hits a portal's published ceiling, in the tab, on
measured bytes — and tells you when it cannot.**

Every incumbent makes you upload a passport scan or a bank statement to a server
to do this. The fit-to-size engine searches quality and a dimension ladder,
decides on bytes it actually produced ("Nothing here estimates"), and returns an
honest `over-max` rather than a file that quietly misses. The portal presets
carry the page each limit was read from and the date it was read, and expire
after 90 days.

That combination — the private thing, done exactly, that admits failure — is the
post. Not "40 free tools".

---

## 6. The ladder

No date is attached to these, deliberately: each rung depends on work that is
not finished, and a date invented here would be the same class of number this
repository bans. The order is the commitment.

| Rung | What it proves |
| :--- | :--- |
| **0 — Anyone can pay at all** | BMC URL set, UPI id set, both verified with a real transaction. Today, neither works. |
| **1 — First supporter** | The ask exists at a moment of real value and someone acts on it. |
| **2 — First $1/day sustained** | ~10 supporters/month. The loop works, not just once. |
| **3 — First 50 recurring members** | ≈$8/day. Engine A is real and the audience exists. |
| **4 — 300 recurring members** | **$50/day, held on low-traffic days.** The target. |
| **5 — Tips on top** | Engine B compounding as search traffic lands. Above target. |

Rung 0 is the only one that is blocked on nothing but a value being set, and
nothing above it can happen until it is done.

---

## 7. What is blocking this today

1. ~~No working payment channel.~~ **RESOLVED 2026-09-19.** Both rails are live
   and verified by the owner: UPI (`mg.io.test@oksbi` — a real id, despite how
   it reads) and Buy Me a Coffee at `buymeacoffee.com/codebuilder` with 1/2/5
   presets. **Do not re-raise this.** It has been re-investigated more than once
   by agents reading this line and finding it stale.
2. ~~The ask surfaces are wasted.~~ **RESOLVED 2026-09-19, both of them.** The
   receipt takes the job facts from `announceCompletion`, gates the offer on
   them and draws them onto a shareable card, and `lib/completion.test.ts`
   fails the build for any tool that announces without them. The milestone
   names the count and offers a real rail, asks once, no longer fires mid-task,
   and reads the support preference without spending it. `local-source-policy`
   holds both files to the same rules. **Do not re-raise either.** What is left
   is the *recurring* ask, which has no rail to run on — that is item 3, not
   this one.
3. **Engine A has no door until the self-host edition ships.**
4. **Nothing is measured.** Support conversion cannot be measured at all under
   `connect-src 'none'` — see growth playbook §6. The only honest signal is
   money arriving, which is why Rung 0 doubles as instrumentation.

---

## 8. What only the owner can do

1. **The BMC page URL**, and whether memberships are enabled on it. Memberships
   must grant **no product benefit** — decision 13 bars a paid tier and rule 35
   bars differential treatment, so a membership buys thanks and continuity,
   never features.
2. **The real UPI id**, set as `NEXT_PUBLIC_UPI_ID`, and one rupee sent to
   yourself to prove it.
3. **Real monthly running costs** for Engine C, if we do it. It does not work
   with estimates.
4. **Go-ahead on each outward action** as it comes (C8): the BMC page, the
   self-host release, each list PR, the Show HN.
