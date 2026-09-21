import {
  groupIntoLines,
  type PdfPageText,
  type PdfTextItem,
} from '../../pdf/pdf-text';
import { NoTextLayerError, type DiffWord } from './types';

export async function linearizePdfDocument(
  bytes: Uint8Array,
  side: 'A' | 'B',
  documentName = 'document.pdf',
): Promise<{ words: DiffWord[]; pageCount: number }> {
  let pages: PdfPageText[];
  try {
    pages = await readPdfTextWithFontDetails(bytes);
  } catch (err) {
    if (err instanceof NoTextLayerError) throw err;
    throw new Error(
      `Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const allWords: DiffWord[] = [];
  let totalWordCount = 0;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageNum = pageIdx + 1;
    const page = pages[pageIdx];
    const lines = groupIntoLines(page.items);

    let wordIdxOnPage = 0;

    for (const line of lines) {
      for (let itemIdx = 0; itemIdx < line.items.length; itemIdx++) {
        const item = line.items[itemIdx];
        const rawWords = splitIntoWords(item.text);

        let currentX = item.x;
        const totalChars = item.text.length || 1;
        const charWidth = item.width / totalChars;

        for (const w of rawWords) {
          const wWidth = Math.max(charWidth * w.text.length, 4);
          const wHeight = item.fontSize * 1.2;

          allWords.push({
            id: `doc${side}_p${pageNum}_w${wordIdxOnPage++}`,
            text: w.text,
            normalizedText: normalizeWord(w.text),
            pageNumber: pageNum,
            x: currentX,
            y: item.y,
            width: wWidth,
            height: wHeight,
            fontSize: item.fontSize,
            bold: item.bold,
            itemIndex: itemIdx,
          });

          totalWordCount++;
          currentX += wWidth + charWidth; // Advance x including inter-word space
        }
      }
    }
  }

  if (totalWordCount === 0) {
    throw new NoTextLayerError(side, documentName);
  }

  return {
    words: allWords,
    pageCount: pages.length,
  };
}

interface RawWord {
  text: string;
}

function splitIntoWords(text: string): RawWord[] {
  const words: RawWord[] = [];
  const parts = text.split(/\s+/u);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      words.push({ text: trimmed });
    }
  }
  return words;
}

export function normalizeWord(word: string): string {
  // Strip outer punctuation and lowercase for robust matching
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

async function ensurePdfWorker(pdfjs: {
  GlobalWorkerOptions: { workerSrc: string };
}): Promise<void> {
  if (pdfjs.GlobalWorkerOptions.workerSrc) return;
  if (typeof Worker === 'undefined') return;
  try {
    const workerModule =
      await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
    if (workerModule.default) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
    }
  } catch {
    /* Node, or a bundler without `?url`: the library finds its own worker. */
  }
}

async function readPdfTextWithFontDetails(
  bytes: Uint8Array,
): Promise<PdfPageText[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  await ensurePdfWorker(
    pdfjs as unknown as Parameters<typeof ensurePdfWorker>[0],
  );
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const task = pdfjs.getDocument({
    data: copy,
    useSystemFonts: false,
  });
  try {
    const document = await task.promise;
    const pages: PdfPageText[] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      try {
        await page.getOperatorList();
      } catch {
        // Fallback gracefully if operator list fails
      }
      const items: PdfTextItem[] = [];
      for (const raw of content.items as Array<{
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
        fontName?: string;
      }>) {
        const text = raw.str ?? '';
        if (text.length === 0) continue;
        const transform = raw.transform ?? [1, 0, 0, 1, 0, 0];
        const fontSize = Math.abs(transform[3] ?? 0) || raw.height || 12;
        let isBold = /bold|black|heavy|semib/iu.test(raw.fontName ?? '');
        if (!isBold && raw.fontName && page.commonObjs?.has?.(raw.fontName)) {
          const fontObj = page.commonObjs.get(raw.fontName) as
            | { bold?: boolean; name?: string }
            | undefined;
          if (
            fontObj?.bold ||
            /bold|black|heavy|semib/iu.test(fontObj?.name ?? '')
          ) {
            isBold = true;
          }
        }
        items.push({
          text,
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
          width: raw.width ?? 0,
          fontSize,
          bold: isBold,
        });
      }
      pages.push({ items });
      page.cleanup();
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
