/**
 * LaTeX Matrix and Equation environment builder.
 *
 * Emits standard LaTeX for matrices, piecewise cases, and aligned systems.
 */

export type MatrixType =
  | 'pmatrix'
  | 'bmatrix'
  | 'Bmatrix'
  | 'vmatrix'
  | 'Vmatrix'
  | 'matrix';

export interface MatrixOptions {
  type: MatrixType;
  rows: number;
  cols: number;
  data: string[][]; // rows x cols
}

export interface CasesItem {
  expression: string;
  condition: string;
}

export interface AlignedItem {
  left: string;
  relation: string; // e.g. '=', '<=', '\approx'
  right: string;
  comment?: string;
}

/**
 * Builds a LaTeX matrix environment string.
 */
export function buildLatexMatrix(options: MatrixOptions): string {
  const { type, data } = options;
  if (!data || data.length === 0) return `\\begin{${type}}\n\\end{${type}}`;

  const rows = data.map((row) => {
    const cells = row.map((cell) => cell.trim() || '0').join(' & ');
    return `  ${cells}`;
  });

  return `\\begin{${type}}\n${rows.join(' \\\\\n')}\n\\end{${type}}`;
}

/**
 * Builds a piecewise function using the LaTeX `cases` environment.
 */
export function buildLatexCases(
  functionName: string,
  items: CasesItem[],
): string {
  const rows = items.map((item) => {
    const expr = item.expression.trim() || '0';
    const cond = item.condition.trim()
      ? ` & \\text{if } ${item.condition.trim()}`
      : '';
    return `  ${expr}${cond}`;
  });

  const fnPrefix = functionName.trim() ? `${functionName.trim()} = ` : '';
  return `${fnPrefix}\\begin{cases}\n${rows.join(' \\\\\n')}\n\\end{cases}`;
}

/**
 * Builds an aligned derivation environment.
 */
export function buildLatexAligned(
  items: AlignedItem[],
  starred: boolean = false,
): string {
  const env = starred ? 'align*' : 'aligned';
  const rows = items.map((item) => {
    const left = item.left.trim();
    const rel = item.relation.trim() || '=';
    const right = item.right.trim();
    const comment = item.comment?.trim()
      ? ` && \\text{(${item.comment.trim()})}`
      : '';
    return `  ${left} &${rel} ${right}${comment}`;
  });

  return `\\begin{${env}}\n${rows.join(' \\\\\n')}\n\\end{${env}}`;
}
