import type { LatexEmitOptions, Table, TableAlignment } from './types';

export function escapeLatex(value: string): string {
  const escapes: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '#': '\\#',
    $: '\\$',
    '%': '\\%',
    '&': '\\&',
    _: '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };
  return Array.from(value, (char) => escapes[char] ?? char).join('');
}

export function unescapeLatex(value: string): string {
  return value
    .replace(/\\textbackslash\{\}/gu, '\\')
    .replace(/\\textasciitilde\{\}/gu, '~')
    .replace(/\\textasciicircum\{\}/gu, '^')
    .replace(/\\([#$%&_{}])/gu, '$1');
}

export function emitLatexTable(
  table: Table,
  options: LatexEmitOptions = {},
): string {
  const style = options.style ?? 'booktabs';
  const env =
    options.environment ??
    (table.caption || options.caption ? 'table' : 'plain');
  const placement = options.placement ? `[${options.placement}]` : '';
  const caption = options.caption ?? table.caption;
  const label = options.label ?? table.label;
  const useSiunitx = options.useSiunitx ?? false;

  // Build column spec
  const colSpec = table.headers
    .map((_, i) => {
      const align = table.alignments?.[i] ?? 'left';
      if (useSiunitx && align === 'decimal') return 'S';
      if (align === 'center') return 'c';
      if (align === 'right') return 'r';
      return 'l';
    })
    .join('');

  const rowToLatex = (cells: string[]) =>
    `${cells.map((c) => escapeLatex(c ?? '')).join(' & ')} \\\\`;

  const lines: string[] = [];

  if (env === 'table' || env === 'table*') {
    lines.push(`\\begin{${env}}${placement}`);
    lines.push('  \\centering');
    if (caption) {
      lines.push(`  \\caption{${escapeLatex(caption)}}`);
    }
    if (label) {
      lines.push(`  \\label{${label}}`);
    }
  }

  if (env === 'longtable') {
    lines.push(`\\begin{longtable}{${colSpec}}`);
    if (caption) {
      lines.push(
        `  \\caption{${escapeLatex(caption)}}${label ? `\\label{${label}}` : ''} \\\\`,
      );
    }
    if (style === 'booktabs') {
      lines.push('  \\toprule');
      lines.push(`  ${rowToLatex(table.headers)}`);
      lines.push('  \\midrule');
      lines.push('  \\endfirsthead');
      lines.push('  \\midrule');
      lines.push(`  ${rowToLatex(table.headers)}`);
      lines.push('  \\midrule');
      lines.push('  \\endhead');
      lines.push('  \\bottomrule');
      lines.push('  \\endfoot');
    } else {
      lines.push('  \\hline');
      lines.push(`  ${rowToLatex(table.headers)}`);
      lines.push('  \\hline');
      lines.push('  \\endfirsthead');
      lines.push('  \\hline');
      lines.push(`  ${rowToLatex(table.headers)}`);
      lines.push('  \\hline');
      lines.push('  \\endhead');
      lines.push('  \\hline');
      lines.push('  \\endfoot');
    }
    for (const r of table.rows) {
      lines.push(`  ${rowToLatex(r)}`);
    }
    if (style === 'booktabs') {
      lines.push('  \\bottomrule');
    } else {
      lines.push('  \\hline');
    }
    lines.push('\\end{longtable}');
  } else {
    const indent = env === 'table' || env === 'table*' ? '  ' : '';
    lines.push(`${indent}\\begin{tabular}{${colSpec}}`);
    if (style === 'booktabs') {
      lines.push(`${indent}  \\toprule`);
      lines.push(`${indent}  ${rowToLatex(table.headers)}`);
      lines.push(`${indent}  \\midrule`);
      for (const r of table.rows) {
        lines.push(`${indent}  ${rowToLatex(r)}`);
      }
      lines.push(`${indent}  \\bottomrule`);
    } else {
      lines.push(`${indent}  \\hline`);
      lines.push(`${indent}  ${rowToLatex(table.headers)}`);
      lines.push(`${indent}  \\hline`);
      for (const r of table.rows) {
        lines.push(`${indent}  ${rowToLatex(r)}`);
      }
      lines.push(`${indent}  \\hline`);
    }
    lines.push(`${indent}\\end{tabular}`);
  }

  if (env === 'table' || env === 'table*') {
    lines.push(`\\end{${env}}`);
  }

  return lines.join('\n');
}

export function parseLatexTable(input: string): Table {
  let caption: string | undefined;
  let label: string | undefined;

  const captionMatch = /\\caption\{([^}]*)\}/u.exec(input);
  if (captionMatch) {
    caption = unescapeLatex(captionMatch[1]);
  }

  const labelMatch = /\\label\{([^}]*)\}/u.exec(input);
  if (labelMatch) {
    label = labelMatch[1].trim();
  }

  // Find tabular or longtable environment
  const tableEnvMatch =
    /\\begin\{(?:tabular|longtable)\}\s*\{([^}]*)\}([\s\S]*?)\\end\{(?:tabular|longtable)\}/u.exec(
      input,
    );
  if (!tableEnvMatch) {
    throw new Error(
      'No \\begin{tabular} or \\begin{longtable} environment found in LaTeX input.',
    );
  }

  const colSpecRaw = tableEnvMatch[1].trim();
  const body = tableEnvMatch[2];

  const alignments: TableAlignment[] = [];
  for (const c of colSpecRaw) {
    if (c === 'l') alignments.push('left');
    else if (c === 'c') alignments.push('center');
    else if (c === 'r') alignments.push('right');
    else if (c === 'S') alignments.push('decimal');
  }

  // Split rows on \\ (depth-aware of braces)
  const rawRows: string[] = [];
  let currentRow = '';
  let braceDepth = 0;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    const nextChar = body[i + 1];

    if (char === '{') braceDepth++;
    else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);

    if (char === '\\' && nextChar === '\\' && braceDepth === 0) {
      rawRows.push(currentRow.trim());
      currentRow = '';
      i++; // skip next slash
    } else {
      currentRow += char;
    }
  }
  if (currentRow.trim()) {
    rawRows.push(currentRow.trim());
  }

  const cleanedRows: string[][] = [];

  for (const rowText of rawRows) {
    // Filter out LaTeX rule commands and headers/footers
    const lineWithoutCommands = rowText
      .replace(
        /\\(?:toprule|midrule|bottomrule|hline|endfirsthead|endhead|endfoot|endlastfoot)\b/gu,
        '',
      )
      .trim();

    if (!lineWithoutCommands) continue;

    // Split row cells by & (respecting braces)
    const cells: string[] = [];
    let curCell = '';
    let depth = 0;
    for (let i = 0; i < lineWithoutCommands.length; i++) {
      const c = lineWithoutCommands[i];
      if (c === '{') depth++;
      else if (c === '}') depth = Math.max(0, depth - 1);

      if (c === '&' && depth === 0) {
        cells.push(unescapeLatex(curCell.trim()));
        curCell = '';
      } else {
        curCell += c;
      }
    }
    cells.push(unescapeLatex(curCell.trim()));
    cleanedRows.push(cells);
  }

  if (cleanedRows.length === 0) {
    throw new Error('No rows found in LaTeX table.');
  }

  const headers = cleanedRows[0];
  const rows = cleanedRows.slice(1);

  return {
    headers,
    rows,
    alignments: alignments.length === headers.length ? alignments : undefined,
    caption,
    label,
  };
}
