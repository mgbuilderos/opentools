import {
  AcroChoiceFlags,
  AnnotationFlags,
  concatTransformationMatrix,
  createPDFAcroField,
  defaultDropdownAppearanceProvider,
  defaultOptionListAppearanceProvider,
  degrees,
  drawObject,
  PDFAcroCheckBox,
  PDFAcroComboBox,
  PDFAcroListBox,
  PDFAcroNonTerminal,
  PDFAcroPushButton,
  PDFAcroRadioButton,
  PDFAcroSignature,
  PDFAcroText,
  PDFArray,
  PDFBool,
  PDFButton,
  PDFCheckBox,
  PDFDict,
  PDFDropdown,
  PDFHexString,
  PDFOptionList,
  PDFRadioGroup,
  PDFRef,
  PDFSignature,
  PDFStream,
  PDFString,
  PDFTextField,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFWidgetAnnotation,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import type {
  PDFField,
  PDFFont,
  PDFForm,
  PDFImage,
  PDFObject,
  PDFPage,
} from 'pdf-lib';

import type { JpegReencoder } from './jpeg-reencode';

import { classifyEncryption, type StandardEncryption } from './pdf-encryption';
import type {
  ImagesToPdfOptions,
  PdfFillOptions,
  PdfFormDocumentInfo,
  PdfFormField,
  PdfFormFieldValue,
  PdfImageInput,
  PdfPageGeometry,
  PdfWorkerInput,
} from './protocol';
import { stripMetadataInPlace } from './metadata';
import {
  displayedRectToUserSpace,
  pageGeometry,
  rectFitsPage,
} from './signature-placement';

export type PdfEngineErrorCode =
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'RESTRICTED_PDF'
  | 'SIGNED_PDF'
  | 'XFA_PDF'
  | 'REQUIRED_FIELDS'
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
    /** Fields the error is about, by id. */
    public readonly fieldIds?: string[],
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
    // This used to blank the six Info fields by hand and stop there, which
    // left the XMP packet — where Word and Acrobat also record the author and
    // the title — fully intact. Measured on a file carrying one: the output
    // still contained the author's name after the option was ticked. See the
    // header of `./metadata` for the four places a PDF keeps identity.
    stripMetadataInPlace(document);
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

/*
 * Forms and signing.
 *
 * pdf-lib rewrites a PDF from scratch on save, so everything below is careful
 * to change only what the user asked for: untouched fields keep their values
 * and appearances, a written field keeps its original /DA (so "Auto" font
 * size stays auto for the next person), and files whose existing signature
 * any rewrite would break are refused rather than silently damaged.
 */

const HIDDEN_WIDGET_FLAGS = AnnotationFlags.Hidden | AnnotationFlags.NoView;

const UNSUPPORTED_TEXT_NOTE =
  'Form fields accept basic Latin text only for now.';

type DescribedField = { field: PDFField; info: PdfFormField };

type WidgetEntry = { ref: PDFRef | undefined; widget: PDFWidgetAnnotation };

/** Looks up a typed entry, treating a wrong type as missing. */
function lookupOptional<T extends PDFObject>(
  dict: PDFDict,
  key: string,
  // pdf-lib's object classes hide their constructors, so only the prototype
  // is typed here.
  type: { prototype: T },
): T | undefined {
  try {
    const value = dict.lookup(PDFName.of(key));
    return value && type.prototype.isPrototypeOf(value)
      ? (value as T)
      : undefined;
  } catch {
    return undefined;
  }
}

function fieldIdOf(field: PDFField) {
  return `${field.ref.objectNumber}-${field.ref.generationNumber}`;
}

/**
 * The form's terminal fields, in the same order as `PDFForm.getFields()`.
 *
 * pdf-lib's own walk throws on the first /Fields entry that is not a
 * dictionary and never returns from a /Kids cycle, which would hide every
 * real field. Entries that cannot be read are skipped here instead.
 */
function formFields(form: PDFForm): PDFField[] {
  const { doc } = form;
  const fields: PDFField[] = [];
  const visited = new Set<PDFDict>();
  const walk = (nodes: PDFArray | undefined) => {
    if (!nodes) return;
    for (let index = 0; index < nodes.size(); index += 1) {
      const ref = nodes.get(index);
      const dict = doc.context.lookup(ref);
      if (!(ref instanceof PDFRef) || !(dict instanceof PDFDict)) continue;
      if (visited.has(dict)) continue;
      visited.add(dict);
      let acroField;
      try {
        acroField = createPDFAcroField(dict, ref);
      } catch {
        continue;
      }
      if (acroField instanceof PDFAcroNonTerminal) {
        walk(lookupOptional(dict, 'Kids', PDFArray));
      } else if (acroField instanceof PDFAcroPushButton) {
        fields.push(PDFButton.of(acroField, ref, doc));
      } else if (acroField instanceof PDFAcroCheckBox) {
        fields.push(PDFCheckBox.of(acroField, ref, doc));
      } else if (acroField instanceof PDFAcroComboBox) {
        fields.push(PDFDropdown.of(acroField, ref, doc));
      } else if (acroField instanceof PDFAcroListBox) {
        fields.push(PDFOptionList.of(acroField, ref, doc));
      } else if (acroField instanceof PDFAcroText) {
        fields.push(PDFTextField.of(acroField, ref, doc));
      } else if (acroField instanceof PDFAcroRadioButton) {
        fields.push(PDFRadioGroup.of(acroField, ref, doc));
      } else if (acroField instanceof PDFAcroSignature) {
        fields.push(PDFSignature.of(acroField, ref, doc));
      }
    }
  };
  walk(lookupOptional(form.acroForm.dict, 'Fields', PDFArray));
  return fields;
}

/** Quotes a field name for a message the user reads. */
function quoted(name: string) {
  return `“${name || 'Unnamed field'}”`;
}

/** A field's widgets, with the reference each is stored under when it has one. */
function widgetEntries(field: PDFField): WidgetEntry[] {
  const kids = field.acroField.Kids();
  if (!kids) {
    return [
      {
        ref: field.ref,
        widget: PDFWidgetAnnotation.fromDict(field.acroField.dict),
      },
    ];
  }
  const entries: WidgetEntry[] = [];
  for (let index = 0; index < kids.size(); index += 1) {
    const raw = kids.get(index);
    const dict = field.doc.context.lookup(raw);
    if (!(dict instanceof PDFDict)) continue;
    entries.push({
      ref: raw instanceof PDFRef ? raw : undefined,
      widget: PDFWidgetAnnotation.fromDict(dict),
    });
  }
  return entries;
}

/**
 * Finds the page that shows a widget. Viewers only draw annotations listed in
 * a page's /Annots, so a widget missing from every list is not on a page,
 * whatever its /P says.
 */
function widgetPageLocator(document: PDFDocument) {
  const pageOfAnnotation = new Map<PDFRef, number>();
  const pageOfDict = new Map<PDFDict, number>();
  document.getPages().forEach((page, pageIndex) => {
    const annots = lookupOptional(page.node, 'Annots', PDFArray);
    if (!annots) return;
    for (let index = 0; index < annots.size(); index += 1) {
      const raw = annots.get(index);
      if (raw instanceof PDFRef) pageOfAnnotation.set(raw, pageIndex);
      const dict = document.context.lookup(raw);
      if (dict instanceof PDFDict) pageOfDict.set(dict, pageIndex);
    }
  });
  return (entry: WidgetEntry) =>
    (entry.ref ? pageOfAnnotation.get(entry.ref) : undefined) ??
    pageOfDict.get(entry.widget.dict);
}

function isWidgetHidden(widget: PDFWidgetAnnotation) {
  try {
    return (widget.getFlags() & HIDDEN_WIDGET_FLAGS) !== 0;
  } catch {
    return false;
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function isEmptyValue(value: PdfFormFieldValue) {
  if (typeof value === 'boolean') return !value;
  if (Array.isArray(value)) return value.length === 0;
  return value === '';
}

function sameValue(a: PdfFormFieldValue, b: PdfFormFieldValue) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const left = [...a].sort();
    const right = [...b].sort();
    return (
      left.length === right.length &&
      left.every((value, index) => value === right[index])
    );
  }
  return a === b;
}

function choiceOptions(field: PDFDropdown | PDFOptionList) {
  return field.acroField.getOptions().map((option) => ({
    value: option.value.decodeText(),
    display: option.display.decodeText(),
  }));
}

function choiceValues(field: PDFDropdown | PDFOptionList) {
  return field.acroField.getValues().map((value) => value.decodeText());
}

/** Reads one field. Throws only for fields pdf-lib cannot read at all. */
function readFormField(
  field: PDFField,
  locate: (entry: WidgetEntry) => number | undefined,
): PdfFormField | null {
  if (
    !(field instanceof PDFTextField) &&
    !(field instanceof PDFCheckBox) &&
    !(field instanceof PDFRadioGroup) &&
    !(field instanceof PDFDropdown) &&
    !(field instanceof PDFOptionList)
  ) {
    // Push buttons and signature fields have nothing to fill in.
    return null;
  }

  const visiblePages = widgetEntries(field)
    .filter((entry) => !isWidgetHidden(entry.widget))
    .map(locate)
    .filter((page): page is number => page !== undefined);
  const readOnly = field.isReadOnly();
  const info: PdfFormField = {
    id: fieldIdOf(field),
    name: field.getName(),
    kind: 'text',
    options: [],
    value: '',
    readOnly,
    readOnlyReason: readOnly ? 'locked' : null,
    required: field.isRequired(),
    hidden: visiblePages.length === 0,
    multiline: false,
    multiSelect: false,
    editable: false,
    maxLength: null,
    pageIndex: visiblePages[0] ?? null,
    calculated: false,
  };

  if (field instanceof PDFTextField) {
    info.multiline = field.isMultiline();
    info.maxLength = field.getMaxLength() ?? null;
    if (field.isRichFormatted()) {
      info.readOnly = true;
      info.readOnlyReason ??= 'richText';
      // pdf-lib refuses to read an empty rich text value; the field is
      // offered read-only either way.
      try {
        info.value = field.getText() ?? '';
      } catch {
        info.value = '';
      }
    } else {
      info.value = field.getText() ?? '';
    }
    return info;
  }

  if (field instanceof PDFCheckBox) {
    const entries = widgetEntries(field);
    const widgetOnValues = entries.map((entry) =>
      (entry.widget.getOnValue() ?? PDFName.of('Yes')).decodeText(),
    );
    const onValues = uniqueStrings(widgetOnValues);
    // /Opt, when present, holds each widget's export value in widget order;
    // the on-state names are then often just "0", "1", ...
    const exportValues = field.acroField.getExportValues();
    const stored = field.acroField.dict.lookup(PDFName.of('V'));
    // Some writers set only the widget's /AS; that is what a viewer shows.
    const shown = entries
      .map((entry) => entry.widget.getAppearanceState())
      .find((state) => state !== undefined && state !== PDFName.of('Off'));
    const current =
      stored instanceof PDFName
        ? stored
        : stored === undefined
          ? shown
          : undefined;
    const currentText =
      current && current !== PDFName.of('Off') ? current.decodeText() : '';
    info.options = onValues.map((value) => {
      const widgetIndex = widgetOnValues.indexOf(value);
      const exported = exportValues?.[widgetIndex]?.decodeText();
      return { value, display: exported || value };
    });

    if (onValues.length > 1) {
      info.kind = 'checkboxGroup';
      info.value = onValues.includes(currentText) ? currentText : '';
    } else {
      info.kind = 'checkbox';
      info.value = currentText !== '' && onValues.includes(currentText);
    }
    return info;
  }

  if (field instanceof PDFRadioGroup) {
    info.kind = 'radio';
    info.options = uniqueStrings(field.getOptions()).map((value) => ({
      value,
      display: value,
    }));
    let selected = field.getSelected();
    // As with check boxes, some writers set only the chosen widget's /AS.
    if (
      selected === undefined &&
      field.acroField.dict.lookup(PDFName.of('V')) === undefined
    ) {
      // Indexed like pdf-lib's own /Opt lookup, one entry per /Kids item.
      const kids = field.acroField.Kids();
      const states = kids
        ? Array.from({ length: kids.size() }, (_, index) => {
            const kid = kids.lookup(index);
            return kid instanceof PDFDict
              ? PDFWidgetAnnotation.fromDict(kid).getAppearanceState()
              : undefined;
          })
        : [
            PDFWidgetAnnotation.fromDict(
              field.acroField.dict,
            ).getAppearanceState(),
          ];
      const index = states.findIndex(
        (state) => state !== undefined && state !== PDFName.of('Off'),
      );
      if (index >= 0) {
        selected =
          field.acroField.getExportValues()?.[index]?.decodeText() ??
          states[index]!.decodeText();
      }
    }
    info.value = selected ?? '';
    return info;
  }

  if (field instanceof PDFDropdown) {
    info.kind = 'dropdown';
    info.options = choiceOptions(field);
    info.value = choiceValues(field)[0] ?? '';
    info.editable = field.isEditable();
    return info;
  }

  info.kind = 'optionList';
  info.options = choiceOptions(field);
  info.multiSelect = field.acroField.hasFlag(AcroChoiceFlags.MultiSelect);
  info.value = choiceValues(field);
  return info;
}

/**
 * A field whose value the form's own script computes: listed in /CO or
 * carrying a calculate action. Nothing here runs those scripts.
 */
function isCalculatedField(field: PDFField, calculationOrder: Set<PDFRef>) {
  if (calculationOrder.has(field.ref)) return true;
  try {
    const actions = lookupOptional(field.acroField.dict, 'AA', PDFDict);
    return !!actions?.has(PDFName.of('C'));
  } catch {
    return false;
  }
}

/**
 * Reads every field, one at a time, so a field pdf-lib cannot read is shown
 * read-only instead of hiding the rest. Fields sharing a name are read-only.
 */
function describeFormFields(document: PDFDocument, form: PDFForm) {
  const locate = widgetPageLocator(document);
  const calculationOrder = new Set<PDFRef>();
  const order = lookupOptional(form.acroForm.dict, 'CO', PDFArray);
  for (let index = 0; index < (order?.size() ?? 0); index += 1) {
    const ref = order!.get(index);
    if (ref instanceof PDFRef) calculationOrder.add(ref);
  }
  const described: DescribedField[] = [];
  for (const field of formFields(form)) {
    let info: PdfFormField | null;
    try {
      info = readFormField(field, locate);
    } catch {
      let name = '';
      try {
        name = field.getName();
      } catch {
        name = '';
      }
      info = {
        id: fieldIdOf(field),
        name,
        kind: 'text',
        options: [],
        value: '',
        readOnly: true,
        readOnlyReason: 'unreadable',
        required: false,
        hidden: false,
        multiline: false,
        multiSelect: false,
        editable: false,
        maxLength: null,
        pageIndex: null,
        calculated: false,
      };
    }
    if (info) {
      info.calculated = isCalculatedField(field, calculationOrder);
      described.push({ field, info });
    }
  }

  const nameCounts = new Map<string, number>();
  for (const { info } of described) {
    nameCounts.set(info.name, (nameCounts.get(info.name) ?? 0) + 1);
  }
  for (const { info } of described) {
    if ((nameCounts.get(info.name) ?? 0) > 1) {
      info.readOnly = true;
      info.readOnlyReason ??= 'duplicateName';
    }
  }
  return described;
}

function readXfaKind(document: PDFDocument): PdfFormDocumentInfo['xfa'] {
  const acroForm = lookupOptional(document.catalog, 'AcroForm', PDFDict);
  if (!acroForm?.has(PDFName.of('XFA'))) return 'none';
  const needsRendering = lookupOptional(
    document.catalog,
    'NeedsRendering',
    PDFBool,
  );
  const fields = lookupOptional(acroForm, 'Fields', PDFArray);
  // A dynamic XFA form draws itself from the XFA; its AcroForm has no fields
  // and the page content is only a "please wait" placeholder.
  if (needsRendering?.asBoolean() || !fields || fields.size() === 0) {
    return 'dynamic';
  }
  return 'static';
}

function isSignedSignatureNode(
  document: PDFDocument,
  node: PDFDict,
  type: string | undefined,
) {
  if (type !== 'Sig') return false;
  const value = node.get(PDFName.of('V'));
  return (
    value !== undefined && document.context.lookup(value) instanceof PDFDict
  );
}

/**
 * True when the file carries a digital signature or usage rights that a
 * rewrite would invalidate: a signature field with a value, a /Perms entry
 * (certification or Reader usage rights), or AcroForm /SigFlags AppendOnly.
 */
function hasDigitalSignature(document: PDFDocument) {
  const { catalog, context } = document;
  if (catalog.has(PDFName.of('Perms'))) return true;

  const acroForm = lookupOptional(catalog, 'AcroForm', PDFDict);
  if (acroForm) {
    const sigFlags = lookupOptional(acroForm, 'SigFlags', PDFNumber);
    if (sigFlags && (sigFlags.asNumber() & 2) !== 0) return true;

    const visited = new Set<PDFDict>();
    const walk = (
      nodes: PDFArray | undefined,
      inherited: string | undefined,
    ): boolean => {
      if (!nodes) return false;
      for (let index = 0; index < nodes.size(); index += 1) {
        const node = context.lookup(nodes.get(index));
        if (!(node instanceof PDFDict) || visited.has(node)) continue;
        visited.add(node);
        const type =
          lookupOptional(node, 'FT', PDFName)?.decodeText() ?? inherited;
        if (isSignedSignatureNode(document, node, type)) return true;
        if (walk(lookupOptional(node, 'Kids', PDFArray), type)) return true;
      }
      return false;
    };
    if (walk(lookupOptional(acroForm, 'Fields', PDFArray), undefined)) {
      return true;
    }
  }

  // A signature widget can be reachable only from its page.
  for (const page of document.getPages()) {
    const annots = lookupOptional(page.node, 'Annots', PDFArray);
    if (!annots) continue;
    for (let index = 0; index < annots.size(); index += 1) {
      const annot = context.lookup(annots.get(index));
      if (!(annot instanceof PDFDict)) continue;
      const type = lookupOptional(annot, 'FT', PDFName)?.decodeText();
      if (isSignedSignatureNode(document, annot, type)) return true;
    }
  }
  return false;
}

function stringBytes(value: PDFObject | undefined) {
  return value instanceof PDFString || value instanceof PDFHexString
    ? value.asBytes()
    : undefined;
}

/** Reads the Standard security handler entries needed to classify a file. */
export function readStandardEncryption(
  document: PDFDocument,
): StandardEncryption | undefined {
  const { context } = document;
  const encrypt = context.lookup(context.trailerInfo.Encrypt);
  if (!(encrypt instanceof PDFDict)) return undefined;
  const owner = stringBytes(context.lookup(encrypt.get(PDFName.of('O'))));
  const user = stringBytes(context.lookup(encrypt.get(PDFName.of('U'))));
  const revision = lookupOptional(encrypt, 'R', PDFNumber)?.asNumber();
  const permissions = lookupOptional(encrypt, 'P', PDFNumber)?.asNumber();
  if (!owner || !user || revision === undefined || permissions === undefined) {
    return undefined;
  }
  const ids = context.lookup(context.trailerInfo.ID);
  const firstId =
    ids instanceof PDFArray
      ? stringBytes(context.lookup(ids.get(0)))
      : undefined;
  return {
    filter: lookupOptional(encrypt, 'Filter', PDFName)?.decodeText(),
    revision,
    lengthBits: lookupOptional(encrypt, 'Length', PDFNumber)?.asNumber(),
    owner,
    user,
    permissions,
    encryptMetadata:
      lookupOptional(encrypt, 'EncryptMetadata', PDFBool)?.asBoolean() ?? true,
    firstId: firstId ?? new Uint8Array(0),
  };
}

/**
 * Loads a PDF for filling or signing. Unlike `loadPdf`, an encrypted file is
 * classified first, so a form that only restricts editing is not met with
 * advice to remove a password the user never had.
 */
async function loadFormPdf(input: PdfWorkerInput) {
  if (!hasPdfSignature(input.bytes)) {
    throw new PdfEngineError(
      'INVALID_PDF',
      'This file could not be read as a supported PDF.',
      input.id,
    );
  }

  let document: PDFDocument;
  try {
    // Parsing is the same either way; encryption is checked just below.
    document = await PDFDocument.load(input.bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
  } catch {
    throw new PdfEngineError(
      'INVALID_PDF',
      'This file could not be read as a supported PDF.',
      input.id,
    );
  }

  if (document.isEncrypted) {
    const encryption = readStandardEncryption(document);
    const kind = encryption ? await classifyEncryption(encryption) : 'unknown';
    if (kind === 'owner-only') {
      throw new PdfEngineError(
        'RESTRICTED_PDF',
        'Whoever made this PDF locked it against changes. It opens without a password, but it cannot be filled or signed here.',
        input.id,
      );
    }
    if (kind === 'user-password') {
      throw new PdfEngineError(
        'ENCRYPTED_PDF',
        'This PDF is encrypted. Remove its password locally, then try again.',
        input.id,
      );
    }
    throw new PdfEngineError(
      'ENCRYPTED_PDF',
      'This PDF is encrypted, so it cannot be filled or signed here.',
      input.id,
    );
  }
  return document;
}

function geometryOfPage(page: PDFPage): PdfPageGeometry {
  return pageGeometry(
    page.getMediaBox(),
    page.node.CropBox() ? page.getCropBox() : undefined,
    page.getRotation().angle,
  );
}

/**
 * The first character the form font cannot write, after the same clean-up
 * pdf-lib applies before laying text out (tabs become spaces, line breaks
 * split lines).
 */
function firstUnsupportedCharacter(font: PDFFont, text: string) {
  // Code points pdf-lib turns into spaces (tab, NEL, line and paragraph
  // separators) or drops (backspace, line breaks, vertical tab, form feed).
  const becomeSpaces = [0x09, 0x85, 0x2028, 0x2029];
  const dropped = [0x08, 0x0a, 0x0b, 0x0c, 0x0d];
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (becomeSpaces.includes(code) || dropped.includes(code)) continue;
    try {
      font.encodeText(character);
    } catch {
      return character;
    }
  }
  return undefined;
}

function describeCharacter(character: string) {
  const code = (character.codePointAt(0) ?? 0)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');
  return `“${character}” (U+${code})`;
}

function assertEncodable(
  font: PDFFont,
  info: PdfFormField,
  texts: string[],
  inputId: string,
  whenFlattening = false,
) {
  for (const text of texts) {
    const character = firstUnsupportedCharacter(font, text);
    if (character === undefined) continue;
    const consequence = whenFlattening
      ? 'which cannot be drawn onto the page yet, so the form was not made final. You can still save without making it final.'
      : 'which cannot be written into a form field yet.';
    throw new PdfEngineError(
      'FILL_FAILED',
      `${quoted(info.name)} contains ${describeCharacter(character)}, ${consequence} ${UNSUPPORTED_TEXT_NOTE}`,
      inputId,
      [info.id],
    );
  }
}

type FieldWrite = DescribedField & { value: PdfFormFieldValue };

function invalidValue(info: PdfFormField, inputId: string, detail: string) {
  return new PdfEngineError(
    'FILL_FAILED',
    `${quoted(info.name)} ${detail}`,
    inputId,
    [info.id],
  );
}

/** Display text for each export value, falling back to the value itself. */
function displaysFor(
  options: Array<{ value: string; display: string }>,
  values: string[],
) {
  return values.map(
    (value) =>
      options.find((option) => option.value === value)?.display ?? value,
  );
}

/**
 * Checks every requested value before anything is written, and drops values
 * that would not change the field.
 */
function planFieldWrites(
  described: DescribedField[],
  values: Record<string, PdfFormFieldValue>,
  getFont: () => PDFFont,
  inputId: string,
) {
  const byId = new Map(described.map((entry) => [entry.info.id, entry]));
  const writes: FieldWrite[] = [];

  for (const [id, requested] of Object.entries(values)) {
    const entry = byId.get(id);
    // Unknown ids mean the document changed under the UI; read-only and
    // hidden fields are never offered. Skipping is safer than failing.
    if (!entry || entry.info.readOnly || entry.info.hidden) continue;
    const { info } = entry;
    const optionValues = info.options.map((option) => option.value);
    let value: PdfFormFieldValue = requested;

    if (info.kind === 'text') {
      if (typeof requested !== 'string') {
        throw invalidValue(info, inputId, 'needs text.');
      }
      if (info.maxLength !== null && requested.length > info.maxLength) {
        throw invalidValue(
          info,
          inputId,
          `allows at most ${info.maxLength} characters.`,
        );
      }
    } else if (info.kind === 'checkbox') {
      if (typeof requested !== 'boolean') {
        throw invalidValue(info, inputId, 'needs to be ticked or cleared.');
      }
    } else if (info.kind === 'optionList') {
      if (
        !Array.isArray(requested) ||
        requested.some((item) => typeof item !== 'string')
      ) {
        throw invalidValue(info, inputId, 'needs a list of choices.');
      }
      value = uniqueStrings(requested);
      // A value the file already holds may be kept even when the options no
      // longer list it; only new choices must come from the list.
      const stored = Array.isArray(info.value) ? info.value : [];
      const unknown = value.find(
        (item) => !optionValues.includes(item) && !stored.includes(item),
      );
      if (unknown !== undefined) {
        throw invalidValue(info, inputId, `has no option “${unknown}”.`);
      }
      if (!info.multiSelect && value.length > 1) {
        throw invalidValue(info, inputId, 'accepts only one choice.');
      }
    } else {
      if (typeof requested !== 'string') {
        throw invalidValue(info, inputId, 'needs one choice.');
      }
      const allowsCustom = info.kind === 'dropdown' && info.editable;
      if (
        requested !== '' &&
        !allowsCustom &&
        !optionValues.includes(requested)
      ) {
        throw invalidValue(info, inputId, `has no option “${requested}”.`);
      }
    }

    if (sameValue(value, info.value)) continue;

    if (info.kind === 'text') {
      assertEncodable(getFont(), info, [value as string], inputId);
    } else if (info.kind === 'dropdown') {
      assertEncodable(
        getFont(),
        info,
        displaysFor(info.options, [value as string]),
        inputId,
      );
    } else if (info.kind === 'optionList') {
      // An option list's appearance shows every option, not only the chosen.
      assertEncodable(
        getFont(),
        info,
        info.options.map((option) => option.display),
        inputId,
      );
    }
    writes.push({ ...entry, value });
  }
  return writes;
}

/** Remembers /DA on the field and its widgets, which pdf-lib overwrites. */
function snapshotDefaultAppearances(field: PDFField) {
  const dicts = new Set([
    field.acroField.dict,
    ...widgetEntries(field).map((entry) => entry.widget.dict),
  ]);
  return [...dicts].map((dict) => ({
    dict,
    value: dict.get(PDFName.of('DA')),
  }));
}

function restoreDefaultAppearances(
  snapshot: ReturnType<typeof snapshotDefaultAppearances>,
) {
  for (const { dict, value } of snapshot) {
    if (value === undefined) dict.delete(PDFName.of('DA'));
    else dict.set(PDFName.of('DA'), value);
  }
}

/**
 * A view of a choice field whose selection reads as display text, so the
 * default appearance shows "Singapore" rather than the export value "SG".
 */
function withDisplayedSelection<T extends PDFDropdown | PDFOptionList>(
  field: T,
  displays: string[],
): T {
  return new Proxy(field, {
    get(target, property) {
      if (property === 'getSelected') return () => displays;
      const member: unknown = Reflect.get(target, property, target);
      return typeof member === 'function' ? member.bind(target) : member;
    },
  });
}

/** Regenerates a field's appearance while keeping its original /DA. */
function regenerateAppearance(field: PDFField, getFont: () => PDFFont) {
  const snapshot = snapshotDefaultAppearances(field);
  try {
    if (field instanceof PDFTextField) {
      field.updateAppearances(getFont());
    } else if (field instanceof PDFDropdown) {
      const view = withDisplayedSelection(
        field,
        displaysFor(choiceOptions(field), choiceValues(field)),
      );
      field.updateAppearances(getFont(), (_field, widget, font) =>
        defaultDropdownAppearanceProvider(view, widget, font),
      );
    } else if (field instanceof PDFOptionList) {
      const view = withDisplayedSelection(
        field,
        displaysFor(choiceOptions(field), choiceValues(field)),
      );
      field.updateAppearances(getFont(), (_field, widget, font) =>
        defaultOptionListAppearanceProvider(view, widget, font),
      );
    } else if (field instanceof PDFCheckBox || field instanceof PDFRadioGroup) {
      field.updateAppearances();
    }
  } finally {
    restoreDefaultAppearances(snapshot);
    field.doc.getForm().markFieldAsClean(field.ref);
  }
}

/** Sets a choice field's export values directly, with matching /I. */
function setChoiceValues(
  field: PDFDropdown | PDFOptionList,
  values: string[],
  multiSelect: boolean,
) {
  const { dict } = field.acroField;
  const encoded = values.map((value) => PDFHexString.fromText(value));
  if (encoded.length === 0) dict.delete(PDFName.of('V'));
  else if (encoded.length === 1 && !multiSelect) {
    dict.set(PDFName.of('V'), encoded[0]!);
  } else dict.set(PDFName.of('V'), dict.context.obj(encoded));

  const exportValues = choiceOptions(field).map((option) => option.value);
  const indices = values
    .map((value) => exportValues.indexOf(value))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (field instanceof PDFOptionList && indices.length) {
    dict.set(PDFName.of('I'), dict.context.obj(indices));
  } else {
    dict.delete(PDFName.of('I'));
  }
}

function writeField(write: FieldWrite, getFont: () => PDFFont) {
  const { field, info, value } = write;
  const form = field.doc.getForm();

  if (field instanceof PDFTextField) {
    field.setText(value as string);
    regenerateAppearance(field, getFont);
  } else if (field instanceof PDFCheckBox && info.kind === 'checkboxGroup') {
    // pdf-lib's check() only knows the first widget's on-value, so a group of
    // same-name boxes is set by hand: /V names the chosen on-value and each
    // widget shows on only if it carries that value.
    const chosen =
      value === '' ? PDFName.of('Off') : PDFName.of(value as string);
    field.acroField.dict.set(PDFName.of('V'), chosen);
    for (const entry of widgetEntries(field)) {
      entry.widget.setAppearanceState(
        entry.widget.getOnValue() === chosen ? chosen : PDFName.of('Off'),
      );
    }
  } else if (field instanceof PDFCheckBox) {
    if (value === true) field.check();
    else field.uncheck();
    if (field.needsAppearancesUpdate()) regenerateAppearance(field, getFont);
  } else if (field instanceof PDFRadioGroup) {
    if (value === '') field.clear();
    else field.select(value as string);
    if (field.needsAppearancesUpdate()) regenerateAppearance(field, getFont);
  } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
    const values = Array.isArray(value)
      ? value
      : value === ''
        ? []
        : [value as string];
    setChoiceValues(field, values, info.multiSelect);
    regenerateAppearance(field, getFont);
  }
  form.markFieldAsClean(field.ref);
}

/** Reads a fixed-length array of numbers from a dictionary. */
function numberArray(document: PDFDocument, dict: PDFDict, key: string) {
  const array = lookupOptional(dict, key, PDFArray);
  if (!array) return undefined;
  const values: number[] = [];
  for (let index = 0; index < array.size(); index += 1) {
    const item = document.context.lookup(array.get(index));
    if (!(item instanceof PDFNumber)) return undefined;
    values.push(item.asNumber());
  }
  return values;
}

/** Draws one widget's current normal appearance into its page's content. */
function drawWidgetAppearance(
  document: PDFDocument,
  page: PDFPage,
  widget: PDFWidgetAnnotation,
) {
  const { context } = document;
  const appearances = lookupOptional(widget.dict, 'AP', PDFDict);
  let raw = appearances?.get(PDFName.of('N'));
  let appearance = raw === undefined ? undefined : context.lookup(raw);
  if (appearance instanceof PDFDict) {
    const state = widget.getAppearanceState();
    raw = state ? appearance.get(state) : undefined;
    appearance = raw === undefined ? undefined : context.lookup(raw);
  }
  if (!(appearance instanceof PDFStream) || raw === undefined) return;

  const bbox = numberArray(document, appearance.dict, 'BBox');
  if (!bbox || bbox.length !== 4) return;
  const matrix = numberArray(document, appearance.dict, 'Matrix');
  const [a, b, c, d, e, f] =
    matrix && matrix.length === 6 ? matrix : [1, 0, 0, 1, 0, 0];
  const corners = [
    [bbox[0]!, bbox[1]!],
    [bbox[2]!, bbox[1]!],
    [bbox[0]!, bbox[3]!],
    [bbox[2]!, bbox[3]!],
  ].map(([x, y]) => [a! * x! + c! * y! + e!, b! * x! + d! * y! + f!]);
  const xs = corners.map((corner) => corner[0]!);
  const ys = corners.map((corner) => corner[1]!);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const boxWidth = Math.max(...xs) - minX;
  const boxHeight = Math.max(...ys) - minY;

  const rect = widget.getRectangle();
  const scaleX = Math.abs(rect.width) / boxWidth;
  const scaleY = Math.abs(rect.height) / boxHeight;
  if (![scaleX, scaleY].every((scale) => Number.isFinite(scale) && scale > 0)) {
    return;
  }
  const rectX = Math.min(rect.x, rect.x + rect.width);
  const rectY = Math.min(rect.y, rect.y + rect.height);

  const ref = raw instanceof PDFRef ? raw : context.register(appearance);
  if (!appearance.dict.has(PDFName.of('Subtype'))) {
    appearance.dict.set(PDFName.of('Subtype'), PDFName.of('Form'));
  }
  // ISO 32000-2 12.5.5: the appearance's transformed BBox maps onto /Rect.
  const name = page.node.newXObject('FlatWidget', ref);
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(
      scaleX,
      0,
      0,
      scaleY,
      rectX - minX * scaleX,
      rectY - minY * scaleY,
    ),
    drawObject(name),
    popGraphicsState(),
  );
}

/** A field with a visible widget that has no usable normal appearance. */
function lacksAppearance(
  field: PDFField,
  entries: WidgetEntry[],
  locate: (entry: WidgetEntry) => number | undefined,
) {
  return entries.some((entry) => {
    if (isWidgetHidden(entry.widget) || locate(entry) === undefined) {
      return false;
    }
    const normal = entry.widget.getAppearances()?.normal;
    if (field instanceof PDFCheckBox || field instanceof PDFRadioGroup) {
      return !(normal instanceof PDFDict);
    }
    return !(normal instanceof PDFStream);
  });
}

/**
 * Drops structure-tree references to widgets the flatten removed: OBJR kids
 * whose object is gone, and the parent-tree entries keyed by those widgets'
 * /StructParent, so a tagged form keeps a structure tree without dangling
 * references.
 */
function removeStructureReferences(
  document: PDFDocument,
  structParents: Set<number>,
) {
  const { context } = document;
  const root = lookupOptional(document.catalog, 'StructTreeRoot', PDFDict);
  if (!root) return;

  const isDanglingObjectReference = (item: PDFObject) => {
    const dict = context.lookup(item);
    if (!(dict instanceof PDFDict)) return false;
    if (lookupOptional(dict, 'Type', PDFName) !== PDFName.of('OBJR')) {
      return false;
    }
    const target = dict.get(PDFName.of('Obj'));
    return target === undefined || context.lookup(target) === undefined;
  };

  const visited = new Set<PDFDict>();
  const visitElement = (node: PDFDict) => {
    if (visited.has(node)) return;
    visited.add(node);
    const raw = node.get(PDFName.of('K'));
    if (raw === undefined) return;
    const kids = context.lookup(raw);
    if (kids instanceof PDFArray) {
      for (let index = kids.size() - 1; index >= 0; index -= 1) {
        const item = kids.get(index);
        if (isDanglingObjectReference(item)) {
          kids.remove(index);
          continue;
        }
        const child = context.lookup(item);
        if (child instanceof PDFDict) visitElement(child);
      }
    } else if (kids instanceof PDFDict) {
      if (isDanglingObjectReference(raw)) node.delete(PDFName.of('K'));
      else visitElement(kids);
    }
  };
  visitElement(root);

  if (structParents.size === 0) return;
  const visitNumberTree = (node: PDFDict) => {
    if (visited.has(node)) return;
    visited.add(node);
    const nums = lookupOptional(node, 'Nums', PDFArray);
    if (nums) {
      for (
        let index = nums.size() - (nums.size() % 2) - 2;
        index >= 0;
        index -= 2
      ) {
        const key = context.lookup(nums.get(index));
        if (key instanceof PDFNumber && structParents.has(key.asNumber())) {
          nums.remove(index + 1);
          nums.remove(index);
        }
      }
    }
    const kids = lookupOptional(node, 'Kids', PDFArray);
    for (let index = 0; index < (kids?.size() ?? 0); index += 1) {
      const kid = context.lookup(kids!.get(index));
      if (kid instanceof PDFDict) visitNumberTree(kid);
    }
  };
  const parentTree = lookupOptional(root, 'ParentTree', PDFDict);
  if (parentTree) visitNumberTree(parentTree);
}

function widgetPrints(widget: PDFWidgetAnnotation) {
  try {
    return (widget.getFlags() & AnnotationFlags.Print) !== 0;
  } catch {
    return true;
  }
}

/**
 * Bakes every visible widget into its page and removes the form. Returns
 * whether there was any form to remove.
 *
 * pdf-lib's own flatten prints hidden widgets, fails on a signature field
 * without an appearance, and leaves /Annots pointing at deleted objects, so
 * this does the same job field by field.
 */
function flattenFormFields(
  document: PDFDocument,
  form: PDFForm,
  described: DescribedField[],
  getFont: () => PDFFont,
  inputId: string,
) {
  const { context } = document;
  const pages = document.getPages();
  const locate = widgetPageLocator(document);
  const infoById = new Map(
    described.map((entry) => [entry.info.id, entry.info]),
  );
  const removedWidgets = new Set<PDFRef>();
  const removedDicts = new Set<PDFDict>();
  const structParents = new Set<number>();
  // With /NeedAppearances a viewer draws text and choice fields from their
  // values, so a stored appearance may be stale or empty. Printing it would
  // lose what the person saw on screen.
  const needAppearances =
    lookupOptional(
      form.acroForm.dict,
      'NeedAppearances',
      PDFBool,
    )?.asBoolean() ?? false;

  for (const field of formFields(form)) {
    const entries = widgetEntries(field);
    for (const entry of entries) {
      if (entry.ref) removedWidgets.add(entry.ref);
      removedDicts.add(entry.widget.dict);
      const structParent = lookupOptional(
        entry.widget.dict,
        'StructParent',
        PDFNumber,
      );
      if (structParent) structParents.add(structParent.asNumber());
    }
    const info = infoById.get(fieldIdOf(field));

    try {
      const rebuild =
        info &&
        (lacksAppearance(field, entries, locate) ||
          (needAppearances &&
            !info.hidden &&
            info.readOnlyReason !== 'unreadable' &&
            (info.kind === 'text' ||
              info.kind === 'dropdown' ||
              info.kind === 'optionList')));
      if (info && rebuild) {
        if (info.readOnlyReason === 'richText') {
          // Its value cannot be laid out as plain text; nothing is drawn.
        } else {
          if (info.kind === 'text') {
            assertEncodable(
              getFont(),
              info,
              [info.value as string],
              inputId,
              true,
            );
          } else if (info.kind === 'dropdown') {
            assertEncodable(
              getFont(),
              info,
              displaysFor(info.options, [info.value as string]),
              inputId,
              true,
            );
          } else if (info.kind === 'optionList') {
            assertEncodable(
              getFont(),
              info,
              info.options.map((option) => option.display),
              inputId,
              true,
            );
          }
          regenerateAppearance(field, getFont);
        }
      }
      for (const entry of entries) {
        const pageIndex = locate(entry);
        if (pageIndex === undefined || isWidgetHidden(entry.widget)) continue;
        // A button that is not set to print (Print form, Clear) only makes
        // sense while the form is live; a final copy stands in for a print.
        if (field instanceof PDFButton && !widgetPrints(entry.widget)) continue;
        drawWidgetAppearance(document, pages[pageIndex]!, entry.widget);
      }
    } catch (error) {
      if (error instanceof PdfEngineError) throw error;
      // Buttons and signature fields hold nothing the user filled in; one
      // that cannot be drawn is simply removed.
      if (
        !info ||
        field instanceof PDFButton ||
        field instanceof PDFSignature
      ) {
        continue;
      }
      throw new PdfEngineError(
        'FILL_FAILED',
        `${quoted(info.name)} could not be drawn onto the page, so the form was not made final. You can still save without making it final.`,
        inputId,
        [info.id],
      );
    }
  }

  // Drop the widgets from every page, along with any entry that already
  // pointed at a missing object, so strict readers accept the result.
  for (const page of pages) {
    const annots = lookupOptional(page.node, 'Annots', PDFArray);
    if (!annots) continue;
    for (let index = annots.size() - 1; index >= 0; index -= 1) {
      const raw = annots.get(index);
      const target = context.lookup(raw);
      if (
        (raw instanceof PDFRef && removedWidgets.has(raw)) ||
        target === undefined ||
        (target instanceof PDFDict && removedDicts.has(target))
      ) {
        annots.remove(index);
      }
    }
  }

  const acroFormDict = form.acroForm.dict;
  const fieldRefs = new Set<PDFRef>();
  const visited = new Set<PDFDict>();
  const collect = (nodes: PDFArray | undefined) => {
    if (!nodes) return;
    for (let index = 0; index < nodes.size(); index += 1) {
      const raw = nodes.get(index);
      const node = context.lookup(raw);
      if (!(node instanceof PDFDict) || visited.has(node)) continue;
      visited.add(node);
      if (raw instanceof PDFRef) fieldRefs.add(raw);
      collect(lookupOptional(node, 'Kids', PDFArray));
    }
  };
  collect(lookupOptional(acroFormDict, 'Fields', PDFArray));
  for (const ref of [...fieldRefs, ...removedWidgets]) context.delete(ref);
  removeStructureReferences(document, structParents);

  acroFormDict.set(PDFName.of('Fields'), context.obj([]));
  for (const key of ['XFA', 'NeedAppearances', 'CO', 'SigFlags']) {
    acroFormDict.delete(PDFName.of(key));
  }
  return fieldRefs.size > 0 || removedDicts.size > 0;
}

/**
 * Reads a PDF's fillable fields, page geometry and whether it may be changed.
 *
 * Page geometry comes back so the UI can place a signature in PDF points
 * without shipping a renderer: the caller draws a box against the displayed
 * width and height, and the engine maps it through rotation and box origin.
 */
export async function inspectPdfForm(input: PdfWorkerInput) {
  try {
    const document = await loadFormPdf(input);
    const pages = document.getPages();
    if (pages.length < 1) {
      throw new PdfEngineError('EMPTY_PDF', 'This PDF has no pages.', input.id);
    }

    // Both checks read the file as it is, before getForm() strips any XFA.
    const info: PdfFormDocumentInfo = {
      hasDigitalSignature: hasDigitalSignature(document),
      xfa: readXfaKind(document),
      formUnreadable: false,
    };

    let fields: PdfFormField[] = [];
    if (lookupOptional(document.catalog, 'AcroForm', PDFDict)) {
      try {
        fields = describeFormFields(document, document.getForm()).map(
          (entry) => entry.info,
        );
      } catch {
        // Unreadable fields are skipped one by one, so this is a form that
        // cannot be read at all. It has no fields to offer.
        fields = [];
        info.formUnreadable = true;
      }
    }

    return {
      pages: pages.length,
      pageSizes: pages.map(geometryOfPage),
      fields,
      document: info,
    };
  } catch (error) {
    if (error instanceof PdfEngineError) throw error;
    throw new PdfEngineError(
      'INVALID_PDF',
      'This file could not be read as a supported PDF.',
      input.id,
    );
  }
}

/**
 * Writes changed values into a PDF's form fields and optionally stamps a
 * signature.
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
  options: PdfFillOptions,
  onProgress?: (
    phase: 'reading' | 'copying' | 'validating',
    completed: number,
    total: number,
  ) => void,
) {
  try {
    return await fillPdfFormChecked(input, options, onProgress);
  } catch (error) {
    if (error instanceof PdfEngineError) throw error;
    throw new PdfEngineError(
      'FILL_FAILED',
      'This PDF could not be completed. Your original file is unchanged.',
      input.id,
    );
  }
}

async function fillPdfFormChecked(
  input: PdfWorkerInput,
  options: PdfFillOptions,
  onProgress?: (
    phase: 'reading' | 'copying' | 'validating',
    completed: number,
    total: number,
  ) => void,
) {
  const computeStarted = performance.now();
  onProgress?.('reading', 0, 1);
  const document = await loadFormPdf(input);
  const pageCount = document.getPageCount();

  if (hasDigitalSignature(document)) {
    throw new PdfEngineError(
      'SIGNED_PDF',
      'This PDF already carries a digital signature. Any change, even adding a drawn signature, would break it, so the file was left as it is.',
      input.id,
    );
  }
  const xfa = readXfaKind(document);
  if (xfa === 'dynamic') {
    throw new PdfEngineError(
      'XFA_PDF',
      'This is a dynamic XFA form, which draws its own pages. It cannot be filled, signed or made final here, so the file was left as it is.',
      input.id,
    );
  }

  const values = options.values ?? {};
  // getForm() adds a form to a file that has none, so only ask when needed.
  // It also removes XFA, which a static XFA form always loses on saving, as
  // the page tells the user.
  const hasForm = !!lookupOptional(document.catalog, 'AcroForm', PDFDict);
  const form =
    hasForm &&
    (Object.keys(values).length > 0 || options.flatten || xfa === 'static')
      ? document.getForm()
      : undefined;
  let font: PDFFont | undefined;
  const getFont = () => {
    font ??= form!.getDefaultFont();
    return font;
  };

  const readFields = () => {
    try {
      return describeFormFields(document, form!);
    } catch {
      throw new PdfEngineError(
        'FILL_FAILED',
        'The form in this PDF could not be read, so its fields cannot be filled or made final here. Turn off “Make it final” to add a signature without touching the form.',
        input.id,
      );
    }
  };
  const writes =
    form && (Object.keys(values).length > 0 || options.flatten)
      ? planFieldWrites(readFields(), values, getFont, input.id)
      : [];

  let stamp:
    | {
        page: PDFPage;
        image: PDFImage;
        placement: ReturnType<typeof displayedRectToUserSpace>;
      }
    | undefined;
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
    let image: PDFImage;
    try {
      image = await document.embedPng(signature.image);
    } catch {
      throw new PdfEngineError(
        'FILL_FAILED',
        'The signature image could not be read.',
        input.id,
      );
    }
    const page = document.getPage(signature.pageIndex);
    const geometry = geometryOfPage(page);
    const rect = {
      x: signature.x,
      y: signature.y,
      width: signature.width,
      height:
        image.width > 0 ? (image.height / image.width) * signature.width : 0,
    };
    if (!rectFitsPage(geometry, rect)) {
      throw new PdfEngineError(
        'FILL_FAILED',
        `The signature must sit fully inside page ${signature.pageIndex + 1}. Move it or make it smaller, then try again.`,
        input.id,
      );
    }
    stamp = {
      page,
      image,
      placement: displayedRectToUserSpace(geometry, rect),
    };
  }

  writes.forEach((write, index) => {
    try {
      writeField(write, getFont);
    } catch (error) {
      if (error instanceof PdfEngineError) throw error;
      throw invalidValue(
        write.info,
        input.id,
        'would not take that value. Your original file is unchanged.',
      );
    }
    onProgress?.('copying', index + 1, writes.length);
  });

  if (stamp) {
    const { page, image, placement } = stamp;
    page.drawImage(image, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotate: degrees(placement.rotate),
    });
  }

  let flattened = false;
  if (options.flatten && form) {
    const current = readFields();
    const missing = current
      .map((entry) => entry.info)
      .filter(
        (info) =>
          info.required &&
          !info.readOnly &&
          !info.hidden &&
          isEmptyValue(info.value),
      );
    if (missing.length) {
      throw new PdfEngineError(
        'REQUIRED_FIELDS',
        `Fill in the required ${missing.length === 1 ? 'field' : 'fields'} before making it final: ${missing.map((info) => quoted(info.name)).join(', ')}. You can still save without making it final.`,
        input.id,
        missing.map((info) => info.id),
      );
    }
    flattened = flattenFormFields(document, form, current, getFont, input.id);
  }

  let bytes: Uint8Array;
  try {
    bytes = await document.save({
      addDefaultPage: false,
      useObjectStreams: true,
      objectsPerTick: 50,
      // Changed fields already have fresh appearances. Letting pdf-lib
      // regenerate the rest would rewrite fields nobody touched.
      updateFieldAppearances: false,
    });
  } catch {
    throw new PdfEngineError(
      'FILL_FAILED',
      'The completed PDF could not be saved. Your original file is unchanged.',
      input.id,
    );
  }
  const computeDurationMs = performance.now() - computeStarted;

  onProgress?.('validating', 1, 1);
  const validationStarted = performance.now();
  let reopenedPageCount = -1;
  try {
    const reopened = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    reopenedPageCount = reopened.getPageCount();
  } catch {
    reopenedPageCount = -1;
  }
  if (reopenedPageCount !== pageCount) {
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
    fieldsChanged: writes.length,
    signaturePlaced: stamp !== undefined,
    // Only when there was a form to make final.
    flattened,
    computeDurationMs,
    validationDurationMs,
  };
}
