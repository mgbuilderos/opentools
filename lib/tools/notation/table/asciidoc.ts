import type { Table } from './types';

export function emitAsciiDocTable(table: Table): string {
  const lines: string[] = [];
  if (table.caption) {
    lines.push(`.${table.caption}`);
  }

  const colAlignments = table.headers
    .map((_, i) => {
      const align = table.alignments?.[i];
      if (align === 'center') return '^1';
      if (align === 'right') return '>1';
      return '<1';
    })
    .join(',');

  lines.push(`[cols="${colAlignments}", options="header"]`);
  lines.push('|===');

  lines.push(table.headers.map((h) => `| ${h}`).join(' '));

  for (const row of table.rows) {
    lines.push(row.map((cell) => `| ${cell ?? ''}`).join(' '));
  }

  lines.push('|===');
  return lines.join('\n');
}

export function parseAsciiDocTable(input: string): Table {
  const blockMatch = /\|===([\s\S]*?)\|===/u.exec(input);
  if (!blockMatch) {
    throw new Error('No AsciiDoc table block (|=== ... |===) found in input.');
  }

  let caption: string | undefined;
  const captionMatch = /^\.([^\r\n]+)/mu.exec(input);
  if (captionMatch) {
    caption = captionMatch[1].trim();
  }

  const content = blockMatch[1].trim();
  const rawCells = content
    .split(/(?:^|\s)\|/mu)
    .map((c) => c.trim())
    .filter(Boolean);

  if (rawCells.length === 0) {
    throw new Error('AsciiDoc table contains no cells.');
  }

  // Check [cols="..."] for column count if present
  const colsMatch = /\[cols="([^"]+)"/iu.exec(input);
  let colCount = 0;
  if (colsMatch) {
    colCount = colsMatch[1].split(',').length;
  } else {
    // Infer column count from first line
    const firstLine = content.split(/\r?\n/u)[0] ?? '';
    const pipesInFirstLine = (firstLine.match(/\|/gu) || []).length;
    colCount = pipesInFirstLine > 0 ? pipesInFirstLine : 1;
  }

  if (colCount <= 0 || rawCells.length < colCount) {
    throw new Error('Could not determine column structure of AsciiDoc table.');
  }

  const headers = rawCells.slice(0, colCount);
  const dataCells = rawCells.slice(colCount);
  const rows: string[][] = [];

  for (let i = 0; i < dataCells.length; i += colCount) {
    const row = dataCells.slice(i, i + colCount);
    while (row.length < colCount) {
      row.push('');
    }
    rows.push(row);
  }

  return {
    headers,
    rows,
    caption,
  };
}
