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

A test that works: read a paragraph aloud. If it doesn't sound like you
explaining it to a friend, rewrite it until it does. Shorter and plainer beats
polished — the reviewers are engineers, and the strongest thing here is that
your central claim can be checked in two minutes, which almost no proposal can
offer.

**Status, 20 September 2026.** Evidence is complete and current: the egress
proof passed 6/6 against the deployed site today. What remains is yours — the
words, the budget decision, and the `[FILL]` marker.

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

## Budget

*Indicative; adjust to what the work honestly costs and how much time you can
commit. Reviewers weigh cost-effectiveness at 30% and prefer a small, credible
ask over a padded one.*

| Task | € |
| :--- | ---: |
| Verification protocol: specification, evidence levels, documented traps, published open access | 8,000 |
| Reusable cross-engine test harness, packaged and documented for third-party adoption | 12,000 |
| Public checker for evaluating any URL, with plain-language output | 9,000 |
| Hardened self-hostable edition: TLS, authentication, reproducible build | 11,000 |
| Independent security review of the protocol and harness | 5,000 |
| **Total** | **45,000** |

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
- **Cut the budget rather than pad it.** Cost-effectiveness is 30% of the score.
- **Do not overclaim.** Say what the evidence covers (two engines, one build)
  and what it does not (every browser, every device, the absence of bugs). The
  reviewers are technical and the limits section is what makes the rest
  credible.
- **Write the [YOU] answers yourself.** They are about you, and they read as
  hollow when they are not.
