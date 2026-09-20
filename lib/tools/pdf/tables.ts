/**
 * Pure TypeScript table & column extraction engine for PDF bank statements.
 *
 * Reconstructs 2D tabular data from raw `PdfTextItem` coordinates (x, y, width,
 * fontSize) without any DOM or canvas dependencies.
 *
 * Core capabilities:
 * 1. Horizontal segmentation & column boundary detection with right-aligned numeric clustering.
 * 2. Header row identification and column label assignment.
 * 3. Multi-line row continuation merging (descriptions wrapping across lines).
 * 4. Multi-page statement joining with repeated header suppression and footer stripping.
 * 5. Refusal by name for scanned/image-only PDFs (0 or negligible text items).
 */

import type { PdfPageText, PdfTextItem } from './pdf-text';

export interface ColumnDefinition {
  id: string;
  index: number;
  header: string;
  left: number;
  right: number;
  alignment: 'left' | 'right';
  detectedRole:
    | 'date'
    | 'description'
    | 'debit'
    | 'credit'
    | 'amount'
    | 'balance'
    | 'reference'
    | 'unknown';
}

export interface ExtractedTableRow {
  id: string;
  cells: string[];
  rawLines: number;
  pageNumber: number;
  y: number;
}

export interface ExtractedTableResult {
  columns: ColumnDefinition[];
  headers: string[];
  rows: ExtractedTableRow[];
  pageCount: number;
  totalCharacters: number;
  refusalReason?: string;
  headerRowIndex: number;
}

export interface TextSegment {
  text: string;
  left: number;
  right: number;
  y: number;
  fontSize: number;
  bold: boolean;
  isNumeric: boolean;
}

interface LineSegments {
  y: number;
  fontSize: number;
  segments: TextSegment[];
}

/** Baseline tolerance for grouping items into a single line (share of font size). */
const LINE_TOLERANCE = 0.5;

/** Gaps smaller than this share of font size join words into a single segment. */
const WORD_GAP_FACTOR = 0.6;

/** Common banking header keywords used to recognize table headers and infer roles. */
const DATE_KEYWORDS = [
  'date',
  'trans date',
  'posting date',
  'txn date',
  'value date',
  'booking date',
  'datum',
  'valuta',
  'buchungstag',
  'date/time',
];
const DESC_KEYWORDS = [
  'description',
  'particulars',
  'narrative',
  'details',
  'memo',
  'transaction details',
  'payee',
  'narration',
  'beschreibung',
  'verwendungszweck',
  'libelle',
];
const DEBIT_KEYWORDS = [
  'debit',
  'withdrawals',
  'withdrawal',
  'dr',
  'payments',
  'paid out',
  'debits',
  'money out',
  'belastung',
  'ausgaben',
  'debit (-)',
  'debits (-)',
];
const CREDIT_KEYWORDS = [
  'credit',
  'deposits',
  'deposit',
  'cr',
  'receipts',
  'paid in',
  'credits',
  'money in',
  'gutschrift',
  'einzahlung',
  'credit (+)',
  'credits (+)',
];
const AMOUNT_KEYWORDS = [
  'amount',
  'txn amount',
  'total',
  'betrag',
  'montant',
  'importo',
];
const BALANCE_KEYWORDS = [
  'balance',
  'running balance',
  'closing balance',
  'available balance',
  'saldo',
  'kontostand',
];
const REF_KEYWORDS = [
  'ref',
  'reference',
  'chq no',
  'cheque no',
  'cheque',
  'type',
  'code',
  'ref no',
];

/** Page footer patterns to ignore during extraction. */
const FOOTER_PATTERNS = [
  /page\s+\d+\s+(of|\/)\s+\d+/iu,
  /continued\s+on\s+(next\s+page|\.\.\.)/iu,
  /end\s+of\s+statement/iu,
];

/** Test if a string looks like a numeric currency/amount token. */
export function looksLikeNumeric(text: string): boolean {
  const clean = text.trim();
  if (clean.length === 0) return false;
  // Allows optional currency symbol, signed indicators, digits, commas, periods, DR/CR
  const numericPattern = /^[+\-($€£₹¥]?\s*[\d,.]+\s*([)-]|cr|dr)?$/iu;
  return numericPattern.test(clean) && /\d/u.test(clean);
}

/**
 * Group raw text items on a page into visual lines (descending Y coordinates),
 * and merge adjacent words into coherent horizontal text segments.
 */
export function groupPageIntoSegments(
  items: readonly PdfTextItem[],
): LineSegments[] {
  const usable = items.filter((item) => item.text.length > 0);
  if (usable.length === 0) return [];

  // Sort descending Y (PDF coordinates: larger Y is higher up the page), then ascending X
  const sorted = [...usable].sort((a, b) => b.y - a.y || a.x - b.x);
  const rawLines: { y: number; fontSize: number; items: PdfTextItem[] }[] = [];

  for (const item of sorted) {
    const tolerance = Math.max(1, item.fontSize * LINE_TOLERANCE);
    const existing = rawLines[rawLines.length - 1];
    if (existing && Math.abs(existing.y - item.y) <= tolerance) {
      existing.items.push(item);
      existing.fontSize = Math.max(existing.fontSize, item.fontSize);
      continue;
    }
    rawLines.push({
      y: item.y,
      fontSize: item.fontSize,
      items: [item],
    });
  }

  const result: LineSegments[] = [];

  for (const line of rawLines) {
    line.items.sort((a, b) => a.x - b.x);
    const segments: TextSegment[] = [];
    let current: TextSegment | null = null;

    for (const item of line.items) {
      const cleanText = item.text.trim();
      if (cleanText.length === 0) continue;

      if (!current) {
        current = {
          text: item.text,
          left: item.x,
          right: item.x + item.width,
          y: item.y,
          fontSize: item.fontSize,
          bold: item.bold,
          isNumeric: looksLikeNumeric(item.text),
        };
        continue;
      }

      const gap = item.x - current.right;
      const threshold = Math.max(
        1.5,
        Math.max(current.fontSize, item.fontSize) * WORD_GAP_FACTOR,
      );

      // If gap is small, merge into current segment
      if (gap <= threshold) {
        const needsSpace =
          !current.text.endsWith(' ') && !item.text.startsWith(' ');
        current.text += (needsSpace ? ' ' : '') + item.text;
        current.right = Math.max(current.right, item.x + item.width);
        current.bold = current.bold && item.bold;
        current.isNumeric = looksLikeNumeric(current.text);
      } else {
        // Gap is large enough to represent a separate cell / column
        current.text = current.text.trim();
        segments.push(current);
        current = {
          text: item.text,
          left: item.x,
          right: item.x + item.width,
          y: item.y,
          fontSize: item.fontSize,
          bold: item.bold,
          isNumeric: looksLikeNumeric(item.text),
        };
      }
    }

    if (current) {
      current.text = current.text.trim();
      segments.push(current);
    }

    if (segments.length > 0) {
      result.push({
        y: line.y,
        fontSize: line.fontSize,
        segments,
      });
    }
  }

  return result;
}

/** Check if a line matches any known header keyword list. */
function matchesKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  return keywords.some(
    (kw) =>
      lower === kw || lower.startsWith(`${kw} `) || lower.endsWith(` ${kw}`),
  );
}

/** Detect the role of a header text string. */
export function detectRoleFromHeader(
  headerText: string,
): ColumnDefinition['detectedRole'] {
  if (matchesKeyword(headerText, DATE_KEYWORDS)) return 'date';
  if (matchesKeyword(headerText, DEBIT_KEYWORDS)) return 'debit';
  if (matchesKeyword(headerText, CREDIT_KEYWORDS)) return 'credit';
  if (matchesKeyword(headerText, BALANCE_KEYWORDS)) return 'balance';
  if (matchesKeyword(headerText, AMOUNT_KEYWORDS)) return 'amount';
  if (matchesKeyword(headerText, DESC_KEYWORDS)) return 'description';
  if (matchesKeyword(headerText, REF_KEYWORDS)) return 'reference';
  return 'unknown';
}

/**
 * Identify the table header line. Looks for lines with multiple segments where
 * at least 2 segments match banking column headers (e.g. Date, Description, Amount).
 */
export function findHeaderLine(
  lines: readonly LineSegments[],
): { index: number; line: LineSegments } | null {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.segments.length < 2) continue;

    let matchedCount = 0;
    for (const seg of line.segments) {
      if (detectRoleFromHeader(seg.text) !== 'unknown') {
        matchedCount += 1;
      }
    }

    // If at least 2 distinct segments look like table headers, we found the table header row
    if (matchedCount >= 2) {
      return { index: i, line };
    }
  }
  return null;
}

/**
 * Cluster horizontal segments to define column boundaries.
 * Takes into account right-aligned numeric columns (amounts align on their right edge)
 * and left-aligned text columns (dates and descriptions align on their left edge).
 */
export function detectColumns(
  lines: readonly LineSegments[],
  headerLine: LineSegments | null,
): ColumnDefinition[] {
  if (headerLine && headerLine.segments.length >= 2) {
    // Derive initial column boundaries directly from header segments
    const headerSegments = headerLine.segments;
    const columns: ColumnDefinition[] = [];

    for (let i = 0; i < headerSegments.length; i += 1) {
      const seg = headerSegments[i]!;
      const prevSeg = i > 0 ? headerSegments[i - 1] : null;
      const nextSeg =
        i < headerSegments.length - 1 ? headerSegments[i + 1] : null;

      // Column left boundary is midway between previous segment right and current segment left
      const leftBound = prevSeg
        ? (prevSeg.right + seg.left) / 2
        : Math.max(0, seg.left - 20);
      // Column right boundary is midway between current segment right and next segment left
      const rightBound = nextSeg
        ? (seg.right + nextSeg.left) / 2
        : seg.right + 80;

      const role = detectRoleFromHeader(seg.text);
      const isRightAligned =
        role === 'debit' ||
        role === 'credit' ||
        role === 'amount' ||
        role === 'balance';

      columns.push({
        id: `col-${i}`,
        index: i,
        header: seg.text,
        left: leftBound,
        right: rightBound,
        alignment: isRightAligned ? 'right' : 'left',
        detectedRole: role,
      });
    }

    // Refine column boundaries by checking data lines below the header
    refineBoundariesWithData(columns, lines);
    return columns;
  }

  // Fallback: No explicit header line found. Cluster segment coordinates across data lines.
  return clusterColumnsFromData(lines);
}

/**
 * Refine column left and right boundaries based on actual transaction item spans.
 */
function refineBoundariesWithData(
  columns: ColumnDefinition[],
  lines: readonly LineSegments[],
): void {
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i]!;
    const matchingSegments: TextSegment[] = [];

    for (const line of lines) {
      for (const seg of line.segments) {
        const center = (seg.left + seg.right) / 2;
        if (center >= col.left && center <= col.right) {
          matchingSegments.push(seg);
        }
      }
    }

    if (matchingSegments.length > 0) {
      const minLeft = Math.min(...matchingSegments.map((s) => s.left));
      const maxRight = Math.max(...matchingSegments.map((s) => s.right));

      // Expand bounds if actual data items extend slightly further
      col.left = Math.min(col.left, minLeft - 5);
      col.right = Math.max(col.right, maxRight + 5);

      // Determine alignment: if over 60% of values are numeric, mark as right-aligned
      const numericCount = matchingSegments.filter((s) => s.isNumeric).length;
      if (numericCount / matchingSegments.length >= 0.6) {
        col.alignment = 'right';
        if (col.detectedRole === 'unknown') {
          col.detectedRole = 'amount';
        }
      }
    }
  }

  // Ensure consecutive columns don't leave gaps or overlap inappropriately
  for (let i = 0; i < columns.length - 1; i += 1) {
    const cur = columns[i]!;
    const next = columns[i + 1]!;
    if (cur.right > next.left) {
      const mid = (cur.right + next.left) / 2;
      cur.right = mid;
      next.left = mid;
    }
  }
}

/**
 * Cluster columns when no header line is present by clustering left & right edges.
 */
function clusterColumnsFromData(
  lines: readonly LineSegments[],
): ColumnDefinition[] {
  // Collect all left and right coordinates of segments on lines with 2+ segments
  const candidateLines = lines.filter((l) => l.segments.length >= 2);
  if (candidateLines.length === 0) {
    return [
      {
        id: 'col-0',
        index: 0,
        header: 'Column 1',
        left: 0,
        right: 1000,
        alignment: 'left',
        detectedRole: 'unknown',
      },
    ];
  }

  // Find median number of columns
  const segmentCounts = candidateLines
    .map((l) => l.segments.length)
    .sort((a, b) => a - b);
  const targetColCount =
    segmentCounts[Math.floor(segmentCounts.length / 2)] ?? 3;

  // Pick representative lines with targetColCount
  const representativeLines = candidateLines.filter(
    (l) => l.segments.length === targetColCount,
  );
  const sample =
    representativeLines.length > 0 ? representativeLines : candidateLines;

  // Average positions for each column slot
  const lefts: number[] = Array.from({ length: targetColCount }, () => 0);
  const rights: number[] = Array.from({ length: targetColCount }, () => 0);
  const counts: number[] = Array.from({ length: targetColCount }, () => 0);

  for (const line of sample) {
    line.segments.forEach((seg, idx) => {
      if (idx < targetColCount) {
        lefts[idx]! += seg.left;
        rights[idx]! += seg.right;
        counts[idx]! += 1;
      }
    });
  }

  const columns: ColumnDefinition[] = [];
  for (let i = 0; i < targetColCount; i += 1) {
    const count = counts[i] || 1;
    const avgLeft = lefts[i]! / count;
    const avgRight = rights[i]! / count;

    columns.push({
      id: `col-${i}`,
      index: i,
      header: `Column ${i + 1}`,
      left: avgLeft - 10,
      right: avgRight + 10,
      alignment: 'left',
      detectedRole: 'unknown',
    });
  }

  // Adjust midpoints
  for (let i = 0; i < columns.length - 1; i += 1) {
    const mid = (columns[i]!.right + columns[i + 1]!.left) / 2;
    columns[i]!.right = mid;
    columns[i + 1]!.left = mid;
  }

  return columns;
}

/** Check if a line is a repeated header or a document footer. */
function isIgnorableLine(
  line: LineSegments,
  headerLine: LineSegments | null,
): boolean {
  const lineText = line.segments.map((s) => s.text).join(' ');

  for (const pattern of FOOTER_PATTERNS) {
    if (pattern.test(lineText)) return true;
  }

  if (headerLine) {
    const headerText = headerLine.segments.map((s) => s.text).join(' ');
    if (lineText.toLowerCase() === headerText.toLowerCase()) {
      return true;
    }
  }

  return false;
}

/**
 * Assign segments of a line into the defined columns.
 */
export function assignLineToColumns(
  line: LineSegments,
  columns: readonly ColumnDefinition[],
): string[] {
  const cells: string[] = Array.from({ length: columns.length }, () => '');

  for (const seg of line.segments) {
    let bestColIdx = 0;
    let maxOverlap = -1;

    for (let i = 0; i < columns.length; i += 1) {
      const col = columns[i]!;
      // Calculate overlap between segment [seg.left, seg.right] and column [col.left, col.right]
      const overlapStart = Math.max(seg.left, col.left);
      const overlapEnd = Math.min(seg.right, col.right);
      const overlap = Math.max(0, overlapEnd - overlapStart);

      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestColIdx = i;
      }
    }

    // If no direct overlap, pick closest by center distance
    if (maxOverlap <= 0) {
      const segCenter = (seg.left + seg.right) / 2;
      let minDistance = Infinity;
      for (let i = 0; i < columns.length; i += 1) {
        const colCenter = (columns[i]!.left + columns[i]!.right) / 2;
        const dist = Math.abs(segCenter - colCenter);
        if (dist < minDistance) {
          minDistance = dist;
          bestColIdx = i;
        }
      }
    }

    const existing = cells[bestColIdx]!;
    cells[bestColIdx] = existing ? `${existing} ${seg.text}` : seg.text;
  }

  return cells;
}

/**
 * Test if a candidate row is a multi-line continuation of the previous row.
 * In a bank statement:
 * - A new row usually starts with a Date or has a distinct transaction amount.
 * - A continuation row has an empty Date cell, empty Amount/Debit/Credit cells,
 *   and only has text in the Description (or Reference) column.
 */
function isContinuationRow(
  cells: readonly string[],
  columns: readonly ColumnDefinition[],
): boolean {
  let hasDescription = false;
  let hasDate = false;
  let hasAmount = false;

  for (let i = 0; i < columns.length; i += 1) {
    const val = (cells[i] ?? '').trim();
    if (val.length === 0) continue;

    const role = columns[i]!.detectedRole;
    if (role === 'date') {
      hasDate = true;
    } else if (
      role === 'amount' ||
      role === 'debit' ||
      role === 'credit' ||
      role === 'balance'
    ) {
      hasAmount = true;
    } else if (role === 'description') {
      hasDescription = true;
    } else if (i === 0 && !hasDate) {
      // If column 0 is non-empty and not designated date, check if it has digits/date
      if (/\d/u.test(val)) {
        hasDate = true;
      }
    } else {
      hasDescription = true;
    }
  }

  // Continuation if it has description/notes but lacks date and transaction amount
  return hasDescription && !hasDate && !hasAmount;
}

/**
 * Main table extraction pipeline.
 * Accepts pages of text items and extracts a structured, normalized table with multi-line rows merged.
 */
export function extractTableFromPdfPages(
  pages: readonly PdfPageText[],
): ExtractedTableResult {
  let totalCharacters = 0;
  for (const page of pages) {
    for (const item of page.items) {
      totalCharacters += item.text.trim().length;
    }
  }

  // Refusal by name for scanned or non-text PDFs
  if (totalCharacters < 20 || pages.length === 0) {
    return {
      columns: [],
      headers: [],
      rows: [],
      pageCount: pages.length,
      totalCharacters,
      headerRowIndex: -1,
      refusalReason:
        'This PDF has no readable text layer (0 text characters detected). ' +
        'It appears to be a scanned document or photograph. ' +
        'To convert accurately without errors: ' +
        '1) Download the electronic PDF statement directly from your bank portal, or ' +
        '2) Download CSV/OFX/QIF export directly from your online banking activity.',
    };
  }

  // Group each page into visual lines
  const pagesLines = pages.map((page) => groupPageIntoSegments(page.items));

  // Find header line across the first 2 pages
  let headerInfo: {
    index: number;
    line: LineSegments;
    pageIndex: number;
  } | null = null;
  for (
    let pageIdx = 0;
    pageIdx < Math.min(pagesLines.length, 2);
    pageIdx += 1
  ) {
    const found = findHeaderLine(pagesLines[pageIdx]!);
    if (found) {
      headerInfo = { ...found, pageIndex: pageIdx };
      break;
    }
  }

  // Flatten all lines across pages to determine global column layout
  const allLines = pagesLines.flat();
  const columns = detectColumns(allLines, headerInfo?.line ?? null);
  const headers = columns.map((col) => col.header);

  const rows: ExtractedTableRow[] = [];
  let rowSeq = 0;

  for (let pageIdx = 0; pageIdx < pagesLines.length; pageIdx += 1) {
    const lines = pagesLines[pageIdx]!;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
      const line = lines[lineIdx]!;

      // Skip lines before and including the header line on the header page
      if (
        headerInfo &&
        pageIdx === headerInfo.pageIndex &&
        lineIdx <= headerInfo.index
      ) {
        continue;
      }

      // On other pages, skip top title/account lines that sit above the table boundary
      if (headerInfo && line.y > headerInfo.line.y + 10) {
        continue;
      }

      // Skip repeated header rows or page footers on all pages
      if (isIgnorableLine(line, headerInfo?.line ?? null)) {
        continue;
      }

      const cells = assignLineToColumns(line, columns);

      // Skip completely empty lines
      if (cells.every((c) => c.trim().length === 0)) {
        continue;
      }

      // Check multi-line row continuation
      if (rows.length > 0 && isContinuationRow(cells, columns)) {
        const prevRow = rows[rows.length - 1]!;
        // Merge continuation text into corresponding non-empty cells
        for (let colIdx = 0; colIdx < cells.length; colIdx += 1) {
          const contText = cells[colIdx]!.trim();
          if (contText.length > 0) {
            const currentText = prevRow.cells[colIdx]!.trim();
            prevRow.cells[colIdx] = currentText
              ? `${currentText} ${contText}`
              : contText;
          }
        }
        prevRow.rawLines += 1;
        continue;
      }

      rowSeq += 1;
      rows.push({
        id: `row-${rowSeq}`,
        cells,
        rawLines: 1,
        pageNumber: pageIdx + 1,
        y: line.y,
      });
    }
  }

  return {
    columns,
    headers,
    rows,
    pageCount: pages.length,
    totalCharacters,
    headerRowIndex: headerInfo?.index ?? -1,
  };
}
