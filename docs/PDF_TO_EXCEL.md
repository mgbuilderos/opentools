# Bank Statement & PDF Table to Excel Converter (`/pdf/to-excel`)

## 1. Overview & Honest Philosophy

Converting PDF bank statements into structured spreadsheets (`.xlsx` and `.csv`) is traditionally handled by paid subscription services ($25–$159/month) that require uploading sensitive financial documents to remote third-party servers.

`/pdf/to-excel` executes **100% inside local tab memory** with zero network egress. Client bank account numbers, balances, transaction memos, and identity records never touch any external server.

In accordance with OpenTools truth and defensibility rules (G5):

- We do **not** claim an arbitrary accuracy percentage. Every bank statement layout differs.
- The tool prioritizes transparency: it extracts structured 2D tables, renders an editable preview grid, allows users to assign column roles (Date, Description, Debit, Credit, Amount, Balance, Ignore), and runs verifiable integrity checks.
- If a document has no readable digital text (scanned photo or image), it is **refused by name** with clear instructions on obtaining native digital files or direct CSV exports, rather than producing corrupt numbers or hallucinated text (G7).

---

## 1a. Two ways the columns are found, and the page says which

There are two engines, and the tool prefers the first:

**Lattice — the PDF drew the table** (`lib/tools/pdf/rulings.ts`,
`lib/tools/pdf/lattice.ts`, `lib/tools/pdf/pdf-geometry.ts`). Most statements
and nearly every invoice draw their borders, and pdf.js hands those paths over
in the page's operator list. Where they are there, the column boundaries are
**stated rather than guessed**, which is the single largest accuracy
difference between a free extractor and a paid one. `extractTableFromGrids`
returns `null` rather than force a grid onto a page with two stray rules, so
the fallback is a decision and not an accident.

Two things that fail silently and are guarded:

- pdf.js **replaces the raw path with a `Path2D`** the first time a page is
  rendered (`data[0] = makePathFromDrawOPS(path)`). A reader sharing a page
  object with the on-screen preview therefore reads numbers once and an opaque
  object afterwards — which looks exactly like "this PDF has no table".
  Geometry is read through its own `getDocument` task, and non-numeric path
  data is refused rather than trusted.
- A border is as often a thin **filled rectangle** as a stroke. Taken apart as
  a path, a 3pt one yields a rule at each of its edges plus a phantom 3pt row
  between them; `closedRectangle` collapses it to one rule at the centre.

**Spacing — the PDF drew nothing** (`lib/tools/pdf/tables.ts`, below). The
original engine, and still the right answer for a statement laid out with
spaces.

The facts panel states which one ran, in those words. It is a fact about the
document, not a score.

### Correcting it: the page view

`components/pdf-grid-overlay.tsx` draws the page and puts the detected
dividers on top of it. A divider can be dragged, nudged with the arrow keys,
added, or deleted — and the document is re-read against the new boundaries,
**on every page, not just the one on screen**, because a statement keeps one
layout throughout.

This works in both modes, and it matters more in spacing mode: that is where
the boundaries were estimated, and a correction turns an estimate into a
stated fact. `extractTableFromPdfPages` takes a `columnEdges` option for
exactly this.

The dividers are DOM `<button>`s over the canvas rather than painted into it,
so they can be focused and moved without a mouse, carry accessible names, and
be addressed by a browser test by role rather than by pixel.

The editing rules live in `lib/tools/pdf/grid-editing.ts`, away from the
component, because each is quietly wrong written the obvious way: a divider
may not pass its neighbour (the columns would silently reorder), an outer
divider cannot be removed (that discards the data outside the table rather
than merging anything), and a new divider goes into the widest gap.

---

## 1b. Cells to check, never an accuracy score

`lib/tools/pdf/cell-flags.ts`. The paid converters print "97% accurate", which
is not a measurement of your document because they cannot measure your
document. This page prints a count and a reason per cell instead — checkable,
and actionable, because most flags share one root cause a divider will fix.

Flagged: two figures in one cell, an amount that will not parse, a date column
holding something that is not a date, a missing date, and a running balance
that does not continue from the row above.

**Not flagged: day-first versus month-first.** Any date whose day is 12 or
under is ambiguous, so a per-cell flag fires on most of a statement and buries
everything worth seeing. The page asks that question once, document-wide,
which is where a question with a single answer belongs.

---

## 2. Table & Column Detection Algorithm (`lib/tools/pdf/tables.ts`)

The spacing engine — used when the PDF draws no usable grid. Extracting tables
from PDF stream operators without ruling lines or explicit cell tags:

1. **Text Segmentation & Sorting**:
   - Extracts `PdfTextItem` instances with coordinates (`x`, `y`, `width`, `height`, `fontSize`) using `readPdfText`.
   - Normalizes coordinates into points from the top-left origin.
   - Groups text items into horizontal line rows using vertical clustering (`tolerance = 3.5pt`).

2. **Column Boundary Detection**:
   - Clusters `x` positions across the page histogram.
   - Differentiates **right-aligned columns** (numeric amounts and balances align on their right edge `x + width`) from **left-aligned columns** (descriptions and dates align on their left edge `x`).
   - Identifies candidate columns based on column boundary thresholds and page width.

3. **Multi-line Row Continuations**:
   - Transaction descriptions frequently wrap across 2 to 3 lines (e.g. payee name, transaction ID, foreign currency rate, city/terminal code) without repeating the date or amount.
   - A line lacking a date and numeric amount is identified as a continuation line and merged upward into the preceding row's description cell.

4. **Multi-page Header & Footer Suppression**:
   - Multi-page bank statements repeat column headers ("Date", "Description", "Amount", "Balance") and statement footers ("Page X of Y", "Continued on next page") on every page.
   - The engine identifies repeating header lines across successive pages and suppresses them from becoming spurious transaction rows.

---

## 3. Financial Parsing & Integrity Reconciliation (`lib/tools/pdf/statement-values.ts`)

1. **Number Grouping Conventions (Detected per Column)**:
   - **Standard US/UK**: `1,234.56` (comma thousands, dot decimal)
   - **European**: `1.234,56` (dot thousands, comma decimal)
   - **Indian Lakh / Crore**: `1,23,456.78` (two-digit grouping left of thousands)
   - **Negative Indicators**: Parentheses `(1,234.56)`, trailing minus `1,234.56-`, signed prefix `-1,234.56`, or DR/CR accounting markers `1,234.56 DR`.
   - Conventions are resolved _per column_ to prevent inconsistent parsing within the same column.

2. **Date Ambiguity Resolution**:
   - Resolves date formatting (`DD/MM/YYYY` vs `MM/DD/YYYY` vs `YYYY-MM-DD`) by evaluating every date in the column.
   - If any day component > 12, the entire column format is settled.
   - If all days in the column are &le; 12, the column is flagged as ambiguous. The UI alerts the user and provides an interactive toggle so the user decides rather than guessing.

3. **Running Balance Integrity Reconciliation**:
   - When a running balance column exists, it verifies:
     $$\text{Balance}_i \approx \text{Balance}_{i-1} + \text{Amount}_i$$
   - Tests both forward chronological (oldest to newest) and reverse chronological (newest to oldest) orders.
   - Reports exact facts to the user: total checks passed, detected order, or specific mismatched row indexes and delta discrepancies.

---

## 4. Supported vs. Deliberately Refused Layouts

### Supported Layouts

- Single signed amount column (`-` / `+` or negative parentheses).
- Separate Debit and Credit columns.
- Amount column with trailing or separate DR / CR markers.
- European decimal comma banking statements (`1.234,56`).
- Indian Lakh grouping statements (`1,23,456.78`).
- Multi-line descriptions wrapping across rows.
- Multi-page statements with repeated table headers.

### Deliberately Refused Layouts

- **Scanned / Image-Only PDFs**: PDFs with 0 digital text items are refused by name. Optical OCR on degraded scans frequently confuses numbers (e.g. `3` vs `8`, missing decimal commas/points), which silently corrupts accounting books. The user is guided to download the original electronic PDF or direct CSV from their bank.
- **Password-Protected / Encrypted PDFs**: Must be decrypted before conversion.

---

## 5. Verification & Golden File Suite

1. **Layout Fixtures**:
   - Hand-crafted deterministic PDF fixtures generated using `pdf-lib` in `lib/tools/pdf/__fixtures__/`:
     1. `statement-signed-amount.pdf`
     2. `statement-debit-credit.pdf`
     3. `statement-drcr-marker.pdf`
     4. `statement-european.pdf`
     5. `statement-indian-lakh.pdf`
     6. `statement-multiline.pdf`
     7. `statement-multipage.pdf`
     8. `statement-scanned.pdf`
2. **Frozen Golden Comparison (G2)**:
   - Extracted CSV for `statement-signed-amount.pdf` was independently verified and frozen in `lib/tools/pdf/__fixtures__/golden-statement-chase.csv`.
   - `lib/tools/pdf/golden-statement.test.ts` validates byte-level RFC 4180 output against the frozen golden without regenerating it.
3. **Playwright E2E Suite (`e2e/pdf-to-excel.spec.ts`)**:
   - Refusal of scanned PDF tested by name (G7).
   - Full extraction, column mapping, balance reconciliation, and real `.xlsx` and `.csv` downloads verified in Chromium and WebKit.

---

## 6. Verification of the ruling-line engine

**Ground truth comes from PyMuPDF, not from this code.** Both fixtures were
read by an independent implementation first and its numbers written into the
tests:

- `__fixtures__/statement-ruled.pdf` — a two-page ruled statement whose
  horizontals are strokes and whose verticals are thin filled rectangles, so
  both routes into the reader are covered. PyMuPDF reports verticals at
  x = 40, 110, 300, 370, 440, 520 and horizontals at y = 250, 226, 202, 178,
  154, 130 in PDF space. The reader must agree.
- `__fixtures__/table-thick-borders.pdf` — every border a 3pt filled
  rectangle. Bypassing `closedRectangle` yields 8 horizontal rules instead of
  4, and the test fails. This fixture exists because the **first** version of
  that test passed with the feature disabled: a 0.7pt rectangle's two edges
  merge back into one anyway, so the thin fixture could not tell the two
  implementations apart.

**A note for whoever runs the browser suite next.** `uploadPdf` in
`e2e/pdf-to-excel.spec.ts` waits for the page to hydrate and confirms the drop
zone went away before continuing. The file input is server-rendered, so
setting files before React attaches its change handler fires the event into
nothing — the upload silently does not happen and the failure surfaces much
later as a missing table. Reproduced at three workers roughly one run in four.
Do not remove that wait.
