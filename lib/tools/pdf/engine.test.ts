import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import {
  compressPdf,
  extractPdfPages,
  fillPdfForm,
  inspectPdfForm,
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

/** A PDF carrying one of each fillable field type pdf-lib supports. */
async function makeFormPdf(id = 'form'): Promise<PdfWorkerInput> {
  const document = await PDFDocument.create();
  const page = document.addPage([400, 500]);
  const form = document.getForm();

  const name = form.createTextField('applicant.name');
  name.setText('');
  name.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });

  const notes = form.createTextField('applicant.notes');
  notes.enableMultiline();
  notes.addToPage(page, { x: 40, y: 340, width: 300, height: 60 });

  const agree = form.createCheckBox('agree.terms');
  agree.addToPage(page, { x: 40, y: 300, width: 16, height: 16 });

  const plan = form.createRadioGroup('plan.choice');
  plan.addOptionToPage('monthly', page, {
    x: 40,
    y: 260,
    width: 16,
    height: 16,
  });
  plan.addOptionToPage('yearly', page, {
    x: 100,
    y: 260,
    width: 16,
    height: 16,
  });

  const country = form.createDropdown('address.country');
  country.addOptions(['India', 'Singapore', 'United Kingdom']);
  country.addToPage(page, { x: 40, y: 210, width: 200, height: 24 });

  const locked = form.createTextField('reference.number');
  locked.setText('REF-100');
  locked.addToPage(page, { x: 40, y: 160, width: 200, height: 24 });
  locked.enableReadOnly();

  const bytes = await document.save({ addDefaultPage: false });
  return { id, name: `${id}.pdf`, bytes: bytes.slice().buffer as ArrayBuffer };
}

/** A 2x2 PNG, enough for pdf-lib to embed as a signature stamp. */
function signaturePng(): ArrayBuffer {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8//8/AzbAxIAHDDlJAKDlAwOJQmnAAAAAAElFTkSuQmCC';
  const binary = Buffer.from(base64, 'base64');
  return binary.buffer.slice(
    binary.byteOffset,
    binary.byteOffset + binary.byteLength,
  ) as ArrayBuffer;
}

const emptyFill = { values: {}, signature: null, flatten: false };

describe('PDF form engine', () => {
  it('describes every fillable field and its current value', async () => {
    const { fields, pages, pageSizes } = await inspectPdfForm(
      await makeFormPdf(),
    );

    expect(pages).toBe(1);
    expect(pageSizes[0]).toEqual({ width: 400, height: 500 });

    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    expect(byName['applicant.name']?.kind).toBe('text');
    expect(byName['applicant.notes']?.multiline).toBe(true);
    expect(byName['agree.terms']?.kind).toBe('checkbox');
    expect(byName['agree.terms']?.value).toBe('off');
    expect(byName['plan.choice']?.kind).toBe('radio');
    expect(byName['plan.choice']?.options).toEqual(['monthly', 'yearly']);
    expect(byName['address.country']?.options).toContain('Singapore');
    expect(byName['reference.number']?.readOnly).toBe(true);
    expect(byName['reference.number']?.value).toBe('REF-100');
  });

  it('reports no fields for a PDF that has no form, without failing', async () => {
    const { fields, pages } = await inspectPdfForm(
      await makePdf('plain', [200]),
    );
    expect(fields).toEqual([]);
    expect(pages).toBe(1);
  });

  it('writes values back and they survive a reload', async () => {
    const result = await fillPdfForm(await makeFormPdf(), {
      ...emptyFill,
      values: {
        'applicant.name': 'Maulik Gupta',
        'agree.terms': 'on',
        'plan.choice': 'yearly',
        'address.country': 'Singapore',
      },
    });

    expect(result.fieldsFilled).toBe(4);
    expect(result.flattened).toBe(false);

    const form = (await PDFDocument.load(result.bytes)).getForm();
    expect(form.getTextField('applicant.name').getText()).toBe('Maulik Gupta');
    expect(form.getCheckBox('agree.terms').isChecked()).toBe(true);
    expect(form.getRadioGroup('plan.choice').getSelected()).toBe('yearly');
    expect(form.getDropdown('address.country').getSelected()).toEqual([
      'Singapore',
    ]);
  });

  it('refuses to write into a read-only field', async () => {
    const result = await fillPdfForm(await makeFormPdf(), {
      ...emptyFill,
      values: { 'reference.number': 'REF-999' },
    });

    expect(result.fieldsFilled).toBe(0);
    const form = (await PDFDocument.load(result.bytes)).getForm();
    expect(form.getTextField('reference.number').getText()).toBe('REF-100');
  });

  it('ignores a field name the document does not have', async () => {
    const result = await fillPdfForm(await makeFormPdf(), {
      ...emptyFill,
      values: { 'not.a.field': 'x', 'applicant.name': 'Kept' },
    });

    expect(result.fieldsFilled).toBe(1);
    const form = (await PDFDocument.load(result.bytes)).getForm();
    expect(form.getTextField('applicant.name').getText()).toBe('Kept');
  });

  it('reports the value a field would not accept, naming the field', async () => {
    await expect(
      fillPdfForm(await makeFormPdf(), {
        ...emptyFill,
        values: { 'plan.choice': 'weekly' },
      }),
    ).rejects.toThrow(/plan\.choice/u);
  });

  it('flattening leaves the values on the page and removes the form', async () => {
    const result = await fillPdfForm(await makeFormPdf(), {
      ...emptyFill,
      values: { 'applicant.name': 'Final Answer' },
      flatten: true,
    });

    expect(result.flattened).toBe(true);
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getForm().getFields()).toHaveLength(0);
    expect(reopened.getPageCount()).toBe(1);
  });

  it('stamps a signature on the page that was asked for', async () => {
    const result = await fillPdfForm(await makeFormPdf(), {
      ...emptyFill,
      signature: {
        image: signaturePng(),
        pageIndex: 0,
        x: 40,
        y: 60,
        width: 120,
      },
    });

    expect(result.signaturePlaced).toBe(true);
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(1);
  });

  it('refuses a signature aimed at a page that does not exist', async () => {
    await expect(
      fillPdfForm(await makeFormPdf(), {
        ...emptyFill,
        signature: {
          image: signaturePng(),
          pageIndex: 7,
          x: 0,
          y: 0,
          width: 100,
        },
      }),
    ).rejects.toThrow(/between 1 and 1/u);
  });

  it('refuses a signature image it cannot read', async () => {
    await expect(
      fillPdfForm(await makeFormPdf(), {
        ...emptyFill,
        signature: {
          image: new TextEncoder().encode('not a png').buffer as ArrayBuffer,
          pageIndex: 0,
          x: 0,
          y: 0,
          width: 100,
        },
      }),
    ).rejects.toThrow(/could not be read/u);
  });
});
