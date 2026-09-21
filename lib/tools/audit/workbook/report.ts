import {
  writeXlsx,
  type SheetToWrite,
  type WriteCell,
} from '../../spreadsheet/xlsx-writer';
import type { WorkbookAuditResult } from '../types';
import type { BenfordDistributionItem } from './statistical';

export async function generateWorkbookAuditXlsx(
  result: WorkbookAuditResult,
): Promise<Uint8Array> {
  const { summary, findings } = result;

  // 1. Summary Sheet
  const summaryRows: WriteCell[][] = [
    ['WORKBOOK AUDIT REPORT', null, null],
    [
      'Generated locally via OpenTools Workbook Audit engine. Zero server transmission.',
      null,
      null,
    ],
    [null, null, null],
    ['METRIC', 'VALUE', 'NOTES'],
    ['Audited File Name', summary.fileName, 'Target workbook'],
    [
      'Total Sheets Audited',
      summary.sheetCount,
      summary.auditedSheets.join(', '),
    ],
    ['Total Cells Audited', summary.totalCellsAudited, 'Active cell content'],
    [
      'Formulas Inspected',
      summary.formulaCount,
      'Formulas analyzed for structure and runs',
    ],
    [
      'Total Findings Identified',
      summary.totalFindings,
      'Fact-based observations (no arbitrary score)',
    ],
    [
      'Critical Severity Findings',
      summary.criticalCount,
      'Errors, circular refs, very-hidden sheets, broken runs',
    ],
    [
      'Warning Severity Findings',
      summary.warningCount,
      'Hardcoded constants, Benford divergence, outliers, type mismatch',
    ],
    [
      'Informational Findings',
      summary.infoCount,
      'Hidden rows/columns, round numbers rate, weekend postings',
    ],
    [null, null, null],
    ['FINDINGS BY CATEGORY', 'COUNT', null],
    [
      'Structural Findings',
      summary.byCategory.structural,
      'Formulas, sheets, cells, links, types',
    ],
    [
      'Statistical Findings',
      summary.byCategory.statistical,
      'Distributions, duplicates, gaps, outliers, dates',
    ],
    [null, null, null],
    ['FINDING CLASS BREAKDOWN', 'COUNT', 'CLASS IDENTIFIER'],
  ];

  for (const [findingClass, count] of Object.entries(summary.byClass)) {
    summaryRows.push([
      formatFindingClassName(findingClass),
      count,
      findingClass,
    ]);
  }

  // 2. Structural Findings Sheet
  const structuralFindings = findings.filter(
    (f) => f.category === 'structural',
  );
  const structuralRows: WriteCell[][] = [
    [
      'ID',
      'Sheet',
      'Cell / Range',
      'Severity',
      'Finding Class',
      'Observation',
      'Recommended Remedy',
      'Formula / Value',
    ],
  ];

  for (const f of structuralFindings) {
    structuralRows.push([
      f.id,
      f.sheet ?? 'Workbook',
      f.cell ?? f.range ?? 'Sheet-level',
      f.severity.toUpperCase(),
      formatFindingClassName(f.findingClass),
      f.message,
      f.remedy ?? 'Review and verify calculation.',
      f.value !== undefined ? String(f.value) : null,
    ]);
  }

  // 3. Statistical Findings Sheet
  const statisticalFindings = findings.filter(
    (f) => f.category === 'statistical',
  );
  const statisticalRows: WriteCell[][] = [
    [
      'ID',
      'Sheet',
      'Cell / Column',
      'Severity',
      'Finding Class',
      'Observation',
      'Recommended Remedy',
      'Observed Metric',
    ],
  ];

  function formatMetricNum(val: unknown): string {
    if (typeof val === 'number') {
      return Number.isInteger(val) ? String(val) : val.toFixed(4);
    }
    if (typeof val === 'string') return val;
    return '';
  }

  for (const f of statisticalFindings) {
    let metricStr = '';
    if (f.metadata?.chiSquare !== undefined) {
      metricStr = `Chi2: ${formatMetricNum(f.metadata.chiSquare)}, MAD: ${formatMetricNum(f.metadata.mad)}`;
    } else if (f.metadata?.modifiedZ !== undefined) {
      metricStr = `Modified Z: ${formatMetricNum(f.metadata.modifiedZ)}, Median: ${formatMetricNum(f.metadata.median)}`;
    } else if (f.metadata?.missingCount !== undefined) {
      metricStr = `Missing count: ${formatMetricNum(f.metadata.missingCount)}`;
    } else if (f.metadata?.roundRate !== undefined) {
      metricStr = `Round rate: ${String(Math.round(Number(f.metadata.roundRate) * 100))}%`;
    }

    statisticalRows.push([
      f.id,
      f.sheet ?? 'Workbook',
      f.cell ??
        (f.columnIndex !== undefined
          ? `Col ${f.columnIndex + 1}`
          : (f.range ?? 'Column-level')),
      f.severity.toUpperCase(),
      formatFindingClassName(f.findingClass),
      f.message,
      f.remedy ?? 'Review transaction and source logs.',
      metricStr || (f.value !== undefined ? String(f.value) : null),
    ]);
  }

  // 4. Benford Analysis Sheet (if any benford findings exist)
  const benfordFinding = statisticalFindings.find(
    (f) => f.findingClass === 'benford-law-divergence',
  );
  const benfordDistribution = benfordFinding?.metadata?.distribution as
    | BenfordDistributionItem[]
    | undefined;

  const benfordRows: WriteCell[][] = [
    ['BENFORD FIRST-DIGIT DISTRIBUTION ANALYSIS', null, null, null, null],
    [
      "Test: Benford's Law First-Digit Test (Chi-Square Goodness of Fit & Mean Absolute Deviation)",
      null,
      null,
      null,
      null,
    ],
    [
      'Note: Flags unusual digit distributions that deviate from natural logarithmic scaling, warranting inspection.',
      null,
      null,
      null,
      null,
    ],
    [null, null, null, null, null],
    [
      'Leading Digit (1–9)',
      'Observed Count',
      'Observed %',
      'Expected Benford %',
      'Difference %',
    ],
  ];

  if (benfordDistribution && Array.isArray(benfordDistribution)) {
    for (const item of benfordDistribution) {
      benfordRows.push([
        item.digit,
        item.observedCount,
        `${item.observedPercent}%`,
        `${item.expectedPercent}%`,
        `${item.difference > 0 ? '+' : ''}${item.difference}%`,
      ]);
    }
  } else {
    benfordRows.push([
      "No column exhibited statistical divergence from Benford's Law.",
      null,
      null,
      null,
      null,
    ]);
  }

  // 5. All Findings Sheet
  const allRows: WriteCell[][] = [
    [
      'ID',
      'Category',
      'Sheet',
      'Location',
      'Severity',
      'Finding Class',
      'Title',
      'Description',
      'Remedy',
    ],
  ];

  for (const f of findings) {
    allRows.push([
      f.id,
      f.category.toUpperCase(),
      f.sheet ?? 'Workbook',
      f.cell ?? f.range ?? 'Sheet-level',
      f.severity.toUpperCase(),
      formatFindingClassName(f.findingClass),
      f.title,
      f.message,
      f.remedy ?? 'Review and verify.',
    ]);
  }

  const sheetsToWrite: SheetToWrite[] = [
    { name: 'Audit Summary', rows: summaryRows },
    { name: 'Structural Findings', rows: structuralRows },
    { name: 'Statistical Findings', rows: statisticalRows },
    { name: 'Benford Analysis', rows: benfordRows },
    { name: 'All Findings', rows: allRows },
  ];

  const res = await writeXlsx(sheetsToWrite);
  return res.bytes;
}

function formatFindingClassName(cls: string): string {
  return cls
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
