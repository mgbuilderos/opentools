# Bank Statement & PDF Table to Excel Converter (`/pdf/to-excel`)

## 1. Overview & Honest Philosophy

Converting PDF bank statements into structured spreadsheets (`.xlsx` and `.csv`) is traditionally handled by paid subscription services ($25–$159/month) that require uploading sensitive financial documents to remote third-party servers.

`/pdf/to-excel` executes **100% inside local tab memory** with zero network egress. Client bank account numbers, balances, transaction memos, and identity records never touch any external server.

In accordance with OpenTools truth and defensibility rules (G5):
- We do **not** claim an arbitrary accuracy percentage. Every bank statement layout differs.
- The tool prioritizes transparency: it extracts structured 2D tables, renders an editable preview grid, allows users to assign column roles (Date, Description, Debit, Credit, Amount, Balance, Ignore), and runs verifiable integrity checks.
- If a document has no readable digital text (scanned photo or image), it is **refused by name** with clear instructions on obtaining native digital files or direct CSV exports, rather than producing corrupt numbers or hallucinated text (G7).

---

## 2. Table & Column Detection Algorithm (`lib/tools/pdf/tables.ts`)

Extracting tables from PDF stream operators without ruling lines or explicit cell tags:

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
   - Conventions are resolved *per column* to prevent inconsistent parsing within the same column.

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
