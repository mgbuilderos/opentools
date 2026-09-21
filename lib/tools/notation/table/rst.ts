import type { Table } from './types';

export function emitRstTable(table: Table): string {
  const colCount = table.headers.length;
  const colWidths = new Array<number>(colCount).fill(3);

  for (let i = 0; i < colCount; i++) {
    colWidths[i] = Math.max(colWidths[i], table.headers[i]?.length ?? 0);
  }
  for (const row of table.rows) {
    for (let i = 0; i < colCount; i++) {
      colWidths[i] = Math.max(colWidths[i], row[i]?.length ?? 0);
    }
  }

  const border = colWidths.map((w) => '='.repeat(w)).join('  ');
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));

  const lines: string[] = [];
  lines.push(border);
  lines.push(table.headers.map((h, i) => pad(h, colWidths[i])).join('  '));
  lines.push(border);
  for (const row of table.rows) {
    lines.push(row.map((cell, i) => pad(cell ?? '', colWidths[i])).join('  '));
  }
  lines.push(border);

  return lines.join('\n');
}

export function parseRstTable(input: string): Table {
  const lines = input
    .split(/\r?\n/u)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length < 4) {
    throw new Error('reStructuredText table requires at least 4 lines (border, header, border, rows, border).');
  }

  // Find border lines (lines consisting only of '=' and spaces)
  const borderIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^[=\s]+$/u.test(lines[i]) && lines[i].includes('=')) {
      borderIndices.push(i);
    }
  }

  if (borderIndices.length < 3) {
    throw new Error('Could not find reStructuredText simple table delimiter borders (=== ===).');
  }

  const borderLine = lines[borderIndices[0]];
  // Find column spans based on sequence of '='
  const colRanges: { start: number; end: number }[] = [];
  let start = -1;
  for (let i = 0; i < borderLine.length; i++) {
    if (borderLine[i] === '=' && start === -1) {
      start = i;
    } else if ((borderLine[i] === ' ' || i === borderLine.length - 1) && start !== -1) {
      const end = borderLine[i] === '=' ? i + 1 : i;
      colRanges.push({ start, end });
      start = -1;
    }
  }

  const extractCells = (line: string): string[] => {
    return colRanges.map((range) => {
      if (range.start >= line.length) return '';
      return line.slice(range.start, Math.min(line.length, range.end)).trim();
    });
  };

  const headerLine = lines[borderIndices[0] + 1];
  const headers = extractCells(headerLine);

  const rows: string[][] = [];
  for (let i = borderIndices[1] + 1; i < borderIndices[2]; i++) {
    rows.push(extractCells(lines[i]));
  }

  return {
    headers,
    rows,
  };
}
