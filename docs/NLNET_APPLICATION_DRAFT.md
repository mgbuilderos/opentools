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
> European-dimension argument — the strongest available one is that the
> verification protocol is aimed at adoption by any project and that GDPR makes
> it directly applicable to European users. Both are arguable; neither is
> strong on its own.
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
> We have built a working implementation: 540 document, image and data
> utilities that run entirely in the browser tab under that policy, MIT
> licensed, with an automated proof that runs on every release. The proof
> actively attempts five exfiltration vectors, then processes a real file and
> asserts zero off-origin bytes, in two browser engines. The same application
> runs from a single container with no network access at all.
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

**[YOU]** — answer honestly and briefly. Your actual history building and
shipping this counts; invented affiliations do not help and are checked.

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
> Building that proof surfaced two failure modes that silently invert results,
> and which we expect any independent implementation to hit:
>
> 1. **A CSP-blocked `navigator.sendBeacon` still returns `true`.** The
>    specification returns true once the beacon is queued; the policy refuses it
>    afterwards. A check asserting on that return value records a leak as a pass.
> 2. **Chromium raises a request event for a request it is about to block**
>    (failure reason `csp`, zero bytes transferred), where WebKit raises
>    nothing. A check asserting "nothing was attempted" therefore fails a
>    correctly-behaving page on one engine and passes it on the other.
>
> A verification method that does not account for both produces confident wrong
> answers in both directions. That is the research content of this work.
>
> **What already exists**, and is verifiable today rather than proposed:
>
> - 540 utilities running client-side under `connect-src 'none'`, MIT licensed.
> - `e2e/egress-proof.spec.ts`: attempts five exfiltration vectors, then runs a
>   real file through a real tool and asserts no off-origin response and zero
>   off-origin bytes — in Chromium and WebKit, on every release. Confirmed
>   non-vacuous by pointing the same detector at a page that does load a
>   cross-origin resource, where it fails as it should.
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

**[YOU]** — currently none beyond voluntary donations, if that remains true at
submission.

---

## Before you submit

- **Make the GHCR package public.** A reviewer who tries `docker run` and gets a
  404 has learned something about the project. Currently private.
- **Link the evidence directly** — `docs/EGRESS_PROOF.md` and
  `e2e/egress-proof.spec.ts`. The strongest thing about this application is
  that the central claim can be checked in about two minutes, which is unusual
  in a grant proposal. Make that easy.
- **Cut the budget rather than pad it.** Cost-effectiveness is 30% of the score.
- **Do not overclaim.** Say what the evidence covers (two engines, one build)
  and what it does not (every browser, every device, the absence of bugs). The
  reviewers are technical and the limits section is what makes the rest
  credible.
- **Write the [YOU] answers yourself.** They are about you, and they read as
  hollow when they are not.
