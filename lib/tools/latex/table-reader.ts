/**
 * LaTeX table reader and multi-format converter.
 *
 * Reuses the canonical notation table engine in `lib/tools/notation/table/`.
 */

import {
  emitTable,
  parseLatexTable,
  type Table,
  type TableFormat,
} from '@/lib/tools/notation/table';

export interface LatexTableConversionResult {
  table: Table;
  csv: string;
  tsv: string;
  markdown: string;
  json: string;
  html: string;
  sql: string;
  metrics: {
    rowCount: number;
    colCount: number;
    hasHeaders: boolean;
  };
}

/**
 * Reads a LaTeX table string and converts it to multiple target notation formats.
 */
export function readLatexTable(input: string): LatexTableConversionResult {
  const table = parseLatexTable(input);
  const rowCount = table.rows.length;
  const colCount = Math.max(
    table.headers.length,
    ...table.rows.map((r) => r.length),
    0,
  );

  return {
    table,
    csv: emitTable(table, 'csv'),
    tsv: emitTable(table, 'tsv'),
    markdown: emitTable(table, 'markdown'),
    json: emitTable(table, 'json'),
    html: emitTable(table, 'html'),
    sql: emitTable(table, 'sql'),
    metrics: {
      rowCount,
      colCount,
      hasHeaders: table.headers.length > 0,
    },
  };
}

/**
 * Converts a table to any specific target format.
 */
export function convertLatexTableTo(
  input: string,
  format: TableFormat,
): string {
  const table = parseLatexTable(input);
  return emitTable(table, format);
}
