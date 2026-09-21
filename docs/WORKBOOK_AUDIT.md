# Excel Workbook Audit & Formula Inspector (`/data/workbook-audit`)

## 1. Overview & Honest Philosophy

Financial models, transaction logs, corporate budgets, and operational workbooks power critical commercial decisions. However, manual spreadsheets suffer from silent structural degradations: hardcoded tax rates inside formulas, broken formula runs caused by accidental manual typing, circular references, error cell cascades, and unlinked external files.

Traditional spreadsheet auditing software (e.g. Spreadsheet Detective, Operis Analysis Kit, PerfectXL) costs **$400–$1,500/seat/year** or requires sending sensitive internal financials, payrolls, and M&A models to third-party cloud servers.

`/data/workbook-audit` runs **100% locally in browser memory**. Spreadsheet XML archives are parsed client-side using JavaScript typed arrays and DOM parsers. Zero bytes, formulas, or cell values are ever transmitted to any remote server.

### Truth Rules and Defensibility (G5, G7)
- **No Arbitrary Quality Scores**: We do not assign an invented "Workbook Health Score: 74/100". Such numbers are unscientific and unprovable. The tool counts factual findings, classifies severity, and names the exact sheet and cell coordinates (e.g., `Sheet1!C47`).
- **Defensible Statistical Nomenclature**: When testing leading-digit distributions via Benford's Law, the tool states the test by name (*"Benford's Law First-Digit Distribution Test"*), reports the chi-square divergence metric, and **never uses the word "fraud"**. Benford's Law highlights statistical anomalies worthy of closer human review; it does not prove malfeasance.

---

## 2. Defect Classes & Detection Engines

The audit engine operates across two complementary analytical lanes: **Structural Findings (A1)** and **Statistical Findings (A2)**.

### A1. Structural Findings — Architectural and Formula Integrity

Each structural finding represents a verifiable fact about the workbook schema and cell AST:

1. **Hardcoded Constants Inside Formulas**:
   - *Issue*: `=B4*1.2` or `=C10+5000` where tax rates, markups, or hurdle rates are buried in cell formulas rather than isolated in labeled assumption cells.
   - *Detection*: Extracts raw formula expressions `<f>` from cell XML, parses formula tokens, and detects numeric literals. Filters out standard programmatic constants (such as 0, 1, 2 for booleans or binary flags, and date offsets).

2. **Broken Formula Runs & Overwritten Formulas**:
   - *Issue*: A column intended to be uniformly calculated (e.g., column `E` calculating `=C*D`) where row 47 contains a hardcoded number or a divergent formula shape.
   - *Detection*: Translates cell formulas to R1C1 notation (e.g., `R[0]C[-2]*R[0]C[-1]`). Columns with $\ge 3$ cells sharing an R1C1 pattern identify the expected formula shape. Deviations in formula text or values typed over formula runs are flagged with cell coordinates.

3. **Error Cells & Error Propagation**:
   - *Issue*: Cells containing Excel error literals: `#REF!`, `#VALUE!`, `#DIV/0!`, `#N/A`, `#NAME?`, `#NUM!`, `#NULL!`.
   - *Detection*: Parses `<c t="e"><v>#REF!</v></c>`. Builds a directed cell dependency graph to distinguish root errors from downstream cells affected by error propagation.

4. **External Links**:
   - *Issue*: Formulas referencing external workbooks (e.g., `='[Q4_Budget.xlsx]Sheet1'!A1`).
   - *Detection*: Parses `xl/externalLinks/` relationships and bracketed workbook references in formula strings. External links break silently when workbooks are emailed or moved.

5. **Circular References**:
   - *Issue*: A cell formula that depends directly or indirectly on its own value, causing calculation instability.
   - *Detection*: Constructs cell reference dependency edges from formula tokens and executes cycle-detection via depth-first search (DFS).

6. **Inconsistent Column Data Types**:
   - *Issue*: Numbers stored as text strings (e.g., `<c t="s">` containing `"1250.00"`), which cause Excel `=SUM()` and `=AVERAGE()` to silently ignore those values.
   - *Detection*: Analyzes dominant column types across rows and flags anomalies where numeric fields contain text representations.

7. **Hidden & Very-Hidden Sheets**:
   - *Issue*: Sheets hidden from normal workbook tabs (`state="hidden"`) or programmatically concealed via VBA (`state="veryHidden"`).
   - *Detection*: Inspects `<sheet state="..." />` attributes in `xl/workbook.xml`.

8. **Hidden Rows and Columns**:
   - *Issue*: Rows or columns hidden within data ranges (`hidden="1"`), which can conceal omitted costs or confidential records.

9. **Merged Cells in Data Ranges**:
   - *Issue*: Cells combined with `<mergeCells>`, which break sorting, filtering, and table references.

---

### A2. Statistical Findings — Anomaly and Distribution Analysis

1. **Benford's Law Leading Digit Distribution**:
   - Evaluates whether leading digits $d \in \{1, \dots, 9\}$ follow the logarithmic distribution:
     $$P(d) = \log_{10}\left(1 + \frac{1}{d}\right)$$
   - Evaluated on numeric transaction, expense, and ledger columns with $\ge 50$ rows.
   - Reports expected vs. observed percentages and Chi-Square divergence ($\chi^2$).
   - Explicitly notes that natural datasets under contract caps, fixed pricing tiers, or uniform distributions naturally deviate from Benford's Law without indicating irregularity.

2. **Sequence Gaps**:
   - Identifies missing integers in invoice, cheque, voucher, or sequence number columns (e.g., 1001, 1002, 1004, 1005 flags 1003 missing).

3. **Round Numbers Clustering**:
   - Detects numeric distributions where an abnormal proportion ($\ge 40\%$) of values end in double zeros (`.00`), hundreds, or thousands, characteristic of estimates rather than empirical measurements.

4. **Weekend and Out-of-Hours Postings**:
   - Evaluates ISO and Excel serial dates to identify transactions posted on Saturdays and Sundays.

5. **Median Absolute Deviation (MAD) Outliers**:
   - Detects extreme outliers using non-parametric MAD:
     $$\text{MAD} = \text{median}(|X_i - \text{median}(X)|)$$
   - Avoids standard deviation calculations that assume Gaussian normality (which financial distributions violate due to fat tails).

6. **Duplicate Rows**:
   - Flags identical records across all columns indicating double-entry or duplicate invoice submissions.

---

## 3. The Audit Report (`.xlsx` Export)

Auditors and analysts require portable deliverables to hand to clients, management, or counterparties.

The tool generates a multi-tab Microsoft Excel `.xlsx` report using our zero-dependency native OpenXML builder (`lib/tools/audit/workbook/report.ts`):
- **Sheet 1: Audit Summary** — Scope metrics, file properties, finding count breakdown by category and severity.
- **Sheet 2: Hardcoded Constants** — Sheet name, cell reference, formula, detected constant, recommended fix.
- **Sheet 3: Formula Run Breaks** — Column, row, expected R1C1 pattern, observed formula/value.
- **Sheet 4: Error Cells** — Cell reference, error code, root vs propagated status.
- **Sheet 5: External Links** — Cell reference, external workbook target path, formula text.
- **Sheet 6: Structural Risks** — Hidden sheets, hidden rows/cols, merged cell ranges, circular reference chains.
- **Sheet 7: Statistical Anomalies** — Benford distributions, sequence gaps, weekend transactions, MAD outliers.

---

## 4. Verification & Testing

The workbook audit engine is verified by comprehensive unit tests (`lib/tools/audit/workbook/audit.test.ts`):
- Executes against a programmatically generated multi-sheet fixture workbook containing every A1 and A2 defect class.
- Asserts that all structural defects are correctly detected with exact cell coordinates.
- Asserts that the Benford test is named and that the string "fraud" does not appear in any finding message or description.
- Asserts that the generated audit `.xlsx` report can be parsed and verified by the Excel reader.
