import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import { runPdfPreflight } from './preflight';

describe('PDF Print Preflight Engine', () => {
  it('detects missing TrimBox and bleed margins on standard PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595.28, 841.89]); // A4 MediaBox only
    const bytes = await doc.save();

    const report = await runPdfPreflight(bytes);
    expect(report.totalPages).toBe(1);
    expect(report.summary.missingTrimBoxCount).toBe(1);
    expect(report.summary.missingBleedCount).toBe(1);
    expect(report.passed).toBe(false);
    expect(report.pages[0]?.issues.length).toBeGreaterThan(0);
    expect(report.outOfScopeNotice).toContain('Total Ink Coverage');
  });

  it('verifies valid TrimBox and standard bleed (>= 3mm / 8.5 pt)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]); // MediaBox: 612 x 792

    // Set TrimBox: 594 x 774 (inset by 9 pt on each side -> 9 pt bleed > 8.5 pt)
    const trimBoxArray = doc.context.obj([9, 9, 603, 783]);
    page.node.set(PDFName.of('TrimBox'), trimBoxArray);

    const bleedBoxArray = doc.context.obj([0, 0, 612, 792]);
    page.node.set(PDFName.of('BleedBox'), bleedBoxArray);

    const bytes = await doc.save();
    const report = await runPdfPreflight(bytes);

    expect(report.pages[0]?.hasTrimBox).toBe(true);
    expect(report.pages[0]?.hasStandardBleed).toBe(true);
    expect(report.summary.missingTrimBoxCount).toBe(0);
    expect(report.summary.missingBleedCount).toBe(0);
  });
});
