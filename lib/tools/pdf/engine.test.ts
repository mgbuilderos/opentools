import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import {
  compressPdf,
  extractPdfPages,
  hasPdfSignature,
  imagesToPdf,
  inspectPdfInputs,
  mergePdfInputs,
  PdfEngineError,
  transformPdfPages,
} from './engine';
import type { JpegReencoder } from './jpeg-reencode';
import type { PdfImageInput, PdfWorkerInput } from './protocol';

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

  it('embeds ordered PNG images into a validated fixed-size PDF', async () => {
    const png = Uint8Array.from(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    const inputs: PdfImageInput[] = ['first', 'second'].map((id) => ({
      id,
      name: `${id}.png`,
      mimeType: 'image/png',
      bytes: png.slice().buffer,
    }));
    const result = await imagesToPdf(inputs, {
      pageSize: 'a4',
      orientation: 'portrait',
      margin: 24,
    });
    const reopened = await PDFDocument.load(result.bytes, {
      updateMetadata: false,
    });
    expect(reopened.getPageCount()).toBe(2);
    expect(reopened.getPages()[0]?.getWidth()).toBeCloseTo(595.28, 2);
    expect(reopened.getPages()[0]?.getHeight()).toBeCloseTo(841.89, 2);
  });

  it('rejects an image whose bytes do not match its declared type', async () => {
    const invalid: PdfImageInput = {
      id: 'bad-image',
      name: 'private.png',
      mimeType: 'image/png',
      bytes: new TextEncoder().encode('not an image').buffer,
    };
    await expect(
      imagesToPdf([invalid], {
        pageSize: 'image',
        orientation: 'auto',
        margin: 0,
      }),
    ).rejects.toMatchObject({
      code: 'IMAGE_TO_PDF_FAILED',
      inputId: 'bad-image',
    });
  });

  it('flattens PDF pages and preserves valid PDF output', async () => {
    const input = await makePdf('to-flatten', [300]);
    const result = await transformPdfPages(input, {
      pageOrder: [1],
      rotation: 0,
      pageNumbers: false,
      watermark: '',
      metadata: { title: '', author: '', subject: '', keywords: '' },
      flatten: true,
    });
    expect(result.pageCount).toBe(1);
    expect(result.bytes.byteLength).toBeGreaterThan(100);
  });
});

/**
 * Builds a PDF carrying one image XObject with the dictionary given.
 *
 * The bytes are filler: the compressor never decodes an image itself, it hands
 * the stream to the re-encoder, so a test that injects its own re-encoder needs
 * a correct dictionary and nothing more.
 */
async function makePdfWithImage(
  id: string,
  dictEntries: Record<string, unknown>,
  contents = new Uint8Array(4096).fill(0x7f),
): Promise<PdfWorkerInput> {
  const document = await PDFDocument.create();
  document.addPage([300, 400]);
  const dict = document.context.obj({
    Type: 'XObject',
    Subtype: 'Image',
    ...dictEntries,
  });
  document.context.register(PDFRawStream.of(dict, contents));
  const bytes = await document.save({ addDefaultPage: false });
  return { id, name: `${id}.pdf`, bytes: bytes.slice().buffer as ArrayBuffer };
}

const jpegImageDict = {
  Width: 200,
  Height: 100,
  ColorSpace: 'DeviceRGB',
  BitsPerComponent: 8,
  Filter: 'DCTDecode',
};

/** Stands in for the browser canvas: always returns something half the size. */
const halvingReencoder: JpegReencoder = async (bytes) => ({
  bytes: new Uint8Array(Math.floor(bytes.length / 2)).fill(0x40),
  width: 100,
  height: 50,
});

const compressOptions = {
  recompressImages: true,
  imageQuality: 70,
  maxImageDimension: 2000,
  removeMetadata: true,
};

describe('PDF compression engine', () => {
  it('keeps every page and reports real before and after sizes', async () => {
    const pdf = await makePdf('lossless', [200, 300, 400]);
    const result = await compressPdf(pdf, {
      ...compressOptions,
      recompressImages: false,
    });

    expect(result.pageCount).toBe(3);
    expect(result.originalByteLength).toBe(pdf.bytes.byteLength);
    expect(result.compressedByteLength).toBe(result.bytes.length);
    expect(result.imagesRecompressed).toBe(0);
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getPageCount()).toBe(3);
  });

  it('clears document metadata when asked', async () => {
    const source = await PDFDocument.create();
    source.addPage([200, 300]);
    source.setTitle('Quarterly figures');
    source.setAuthor('Someone');
    const bytes = await source.save({ addDefaultPage: false });
    const pdf: PdfWorkerInput = {
      id: 'meta',
      name: 'meta.pdf',
      bytes: bytes.slice().buffer as ArrayBuffer,
    };

    const result = await compressPdf(pdf, {
      ...compressOptions,
      recompressImages: false,
    });
    const reopened = await PDFDocument.load(result.bytes, {
      updateMetadata: false,
    });
    expect(reopened.getTitle() ?? '').toBe('');
    expect(reopened.getAuthor() ?? '').toBe('');
  });

  it('re-encodes an eligible JPEG and records its new dimensions', async () => {
    const pdf = await makePdfWithImage('jpeg', jpegImageDict);
    const result = await compressPdf(pdf, compressOptions, halvingReencoder);

    expect(result.imagesRecompressed).toBe(1);
    expect(result.compressedByteLength).toBeLessThan(result.originalByteLength);

    const reopened = await PDFDocument.load(result.bytes);
    const image = reopened.context
      .enumerateIndirectObjects()
      .map(([, object]) => object)
      .find(
        (object): object is PDFRawStream =>
          object instanceof PDFRawStream &&
          object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
      );
    expect(image).toBeDefined();
    expect((image!.dict.get(PDFName.of('Width')) as PDFNumber).asNumber()).toBe(
      100,
    );
    expect(
      (image!.dict.get(PDFName.of('Height')) as PDFNumber).asNumber(),
    ).toBe(50);
    expect(image!.contents.length).toBe(2048);
  });

  it.each([
    ['a filter it cannot rewrite', { ...jpegImageDict, Filter: 'FlateDecode' }],
    [
      'a colour space it cannot rewrite',
      { ...jpegImageDict, ColorSpace: 'DeviceCMYK' },
    ],
    [
      'a bit depth it cannot rewrite',
      { ...jpegImageDict, BitsPerComponent: 4 },
    ],
    ['a custom decode array', { ...jpegImageDict, Decode: [1, 0, 1, 0, 1, 0] }],
  ])('leaves an image with %s alone', async (_label, dictEntries) => {
    const pdf = await makePdfWithImage('skip', dictEntries);
    const result = await compressPdf(pdf, compressOptions, halvingReencoder);

    expect(result.imagesRecompressed).toBe(0);
    expect(result.imagesLeftAlone).toBeGreaterThan(0);
  });

  it('returns the original file untouched when nothing could be saved', async () => {
    const pdf = await makePdf('already-small', [200]);
    const result = await compressPdf(pdf, {
      ...compressOptions,
      recompressImages: false,
    });

    if (result.compressedByteLength === result.originalByteLength) {
      expect(result.bytes.length).toBe(pdf.bytes.byteLength);
      expect(result.imagesRecompressed).toBe(0);
    }
    // Whatever happened, the tool must never hand back a bigger file.
    expect(result.compressedByteLength).toBeLessThanOrEqual(
      result.originalByteLength,
    );
  });

  it('skips the image pass when the runtime has no re-encoder', async () => {
    const pdf = await makePdfWithImage('no-canvas', jpegImageDict);
    const result = await compressPdf(pdf, compressOptions);

    expect(result.imagesRecompressed).toBe(0);
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getPageCount()).toBe(1);
  });

  it('refuses a file that is not a PDF', async () => {
    const notPdf: PdfWorkerInput = {
      id: 'bad',
      name: 'bad.pdf',
      bytes: new TextEncoder().encode('definitely not a pdf')
        .buffer as ArrayBuffer,
    };
    await expect(compressPdf(notPdf, compressOptions)).rejects.toBeInstanceOf(
      PdfEngineError,
    );
  });
});
