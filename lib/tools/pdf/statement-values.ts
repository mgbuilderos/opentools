/**
 * Parsing, formatting, and reconciliation engine for bank statement values.
 *
 * Responsibilities:
 * 1. Monetary Amount Parsing:
 *    - US/UK: `1,234.56`
 *    - European: `1.234,56`
 *    - Indian Lakh/Crore: `1,23,456.78`
 *    - Negative indicators: `(1,234.56)`, `-1,234.56`, `1,234.56-`, `1,234.56 DR`
 *    - Currency symbols: `₹`, `$`, `£`, `€`, `¥`
 *    - Column-level grouping convention detection so columns parse consistently.
 *
 * 2. Date Parsing & Ambiguity Resolution:
 *    - Column-level inspection: if any day > 12, the entire column format is resolved.
 *    - Explicitly flags ambiguous date columns (e.g. all days <= 12) so the user can choose.
 *    - Generates real Date objects for Excel serial date representation (`dateToSerial`).
 *
 * 3. Debit / Credit Normalization:
 *    - Consolidates single-column signed amounts or separate Debit/Credit columns into
 *      normalized signed transaction values.
 *
 * 4. Running Balance Integrity Check:
 *    - Reconciles delta against running balance in downward and upward chronological orders.
 *    - Identifies and reports mismatched rows to the user.
 */

export type NumberConvention = 'standard-us' | 'european' | 'indian-lakh';
export type DateFormatPreference = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export interface ParsedAmount {
  raw: string;
  value: number | null;
  currency?: string;
  isDebit: boolean;
  isCredit: boolean;
}

export interface ParsedDate {
  raw: string;
  date: Date | null;
  isoDate: string | null;
  isAmbiguous: boolean;
}

export interface ReconciledTransaction {
  rowIndex: number;
  dateStr: string;
  date: Date | null;
  description: string;
  rawAmount: string;
  amount: number | null;
  rawDebit?: string;
  debit?: number | null;
  rawCredit?: string;
  credit?: number | null;
  rawBalance?: string;
  balance?: number | null;
  isReconciled?: boolean;
  reconciliationError?: string;
}

export interface StatementReconciliationReport {
  totalTransactions: number;
  hasBalanceColumn: boolean;
  chronologicalDirection:
    | 'chronological'
    | 'reverse-chronological'
    | 'undetermined';
  reconciledCount: number;
  mismatchCount: number;
  mismatchedRows: {
    rowIndex: number;
    expectedDelta: number;
    actualDelta: number;
    error: string;
  }[];
}

/** Currency symbols and patterns to detect. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₹': 'INR',
  '¥': 'JPY',
  'Rs.': 'INR',
  Rs: 'INR',
  INR: 'INR',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
};

/**
 * Detect number convention for a column by surveying all its numeric cells.
 */
export function detectNumberConvention(
  cells: readonly string[],
): NumberConvention {
  let europeanVotes = 0;
  let indianVotes = 0;
  let standardVotes = 0;

  for (const raw of cells) {
    const text = raw
      .trim()
      .replace(/^[+\-($€£₹¥Rs.\s]+/iu, '')
      .replace(/[)\-crdr\s]+$/iu, '');
    if (!text) continue;

    // European test: uses period as thousands and comma as decimal, e.g. 1.234,56 or 12,50
    if (
      /^\d{1,3}(\.\d{3})*,\d{2}$/u.test(text) ||
      (/,\d{2}$/u.test(text) && !text.includes('.'))
    ) {
      europeanVotes += 2;
    }

    // Indian Lakh test: uses comma after 3 digits, then every 2 digits, with decimal point, e.g. 1,23,456.78
    if (
      /^\d{1,2}(,\d{2})+,\d{3}\.\d{2}$/u.test(text) ||
      /^\d{1,2},\d{2},\d{3}/u.test(text)
    ) {
      indianVotes += 3;
    }

    // Standard US/UK test: comma thousands and period decimal, e.g. 1,234.56 or 123,456.78
    if (
      /^\d{1,3}(,\d{3})*\.\d{2}$/u.test(text) ||
      (/\.\d{2}$/u.test(text) && !text.includes(','))
    ) {
      standardVotes += 2;
    }
  }

  if (indianVotes > standardVotes && indianVotes > europeanVotes) {
    return 'indian-lakh';
  }
  if (europeanVotes > standardVotes) {
    return 'european';
  }
  return 'standard-us';
}

/**
 * DR/CR markers, bounded by letters rather than by `\b`.
 *
 * `\bdr\b` looks right and is wrong on exactly the statements this tool exists
 * for. There is no word boundary between `6` and `D` in `1,234.56Dr` — both are
 * word characters — so an unspaced marker was neither detected nor stripped,
 * while `1,234.56 Dr` worked. `parseFloat` stops at the `D` and returns a
 * perfectly good-looking `1234.56`, so `value` was non-null, `cell-flags.ts`
 * raised nothing, and a withdrawal was exported as a positive number with no
 * warning anywhere. Indian banks print the unspaced form routinely.
 *
 * A letter-only boundary keeps the reason `\b` was there in the first place:
 * `DRAFT`, `CREDIT` and `MICR` still do not match, because the character after
 * the marker is a letter.
 */
const DEBIT_MARKER = /(?<![a-z])dr(?![a-z])/iu;
const CREDIT_MARKER = /(?<![a-z])cr(?![a-z])/iu;

/**
 * The same boundary rule, for removing markers before parsing the digits.
 *
 * The full stop after `Dr.` and `Cr.` is part of the marker. Left behind, it
 * became a second decimal point — `Dr. 1,234.56` reduced to `.1234.56`, which
 * `parseFloat` reads as `0.1234`, an amount three orders of magnitude out and
 * flagged by nothing, because it parsed.
 */
const MARKER_WORDS =
  /(?<![a-z])(Rs\.?|INR|USD|EUR|GBP|dr\.?|cr\.?)(?![a-z])/giu;

/**
 * Parse an amount string according to a determined numbering convention.
 */
export function parseAmount(
  text: string,
  convention: NumberConvention = 'standard-us',
): ParsedAmount {
  const raw = text.trim();
  if (!raw) {
    return { raw, value: null, isDebit: false, isCredit: false };
  }

  let currency: string | undefined;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (raw.includes(symbol)) {
      currency = code;
      break;
    }
  }

  // Detect sign & DR/CR markers
  const hasParentheses = raw.startsWith('(') && raw.endsWith(')');
  const hasLeadingMinus = raw.startsWith('-');
  const hasTrailingMinus = raw.endsWith('-');
  const hasDr = DEBIT_MARKER.test(raw);
  const hasCr = CREDIT_MARKER.test(raw);

  const isNegative =
    hasParentheses || hasLeadingMinus || hasTrailingMinus || hasDr;

  // Strip currency symbols and letters, keeping commas and periods
  let numericPart = raw
    .replace(/[$€£₹¥]/gu, '')
    .replace(MARKER_WORDS, '')
    .replace(/[-+\s()]/gu, '');

  if (!numericPart) {
    return { raw, value: null, currency, isDebit: false, isCredit: false };
  }

  let numValue: number | null = null;

  if (convention === 'european') {
    // 1.234,56 -> replace '.' with nothing, replace ',' with '.'
    numericPart = numericPart.replace(/\./gu, '').replace(/,/gu, '.');
    const parsed = Number.parseFloat(numericPart);
    if (!Number.isNaN(parsed)) {
      numValue = isNegative ? -Math.abs(parsed) : Math.abs(parsed);
    }
  } else {
    // Standard US & Indian Lakh: remove commas, parse with standard decimal point
    numericPart = numericPart.replace(/,/gu, '');
    const parsed = Number.parseFloat(numericPart);
    if (!Number.isNaN(parsed)) {
      numValue = isNegative ? -Math.abs(parsed) : Math.abs(parsed);
    }
  }

  return {
    raw,
    value: numValue,
    currency,
    isDebit: hasDr || (numValue !== null && numValue < 0),
    isCredit: hasCr || (numValue !== null && numValue > 0),
  };
}

/** Month name lookup for alphanumeric dates. */
const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/**
 * Detect date format for a column by examining all date values in it.
 * If any day component exceeds 12, the ambiguity between DD/MM and MM/DD is resolved!
 */
export function detectDateFormatForColumn(dateCells: readonly string[]): {
  format: DateFormatPreference;
  isAmbiguous: boolean;
  ambiguousCount: number;
} {
  let dayFirstEvidence = 0;
  let monthFirstEvidence = 0;
  let isoCount = 0;
  let totalSlashOrDashDates = 0;

  for (const raw of dateCells) {
    const text = raw.trim();
    if (!text) continue;

    // ISO format: YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/u.test(text)) {
      isoCount += 1;
      continue;
    }

    // Alphanumeric format with month name: 15-Jan-2026, Jan 15 2026, etc.
    if (/[a-zA-Z]/u.test(text)) {
      // Unambiguous since month is spelled out
      continue;
    }

    // Numeric date: A/B/YYYY or A-B-YYYY or A.B.YYYY
    const match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/u);
    if (match) {
      totalSlashOrDashDates += 1;
      const first = Number.parseInt(match[1]!, 10);
      const second = Number.parseInt(match[2]!, 10);

      if (first > 12 && second <= 12) {
        dayFirstEvidence += 1; // First is definitely Day -> DD/MM/YYYY
      } else if (second > 12 && first <= 12) {
        monthFirstEvidence += 1; // Second is definitely Day -> MM/DD/YYYY
      }
    }
  }

  if (isoCount > totalSlashOrDashDates && isoCount > 0) {
    return { format: 'YYYY-MM-DD', isAmbiguous: false, ambiguousCount: 0 };
  }

  if (dayFirstEvidence > 0 && monthFirstEvidence === 0) {
    return { format: 'DD/MM/YYYY', isAmbiguous: false, ambiguousCount: 0 };
  }

  if (monthFirstEvidence > 0 && dayFirstEvidence === 0) {
    return { format: 'MM/DD/YYYY', isAmbiguous: false, ambiguousCount: 0 };
  }

  if (
    totalSlashOrDashDates > 0 &&
    dayFirstEvidence === 0 &&
    monthFirstEvidence === 0
  ) {
    // Entire column is ambiguous (e.g. all days <= 12)
    return {
      format: 'DD/MM/YYYY',
      isAmbiguous: true,
      ambiguousCount: totalSlashOrDashDates,
    };
  }

  return { format: 'DD/MM/YYYY', isAmbiguous: false, ambiguousCount: 0 };
}

/**
 * Parse a date string into a Date object and ISO representation.
 */
export function parseDate(
  text: string,
  preferredFormat: DateFormatPreference = 'DD/MM/YYYY',
): ParsedDate {
  const raw = text.trim();
  if (!raw) {
    return { raw, date: null, isoDate: null, isAmbiguous: false };
  }

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/u);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1]!, 10);
    const month = Number.parseInt(isoMatch[2]!, 10) - 1;
    const day = Number.parseInt(isoMatch[3]!, 10);
    const d = new Date(Date.UTC(year, month, day));
    return {
      raw,
      date: d,
      isoDate: d.toISOString().slice(0, 10),
      isAmbiguous: false,
    };
  }

  // 2. Named month format: 15-Jan-2026, 15 Jan 2026, Jan 15, 2026
  const namedMatch1 = raw.match(
    /^(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s,]+(\d{2,4})$/u,
  );
  if (namedMatch1) {
    const day = Number.parseInt(namedMatch1[1]!, 10);
    const monthStr = namedMatch1[2]!.toLowerCase();
    let year = Number.parseInt(namedMatch1[3]!, 10);
    if (year < 100) year += 2000;
    const month = (MONTH_NAMES[monthStr] ?? 1) - 1;
    const d = new Date(Date.UTC(year, month, day));
    return {
      raw,
      date: d,
      isoDate: d.toISOString().slice(0, 10),
      isAmbiguous: false,
    };
  }

  const namedMatch2 = raw.match(
    /^([a-zA-Z]{3,9})[-/\s]+(\d{1,2})[-/\s,]+(\d{2,4})$/u,
  );
  if (namedMatch2) {
    const monthStr = namedMatch2[1]!.toLowerCase();
    const day = Number.parseInt(namedMatch2[2]!, 10);
    let year = Number.parseInt(namedMatch2[3]!, 10);
    if (year < 100) year += 2000;
    const month = (MONTH_NAMES[monthStr] ?? 1) - 1;
    const d = new Date(Date.UTC(year, month, day));
    return {
      raw,
      date: d,
      isoDate: d.toISOString().slice(0, 10),
      isAmbiguous: false,
    };
  }

  // 3. Numeric slash or dash format
  const numMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/u);
  if (numMatch) {
    const first = Number.parseInt(numMatch[1]!, 10);
    const second = Number.parseInt(numMatch[2]!, 10);
    let year = Number.parseInt(numMatch[3]!, 10);
    if (year < 100) year += 2000;

    let day: number;
    let month: number;
    let isAmbiguous = false;

    if (first > 12 && second <= 12) {
      day = first;
      month = second - 1;
    } else if (second > 12 && first <= 12) {
      day = second;
      month = first - 1;
    } else {
      isAmbiguous = true;
      if (preferredFormat === 'MM/DD/YYYY') {
        month = first - 1;
        day = second;
      } else {
        day = first;
        month = second - 1;
      }
    }

    const d = new Date(Date.UTC(year, month, day));
    return {
      raw,
      date: d,
      isoDate: d.toISOString().slice(0, 10),
      isAmbiguous,
    };
  }

  return { raw, date: null, isoDate: null, isAmbiguous: false };
}

/**
 * Reconcile a statement's running balance across extracted rows.
 *
 * Checks whether `Balance[i] = Balance[i-1] + Amount[i]`
 * (or handles reverse-chronological order if statements list newest transactions first).
 */
export function reconcileRunningBalance(
  rows: readonly {
    rowIndex: number;
    amount: number | null;
    debit?: number | null;
    credit?: number | null;
    balance?: number | null;
  }[],
): StatementReconciliationReport {
  const validRows = rows.filter((r) => r.balance !== null);

  if (validRows.length < 2) {
    return {
      totalTransactions: rows.length,
      hasBalanceColumn: validRows.length > 0,
      chronologicalDirection: 'undetermined',
      reconciledCount: 0,
      mismatchCount: 0,
      mismatchedRows: [],
    };
  }

  // Helper to compute transaction net effect
  const getNetTx = (r: (typeof rows)[0]): number | null => {
    if (
      r.debit !== null &&
      r.debit !== undefined &&
      r.credit !== null &&
      r.credit !== undefined
    ) {
      return (r.credit ?? 0) - Math.abs(r.debit ?? 0);
    }
    if (r.debit !== null && r.debit !== undefined) {
      return -Math.abs(r.debit);
    }
    if (r.credit !== null && r.credit !== undefined) {
      return Math.abs(r.credit);
    }
    return r.amount;
  };

  // Test Chronological Downward: Balance[i] ≈ Balance[i - 1] + NetTx[i]
  let downMatches = 0;
  const downMismatches: StatementReconciliationReport['mismatchedRows'] = [];

  for (let i = 1; i < validRows.length; i += 1) {
    const prev = validRows[i - 1]!;
    const curr = validRows[i]!;
    const net = getNetTx(curr);

    if (net === null) continue;

    const expectedDelta = net;
    const actualDelta = Math.round((curr.balance! - prev.balance!) * 100) / 100;
    const diff = Math.abs(expectedDelta - actualDelta);

    if (diff < 0.01) {
      downMatches += 1;
    } else {
      downMismatches.push({
        rowIndex: curr.rowIndex,
        expectedDelta,
        actualDelta,
        error: `Expected delta of ${expectedDelta >= 0 ? '+' : ''}${expectedDelta.toFixed(2)}, but balance moved by ${actualDelta >= 0 ? '+' : ''}${actualDelta.toFixed(2)}`,
      });
    }
  }

  // Test Reverse-Chronological Upward: Balance[i - 1] ≈ Balance[i] + NetTx[i - 1]
  let upMatches = 0;
  const upMismatches: StatementReconciliationReport['mismatchedRows'] = [];

  for (let i = 0; i < validRows.length - 1; i += 1) {
    const curr = validRows[i]!;
    const next = validRows[i + 1]!;
    const net = getNetTx(curr);

    if (net === null) continue;

    const expectedDelta = net;
    const actualDelta = Math.round((curr.balance! - next.balance!) * 100) / 100;
    const diff = Math.abs(expectedDelta - actualDelta);

    if (diff < 0.01) {
      upMatches += 1;
    } else {
      upMismatches.push({
        rowIndex: curr.rowIndex,
        expectedDelta,
        actualDelta,
        error: `Expected delta of ${expectedDelta >= 0 ? '+' : ''}${expectedDelta.toFixed(2)}, but balance moved by ${actualDelta >= 0 ? '+' : ''}${actualDelta.toFixed(2)}`,
      });
    }
  }

  const isDown = downMatches >= upMatches;
  const direction =
    downMatches === 0 && upMatches === 0
      ? 'undetermined'
      : isDown
        ? 'chronological'
        : 'reverse-chronological';

  const reconciledCount = isDown ? downMatches : upMatches;
  const mismatchedRows = isDown ? downMismatches : upMismatches;

  return {
    totalTransactions: rows.length,
    hasBalanceColumn: true,
    chronologicalDirection: direction,
    reconciledCount,
    mismatchCount: mismatchedRows.length,
    mismatchedRows,
  };
}
