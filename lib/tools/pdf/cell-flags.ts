/**
 * Saying which cells need a human, and why.
 *
 * The paid converters put a percentage on the page — "97% accurate" — and it
 * is not a measurement of your document, because they cannot measure your
 * document. It is a number from their marketing. `/pdf/to-excel` does not do
 * that, and the Pipeline 2 brief forbids it outright.
 *
 * What this does instead is name every cell that has something checkable wrong
 * with it, in the words a bookkeeper would use. Six flagged cells with reasons
 * is worth more than "94%", because you can act on it: each flag points at one
 * cell, and most of them point at the same root cause — a column boundary in
 * the wrong place, which is the thing the grid overlay lets you drag.
 *
 * Every flag below is a **fact about the extracted text**, never a guess about
 * quality. A cell is flagged because two numbers are in it, or because a date
 * column holds something that is not a date, or because the running balance
 * does not continue — each one checkable by the reader, and each one wrong to
 * report if it is not true.
 */

import {
  parseAmount,
  parseDate,
  type DateFormatPreference,
  type NumberConvention,
  type StatementReconciliationReport,
} from './statement-values';

export type ColumnRole =
  | 'date'
  | 'description'
  | 'debit'
  | 'credit'
  | 'amount'
  | 'balance'
  | 'ignore';

export type CellFlagReason =
  | 'two-values-in-one-cell'
  | 'not-a-number'
  | 'not-a-date'
  | 'missing-date'
  | 'balance-does-not-continue';

export interface CellFlag {
  rowIndex: number;
  /** `-1` when the flag is about the whole row rather than one cell. */
  columnIndex: number;
  reason: CellFlagReason;
  /** Plain language, addressed to the person reading the table. */
  message: string;
}

/** Two separate figures in one cell, e.g. `1,100.00 4,550.00`. */
const TWO_FIGURES =
  /\d[\d.,]*\s{1,}[+\-($€£₹¥]?\s?\d[\d.,]*(?:\s*(?:cr|dr))?\s*$/iu;

const MONEY_ROLES: ReadonlySet<ColumnRole> = new Set<ColumnRole>([
  'debit',
  'credit',
  'amount',
  'balance',
]);

/**
 * Flag the cells worth a second look.
 *
 * `reconciliation` is optional because a statement without a balance column
 * cannot be reconciled, and absence of that check is not a defect to report.
 */
export function flagCells(
  rows: readonly (readonly string[])[],
  roles: readonly ColumnRole[],
  options: {
    convention: NumberConvention;
    dateFormat: DateFormatPreference;
    reconciliation?: StatementReconciliationReport | null;
  },
): CellFlag[] {
  const flags: CellFlag[] = [];

  rows.forEach((row, rowIndex) => {
    roles.forEach((role, columnIndex) => {
      if (role === 'ignore' || role === 'description') return;
      const raw = (row[columnIndex] ?? '').trim();

      if (MONEY_ROLES.has(role)) {
        if (raw.length === 0) return; // a blank debit on a credit line is normal
        if (TWO_FIGURES.test(raw)) {
          flags.push({
            rowIndex,
            columnIndex,
            reason: 'two-values-in-one-cell',
            message:
              `Two figures ended up in one cell ("${raw}"). ` +
              'A column divider is probably in the wrong place — drag it on the page view to split them.',
          });
          return;
        }
        const parsed = parseAmount(raw, options.convention);
        if (parsed.value === null) {
          flags.push({
            rowIndex,
            columnIndex,
            reason: 'not-a-number',
            message: `"${raw}" could not be read as an amount, so this cell will export as text.`,
          });
        }
        return;
      }

      if (role === 'date') {
        if (raw.length === 0) {
          flags.push({
            rowIndex,
            columnIndex,
            reason: 'missing-date',
            message:
              'This row has no date. It may be the second line of the row above, ' +
              'or the date may have landed in the column beside this one.',
          });
          return;
        }
        // Day-first versus month-first is NOT flagged per cell. Any date
        // whose day is 12 or under is ambiguous, which is most of them, so a
        // per-cell flag would fire on half the statement and bury the real
        // problems. The page asks about date order once, for the whole
        // document, which is the right place for a question with one answer.
        if (parseDate(raw, options.dateFormat).date === null) {
          flags.push({
            rowIndex,
            columnIndex,
            reason: 'not-a-date',
            message: `"${raw}" could not be read as a date, so this cell will export as text.`,
          });
        }
      }
    });
  });

  // The balance check is the strongest signal on the page, because it is the
  // document checking itself: every row's balance should be the row before it
  // plus that row's movement. Where it does not, something was misread.
  const balanceColumn = roles.indexOf('balance');
  for (const mismatch of options.reconciliation?.mismatchedRows ?? []) {
    flags.push({
      rowIndex: mismatch.rowIndex,
      columnIndex: balanceColumn,
      reason: 'balance-does-not-continue',
      message:
        'The running balance does not continue from the row above. ' +
        `The balance moved by ${formatDelta(mismatch.actualDelta)} but this row's ` +
        `debit and credit add up to ${formatDelta(mismatch.expectedDelta)}.`,
    });
  }

  return flags.sort(
    (a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex,
  );
}

function formatDelta(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/**
 * One line for the facts panel, or `null` when nothing is flagged.
 *
 * Deliberately a count and a cause, never a score. "6 cells need a look"
 * is checkable; "94% confidence" is not.
 */
export function summariseFlags(flags: readonly CellFlag[]): string | null {
  if (flags.length === 0) return null;
  const rows = new Set(flags.map((flag) => flag.rowIndex)).size;
  const cells = flags.length === 1 ? '1 cell' : `${flags.length} cells`;
  const verb = flags.length === 1 ? 'needs' : 'need';
  const rowText = rows === 1 ? '1 row' : `${rows} rows`;
  return `${cells} across ${rowText} ${verb} a look before you export.`;
}
