import { describe, expect, it } from 'vitest';
import { readXlsx } from '../../spreadsheet/xlsx-reader';
import { createAuditFixtureWorkbook } from './fixture';
import { auditWorkbook, generateWorkbookAuditXlsx } from './index';

describe('Workbook Audit Engine', () => {
  it('detects all A1 structural defect classes with exact cell references on fixture workbook', async () => {
    const bytes = await createAuditFixtureWorkbook();
    const result = await auditWorkbook(bytes, 'audit-fixture.xlsx');

    const classesFound = new Set(result.findings.map((f) => f.findingClass));

    // A1 Structural defect classes:
    // 1. Hardcoded constant
    expect(classesFound).toContain('hardcoded-formula-constant');
    const constantFinding = result.findings.find(
      (f) => f.findingClass === 'hardcoded-formula-constant' && f.cell === 'D2',
    );
    expect(constantFinding).toBeDefined();
    expect(constantFinding?.message).toContain('1.2');

    // 2. Broken formula run
    expect(classesFound).toContain('broken-formula-run');
    const brokenRun = result.findings.find(
      (f) => f.findingClass === 'broken-formula-run',
    );
    expect(brokenRun?.cell).toBe('B5');

    // 3. Formula overwritten with value
    expect(classesFound).toContain('formula-overwritten-with-value');
    const overwritten = result.findings.find(
      (f) =>
        f.findingClass === 'formula-overwritten-with-value' && f.cell === 'C5',
    );
    expect(overwritten).toBeDefined();
    expect(overwritten?.cell).toBe('C5');
    expect(overwritten?.value).toBe('999');

    // 4. Error cell and propagation
    expect(classesFound).toContain('error-cell');
    const errorCell = result.findings.find(
      (f) => f.findingClass === 'error-cell',
    );
    expect(errorCell?.cell).toBe('E2');
    expect(errorCell?.message).toContain('#DIV/0!');
    expect(errorCell?.message).toContain('propagating to 1 dependent cell(s)');

    // 5. External link
    expect(classesFound).toContain('external-link');
    const extLink = result.findings.find(
      (f) => f.findingClass === 'external-link',
    );
    expect(extLink?.cell).toBe('F2');
    expect(extLink?.message).toContain('Budget2025.xlsx');

    // 6. Circular reference
    expect(classesFound).toContain('circular-reference');
    const circular = result.findings.find(
      (f) => f.findingClass === 'circular-reference',
    );
    expect(circular?.message).toContain(
      'AuditTest!G2 -> AuditTest!G3 -> AuditTest!G2',
    );

    // 7. Inconsistent column types
    expect(classesFound).toContain('inconsistent-column-types');
    const typeMismatch = result.findings.find(
      (f) => f.findingClass === 'inconsistent-column-types',
    );
    expect(typeMismatch?.cell).toBe('H6');
    expect(typeMismatch?.message).toContain('400');

    // 8. Hidden and very-hidden sheets
    expect(classesFound).toContain('hidden-sheet');
    const hiddenSheet = result.findings.find(
      (f) => f.findingClass === 'hidden-sheet',
    );
    expect(hiddenSheet?.sheet).toBe('HiddenAssumptions');

    expect(classesFound).toContain('very-hidden-sheet');
    const veryHidden = result.findings.find(
      (f) => f.findingClass === 'very-hidden-sheet',
    );
    expect(veryHidden?.sheet).toBe('ConfidentialModel');

    // 9. Hidden rows and columns
    expect(classesFound).toContain('hidden-rows');
    const hiddenRow = result.findings.find(
      (f) => f.findingClass === 'hidden-rows',
    );
    expect(hiddenRow?.range).toContain('7');

    expect(classesFound).toContain('hidden-columns');
    const hiddenCol = result.findings.find(
      (f) => f.findingClass === 'hidden-columns',
    );
    expect(hiddenCol?.range).toContain('N');

    // 10. Merged cells in data range
    expect(classesFound).toContain('merged-cells');
    const merged = result.findings.find(
      (f) => f.findingClass === 'merged-cells',
    );
    expect(merged?.range).toBe('B8:C8');
  });

  it('detects all A2 statistical defect classes, states Benford test by name, and never uses the word fraud', async () => {
    const bytes = await createAuditFixtureWorkbook();
    const result = await auditWorkbook(bytes, 'audit-fixture.xlsx');

    const classesFound = new Set(result.findings.map((f) => f.findingClass));

    // 1. Benford's Law
    expect(classesFound).toContain('benford-law-divergence');
    const benford = result.findings.find(
      (f) => f.findingClass === 'benford-law-divergence',
    );
    expect(benford?.message).toContain(
      "Benford's Law First-Digit Test (Chi-Square & MAD)",
    );

    // Crucial rule: NEVER use the word "fraud" in Benford output or anywhere in findings!
    for (const f of result.findings) {
      expect(f.title.toLowerCase()).not.toContain('fraud');
      expect(f.message.toLowerCase()).not.toContain('fraud');
      if (f.remedy) expect(f.remedy.toLowerCase()).not.toContain('fraud');
    }

    // 2. Sequence gaps
    expect(classesFound).toContain('sequence-gaps');
    const seqGap = result.findings.find(
      (f) => f.findingClass === 'sequence-gaps',
    );
    expect(seqGap?.message).toContain('103');

    // 3. Round numbers rate
    expect(classesFound).toContain('round-numbers-rate');
    const roundRate = result.findings.find(
      (f) => f.findingClass === 'round-numbers-rate',
    );
    expect(roundRate?.message).toContain('100%');

    // 4. Outliers by MAD
    expect(classesFound).toContain('mad-outlier');
    const outlier = result.findings.find(
      (f) => f.findingClass === 'mad-outlier' && f.cell === 'I17',
    );
    expect(outlier).toBeDefined();
    expect(outlier?.cell).toBe('I17');
    expect(outlier?.value).toBe(50000);

    // 5. Weekend postings
    expect(classesFound).toContain('weekend-postings');
    const weekend = result.findings.find(
      (f) => f.findingClass === 'weekend-postings',
    );
    expect(weekend?.cell).toBe('L2');
    expect(weekend?.message).toContain('Sunday');

    // 6. Duplicate rows
    expect(classesFound).toContain('duplicate-rows');
    const dupRow = result.findings.find(
      (f) => f.findingClass === 'duplicate-rows',
    );
    expect(dupRow?.range).toContain('37');
    expect(dupRow?.range).toContain('38');
  });

  it('generates a multi-sheet audit .xlsx report readable by our reader without arbitrary score', async () => {
    const bytes = await createAuditFixtureWorkbook();
    const result = await auditWorkbook(bytes, 'audit-fixture.xlsx');

    // Verify no arbitrary score exists in result summary
    expect(
      (result.summary as unknown as Record<string, unknown>).score,
    ).toBeUndefined();
    expect(
      (result.summary as unknown as Record<string, unknown>).qualityScore,
    ).toBeUndefined();

    const reportBytes = await generateWorkbookAuditXlsx(result);
    expect(reportBytes.length).toBeGreaterThan(1000);

    // Validate generated report by opening it with xlsx-reader
    const parsedReport = await readXlsx(reportBytes);
    expect(parsedReport.sheets.length).toBe(5);

    const sheetNames = parsedReport.sheets.map((s) => s.name);
    expect(sheetNames).toEqual([
      'Audit Summary',
      'Structural Findings',
      'Statistical Findings',
      'Benford Analysis',
      'All Findings',
    ]);

    // Verify summary sheet contents
    const summarySheet = parsedReport.sheets[0];
    const summaryText = summarySheet.rows
      .flatMap((r) => r.map((c) => ('text' in c ? c.text : '')))
      .join(' ');
    expect(summaryText).toContain('WORKBOOK AUDIT REPORT');
    expect(summaryText).toContain('audit-fixture.xlsx');
  });
});
