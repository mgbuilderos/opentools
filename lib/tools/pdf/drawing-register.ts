/**
 * PDF Drawing Register Engine (/pdf/drawing-register).
 *
 * Extracts engineering / architectural title block data across multi-page drawing sets
 * by applying a bounding box filter over positioned text elements read by `readPdfGeometry`.
 *
 * Capabilities:
 * - Detects vector vs scanned pages (refuses purely scanned pages by name and suggests /pdf/ocr).
 * - Filters text items within a normalized title block bounding box.
 * - Extracts Drawing Number, Sheet Title, Revision, Date, and Author/Drawn By using heuristic regex.
 * - Generates CSV and tabular export.
 * - Supports bursting/splitting sheets into individual PDF documents named by drawing number.
 */

import { PDFDocument } from 'pdf-lib';
import { readPdfGeometry, type PdfPageGeometry } from './pdf-geometry';

export interface TitleBlockBoundingBox {
  /** Normalized coordinates [0..1] relative to page width and height (origin: bottom-left) */
  xMinRatio: number;
  yMinRatio: number;
  xMaxRatio: number;
  yMaxRatio: number;
}

/** Standard default bounding box: bottom-right corner where 95%+ of title blocks reside */
export const DEFAULT_TITLE_BLOCK_BOX: TitleBlockBoundingBox = {
  xMinRatio: 0.65,
  yMinRatio: 0.0,
  xMaxRatio: 1.0,
  yMaxRatio: 0.25,
};

export interface DrawingEntry {
  pageNumber: number;
  drawingNumber: string;
  title: string;
  revision: string;
  date: string;
  author: string;
  rawText: string;
  isScanned: boolean;
}

export interface DrawingRegisterResult {
  entries: DrawingEntry[];
  totalPages: number;
  scannedPagesCount: number;
  boundingBox: TitleBlockBoundingBox;
}

/**
 * Common architectural & engineering drawing number patterns:
 * e.g., A-101, AR-001, C-201, E-301, S-102, M-501, DWG-9923, 2026-A101, etc.
 */
const DRAWING_NUMBER_PATTERNS = [
  /(?:DWG|DRAWING|SHEET|NO|NUMBER)[.:#\s-]*([A-Z0-9]{1,4}[-/.][A-Z0-9]{1,5}(?:[-/.][A-Z0-9]+)?)/i,
  /\b([A-Z]{1,3}[-/.][0-9]{3,4}[A-Z]?)\b/i,
  /\b([A-Z0-9]{2,8}[-/.][0-9]{2,4})\b/i,
];

/** Revision patterns: Rev 0, Rev A, Rev. 02, etc. */
const REVISION_PATTERNS = [
  /(?:REV|REVISION|ISSUE)[.:#\s-]*([A-Z0-9]{1,4})\b/i,
  /\bREV\s*([A-Z0-9]{1,3})\b/i,
];

/** Date patterns: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, 23-SEP-2026, etc. */
const DATE_PATTERNS = [
  /(?:DATE)[.:#\s-]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4})/i,
  /(?:DATE)[.:#\s-]*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2})/i,
  /\b([0-9]{1,2}[-/.][A-Za-z]{3}[-/.][0-9]{2,4})\b/i,
  /\b([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4})\b/,
];

/** Extract title block fields from raw extracted lines */
export function parseTitleBlockText(lines: string[]): {
  drawingNumber: string;
  title: string;
  revision: string;
  date: string;
  author: string;
} {
  let drawingNumber = '';
  let revision = '';
  let date = '';
  let author = '';
  const remainingLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check drawing number
    if (!drawingNumber) {
      for (const pattern of DRAWING_NUMBER_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          drawingNumber = match[1].trim();
          break;
        }
      }
    }

    // Check revision
    if (!revision) {
      for (const pattern of REVISION_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          revision = match[1].trim();
          break;
        }
      }
    }

    // Check date
    if (!date) {
      for (const pattern of DATE_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          date = match[1].trim();
          break;
        }
      }
    }

    // Check author
    if (!author) {
      const authorMatch = trimmed.match(
        /(?:DRAWN\s*BY|DRAWN|AUTHOR|DESIGNER|PREPARED\s*BY)[.:#\s-]+([A-Za-z. ]{2,30})/i,
      );
      if (authorMatch && authorMatch[1]) {
        author = authorMatch[1].trim();
      }
    }

    // Lines that don't match meta tags can be candidate title lines
    if (
      !/^(?:REV|DATE|DWG|SCALE|CHECKED|APPROVED|PROJECT|CLIENT|SHEET)/i.test(
        trimmed,
      ) &&
      trimmed.length > 3
    ) {
      remainingLines.push(trimmed);
    }
  }

  // Best candidate title is often the longest non-metadata line or first non-empty line
  let title = '';
  if (remainingLines.length > 0) {
    // Look for lines explicitly mentioning TITLE:
    const titleExplicit = lines.find((l) => /TITLE[.:#\s-]+(.+)/i.test(l));
    if (titleExplicit) {
      const match = titleExplicit.match(/TITLE[.:#\s-]+(.+)/i);
      if (match && match[1]) title = match[1].trim();
    } else {
      title = remainingLines[0]!;
    }
  }

  return {
    drawingNumber,
    title,
    revision: revision || '-',
    date: date || '-',
    author: author || '-',
  };
}

/**
 * Filter text items by bounding box on a page.
 */
export function filterItemsInBox(
  page: PdfPageGeometry,
  box: TitleBlockBoundingBox,
): string[] {
  const [, , width, height] = page.viewBox;
  const xMin = box.xMinRatio * width;
  const xMax = box.xMaxRatio * width;
  const yMin = box.yMinRatio * height;
  const yMax = box.yMaxRatio * height;

  const inBox = page.items.filter((item) => {
    return item.x >= xMin && item.x <= xMax && item.y >= yMin && item.y <= yMax;
  });

  // Sort top-to-bottom (PDF y descending), then left-to-right (x ascending)
  inBox.sort((a, b) => b.y - a.y || a.x - b.x);

  return inBox.map((i) => i.text.trim()).filter(Boolean);
}

/**
 * Scan drawing set and build register from title blocks.
 */
export async function buildDrawingRegister(
  pdfBytes: Uint8Array,
  box: TitleBlockBoundingBox = DEFAULT_TITLE_BLOCK_BOX,
): Promise<DrawingRegisterResult> {
  const pagesGeometry = await readPdfGeometry(pdfBytes);
  const entries: DrawingEntry[] = [];
  let scannedCount = 0;

  for (let i = 0; i < pagesGeometry.length; i++) {
    const page = pagesGeometry[i]!;
    const pageNumber = i + 1;
    const isScanned = page.items.length === 0;

    if (isScanned) {
      scannedCount++;
      entries.push({
        pageNumber,
        drawingNumber: `PAGE-${pageNumber}`,
        title: '[Scanned page - No text layer]',
        revision: '-',
        date: '-',
        author: '-',
        rawText: '',
        isScanned: true,
      });
      continue;
    }

    const lines = filterItemsInBox(page, box);
    const parsed = parseTitleBlockText(lines);

    entries.push({
      pageNumber,
      drawingNumber: parsed.drawingNumber || `SHEET-${pageNumber}`,
      title: parsed.title || `Drawing ${pageNumber}`,
      revision: parsed.revision,
      date: parsed.date,
      author: parsed.author,
      rawText: lines.join(' | '),
      isScanned: false,
    });
  }

  return {
    entries,
    totalPages: pagesGeometry.length,
    scannedPagesCount: scannedCount,
    boundingBox: box,
  };
}

/**
 * Export register to clean CSV format.
 */
export function exportRegisterCsv(result: DrawingRegisterResult): string {
  const headers = [
    'Sheet #',
    'Drawing Number',
    'Title',
    'Revision',
    'Date',
    'Drawn By',
  ];
  const rows = result.entries.map((e) => [
    e.pageNumber.toString(),
    `"${e.drawingNumber.replace(/"/g, '""')}"`,
    `"${e.title.replace(/"/g, '""')}"`,
    `"${e.revision.replace(/"/g, '""')}"`,
    `"${e.date.replace(/"/g, '""')}"`,
    `"${e.author.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Split PDF by sheets named after their drawing numbers.
 */
export async function burstPdfByDrawingRegister(
  pdfBytes: Uint8Array,
  result: DrawingRegisterResult,
): Promise<{ filename: string; bytes: Uint8Array }[]> {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const files: { filename: string; bytes: Uint8Array }[] = [];

  for (const entry of result.entries) {
    const pageIndex = entry.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= srcDoc.getPageCount()) continue;

    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
    newDoc.addPage(copiedPage);
    const bytes = await newDoc.save();

    // Clean drawing number for filename
    const cleanDwg = entry.drawingNumber.replace(/[/\\?%*:|"<>]/g, '_').trim();
    const filename = `${cleanDwg}.pdf`;
    files.push({ filename, bytes });
  }

  return files;
}
