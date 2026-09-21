# PDF Document Compare & Contract Redline (`/pdf/compare`)

## 1. Overview & Economic Case

Comparing contract revisions, legal briefs, term sheets, and regulatory filings is a core task in legal, finance, and procurement operations. Existing document comparison tools charge high enterprise subscriptions:

- **Draftable**: $129–$261 / user / year
- **Diffchecker Desktop**: $15–$20 / user / month
- **Litera Compare (Workshare)**: $195–$1,000+ / user / year

Moreover, legal contracts contain non-public corporate actions, intellectual property terms, liabilities, and executive compensation data. Uploading contract drafts to cloud servers creates confidentiality risks and violates client engagement standards.

`/pdf/compare` executes **100% locally in browser tab memory**. Both documents are parsed, linearized, diffed, and rendered client-side. Zero bytes leave the machine.

---

## 2. Architecture & The Hard Part, Named Honestly: Reflow

### Why Page-by-Page Diffing Fails
If a single sentence or paragraph is inserted on Page 1 of a 10-page agreement, text below it shifts downward. Paragraphs that previously sat at the bottom of Page 1 now appear at the top of Page 2, Page 2 spills onto Page 3, and so forth.

A naive page-by-page comparison tool will report **Pages 2 through 10 as completely changed**, producing hundreds of false-positive deletions and insertions. Such an output is useless for a lawyer or contracting officer.

### The Whole-Document Stream Solution
`/pdf/compare` linearizes the document into a single continuous stream of positioned tokens:

1. **Extraction with Spatial Metadata** (`lib/tools/diff/pdf/linearize.ts`):
   - PDF pages are parsed into words using pdf.js text geometry and font object inspection.
   - Each word token retains:
     - `text` and `normalizedText` (lowercase, punctuation-stripped for matching)
     - `pageNumber`
     - Exact PDF coordinate bounding box $(x, y, \text{width}, \text{height})$
     - Style properties (`fontSize`, `bold`)

2. **Stream-Level LCS Diff** (`lib/tools/diff/pdf/word-diff.ts`):
   - Word-level Longest Common Subsequence (LCS) diff runs across the entire multi-page document stream.
   - Inserting a sentence on Page 1 produces a single insertion change on Page 1. The subsequent identical text across Pages 2–10 matches as `equal` in the stream, regardless of which physical page it reflowed onto.

3. **Moved Clause Detection**:
   - Deletions and insertions with matching normalized tokens ($\ge 8$ words) are evaluated for transposition.
   - When a clause is relocated (e.g., from Page 1 to Page 3), it is classified as a **`move`** change with explicit `movedFromPage` and `movedToPage` metadata, rather than an unrelated deletion plus insertion.

4. **Separate Formatting Changes**:
   - When words match identically between drafts but have altered styles (e.g. font size altered or bold styling applied), the tokens are recorded as **`format`** changes.
   - Formatting-only shifts are separated from substantive revisions, ensuring legal and commercial changes are never buried under typography changes.

---

## 3. Accessible Visual Inspection (DOM Over Canvas)

Following the precedent set by `components/pdf-grid-overlay.tsx`:

- The underlying PDF page is painted to an HTML5 `<canvas>` at device pixel ratio.
- Every detected change is rendered as an accessible **DOM `<button>` element overlaid** on top of the canvas using transformed viewport coordinates.
- Each overlay element carries:
  - Accessible ARIA labels (`aria-label="insert change: Inserted text on Page 1"`)
  - Full keyboard focusability (`tabIndex={0}`)
  - Color-coded borders and translucent fills (Emerald for inserts, Rose for deletions, Amber for moves, Indigo for formatting)
  - Interactive click handlers that select the change and scroll the change inspector into view.

---

## 4. Refusal by Name: Scanned PDFs

A PDF comparison tool that operates on text streams cannot diff photographic scans without OCR.

If either uploaded document contains no text layer, the comparison engine immediately throws `NoTextLayerError`. The user interface displays a clear notice naming the specific document:

> **Scanned Document Detected: contract_scan.pdf**  
> `contract_scan.pdf` contains no text layer — it looks like a scanned document. Scanned documents cannot be compared until their text is recognized.

A direct action button directs the user to `/pdf/ocr` to generate a searchable text layer client-side before running the comparison.

---

## 5. Multi-Format Deliverables

Users can export the comparison in three industry-standard formats:

1. **Annotated PDF** (`generateAnnotatedPdf`):
   - Uses `pdf-lib` to draw colored highlight bounding boxes and margin indicators over the revised PDF.
   - Appends an audit legend page detailing total revisions.

2. **Tracked Revisions Word Document** (`generateRedlineDocx`):
   - Emits a standard `.docx` archive containing native OpenXML tracked revision tags:
     - `<w:ins>` for insertions
     - `<w:del>` for deletions
     - `<w:moveFrom>` and `<w:moveTo>` for relocated text
   - Fully compatible with Microsoft Word's Review tab.

3. **Change List CSV** (`generateChangeListCsv`):
   - Tabular export listing Change ID, Type, Source Page, Target Page, Prior Text, Revised Text, and Description for spreadsheet audit trails.

---

## 6. Strict Truth Rules: No Arbitrary Scores

In compliance with OpenTools truth principles:
- **No invented similarity percentages**: The tool does not claim "These documents are 87% identical".
- All summaries report factual counts:
  - Substantive Revisions (Total insertions, deletions, and moves)
  - Word/Clause Insertions
  - Word/Clause Deletions
  - Relocated / Moved Clauses
  - Formatting-Only Adjustments
