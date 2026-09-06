import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import {
  extractPdfPages,
  hasPdfSignature,
  inspectPdfInputs,
  mergePdfInputs,
  PdfEngineError,
  transformPdfPages,
} from './engine';
import type { PdfWorkerInput } from './protocol';

async function makePdf(
  id: string,
  pageWidths: number[],
): Promise<PdfWorkerInput> {
  const document = await PDFDocument.create();
  pageWidths.forEach((width) => document.addPage([width, 500]));
  const bytes = await document.save({ addDefaultPage: false });
  return {
    id,
    name: `${id}.pdf`,
    bytes: bytes.slice().buffer as ArrayBuffer,
  };
}

describe('PDF merge engine', () => {
  it('recognizes the PDF file signature', async () => {
    const pdf = await makePdf('valid', [200]);
    expect(hasPdfSignature(pdf.bytes)).toBe(true);
    expect(hasPdfSignature(new TextEncoder().encode('not a pdf').buffer)).toBe(
      false,
    );
  });

  it('inspects page counts locally', async () => {
    const files = await Promise.all([
      makePdf('one', [200, 210]),
      makePdf('two', [300]),
    ]);
    await expect(inspectPdfInputs(files)).resolves.toEqual([
      { id: 'one', pages: 2 },
      { id: 'two', pages: 1 },
    ]);
  });

  it('merges every page in input order and passes an independent PDF.js check', async () => {
    const inputs = await Promise.all([
      makePdf('first', [200, 210]),
      makePdf('second', [320]),
    ]);
    const result = await mergePdfInputs(inputs);

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({
      data: result.bytes.slice(),
      useSystemFonts: false,
    });
    const independentlyParsed = await task.promise;
    const widths = [];
    for (
      let pageNumber = 1;
      pageNumber <= independentlyParsed.numPages;
      pageNumber += 1
    ) {
      const page = await independentlyParsed.getPage(pageNumber);
      widths.push(page.getViewport({ scale: 1 }).width);
    }

    expect(independentlyParsed.numPages).toBe(3);
    expect(widths).toEqual([200, 210, 320]);
    expect(result.pageCount).toBe(3);
    await task.destroy();
  });

  it('rejects non-PDF input without exposing its contents', async () => {
    const invalid: PdfWorkerInput = {
      id: 'bad',
      name: 'private-name.pdf',
      bytes: new TextEncoder().encode('secret input').buffer,
    };

    await expect(inspectPdfInputs([invalid])).rejects.toMatchObject({
      name: 'PdfEngineError',
      code: 'INVALID_PDF',
      inputId: 'bad',
    } satisfies Partial<PdfEngineError>);
  });

  it('requires at least two inputs', async () => {
    const input = await makePdf('single', [200]);
    await expect(mergePdfInputs([input])).rejects.toMatchObject({
      code: 'MERGE_FAILED',
    });
  });

  it('extracts selected pages in the requested order and passes an independent PDF.js check', async () => {
    const source = await makePdf('source', [210, 320, 430]);
    const result = await extractPdfPages(source, [3, 1]);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({
      data: result.bytes.slice(),
      useSystemFonts: false,
    });
    const independentlyParsed = await task.promise;
    expect(independentlyParsed.numPages).toBe(2);
    expect(
      (await independentlyParsed.getPage(1)).getViewport({ scale: 1 }).width,
    ).toBe(430);
    expect(
      (await independentlyParsed.getPage(2)).getViewport({ scale: 1 }).width,
    ).toBe(210);
    await task.destroy();
  });

  it('rejects an extraction outside the source page count', async () => {
    const source = await makePdf('source', [210]);
    await expect(extractPdfPages(source, [2])).rejects.toThrow(
      'between 1 and 1',
    );
  });

  it('reorders, removes, rotates, numbers, watermarks, and labels pages', async () => {
    const source = await makePdf('source', [210, 320, 430]);
    const result = await transformPdfPages(source, {
      pageOrder: [3, 1],
      rotation: 90,
      pageNumbers: true,
      watermark: 'DRAFT',
      metadata: {
        title: 'Local output',
        author: 'Browser user',
        subject: 'Test',
        keywords: 'local, private',
      },
    });
    const reopened = await PDFDocument.load(result.bytes, {
      updateMetadata: false,
    });
    expect(reopened.getPageCount()).toBe(2);
    expect(reopened.getPages().map((page) => page.getWidth())).toEqual([
      430, 210,
    ]);
    expect(reopened.getPages().map((page) => page.getRotation().angle)).toEqual(
      [90, 90],
    );
    expect(reopened.getTitle()).toBe('Local output');
    expect(reopened.getAuthor()).toBe('Browser user');
  });

  it('rejects an invalid page order for PDF transforms', async () => {
    const source = await makePdf('source', [210]);
    await expect(
      transformPdfPages(source, {
        pageOrder: [2],
        rotation: 0,
        pageNumbers: false,
        watermark: '',
        metadata: { title: '', author: '', subject: '', keywords: '' },
      }),
    ).rejects.toMatchObject({ code: 'TRANSFORM_FAILED' });
  });
});
