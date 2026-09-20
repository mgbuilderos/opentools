/**
 * Pure client-side Marketer's List Hygiene Engine.
 *
 * Designed specifically for high-stakes contact and customer lists (names, emails,
 * phone numbers) where uploading files to third-party servers presents severe
 * regulatory and data privacy hazards (GDPR, CCPA).
 *
 * Reuses the zero-dependency CSV engine from lib/tools/spreadsheet/csv.ts.
 */

import { parseCsv, toCsv } from '../spreadsheet/csv';

export interface ListTable {
  headers: string[];
  rows: string[][];
}

export interface DeduplicateOptions {
  keyColumnIndex: number;
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
  keep?: 'first' | 'last';
}

export interface DeduplicateResult {
  table: ListTable;
  originalCount: number;
  uniqueCount: number;
  duplicatesRemoved: number;
}

export interface MergeOptions {
  mode: 'union_columns' | 'match_headers';
}

export interface MergeResult {
  table: ListTable;
  totalRowsA: number;
  totalRowsB: number;
  combinedRows: number;
  columnsA: number;
  columnsB: number;
  finalColumns: number;
}

export interface SplitByCountResult {
  chunks: Array<{
    partNumber: number;
    filename: string;
    table: ListTable;
    rowCount: number;
  }>;
}

export interface SplitByColumnResult {
  groups: Array<{
    groupValue: string;
    filename: string;
    table: ListTable;
    rowCount: number;
  }>;
}

export interface CompareOptions {
  keyColumnA: number;
  keyColumnB: number;
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
}

export interface CompareResult {
  inBoth: ListTable;
  onlyInA: ListTable;
  onlyInB: ListTable;
  countA: number;
  countB: number;
  countInBoth: number;
  countOnlyInA: number;
  countOnlyInB: number;
}

export type NormalizeColumnRule =
  | 'trim'
  | 'lowercase'
  | 'uppercase'
  | 'titlecase'
  | 'email'
  | 'phone_digits';

export interface ColumnNormalizer {
  columnIndex: number;
  rule: NormalizeColumnRule;
}

export interface NormalizeOptions {
  rules: ColumnNormalizer[];
}

export interface NormalizeResult {
  table: ListTable;
  cellsModified: number;
}

export const LIST_PRIVACY_NOTICE =
  'Client-Side Privacy Guarantee: Customer and subscriber lists carry high-risk personally identifiable information (PII) including names, emails, and phone numbers. This tool processes your rows entirely inside your local browser memory. No records are sent across any network or stored on any server.';

/**
 * Extracts headers and data rows from raw parsed 2D array.
 */
export function extractListTable(rawRows: string[][]): ListTable {
  if (rawRows.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = [...(rawRows[0] ?? [])];
  const rows = rawRows.slice(1);
  return { headers, rows };
}

/**
 * De-duplicates a list based on a specific key column (or whole row if index is -1).
 */
export function deduplicateList(
  table: ListTable,
  options: DeduplicateOptions,
): DeduplicateResult {
  const {
    keyColumnIndex,
    caseSensitive = false,
    trimWhitespace = true,
    keep = 'first',
  } = options;
  const originalRows = table.rows;
  const originalCount = originalRows.length;

  const seenKeys = new Set<string>();
  const keptRows: string[][] = [];

  const getKey = (row: string[]): string => {
    let key: string;
    if (keyColumnIndex < 0 || keyColumnIndex >= row.length) {
      key = row.join('|~|');
    } else {
      key = row[keyColumnIndex] ?? '';
    }
    if (trimWhitespace) {
      key = key.trim();
    }
    if (!caseSensitive) {
      key = key.toLowerCase();
    }
    return key;
  };

  const rowsToProcess =
    keep === 'last' ? [...originalRows].reverse() : originalRows;

  for (const row of rowsToProcess) {
    const key = getKey(row);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      keptRows.push(row);
    }
  }

  const finalRows = keep === 'last' ? keptRows.reverse() : keptRows;
  const duplicatesRemoved = originalCount - finalRows.length;

  return {
    table: {
      headers: [...table.headers],
      rows: finalRows,
    },
    originalCount,
    uniqueCount: finalRows.length,
    duplicatesRemoved,
  };
}

/**
 * Merges two lists together.
 * In "union_columns" mode, any extra columns from either list are preserved, aligning matching header names.
 * In "match_headers" mode, only columns present in List A are populated from List B.
 */
export function mergeLists(
  tableA: ListTable,
  tableB: ListTable,
  options: MergeOptions = { mode: 'union_columns' },
): MergeResult {
  const headersA = [...tableA.headers];
  const headersB = [...tableB.headers];

  let finalHeaders: string[];
  if (options.mode === 'union_columns') {
    finalHeaders = [...headersA];
    for (const h of headersB) {
      const existing = finalHeaders.some(
        (eh) => eh.trim().toLowerCase() === h.trim().toLowerCase(),
      );
      if (!existing) {
        finalHeaders.push(h);
      }
    }
  } else {
    finalHeaders = [...headersA];
  }

  const createColMap = (srcHeaders: string[]): number[] => {
    return srcHeaders.map((srcH) => {
      const idx = finalHeaders.findIndex(
        (fh) => fh.trim().toLowerCase() === srcH.trim().toLowerCase(),
      );
      return idx;
    });
  };

  const mapA = createColMap(headersA);
  const mapB = createColMap(headersB);

  const combinedRows: string[][] = [];

  const transformRow = (row: string[], colMap: number[]): string[] => {
    const newRow = Array.from({ length: finalHeaders.length }, () => '');
    for (let i = 0; i < row.length; i++) {
      const targetCol = colMap[i];
      if (
        targetCol !== undefined &&
        targetCol >= 0 &&
        targetCol < finalHeaders.length
      ) {
        newRow[targetCol] = row[i] ?? '';
      }
    }
    return newRow;
  };

  for (const row of tableA.rows) {
    combinedRows.push(transformRow(row, mapA));
  }
  for (const row of tableB.rows) {
    combinedRows.push(transformRow(row, mapB));
  }

  return {
    table: {
      headers: finalHeaders,
      rows: combinedRows,
    },
    totalRowsA: tableA.rows.length,
    totalRowsB: tableB.rows.length,
    combinedRows: combinedRows.length,
    columnsA: headersA.length,
    columnsB: headersB.length,
    finalColumns: finalHeaders.length,
  };
}

/**
 * Splits a table into chunks by row count.
 */
export function splitByRowCount(
  table: ListTable,
  rowsPerChunk: number,
  baseFilename = 'list_part',
): SplitByCountResult {
  const chunkSize = Math.max(1, Math.floor(rowsPerChunk));
  const chunks: SplitByCountResult['chunks'] = [];
  const total = table.rows.length;

  for (let i = 0; i < total; i += chunkSize) {
    const partNumber = Math.floor(i / chunkSize) + 1;
    const chunkRows = table.rows.slice(i, i + chunkSize);
    chunks.push({
      partNumber,
      filename: `${baseFilename}_part_${partNumber}.csv`,
      table: {
        headers: [...table.headers],
        rows: chunkRows,
      },
      rowCount: chunkRows.length,
    });
  }

  return { chunks };
}

/**
 * Splits a table into distinct groups based on the value in a specified column.
 */
export function splitByColumnValue(
  table: ListTable,
  columnIndex: number,
  baseFilename = 'list_group',
): SplitByColumnResult {
  const groupsMap = new Map<string, string[][]>();

  for (const row of table.rows) {
    const rawVal = row[columnIndex] ?? '';
    const cleanVal = rawVal.trim();
    const groupKey = cleanVal === '' ? '(blank)' : cleanVal;

    const existing = groupsMap.get(groupKey);
    if (existing) {
      existing.push(row);
    } else {
      groupsMap.set(groupKey, [row]);
    }
  }

  const groups: SplitByColumnResult['groups'] = [];
  for (const [groupValue, rows] of groupsMap.entries()) {
    const safeName = groupValue.replace(/[^\w.-]/gu, '_');
    groups.push({
      groupValue,
      filename: `${baseFilename}_${safeName}.csv`,
      table: {
        headers: [...table.headers],
        rows,
      },
      rowCount: rows.length,
    });
  }

  groups.sort((a, b) => a.groupValue.localeCompare(b.groupValue));

  return { groups };
}

/**
 * Compares two lists based on matching key columns.
 * Returns records in both (intersection), in A only, and in B only.
 */
export function compareLists(
  tableA: ListTable,
  tableB: ListTable,
  options: CompareOptions,
): CompareResult {
  const {
    keyColumnA,
    keyColumnB,
    caseSensitive = false,
    trimWhitespace = true,
  } = options;

  const normalizeKey = (val: string): string => {
    let res = trimWhitespace ? val.trim() : val;
    if (!caseSensitive) res = res.toLowerCase();
    return res;
  };

  const setB = new Set<string>();
  for (const row of tableB.rows) {
    const keyVal = row[keyColumnB] ?? '';
    setB.add(normalizeKey(keyVal));
  }

  const setA = new Set<string>();
  for (const row of tableA.rows) {
    const keyVal = row[keyColumnA] ?? '';
    setA.add(normalizeKey(keyVal));
  }

  const inBothRows: string[][] = [];
  const onlyInARows: string[][] = [];

  for (const row of tableA.rows) {
    const key = normalizeKey(row[keyColumnA] ?? '');
    if (setB.has(key)) {
      inBothRows.push(row);
    } else {
      onlyInARows.push(row);
    }
  }

  const onlyInBRows: string[][] = [];
  for (const row of tableB.rows) {
    const key = normalizeKey(row[keyColumnB] ?? '');
    if (!setA.has(key)) {
      onlyInBRows.push(row);
    }
  }

  return {
    inBoth: {
      headers: [...tableA.headers],
      rows: inBothRows,
    },
    onlyInA: {
      headers: [...tableA.headers],
      rows: onlyInARows,
    },
    onlyInB: {
      headers: [...tableB.headers],
      rows: onlyInBRows,
    },
    countA: tableA.rows.length,
    countB: tableB.rows.length,
    countInBoth: inBothRows.length,
    countOnlyInA: onlyInARows.length,
    countOnlyInB: onlyInBRows.length,
  };
}

/**
 * Normalizes text in cells based on targeted column rules.
 */
export function normalizeList(
  table: ListTable,
  options: NormalizeOptions,
): NormalizeResult {
  const newRows: string[][] = [];
  let cellsModified = 0;

  for (const row of table.rows) {
    const newRow = [...row];
    for (const { columnIndex, rule } of options.rules) {
      if (columnIndex < 0 || columnIndex >= newRow.length) continue;
      const original = newRow[columnIndex] ?? '';
      let transformed = original;

      switch (rule) {
        case 'trim':
          transformed = original.trim();
          break;
        case 'lowercase':
          transformed = original.toLowerCase();
          break;
        case 'uppercase':
          transformed = original.toUpperCase();
          break;
        case 'titlecase':
          // Trim and capitalize first letter of each word
          transformed = original
            .trim()
            .toLowerCase()
            .replace(/(?:^|[\s\p{P}])\p{L}/gu, (match) => match.toUpperCase());
          break;
        case 'email':
          transformed = original.trim().toLowerCase().replace(/\s+/gu, '');
          break;
        case 'phone_digits': {
          const hasPlus = original.trim().startsWith('+');
          const digits = original.replace(/\D/gu, '');
          transformed = hasPlus ? `+${digits}` : digits;
          break;
        }
      }

      if (transformed !== original) {
        cellsModified++;
        newRow[columnIndex] = transformed;
      }
    }
    newRows.push(newRow);
  }

  return {
    table: {
      headers: [...table.headers],
      rows: newRows,
    },
    cellsModified,
  };
}

/**
 * Helper to serialize a ListTable to CSV string with standard Excel BOM and CRLF.
 */
export function serializeListTable(table: ListTable): string {
  const fullRows = [table.headers, ...table.rows];
  return toCsv(fullRows, { byteOrderMark: true, lineEnding: '\r\n' });
}

/**
 * Helper to parse a raw CSV string into a ListTable.
 */
export function parseListTable(csvText: string, delimiter = ','): ListTable {
  const rawRows = parseCsv(csvText, delimiter);
  return extractListTable(rawRows);
}
