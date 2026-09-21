export interface CellCoord {
  row: number; // 0-indexed
  col: number; // 0-indexed
  rowAbs: boolean;
  colAbs: boolean;
}

export function parseCellCoord(ref: string): CellCoord | null {
  const match = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/u.exec(ref);
  if (!match) return null;
  const colAbs = match[1] === '$';
  const letters = match[2].toUpperCase();
  const rowAbs = match[3] === '$';
  const row = Number.parseInt(match[4], 10) - 1;

  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return { row, col: col - 1, rowAbs, colAbs };
}

/**
 * Converts an A1 formula string to relative R1C1 notation based on current cell position.
 * Formulas that perform identical calculations down a column or across a row
 * will produce identical R1C1 strings.
 */
export function a1ToR1C1(
  formula: string,
  baseRow: number,
  baseCol: number,
): string {
  // Tokenize ignoring string literals
  const tokens: string[] = [];
  let index = 0;

  while (index < formula.length) {
    // String literal
    if (formula[index] === '"') {
      let close = formula.indexOf('"', index + 1);
      while (close !== -1 && formula[close + 1] === '"') {
        close = formula.indexOf('"', close + 2);
      }
      if (close === -1) {
        tokens.push(formula.slice(index));
        break;
      }
      tokens.push(formula.slice(index, close + 1));
      index = close + 1;
      continue;
    }

    // Cell reference pattern: e.g. Sheet1!$A$1 or $A$1
    const sub = formula.slice(index);
    const cellMatch = /^(\$?[A-Za-z]+)(\$?\d+)\b/u.exec(sub);
    // Don't match if preceding character was part of identifier or function name (e.g. LOG10)
    const prevChar = index > 0 ? formula[index - 1] : '';
    const isIdChar = /[A-Za-z0-9_.]/u.test(prevChar);

    if (cellMatch && !isIdChar) {
      const coord = parseCellCoord(cellMatch[0]);
      if (coord) {
        // Convert to R1C1
        let rPart = '';
        if (coord.rowAbs) {
          rPart = `R${coord.row + 1}`;
        } else {
          const deltaRow = coord.row - baseRow;
          rPart = deltaRow === 0 ? 'R' : `R[${deltaRow}]`;
        }

        let cPart = '';
        if (coord.colAbs) {
          cPart = `C${coord.col + 1}`;
        } else {
          const deltaCol = coord.col - baseCol;
          cPart = deltaCol === 0 ? 'C' : `C[${deltaCol}]`;
        }

        tokens.push(`${rPart}${cPart}`);
        index += cellMatch[0].length;
        continue;
      }
    }

    tokens.push(formula[index]);
    index++;
  }

  return tokens.join('');
}

export interface FormulaNumericConstant {
  value: number;
  raw: string;
  index: number;
}

/**
 * Extracts hardcoded numeric constants from a formula.
 * Ignores benign constants like 0, 1, 2, -1 (often used for indices, offsets, exact match in VLOOKUP).
 */
export function extractHardcodedConstants(
  formula: string,
): FormulaNumericConstant[] {
  const constants: FormulaNumericConstant[] = [];
  let index = 0;

  while (index < formula.length) {
    // Skip string literals
    if (formula[index] === '"') {
      let close = formula.indexOf('"', index + 1);
      while (close !== -1 && formula[close + 1] === '"') {
        close = formula.indexOf('"', close + 2);
      }
      if (close === -1) break;
      index = close + 1;
      continue;
    }

    // Skip sheet names e.g. 'Sheet 1'! or Sheet1!
    if (formula[index] === "'") {
      const close = formula.indexOf("'", index + 1);
      if (close !== -1 && formula[close + 1] === '!') {
        index = close + 2;
        continue;
      }
    }

    // Skip cell references (e.g. A1, $A$10)
    const prevChar = index > 0 ? formula[index - 1] : '';
    const isIdChar = /[A-Za-z0-9_.]/u.test(prevChar);
    const sub = formula.slice(index);
    const cellMatch = /^(\$?[A-Za-z]+\$?\d+)\b/u.exec(sub);
    if (cellMatch && !isIdChar) {
      index += cellMatch[0].length;
      continue;
    }

    // Match numbers
    const numMatch = /^(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/u.exec(sub);
    if (numMatch && !isIdChar) {
      const raw = numMatch[1];
      const val = Number.parseFloat(raw);
      // Benign check: 0, 1, 2 are standard lookup / boolean / offset flags
      if (Number.isFinite(val) && val !== 0 && val !== 1 && val !== 2) {
        constants.push({
          value: val,
          raw,
          index,
        });
      }
      index += raw.length;
      continue;
    }

    index++;
  }

  return constants;
}

/**
 * Extracts cell and range references from a formula for dependency and cycle analysis.
 */
export function extractReferencedCells(
  formula: string,
  defaultSheet: string,
): Array<{
  sheet: string;
  ref: string;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}> {
  const refs: Array<{
    sheet: string;
    ref: string;
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }> = [];
  let index = 0;

  while (index < formula.length) {
    if (formula[index] === '"') {
      let close = formula.indexOf('"', index + 1);
      while (close !== -1 && formula[close + 1] === '"') {
        close = formula.indexOf('"', close + 2);
      }
      if (close === -1) break;
      index = close + 1;
      continue;
    }

    const sub = formula.slice(index);
    const prevChar = index > 0 ? formula[index - 1] : '';
    const isIdChar = /[A-Za-z0-9_.]/u.test(prevChar);

    // Matches optional sheet and range: e.g. Sheet1!A1:B10 or 'My Sheet'!$A$1 or A1
    const rangeRegex =
      /^(?:(?:'([^']+)'|([A-Za-z0-9_]+))!)?(\$?[A-Za-z]+\$?\d+)(?::(\$?[A-Za-z]+\$?\d+))?\b/u;
    const match = rangeRegex.exec(sub);

    if (match && !isIdChar) {
      const sheet = match[1] || match[2] || defaultSheet;
      const startRef = match[3];
      const endRef = match[4] || match[3];

      const startCoord = parseCellCoord(startRef);
      const endCoord = parseCellCoord(endRef);

      if (startCoord && endCoord) {
        refs.push({
          sheet,
          ref: match[4] ? `${startRef}:${endRef}` : startRef,
          startRow: Math.min(startCoord.row, endCoord.row),
          endRow: Math.max(startCoord.row, endCoord.row),
          startCol: Math.min(startCoord.col, endCoord.col),
          endCol: Math.max(startCoord.col, endCoord.col),
        });
      }
      index += match[0].length;
      continue;
    }

    index++;
  }

  return refs;
}
