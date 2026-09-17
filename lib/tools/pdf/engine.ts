import {
  degrees,
  PDFCheckBox,
  PDFDict,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  rgb,
  StandardFonts,
} from 'pdf-lib';

import type { JpegReencoder } from './jpeg-reencode';

import type {
  ImagesToPdfOptions,
  PdfImageInput,
  PdfWorkerInput,
} from './protocol';

export type PdfEngineErrorCode =
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'EMPTY_PDF'
  | 'MERGE_FAILED'
  | 'EXTRACT_FAILED'
  | 'TRANSFORM_FAILED'
  | 'IMAGE_TO_PDF_FAILED'
  | 'COMPRESS_FAILED'
  | 'FILL_FAILED';

export class PdfEngineError extends Error {
  constructor(
    public readonly code: PdfEngineErrorCode,
    message: string,
    public readonly inputId?: string,
  ) {
    super(message);
    this.name = 'PdfEngineError';
  }
}

export function hasPdfSignature(bytes: ArrayBuffer) {
  if (bytes.byteLength < 5) return false;
  return new TextDecoder('ascii').decode(bytes.slice(0, 5)) === '%PDF-';
}

async function loadPdf(input: PdfWorkerInput) {
  if (!hasPdfSignature(input.bytes)) {
    throw new PdfEngineError(
      'INVALID_PDF',
      'This file could not be read as a supported PDF.',
      input.id,
    );
  }

  try {
    return await PDFDocument.load(input.bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message.toLocaleLowerCase() : '';
    if (detail.includes('encrypted')) {
      throw new PdfEngineError(
        'ENCRYPTED_PDF',
        'This PDF is encrypted. Remove its password locally, then try again.',
        input.id,
      );
    }
    throw new PdfEngineError(
      'INVALID_PDF',
      'This file could not be read as a supported PDF.',
      input.id,
    );
  }
}

export async function inspectPdfInputs(inputs: PdfWorkerInput[]) {
  const inspected: Array<{ id: string; pages: number }> = [];
  for (const input of inputs) {
    const document = await loadPdf(input);
    const pages = document.getPageCount();
    if (pages < 1) {
      throw new PdfEngineError(
        'EMPTY_PDF',
        'This PDF has no pages to merge.',
        input.id,
      );
    }
    inspected.push({ id: input.id, pages });
  }
  return inspected;
}

export async function mergePdfInputs(
  inputs: PdfWorkerInput[],
  onProgress?: (
    phase: 'reading' | 'copying' | 'validating',
    completed: number,
    total: number,
  ) => void,
) {
  if (inputs.length < 2) {
    throw new PdfEngineError(
      'MERGE_FAILED',
      'Choose at least two PDFs to merge.',
    );
  }

  const computeStarted = performance.now();
  const destination = await PDFDocument.create();
  let expectedPages = 0;

  for (const [index, input] of inputs.entries()) {
    onProgress?.('reading', index, inputs.length);
    const source = await loadPdf(input);
    const pageIndices = source.getPageIndices();
    if (!pageIndices.length) {
      throw new PdfEngineError(
        'EMPTY_PDF',
        'This PDF has no pages to merge.',
        input.id,
      );
    }

    const pages = await destination.copyPages(source, pageIndices);
    pages.forEach((page) => destination.addPage(page));
    expectedPages += pages.length;
    onProgress?.('copying', index + 1, inputs.length);
  }

  const bytes = await destination.save({
    addDefaultPage: false,
    useObjectStreams: true,
    objectsPerTick: 50,
  });
  const computeDurationMs = performance.now() - computeStarted;

  onProgress?.('validating', inputs.length, inputs.length);
  const validationStarted = performance.now();
  const reopened = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  const pageCount = reopened.getPageCount();
  const validationDurationMs = performance.now() - validationStarted;

  if (pageCount !== expectedPages) {
    throw new PdfEngineError(
      'MERGE_FAILED',
      'The merged PDF did not pass its page-count check.',
    );
  }

  return {
    bytes,
    pageCount,
    computeDurationMs,
    validationDurationMs,
  };
}

export async function extractPdfPages(
  input: PdfWorkerInput,
  pageNumbers: number[],
  onProgress?: (
    phase: 'reading' | 'copying' | 'validating',
    completed: number,
    total: number,
  ) => void,
) {
  if (!pageNumbers.length) {
    throw new PdfEngineError(
      'EXTRACT_FAILED',
      'Choose at least one page to extract.',
      input.id,
    );
  }

  const computeStarted = performance.now();
  onProgress?.('reading', 0, pageNumbers.length);
  const source = await loadPdf(input);
  const sourcePageCount = source.getPageCount();
  if (
    pageNumbers.some(
      (page) => !Number.isInteger(page) || page < 1 || page > sourcePageCount,
    )
  ) {
    throw new PdfEngineError(
      'EXTRACT_FAILED',
      `Choose pages between 1 and ${sourcePageCount}.`,
      input.id,
    );
  }

  const destination = await PDFDocument.create();
  const pages = await destination.copyPages(
    source,
    pageNumbers.map((page) => page - 1),
  );
  pages.forEach((page, index) => {
    destination.addPage(page);
    onProgress?.('copying', index + 1, pages.length);
  });
  const bytes = await destination.save({
    addDefaultPage: false,
    useObjectStreams: true,
    objectsPerTick: 50,
  });
  const computeDurationMs = performance.now() - computeStarted;

  onProgress?.('validating', pages.length, pages.length);
  const validationStarted = performance.now();
  const reopened = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  const pageCount = reopened.getPageCount();
  const validationDurationMs = performance.now() - validationStarted;
  if (pageCount !== pageNumbers.length) {
    throw new PdfEngineError(
      'EXTRACT_FAILED',
      'The extracted PDF failed its page-count check.',
    );
  }

  return { bytes, pageCount, computeDurationMs, validationDurationMs };
}

export async function transformPdfPages(
  input: PdfWorkerInput,
  options: import('./protocol').PdfPageTransformOptions,
  onProgress?: (
    phase: 'reading' | 'copying' | 'validating',
    completed: number,
    total: number,
  ) => void,
) {
  if (!options.pageOrder.length) {
    throw new PdfEngineError(
      'TRANSFORM_FAILED',
      'Keep at least one page in the output.',
      input.id,
    );
  }
  const computeStarted = performance.now();
  onProgress?.('reading', 0, options.pageOrder.length);
  const source = await loadPdf(input);
  const sourcePageCount = source.getPageCount();
  if (
    options.pageOrder.some(
      (page) => !Number.isInteger(page) || page < 1 || page > sourcePageCount,
    )
  ) {
    throw new PdfEngineError(
      'TRANSFORM_FAILED',
      `Use page numbers between 1 and ${sourcePageCount}.`,
      input.id,
    );
  }

  const destination = await PDFDocument.create();
  const copied = await destination.copyPages(
    source,
    options.pageOrder.map((page) => page - 1),
  );
  copied.forEach((page, index) => {
    destination.addPage(page);
    onProgress?.('copying', index + 1, copied.length);
  });

  const pageFont =
    options.pageNumbers || options.watermark.trim()
      ? await destination.embedFont(StandardFonts.Helvetica)
      : null;
  for (const [index, page] of destination.getPages().entries()) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + options.rotation) % 360));
    const { width, height } = page.getSize();
    if (options.watermark.trim() && pageFont) {
      const text = options.watermark.trim().slice(0, 80);
      const size = Math.max(
        18,
        Math.min(54, width / Math.max(5, text.length / 1.8)),
      );
      const textWidth = pageFont.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: Math.max(16, (width - textWidth) / 2),
        y: height / 2,
        size,
        font: pageFont,
        color: rgb(0.25, 0.25, 0.25),
        opacity: 0.2,
        rotate: degrees(-35),
      });
    }
    if (options.pageNumbers && pageFont) {
      const text = String(index + 1);
      const size = 10;
      const textWidth = pageFont.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: 18,
        size,
        font: pageFont,
        color: rgb(0.15, 0.15, 0.15),
      });
    }
  }

  const title = options.metadata.title.trim();
  const author = options.metadata.author.trim();
  const subject = options.metadata.subject.trim();
  const keywords = options.metadata.keywords
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (title) destination.setTitle(title);
  if (author) destination.setAuthor(author);
  if (subject) destination.setSubject(subject);
  if (keywords.length) destination.setKeywords(keywords);
  destination.setProducer('Browser Tools');
  if (options.flatten) {
    try {
      destination.getForm().flatten();
    } catch {
      // Document had no interactive form fields to flatten
    }
  }

  const bytes = await destination.save({
    addDefaultPage: false,
    useObjectStreams: true,
    objectsPerTick: 50,
  });
  const computeDurationMs = performance.now() - computeStarted;
  onProgress?.('validating', copied.length, copied.length);
  const validationStarted = performance.now();
  const reopened = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  if (reopened.getPageCount() !== options.pageOrder.length) {
    throw new PdfEngineError(
      'TRANSFORM_FAILED',
      'The edited PDF failed its page-count check.',
      input.id,
    );
  }
  if (reopened.getPages().some((page) => page.getRotation().angle % 90 !== 0)) {
    throw new PdfEngineError(
      'TRANSFORM_FAILED',
      'The edited PDF failed its rotation check.',
      input.id,
    );
  }
  const validationDurationMs = performance.now() - validationStarted;
  return {
    bytes,
    pageCount: reopened.getPageCount(),
    computeDurationMs,
    validationDurationMs,
  };
}

const FIXED_PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;

function hasImageSignature(input: PdfImageInput) {
  const bytes = new Uint8Array(input.bytes);
  if (input.mimeType === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

export async function imagesToPdf(
  inputs: PdfImageInput[],
  options: ImagesToPdfOptions,
  onProgress?: (
    phase: 'reading' | 'copying' | 'validating',
    completed: number,
    total: number,
  ) => void,
) {
  if (!inputs.length) {
    throw new PdfEngineError(
      'IMAGE_TO_PDF_FAILED',
      'Choose at least one JPEG or PNG image.',
    );
  }
  if (![0, 12, 24, 36].includes(options.margin)) {
    throw new PdfEngineError(
      'IMAGE_TO_PDF_FAILED',
      'Choose a supported page margin.',
    );
  }

  const computeStarted = performance.now();
  const destination = await PDFDocument.create();

  for (const [index, input] of inputs.entries()) {
    onProgress?.('reading', index, inputs.length);
    if (!hasImageSignature(input)) {
      throw new PdfEngineError(
        'IMAGE_TO_PDF_FAILED',
        'One image does not match its JPEG or PNG file type.',
        input.id,
      );
    }

    let image;
    try {
      image =
        input.mimeType === 'image/jpeg'
          ? await destination.embedJpg(input.bytes)
          : await destination.embedPng(input.bytes);
    } catch {
      throw new PdfEngineError(
        'IMAGE_TO_PDF_FAILED',
        'One image could not be decoded safely.',
        input.id,
      );
    }

    const sourceLandscape = image.width > image.height;
    let pageWidth: number;
    let pageHeight: number;
    if (options.pageSize === 'image') {
      pageWidth = image.width + options.margin * 2;
      pageHeight = image.height + options.margin * 2;
    } else {
      const fixed = FIXED_PAGE_SIZES[options.pageSize];
      const landscape =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && sourceLandscape);
      [pageWidth, pageHeight] = landscape ? [fixed[1], fixed[0]] : fixed;
    }

    const availableWidth = pageWidth - options.margin * 2;
    const availableHeight = pageHeight - options.margin * 2;
    if (availableWidth <= 0 || availableHeight <= 0) {
      throw new PdfEngineError(
        'IMAGE_TO_PDF_FAILED',
        'The selected margin leaves no printable page area.',
      );
    }
    const scale = Math.min(
      availableWidth / image.width,
      availableHeight / image.height,
      options.pageSize === 'image' ? 1 : Number.POSITIVE_INFINITY,
    );
    const width = image.width * scale;
    const height = image.height * scale;
    const page = destination.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
    onProgress?.('copying', index + 1, inputs.length);
  }

  destination.setProducer('Browser Tools');
  destination.setCreationDate(new Date());
  const bytes = await destination.save({
    addDefaultPage: false,
    useObjectStreams: true,
    objectsPerTick: 50,
  });
  const computeDurationMs = performance.now() - computeStarted;
  onProgress?.('validating', inputs.length, inputs.length);
  const validationStarted = performance.now();
  const reopened = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  const pageCount = reopened.getPageCount();
  const validationDurationMs = performance.now() - validationStarted;
  if (pageCount !== inputs.length) {
    throw new PdfEngineError(
      'IMAGE_TO_PDF_FAILED',
      'The generated PDF failed its page-count check.',
    );
  }

  return { bytes, pageCount, computeDurationMs, validationDurationMs };
}

/**
 * Colour spaces whose JPEG data survives a canvas round-trip unchanged in
 * meaning. Anything else (CMYK, Indexed, Separation, an ICC profile we would
 * silently drop) is left alone rather than risk shifting a document's colour.
 */
const RECOMPRESSIBLE_COLOR_SPACES = new Set(['DeviceRGB', 'DeviceGray']);

/**
 * True only for image streams this compressor can rewrite without changing how
 * the page renders: a single DCTDecode filter, 8 bits per component, a plain
 * colour space, and no custom /Decode array.
 */
function isRecompressibleJpeg(stream: PDFRawStream) {
  const dict = stream.dict;
  if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) return false;
  if (dict.get(PDFName.of('Filter')) !== PDFName.of('DCTDecode')) return false;
  if (dict.has(PDFName.of('Decode'))) return false;
  if (dict.has(PDFName.of('DecodeParms'))) return false;

  const bits = dict.get(PDFName.of('BitsPerComponent'));
  if (!(bits instanceof PDFNumber) || bits.asNumber() !== 8) return false;

  const colorSpace = dict.get(PDFName.of('ColorSpace'));
  if (!(colorSpace instanceof PDFName)) return false;
  return RECOMPRESSIBLE_COLOR_SPACES.has(colorSpace.asString().slice(1));
}

export type PdfCompressResult = {
  bytes: Uint8Array;
  pageCount: number;
  originalByteLength: number;
  compressedByteLength: number;
  imagesRecompressed: number;
  imagesLeftAlone: number;
  computeDurationMs: number;
  validationDurationMs: number;
};

/**
 * Makes a PDF smaller without a server.
 *
 * Two passes, both measured rather than estimated:
 *
 * 1. Always: rewrite the file with object streams and, on request, drop the
 *    document metadata. This is lossless and changes nothing on the page.
 * 2. Optionally: re-encode embedded JPEGs at a lower quality, downsampling any
 *    that exceed `maxImageDimension`. Only images that pass
 *    `isRecompressibleJpeg` are touched, and only when the new bytes are
 *    actually smaller.
 *
 * If the result is not smaller than the input, the original bytes are returned
 * unchanged and the caller is told nothing was saved. Handing back a larger
 * file under the word "compressed" would be a lie, and a PDF that grew is worse
 * than one that was left alone.
 */
export async function compressPdf(
  input: PdfWorkerInput,
  options: import('./protocol').PdfCompressOptions,
  reencodeJpeg?: JpegReencoder,
  onProgress?: (
    phase: 'reading' | 'copying' | 'validating',
    completed: number,
    total: number,
  ) => void,
): Promise<PdfCompressResult> {
  const originalByteLength = input.bytes.byteLength;
  const computeStarted = performance.now();
  onProgress?.('reading', 0, 1);
  const document = await loadPdf(input);
  const pageCount = document.getPageCount();
  if (pageCount < 1) {
    throw new PdfEngineError(
      'EMPTY_PDF',
      'This PDF has no pages to compress.',
      input.id,
    );
  }

  if (options.removeMetadata) {
    document.setTitle('');
    document.setAuthor('');
    document.setSubject('');
    document.setKeywords([]);
    document.setProducer('');
    document.setCreator('');
  }

  let imagesRecompressed = 0;
  let imagesLeftAlone = 0;

  if (options.recompressImages && reencodeJpeg) {
    const streams = document.context
      .enumerateIndirectObjects()
      .filter(
        (entry): entry is [(typeof entry)[0], PDFRawStream] =>
          entry[1] instanceof PDFRawStream,
      );
    const candidates = streams.filter(([, stream]) =>
      isRecompressibleJpeg(stream),
    );
    imagesLeftAlone = streams.length - candidates.length;

    let done = 0;
    for (const [ref, stream] of candidates) {
      const reencoded = await reencodeJpeg(stream.contents, {
        quality: options.imageQuality,
        maxDimension: options.maxImageDimension,
      });
      done += 1;
      onProgress?.('copying', done, candidates.length);

      if (!reencoded) {
        imagesLeftAlone += 1;
        continue;
      }

      const dict = stream.dict as PDFDict;
      dict.set(PDFName.of('Width'), PDFNumber.of(reencoded.width));
      dict.set(PDFName.of('Height'), PDFNumber.of(reencoded.height));
      // The canvas always hands back 8-bit RGB, whatever went in.
      dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
      dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
      dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
      document.context.assign(ref, PDFRawStream.of(dict, reencoded.bytes));
      imagesRecompressed += 1;
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await document.save({
      addDefaultPage: false,
      useObjectStreams: true,
      objectsPerTick: 50,
    });
  } catch {
    throw new PdfEngineError(
      'COMPRESS_FAILED',
      'This PDF could not be rewritten. Your original file is unchanged.',
      input.id,
    );
  }
  const computeDurationMs = performance.now() - computeStarted;

  onProgress?.('validating', 1, 1);
  const validationStarted = performance.now();
  const reopened = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  if (reopened.getPageCount() !== pageCount) {
    throw new PdfEngineError(
      'COMPRESS_FAILED',
      'The compressed PDF failed its page-count check.',
      input.id,
    );
  }
  const validationDurationMs = performance.now() - validationStarted;

  if (bytes.length >= originalByteLength) {
    return {
      bytes: new Uint8Array(input.bytes.slice(0)),
      pageCount,
      originalByteLength,
      compressedByteLength: originalByteLength,
      imagesRecompressed: 0,
      imagesLeftAlone: imagesLeftAlone + imagesRecompressed,
      computeDurationMs,
      validationDurationMs,
    };
  }

  return {
    bytes,
    pageCount,
    originalByteLength,
    compressedByteLength: bytes.length,
    imagesRecompressed,
    imagesLeftAlone,
    computeDurationMs,
    validationDurationMs,
  };
}

/** Describes one form field for the UI, without leaking pdf-lib types. */
function describeField(
  field: import('pdf-lib').PDFField,
): import('./protocol').PdfFormField | null {
  const name = field.getName();
  const readOnly = field.isReadOnly();

  if (field instanceof PDFTextField) {
    return {
      name,
      kind: 'text',
      options: [],
      value: field.getText() ?? '',
      readOnly,
      multiline: field.isMultiline(),
    };
  }
  if (field instanceof PDFCheckBox) {
    return {
      name,
      kind: 'checkbox',
      options: [],
      value: field.isChecked() ? 'on' : 'off',
      readOnly,
      multiline: false,
    };
  }
  if (field instanceof PDFRadioGroup) {
    return {
      name,
      kind: 'radio',
      options: field.getOptions(),
      value: field.getSelected() ?? '',
      readOnly,
      multiline: false,
    };
  }
  if (field instanceof PDFDropdown) {
    return {
      name,
      kind: 'dropdown',
      options: field.getOptions(),
      value: field.getSelected()[0] ?? '',
      readOnly,
      multiline: false,
    };
  }
  if (field instanceof PDFOptionList) {
    return {
      name,
      kind: 'optionList',
      options: field.getOptions(),
      value: field.getSelected()[0] ?? '',
      readOnly,
      multiline: false,
    };
  }
  // Push buttons and signature fields have nothing to fill in.
  return null;
}

/**
 * Reads a PDF's fillable fields and page geometry.
 *
 * Page sizes come back so the UI can place a signature in PDF points without
 * shipping a renderer: the caller draws a box against these proportions.
 */
export async function inspectPdfForm(input: PdfWorkerInput) {
  const document = await loadPdf(input);
  const pages = document.getPages();
  if (pages.length < 1) {
    throw new PdfEngineError('EMPTY_PDF', 'This PDF has no pages.', input.id);
  }

  let fields: import('./protocol').PdfFormField[] = [];
  try {
    fields = document
      .getForm()
      .getFields()
      .map(describeField)
      .filter((field): field is import('./protocol').PdfFormField => !!field);
  } catch {
    // A PDF with no AcroForm, or one pdf-lib cannot parse, simply has no
    // fields to offer. Signing it still works.
    fields = [];
  }

  return {
    pages: pages.length,
    pageSizes: pages.map((page) => {
      const { width, height } = page.getSize();
      return { width, height };
    }),
    fields,
  };
}

/**
 * Writes values into a PDF's form fields and optionally stamps a signature.
 *
 * `flatten` bakes the values into the page and drops the form, which is what
 * most people mean by a finished document. Without it the values stay
 * editable, which is right when the file is still going round for review.
 *
 * This is a drawn signature, not a cryptographic one. Nothing here proves who
 * signed or when, and the UI must not imply otherwise.
 */
export async function fillPdfForm(
  input: PdfWorkerInput,
  options: import('./protocol').PdfFillOptions,
  onProgress?: (
    phase: 'reading' | 'copying' | 'validating',
    completed: number,
    total: number,
  ) => void,
) {
  const computeStarted = performance.now();
  onProgress?.('reading', 0, 1);
  const document = await loadPdf(input);
  const pageCount = document.getPageCount();

  const names = Object.keys(options.values);
  let filled = 0;
  if (names.length) {
    const form = document.getForm();
    names.forEach((name, index) => {
      const value = options.values[name] ?? '';
      let field;
      try {
        field = form.getField(name);
      } catch {
        // The document changed under the UI, or the name was never real.
        // Skipping is safer than failing the whole document.
        onProgress?.('copying', index + 1, names.length);
        return;
      }
      if (field.isReadOnly()) {
        onProgress?.('copying', index + 1, names.length);
        return;
      }

      try {
        if (field instanceof PDFTextField) field.setText(value);
        else if (field instanceof PDFCheckBox) {
          if (value === 'on') field.check();
          else field.uncheck();
        } else if (field instanceof PDFRadioGroup) {
          if (value) field.select(value);
          else field.clear();
        } else if (field instanceof PDFDropdown) {
          if (value) field.select(value);
          else field.clear();
        } else if (field instanceof PDFOptionList) {
          if (value) field.select(value);
          else field.clear();
        } else {
          onProgress?.('copying', index + 1, names.length);
          return;
        }
        filled += 1;
      } catch (error) {
        throw new PdfEngineError(
          'FILL_FAILED',
          `“${name}” would not take that value: ${error instanceof Error ? error.message : 'unknown reason'}`,
          input.id,
        );
      }
      onProgress?.('copying', index + 1, names.length);
    });
  }

  let signaturePlaced = false;
  const signature = options.signature;
  if (signature) {
    if (
      !Number.isInteger(signature.pageIndex) ||
      signature.pageIndex < 0 ||
      signature.pageIndex >= pageCount
    ) {
      throw new PdfEngineError(
        'FILL_FAILED',
        `Place the signature on a page between 1 and ${pageCount}.`,
        input.id,
      );
    }
    let embedded;
    try {
      embedded = await document.embedPng(signature.image);
    } catch {
      throw new PdfEngineError(
        'FILL_FAILED',
        'The signature image could not be read.',
        input.id,
      );
    }
    const page = document.getPage(signature.pageIndex);
    const width = Math.max(1, signature.width);
    const height = (embedded.height / embedded.width) * width;
    // The UI measures from the top-left corner; PDF space starts bottom-left.
    page.drawImage(embedded, {
      x: signature.x,
      y: page.getHeight() - signature.y - height,
      width,
      height,
    });
    signaturePlaced = true;
  }

  if (options.flatten) {
    try {
      document.getForm().flatten();
    } catch (error) {
      throw new PdfEngineError(
        'FILL_FAILED',
        `This form could not be made final: ${error instanceof Error ? error.message : 'unknown reason'}`,
        input.id,
      );
    }
  }

  const bytes = await document.save({
    addDefaultPage: false,
    useObjectStreams: true,
    objectsPerTick: 50,
  });
  const computeDurationMs = performance.now() - computeStarted;

  onProgress?.('validating', 1, 1);
  const validationStarted = performance.now();
  const reopened = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  if (reopened.getPageCount() !== pageCount) {
    throw new PdfEngineError(
      'FILL_FAILED',
      'The completed PDF failed its page-count check.',
      input.id,
    );
  }
  const validationDurationMs = performance.now() - validationStarted;

  return {
    bytes,
    pageCount,
    fieldsFilled: filled,
    signaturePlaced,
    flattened: options.flatten,
    computeDurationMs,
    validationDurationMs,
  };
}
