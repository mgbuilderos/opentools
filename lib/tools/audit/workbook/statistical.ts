import { columnName } from '../../spreadsheet/xml';
import type { AuditFinding } from '../types';
import type { AuditCell, AuditWorkbookModel } from './model';

export interface BenfordDistributionItem {
  digit: number;
  observedCount: number;
  observedPercent: number;
  expectedPercent: number;
  difference: number;
}

export function auditStatisticalFindings(
  model: AuditWorkbookModel,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  let findingCounter = 1;
  const nextId = (prefix: string) => `${prefix}-${findingCounter++}`;

  for (const sheet of model.sheets) {
    for (let c = sheet.minCol; c <= sheet.maxCol; c++) {
      const colName = columnName(c);
      const cells: AuditCell[] = [];
      for (let r = sheet.minRow; r <= sheet.maxRow; r++) {
        const cell = sheet.rows.get(r)?.get(c);
        if (cell && cell.kind !== 'empty') {
          cells.push(cell);
        }
      }

      if (cells.length < 3) continue;

      // Extract numeric values
      const numericCells: Array<{ cell: AuditCell; value: number }> = [];
      const dateCells: Array<{ cell: AuditCell; date: Date }> = [];

      for (const cell of cells) {
        if (cell.kind === 'number' && cell.number !== undefined) {
          numericCells.push({ cell, value: cell.number });
        } else if (cell.kind === 'date' && cell.date) {
          dateCells.push({ cell, date: cell.date });
        }
      }

      // 1. Benford's Law (N >= 30)
      if (numericCells.length >= 30) {
        const positiveNums = numericCells.filter((item) => item.value > 0);
        if (positiveNums.length >= 30) {
          const observedCounts = Array.from({ length: 10 }, () => 0);
          for (const item of positiveNums) {
            const str = item.value.toString().replace(/^0*\.?0*/u, '');
            const firstDigit = Number.parseInt(str[0], 10);
            if (firstDigit >= 1 && firstDigit <= 9) {
              observedCounts[firstDigit]++;
            }
          }

          const n = positiveNums.length;
          let chiSquare = 0;
          let sumAbsDev = 0;
          const benfordTable: BenfordDistributionItem[] = [];

          for (let d = 1; d <= 9; d++) {
            const expProb = Math.log10(1 + 1 / d);
            const expCount = n * expProb;
            const obsCount = observedCounts[d];
            const obsProb = obsCount / n;

            chiSquare += Math.pow(obsCount - expCount, 2) / expCount;
            sumAbsDev += Math.abs(obsProb - expProb);

            benfordTable.push({
              digit: d,
              observedCount: obsCount,
              observedPercent: Number((obsProb * 100).toFixed(1)),
              expectedPercent: Number((expProb * 100).toFixed(1)),
              difference: Number(((obsProb - expProb) * 100).toFixed(1)),
            });
          }

          const mad = sumAbsDev / 9;

          // Chi-square critical at df=8, p=0.05 is 15.51; Nigrini MAD non-conformity > 0.015
          if (chiSquare > 15.51 || mad > 0.015) {
            findings.push({
              id: nextId('STAT-BENFORD'),
              sheet: sheet.name,
              columnIndex: c,
              category: 'statistical',
              findingClass: 'benford-law-divergence',
              severity: 'warning',
              title: `Benford's Law First-Digit Divergence in Column ${colName}`,
              message: `Benford's Law First-Digit Test (Chi-Square & MAD): Leading digit distribution in Column ${colName} departs from natural logarithmic scaling (Chi-Square: ${chiSquare.toFixed(2)}, MAD: ${mad.toFixed(4)}, N = ${n}). Note: Benford's Law flags unusual digit distributions that deviate from natural logarithmic scaling, warranting inspection.`,
              remedy:
                'Inspect the underlying data generation process (e.g. check for assigned IDs, constrained limits, or clustered thresholds).',
              metadata: {
                chiSquare: Number(chiSquare.toFixed(2)),
                mad: Number(mad.toFixed(4)),
                sampleSize: n,
                distribution: benfordTable,
              },
            });
          }
        }
      }

      // 2. Outliers by Median Absolute Deviation (MAD)
      if (numericCells.length >= 10) {
        const sorted = numericCells
          .map((item) => item.value)
          .sort((a, b) => a - b);
        const med = median(sorted);
        const absDevs = sorted
          .map((val) => Math.abs(val - med))
          .sort((a, b) => a - b);
        const mad = median(absDevs);

        if (mad > 0) {
          for (const item of numericCells) {
            const modZ = (0.6745 * Math.abs(item.value - med)) / mad;
            if (modZ > 3.5) {
              const distanceInMad = Math.abs(item.value - med) / mad;
              findings.push({
                id: nextId('STAT-OUTLIER'),
                sheet: sheet.name,
                cell: item.cell.ref,
                rowIndex: item.cell.row,
                columnIndex: item.cell.col,
                category: 'statistical',
                findingClass: 'mad-outlier',
                severity: 'warning',
                title: `Statistical outlier in cell ${item.cell.ref}`,
                message: `Value ${formatNumber(item.value)} in cell ${item.cell.ref} is a statistical outlier (${distanceInMad.toFixed(1)}x MAD from column median ${formatNumber(med)}). Median Absolute Deviation provides outlier detection robust against extreme values.`,
                remedy:
                  'Verify transaction records or invoices to ensure the figure was not transposed or entered with extra zeros.',
                value: item.value,
                metadata: {
                  median: med,
                  mad,
                  modifiedZ: Number(modZ.toFixed(2)),
                },
              });
            }
          }
        }
      }

      // 3. Sequence Gaps (in integer identifier / serial columns)
      if (numericCells.length >= 8) {
        const integers = numericCells
          .filter((item) => Number.isInteger(item.value) && item.value > 0)
          .map((item) => ({ cell: item.cell, val: item.value }))
          .sort((a, b) => a.val - b.val);

        if (integers.length >= 8) {
          // Check step differences
          const diffs: number[] = [];
          for (let i = 1; i < integers.length; i++) {
            diffs.push(integers[i].val - integers[i - 1].val);
          }
          const step1Count = diffs.filter((d) => d === 1).length;

          // If predominantly sequential (step 1 is >= 60% of steps)
          if (step1Count >= 4 && step1Count / diffs.length >= 0.6) {
            const missingNumbers: number[] = [];
            for (let i = 1; i < integers.length; i++) {
              const gap = integers[i].val - integers[i - 1].val;
              if (gap > 1 && gap <= 10) {
                for (
                  let m = integers[i - 1].val + 1;
                  m < integers[i].val;
                  m++
                ) {
                  missingNumbers.push(m);
                }
              }
            }

            if (missingNumbers.length > 0 && missingNumbers.length <= 25) {
              const gapDisplay =
                missingNumbers.slice(0, 10).join(', ') +
                (missingNumbers.length > 10 ? '...' : '');
              findings.push({
                id: nextId('STAT-GAP'),
                sheet: sheet.name,
                columnIndex: c,
                category: 'statistical',
                findingClass: 'sequence-gaps',
                severity: 'warning',
                title: `Sequence gap in Column ${colName}`,
                message: `Column ${colName} exhibits sequential numbers but has ${missingNumbers.length} missing entry(ies): ${gapDisplay}. Missing sequence numbers may reflect unrecorded or skipped transactions.`,
                remedy:
                  'Examine serial numbering logs to verify whether omitted numbers represent voided entries or unentered documents.',
                metadata: {
                  missingCount: missingNumbers.length,
                  missingNumbers,
                },
              });
            }
          }
        }
      }

      // 4. Round Numbers Rate
      if (numericCells.length >= 20) {
        let roundCount = 0;
        for (const item of numericCells) {
          const val = Math.abs(item.value);
          if (val >= 10 && (val % 100 === 0 || val % 50 === 0)) {
            roundCount++;
          }
        }

        const roundRate = roundCount / numericCells.length;
        if (roundRate >= 0.4) {
          findings.push({
            id: nextId('STAT-ROUND'),
            sheet: sheet.name,
            columnIndex: c,
            category: 'statistical',
            findingClass: 'round-numbers-rate',
            severity: 'info',
            title: `High round figures concentration in Column ${colName}`,
            message: `${Math.round(roundRate * 100)}% (${roundCount} of ${numericCells.length}) of values in Column ${colName} are round figures (multiples of 50 or 100). Natural transactional amounts rarely cluster so heavily on exact round numbers.`,
            remedy:
              'Verify whether values represent rough estimates, budget caps, or negotiated round sums rather than measured costs.',
            metadata: {
              roundCount,
              totalCount: numericCells.length,
              roundRate: Number(roundRate.toFixed(2)),
            },
          });
        }
      }

      // 5. Weekend & Out-of-Hours Postings
      if (dateCells.length > 0) {
        for (const item of dateCells) {
          const day = item.date.getUTCDay();
          // Saturday (6) or Sunday (0)
          if (day === 0 || day === 6) {
            const dayName = day === 0 ? 'Sunday' : 'Saturday';
            const dateStr = item.date.toISOString().slice(0, 10);
            findings.push({
              id: nextId('STAT-WEEKEND'),
              sheet: sheet.name,
              cell: item.cell.ref,
              rowIndex: item.cell.row,
              columnIndex: item.cell.col,
              category: 'statistical',
              findingClass: 'weekend-postings',
              severity: 'info',
              title: `Weekend posting at ${item.cell.ref}`,
              message: `Cell ${item.cell.ref} contains date ${dateStr} falling on a ${dayName}. Ensure transactions booked on weekends reflect authorized operations.`,
              remedy:
                'Verify authorization for transactions recorded outside regular business hours.',
              value: dateStr,
            });
          }

          // Out-of-hours check if time is stored (hours outside 07:00 - 19:00 UTC)
          const hours = item.date.getUTCHours();
          const mins = item.date.getUTCMinutes();
          const hasTime = hours !== 0 || mins !== 0;
          if (hasTime && (hours < 7 || hours >= 19)) {
            const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} UTC`;
            findings.push({
              id: nextId('STAT-OUT-OF-HOURS'),
              sheet: sheet.name,
              cell: item.cell.ref,
              rowIndex: item.cell.row,
              columnIndex: item.cell.col,
              category: 'statistical',
              findingClass: 'out-of-hours-postings',
              severity: 'info',
              title: `Out-of-hours timestamp at ${item.cell.ref}`,
              message: `Cell ${item.cell.ref} records timestamp ${timeStr} outside normal daylight operating window (07:00–19:00 UTC).`,
              remedy:
                'Confirm whether late-night or early-morning batch operations were scheduled.',
              value: timeStr,
            });
          }
        }
      }
    }

    // 6. Duplicate Rows (exact and near)
    const rowList: Array<{ rowNum: number; rowStr: string; cells: string[] }> =
      [];
    for (let r = sheet.minRow; r <= sheet.maxRow; r++) {
      const rowCells: string[] = [];
      let hasData = false;
      for (let c = sheet.minCol; c <= sheet.maxCol; c++) {
        const cell = sheet.rows.get(r)?.get(c);
        let val = '';
        if (cell) {
          if (cell.kind === 'number') val = String(cell.number);
          else if (cell.kind === 'text') val = cell.text ?? '';
          else if (cell.kind === 'date' && cell.date)
            val = cell.date.toISOString().slice(0, 10);
          else if (cell.kind === 'boolean') val = String(cell.boolean);
          else if (cell.kind === 'error') val = cell.errorCode ?? '#ERROR!';
        }
        if (val) hasData = true;
        rowCells.push(val.trim());
      }
      if (hasData) {
        rowList.push({
          rowNum: r + 1,
          rowStr: rowCells.join('||'),
          cells: rowCells,
        });
      }
    }

    // Find exact duplicates
    const exactGroups = new Map<string, number[]>();
    for (const item of rowList) {
      if (!exactGroups.has(item.rowStr)) {
        exactGroups.set(item.rowStr, []);
      }
      exactGroups.get(item.rowStr)!.push(item.rowNum);
    }

    for (const rowNums of exactGroups.values()) {
      if (rowNums.length > 1) {
        findings.push({
          id: nextId('STAT-DUP-ROW'),
          sheet: sheet.name,
          range: `Rows ${rowNums.join(', ')}`,
          category: 'statistical',
          findingClass: 'duplicate-rows',
          severity: 'warning',
          title: `Exact duplicate row: Rows ${rowNums.join(', ')}`,
          message: `Identical row content duplicated across ${rowNums.length} rows (${rowNums.join(', ')}) on sheet "${sheet.name}". Duplicate entries inflate summary totals and distort ledger balances.`,
          remedy:
            'Verify whether these duplicate records represent repeated billing, re-submitted orders, or data entry error.',
          metadata: { rows: rowNums },
        });
      }
    }
  }

  return findings;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatNumber(num: number): string {
  if (Number.isInteger(num)) return num.toLocaleString('en-US');
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
