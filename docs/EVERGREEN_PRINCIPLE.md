# The evergreen principle

**Date:** 2026-09-26 · **Status:** owner decision, recorded by Claude Code at
the owner's request. It governs new tools and pages from here.
**Related:** `docs/DECISION_LOG.md` (decision 16), `lib/portal-presets.ts`,
`lib/tools/pdf/fit-to-size.ts`, `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md`
Pillar 1.

> The owner, 2026-09-26, rejecting a proposal to build pages around named
> exam and government form requirements:
>
> *"we need to make evergreen tool — suppose a form changes then we dont know
> that what is the new image size. so we want to have evergreen tool that stays
> the test of the time."*

---

## 1. The principle

> **Never encode another system's rules. Take the requirement as input.**

A page that says *"this form needs a photo between 20 and 50 KB"* is a claim
about someone else's system, made at a moment in time, that nobody here is
watching. A tool that says *"tell me the size you need and I will hit it
exactly"* is never wrong, because the requirement lives with the person who
actually has it — where it is always current.

The second one also does strictly more: it serves every form, in every country,
in every year, including the ones that do not exist yet.

---

## 2. The failure mode it prevents

Not that the page becomes wrong. That it becomes wrong **silently**.

A stale limit does not throw. It does not fail a test. It does not appear in a
log. It renders perfectly, reads confidently, and sends someone to a portal
with a file that gets rejected — and the only signal reaching this project is a
visitor who does not come back. There is no instrument here that can detect it:
`connect-src 'none'` and rule 38 mean there is no funnel to watch, deliberately.

**A claim nobody can verify and nothing can detect is the worst kind of defect
this codebase can ship.** It is worse than a crash, which at least announces
itself.

---

## 3. The evidence is already in this repository

This is not a precaution. It is a lesson already paid for.

`ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` Pillar 1 records what happened when the
six rows of the portal-preset table were sourced for the first time:

| Row | Outcome |
| :--- | :--- |
| USCIS, two separate ceilings (2 MiB, 6 MiB) | **Both invented.** USCIS publishes one limit for every upload, and it is 12MB. |
| VFS Global ×2 | **Deleted.** Limits are per mission, and the site returns 403 to any fetch, so no stable published figure exists to cite. |
| Workday | **Deleted.** Configured per tenant, behind each employer's login. No Workday-published number exists. |
| Email, "providers stop between 20 and 25 MB" | **Replaced.** A generalisation across providers, not any authority's figure. |

**Four of six rows were wrong or unsourceable.** And the document's own
conclusion is the sharper half:

> Decision 16's expiry rule was written to catch limits that *drift*. Its first
> run caught limits that were never right.

Decision 16 — sourced, dated, 90-day expiry, in-app only, barred from anything
a search engine caches — is a good rule and it is still in force in
`lib/portal-presets.ts`, which today carries six rows each with a `sourceUrl`
and a `checkedOn`, gated by `PRESET_MAX_AGE_DAYS`.

But notice what decision 16 is: **a mitigation for encoding the rule at all.**
The evergreen principle is the avoidance. Where both are available, prefer the
avoidance — an expiry gate still needs a person to re-open a source four times
a year, forever, per row, and that person does not scale.

---

## 4. The test, before you build

One question, asked of any page or tool:

> **If the external system changes tomorrow and nobody tells us, does this
> become wrong?**

- **No** → evergreen. Ship it.
- **Yes** → you have encoded someone else's rule. Redesign so the requirement
  arrives as input, or accept decision 16's full cost: source, date, expire,
  app-only, and a standing commitment to re-check.

---

## 5. The patterns that follow

**a) The requirement is an input, not a constant.** The user knows their number.
Ask for it. `/image/exact-size` is the shape: a target field, not a dropdown of
institutions.

**b) Verify against the measured output, never a predicted one.**
`lib/tools/pdf/fit-to-size.ts` decides on measured bytes only — its own header
says *"Nothing here estimates"*. A tool that predicts its output is making a
second claim it cannot check.

**c) Fail loudly when the target cannot be met.** `fit-to-size.ts` returns an
explicit `over-max` outcome and hands back the smallest attempt, rather than
silently delivering something over the ceiling. An honest failure is a feature;
a quiet near-miss is the same silent wrongness as a stale limit.

**d) Never put another system's number where a search engine caches it.**
Decision 16 already bars it from `<title>`, `<h1>`, meta description,
structured data and sitemap entries. The reason is exactly §2: a cached page
keeps serving a number long after the portal moved.

**e) When you genuinely must encode one**, take decision 16 whole. Not most of
it — the source link, the date, the specific field, the expiry, the in-app-only
placement, and editability after it fills the box. A preset is a *convenience
default the user can overrule*, never an authority.

---

## 6. What this unlocks

The principle was raised as a constraint. It is also the growth argument, and
that is worth stating plainly because the two look opposed and are not.

People search with the number already in their query: *"resize signature to
20kb"*, *"compress photo to 50kb"*, *"pdf under 2mb"*. Enormous, constant,
high-urgency demand, and almost no brand defends it.

The tempting way to serve it is a page per institution — which is fifty
maintenance commitments that each fail silently, plus a near-template family
that C4 and decision 11 forbid, plus a fresh set of claims to source.

The evergreen way serves all of it with **one tool that asserts nothing**: the
number arrives in the user's query, goes into the input box, and the tool hits
it. The page targets the *pattern*, never the value. Nothing to date, nothing
to expire, nothing that can quietly go wrong — and it covers the exam that
changed its rules last week and the portal that does not exist yet.

**Same traffic. No maintenance. No claim.**

---

## 7. Where it already holds, and what to audit

Holds today:

- `/image/exact-size` — the user names the target.
- `lib/tools/pdf/fit-to-size.ts` — measured bytes, honest `over-max`.
- `lib/portal-presets.ts` — the mitigated exception, correctly mitigated.

Worth auditing against §4, in rough order of exposure: any tool page whose copy
states a third party's limit, format requirement, or accepted value;
`lib/seo/tool-page-depth-*.ts`, where a helpful sentence about what some portal
accepts is easy to add and impossible to notice later; and any future
"presets" list, which is where this pressure always reappears.

A useful smell: a number in the copy that no test can check.

---

## 8. What this principle does not say

It does not say be vague. A tool should state precisely what *it* does — the
formats it reads, the measured duration, the bytes it produced, what it refuses
to do. Those are claims about this software, verifiable here, and the site is
built on making them checkable.

The rule is narrower and sharper: **be precise about yourself, and silent about
everyone else's rules.**
