/**
 * PDF → Word (`.docx`), text only.
 *
 * The contract, stated here because the page states the same thing: this
 * recovers the text — reading order, paragraphs, page breaks, headings — and
 * does **not** reproduce layout, columns, tables as tables, images or fonts.
 * A PDF with no text layer is refused by name rather than converted into an
 * empty document.
 */

import { buildDocx } from '../docx/document';
import { countCharacters, pagesToBlocks, readPdfText } from './pdf-text';

export type PdfToWordErrorCode = 'NO_TEXT_LAYER' | 'UNREADABLE_PDF';

export class PdfToWordError extends Error {
  readonly code: PdfToWordErrorCode;
  constructor(code: PdfToWordErrorCode, message: string) {
    super(message);
    this.name = 'PdfToWordError';
    this.code = code;
  }
}

export interface PdfToWordResult {
  bytes: Uint8Array;
  pageCount: number;
  characterCount: number;
  paragraphCount: number;
  pagesWithoutText: number;
}

export const NO_TEXT_LAYER_MESSAGE =
  'This PDF has no text in it — every page is an image, which is what a scan or a phone photo produces. ' +
  'There is nothing to copy into a Word file. Converting it would need character recognition, which this tool does not do.';

export async function convertPdfToWord(
  bytes: Uint8Array,
): Promise<PdfToWordResult> {
  let pages;
  try {
    pages = await readPdfText(bytes);
  } catch (error) {
    throw new PdfToWordError(
      'UNREADABLE_PDF',
      `This file could not be opened as a PDF${
        error instanceof Error && error.message ? `: ${error.message}` : '.'
      }`,
    );
  }

  const characterCount = countCharacters(pages);
  if (characterCount === 0) {
    throw new PdfToWordError('NO_TEXT_LAYER', NO_TEXT_LAYER_MESSAGE);
  }

  const blocks = pagesToBlocks(pages);
  const docx = await buildDocx(blocks);

  return {
    bytes: docx,
    pageCount: pages.length,
    characterCount,
    paragraphCount: blocks.filter((block) => block.kind === 'paragraph').length,
    // Reported so a partly-scanned document is not silently half-converted.
    pagesWithoutText: pages.filter(
      (page) =>
        page.items.reduce((sum, item) => sum + item.text.trim().length, 0) ===
        0,
    ).length,
  };
}
