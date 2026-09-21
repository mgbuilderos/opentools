import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { generateAnnotatedPdf } from './annotated-pdf';
import { generateChangeListCsv } from './change-list';
import { comparePdfs } from './index';
import { generateRedlineDocx } from './redline-docx';
import { NoTextLayerError } from './types';

async function createTestPdf(
  pagesContent: Array<
    Array<{ text: string; bold?: boolean; fontSize?: number }>
  >,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const lines of pagesContent) {
    const page = pdfDoc.addPage([595, 842]); // A4
    let y = 780;
    for (const line of lines) {
      const font = line.bold ? boldFont : regularFont;
      const size = line.fontSize || 11;
      page.drawText(line.text, { x: 50, y, size, font });
      y -= size + 8;
    }
  }

  return pdfDoc.save();
}

describe('Document Compare Engine (PDF Diff)', () => {
  it('diffs a reflowed pair — inserting a sentence on page 1 of 10 pages does NOT report pages 2–10 as changed', async () => {
    // Build 10-page document A
    const sampleWords = [
      'The purpose of this agreement is to establish the terms and conditions governing the provision of consulting services.',
      'Both parties agree to exercise reasonable care and diligence in fulfilling their respective obligations hereunder.',
      'All proprietary information disclosed under this agreement shall remain the exclusive property of the disclosing party.',
      'Payments shall be remitted within thirty calendar days of invoice receipt through standard electronic funds transfer.',
      'Neither party shall assign or transfer any rights or responsibilities without prior written consent from the other party.',
      'This agreement constitutes the complete and exclusive statement of understanding between the contracting entities.',
    ];

    const pagesA: Array<Array<{ text: string }>> = [];
    for (let p = 1; p <= 10; p++) {
      pagesA.push([
        {
          text: `Page ${p} Section Header: Operational Overview and Framework Requirements.`,
        },
        { text: sampleWords[(p * 2) % sampleWords.length] },
        { text: sampleWords[(p * 3) % sampleWords.length] },
        { text: sampleWords[(p * 5) % sampleWords.length] },
      ]);
    }

    const pdfA = await createTestPdf(pagesA);

    // Build document B: identical 10 pages, BUT insert one sentence on Page 1!
    // In physical reality, this causes reflow across pages.
    const pagesB: Array<Array<{ text: string }>> = pagesA.map(
      (lines, pageIdx) => {
        if (pageIdx === 0) {
          return [
            lines[0],
            {
              text: 'NEW CRITICAL SENTENCE INSERTED ON PAGE ONE FOR COMPLIANCE.',
            },
            ...lines.slice(1),
          ];
        }
        return [...lines];
      },
    );

    const pdfB = await createTestPdf(pagesB);

    const result = await comparePdfs(pdfA, pdfB, {
      docAName: 'contract-v1.pdf',
      docBName: 'contract-v2.pdf',
    });

    // Verify:
    // 1. Page 1 has changes
    expect(result.summary.changedPagesB).toContain(1);

    // 2. THE CRITICAL REFLOW TEST: Pages 2 through 10 must NOT be reported as changed!
    for (let p = 2; p <= 10; p++) {
      expect(
        result.summary.changedPagesB,
        `Page ${p} was incorrectly reported as changed`,
      ).not.toContain(p);
    }

    // 3. Exactly 1 substantive insertion was detected
    expect(result.summary.insertions).toBe(1);
    const insertion = result.changes.find((c) => c.type === 'insert');
    expect(insertion?.revisedText).toContain('NEW CRITICAL SENTENCE');

    // 4. Zero deletions
    expect(result.summary.deletions).toBe(0);

    // 5. Page summaries for pages 2-10 confirm no substantive changes
    const subsequentPages = result.summary.pageSummariesB.filter(
      (p) => p.pageNumber > 1,
    );
    expect(subsequentPages.every((p) => !p.hasSubstantiveChanges)).toBe(true);
  });

  it('detects moved clauses as moves rather than delete-plus-insert', async () => {
    const clause =
      'The confidentiality obligations shall strictly survive termination for seven full years.';

    // Doc A has clause on Page 1
    const pdfA = await createTestPdf([
      [
        { text: 'Contract Preamble and Basic Definitions.' },
        { text: clause },
        { text: 'Standard indemnification provisions.' },
      ],
      [{ text: 'Page 2 Boilerplate and Governing Law.' }],
      [{ text: 'Page 3 Signature and Execution Block.' }],
    ]);

    // Doc B moves clause to Page 3
    const pdfB = await createTestPdf([
      [
        { text: 'Contract Preamble and Basic Definitions.' },
        { text: 'Standard indemnification provisions.' },
      ],
      [{ text: 'Page 2 Boilerplate and Governing Law.' }],
      [{ text: 'Page 3 Signature and Execution Block.' }, { text: clause }],
    ]);

    const result = await comparePdfs(pdfA, pdfB);

    // Assert move is detected
    expect(result.summary.moves).toBe(1);
    const move = result.changes.find((c) => c.type === 'move');
    expect(move).toBeDefined();
    expect(move?.movedFromPage).toBe(1);
    expect(move?.movedToPage).toBe(3);
    expect(move?.originalText).toContain('confidentiality obligations');
  });

  it('reports formatting-only changes separately without polluting substantive changes', async () => {
    // Doc A has normal text
    const pdfA = await createTestPdf([
      [
        { text: 'The terms of payment are Net 30 days.' },
        { text: 'Late fees shall apply at standard rates.' },
      ],
    ]);

    // Doc B has the exact same words, but first line is bold
    const pdfB = await createTestPdf([
      [
        { text: 'The terms of payment are Net 30 days.', bold: true },
        { text: 'Late fees shall apply at standard rates.' },
      ],
    ]);

    const result = await comparePdfs(pdfA, pdfB);

    // Formatting only reported separately
    expect(result.summary.formatOnly).toBeGreaterThanOrEqual(1);
    expect(result.summary.insertions).toBe(0);
    expect(result.summary.deletions).toBe(0);
    expect(result.summary.moves).toBe(0);

    const fmt = result.changes.find((c) => c.type === 'format');
    expect(fmt?.description).toContain('bold');
  });

  it('refuses scanned PDFs with no text layer by name and links to /pdf/ocr', async () => {
    // Create an empty PDF with no text elements
    const emptyPdfDoc = await PDFDocument.create();
    emptyPdfDoc.addPage([595, 842]);
    const scanBytes = await emptyPdfDoc.save();

    const normalDoc = await createTestPdf([[{ text: 'Normal text page.' }]]);

    await expect(
      comparePdfs(scanBytes, normalDoc, { docAName: 'scanned-receipt.pdf' }),
    ).rejects.toThrow(NoTextLayerError);

    await expect(
      comparePdfs(scanBytes, normalDoc, { docAName: 'scanned-receipt.pdf' }),
    ).rejects.toThrow(
      /scanned-receipt\.pdf.*contains no text layer.*\/pdf\/ocr/u,
    );
  });

  it('generates annotated PDF, redline DOCX, and change list CSV without arbitrary score', async () => {
    const pdfA = await createTestPdf([
      [{ text: 'Original provision 1.' }, { text: 'Deleted provision 2.' }],
    ]);
    const pdfB = await createTestPdf([
      [
        { text: 'Original provision 1.' },
        { text: 'New provision 3 inserted.' },
      ],
    ]);

    const result = await comparePdfs(pdfA, pdfB);

    // No score anywhere
    expect(
      (result.summary as unknown as Record<string, unknown>).score,
    ).toBeUndefined();
    expect(
      (result.summary as unknown as Record<string, unknown>).qualityScore,
    ).toBeUndefined();

    // 1. Annotated PDF
    const annotatedPdfBytes = await generateAnnotatedPdf(
      pdfB,
      result,
      'revised',
    );
    expect(annotatedPdfBytes.length).toBeGreaterThan(500);

    // 2. Redline DOCX
    const redlineDocxBytes = await generateRedlineDocx(result);
    expect(redlineDocxBytes.length).toBeGreaterThan(500);

    // 3. Change List CSV
    const csv = generateChangeListCsv(result);
    expect(csv).toContain('Change ID,Type,Original Page,Revised Page');
    expect(csv).toContain('INSERT');
    expect(csv).toContain('DELETE');
  });
});
