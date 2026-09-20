# Deep research round 2: what professionals pay for, across twenty trades

2026-09-20. Four parallel research sweeps — healthcare and education, the built
environment, media and localisation, finance and legal — plus my own work on
what the mass-market file sites gate. Round 1 is `PROFESSIONAL_TOOL_RESEARCH.md`
and produced `/pdf/to-excel`, already commissioned.

## The method that worked, and is worth reusing

**Read the vendor's paywall, not the vendor's marketing.** What a company
refuses to put in its cheap tier is its own pricing committee's answer, after
years of data, to "what will people actually pay for". It is the closest thing
to ground truth available without running our own experiments.

It gave the same answer four times, from four unrelated industries:

| Vendor | Market | Entry tier | What is deliberately held back |
|---|---|---|---|
| Smallpdf | consumer/SMB | 2 tasks/day, 5 MB | **batch**, file size, task count |
| iLovePDF | consumer/SMB | 25 MB cap | **batch**, file size |
| Bluebeam Revu | architecture/QS | $260/yr | measurement, compare/overlay, **batch stamping** |
| Adobe Acrobat | everyone | Standard | **OCR**, **redaction**, compare |
| EZTitles | subtitling | €80/mo | **format support**, tier by tier |

Batch appears on three of five lists, at prices from $4/month to $440/year.
That is the subject of `WHY_THEIR_LIMITS_ARE_NOT_OURS.md` and it is the single
clearest product signal in all of this research.

## The second pattern: price has almost nothing to do with difficulty

The most striking numbers found were all for computationally trivial work.

- **EDI Power Reader: $3,175–$11,550 a year** to render a plain-text healthcare
  billing file as a readable grid. No images, no binary parsing, no model —
  string splitting. The widest price-to-difficulty gap found anywhere.
- **ZipGrade $6.99/yr vs Remark Office OMR $1,195** for the same bubble-sheet
  arithmetic. A 170× spread on identical maths.
- **Title-block extraction from drawings** is sold as a trained-AI service.
  A plotted drawing carries a text layer, so it is a bounding-box filter over
  positioned text — arithmetic, not machine learning.
- **Caption format conversion at $0.10 a job and €0.50 a file** — real prices,
  openly charged, for parsing a documented binary format.

The money is in trust, distribution and procurement, not in the computation.
That is good news for us and bad news for anyone hoping the moat is technical.

## The third pattern, and the uncomfortable one

**In several of the most obvious niches, someone has already shipped the
privacy pitch.** Not a reason to stop, but a reason to stop assuming
"zero-upload" alone is a differentiator:

- **DICOM de-identification** — a browser tool already markets "never leaves
  your browser"; its free tier caps at 5 files a session.
- **SPSS/Stata conversion** — `statfile.tools` and `savtocsv` already do it
  client-side, free.
- **CAD takeoff** — SmartCAD markets browser-local measurement on exactly the
  "parsed on your device, never uploaded" line.
- **EPUB validation** — `epubcheck-ts` already runs client-side at ~2 MB with
  ~96% agreement with the official Java checker, with a free public demo.

Where the pitch is taken, the wedge has to be something else: batch, format
coverage, honesty about limits, or simply being one site rather than four.

## The candidates, rated

Scored as in round 1. **"Free already"** is the column that kills otherwise
attractive rows, and it is the one I added after this round.

| # | Tool | Who pays, and how much | Feasible | Head start | Free already? | **Score** |
|---|---|---|---|---|---|---|
| 1 | **Broadcast caption conversion** (EBU-STL, SCC, PAC ↔ SRT/VTT) | $0.10/job, €0.50/file; EZTitles gates formats by tier €80–100/mo | Documented binary; fixed 128-byte blocks | Subtitle workbench parses 6 formats already | No | **24** |
| 2 | **EDI 835/837 reader** (healthcare claims/remittance → table + CSV) | **$3,175–$11,550/yr**, EDI Power Reader | Pure delimited text | Our CSV/XLSX writers | Only a 25 KB-capped free tier | **23** |
| 3 | **Loudness / delivery check** (LUFS, true peak, noise floor vs Spotify/Apple/EBU/ACX) | Auphonic $11–89/mo; NUGEN $382; ACX rejects on noise floor | BS.1770 K-weighting + gating | **`lib/tools/audio/` decode + PCM already built** | No | **23** |
| 4 | **Drawing register from title blocks** (200-page set → CSV + per-sheet split) | EverMap $99; Bluebeam $330/yr; Apryse sells it as AI | Bounding-box filter over positioned text | **`pdf-text.ts` already returns x/y/width** | No | **23** |
| 5 | **True PDF redaction** | Acrobat Pro only; Redactable $7.50/doc–$1,299/mo; CaseGuard $99–329/mo | Rasterise-and-flatten is honest and easy | `lib/tools/redaction/detectors.ts` exists | No | **23** |
| 5a | **Document compare / redline** (DOCX↔DOCX, PDF↔PDF) | Draftable **$129–261/user/yr**; Diffchecker $15–20/user/mo; Litera $195–1,000+/user/yr | Text diff is standard; Word-native tracked changes is the hard part | pdfjs text + our OOXML work | No | **24** |
| 5b | **Excel workbook audit / CAAT** (hardcoded constants in formulas, broken formula runs, external links, hidden sheets; Benford, duplicates, gaps, round numbers, weekend postings) | PerfectXL **$249–2,000/yr**; ActiveData $149–299; TopCAATs ~$300; Synkronizer €89–199 | **The most computationally trivial job found** — xlsx is a ZIP of XML, formulas are plain text | **Full Excel read/write engine already built** | No | **24** |
| 5c | **NACHA ACH file** (payroll CSV → bank file, and validate one before it goes) | achfilegenerator **$19/mo or $149/yr**; ezACH $199; Treasury Software $39.95–149.95/mo; ACH Pro paywalls **exactly the CSV-import half** | Fixed 94-char records, blocking, entry hash, control totals — fully deterministic | Our CSV engine | No | **23** |
| 5d | **Form 8949 / Schedule D** from broker CSV, with wash-sale adjustments | TradeLog **$219–459/yr**; Form8949.com **$18 per broker file** | Arithmetic + PDF form fill, both of which we do. Wash-sale correctness for options/short sales is the risk | pdf-lib, CSV | No | **22** |
| 5e | **Burst a PDF by rule and auto-name** (bookmark, blank page, regex, text change) | A-PDF Payroll Split **$79**; EverMap AutoSplit $99–149 (rules are Pro-only); PDF-eXPLODE $595 | pdfjs text + pdf-lib page copy | `pdf-text.ts` | No | **22** |
| 5f | **X12 834 enrolment** alongside 835/837 | HIPAAsuite **$2,000–2,500** one-time per format | Same parser as row 2 | — | No | folds into **2** |
| 5g | **Table of authorities** from a DOCX brief | Litera Best Authority **$65 per document** | Citation regex is tractable; writing TA field codes back into OOXML is the work | DOCX read/write | No | **20** |
| 6 | **Bilingual QA** (XLIFF/SDLXLIFF/TMX: untranslated, number/tag mismatch) | ApSIC Xbench **€99/yr**, the de-facto standard | XML + strings | XML parsing from OOXML work | No | **22** |
| 7 | **Question bank → QTI / Moodle XML** | Respondus $79–149 single, **$1,695–2,945/yr** campus | DOCX is a ZIP of XML | **We already read and write DOCX** | No | **22** |
| 8 | **PDF print preflight** (bleed, trim, colour space, fonts, effective PPI) | PitStop **$40/mo**; FlightCheck $249/yr; ink coverage alone $99/yr | Object model only — no rasteriser | pdf-lib + pdfjs | No | **21** |
| 9 | **PDF measurement / takeoff** | Bluebeam $330/yr; PlanSwift **$1,749–2,000/yr**; STACK $249/mo | Canvas overlay + calibration | — | **SmartCAD does it** | **20** |
| 10 | **Split scanned batch by barcode** | A-PDF $49–99 | ZXing is well under 1 MB | pdf-lib page copy | No | **20** |
| 11 | **OMR bubble-sheet grading** | Remark $1,195; GradeCam $150/yr; ZipGrade $6.99/yr | Threshold + registration marks | — | No, but 170× price spread signals trust is the product | **19** |
| 12 | **EPUB validation + EU Accessibility Act check** | FlightDeck $15/mo (**$3/title**); EAA in force since **28 Jun 2025**, backlist by 2030 | Proven client-side | — | **Yes — free demo exists** | **18** |
| 13 | **DICOM de-identification** | Sante $480/user, $2,500 site | Tag rewriting fine; burned-in pixel text is not | — | **Yes, with a 5-file cap** | **17** |
| 14 | **SPSS/Stata/SAS conversion** | Stat/Transfer $399; SPSS $109/mo | Reading is mature | — | **Yes, free, twice** | **15** |

## Do not build these, and why — so nobody re-proposes them

Recording the dead ends is worth as much as the candidates.

- **DWG** — binary, proprietary, and the only browser decoder is GPL-licensed
  WASM, which is a licensing problem for us. Ship DXF; tell people to export.
- **Psychometric scoring** (BASC, Beck, MMPI) — clinicians pay per report, but
  the instruments and their norm tables are copyrighted. Cannot be
  reimplemented. The free ones (PHQ-9, GAD-7) nobody pays for.
- **PDF/A conversion** — needs font embedding, ICC injection and a real
  preflight engine. Validation maybe; conversion no.
- **Total ink coverage (TAC)** for print — needs a colour-managed CMYK
  rasteriser. Sold standalone at $99/yr precisely because it is the hard one.
- **ICC/CMYK colour conversion** — fails on payment, not feasibility. Already
  commoditised free in several browser tools; labs give profiles away.
- **PDF accessibility remediation** — real budget (€350–$3,000/seat, ADA Title
  II deadline April 2026) but lecture slides are not confidential, so our
  privacy advantage buys nothing.
- **Raster→vector tracing**, **speech-to-text**, **machine translation** — all
  need the large models we have ruled out.
- **BWF/iXML audio metadata** — the two standard tools are free.
- **Structural analysis formats** (.std, .s2k) — undocumented and not evergreen.
- **Statutory payroll and tax filing formats** — the richest-looking vein, and
  it dies on free government tooling. SSA gives away AccuWage for EFW2, the IRS
  IRIS portal takes free CSV, Texas ships QuickFile, HMRC gives away Basic PAYE
  Tools. Where a statutory format *is* paid (UK iXBRL, £25–60 a filing) the
  file is destined to be public, so our privacy advantage buys nothing.
- **PDF/A validation** — free. veraPDF is the PDF Association's own reference
  implementation. The money is in *fixing*, which needs the engine we ruled out.
- **Digital signature verification** — **structurally impossible for us.**
  Checking revocation (OCSP/CRL) and EU trust lists requires network calls, and
  `connect-src 'none'` forbids exactly that. This is the first candidate ruled
  out by our own promise rather than by effort, and it is worth remembering as
  a category: anything needing a live authority is not ours to build.
- **ACORD AL3 insurance files** — trivially parseable fixed-length records,
  blocked by licensing: the element dictionary ships only to members
  ($2,500 pilot fee).

## The finding I would act on above all others

**Our exact architecture is already being sold, profitably, in at least eight
niches — and the sellers lead with our pitch.**

- `achfilegenerator.com` — **$19/mo**, and its headline is that account numbers
  stay in your browser.
- `SafeRedact` — **$99/yr**, client-side redaction.
- `edifileconverter.com` — **$19.99/mo** for a client-side X12 viewer.
- `PrepFile` — **$19** for 1,000 in-browser legal PDF operations.
- Plus the four from earlier: DICOM, SPSS/Stata, CAD takeoff, EPUB.

Read pessimistically, the niches are occupied. Read correctly, this is the best
news in the whole document: it proves **demand, price tolerance and technical
feasibility simultaneously**, using our exact architecture, with no theorising.
People are paying $19 a month for one tool that runs in their own browser.

Which settles the strategy. We do not win these lanes by being private — they
are already private. **We win by being free, and by being one site instead of
eight.** A bookkeeper should not need four subscriptions and four logins for
four file jobs that all run on their own laptop.

And the recurring wall across every rejected candidate in every sweep was the
same one: **OCR**. Scanned payslips, loss runs, scanned claim files, photographed
statements. Which is why the tiered answer in
`ANTIGRAVITY_PIPELINE_2_2026-09-20.md` Part 3 matters beyond bank statements —
it is the gate on a whole category, not one tool.

## One correction from checking our own code

The research proposed a subtitle spec-compliance checker as a top candidate.
**We already have most of it**: `subtitle-workbench.ts` ships a
`subtitle-check` operation reporting overlaps, out-of-order cues, over-long
lines and text that passes too fast, and it names the limits it used.

What is genuinely missing is narrower: **named spec profiles** (Netflix, EBU,
BBC each publish different exact numbers), grapheme-aware counting so CJK,
Arabic and Thai are not measured with Latin assumptions, and the binary
broadcast formats. That is why row 1 above is the *conversion*, not the check —
the check is largely built, and the formats sold at $0.10 a job are not.

This is the argument for always reading our own source before accepting a
research finding.
