import {
  concatTransformationMatrix,
  decodePDFRawStream,
  degrees,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFString,
} from 'pdf-lib';
import type { PDFObject } from 'pdf-lib';
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
import { encryptedPdfFixtures, fixtureBytes } from './pdf-encryption.fixtures';
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

function toInput(bytes: Uint8Array, id = 'form'): PdfWorkerInput {
  return { id, name: `${id}.pdf`, bytes: bytes.slice().buffer as ArrayBuffer };
}

/** Field ids by name, as the UI would key its state. */
async function idsOf(input: PdfWorkerInput) {
  const { fields } = await inspectPdfForm(input);
  return Object.fromEntries(fields.map((field) => [field.name, field.id]));
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as PdfEngineError;
  }
  throw new Error('Expected the promise to reject');
}

type Matrix = [number, number, number, number, number, number];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

function streamText(document: PDFDocument, raw: PDFObject | undefined) {
  const stream = raw ? document.context.lookup(raw) : undefined;
  if (!(stream instanceof PDFRawStream)) return '';
  return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
}

/**
 * Runs a page's content streams far enough to know the CTM at every Do, so a
 * test can see where each XObject really lands, including any transform the
 * original content left behind.
 */
function pageDraws(document: PDFDocument, pageIndex: number) {
  const page = document.getPage(pageIndex);
  const contents = page.node.get(PDFName.of('Contents'));
  const resolved = contents ? document.context.lookup(contents) : undefined;
  const parts =
    resolved instanceof PDFArray
      ? resolved.asArray()
      : contents
        ? [contents]
        : [];
  const source = parts.map((part) => streamText(document, part)).join('\n');
  const tokens = source.split(/\s+/u).filter(Boolean);

  const identity: Matrix = [1, 0, 0, 1, 0, 0];
  let ctm = identity;
  const saved: Matrix[] = [];
  let operands: string[] = [];
  const draws: Array<{ name: string; ctm: Matrix }> = [];
  for (const token of tokens) {
    if (/^[-+]?(\d+\.?\d*|\.\d+)$/u.test(token) || token.startsWith('/')) {
      operands.push(token);
      continue;
    }
    if (token === 'q') saved.push(ctm);
    else if (token === 'Q') ctm = saved.pop() ?? identity;
    else if (token === 'cm') {
      ctm = multiply(operands.slice(-6).map(Number) as Matrix, ctm);
    } else if (token === 'Do') {
      draws.push({ name: operands[operands.length - 1]!.slice(1), ctm });
    }
    operands = [];
  }

  const xObjects = page.node
    .Resources()
    ?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  return draws.map((draw) => {
    const raw = xObjects?.get(PDFName.of(draw.name));
    const object = raw ? document.context.lookup(raw) : undefined;
    const subtype =
      object instanceof PDFRawStream
        ? object.dict.get(PDFName.of('Subtype'))?.toString()
        : undefined;
    return { ...draw, subtype, raw };
  });
}

/** The text drawn by every form XObject placed on a page. */
function flattenedText(document: PDFDocument, pageIndex: number) {
  return pageDraws(document, pageIndex)
    .filter((draw) => draw.subtype === '/Form')
    .map((draw) => streamText(document, draw.raw))
    .join('\n')
    .toLowerCase();
}

/** How pdf-lib writes WinAnsi text into an appearance: a hex string. */
function hexOf(text: string) {
  return Buffer.from(text, 'latin1').toString('hex').toLowerCase();
}

/** Every page /Annots entry resolves, and none is a form widget. */
function annotationsAreClean(document: PDFDocument) {
  return document.getPages().every((page) => {
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (!annots) return true;
    return annots.asArray().every((raw) => {
      const annot = document.context.lookup(raw);
      return (
        annot instanceof PDFDict &&
        annot.get(PDFName.of('Subtype'))?.toString() !== '/Widget'
      );
    });
  });
}

describe('PDF form engine', () => {
  it('describes every fillable field and its current value', async () => {
    const { fields, pages, pageSizes, document } = await inspectPdfForm(
      await makeFormPdf(),
    );

    expect(pages).toBe(1);
    expect(pageSizes[0]).toEqual({
      box: { x: 0, y: 0, width: 400, height: 500 },
      rotation: 0,
      width: 400,
      height: 500,
    });
    expect(document).toEqual({
      hasDigitalSignature: false,
      xfa: 'none',
      formUnreadable: false,
    });

    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
    expect(byName['applicant.name']?.kind).toBe('text');
    expect(byName['applicant.notes']?.multiline).toBe(true);
    expect(byName['agree.terms']?.kind).toBe('checkbox');
    expect(byName['agree.terms']?.value).toBe(false);
    expect(byName['plan.choice']?.kind).toBe('radio');
    expect(byName['plan.choice']?.options).toEqual([
      { value: 'monthly', display: 'monthly' },
      { value: 'yearly', display: 'yearly' },
    ]);
    expect(byName['address.country']?.options).toContainEqual({
      value: 'Singapore',
      display: 'Singapore',
    });
    expect(byName['reference.number']?.readOnly).toBe(true);
    expect(byName['reference.number']?.readOnlyReason).toBe('locked');
    expect(byName['reference.number']?.value).toBe('REF-100');
    expect(byName['applicant.name']).toMatchObject({
      hidden: false,
      required: false,
      pageIndex: 0,
    });
  });

  it('reports no fields for a PDF that has no form, without failing', async () => {
    const { fields, pages } = await inspectPdfForm(
      await makePdf('plain', [200]),
    );
    expect(fields).toEqual([]);
    expect(pages).toBe(1);
  });

  it('writes values back and they survive a reload', async () => {
    const input = await makeFormPdf();
    const ids = await idsOf(input);
    const result = await fillPdfForm(input, {
      ...emptyFill,
      values: {
        [ids['applicant.name']!]: 'Maulik Gupta',
        [ids['agree.terms']!]: true,
        [ids['plan.choice']!]: 'yearly',
        [ids['address.country']!]: 'Singapore',
      },
    });

    expect(result.fieldsChanged).toBe(4);
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
    const input = await makeFormPdf();
    const ids = await idsOf(input);
    const result = await fillPdfForm(input, {
      ...emptyFill,
      values: { [ids['reference.number']!]: 'REF-999' },
    });

    expect(result.fieldsChanged).toBe(0);
    const form = (await PDFDocument.load(result.bytes)).getForm();
    expect(form.getTextField('reference.number').getText()).toBe('REF-100');
  });

  it('ignores a field id the document does not have', async () => {
    const input = await makeFormPdf();
    const ids = await idsOf(input);
    const result = await fillPdfForm(input, {
      ...emptyFill,
      values: { '9999-0': 'x', [ids['applicant.name']!]: 'Kept' },
    });

    expect(result.fieldsChanged).toBe(1);
    const form = (await PDFDocument.load(result.bytes)).getForm();
    expect(form.getTextField('applicant.name').getText()).toBe('Kept');
  });

  it('reports the value a field would not accept, naming the field in plain words', async () => {
    const input = await makeFormPdf();
    const ids = await idsOf(input);
    const error = await rejection(
      fillPdfForm(input, {
        ...emptyFill,
        values: { [ids['plan.choice']!]: 'weekly' },
      }),
    );
    expect(error).toBeInstanceOf(PdfEngineError);
    expect(error.code).toBe('FILL_FAILED');
    expect(error.message).toMatch(/plan\.choice/u);
    expect(error.message).not.toMatch(/must be one of/u);
    expect(error.fieldIds).toEqual([ids['plan.choice']]);
  });

  it('flattening leaves the values on the page and removes the form', async () => {
    const input = await makeFormPdf();
    const ids = await idsOf(input);
    const result = await fillPdfForm(input, {
      ...emptyFill,
      values: { [ids['applicant.name']!]: 'Final Answer' },
      flatten: true,
    });

    expect(result.flattened).toBe(true);
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getForm().getFields()).toHaveLength(0);
    expect(reopened.getPageCount()).toBe(1);
    expect(flattenedText(reopened, 0)).toContain(hexOf('Final Answer'));
    expect(flattenedText(reopened, 0)).toContain(hexOf('REF-100'));
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
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getPageCount()).toBe(1);
    expect(
      pageDraws(reopened, 0).filter((draw) => draw.subtype === '/Image'),
    ).toHaveLength(1);
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

describe('PDF form engine: only changed fields are written', () => {
  it('counts and rewrites only the fields whose value changed', async () => {
    const input = await makeFormPdf();
    const inspected = await inspectPdfForm(input);
    const values = Object.fromEntries(
      inspected.fields
        .filter((field) => !field.readOnly)
        .map((field) => [field.id, field.value]),
    );
    const name = inspected.fields.find((f) => f.name === 'applicant.name')!;
    values[name.id] = 'Only this';

    const source = await PDFDocument.load(input.bytes);
    const notesWidget = source
      .getForm()
      .getTextField('applicant.notes')
      .acroField.getWidgets()[0]!;
    const notesAppearance = notesWidget.dict
      .lookup(PDFName.of('AP'), PDFDict)
      .get(PDFName.of('N'))
      ?.toString();

    const result = await fillPdfForm(input, { ...emptyFill, values });
    expect(result.fieldsChanged).toBe(1);

    const form = (await PDFDocument.load(result.bytes)).getForm();
    const outNotes = form
      .getTextField('applicant.notes')
      .acroField.getWidgets()[0]!;
    // The untouched field still points at its original appearance stream.
    expect(
      outNotes.dict
        .lookup(PDFName.of('AP'), PDFDict)
        .get(PDFName.of('N'))
        ?.toString(),
    ).toBe(notesAppearance);
    expect(form.getTextField('applicant.name').getText()).toBe('Only this');
  });

  it('keeps every selection of a multi-select list nobody touched, and writes string[] when changed', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const languages = form.createOptionList('languages');
    languages.addOptions(['English', 'Hindi', 'Kannada']);
    languages.enableMultiselect();
    languages.select(['English', 'Kannada']);
    languages.addToPage(page, { x: 40, y: 300, width: 200, height: 100 });
    const other = form.createTextField('other');
    other.addToPage(page, { x: 40, y: 420, width: 200, height: 24 });
    const bytes = await document.save();

    const inspected = await inspectPdfForm(toInput(bytes));
    const list = inspected.fields.find((f) => f.name === 'languages')!;
    expect(list).toMatchObject({
      kind: 'optionList',
      multiSelect: true,
      value: ['English', 'Kannada'],
    });
    const otherId = inspected.fields.find((f) => f.name === 'other')!.id;

    const untouched = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [otherId]: 'changed', [list.id]: ['Kannada', 'English'] },
    });
    expect(untouched.fieldsChanged).toBe(1);
    expect(
      (await PDFDocument.load(untouched.bytes))
        .getForm()
        .getOptionList('languages')
        .getSelected(),
    ).toEqual(['English', 'Kannada']);

    const changed = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [list.id]: ['Hindi', 'Kannada'] },
    });
    const out = (await PDFDocument.load(changed.bytes))
      .getForm()
      .getOptionList('languages');
    expect(out.getSelected()).toEqual(['Hindi', 'Kannada']);
    expect(out.acroField.dict.lookup(PDFName.of('I'))?.toString()).toBe(
      '[ 1 2 ]',
    );
  });

  it('treats same-name check boxes with different on-values as a choice by on-value', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    // Two widgets built as a radio group, then turned into plain check boxes,
    // the way Acrobat stores same-name boxes with different export values:
    // on-states /0 and /1, with the export values in /Opt.
    const size = form.createRadioGroup('size');
    size.addOptionToPage('Small', page, {
      x: 40,
      y: 400,
      width: 16,
      height: 16,
    });
    size.addOptionToPage('Large', page, {
      x: 100,
      y: 400,
      width: 16,
      height: 16,
    });
    size.select('Large');
    size.acroField.dict.set(PDFName.of('Ff'), PDFNumber.of(0));
    const other = form.createTextField('other');
    other.addToPage(page, { x: 40, y: 420, width: 200, height: 24 });
    const bytes = await document.save({ updateFieldAppearances: false });

    const inspected = await inspectPdfForm(toInput(bytes));
    const group = inspected.fields.find((f) => f.name === 'size')!;
    expect(group).toMatchObject({
      kind: 'checkboxGroup',
      value: '1',
      options: [
        { value: '0', display: 'Small' },
        { value: '1', display: 'Large' },
      ],
    });
    const otherId = inspected.fields.find((f) => f.name === 'other')!.id;

    const states = async (output: Uint8Array) => {
      const field = (await PDFDocument.load(output)).getForm().getField('size');
      return {
        v: field.acroField.dict.get(PDFName.of('V'))?.toString(),
        as: field.acroField
          .getWidgets()
          .map((widget) => widget.getAppearanceState()?.toString()),
      };
    };

    const untouched = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [otherId]: 'x', [group.id]: '1' },
    });
    expect(untouched.fieldsChanged).toBe(1);
    expect(await states(untouched.bytes)).toEqual({
      v: '/1',
      as: ['/Off', '/1'],
    });

    const changed = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [group.id]: '0' },
    });
    expect(changed.fieldsChanged).toBe(1);
    expect(await states(changed.bytes)).toEqual({
      v: '/0',
      as: ['/0', '/Off'],
    });

    await expect(
      fillPdfForm(toInput(bytes), {
        ...emptyFill,
        values: { [group.id]: 'Medium' },
      }),
    ).rejects.toThrow(/“size” has no option “Medium”/u);
  });

  it('reads a check box ticked only through /AS and leaves it ticked', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const consent = form.createCheckBox('consent');
    consent.addToPage(page, { x: 40, y: 400, width: 16, height: 16 });
    consent.check();
    consent.acroField.dict.delete(PDFName.of('V'));
    const other = form.createTextField('other');
    other.addToPage(page, { x: 40, y: 420, width: 200, height: 24 });
    const bytes = await document.save({ updateFieldAppearances: false });

    const inspected = await inspectPdfForm(toInput(bytes));
    const box = inspected.fields.find((f) => f.name === 'consent')!;
    expect(box.value).toBe(true);
    const otherId = inspected.fields.find((f) => f.name === 'other')!.id;

    const result = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [otherId]: 'x', [box.id]: true },
    });
    const widget = (await PDFDocument.load(result.bytes))
      .getForm()
      .getCheckBox('consent')
      .acroField.getWidgets()[0]!;
    expect(widget.getAppearanceState()?.toString()).toBe('/Yes');
  });

  it('shows display text for export/display choices and writes the export value', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const country = form.createDropdown('country');
    country.addToPage(page, { x: 40, y: 400, width: 200, height: 24 });
    const state = form.createOptionList('state');
    state.addToPage(page, { x: 40, y: 250, width: 200, height: 100 });
    const pairs = (items: Array<[string, string]>) =>
      document.context.obj(
        items.map(([value, display]) => [
          PDFString.of(value),
          PDFString.of(display),
        ]),
      );
    country.acroField.dict.set(
      PDFName.of('Opt'),
      pairs([
        ['IN', 'India'],
        ['SG', 'Singapore'],
      ]),
    );
    country.acroField.dict.set(PDFName.of('V'), PDFString.of('IN'));
    state.acroField.dict.set(
      PDFName.of('Opt'),
      pairs([
        ['KA', 'Karnataka'],
        ['MH', 'Maharashtra'],
      ]),
    );
    state.acroField.dict.set(PDFName.of('V'), PDFString.of('KA'));
    const other = form.createTextField('other');
    other.addToPage(page, { x: 40, y: 450, width: 200, height: 24 });
    const bytes = await document.save({ updateFieldAppearances: false });
    const flagsBefore = (await PDFDocument.load(bytes))
      .getForm()
      .getDropdown('country')
      .acroField.getFlags();

    const inspected = await inspectPdfForm(toInput(bytes));
    const byName = Object.fromEntries(inspected.fields.map((f) => [f.name, f]));
    expect(byName.country).toMatchObject({
      value: 'IN',
      options: [
        { value: 'IN', display: 'India' },
        { value: 'SG', display: 'Singapore' },
      ],
      editable: false,
    });
    expect(byName.state).toMatchObject({ value: ['KA'], multiSelect: false });

    const untouched = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: {
        [byName.other!.id]: 'x',
        [byName.country!.id]: 'IN',
        [byName.state!.id]: ['KA'],
      },
    });
    expect(untouched.fieldsChanged).toBe(1);
    const untouchedForm = (await PDFDocument.load(untouched.bytes)).getForm();
    expect(untouchedForm.getDropdown('country').acroField.getFlags()).toBe(
      flagsBefore,
    );

    const picked = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [byName.country!.id]: 'SG', [byName.state!.id]: ['MH'] },
      flatten: true,
    });
    expect(picked.fieldsChanged).toBe(2);
    const reopened = await PDFDocument.load(picked.bytes);
    const text = flattenedText(reopened, 0);
    expect(text).toContain(hexOf('Singapore'));
    expect(text).toContain(hexOf('Maharashtra'));

    const kept = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [byName.country!.id]: 'SG' },
    });
    const dropdown = (await PDFDocument.load(kept.bytes))
      .getForm()
      .getDropdown('country');
    expect(dropdown.acroField.getValues().map((v) => v.decodeText())).toEqual([
      'SG',
    ]);
    expect(dropdown.acroField.getFlags()).toBe(flagsBefore);
  });

  it('keeps each written field’s original /DA so Auto size survives a second pass', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    const form = document.getForm();
    const name = form.createTextField('name');
    name.addToPage(page, { x: 72, y: 700, width: 300, height: 24 });
    const remarks = form.createTextField('remarks');
    remarks.enableMultiline();
    remarks.addToPage(page, { x: 72, y: 600, width: 300, height: 60 });
    const city = form.createTextField('city');
    city.addToPage(page, { x: 72, y: 540, width: 150, height: 24 });
    for (const field of [name, remarks, city]) {
      field.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
    }
    const bytes = await document.save({ updateFieldAppearances: false });
    const ids = await idsOf(toInput(bytes));

    const first = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [ids.name!]: 'Maulik Gupta' },
    });
    const firstForm = (await PDFDocument.load(first.bytes)).getForm();
    for (const fieldName of ['name', 'remarks', 'city']) {
      expect(
        firstForm.getTextField(fieldName).acroField.getDefaultAppearance(),
      ).toBe('/Helv 0 Tf 0 g');
    }

    const sentence =
      'I confirm that the details given above are true and complete to the best of my knowledge.';
    const secondInput = toInput(first.bytes);
    const secondIds = await idsOf(secondInput);
    const second = await fillPdfForm(secondInput, {
      ...emptyFill,
      values: {
        [secondIds.remarks!]: sentence,
        [secondIds.city!]: 'Bengaluru, Karnataka',
      },
      flatten: true,
    });
    const text = flattenedText(await PDFDocument.load(second.bytes), 0);
    expect(text).toContain(hexOf('knowledge.'));
    expect(text).toContain(hexOf('Bengaluru, Karnataka'));
    expect(text).toContain(hexOf('Maulik Gupta'));
  });
});

describe('PDF form engine: text the form font cannot write', () => {
  async function unicodeForm(options: { dropAppearance?: boolean } = {}) {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const name = form.createTextField('applicant.name');
    name.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });
    const city = form.createTextField('applicant.city');
    city.addToPage(page, { x: 40, y: 380, width: 300, height: 24 });
    city.acroField.dict.set(PDFName.of('V'), PDFHexString.fromText('मुंबई'));
    if (options.dropAppearance) {
      city.acroField.getWidgets()[0]!.dict.delete(PDFName.of('AP'));
    }
    return document.save({ updateFieldAppearances: false });
  }

  it('fails before writing, naming the field and the first unsupported character', async () => {
    const bytes = await unicodeForm();
    const ids = await idsOf(toInput(bytes));

    const rupee = await rejection(
      fillPdfForm(toInput(bytes), {
        ...emptyFill,
        values: { [ids['applicant.name']!]: 'Fee ₹ 1,200' },
      }),
    );
    expect(rupee).toBeInstanceOf(PdfEngineError);
    expect(rupee.code).toBe('FILL_FAILED');
    expect(rupee.message).toContain('“applicant.name”');
    expect(rupee.message).toContain('“₹” (U+20B9)');
    expect(rupee.message).toContain('basic Latin text only');
    expect(rupee.fieldIds).toEqual([ids['applicant.name']]);

    const hindi = await rejection(
      fillPdfForm(toInput(bytes), {
        ...emptyFill,
        values: { [ids['applicant.name']!]: 'नमस्ते' },
      }),
    );
    expect(hindi.message).toContain('(U+0928)');
    expect(hindi.message).not.toMatch(/WinAnsi/u);
  });

  it('never lets an untouched field with such text block filling or signing', async () => {
    const bytes = await unicodeForm();
    const ids = await idsOf(toInput(bytes));

    const filled = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: {
        [ids['applicant.name']!]: 'José',
        [ids['applicant.city']!]: 'मुंबई',
      },
    });
    expect(filled.fieldsChanged).toBe(1);
    const form = (await PDFDocument.load(filled.bytes)).getForm();
    expect(form.getTextField('applicant.city').getText()).toBe('मुंबई');

    const signed = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      signature: {
        image: signaturePng(),
        pageIndex: 0,
        x: 40,
        y: 40,
        width: 100,
      },
    });
    expect(signed.signaturePlaced).toBe(true);

    // Without an appearance, pdf-lib's own save pass would try to draw it.
    const bare = await unicodeForm({ dropAppearance: true });
    const bareIds = await idsOf(toInput(bare));
    const draft = await fillPdfForm(toInput(bare), {
      ...emptyFill,
      values: { [bareIds['applicant.name']!]: 'Maulik' },
    });
    const city = (await PDFDocument.load(draft.bytes))
      .getForm()
      .getTextField('applicant.city');
    expect(city.getText()).toBe('मुंबई');
    expect(city.acroField.getWidgets()[0]!.dict.has(PDFName.of('AP'))).toBe(
      false,
    );
  });

  it('explains when an untouched field without an appearance cannot be made final', async () => {
    const bytes = await unicodeForm({ dropAppearance: true });
    const ids = await idsOf(toInput(bytes));
    const error = await rejection(
      fillPdfForm(toInput(bytes), { ...emptyFill, flatten: true }),
    );
    expect(error.code).toBe('FILL_FAILED');
    expect(error.message).toContain('“applicant.city”');
    expect(error.message).toContain('not made final');
    expect(error.fieldIds).toEqual([ids['applicant.city']]);
  });
});

describe('PDF form engine: files that must not be changed', () => {
  async function signatureForm(
    variant: 'signed' | 'unsigned' | 'sigFlags' | 'perms',
  ) {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const name = form.createTextField('applicant.name');
    name.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });
    const signature = document.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      T: PDFHexString.fromText('Signature1'),
      Rect: [40, 60, 240, 100],
      F: 4,
      P: page.ref,
    });
    if (variant === 'signed') {
      signature.set(
        PDFName.of('V'),
        document.context.register(
          document.context.obj({
            Type: 'Sig',
            Filter: 'Adobe.PPKLite',
            SubFilter: 'adbe.pkcs7.detached',
            ByteRange: [0, 100, 200, 300],
            Contents: PDFHexString.of('00'.repeat(32)),
          }),
        ),
      );
    }
    const signatureRef = document.context.register(signature);
    page.node.addAnnot(signatureRef);
    form.acroForm.addField(signatureRef);
    if (variant === 'sigFlags') {
      form.acroForm.dict.set(PDFName.of('SigFlags'), PDFNumber.of(3));
    }
    if (variant === 'perms') {
      document.catalog.set(
        PDFName.of('Perms'),
        document.context.obj({ UR3: document.context.obj({}) }),
      );
    }
    return document.save();
  }

  for (const variant of ['signed', 'sigFlags', 'perms'] as const) {
    it(`reports and refuses a digitally signed PDF (${variant})`, async () => {
      const bytes = await signatureForm(variant);
      const inspected = await inspectPdfForm(toInput(bytes));
      expect(inspected.document.hasDigitalSignature).toBe(true);
      const nameId = inspected.fields[0]!.id;

      for (const options of [
        { ...emptyFill, flatten: true },
        {
          ...emptyFill,
          signature: {
            image: signaturePng(),
            pageIndex: 0,
            x: 40,
            y: 40,
            width: 100,
          },
        },
        { ...emptyFill, values: { [nameId]: 'Changed' } },
      ]) {
        const error = await rejection(fillPdfForm(toInput(bytes), options));
        expect(error.code).toBe('SIGNED_PDF');
        expect(error.message).toMatch(/would break it/u);
      }
    });
  }

  it('makes final a form with an unsigned signature field and a button without appearances', async () => {
    const bytes = await signatureForm('unsigned');
    const document = await PDFDocument.load(bytes);
    const page = document.getPage(0);
    const button = document.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Btn',
      Ff: 65536,
      T: PDFHexString.fromText('print'),
      Rect: [250, 60, 350, 90],
      P: page.ref,
    });
    const buttonRef = document.context.register(button);
    page.node.addAnnot(buttonRef);
    document.getForm().acroForm.addField(buttonRef);
    const withButton = await document.save({ updateFieldAppearances: false });

    const inspected = await inspectPdfForm(toInput(withButton));
    expect(inspected.document.hasDigitalSignature).toBe(false);
    expect(inspected.fields.map((f) => f.name)).toEqual(['applicant.name']);

    const result = await fillPdfForm(toInput(withButton), {
      ...emptyFill,
      values: { [inspected.fields[0]!.id]: 'Maulik' },
      flatten: true,
    });
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getForm().getFields()).toHaveLength(0);
    expect(annotationsAreClean(reopened)).toBe(true);
    expect(flattenedText(reopened, 0)).toContain(hexOf('Maulik'));
  });

  async function xfaForm(withFields: boolean) {
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    const form = document.getForm();
    if (withFields) {
      const field = form.createTextField('form1[0].name[0]');
      field.addToPage(page, { x: 40, y: 400, width: 200, height: 24 });
    }
    const xfa = document.context.flateStream(
      '<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"><template/></xdp:xdp>',
    );
    form.acroForm.dict.set(PDFName.of('XFA'), document.context.register(xfa));
    // pdf-lib's own appearance pass would strip the XFA from the fixture.
    return document.save({ updateFieldAppearances: false });
  }

  it('reports and refuses a dynamic XFA form without touching it', async () => {
    const bytes = await xfaForm(false);
    const inspected = await inspectPdfForm(toInput(bytes));
    expect(inspected.document.xfa).toBe('dynamic');
    expect(inspected.fields).toEqual([]);

    for (const options of [
      { ...emptyFill, flatten: true },
      { ...emptyFill, flatten: false },
      {
        ...emptyFill,
        signature: {
          image: signaturePng(),
          pageIndex: 0,
          x: 72,
          y: 72,
          width: 180,
        },
      },
    ]) {
      const error = await rejection(fillPdfForm(toInput(bytes), options));
      expect(error.code).toBe('XFA_PDF');
    }
  });

  it('keeps the existing behaviour for static XFA with form fields', async () => {
    const bytes = await xfaForm(true);
    const inspected = await inspectPdfForm(toInput(bytes));
    expect(inspected.document.xfa).toBe('static');
    const result = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [inspected.fields[0]!.id]: 'Maulik' },
    });
    const reopened = await PDFDocument.load(result.bytes);
    const acroForm = reopened.catalog.lookup(PDFName.of('AcroForm'), PDFDict);
    expect(acroForm.has(PDFName.of('XFA'))).toBe(false);
    expect(reopened.getForm().getTextField('form1[0].name[0]').getText()).toBe(
      'Maulik',
    );
  });

  it('tells a restricted (owner password only) PDF apart from a password-protected one', async () => {
    const restricted = await rejection(
      inspectPdfForm({
        id: 'owner',
        name: 'owner.pdf',
        bytes: fixtureBytes(encryptedPdfFixtures.aes128OwnerOnly),
      }),
    );
    expect(restricted.code).toBe('RESTRICTED_PDF');
    expect(restricted.message).not.toMatch(/password locally/u);
    expect(restricted.message).toMatch(/opens without a password/u);

    const fillRestricted = await rejection(
      fillPdfForm(
        {
          id: 'owner',
          name: 'owner.pdf',
          bytes: fixtureBytes(encryptedPdfFixtures.rc4128OwnerOnly),
        },
        { ...emptyFill, flatten: true },
      ),
    );
    expect(fillRestricted.code).toBe('RESTRICTED_PDF');

    const locked = await rejection(
      inspectPdfForm({
        id: 'user',
        name: 'user.pdf',
        bytes: fixtureBytes(encryptedPdfFixtures.aes256UserPassword),
      }),
    );
    expect(locked.code).toBe('ENCRYPTED_PDF');
    expect(locked.message).toBe(
      'This PDF is encrypted. Remove its password locally, then try again.',
    );
  });
});

describe('PDF form engine: fields that cannot or should not be edited', () => {
  it('shows every other field when one rich text field cannot be read', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const name = form.createTextField('applicant.name');
    name.setText('Prefilled Name');
    name.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });
    const comments = form.createTextField('comments');
    comments.addToPage(page, { x: 40, y: 300, width: 300, height: 60 });
    comments.enableRichFormatting();
    const bytes = await document.save({ updateFieldAppearances: false });

    const inspected = await inspectPdfForm(toInput(bytes));
    const byName = Object.fromEntries(inspected.fields.map((f) => [f.name, f]));
    expect(byName['applicant.name']).toMatchObject({
      readOnly: false,
      value: 'Prefilled Name',
    });
    expect(byName.comments).toMatchObject({
      readOnly: true,
      readOnlyReason: 'richText',
      value: '',
    });

    const result = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: {
        [byName.comments!.id]: 'ignored',
        [byName['applicant.name']!.id]: 'New',
      },
      flatten: true,
    });
    expect(result.fieldsChanged).toBe(1);
    expect(flattenedText(await PDFDocument.load(result.bytes), 0)).toContain(
      hexOf('New'),
    );
  });

  it('marks fields that share a name read-only, each with its own id', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const first = form.createTextField('dup');
    first.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });
    const second = form.createTextField('dup2');
    second.addToPage(page, { x: 40, y: 380, width: 300, height: 24 });
    second.acroField.setPartialName('dup');
    const bytes = await document.save();

    const { fields } = await inspectPdfForm(toInput(bytes));
    expect(fields).toHaveLength(2);
    expect(fields[0]!.id).not.toBe(fields[1]!.id);
    for (const field of fields) {
      expect(field).toMatchObject({
        name: 'dup',
        readOnly: true,
        readOnlyReason: 'duplicateName',
      });
    }
    const result = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [fields[0]!.id]: 'a', [fields[1]!.id]: 'b' },
    });
    expect(result.fieldsChanged).toBe(0);
  });

  it('does not offer hidden or NoView fields and does not print them when made final', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    const form = document.getForm();
    const name = form.createTextField('name');
    name.addToPage(page, { x: 72, y: 700, width: 200, height: 24 });
    const hidden = form.createTextField('internal.score');
    hidden.setText('RISK-SCORE-87');
    hidden.addToPage(page, { x: 72, y: 600, width: 200, height: 24 });
    hidden.acroField
      .getWidgets()[0]!
      .dict.set(PDFName.of('F'), PDFNumber.of(2));
    const noView = form.createTextField('noview.note');
    noView.setText('NOVIEW-SECRET');
    noView.addToPage(page, { x: 72, y: 500, width: 200, height: 24 });
    noView.acroField
      .getWidgets()[0]!
      .dict.set(PDFName.of('F'), PDFNumber.of(32));
    const bytes = await document.save();

    const inspected = await inspectPdfForm(toInput(bytes));
    const byName = Object.fromEntries(inspected.fields.map((f) => [f.name, f]));
    expect(byName.name?.hidden).toBe(false);
    expect(byName['internal.score']).toMatchObject({
      hidden: true,
      pageIndex: null,
    });
    expect(byName['noview.note']?.hidden).toBe(true);

    const result = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: {
        [byName.name!.id]: 'Maulik',
        [byName['internal.score']!.id]: 'tampered',
      },
      flatten: true,
    });
    expect(result.fieldsChanged).toBe(1);
    const reopened = await PDFDocument.load(result.bytes);
    const text = flattenedText(reopened, 0);
    expect(text).toContain(hexOf('Maulik'));
    expect(text).not.toContain(hexOf('RISK-SCORE-87'));
    expect(text).not.toContain(hexOf('NOVIEW-SECRET'));
    expect(text).not.toContain(hexOf('tampered'));
    expect(annotationsAreClean(reopened)).toBe(true);
  });

  it('blocks "Make it final" while a required field is empty, but still saves without it', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const name = form.createTextField('applicant.name');
    name.enableRequired();
    name.addToPage(page, { x: 40, y: 420, width: 300, height: 24 });
    const agree = form.createCheckBox('agree');
    agree.enableRequired();
    agree.addToPage(page, { x: 40, y: 380, width: 16, height: 16 });
    const hiddenRequired = form.createTextField('internal');
    hiddenRequired.enableRequired();
    hiddenRequired.addToPage(page, { x: 40, y: 300, width: 100, height: 24 });
    hiddenRequired.acroField
      .getWidgets()[0]!
      .dict.set(PDFName.of('F'), PDFNumber.of(2));
    const bytes = await document.save();

    const inspected = await inspectPdfForm(toInput(bytes));
    const byName = Object.fromEntries(inspected.fields.map((f) => [f.name, f]));
    expect(byName['applicant.name']?.required).toBe(true);

    const blocked = await rejection(
      fillPdfForm(toInput(bytes), {
        ...emptyFill,
        values: { [byName.agree!.id]: true },
        flatten: true,
      }),
    );
    expect(blocked.code).toBe('REQUIRED_FIELDS');
    expect(blocked.message).toContain('“applicant.name”');
    expect(blocked.message).not.toContain('“internal”');
    expect(blocked.fieldIds).toEqual([byName['applicant.name']!.id]);

    const draft = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [byName.agree!.id]: true },
    });
    expect(draft.flattened).toBe(false);

    const final = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: {
        [byName.agree!.id]: true,
        [byName['applicant.name']!.id]: 'Done',
      },
      flatten: true,
    });
    expect(final.flattened).toBe(true);
  });

  it('leaves no /Annots entry pointing at a deleted or missing object', async () => {
    const input = await makeFormPdf();
    const source = await PDFDocument.load(input.bytes);
    const page = source.getPage(0);
    const note = source.context.register(
      source.context.obj({
        Type: 'Annot',
        Subtype: 'Text',
        Rect: [300, 20, 320, 40],
        Contents: PDFHexString.fromText('Reviewer note'),
      }),
    );
    page.node.addAnnot(note);
    // A reference to an object the file never had.
    page.node.addAnnot(PDFRef.of(9000));
    const bytes = await source.save({ updateFieldAppearances: false });
    const ids = await idsOf(toInput(bytes));

    const result = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [ids['plan.choice']!]: 'monthly' },
      flatten: true,
    });
    const reopened = await PDFDocument.load(result.bytes);
    expect(annotationsAreClean(reopened)).toBe(true);
    const annots = reopened
      .getPage(0)
      .node.lookup(PDFName.of('Annots'), PDFArray)
      .asArray()
      .map((raw) => reopened.context.lookup(raw, PDFDict));
    expect(
      annots.map((annot) => annot.get(PDFName.of('Subtype'))?.toString()),
    ).toEqual(['/Text']);
    const leftovers = reopened.context
      .enumerateIndirectObjects()
      .filter(
        ([, object]) =>
          object instanceof PDFDict && object.has(PDFName.of('FT')),
      );
    expect(leftovers).toHaveLength(0);
  });
});

describe('PDF signature placement', () => {
  const placement = { x: 50, y: 40, width: 100 };

  async function geometryPdf() {
    const document = await PDFDocument.create();
    const pages = [
      { rotate: 0 },
      { rotate: 90 },
      { rotate: 180 },
      { rotate: 270, crop: [36, 72, 400, 600] },
      { rotate: 90, media: [0, 100, 612, 792], crop: [50, 150, 450, 500] },
    ];
    for (const spec of pages) {
      const page = document.addPage([612, 792]);
      if (spec.media) {
        const [x, y, width, height] = spec.media;
        page.setMediaBox(x!, y!, width!, height!);
      }
      if (spec.crop) {
        const [x, y, width, height] = spec.crop;
        page.setCropBox(x!, y!, width!, height!);
      }
      page.setRotation(degrees(spec.rotate));
      // Content that leaves a transform behind without q/Q.
      page.pushOperators(concatTransformationMatrix(2, 0, 0, 2, 0, 0));
    }
    return document.save();
  }

  it('reports each page’s visible box, rotation and displayed size', async () => {
    const { pageSizes } = await inspectPdfForm(toInput(await geometryPdf()));
    expect(pageSizes[1]).toEqual({
      box: { x: 0, y: 0, width: 612, height: 792 },
      rotation: 90,
      width: 792,
      height: 612,
    });
    expect(pageSizes[4]).toEqual({
      box: { x: 50, y: 150, width: 450, height: 500 },
      rotation: 90,
      width: 500,
      height: 450,
    });
  });

  for (const pageIndex of [0, 1, 2, 3, 4]) {
    it(`lands exactly on the outline and upright on page ${pageIndex + 1}`, async () => {
      const bytes = await geometryPdf();
      const { pageSizes } = await inspectPdfForm(toInput(bytes));
      const page = pageSizes[pageIndex]!;
      const result = await fillPdfForm(toInput(bytes), {
        ...emptyFill,
        signature: { image: signaturePng(), pageIndex, ...placement },
      });
      expect(result.signaturePlaced).toBe(true);

      const reopened = await PDFDocument.load(result.bytes);
      const images = pageDraws(reopened, pageIndex).filter(
        (draw) => draw.subtype === '/Image',
      );
      expect(images).toHaveLength(1);
      const [a, b, c, d, e, f] = images[0]!.ctm;
      const displayed = (s: number, t: number) => {
        const u = a * s + c * t + e - page.box.x;
        const v = b * s + d * t + f - page.box.y;
        const { width: bw, height: bh } = page.box;
        if (page.rotation === 90) return [v, u];
        if (page.rotation === 180) return [bw - u, v];
        if (page.rotation === 270) return [bh - v, bw - u];
        return [u, bh - v];
      };
      const height = placement.width; // The PNG is square.
      const expectCorner = (s: number, t: number, x: number, y: number) => {
        const [actualX, actualY] = displayed(s, t);
        expect(actualX).toBeCloseTo(x, 4);
        expect(actualY).toBeCloseTo(y, 4);
      };
      // Image bottom-left, bottom-right and top-left as a viewer shows them.
      expectCorner(0, 0, placement.x, placement.y + height);
      expectCorner(1, 0, placement.x + placement.width, placement.y + height);
      expectCorner(0, 1, placement.x, placement.y);
    });
  }

  it('refuses placements not fully inside the displayed page', async () => {
    const bytes = await geometryPdf();
    const cases = [
      { pageIndex: 0, x: 900, y: 72, width: 100 },
      { pageIndex: 0, x: 72, y: 72, width: 5000 },
      { pageIndex: 0, x: -20, y: 72, width: 100 },
      // Fits the unrotated 612 x 792 page, not the displayed 792 x 612 one.
      { pageIndex: 1, x: 72, y: 550, width: 100 },
      { pageIndex: 4, x: 0, y: 400, width: 100 },
      { pageIndex: 0, x: Number.NaN, y: 0, width: 100 },
      { pageIndex: 0, x: 0, y: 0, width: 0 },
    ];
    for (const signature of cases) {
      const error = await rejection(
        fillPdfForm(toInput(bytes), {
          ...emptyFill,
          signature: { image: signaturePng(), ...signature },
        }),
      );
      expect(error.code).toBe('FILL_FAILED');
      expect(error.message).toMatch(/fully inside page/u);
    }
  });
});

describe('PDF form engine: forms made elsewhere', () => {
  const signature = () => ({
    image: signaturePng(),
    pageIndex: 0,
    x: 20,
    y: 20,
    width: 100,
  });

  /** Every indirect reference in the file that points at nothing. */
  function danglingReferences(document: PDFDocument) {
    const missing: string[] = [];
    const seen = new Set<unknown>();
    const visit = (object: unknown, path: string) => {
      if (!object || seen.has(object)) return;
      if (object instanceof PDFRef) {
        if (!document.context.lookup(object)) {
          missing.push(`${path} -> ${object.toString()}`);
        }
        return;
      }
      seen.add(object);
      if (object instanceof PDFDict) {
        for (const [key, value] of object.entries()) {
          visit(value, `${path}${key.toString()}`);
        }
      } else if (object instanceof PDFArray) {
        object.asArray().forEach((value, index) => {
          visit(value, `${path}[${index}]`);
        });
      } else if (object instanceof PDFRawStream) {
        visit(object.dict, path);
      }
    };
    for (const [ref, object] of document.context.enumerateIndirectObjects()) {
      visit(object, ref.toString());
    }
    return missing;
  }

  it('prints the value, not a stale appearance, when the form asks viewers to redraw it', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 400]);
    const field = document.getForm().createTextField('name');
    field.addToPage(page, { x: 20, y: 300, width: 200, height: 24 });
    field.setText('');
    const blank = await PDFDocument.load(await document.save());
    // Another tool sets /V and /NeedAppearances but leaves the old /AP.
    blank
      .getForm()
      .getTextField('name')
      .acroField.dict.set(
        PDFName.of('V'),
        PDFHexString.fromText('Alice Example'),
      );
    blank.catalog
      .lookup(PDFName.of('AcroForm'), PDFDict)
      .set(PDFName.of('NeedAppearances'), blank.context.obj(true));
    const bytes = await blank.save({ updateFieldAppearances: false });

    const inspected = await inspectPdfForm(toInput(bytes));
    expect(inspected.fields[0]!.value).toBe('Alice Example');
    const result = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      flatten: true,
    });
    expect(result.flattened).toBe(true);
    const reopened = await PDFDocument.load(result.bytes);
    expect(reopened.getForm().getFields()).toHaveLength(0);
    expect(flattenedText(reopened, 0)).toContain(hexOf('Alice Example'));
  });

  it('removes static XFA on every save and keeps the fields unless made final', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    const form = document.getForm();
    form
      .createTextField('form1[0].name[0]')
      .addToPage(page, { x: 40, y: 400, width: 200, height: 24 });
    form.acroForm.dict.set(
      PDFName.of('XFA'),
      document.context.register(document.context.flateStream('<xdp:xdp/>')),
    );
    const bytes = await document.save({ updateFieldAppearances: false });
    expect((await inspectPdfForm(toInput(bytes))).document.xfa).toBe('static');

    const outcome = async (options: typeof emptyFill) => {
      const result = await fillPdfForm(toInput(bytes), options);
      const reopened = await PDFDocument.load(result.bytes);
      const acroForm = reopened.catalog.lookup(PDFName.of('AcroForm'), PDFDict);
      return {
        xfa: acroForm.has(PDFName.of('XFA')),
        fields: reopened.getForm().getFields().length,
        flattened: result.flattened,
      };
    };
    const signOnly = { ...emptyFill, signature: signature() };
    await expect(
      outcome(signOnly as unknown as typeof emptyFill),
    ).resolves.toEqual({ xfa: false, fields: 1, flattened: false });
    await expect(outcome(emptyFill)).resolves.toEqual({
      xfa: false,
      fields: 1,
      flattened: false,
    });
    await expect(outcome({ ...emptyFill, flatten: true })).resolves.toEqual({
      xfa: false,
      fields: 0,
      flattened: true,
    });
  });

  it('keeps a stored multi-select value the options no longer list', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 400]);
    const list = document.getForm().createOptionList('colours');
    list.addOptions(['Red', 'Green', 'Blue']);
    list.enableMultiselect();
    list.addToPage(page, { x: 20, y: 200, width: 150, height: 80 });
    list.acroField.dict.set(
      PDFName.of('V'),
      document.context.obj([
        PDFHexString.fromText('Purple'),
        PDFHexString.fromText('Red'),
      ]),
    );
    const bytes = await document.save();
    const inspected = await inspectPdfForm(toInput(bytes));
    const { id, value } = inspected.fields[0]!;
    expect(value).toEqual(['Purple', 'Red']);

    const added = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [id]: ['Purple', 'Red', 'Green'] },
    });
    expect(added.fieldsChanged).toBe(1);
    const reread = await inspectPdfForm(toInput(added.bytes));
    expect(reread.fields[0]!.value).toEqual(['Purple', 'Red', 'Green']);

    const cleared = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      values: { [id]: ['Red'] },
    });
    expect(
      (await inspectPdfForm(toInput(cleared.bytes))).fields[0]!.value,
    ).toEqual(['Red']);

    const error = await rejection(
      fillPdfForm(toInput(bytes), {
        ...emptyFill,
        values: { [id]: ['Purple', 'Orange'] },
      }),
    );
    expect(error.message).toMatch(/has no option “Orange”/u);
  });

  it('reads a radio group chosen only through its widget state', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 400]);
    const radio = document.getForm().createRadioGroup('plan');
    radio.addOptionToPage('Basic', page, {
      x: 20,
      y: 300,
      width: 20,
      height: 20,
    });
    radio.addOptionToPage('Pro', page, {
      x: 60,
      y: 300,
      width: 20,
      height: 20,
    });
    radio.enableRequired();
    radio.select('Pro');
    const selected = await PDFDocument.load(await document.save());
    selected
      .getForm()
      .getRadioGroup('plan')
      .acroField.dict.delete(PDFName.of('V'));
    const bytes = await selected.save({ updateFieldAppearances: false });

    const inspected = await inspectPdfForm(toInput(bytes));
    expect(inspected.fields[0]).toMatchObject({ value: 'Pro', required: true });
    const result = await fillPdfForm(toInput(bytes), {
      ...emptyFill,
      flatten: true,
    });
    expect(result.flattened).toBe(true);
  });

  it('flags fields the form calculates itself', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 400]);
    const form = document.getForm();
    form
      .createTextField('qty')
      .addToPage(page, { x: 20, y: 300, width: 100, height: 24 });
    const total = form.createTextField('total');
    total.addToPage(page, { x: 20, y: 250, width: 100, height: 24 });
    const subtotal = form.createTextField('subtotal');
    subtotal.addToPage(page, { x: 20, y: 200, width: 100, height: 24 });
    const script = document.context.obj({
      S: 'JavaScript',
      JS: PDFHexString.fromText('event.value = 1;'),
    });
    total.acroField.dict.set(
      PDFName.of('AA'),
      document.context.obj({ C: script }),
    );
    form.acroForm.dict.set(
      PDFName.of('CO'),
      document.context.obj([subtotal.ref]),
    );
    const { fields } = await inspectPdfForm(toInput(await document.save()));
    expect(
      Object.fromEntries(fields.map((field) => [field.name, field.calculated])),
    ).toEqual({ qty: false, total: true, subtotal: true });
  });

  it('does not print a button that is not set to print', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 400]);
    const form = document.getForm();
    const button = form.createButton('printMe');
    button.addToPage('PRINTBUTTON', page, {
      x: 20,
      y: 200,
      width: 150,
      height: 30,
    });
    button.acroField.getWidgets()[0]!.setFlags(0);
    const shown = form.createButton('shown');
    shown.addToPage('SHOWNBUTTON', page, {
      x: 20,
      y: 100,
      width: 150,
      height: 30,
    });
    const name = form.createTextField('name');
    name.addToPage(page, { x: 20, y: 300, width: 200, height: 24 });
    name.setText('NAMEVALUE');
    const result = await fillPdfForm(toInput(await document.save()), {
      ...emptyFill,
      flatten: true,
    });
    const text = flattenedText(await PDFDocument.load(result.bytes), 0);
    expect(text).toContain(hexOf('NAMEVALUE'));
    expect(text).toContain(hexOf('SHOWNBUTTON'));
    expect(text).not.toContain(hexOf('PRINTBUTTON'));
  });

  it('reads the real fields past a broken /Fields entry and still makes it final', async () => {
    const dangling = await PDFDocument.create();
    const page = dangling.addPage([400, 500]);
    const form = dangling.getForm();
    form
      .createTextField('name')
      .addToPage(page, { x: 20, y: 300, width: 200, height: 24 });
    form.acroForm.dict
      .lookup(PDFName.of('Fields'), PDFArray)
      .push(PDFRef.of(999, 0));
    form.acroForm.dict
      .lookup(PDFName.of('Fields'), PDFArray)
      .push(dangling.context.register(PDFNumber.of(7)));

    const cycle = await PDFDocument.create();
    cycle.addPage([400, 500]);
    const parentRef = cycle.context.nextRef();
    const kid = cycle.context.register(
      cycle.context.obj({ T: 'kid', Parent: parentRef, Kids: [parentRef] }),
    );
    cycle.context.assign(
      parentRef,
      cycle.context.obj({ T: 'parent', Kids: [kid] }),
    );
    cycle.catalog.set(
      PDFName.of('AcroForm'),
      cycle.context.obj({ Fields: [parentRef] }),
    );

    for (const [document, names] of [
      [dangling, ['name']],
      [cycle, []],
    ] as const) {
      const bytes = await document.save({ updateFieldAppearances: false });
      const inspected = await inspectPdfForm(toInput(bytes));
      expect(inspected.fields.map((field) => field.name)).toEqual(names);
      expect(inspected.document.formUnreadable).toBe(false);
      const result = await fillPdfForm(toInput(bytes), {
        ...emptyFill,
        signature: signature(),
        flatten: true,
      });
      expect(result.signaturePlaced).toBe(true);
    }
  });

  it('leaves no structure-tree reference to a removed widget', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const field = document.getForm().createTextField('name');
    field.setText('Tagged');
    field.addToPage(page, { x: 20, y: 300, width: 200, height: 24 });
    const widget = field.acroField.getWidgets()[0]!;
    const widgetRef = document.context.getObjectRef(widget.dict)!;
    widget.dict.set(PDFName.of('StructParent'), PDFNumber.of(0));
    const rootRef = document.context.nextRef();
    const element = document.context.register(
      document.context.obj({
        Type: 'StructElem',
        S: 'Form',
        P: rootRef,
        K: [{ Type: 'OBJR', Obj: widgetRef }],
      }),
    );
    document.context.assign(
      rootRef,
      document.context.obj({
        Type: 'StructTreeRoot',
        K: [element],
        ParentTree: { Nums: [0, element] },
        ParentTreeNextKey: 1,
      }),
    );
    document.catalog.set(PDFName.of('StructTreeRoot'), rootRef);

    const result = await fillPdfForm(toInput(await document.save()), {
      ...emptyFill,
      flatten: true,
    });
    const reopened = await PDFDocument.load(result.bytes);
    expect(danglingReferences(reopened)).toEqual([]);
    const root = reopened.catalog.lookup(PDFName.of('StructTreeRoot'), PDFDict);
    const nums = root
      .lookup(PDFName.of('ParentTree'), PDFDict)
      .lookup(PDFName.of('Nums'), PDFArray);
    expect(nums.size()).toBe(0);
  });

  it('reports a PDF without a form as not made final', async () => {
    const document = await PDFDocument.create();
    document.addPage([400, 500]);
    const result = await fillPdfForm(toInput(await document.save()), {
      ...emptyFill,
      signature: signature(),
      flatten: true,
    });
    expect(result.flattened).toBe(false);
    expect(result.signaturePlaced).toBe(true);
  });
});
