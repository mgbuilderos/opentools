/**
 * Turn a PDF's text layer into document blocks for the `.docx` writer.
 *
 * What this does and does not do is the whole design. A PDF stores glyphs at
 * coordinates, not paragraphs, so reading order, line grouping and paragraph
 * boundaries are all reconstructed by geometry here. Layout, columns, tables
 * as tables, images and fonts are **not** reproduced, and the tool page says
 * so plainly rather than implying a layout-faithful conversion.
 *
 * The layout reasoning is deliberately separated from the PDF library so it
 * can be tested against exact coordinates instead of fixture PDFs.
 */

import type { DocxBlock, DocxRun } from '../docx/document';

export interface PdfTextItem {
  text: string;
  /** Left edge, PDF units. */
  x: number;
  /** Baseline, PDF units — larger is further up the page. */
  y: number;
  width: number;
  fontSize: number;
  bold: boolean;
}

export interface PdfPageText {
  items: PdfTextItem[];
}

interface Line {
  items: PdfTextItem[];
  y: number;
  fontSize: number;
  bold: boolean;
}

/** A line is "the same line" when baselines sit within this share of the font size. */
const LINE_TOLERANCE = 0.55;
/** A gap wider than this share of the font size means a space was intended. */
const SPACE_GAP = 0.22;
/** Vertical gap beyond this multiple of normal leading starts a new paragraph. */
const PARAGRAPH_GAP = 1.55;
/** Text this much larger than the body is treated as a heading. */
const HEADING_RATIO = 1.18;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

/** Group a page's items into visual lines, top to bottom, left to right. */
export function groupIntoLines(items: readonly PdfTextItem[]): Line[] {
  const usable = items.filter((item) => item.text.length > 0);
  if (usable.length === 0) return [];

  // Descending y: PDF coordinates grow upward, reading order runs downward.
  const sorted = [...usable].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];

  for (const item of sorted) {
    const tolerance = Math.max(1, item.fontSize * LINE_TOLERANCE);
    const current = lines[lines.length - 1];
    if (current && Math.abs(current.y - item.y) <= tolerance) {
      current.items.push(item);
      current.fontSize = Math.max(current.fontSize, item.fontSize);
      current.bold = current.bold && item.bold;
      continue;
    }
    lines.push({
      items: [item],
      y: item.y,
      fontSize: item.fontSize,
      bold: item.bold,
    });
  }

  for (const line of lines) line.items.sort((a, b) => a.x - b.x);
  return lines;
}

/** Join a line's items, inserting a space only where the gap implies one. */
export function lineText(line: Line): string {
  let out = '';
  let previous: PdfTextItem | null = null;
  for (const item of line.items) {
    if (previous) {
      const gap = item.x - (previous.x + previous.width);
      const threshold = Math.max(0.5, item.fontSize * SPACE_GAP);
      const needsSpace =
        gap > threshold && !out.endsWith(' ') && !item.text.startsWith(' ');
      if (needsSpace) out += ' ';
    }
    out += item.text;
    previous = item;
  }
  return out.replace(/\s+/gu, ' ').trim();
}

/**
 * Convert pages to blocks. Pages are separated by a real page break so the
 * Word document keeps the original pagination, which is the one layout fact
 * a text conversion can honestly preserve.
 */
export function pagesToBlocks(pages: readonly PdfPageText[]): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const allSizes = pages.flatMap((page) =>
    page.items
      .filter((item) => item.text.trim().length > 0)
      .map((i) => i.fontSize),
  );
  const bodySize = median(allSizes) || 12;

  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) blocks.push({ kind: 'pageBreak' });

    const lines = groupIntoLines(page.items);
    if (lines.length === 0) return;

    const leadings: number[] = [];
    for (let index = 1; index < lines.length; index += 1) {
      leadings.push(Math.abs(lines[index - 1]!.y - lines[index]!.y));
    }
    const normalLeading = median(leadings) || bodySize * 1.2;

    let pending: { runs: DocxRun[]; heading: boolean } | null = null;
    const flush = () => {
      if (!pending) return;
      blocks.push({ kind: 'paragraph', runs: pending.runs });
      pending = null;
    };

    lines.forEach((line, index) => {
      const text = lineText(line);
      if (text.length === 0) return;

      const isHeading = line.fontSize >= bodySize * HEADING_RATIO;
      const previous = index > 0 ? lines[index - 1] : null;
      const gap = previous ? Math.abs(previous.y - line.y) : 0;
      const startsParagraph =
        pending === null ||
        isHeading ||
        (pending.heading && !isHeading) ||
        gap > normalLeading * PARAGRAPH_GAP;

      const run: DocxRun = {
        text,
        ...(isHeading || line.bold ? { bold: true } : {}),
        ...(isHeading ? { sizeHalfPoints: Math.round(line.fontSize * 2) } : {}),
      };

      if (startsParagraph) {
        flush();
        pending = { runs: [run], heading: isHeading };
        return;
      }
      // Continuation of the same paragraph: keep it one run stream, with the
      // space the line break stood for.
      const runs = pending!.runs;
      const last = runs[runs.length - 1]!;
      if (
        !last.bold === !run.bold &&
        last.sizeHalfPoints === run.sizeHalfPoints
      ) {
        last.text = `${last.text} ${run.text}`;
      } else {
        runs.push({ ...run, text: ` ${run.text}` });
      }
    });

    flush();
  });

  return blocks;
}

/** Total visible characters — the signal that a PDF has a real text layer. */
export function countCharacters(pages: readonly PdfPageText[]): number {
  let total = 0;
  for (const page of pages) {
    for (const item of page.items) total += item.text.trim().length;
  }
  return total;
}

interface PdfJsTextItem {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
  fontName?: string;
}

/**
 * Point the PDF library at its own worker file.
 *
 * In a bundled browser build it refuses to start without this and throws
 * `No "GlobalWorkerOptions.workerSrc" specified`. Under Node the specifier has
 * no `?url` form and the library resolves its worker itself, so the failure to
 * import is the expected path there rather than an error worth reporting.
 */
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

/** Read every page's text layer using the already-bundled PDF library. */
export async function readPdfText(bytes: Uint8Array): Promise<PdfPageText[]> {
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
      const items: PdfTextItem[] = [];
      for (const raw of content.items as PdfJsTextItem[]) {
        const text = raw.str ?? '';
        if (text.length === 0) continue;
        const transform = raw.transform ?? [1, 0, 0, 1, 0, 0];
        const fontSize = Math.abs(transform[3] ?? 0) || raw.height || 12;
        items.push({
          text,
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
          width: raw.width ?? 0,
          fontSize,
          bold: /bold|black|heavy|semib/iu.test(raw.fontName ?? ''),
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
