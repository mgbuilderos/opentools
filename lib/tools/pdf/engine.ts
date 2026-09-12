import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
  | 'IMAGE_TO_PDF_FAILED';

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
