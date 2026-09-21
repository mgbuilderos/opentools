import type { Table, TableAlignment } from './types';

export function parseMarkdownTable(input: string): Table {
  const lines = input
    .split(/\r?\n/u)
    .map((l) => l.trim())
    .filter(Boolean);

  const tableLines = lines.filter((line) => line.includes('|'));
  if (tableLines.length < 2) {
    throw new Error(
      'Markdown table requires at least a header row and a delimiter row (e.g. |---|---|).',
    );
  }

  const splitRow = (line: string): string[] => {
    let raw = line;
    if (raw.startsWith('|')) raw = raw.slice(1);
    if (raw.endsWith('|')) raw = raw.slice(0, -1);
    // Split by | while ignoring escaped \|
    const cells: string[] = [];
    let current = '';
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === '\\' && raw[i + 1] === '|') {
        current += '|';
        i++;
      } else if (c === '|') {
        cells.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = splitRow(tableLines[0]);
  const delimiterRow = splitRow(tableLines[1]);

  const isDelimiter = delimiterRow.every((cell) =>
    /^:?-+:?$/u.test(cell.trim()),
  );
  if (!isDelimiter) {
    throw new Error(
      'Second row must be a valid markdown table delimiter row (e.g. |:---|:---:|---:|).',
    );
  }

  const alignments: TableAlignment[] = delimiterRow.map((cell) => {
    const trimmed = cell.trim();
    const left = trimmed.startsWith(':');
    const right = trimmed.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });

  const dataLines = tableLines.slice(2);
  const rows: string[][] = [];

  for (let idx = 0; idx < dataLines.length; idx++) {
    const row = splitRow(dataLines[idx]);
    if (row.length !== headers.length) {
      throw new Error(
        `Ragged Markdown table row at line ${idx + 3}: expected ${headers.length} columns, found ${row.length}.`,
      );
    }
    rows.push(row);
  }

  return {
    headers,
    rows,
    alignments,
  };
}

export function emitMarkdownTable(table: Table): string {
  const escapeMarkdownPipe = (val: string) => val.replace(/\|/gu, '\\|');
  const colCount = table.headers.length;
  const colWidths = Array.from({ length: colCount }, () => 3);

  for (let i = 0; i < colCount; i++) {
    colWidths[i] = Math.max(colWidths[i], escapeMarkdownPipe(table.headers[i] ?? '').length);
  }

  for (const row of table.rows) {
    for (let i = 0; i < colCount; i++) {
      colWidths[i] = Math.max(colWidths[i], escapeMarkdownPipe(row[i] ?? '').length);
    }
  }

  const pad = (str: string, width: number, align: TableAlignment = 'left') => {
    const diff = width - str.length;
    if (diff <= 0) return str;
    if (align === 'center') {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' '.repeat(left) + str + ' '.repeat(right);
    }
    if (align === 'right') {
      return ' '.repeat(diff) + str;
    }
    return str + ' '.repeat(diff);
  };

  const headerStr =
    '| ' +
    table.headers
      .map((h, i) =>
        pad(
          escapeMarkdownPipe(h),
          colWidths[i],
          table.alignments?.[i] ?? 'left',
        ),
      )
      .join(' | ') +
    ' |';

  const delimiterStr =
    '| ' +
    colWidths
      .map((w, i) => {
        const align = table.alignments?.[i] ?? 'left';
        if (align === 'center')
          return ':' + '-'.repeat(Math.max(1, w - 2)) + ':';
        if (align === 'right') return '-'.repeat(Math.max(2, w - 1)) + ':';
        return ':' + '-'.repeat(Math.max(2, w - 1));
      })
      .join(' | ') +
    ' |';

  const rowStrs = table.rows.map(
    (row) =>
      '| ' +
      row
        .map((cell, i) =>
          pad(
            escapeMarkdownPipe(cell ?? ''),
            colWidths[i],
            table.alignments?.[i] ?? 'left',
          ),
        )
        .join(' | ') +
      ' |',
  );

  return [headerStr, delimiterStr, ...rowStrs].join('\n');
}
