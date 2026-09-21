import type { Table, TableAlignment } from './types';

export function sniffDelimiter(content: string): string {
  const firstLines = content
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .slice(0, 5);
  if (firstLines.length === 0) return ',';

  const candidates = [',', '\t', ';', '|'];
  const scores = candidates.map((delim) => {
    let count = 0;
    let consistent = true;
    let firstCount = -1;
    for (const line of firstLines) {
      const lineCount = countOccurrencesOutsideQuotes(line, delim);
      if (firstCount === -1) {
        firstCount = lineCount;
      } else if (lineCount !== firstCount || lineCount === 0) {
        consistent = false;
      }
      count += lineCount;
    }
    return { delim, score: consistent && firstCount > 0 ? count * 10 : count };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].delim : ',';
}

function countOccurrencesOutsideQuotes(line: string, char: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === char && !inQuotes) {
      count++;
    }
  }
  return count;
}

export function parseCsv(input: string, explicitDelimiter?: string): Table {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('CSV input is empty.');
  }

  const delimiter = explicitDelimiter ?? sniffDelimiter(input);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((c) => c.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    throw new Error('No tabular data found in CSV.');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Pad ragged rows to header length or normalize
  const maxCols = Math.max(headers.length, ...dataRows.map((r) => r.length));
  while (headers.length < maxCols) {
    headers.push(`Column_${headers.length + 1}`);
  }
  for (const r of dataRows) {
    while (r.length < headers.length) {
      r.push('');
    }
  }

  const alignments: TableAlignment[] = headers.map((_, colIndex) => {
    let numericCount = 0;
    let totalNonEmpty = 0;
    for (const r of dataRows) {
      const val = r[colIndex]?.trim();
      if (!val) continue;
      totalNonEmpty++;
      if (/^-?\d+(?:\.\d+)?$/u.test(val)) {
        numericCount++;
      }
    }
    if (totalNonEmpty > 0 && numericCount === totalNonEmpty) {
      return 'right';
    }
    return 'left';
  });

  return {
    headers,
    rows: dataRows,
    alignments,
  };
}

export function emitCsv(table: Table, delimiter = ','): string {
  const escapeCell = (cell: string) => {
    if (
      cell.includes(delimiter) ||
      cell.includes('"') ||
      cell.includes('\n') ||
      cell.includes('\r')
    ) {
      return `"${cell.replace(/"/gu, '""')}"`;
    }
    return cell;
  };

  const lines: string[] = [];
  lines.push(table.headers.map(escapeCell).join(delimiter));
  for (const row of table.rows) {
    lines.push(row.map(escapeCell).join(delimiter));
  }
  return lines.join('\n');
}
