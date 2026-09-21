import { columnName } from '../../spreadsheet/xml';
import type { AuditFinding } from '../types';
import type { AuditCell, AuditWorkbookModel } from './model';
import {
  extractHardcodedConstants,
  extractReferencedCells,
  parseCellCoord,
} from './r1c1';

export function auditStructuralFindings(
  model: AuditWorkbookModel,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  let findingCounter = 1;
  const nextId = (prefix: string) => `${prefix}-${findingCounter++}`;

  // 1. Hidden and very-hidden sheets
  for (const sheet of model.sheets) {
    if (sheet.state === 'hidden') {
      findings.push({
        id: nextId('STR-HIDDEN-SHEET'),
        sheet: sheet.name,
        category: 'structural',
        findingClass: 'hidden-sheet',
        severity: 'warning',
        title: `Hidden sheet: ${sheet.name}`,
        message: `Sheet "${sheet.name}" is hidden. Hidden sheets may contain unverified assumptions, stale lookups, or unmonitored figures.`,
        remedy:
          'Unhide sheet via Format > Sheet > Unhide to review contents or delete if unused.',
      });
    } else if (sheet.state === 'veryHidden') {
      findings.push({
        id: nextId('STR-VERY-HIDDEN-SHEET'),
        sheet: sheet.name,
        category: 'structural',
        findingClass: 'very-hidden-sheet',
        severity: 'critical',
        title: `Very hidden sheet: ${sheet.name}`,
        message: `Sheet "${sheet.name}" is marked xlSheetVeryHidden. It cannot be viewed in Excel without opening VBA editor.`,
        remedy:
          'Examine sheet in VBA editor (Alt+F11) or unhide programmatically to ensure it contains no concealed data.',
      });
    }

    // Hidden rows
    if (sheet.hiddenRows.size > 0) {
      const sortedRows = Array.from(sheet.hiddenRows).sort((a, b) => a - b);
      const ranges = formatIndexRanges(sortedRows, 1);
      findings.push({
        id: nextId('STR-HIDDEN-ROW'),
        sheet: sheet.name,
        range: ranges,
        category: 'structural',
        findingClass: 'hidden-rows',
        severity: 'info',
        title: `Hidden rows on ${sheet.name}`,
        message: `Row(s) ${ranges} are hidden on sheet "${sheet.name}". Confirm that hidden rows do not contain omitted transactions or altered subtotals.`,
        remedy: 'Unhide rows to inspect values.',
      });
    }

    // Hidden columns
    if (sheet.hiddenCols.size > 0) {
      const sortedCols = Array.from(sheet.hiddenCols).sort((a, b) => a - b);
      const colLabels = sortedCols.map((c) => columnName(c)).join(', ');
      findings.push({
        id: nextId('STR-HIDDEN-COL'),
        sheet: sheet.name,
        range: colLabels,
        category: 'structural',
        findingClass: 'hidden-columns',
        severity: 'info',
        title: `Hidden columns on ${sheet.name}`,
        message: `Column(s) ${colLabels} are hidden on sheet "${sheet.name}".`,
        remedy: 'Unhide columns to verify calculations.',
      });
    }

    // Merged cells inside data ranges
    for (const mergeRef of sheet.mergedRanges) {
      const parts = mergeRef.split(':');
      const start = parseCellCoord(parts[0]);
      const end = parts[1] ? parseCellCoord(parts[1]) : start;
      if (start && end) {
        // If merge occurs below row 1 (inside typical tabular data area)
        if (start.row > 0 || end.row > start.row) {
          findings.push({
            id: nextId('STR-MERGE'),
            sheet: sheet.name,
            cell: parts[0],
            range: mergeRef,
            rowIndex: start.row,
            columnIndex: start.col,
            category: 'structural',
            findingClass: 'merged-cells',
            severity: 'warning',
            title: `Merged cell ${mergeRef} in data range`,
            message: `Merged range ${mergeRef} on sheet "${sheet.name}" disrupts column sorting, filtering, and autofill copy operations.`,
            remedy:
              'Unmerge cells and use "Center Across Selection" for formatting.',
          });
        }
      }
    }
  }

  // 2. Build dependency graph across all sheets for circular reference and error propagation
  const cellDepMap = new Map<string, Set<string>>(); // dependent -> set of cells it depends on
  const reverseDepMap = new Map<string, Set<string>>(); // source -> set of cells depending on it
  const allCellsWithFormulas: Array<{ sheet: string; cell: AuditCell }> = [];

  for (const sheet of model.sheets) {
    for (const cell of sheet.cells.values()) {
      if (cell.rawFormula) {
        allCellsWithFormulas.push({ sheet: sheet.name, cell });
        const cellKey = `${sheet.name}!${cell.ref}`;
        const refs = extractReferencedCells(cell.rawFormula, sheet.name);
        const deps = new Set<string>();

        for (const r of refs) {
          for (let row = r.startRow; row <= r.endRow; row++) {
            for (let col = r.startCol; col <= r.endCol; col++) {
              const targetRef = `${r.sheet}!${columnName(col)}${row + 1}`;
              deps.add(targetRef);
              if (!reverseDepMap.has(targetRef))
                reverseDepMap.set(targetRef, new Set());
              reverseDepMap.get(targetRef)!.add(cellKey);
            }
          }
        }
        cellDepMap.set(cellKey, deps);
      }
    }
  }

  // Detect circular references
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const reportedCycles = new Set<string>();

  function detectCycle(current: string, path: string[]) {
    visited.add(current);
    recStack.add(current);
    path.push(current);

    const neighbors = cellDepMap.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        detectCycle(neighbor, path);
      } else if (recStack.has(neighbor)) {
        // Cycle found
        const cycleStartIndex = path.indexOf(neighbor);
        const cycle = path.slice(cycleStartIndex).concat(neighbor);
        const cycleKey = cycle.slice().sort().join('|');
        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey);
          const [sheetPart, cellPart] = cycle[0].split('!');
          findings.push({
            id: nextId('STR-CIRCULAR'),
            sheet: sheetPart,
            cell: cellPart,
            category: 'structural',
            findingClass: 'circular-reference',
            severity: 'critical',
            title: `Circular reference in ${sheetPart}!${cellPart}`,
            message: `Circular calculation loop: ${cycle.join(' -> ')}. Excel cannot resolve circular formulas without iterative calculation enabled.`,
            remedy:
              'Restructure formulas to compute intermediate values in a separate row or column.',
            metadata: { cycle },
          });
        }
      }
    }

    recStack.delete(current);
    path.pop();
  }

  for (const cellKey of cellDepMap.keys()) {
    if (!visited.has(cellKey)) {
      detectCycle(cellKey, []);
    }
  }

  // 3. Cell-level analysis per sheet
  for (const sheet of model.sheets) {
    for (const cell of sheet.cells.values()) {
      // Error cells and propagation
      if (cell.kind === 'error' || cell.errorCode) {
        const cellKey = `${sheet.name}!${cell.ref}`;
        const dependents = Array.from(reverseDepMap.get(cellKey) ?? []);
        const depStr =
          dependents.length > 0
            ? `, propagating to ${dependents.length} dependent cell(s): ${dependents.slice(0, 3).join(', ')}${dependents.length > 3 ? '...' : ''}`
            : '';

        findings.push({
          id: nextId('STR-ERROR'),
          sheet: sheet.name,
          cell: cell.ref,
          rowIndex: cell.row,
          columnIndex: cell.col,
          category: 'structural',
          findingClass: 'error-cell',
          severity: 'critical',
          title: `Error cell ${cell.errorCode ?? '#ERROR!'} at ${cell.ref}`,
          message: `Cell ${cell.ref} evaluates to ${cell.errorCode ?? '#ERROR!'}${depStr}.`,
          remedy:
            'Resolve broken reference, divide-by-zero, or missing lookup argument.',
          metadata: { errorCode: cell.errorCode, dependents },
        });
      }

      // Hardcoded constants inside formulas
      if (cell.rawFormula) {
        const constants = extractHardcodedConstants(cell.rawFormula);
        if (constants.length > 0) {
          const rawConstants = constants.map((c) => c.raw).join(', ');
          findings.push({
            id: nextId('STR-CONST'),
            sheet: sheet.name,
            cell: cell.ref,
            rowIndex: cell.row,
            columnIndex: cell.col,
            category: 'structural',
            findingClass: 'hardcoded-formula-constant',
            severity: 'warning',
            title: `Hardcoded constant in ${cell.ref}`,
            message: `Formula in ${cell.ref} contains hardcoded number(s) (${rawConstants}): =${cell.rawFormula}. Constants embedded in formulas hide model assumptions.`,
            remedy:
              'Place rates, thresholds, and factors in designated input cells and reference them.',
            value: cell.rawFormula,
            metadata: { constants: constants.map((c) => c.value) },
          });
        }

        // External links in formulas
        const extMatch = /\[([^\]]+)\]/u.exec(cell.rawFormula);
        if (extMatch) {
          findings.push({
            id: nextId('STR-EXT-LINK'),
            sheet: sheet.name,
            cell: cell.ref,
            rowIndex: cell.row,
            columnIndex: cell.col,
            category: 'structural',
            findingClass: 'external-link',
            severity: 'warning',
            title: `External workbook link in ${cell.ref}`,
            message: `Cell ${cell.ref} references external file "${extMatch[1]}". External references break when workbooks are moved or shared.`,
            remedy:
              'Import referenced data into a local worksheet or copy values.',
            metadata: { externalFile: extMatch[1] },
          });
        }
      }
    }

    // 4. Column-level analysis: broken formula runs, overwritten formulas, inconsistent types
    for (let c = sheet.minCol; c <= sheet.maxCol; c++) {
      const colName = columnName(c);
      const colCells: AuditCell[] = [];
      for (let r = sheet.minRow; r <= sheet.maxRow; r++) {
        const cell = sheet.rows.get(r)?.get(c);
        if (cell && cell.kind !== 'empty') {
          colCells.push(cell);
        }
      }

      if (colCells.length < 3) continue;

      // Inconsistent types in column
      // Skip row 0 if it looks like a header (text when column has numbers)
      const dataCells =
        colCells[0].kind === 'text' &&
        colCells.slice(1).some((item) => item.kind === 'number')
          ? colCells.slice(1)
          : colCells;

      let numCount = 0;
      const textNumbers: AuditCell[] = [];
      const nonNumText: AuditCell[] = [];

      for (const cell of dataCells) {
        if (cell.kind === 'number') numCount++;
        else if (cell.kind === 'text' && cell.text) {
          if (/^-?\d+(?:\.\d+)?$/u.test(cell.text.trim())) {
            textNumbers.push(cell);
          } else {
            nonNumText.push(cell);
          }
        }
      }

      if (numCount >= 3 && textNumbers.length > 0) {
        for (const tCell of textNumbers) {
          findings.push({
            id: nextId('STR-TYPE-MISMATCH'),
            sheet: sheet.name,
            cell: tCell.ref,
            rowIndex: tCell.row,
            columnIndex: tCell.col,
            category: 'structural',
            findingClass: 'inconsistent-column-types',
            severity: 'warning',
            title: `Number stored as text at ${tCell.ref}`,
            message: `Cell ${tCell.ref} contains numeric string "${tCell.text}" in predominantly numeric column ${colName}. Excel SUM/AVERAGE functions silently ignore text numbers, causing balance errors.`,
            remedy: 'Convert text to number using "=VALUE()" or multiply by 1.',
          });
        }
      }

      // Broken formula runs and overwritten formulas
      const formulaCells = dataCells.filter((cell) => cell.hasFormula);
      if (formulaCells.length >= 3) {
        const formulaRatio = formulaCells.length / dataCells.length;

        // Group formulas by R1C1 pattern
        const r1c1Counts = new Map<string, number>();
        for (const fCell of formulaCells) {
          if (fCell.r1c1Formula) {
            r1c1Counts.set(
              fCell.r1c1Formula,
              (r1c1Counts.get(fCell.r1c1Formula) ?? 0) + 1,
            );
          }
        }

        // Find dominant pattern
        let dominantR1C1 = '';
        let maxCount = 0;
        for (const [r1c1, count] of r1c1Counts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            dominantR1C1 = r1c1;
          }
        }

        if (
          dominantR1C1 &&
          maxCount >= 3 &&
          maxCount / formulaCells.length >= 0.6
        ) {
          // Check for broken formula run: formula exists but doesn't match dominant R1C1
          for (const fCell of formulaCells) {
            if (fCell.r1c1Formula && fCell.r1c1Formula !== dominantR1C1) {
              findings.push({
                id: nextId('STR-BROKEN-RUN'),
                sheet: sheet.name,
                cell: fCell.ref,
                rowIndex: fCell.row,
                columnIndex: fCell.col,
                category: 'structural',
                findingClass: 'broken-formula-run',
                severity: 'critical',
                title: `Broken formula run at ${fCell.ref}`,
                message: `Formula in ${fCell.ref} (= ${fCell.rawFormula}) deviates from consistent R1C1 pattern in column ${colName}. Expected ${dominantR1C1}.`,
                remedy:
                  'Copy formula from adjacent row to restore column consistency.',
                value: fCell.rawFormula,
              });
            }
          }

          // Check for formulas overwritten with values
          if (formulaRatio >= 0.6) {
            for (const cell of dataCells) {
              if (
                !cell.hasFormula &&
                (cell.kind === 'number' || cell.kind === 'text')
              ) {
                const valStr =
                  cell.number !== undefined
                    ? String(cell.number)
                    : (cell.text ?? '');
                findings.push({
                  id: nextId('STR-OVERWRITTEN'),
                  sheet: sheet.name,
                  cell: cell.ref,
                  rowIndex: cell.row,
                  columnIndex: cell.col,
                  category: 'structural',
                  findingClass: 'formula-overwritten-with-value',
                  severity: 'critical',
                  title: `Formula overwritten with value at ${cell.ref}`,
                  message: `Cell ${cell.ref} holds static value (${valStr}) in column ${colName} where ${Math.round(formulaRatio * 100)}% of rows compute a formula.`,
                  remedy:
                    'Reinstate column formula or document why this cell is static.',
                  value: valStr,
                });
              }
            }
          }
        }
      }
    }
  }

  return findings;
}

function formatIndexRanges(indices: number[], offset = 0): string {
  if (indices.length === 0) return '';
  const ranges: string[] = [];
  let start = indices[0];
  let prev = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const cur = indices[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      ranges.push(
        start === prev
          ? `${start + offset}`
          : `${start + offset}–${prev + offset}`,
      );
      start = cur;
      prev = cur;
    }
  }
  ranges.push(
    start === prev ? `${start + offset}` : `${start + offset}–${prev + offset}`,
  );
  return ranges.join(', ');
}
