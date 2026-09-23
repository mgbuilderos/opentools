import { emitAsciiDocTable, parseAsciiDocTable } from './asciidoc';
import { emitCsv, parseCsv } from './csv';
import { emitHtmlTable, parseHtmlTable } from './html';
import { emitJsonTable, parseJsonTable } from './json';
import { emitLatexTable, parseLatexTable } from './latex';
import { emitMarkdownTable, parseMarkdownTable } from './markdown';
import { emitRstTable, parseRstTable } from './rst';
import { emitSqlTable, parseSqlTable } from './sql';
import { emitXmlTable, parseXmlTable } from './xml';
import { emitYamlTable, parseYamlTable } from './yaml';
import type { Table, TableEmitOptions, TableFormat } from './types';

export * from './types';
export * from './asciidoc';
export * from './csv';
export * from './html';
export * from './json';
export * from './latex';
export * from './markdown';
export * from './rst';
export * from './sql';
export * from './xml';
export * from './yaml';

export function detectTableFormat(input: string): TableFormat {
  const trimmed = input.trim();
  if (
    /^<table\b/iu.test(trimmed) ||
    /<table\b[^>]*>[\s\S]*?<\/table>/iu.test(trimmed)
  ) {
    return 'html';
  }
  if (/\\begin\{(?:tabular|longtable|table)\}/u.test(trimmed)) {
    return 'latex';
  }
  // After the HTML check on purpose: an HTML table is also well-formed XML,
  // and the caller who pasted `<table>` meant HTML.
  if (
    /^<\?xml\b/iu.test(trimmed) ||
    /^<[A-Za-z_][\w.:-]*[\s>/]/u.test(trimmed)
  ) {
    return 'xml';
  }
  if (/^\[[\s\S]*\]$/u.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not JSON
    }
  }
  if (/INSERT\s+INTO\s+["`[]?\w+["`\]]?/iu.test(trimmed)) {
    return 'sql';
  }
  if (/\|===[\s\S]*?\|===/u.test(trimmed)) {
    return 'asciidoc';
  }
  if (/^[=\s]+$/mu.test(trimmed) && trimmed.includes('===')) {
    return 'rst';
  }
  if (/\|[^\r\n]+\|[\r\n]+\|[ :-]+[-| ]+\|/u.test(trimmed)) {
    return 'markdown';
  }
  // A sequence of mappings, which is the only YAML shape a table can be.
  if (
    /^\s*-\s+(?:"[^"\n]*"|'[^'\n]*'|[^\s:#][^:\n]*):(?:\s|$)/mu.test(trimmed)
  ) {
    return 'yaml';
  }
  if (trimmed.includes('\t')) {
    return 'tsv';
  }
  return 'csv';
}

export function parseTable(
  input: string,
  format?: TableFormat | 'auto',
): Table {
  const resolvedFormat =
    !format || format === 'auto' ? detectTableFormat(input) : format;

  switch (resolvedFormat) {
    case 'csv':
      return parseCsv(input);
    case 'tsv':
      return parseCsv(input, '\t');
    case 'markdown':
      return parseMarkdownTable(input);
    case 'latex':
      return parseLatexTable(input);
    case 'html':
      return parseHtmlTable(input);
    case 'json':
      return parseJsonTable(input);
    case 'sql':
      return parseSqlTable(input);
    case 'asciidoc':
      return parseAsciiDocTable(input);
    case 'rst':
      return parseRstTable(input);
    case 'yaml':
      return parseYamlTable(input);
    case 'xml':
      return parseXmlTable(input);
    default:
      return parseCsv(input);
  }
}

export function emitTable(
  table: Table,
  format: TableFormat,
  options: TableEmitOptions = {},
): string {
  switch (format) {
    case 'csv':
      return emitCsv(table, options.delimiter ?? ',');
    case 'tsv':
      return emitCsv(table, '\t');
    case 'markdown':
      return emitMarkdownTable(table);
    case 'latex':
      return emitLatexTable(table, options.latex);
    case 'html':
      return emitHtmlTable(table);
    case 'json':
      return emitJsonTable(table, options.json);
    case 'sql':
      return emitSqlTable(table, options.sql);
    case 'asciidoc':
      return emitAsciiDocTable(table);
    case 'rst':
      return emitRstTable(table);
    case 'yaml':
      return emitYamlTable(table);
    case 'xml':
      return emitXmlTable(table);
    default:
      throw new Error(`Unsupported table output format: ${String(format)}`);
  }
}

export function convertTable(
  input: string,
  from: TableFormat | 'auto' = 'auto',
  to: TableFormat = 'markdown',
  options: TableEmitOptions = {},
): string {
  const table = parseTable(input, from);
  return emitTable(table, to, options);
}
