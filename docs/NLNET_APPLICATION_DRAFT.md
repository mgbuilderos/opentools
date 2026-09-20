# NLnet Restack — application draft

**Fund:** NGI Zero Restack · **Deadline:** 3 November 2026, 12:00 CET
**Range:** €5,000–€50,000 (max €50,000 for a first proposal)

> ⚠️ **Corrected 2026-09-19 — geography is not neutral.** An earlier version of
> this file said there was no geographic restriction. That was wrong: it
> conflated *entity type* (individuals may apply — true) with *location*.
> NLnet's actual position is that, given equal proposals, inhabitants of the EU
> and Horizon Europe associated countries are **given priority**, and proposals
> from elsewhere are eligible only with exceptional quality, unique technical
> expertise, and **a clear European dimension** — usually a formal EU
> connection or an EU collaborator.
>
> For an India-based individual with no EU tie that is a real additional
> hurdle, and it pushes the odds below the ~14% base rate quoted below. Do not
> submit this without either finding an EU collaborator or writing an honest
> European-dimension argument. **That argument is now written — see the
> "European dimension" section below.** It rests on five honest legs: the
> deliverable is a method whose intended adopters are EU projects; it makes a
> GDPR claim testable; it is a technical answer to the international-transfer
> problem; it serves EU public bodies that currently have no compliant option;
> and €5,000 of the budget is committed to an EU-based reviewer. An actual EU
> co-maintainer would still be worth more than all five.
>
> **Apply to OTF and FUTO first** — see `docs/FUTO_APPLICATION_DRAFT.md`. Both
> are explicitly open to any nationality.
**Scoring:** relevance/impact 40% · technical excellence & feasibility 30% ·
cost-effectiveness 30% · must clear 5.0/7 to advance
**Apply:** <https://nlnet.nl/restack/>

> **This is a draft for you to edit and submit under your own name.** Check the
> live form before pasting — the fields below are NLnet's usual questions, but
> confirm them on the portal. Two things only you can answer are marked
> **[YOU]**.

---

## Read this first — what you must rewrite, and why

**NLnet rejects AI-generated submissions.** That is not a formality you can
route around by paraphrasing: reviewers read a lot of proposals and the
generic ones are obvious. So treat everything below as *assembled research*,
not as text to paste.

The file is deliberately in two halves:

**Facts — check these, don't rewrite them.** Numbers, URLs, the evidence, the
budget table, the comparison with other projects, the three failure modes. They
are measured and dated, and they are the part that makes the proposal credible.
Verify anything you doubt; the commands are in the repository.

**Argument — these must be in your own words.** Rewrite them from scratch,
saying what you actually think:

| Section | What only you can say |
| :--- | :--- |
| Abstract | Why this matters to you, in the plainest language you have |
| Have you been involved… | Your actual background. The `[FILL]` marker is yours |
| Explain what the project is about | Why you built it — the thing you found unacceptable |
| European dimension | Whether you believe the case. If you don't, say less, not more |
| Requested amount | What the work honestly costs you, not the maximum |
| Timeline and capacity | Your real hours per week. Nobody else can answer this, and overstating it is the commonest way a good proposal fails |
| How this reaches projects | Which projects you will actually approach, by name |

A test that works: read a paragraph aloud. If it doesn't sound like you
explaining it to a friend, rewrite it until it does. Shorter and plainer beats
polished — the reviewers are engineers, and the strongest thing here is that
your central claim can be checked in two minutes, which almost no proposal can
offer.

**Status, 20 September 2026.** Evidence is complete and current: the egress
proof passed 6/6 against the deployed site today, and the four sections NLnet
needs but the earlier draft lacked — tasks and deliverables, timeline and
capacity, licensing, and adoption — are now in. What remains is yours: the
words, the budget decision, and three `[YOU]` answers (your background, your
available hours, and the projects you will approach by name).

**The one decision that outranks everything else here** is in "Scope warning",
under Timeline and capacity: at part-time hours the five-task €45,000 scope
does not fit a normal grant window, and cutting to a €20,000 core ask is
probably the stronger application. Decide that before you write a word.

---

## The framing decision, and why

NLnet funds **research and development**, not marketing, hosting or running a
service. A proposal that reads "fund my PDF tool" scores badly on all three
criteria.

So this proposal is **not** about the tools. It is about the thing underneath
them that is genuinely novel and that nobody else has built: **a reusable,
executable method for proving that a web application cannot exfiltrate the data
it processes** — with OpenTools as the working reference implementation.

That reframing is not a trick. It is the honest description of what is
interesting here, and it maps directly onto Restack's stated scope —
*"trust enhancing technologies"*, *"client-side applications"*,
*"reproducibility"*. It also converts the weakest part of a small project (few
users, one maintainer) into irrelevance: reviewers are funding a method and a
spec, not an audience.

---

## Project name

`Provable Local Processing — verifiable no-egress guarantees for web applications`

## Website

`https://getopentools.com` · source `https://github.com/mgbuilderos/opentools`

## Abstract

> Millions of people send private documents — contracts, medical records, ID
> scans, financial statements — to free web tools every day, because they need
> a PDF compressed and have a deadline. Every one of those tools says it
> respects privacy. None of them offer any way to check.
>
> This project makes that claim falsifiable. A web application can be served
> with a Content-Security-Policy of `connect-src 'none'`, which makes the
> browser itself refuse every fetch, XHR, WebSocket and beacon the page
> attempts. The guarantee is then enforced by the user's own browser rather
> than promised by the operator — and it is checkable by anyone in seconds.
>
> We have built a working implementation: 646 document, image and data
> operations across 44 tool pages, running entirely in the browser tab under
> that policy, MIT licensed, with an automated proof that runs on every
> release. The proof actively attempts five exfiltration vectors, then
> processes a real file and asserts zero off-origin bytes, in two browser
> engines. The same application runs from a single container with no network
> access at all.
>
> As of 20 September 2026 that proof also runs against the **deployed** site,
> not only a local build — so the guarantee is measured on what a visitor
> actually receives. A reviewer can reproduce it against our live service with
> one command, without installing our application or trusting our report.
>
> The grant would generalise this from one application into reusable public
> infrastructure: a documented verification protocol, an engine-independent
> test harness any project can adopt, and a checker that lets a non-technical
> person evaluate any web tool's claim. The intended outcome is that "processes
> your data locally" becomes a statement that can be tested rather than
> marketing copy.

## Requested amount

**€45,000** *(adjust — see budget. Anything from €5,000 works; ask for what the
work costs, not the maximum.)*

## Have you been involved with projects or organisations relevant to this?

> No. I have no prior involvement with NGI, NLnet, Horizon Europe, or any
> privacy, security or standards organisation, and no academic or institutional
> affiliation. My background is **[FILL: N years in <industry / role>]** — not
> security research. This is my first application for research funding of any
> kind.
>
> What I offer instead of credentials is delivery. I designed, built and
> shipped OpenTools myself: 540 client-side utilities, the enforced
> `connect-src 'none'` policy, the cross-engine exfiltration proof, the
> air-gapped container and the published evidence. All of it is in the public
> repository, dated, and can be checked rather than taken on trust. The two
> browser failure modes described in this proposal — the beacon that reports
> success after being blocked, and the engine disagreement on blocked-request
> events — were found by building the proof, not by reading about them.

## Explain what the project is about

> **The problem.** "We process your files locally" and "we delete your uploads
> immediately" are among the most common claims on the web, and among the least
> verifiable. A user cannot distinguish a tool that never transmits their file
> from one that transmits and deletes it, or from one that transmits and keeps
> it. The difference matters most for exactly the people least able to check:
> someone handling patient records, legal documents, or identity papers under
> GDPR, HIPAA or India's DPDP Act.
>
> Measured on 18 September 2026, none of the seven most-used online PDF services
> ship a Content-Security-Policy at all. This is not misconduct — they are
> server-side by architecture and mostly say so. The gap is that users have no
> way to tell which is which, and no vocabulary to ask.
>
> **The approach.** `connect-src 'none'` converts the claim into a
> browser-enforced property. What has been missing is not the directive — it is
> a rigorous, reusable way to *prove* an application actually holds to it
> across releases, and a way for ordinary users to check.
>
> Building that proof surfaced three failure modes that silently invert
> results, and which we expect any independent implementation to hit:
>
> 1. **A CSP-blocked `navigator.sendBeacon` still returns `true`.** The
>    specification returns true once the beacon is queued; the policy refuses it
>    afterwards. A check asserting on that return value records a leak as a pass.
> 2. **Chromium raises a request event for a request it is about to block**
>    (failure reason `csp`, zero bytes transferred), where WebKit raises
>    nothing. A check asserting "nothing was attempted" therefore fails a
>    correctly-behaving page on one engine and passes it on the other.
> 3. **A proof run against a local build can pass for reasons that do not hold
>    in production, and a proof run against a deployed one can fail for reasons
>    that have nothing to do with egress.** We hit the second case on
>    20 September 2026, the first time we pointed the protocol at our own live
>    site: the check hands a file to the page and measures what leaves, but
>    over a real network it handed the file over before the page had finished
>    initialising, the handover was discarded, and the run reported the tool as
>    broken. The tool was fine. Locally the race cannot occur, because loading
>    is instantaneous — so this class of error is invisible until the day the
>    method is used on the thing it is meant to certify.
>
> A verification method that does not account for all three produces confident
> wrong answers in both directions. That is the research content of this work,
> and the third is why the protocol has to specify *deployed* verification
> rather than leaving each project to improvise it locally.
>
> **What already exists**, and is verifiable today rather than proposed:
>
> - 646 operations across 44 tool pages, running client-side under
>   `connect-src 'none'`, MIT licensed.
> - `e2e/egress-proof.spec.ts`: attempts five exfiltration vectors, then runs a
>   real file through a real tool and asserts no off-origin response and zero
>   off-origin bytes — in Chromium and WebKit, on every release. Confirmed
>   non-vacuous by pointing the same detector at a page that does load a
>   cross-origin resource, where it fails as it should.
> - `playwright.production.config.ts`: the same protocol pointed at a deployed
>   origin rather than a local build. **6/6 passed against `getopentools.com`
>   on 20 September 2026, Chromium and WebKit.** Its setup records the exact
>   asset hash and edge identifier it measured, because evidence that does not
>   name the build it measured is not evidence. A reviewer can run it against
>   our live site, or against their own, with one command.
> - A container that serves the whole application with `--network none`, with an
>   outbound request from inside it failing to resolve.
> - Published evidence and method notes in the repository.
>
> **What the grant would produce**, all open access:
>
> 1. **A written verification protocol** — what may be claimed at each level of
>    evidence, what each level does *not* establish, and the known traps. Aimed
>    at being adoptable by projects with no relationship to us.
> 2. **An engine-independent test harness**, packaged for reuse, so any web
>    project can run the same proof in its own CI rather than reimplementing it
>    and hitting the failure modes above.
> 3. **A public checker** that inspects any URL's policy and reports, in plain
>    language, whether that page is capable of transmitting what a user gives
>    it — so the evaluation is available to people who do not read headers.
> 4. **A hardened self-hostable edition** for organisations that cannot use a
>    third-party service at all: TLS, authentication, and a reproducible build.
>
> **Why it matters beyond one application.** The protocol and harness are the
> deliverable; our tools are the reference implementation that proves the method
> works on something real. If adopted, "runs locally" becomes a testable claim
> across the ecosystem, and users gain a way to ask a question they currently
> cannot even phrase.

## Compare your own project with existing or historical efforts

> **Server-side tools with privacy policies** (Smallpdf, iLovePDF, Adobe
> Acrobat online, PDF24, Sejda). Legitimate architecture, and the dominant one.
> Their guarantee is contractual — it rests on trusting the operator's conduct
> and retention. Ours is architectural: the browser refuses the transmission, so
> there is nothing to trust and nothing to retain. Complementary, not a
> replacement: some work genuinely needs a server.
>
> **Client-side tool collections** (Stirling PDF, various single-purpose
> browser tools). Closest in spirit, and several process locally in practice.
> The difference is evidential rather than architectural: to our knowledge none
> ships an enforced `connect-src 'none'`, and none ships an automated,
> cross-engine proof that runs per release. Locality by implementation is
> undone by one dependency update; locality by policy plus a failing test is
> not. Our aim is explicitly that these projects can adopt the harness — a
> shared method is worth more here than a competitive advantage.
>
> **CSP tooling** (`csp-evaluator`, Observatory, `securityheaders.com`). These
> assess a policy's strength against XSS and injection. None asks the question
> this project asks — *can this page transmit the data I just gave it* — or
> tests it by attempting exfiltration during a real operation.
>
> **Local-first and end-to-end-encrypted software.** Adjacent and valuable, but
> answers a different question. E2EE protects data in transit and at rest on a
> server; this work establishes that no transit occurred at all, which is a
> stronger and narrower guarantee available only to client-side processing.

## What are the significant technical challenges you expect to solve?

> 1. **Making the proof engine-independent.** The two failure modes above are
>    concrete instances of a general problem: browsers disagree on what they
>    report about a request they refuse. A harness has to assert on outcomes
>    (did anything receive a response; were any bytes transferred) rather than
>    on attempts, and be validated against a known-leaking control.
> 2. **Covering vectors that survive `connect-src`.** Navigation, form
>    submission, prefetch and resource-loading side channels are not governed by
>    it. The protocol must enumerate what remains and say plainly what the
>    evidence does not cover — a proof that overstates is worse than none.
> 3. **Making the result legible to non-experts.** A checker has to answer "can
>    this page send my file somewhere" without either overclaiming or reducing
>    to a header dump.
> 4. **Hardening the self-hostable edition** without adding a network
>    dependency: TLS and authentication in an image that must still run
>    air-gapped, and a reproducible build so the running artefact can be tied
>    to published source.
> 5. **Keeping the guarantee honest as the software grows.** One route already
>    needs `connect-src 'self'` for a same-origin model. The protocol has to
>    handle justified exceptions explicitly rather than pretend they do not
>    exist.
> 6. **Verifying the artefact that is actually served, not a local rehearsal
>    of it.** A build on a developer's machine is not the thing users receive:
>    edges inject tags, caches serve older assets, and timing behaves
>    differently over a real network. We have hit all three — including an
>    analytics tag injected at the edge that our policy blocked but that we had
>    never authored. The protocol therefore has to define how a deployed
>    artefact is identified and pinned in the evidence, so a passing result
>    names a specific build rather than "the site, at some point".

## European dimension

*Not a field on the form. Paste it into whichever free-text field fits — most
likely the end of "Explain what the project is about", or a final
"anything else" box. It is the single thing that decides whether a non-EU
application is read at all, so do not leave it out.*

> I am an individual based in India, with no EU establishment and no EU
> collaborator. I state that plainly rather than construct a connection that
> does not exist. The case for funding this from Europe is about where the work
> lands, not where I sit.
>
> **The deliverable is a method, and its intended adopters are European.** This
> grant does not fund my tools. It funds a written verification protocol and a
> reusable, engine-independent test harness, both open access and explicitly
> designed to be run by projects that have no relationship to me. The projects
> that most need them are client-side and local-first ones — a large share of
> which sit in NGI Zero's own portfolio and elsewhere in the European commons.
> Wherever the author is, the output is public infrastructure that European
> projects can adopt on day one, and NGI-funded projects are the first adoption
> targets I would approach.
>
> **It makes a GDPR claim testable for the first time.** Under GDPR, if a file
> never leaves the user's device there is no transmission to a controller and no
> international transfer to assess. That is the most favourable position a
> service can be in — and today no European user, data protection officer or
> supervisory authority can verify that a given web tool is actually in it. They
> can read a privacy policy. This work replaces that with a check that takes
> minutes and that a non-specialist can run. It turns a European legal standard
> into an observable property of software.
>
> **It is a technical answer to the transfer problem Europe has spent a decade
> litigating.** The everyday tools people use for documents are server-side and
> largely hosted outside the EU: for a European user, compressing a contract is
> an international transfer, with the whole of Chapter V behind it.
> Architecturally-verified local processing does not paper over that transfer
> with contractual clauses — it removes the transfer. This is a small, concrete
> contribution to the technical side of a question Europe has mostly had to
> answer legally.
>
> **It serves European public bodies that currently have no compliant option.**
> European data protection authorities have repeatedly objected to US-cloud
> office and document services in schools and public administration. Those
> institutions still need to merge a PDF. The self-hostable, air-gapped edition
> in this budget — combined with a proof that the running artefact cannot
> transmit — is the thing procurement can actually accept. It is useless without
> the verification method, which is why the two are funded together.
>
> **Concrete commitments, if funded.** The €5,000 independent security review in
> this budget will be commissioned from an **EU-based reviewer**, so a defined
> share of this grant is spent in Europe, on European expertise, validating the
> protocol from inside the ecosystem that would use it. All outputs are
> published open access under an OSI-approved licence, with no commercial
> exclusivity and no patent claims. I will actively seek a European
> co-maintainer for the harness rather than keep it a single-maintainer project.
>
> **What I am not claiming.** No prior EU funding, no Horizon participation, no
> institutional affiliation, no EU entity. If the European dimension here is
> judged insufficient, I would rather be told that than have overstated it.

## Tasks and deliverables

*NLnet does not hand over a lump sum. They agree a list of concrete tasks, each
with an amount, and pay on delivery — the memorandum of understanding is built
from this table. So this section, not the budget total, is what they are
actually agreeing to. **Adjust the durations to what you can honestly commit**;
see "Timeline and capacity" below.*

| # | Task | Deliverable | Done when | € |
| :-- | :--- | :--- | :--- | ---: |
| 1 | Verification protocol | A published specification: the levels of evidence, what may and may not be claimed at each, the three documented failure modes, and how a deployed artefact is pinned in a result | It is published open access at a stable URL and a third party can follow it without contacting me | 8,000 |
| 2 | Cross-engine test harness | An installable package that runs the protocol against either a local build or a deployed origin, in at least two engines, validated against a deliberately-leaking control | It is on a public package registry with a worked CI example, and **at least one project other than mine has run it** | 12,000 |
| 3 | Public checker | A page and a command-line tool that take any URL and report, in plain language, whether that page can transmit what a user gives it — and what the check does not cover | It is publicly available, covers the documented vectors, and its wording has been tested on non-technical readers | 9,000 |
| 4 | Hardened self-hostable edition | A container with TLS, authentication and a reproducible build, running with no network access | The image pulls anonymously, the build reproduces from published source, and the egress proof passes against a self-hosted instance | 11,000 |
| 5 | Independent security review | A written review of the protocol and harness by an EU-based reviewer with no involvement in the work | The report is published **in full, including whatever it found**, with my responses | 5,000 |
| | **Total** | | | **45,000** |

Two things about this table are deliberate and worth keeping.

**Task 2 is done when someone else runs it, not when I publish it.** A harness
nobody adopted has not demonstrated that the method generalises, which is the
entire claim. Tying payment to external adoption is the strongest commitment I
can make to that.

**Task 5 publishes whatever the review finds.** A security review that only
gets published when it is favourable is marketing. This proposal argues that
claims should be checkable; the review has to be held to the same standard.

## Budget summary

*The same five amounts as the task table above, which is the one that matters —
this is only the summary. Adjust both together if you change anything.
Reviewers weigh cost-effectiveness at 30% and prefer a small, credible ask over
a padded one: cut a task rather than pad one.*

| Task | € |
| :--- | ---: |
| Verification protocol: specification, evidence levels, documented traps, published open access | 8,000 |
| Reusable cross-engine test harness, packaged and documented for third-party adoption | 12,000 |
| Public checker for evaluating any URL, with plain-language output | 9,000 |
| Hardened self-hostable edition: TLS, authentication, reproducible build | 11,000 |
| Independent security review of the protocol and harness | 5,000 |
| **Total** | **45,000** |

## Timeline and capacity

*Feasibility is 30% of the score alongside technical excellence, and the
commonest way a good single-maintainer proposal fails is claiming availability
the applicant does not have. **Read the scope warning under the table before
you fill this in** — it is the most consequential thing in this file.*

> **My situation.** I work on OpenTools alongside paid employment. It is a
> serious commitment rather than a hobby — the application shipped in September
> 2026, and the commit history shows the rate I actually deliver at, which is a
> better guide than anything I could assert here. But it is not full-time, and
> I would rather state that plainly than have the timeline quietly assume
> otherwise.
>
> **My available time: [YOU — real hours per week. Count the weeks you will
> lose to work and life, not your best week.]**
>
> **Duration: [YOU — see the scope note below before choosing.]**
>
> I am the sole maintainer. That is a real risk and I would rather name it than
> have it noticed. Three things reduce it. The work is already partly done and
> published, so this grant extends a demonstrably shipping codebase rather than
> starting one. The tasks are independently useful: if only tasks 1 and 2 are
> completed, the protocol and the harness stand on their own and the rest can
> be dropped without stranding anything. And I will actively seek a European
> co-maintainer for the harness during task 2 rather than leave it a one-person
> project.
>
> **If the method does not generalise** — if the protocol cannot be applied
> cleanly to applications built differently from mine — I will publish that
> finding rather than quietly narrow the claim. A documented negative result
> about what architectural verification cannot cover is worth more to the
> ecosystem than a method that only works on its author's code.

### Scope warning — read this before you submit

*This part is for you, not for NLnet. Delete it.*

Rough effort, at full-time equivalent, for the five tasks as written:

| Task | FTE weeks |
| :--- | ---: |
| 1 · Verification protocol | 3–4 |
| 2 · Cross-engine harness | 6–8 |
| 3 · Public checker | 4–5 |
| 4 · Hardened self-hostable edition | 5–6 |
| 5 · Coordinating and responding to the review | 2 |
| **Total** | **20–25** |

Twenty to twenty-five full-time weeks is **five to six months of full-time
work**. At 12 hours a week that is roughly **16–20 months**; at 20 hours a week,
about **10–12 months**.

So the €45,000 five-task scope only fits a normal grant window if you can give
it something close to half a working week, every week, for a year. If you
cannot, you have two honest options, and **the second is usually the better
application**:

1. **Ask for €45,000 over a longer period** — state 18 months rather than 12.
   Defensible, but reviewers read long timelines from single part-time
   maintainers as delivery risk, and that is the 30% criterion.
2. **Cut to the core and ask for less.** Tasks 1 and 2 — the protocol and the
   harness — are €20,000 and *are* the research contribution this entire
   proposal argues for. Tasks 3 and 4 are useful product work, but a reviewer
   could reasonably see them as building your own application rather than
   public infrastructure. A €20,000 ask that is obviously deliverable part-time
   scores better on feasibility **and** on cost-effectiveness, which together
   are 60% of the total.

A smaller funded grant beats a larger rejected one, and NLnet states that a
first grant can be followed by a larger one. Tasks 3 and 4 are exactly what a
second application would be for, with tasks 1 and 2 delivered as evidence that
you ship what you promise.

## Licensing

> All existing code is **MIT** (OSI-approved), stated in the repository's
> `LICENSE` file, in `package.json`, and in the `funding.json` manifest as
> `spdx:MIT`. Every output of this grant — the protocol specification, the test
> harness, the public checker and the self-hostable edition — is released under
> the same terms or another OSI-approved licence, with the documentation under
> a free licence.
>
> There is no contributor licence agreement and no copyright assignment: I do
> not ask contributors to sign anything. There are no patents, no patent
> applications, and I will not file any on this work. There is no commercial
> exclusivity, no dual-licensing arrangement, and no held-back "enterprise"
> edition — the self-hostable build in task 4 is the same software, published
> under the same licence.
>
> If any grant output would benefit from a standards-track contribution, it
> would be offered royalty-free.

## How this reaches the projects that would use it

*This is the weakest part of most proposals like this one and it sits in
relevance/impact, which is 40% of the score. A method nobody adopts has not
demonstrated anything. Rewrite it in your own words, and only promise what you
will actually do.*

> The protocol and harness are worthless unless projects other than mine run
> them, so adoption is a deliverable rather than an afterthought — task 2 is
> explicitly not complete until an outside project has used it.
>
> **A direct, concrete offer rather than an announcement.** For each candidate
> project I will run the proof against their deployed site myself and send them
> the result — whether it passes or fails — with the harness and what it would
> take to run it in their own CI. That is a few minutes of my time per project
> and it hands them something useful immediately, rather than asking them to
> evaluate a specification. A failing result is the more useful gift of the two.
>
> **Who I would approach first.** Client-side and local-first projects are the
> natural adopters, starting with the ones named in the comparison section
> above, and with NGI Zero portfolio projects that process user data in the
> browser — **[YOU: confirm a handful by name from the NLnet project list
> before submitting. Naming real projects you have actually looked at is far
> more convincing than the category, and a reviewer may well know them.]**
>
> **Where the outputs live.** The specification at a stable public URL, the
> harness on a public package registry with a worked CI example, the checker as
> a public page needing no installation. All indexed and linkable, so a
> developer asking "how do I prove my app does not upload files" can find it
> without knowing my project exists.
>
> **Writing it up.** The three failure modes are publishable in their own right:
> each produces a confidently wrong answer, and each is easy to hit. I would
> write them up for a technical audience, and offer the method to a privacy or
> browser-security venue if it holds up to the independent review in task 5.

## Other funding sources

> None. The project has no revenue, no investors, no institutional support and
> no other grant. Two voluntary donation channels are listed publicly on the
> site — Buy Me a Coffee and a UPI address — and **neither has received any
> money to date; total income from the project is zero.** A GitHub Sponsors
> application was not approved.
>
> Four applications are outstanding, all submitted in September 2026 and none
> yet decided: FUTO (microgrant), FOSS United (India), Emergent Ventures India,
> and FLOSS/fund. I will report any outcome to NLnet, and this budget would be
> reduced by any overlapping amount rather than duplicated.

---

## Before you submit

- ~~**Make the GHCR package public.**~~ **Done** — `ghcr.io/mgbuilderos/opentools`
  is public, anonymous pull verified 2026-09-19. A reviewer can now run it.
- **Link the evidence directly** — `docs/EGRESS_PROOF.md`,
  `e2e/egress-proof.spec.ts` and `playwright.production.config.ts`. The
  strongest thing about this application is that the central claim can be
  checked in about two minutes, which is unusual in a grant proposal. Make that
  easy. Give the reviewer the exact command and say what it does:

  ```
  npx playwright test --config playwright.production.config.ts
  ```

  It runs our proof against our live site. Point out that they can retarget it
  at any origin with `EGRESS_BASE_URL=` — including a competitor's — because a
  method that only works on its author's site is not a method.

- **Reconcile the tool count before you submit.** The repository currently says
  540 in this draft, 550 in the launch kit, and a catalogue figure of 1,000
  elsewhere. Measured on 20 September 2026 the true figures are **646
  operations across 44 public tool pages**. Pick one description, make it true
  everywhere, and never round it upward — a reviewer who counts and finds a
  discrepancy will discount everything else you claim, and this is a proposal
  whose entire argument is that claims should be checkable.
- **Decide the scope first.** See "Scope warning" under Timeline and capacity.
  Everything else in this file is downstream of whether you ask for €45,000 or
  €20,000, including the abstract.
- **Cut the budget rather than pad it.** Cost-effectiveness is 30% of the score.
  A smaller funded grant beats a larger rejected one, and NLnet says a first
  grant can be followed by a larger one.
- **Do not overclaim.** Say what the evidence covers (two engines, one build)
  and what it does not (every browser, every device, the absence of bugs). The
  reviewers are technical and the limits section is what makes the rest
  credible.
- **Write the [YOU] answers yourself.** They are about you, and they read as
  hollow when they are not. There are three: your background, your available
  hours per week, and the projects you will approach by name.
- **Name real projects in the adoption section.** Open NLnet's own project list
  and pick a handful you have actually looked at. A reviewer may well know
  them, and "client-side projects generally" is the kind of answer that reads
  as never having checked.
- **Keep the two budget tables in step.** The task table is what NLnet agrees
  to and pays against; the summary below it must show the same five amounts. If
  you change one, change both.
