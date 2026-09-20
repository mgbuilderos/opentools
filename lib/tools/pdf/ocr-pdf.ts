import {
  beginText,
  endText,
  PDFDocument,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
  StandardFonts,
  TextRenderingMode,
} from 'pdf-lib';

import type { OcrResult } from '../ocr/types';

export interface OcrPdfPageResult extends OcrResult {
  pageNumber: number;
}

export interface SearchablePdfResult {
  bytes: Uint8Array;
  pageCount: number;
  wordCount: number;
}

export function plainTextFromPages(pages: readonly OcrPdfPageResult[]) {
  return pages.map((page) => page.text).join('\n\n');
}

export function textFileName(pdfName: string) {
  return `${pdfName.replace(/\.pdf$/iu, '') || 'document'}-ocr.txt`;
}

export function searchablePdfFileName(pdfName: string) {
  return `${pdfName.replace(/\.pdf$/iu, '') || 'document'}-searchable.pdf`;
}

function encodableText(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u201C\u201D]/gu, '"')
    .replace(/[\u2013\u2014]/gu, '-')
    .replace(/[^\x20-\x7E]/gu, '')
    .trim();
}

/** Add a PDF text layer using rendering mode 3 (invisible). */
export async function addInvisibleTextLayer(
  source: Uint8Array,
  recognisedPages: readonly OcrPdfPageResult[],
): Promise<SearchablePdfResult> {
  const document = await PDFDocument.load(source, { updateMetadata: false });
  if (document.getPageCount() !== recognisedPages.length) {
    throw new Error('OCR page results do not match the source PDF page count.');
  }

  const font = await document.embedFont(StandardFonts.Helvetica);
  let wordCount = 0;

  for (const result of recognisedPages) {
    const page = document.getPage(result.pageNumber - 1);
    const fontKey = page.node.newFontDictionary(font.name, font.ref);
    const scaleX = page.getWidth() / Math.max(1, result.width);
    const scaleY = page.getHeight() / Math.max(1, result.height);

    for (const word of result.words) {
      const text = encodableText(word.text);
      if (!text) continue;
      const targetWidth = Math.max(0.1, (word.box.x1 - word.box.x0) * scaleX);
      const fontSize = Math.max(1, (word.box.y1 - word.box.y0) * scaleY);
      const naturalWidth = Math.max(
        0.1,
        font.widthOfTextAtSize(text, fontSize),
      );
      const horizontalScale = targetWidth / naturalWidth;
      const x = word.box.x0 * scaleX;
      const y = page.getHeight() - word.box.y1 * scaleY;

      page.pushOperators(
        beginText(),
        setTextRenderingMode(TextRenderingMode.Invisible),
        setFontAndSize(fontKey, fontSize),
        setTextMatrix(horizontalScale, 0, 0, 1, x, y),
        showText(font.encodeText(text)),
        endText(),
      );
      wordCount += 1;
    }
  }

  return {
    bytes: await document.save({ useObjectStreams: false }),
    pageCount: document.getPageCount(),
    wordCount,
  };
}
