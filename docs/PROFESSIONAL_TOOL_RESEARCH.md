# What professionals pay for that we could give away

Research for the next Antigravity pipeline, 2026-09-20.

The question was not "what software do professionals use" — that answer is Figma,
Adobe, Lightroom, and we are not going to build those and should not try. The
question is narrower and much more useful:

> **What small, painful, file-shaped job do professionals pay a subscription for,
> that is pure local computation, on a file they should never have uploaded in
> the first place?**

That last clause is the whole business. Our advantage is not that we are free —
plenty of things are free. It is that **the file never leaves the tab**, and
there is a class of professional work where uploading the file is the actual
problem. A bookkeeper uploading a client's bank statements to a random
converter, a solicitor uploading a client's contract to a free PDF site, a
recruiter uploading a candidate's CV: each of those is a confidentiality
incident that happens thousands of times a day because the free tool was
convenient.

The research below found that this is not a theory. Law firms are being told
in professional publications that client-side tools are "no longer optional",
and a small industry of "zero upload, for lawyers" competitors already exists.
The demand is proven. Nobody has done it broadly, for free, across professions.

## What each profession actually pays

### Bookkeepers and accountants — the strongest finding

Converting **PDF bank statements into Excel or CSV** is a whole paid industry.
Entry plans run **$25–$49 a month**; once you need batch upload and a few
hundred pages it is **$149–$159 a month**. One vendor sells credits at **$19
for 400 pages**. A year of one client's business account is comfortably 100
pages, so a small practice burns through plans quickly.

This is the highest-value gap we have found, on every axis at once: people
already pay real money, the document is about as sensitive as a document gets,
the format is stable, and it is arithmetic on text we can already extract.

### Lawyers — the positioning is already validated by competitors

**Redaction is the paid upgrade.** Acrobat *Standard* has no redaction feature
at all; you must be on **Acrobat Pro at ~$23–24 a month** to get it, and the
research repeatedly names redaction and OCR as the two reasons people upgrade.
A startup category has grown around it.

Crucially, the confidentiality argument is being made *for* us in legal
publications: many engagement letters and professional conduct rules forbid
transmitting client documents to third-party processors without consent, so a
free upload-based PDF tool can be a bar-rules problem, not just a bad habit.

We already serve this profession partially — Bates numbering, signing, metadata
— so it is a lane we are in rather than one we would be entering.

### Recruiters and HR — a specific named job

**Blind-hiring CV anonymisation**: strip name, photo, address, age and contact
details before a hiring manager sees the CV, to reduce bias, with GDPR as a
second driver. Several vendors sell exactly this per seat. It is the same
engine as redaction with a different preset and a different landing page.

### Designers and marketers — mostly covered now

Phase 4 and 5 covered the designer's SVG and colour work and the marketer's
list hygiene and file-to-HTML. What remains here is batch image work
(watermark, resize, rename across a folder), which photographers and estate
agents currently reach for Lightroom (**$9.99/mo**), Capture One (**$24/mo**)
or dedicated batch tools to do.

Lower privacy stakes than the categories above — a property photo is not a bank
statement — so the moat is thinner even though the job is real.

## The rating

Scored 1–5 on five axes. "Head start" matters more than it looks: it is the
difference between a week and a day, and we are not spending money.

| Candidate | Pays today | Privacy edge | Evergreen | Can we build it honestly | Head start | **Total** |
|---|---|---|---|---|---|---|
| **Bank statement / PDF table → Excel** | 5 | 5 | 5 | 4 | 5 | **24** |
| **PDF compare (contract diff)** | 4 | 4 | 5 | 5 | 5 | **23** |
| **True PDF redaction** | 5 | 5 | 5 | 4 | 4 | **23** |
| **CV anonymiser (blind hiring)** | 4 | 5 | 4 | 4 | 5 | **22** |
| **Batch image watermark + resize** | 3 | 3 | 4 | 5 | 5 | **20** |
| **OCR (scanned → searchable text)** | 5 | 5 | 5 | 2 | 1 | **18** |

### Why OCR scores badly despite being the most valuable

It is the single most-wanted thing on this list and I am recommending against
it *for now*, on one axis only: it needs Tesseract or equivalent, which is
multiple megabytes of WebAssembly plus per-language training data, downloaded
by every visitor. That is the same objection that ruled out ffmpeg.wasm, and it
is a real decision about page weight and hosting, not a coding task.

It is worth revisiting deliberately. It should not be slipped into a pipeline.

### The honest caveat on the number-one pick

Bank statement extraction is where the paid tools earn their money, because
every bank lays its statement out differently. **We should not claim 99%
accuracy**, and we should not pretend to handle scanned statements without OCR.

The honest product — and still a very good one — is: extract the table from a
PDF that has a text layer, **show the user the parsed rows and let them fix the
column mapping before exporting**, and refuse a scanned statement by name
rather than returning an empty sheet. That is the same discipline `/pdf/to-word`
already follows, and it is why that tool is trustworthy.

## What this implies for the pipeline

Three of the top four share one engine: **find sensitive text in a PDF, and
either remove it or restructure it.** Redaction, the CV anonymiser and the
statement converter all need positioned text extraction, and two of them need
the detector patterns that already exist in `lib/tools/redaction/detectors.ts`
(email, IP, card with a Luhn check, keys) behind `/developer/advanced`.

So the efficient order is engine-first, exactly as the last pipeline was
structured — build the positioned-text layer once, then three tools on top of
it, then the cheap independent one.

## Sources

- [Bank statement converter pricing, DocuClipper](https://www.docuclipper.com/solutions/bank-statement-converter/)
- [Bank statement to Excel software comparison, 2026](https://bankxlsx.com/blog/best-bank-statement-converter-software)
- [Why lawyers must use offline PDF tools](https://dumpdf.com/blog/why-lawyers-must-use-offline-pdf-tools)
- [PDF tools for lawyers, zero upload](https://vaultpdf.online/for-lawyers.html)
- [Secure document redaction for law firms, client-side](https://www.timetechnologiesllc.com/solutions/operations-excellence/secure-document-redaction-for-law-firms)
- [Adobe Acrobat pricing explained, 2026](https://xodo.com/blog/adobe-acrobat-pricing-explained)
- [Adobe Acrobat Standard vs Pro](https://pdf.wondershare.com/pdf-software-comparison/adobe-acrobat-standard-vs-pro.html)
- [Resume redaction for blind hiring, Redactable](https://www.redactable.com/blog/instantly-redact-resumes-in-one-click-with-ai)
- [CV redaction for fair candidate selection, Affinda](https://www.affinda.com/blog/how-to-redact-a-cv/)
- [Real estate photo editing tools, 2026](https://imagen-ai.com/valuable-tips/real-estate-photo-editing-tools/)
- [Batch watermark and resize tooling](https://www.batchphoto.com/)
