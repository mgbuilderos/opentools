# OTF (Open Technology Fund) — application draft

**Drafted 2026-09-19.** OTF was identified as a target in the capsule (§5.4) and
never drafted. This is that draft.

> **Read the fit assessment before the draft.** OTF is a narrower fit than FUTO,
> and the way to waste this application is to send a general "550 free tools"
> pitch. The version below deliberately leads with one thing and lets the other
> 549 tools be context.

> ## ✅ UNBLOCKED 2026-09-19 — the blocker below is resolved
>
> **In plain words: the tool is no longer lying, so the application can go.**
> It was fixed two days before anyone noticed, and the ticket was simply never
> closed. No new work was needed here.
>
> **Verified independently by this lane on 2026-09-19**, against the code and
> against the JavaScript the live site actually ships — not by trusting another
> lane's log:
>
> | Check | Result |
> |---|---|
> | `d5ba913` *"stop the metadata scrubber claiming work it did not do (C5)"* | exists, dated 2026-09-17 |
> | Is it an ancestor of `origin/main`? | **yes** |
> | Is it an ancestor of `00c9e25`, the deployed commit? | **yes** — so it has been live since the 2026-09-18 deploy |
> | `detectImageFormat` in the **live** bundle (`app-shell-C4hZPgqm.js`, fetched from getopentools.com) | `cleanable:!0` for **JPEG and PNG only**; `cleanable:!1` for **GIF, WebP, TIFF, AVIF, HEIC/HEIF** and for any unrecognised format |
> | The consuming loop, live | `if(!n.cleanable){s.push(…);continue}` — a refused file produces **no output file at all** |
> | *"Returning the file unchanged while calling it clean would be worse than refusing it."* | present in the **live** bundle |
> | *"… no file was produced for them"* | present in the **live** bundle |
> | The false claim *"All EXIF, GPS locations, camera serials… completely stripped"* | **absent from every live chunk** — 0 occurrences |
> | `npx vitest run lib/tools/file-workbench.test.ts` | **PASS (24) FAIL (0)**, re-run today |
>
> **Read how it was fixed, because it changes what this application should ask
> for.** The claim was narrowed to match the capability; the capability was not
> widened to match the claim. The scrubber cleans **JPEG and PNG**, and refuses
> everything else **by name, producing no file**. That is honest, and it is
> fail-closed — an unrecognised format is refused rather than passed through.
>
> **But HEIC is the default camera format on every recent iPhone.** An activist
> stripping location from a protest photo shot on an iPhone gets a clear refusal
> today, not a clean file and not a silent failure. That gap is real, it is the
> gap that matters most to OTF's own users, and this draft now states it plainly
> and asks for the work rather than papering over it. See *"What the money would
> be for"*, item 1.
>
> <details>
> <summary>The original blocker, kept for the record — do not delete</summary>
>
> > ~~## 🚫 BLOCKED — do not send this yet~~
> >
> > ~~The strongest paragraph in this application is about **metadata removal**,
> > and the tool that does it is currently **making a false claim**. Capsule
> > §9.4 / board queue C5, confirmed 2026-09-17: for **WebP, HEIC, AVIF, TIFF
> > and GIF** the EXIF scrubber returns the bytes **unchanged** while telling the
> > user *"All EXIF, GPS locations, camera serials… completely stripped"*. For
> > JPEG it also drops APP2 ICC and APP14 Adobe and the Orientation tag, and
> > keeps data after EOI — where motion-photo trailers can still carry
> > location.~~
> >
> > ~~**An application to a funder whose applicants include journalists and human
> > rights defenders must not rest on a tool that silently fails to strip
> > location data from a phone photo.**~~
> >
> > ~~**Unblock condition:** C5 fixed and covered by a test, for every format the
> > UI claims.~~
>
> **Why the condition is met.** "Every format the UI claims" is now exactly
> JPEG and PNG — the UI stopped claiming the other five. Both are handled and
> both are tested. The condition was written to stop a false claim reaching a
> funder, and there is no longer a false claim to reach one.
>
> </details>

---

## The honest fit assessment

Write this down before writing the application, because it decides the framing.

**What OTF funds:** internet freedom — circumventing censorship and surveillance
for people in repressive environments. Its beneficiaries are journalists,
activists, human rights defenders and citizens of closed societies. Past work in
its orbit includes Tor, Signal, Let's Encrypt, Tails, Qubes and the
Guardian Project.

**Where this project genuinely fits:**

1. **Documents that cannot be uploaded.** A journalist redacting a leaked
   document, an activist stripping location from a protest photo, a lawyer
   masking an ID — for all three, "upload it to a free website" is the failure
   mode, and it is what people actually do because the convenient tools are all
   server-side. A tool that cannot upload, enforced by the browser, removes that
   failure mode rather than asking people to trust a policy.
2. **The verification method, which is the strongest argument and the most
   OTF-shaped one.** The claim "your file never leaves your device" is made by
   nearly every such tool and is almost never *demonstrated*. Here it is:
   the page is served `connect-src 'none'`, which the browser itself enforces,
   and `e2e/egress-proof.spec.ts` attempts five exfiltration vectors during a
   real file operation and asserts zero off-origin bytes, in Chromium and
   WebKit, every release. **That protocol is not specific to this project and
   could be adopted by any of them.** OTF's interest in shared infrastructure is
   the door this walks through — not the tool count.
3. **No account, no telemetry, no third-party script**, and a container that
   runs under `--network none`, so the same tools work inside a newsroom's own
   network with no external dependency at all.

**Where it does not fit, and do not pretend otherwise:**

- **Most of the 550 tools are irrelevant to OTF.** A BMI calculator and a loan
  EMI calculator do not advance internet freedom. Say the project is a general
  utility suite and that a specific subset serves this purpose; do not imply the
  whole thing is a human-rights tool.
- **There is no demonstrated at-risk user base.** Traffic is roughly 27 real
  visitors a day (measured 2026-09-18, zone-only, 821 unique in 30 days). There
  are no partner organisations, no field deployments, and no evidence anyone at
  risk is using it. **This is the weakest point of the application and OTF will
  see it immediately.** Better to name it than to be caught inflating it.
- **This is not a censorship-circumvention tool.** It does not help anyone reach
  a blocked site. If OTF's current call is circumvention-focused, this is the
  wrong call to answer and the honest move is to wait for a better-fitting one.

**Conclusion:** apply, lead with the verification protocol as reusable
infrastructure, be explicit that the at-risk use is a subset, and never claim a
user base that does not exist.

---

## Before writing anything — three things to check on OTF's own site

**Do not take these from this file.** OTF's fund names, open/closed status,
ceilings and application form change, and a draft written against a closed call
is wasted work. Check `opentech.fund` and confirm:

1. **Which fund is open right now.** OTF has historically run an *Internet
   Freedom Fund* (the main open call), a *Core Infrastructure Fund* (for things
   other projects depend on), a *Rapid Response Fund* (emergencies only — not
   this), and fellowships. **The Core Infrastructure Fund is the better fit for
   the verification-protocol framing**, if it is open.
2. **The current ceiling and expected size.** Ask for what the work costs, not
   the ceiling — see the budget note below.
3. **Whether a concept note comes first.** OTF has typically wanted a short
   concept note before a full proposal. If so, only the Abstract and Problem
   sections below are needed initially, which is much less work.

**Eligibility:** OTF funds individuals as well as organisations, and is not
restricted to US applicants — an Indian national applying as an individual is
eligible. This is the same question the owner asked about NLnet, and the answer
is different here: **NLnet prioritises EU / Horizon-associated inhabitants and
needs "a clear European dimension" from everyone else (see
`docs/NLNET_APPLICATION_DRAFT.md`, and do not restate that it has no geographic
restriction — that error has been made once already). OTF and FUTO do not have
that constraint.** That is exactly why both come before NLnet.

---

## Project name

OpenTools

## Website

https://getopentools.com · source: https://github.com/mgbuilderos/opentools (MIT)

---

## Abstract

*(Keep this under OTF's stated limit. This is ~150 words.)*

> Tools that handle sensitive documents — redaction, metadata removal, ID
> masking, format conversion — are almost all server-side. Using one means
> uploading the document. People at risk do it anyway, because the convenient
> option is the uploading one.
>
> OpenTools is a suite of browser tools that cannot upload a file. Processing
> happens in the page; the page is served `connect-src 'none'`, so the browser
> itself refuses to open a network connection. The claim is not a privacy policy
> — it is enforced by the user's own browser and verified on every release by a
> test that attempts five exfiltration vectors during a real file operation and
> asserts zero off-origin bytes.
>
> We are asking for support to harden the document-handling subset used by
> people who cannot upload, and to publish the verification protocol as
> something any project making this claim can adopt and prove.

---

## The problem, as OTF would frame it

> "Never upload a sensitive document to a website" is standard security advice
> and it is routinely ignored — not through carelessness, but because the
> practical tools are all on the other side of an upload. Someone with a
> deadline and a 40 MB PDF to redact uses the site that works.
>
> The deeper problem is that this cannot be checked. Every one of those sites
> says files are deleted after an hour and never shared. Nothing in the browser
> tests that, so the user is choosing between claims, and a claim is exactly
> what an adversary with access to the server can make freely.
>
> So there are two gaps: tools that genuinely do not need the network, and a way
> for a non-expert to tell which ones those are.

## What exists today

*Every figure here is measured; do not soften or inflate them.*

| | |
|---|---|
| Tools, working, in the browser | **550** |
| Licence | MIT, public repository |
| Network policy | `connect-src 'none'` on tool routes, browser-enforced |
| Verification | `e2e/egress-proof.spec.ts` — five exfiltration vectors, Chromium + WebKit, every release |
| Self-hosting | published container, verified to run under `--network none` |
| Accounts / telemetry / third-party scripts | none |
| Real traffic | ~27 unique visitors a day |
| Repository stars | 1 |
| Team | one person, not an engineer by background |
| Funding to date | none |

**The last four rows belong in the application.** OTF reviewers read a lot of
proposals; the ones that stand out are usually the ones that did not pretend.

## What the money would be for

Write this as work, not as salary, and ask for what it costs.

1. **Metadata removal for the formats phones actually produce.** This is the
   specific ask, and it is worth stating exactly rather than generally.

   Today the scrubber cleans **JPEG and PNG**. It refuses **HEIC, AVIF, WebP,
   TIFF and GIF** by name and produces no file for them, because the tool edits
   those containers directly and has no decoder for the rest. That refusal is
   deliberate — it replaced a version that returned those files unchanged while
   calling them clean (fixed at `d5ba913`, 2026-09-17, verified live).

   **The gap that matters to your applicants: HEIC is the default camera format
   on every recent iPhone.** Someone stripping location from a photo they just
   took gets an honest refusal, not a clean file. Closing that — HEIC, AVIF and
   WebP, each with a test that proves the GPS bytes are gone rather than
   asserting it — is the single most useful thing funding could buy here, and
   it is work, not salary.

   Alongside it: redaction that removes rather than covers, and ID masking,
   audited format by format on the same standard of proof.

   *(Worth saying out loud in the application: the false claim above was found
   and fixed by this project, on itself, before any funder asked. "We audited
   our own tool, found it overstating what it did, and narrowed the claim rather
   than the truth" is a stronger thing to be able to say than "our tools are
   perfect" — and it is the reason the refusal path exists at all.)*
2. **Publish the verification protocol so others can use it.** Today it is one
   test file in one repository. As a documented method plus a runnable harness,
   any project claiming local-only processing could demonstrate it instead of
   asserting it. This is the part that outlives this project.
3. **Infrastructure.** The site runs on a free tier whose page-cache write
   allowance a single day of development exhausts, after which every page is
   served uncached and the worker returns 503s under crawl load. Removing that
   costs about $5/month.

**Budget note:** item 3 is trivial and item 2 is the one with value beyond this
project. If OTF's process asks for a number, base it on item 1 — a per-format
audit with tests is real work and can be estimated honestly in weeks. Do not
pad it to the ceiling; OTF explicitly weighs cost-effectiveness, and a small
honest ask from a solo applicant is a strength, not a weakness.

## Comparison with existing efforts

> Tools that strip metadata or redact documents locally do exist — desktop
> utilities and command-line tools do it well, and `mat2` is the reference for
> metadata removal. They require installing software and, usually, a terminal.
> The person who most needs them frequently cannot install anything on the
> machine they are using.
>
> Browser-based tools remove that barrier but almost universally re-introduce
> the upload. The gap this fills is narrow and specific: **no install, and
> provably no upload.**
>
> The novel part is not the tools. It is that the no-upload claim is made
> falsifiable — served by a browser-enforced policy and checked by a test anyone
> can run against a release.

## **[YOU]** — who you are and why you built this

> One or two honest sentences. Not a company profile. What is worth saying: that
> you are one person, that you are not from an engineering background, that you
> built it because you wanted tools that did not ask you to upload your own
> documents. OTF funds individuals and does not expect an institution.
>
> **Do not claim a background you do not have.** If OTF asks a technical
> question later, answer it or say you will check — the one fatal move is
> guessing.

## **[YOU]** — name and a contact address you check

> A reply may take months, and it will go to this address.

---

## Before sending

- [x] ~~**C5 is fixed and tested.** The blocker at the top of this file.~~
      **DONE — verified 2026-09-19** against the code, against the live
      JavaScript bundle, and by re-running the suite (24 pass, 0 fail). See the
      unblock table at the top of this file. **This no longer blocks sending.**
- [ ] Confirm on `opentech.fund` which fund is open and whether a concept note
      comes first.
- [ ] Re-measure the traffic figure and update it. It is dated 2026-09-18; a
      stale number in a funding application is the kind of small inaccuracy that
      makes a reviewer doubt the large ones.
- [ ] Check every link resolves — the same pre-send check that
      `docs/FUTO_APPLICATION_DRAFT.md` documents, for the same reason.
- [ ] Re-read both **[YOU]** sections. Generic answers there undo the rest.

## Order of applications

1. **FUTO** — ready now, needs only the two `[YOU]` sections.
   `docs/FUTO_APPLICATION_DRAFT.md`. Send to `grantapps@futo.org`.
2. **OTF** — this file. **No longer blocked** (C5 verified fixed and live,
   2026-09-19). Remaining before send: confirm on `opentech.fund` which fund is
   open, and the two `[YOU]` sections.
3. **NLnet** — drafted, but see the geography warning at the top of
   `docs/NLNET_APPLICATION_DRAFT.md`. Weakest odds of the three for a non-EU
   individual; apply last, not first.
