import type { Table, TableAlignment } from './types';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

export function unescapeHtml(value: string): string {
  return value
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&amp;/gu, '&')
    .replace(/&nbsp;/gu, ' ');
}

export function emitHtmlTable(table: Table): string {
  const lines: string[] = ['<table>'];
  if (table.caption) {
    lines.push(`  <caption>${escapeHtml(table.caption)}</caption>`);
  }

  // thead
  lines.push('  <thead>');
  lines.push('    <tr>');
  for (let i = 0; i < table.headers.length; i++) {
    const header = table.headers[i];
    const align = table.alignments?.[i];
    const alignAttr = align ? ` style="text-align: ${align};"` : '';
    lines.push(`      <th${alignAttr}>${escapeHtml(header)}</th>`);
  }
  lines.push('    </tr>');
  lines.push('  </thead>');

  // tbody
  lines.push('  <tbody>');
  for (const row of table.rows) {
    lines.push('    <tr>');
    for (let i = 0; i < table.headers.length; i++) {
      const cell = row[i] ?? '';
      const align = table.alignments?.[i];
      const alignAttr = align ? ` style="text-align: ${align};"` : '';
      lines.push(`      <td${alignAttr}>${escapeHtml(cell)}</td>`);
    }
    lines.push('    </tr>');
  }
  lines.push('  </tbody>');
  lines.push('</table>');

  return lines.join('\n');
}

export function parseHtmlTable(input: string): Table {
  const tableMatch = /<table\b[^>]*>([\s\S]*?)<\/table>/iu.exec(input);
  const tableContent = tableMatch ? tableMatch[1] : input;

  let caption: string | undefined;
  const captionMatch = /<caption\b[^>]*>([\s\S]*?)<\/caption>/iu.exec(
    tableContent,
  );
  if (captionMatch) {
    caption = unescapeHtml(captionMatch[1].replace(/<[^>]+>/gu, '').trim());
  }

  const rows: string[][] = [];
  const alignments: TableAlignment[] = [];

  const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/giu;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(tableContent)) !== null) {
    const rowContent = trMatch[1];
    const cells: string[] = [];
    const cellRegex = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/giu;
    let cellMatch: RegExpExecArray | null;

    let colIndex = 0;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[2];
      const rawText = cellMatch[3].replace(/<[^>]+>/gu, '').trim();
      cells.push(unescapeHtml(rawText));

      if (rows.length === 0) {
        if (
          /text-align:\s*center/iu.test(attrs) ||
          /align=["']center["']/iu.test(attrs)
        ) {
          alignments[colIndex] = 'center';
        } else if (
          /text-align:\s*right/iu.test(attrs) ||
          /align=["']right["']/iu.test(attrs)
        ) {
          alignments[colIndex] = 'right';
        } else {
          alignments[colIndex] = 'left';
        }
      }
      colIndex++;
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) {
    throw new Error('No rows found in HTML table.');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return {
    headers,
    rows: dataRows,
    alignments: alignments.length === headers.length ? alignments : undefined,
    caption,
  };
}
