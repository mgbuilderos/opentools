import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { readPdfText } from './pdf-text';
import {
  addInvisibleTextLayer,
  plainTextFromPages,
  searchablePdfFileName,
  textFileName,
  type OcrPdfPageResult,
} from './ocr-pdf';

const pageResult: OcrPdfPageResult = {
  pageNumber: 1,
  text: 'HELLO OCR',
  confidence: 96,
  width: 600,
  height: 800,
  words: [
    {
      text: 'HELLO',
      confidence: 97,
      lowConfidence: false,
      box: { x0: 60, y0: 80, x1: 180, y1: 120 },
    },
    {
      text: 'OCR',
      confidence: 95,
      lowConfidence: false,
      box: { x0: 200, y0: 80, x1: 280, y1: 120 },
    },
  ],
};

describe('PDF OCR output', () => {
  it('preserves page count and makes mode-3 text independently extractable', async () => {
    const source = await PDFDocument.create();
    source.addPage([600, 800]);
    const output = await addInvisibleTextLayer(await source.save(), [
      pageResult,
    ]);

    expect(output.pageCount).toBe(1);
    expect(output.wordCount).toBe(2);
    const reopened = await PDFDocument.load(output.bytes);
    expect(reopened.getPageCount()).toBe(1);
    const extracted = await readPdfText(output.bytes);
    expect(
      extracted
        .flatMap((page) => page.items)
        .map((item) => item.text)
        .join(' '),
    ).toContain('HELLO OCR');
  });

  it('builds plain text and deterministic output names', () => {
    expect(
      plainTextFromPages([pageResult, { ...pageResult, pageNumber: 2 }]),
    ).toBe('HELLO OCR\n\nHELLO OCR');
    expect(textFileName('scan.pdf')).toBe('scan-ocr.txt');
    expect(searchablePdfFileName('scan.pdf')).toBe('scan-searchable.pdf');
  });

  it('refuses a result set that does not cover every source page', async () => {
    const source = await PDFDocument.create();
    source.addPage();
    source.addPage();
    await expect(
      addInvisibleTextLayer(await source.save(), [pageResult]),
    ).rejects.toThrow(/page count/u);
  });
});
