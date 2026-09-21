# PDF True Redaction — Architectural Design & Security Proof

## 1. Overview
The **True Redaction Tool** (`/pdf/redact`) provides permanent, irreversible client-side redaction for PDF documents directly inside the browser. It addresses the well-documented failure mode of conventional PDF "redaction" tools: drawing a black rectangle over text while leaving the underlying text stream, glyph operators, or annotation layers intact in the PDF byte stream.

## 2. Threat Model: The Pseudo-Redaction Vulnerability
In standard PDF architecture:
1. **Visual Layer vs. Content Stream**: A black rectangle drawn on a PDF is simply a vector path or annotation placed on top of existing text. Text extraction tools (`pdftotext`, `fitz`, copy-paste in Acrobat) read the `/Contents` stream directly, ignoring visual occlusions.
2. **Hidden Metadata & Leak Vectors**:
   - `/Info` dictionary: Leaks author names, software versions, creation timestamps, and original file titles.
   - XMP Metadata streams: Often hold unredacted historical revisions or metadata packets.
   - Outlines & Bookmarks: Contain sensitive section headings or names even if the page text is removed.
   - `/Annots` (Annotations): Pop-up comments, text notes, and form fields often duplicate redacted content.
   - `/Names` Tree: May hold embedded attachments or JavaScript actions.

## 3. The Physical Rasterisation Model (Guardrail G5)
To guarantee that confidential text cannot be recovered by any attacker or forensic extractor, `/pdf/redact` enforces a **selective physical rasterisation model**:

1. **Redacted Pages (Rasterised)**:
   - Pages carrying one or more redaction targets (manual boxes, search matches, or detected PII) are rendered into a high-resolution pixel bitmap using `pdfjs-dist` on an off-screen HTML5 canvas at selectable DPI (150, 200, or 300 DPI).
   - Opaque black rectangles (`#000000`) are burned directly onto the canvas pixels.
   - The canvas is encoded as a lossless PNG image and embedded as the sole content of that page in a new `PDFDocument` via `pdf-lib`.
   - **Guaranteed Outcome**: The page contains *only* a raster image. There is no `/Font`, no `/Text`, and no glyph drawing operators. Decompressing the page stream yields only image dictionary tokens (`/XObject /Image`).
2. **Untouched Pages (Preserved Vector)**:
   - Pages without any redactions are copied verbatim from the source document using `pdf-lib`'s `copyPages`.
   - **Guaranteed Outcome**: Untouched pages retain 100% native vector quality, crisp typography, and full searchability, preventing document bloat.
3. **Document Sanitation Audit**:
   - The `/Info` dictionary is deleted and replaced with empty metadata.
   - The XMP `Metadata` stream is completely removed from the document catalog.
   - The `Outlines` (bookmarks) dictionary is deleted.
   - The `Names` tree (embedded files and attachments) is deleted.
   - Document-level actions (`OpenAction`, `AA`) are deleted.
   - The `/Annots` array is stripped from every page in the output document.

## 4. Independent Outside-Tool Verification Proof
In accordance with Guardrail G5, the redaction engine was verified against four independent tools that are not part of our application stack (`scripts/verify-redaction-proof.py`):

1. **Poppler `pdftotext`**:
   - Extracted all text from the redacted document.
   - Confirmed 0 occurrences of confidential names, email addresses, credit card numbers, or server IPs.
   - Confirmed page 2 unredacted text is intact.
2. **`pypdf`**:
   - Parsed page contents and extracted text objects.
   - Verified that page 1 yields 0 text characters, and page 2 text matches source text.
3. **`PyMuPDF` (`fitz`)**:
   - Inspected raw text blocks and font tables.
   - Verified page 1 has 0 font dictionaries and 0 text spans.
4. **Raw Decompressed Byte-Stream Inspection**:
   - Traversed all PDF indirect objects, decompressed all zlib `/FlateDecode` streams, and scanned for secrets.
   - Verified zero occurrences of confidential strings across all object streams.
   - Verified that `/Author`, `/Title`, and `/XMP` dictionaries are eliminated.

### Frozen Golden Artifact
- Source test fixture: `lib/tools/pdf/__fixtures__/contract-source.pdf`
- Frozen golden redacted output: `lib/tools/pdf/__fixtures__/golden-redacted-contract.pdf`
- Regression test: `lib/tools/pdf/redaction-proof.test.ts` (monitors byte-level invariants and ensures secret text is absent).

## 5. UI & Interaction Design (Operator v1)
- **Dropzone & Validation**: Refuses 0-byte PDFs, corrupt files, and password-encrypted PDFs with clear, actionable error alerts (G7).
- **DOM-Overlaid Redaction Boxes**: Redaction boxes are rendered as accessible DOM elements with `aria-label`, `role="button"`, and keyboard controls (arrow keys nudge coordinates by 2pt/10pt; Delete/Backspace removes the box).
- **Target Builders**:
  - **Search & Mark**: Sub-item bounding box calculation maps search terms across fragmented PDF text items.
  - **PII Detection**: Runs deterministic regexes for emails, Luhn-validated credit cards, IPv4 addresses, and API keys.
  - **Manual Drawing**: Click-and-drag directly on the page canvas to place custom redaction rectangles.
- **Export & Receipts**:
  - Real-time progress indicators during canvas rendering.
  - Fact-based summary panel displaying exact counts of rasterised pages, preserved vector pages, burned redactions, and processing time.
  - `announceCompletion` telemetry dispatched for accessibility.
