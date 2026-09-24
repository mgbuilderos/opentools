/**
 * In-browser Excel (XLSX) to Vector PDF Conversion.
 *
 * Converts spreadsheet workbooks into crisp, print-ready vector PDF documents
 * directly inside the user's browser tab.
 *
 * Guarantees:
 * - 100% Client-side execution in browser memory (connect-src 'none' compliant).
 * - Zero server uploads: payroll, customer data, and financial models never leave the tab.
 * - Native vector text and vector gridlines via pdf-lib: no canvas rasterization,
 *   crisp at any zoom level, fully searchable and selectable text.
 * - Intelligent auto-orientation: automatically chooses Landscape for wide multi-column
 *   sheets so tables fit naturally without ugly column truncation.
 * - Header row repetition across multi-page tables so multi-page documents remain readable.
 * - Full multi-sheet support with sheet selection and per-sheet page numbering.
 */

import { PageSizes, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

import { cellToText, readXlsx, type Sheet, type Workbook } from './xlsx-reader';

export interface ExcelToPdfOptions {
  /** 'all' to export every sheet into the document, or specific sheet index / name */
  sheetSelection?: string | number;
  /** 'a4' | 'letter', default 'a4' */
  pageSize?: 'a4' | 'letter';
  /** 'auto' (landscape if wide), 'portrait', 'landscape', default 'auto' */
  orientation?: 'auto' | 'portrait' | 'landscape';
  /** Margin in points: default 36 (0.5 in) */
  margin?: number;
  /** Whether to draw table gridlines, default true */
  gridlines?: boolean;
  /** Whether to repeat the table header row on subsequent pages, default true */
  repeatHeader?: boolean;
  /** Whether to include page numbers in footer, default true */
  pageNumbers?: boolean;
  /** Document title for header (defaults to file name or sheet name) */
  documentTitle?: string;
  /** Max column width in points, default 180 */
  maxColumnWidth?: number;
  /** Min column width in points, default 36 */
  minColumnWidth?: number;
}

export interface SheetProcessedSummary {
  name: string;
  rows: number;
  columns: number;
  pages: number;
}

export interface ExcelToPdfResult {
  pdfBytes: Uint8Array;
  pageCount: number;
  sheetCount: number;
  rowCount: number;
  columnCount: number;
  durationMs: number;
  sheetsProcessed: SheetProcessedSummary[];
}

/** Pre-computed cache of ASCII & WinAnsi characters encodable by StandardFonts.Helvetica. */
let supportedCharCodes: Set<number> | null = null;

function getSupportedCharCodes(font: {
  encodeText: (text: string) => void;
}): Set<number> {
  if (supportedCharCodes) return supportedCharCodes;
  const set = new Set<number>();
  for (let code = 0; code < 65536; code += 1) {
    try {
      font.encodeText(String.fromCharCode(code));
      set.add(code);
    } catch {
      // not in WinAnsi
    }
  }
  supportedCharCodes = set;
  return set;
}

/**
 * Sanitizes arbitrary text to characters supported by Helvetica (WinAnsi).
 * Unicode characters outside WinAnsi (e.g. non-Latin scripts, emoji) are safely replaced
 * rather than throwing a runtime encoding exception.
 */
export function sanitizePdfText(text: string, supported: Set<number>): string {
  if (!text) return '';
  // Quick common substitutions for common symbols
  const preNormalized = text
    .replace(/\r\n/gu, ' ')
    .replace(/[\r\n\t]/gu, ' ')
    .replace(/[✓✔]/gu, '[x]')
    .replace(/[✗✘]/gu, '[ ]')
    .replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'")
    .replace(/[—–]/gu, '-');

  let result = '';
  for (let i = 0; i < preNormalized.length; i += 1) {
    const code = preNormalized.charCodeAt(i);
    if (supported.has(code)) {
      result += preNormalized[i];
    } else {
      result += '?';
    }
  }
  return result;
}

/**
 * Fits a text string into available width, truncating with ellipsis if necessary.
 */
function fitText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
): string {
  if (maxWidth <= 0) return '';
  const fullWidth = font.widthOfTextAtSize(text, fontSize);
  if (fullWidth <= maxWidth) return text;

  const ellipsis = '…';
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, fontSize);
  if (ellipsisWidth >= maxWidth) return '';

  const targetWidth = maxWidth - ellipsisWidth;
  let low = 0;
  let high = text.length;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const sub = text.slice(0, mid);
    const w = font.widthOfTextAtSize(sub, fontSize);
    if (w <= targetWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best > 0 ? text.slice(0, best) + ellipsis : '';
}

/**
 * Converts an Excel Workbook (or raw .xlsx bytes) to a vector PDF document.
 */
export async function convertExcelToPdf(
  input: Uint8Array | Workbook,
  options: ExcelToPdfOptions = {},
): Promise<ExcelToPdfResult> {
  const startTime = performance.now();

  const workbook: Workbook =
    input instanceof Uint8Array ? await readXlsx(input) : input;

  if (!workbook.sheets || workbook.sheets.length === 0) {
    throw new Error('The spreadsheet contains no readable sheets.');
  }

  // Filter sheets according to options
  let sheetsToProcess: Sheet[] = workbook.sheets;
  if (
    options.sheetSelection !== undefined &&
    options.sheetSelection !== 'all'
  ) {
    if (typeof options.sheetSelection === 'number') {
      const target = workbook.sheets[options.sheetSelection];
      if (!target) {
        throw new Error(
          `Sheet index ${options.sheetSelection} was not found (total sheets: ${workbook.sheets.length}).`,
        );
      }
      sheetsToProcess = [target];
    } else if (typeof options.sheetSelection === 'string') {
      const target = workbook.sheets.find(
        (s) =>
          s.name.toLowerCase() ===
          (options.sheetSelection as string).toLowerCase(),
      );
      if (!target) {
        throw new Error(
          `Sheet named "${options.sheetSelection}" was not found.`,
        );
      }
      sheetsToProcess = [target];
    }
  }

  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const charCodes = getSupportedCharCodes(helvetica);

  const baseSize =
    options.pageSize === 'letter' ? PageSizes.Letter : PageSizes.A4;
  const margin = options.margin ?? 36;
  const minColWidth = options.minColumnWidth ?? 36;
  const maxColWidth = options.maxColumnWidth ?? 190;
  const fontSize = 8;
  const headerFontSize = 8.5;
  const titleFontSize = 11;
  const cellHorizontalPadding = 5;
  const rowHeight = 18;
  const headerRowHeight = 22;
  const topBannerHeight = 28;
  const bottomFooterHeight = 22;
  const drawGridlines = options.gridlines ?? true;
  const repeatHeaders = options.repeatHeader ?? true;

  // Colors
  const headerBgColor = rgb(0.92, 0.94, 0.97);
  const alternateRowBgColor = rgb(0.985, 0.985, 0.99);
  const gridlineColor = rgb(0.85, 0.87, 0.9);
  const textColor = rgb(0.12, 0.15, 0.2);
  const headerTextColor = rgb(0.08, 0.12, 0.18);
  const mutedTextColor = rgb(0.5, 0.54, 0.6);
  const dividerLineColor = rgb(0.8, 0.83, 0.87);

  const sheetsSummary: SheetProcessedSummary[] = [];
  let totalRows = 0;
  let maxCols = 0;

  for (const sheet of sheetsToProcess) {
    const rawRows = sheet.rows;
    const colCount = sheet.columnCount;
    totalRows += rawRows.length;
    if (colCount > maxCols) maxCols = colCount;

    // Convert and sanitize cells to text
    const stringRows: string[][] = rawRows.map((row) =>
      row.map((cell) => sanitizePdfText(cellToText(cell), charCodes)),
    );

    // Empty sheet case
    if (colCount === 0 || rawRows.length === 0) {
      const page = doc.addPage([baseSize[0], baseSize[1]]);
      page.drawText(sanitizePdfText(sheet.name, charCodes), {
        x: margin,
        y: baseSize[1] - margin - 12,
        size: titleFontSize,
        font: helveticaBold,
        color: headerTextColor,
      });
      page.drawText('(This sheet contains no rows)', {
        x: margin,
        y: baseSize[1] - margin - 36,
        size: fontSize,
        font: helvetica,
        color: mutedTextColor,
      });
      sheetsSummary.push({ name: sheet.name, rows: 0, columns: 0, pages: 1 });
      continue;
    }

    // Determine column widths
    const columnNaturalWidths: number[] = Array.from(
      { length: colCount },
      () => minColWidth,
    );

    for (let c = 0; c < colCount; c += 1) {
      let maxContentWidth = 0;
      for (let r = 0; r < stringRows.length; r += 1) {
        const text = stringRows[r][c] || '';
        const isHeader = r === 0;
        const font = isHeader ? helveticaBold : helvetica;
        const fSize = isHeader ? headerFontSize : fontSize;
        const width = font.widthOfTextAtSize(text, fSize);
        if (width > maxContentWidth) maxContentWidth = width;
      }
      columnNaturalWidths[c] = Math.max(
        minColWidth,
        Math.min(maxColWidth, maxContentWidth + 2 * cellHorizontalPadding),
      );
    }

    const naturalTotalWidth = columnNaturalWidths.reduce((a, b) => a + b, 0);

    // Orientation determination
    const portraitW = Math.min(baseSize[0], baseSize[1]);
    const portraitH = Math.max(baseSize[0], baseSize[1]);
    const portraitPrintableW = portraitW - 2 * margin;

    let isLandscape = false;
    if (options.orientation === 'landscape') {
      isLandscape = true;
    } else if (options.orientation === 'portrait') {
      isLandscape = false;
    } else {
      // 'auto' mode: switch to landscape if column count is high or width exceeds portrait
      isLandscape = colCount > 6 || naturalTotalWidth > portraitPrintableW;
    }

    const pageWidth = isLandscape ? portraitH : portraitW;
    const pageHeight = isLandscape ? portraitW : portraitH;
    const printableWidth = pageWidth - 2 * margin;

    // Scale columns to fit printable width
    const columnWidths = [...columnNaturalWidths];
    if (naturalTotalWidth < printableWidth) {
      // Proportional expansion so table fills page nicely
      const scale = printableWidth / naturalTotalWidth;
      for (let c = 0; c < colCount; c += 1) {
        columnWidths[c] = columnWidths[c] * scale;
      }
    } else {
      // Proportional reduction to prevent overflow
      const scale = printableWidth / naturalTotalWidth;
      for (let c = 0; c < colCount; c += 1) {
        columnWidths[c] = Math.max(minColWidth, columnWidths[c] * scale);
      }
      // Re-normalize if clamping changed total
      const clampedTotal = columnWidths.reduce((a, b) => a + b, 0);
      if (clampedTotal > printableWidth) {
        const adjustScale = printableWidth / clampedTotal;
        for (let c = 0; c < colCount; c += 1) {
          columnWidths[c] = columnWidths[c] * adjustScale;
        }
      }
    }

    // Cumulative column X positions
    const columnXOffsets: number[] = [margin];
    for (let c = 0; c < colCount; c += 1) {
      columnXOffsets.push(columnXOffsets[c] + columnWidths[c]);
    }

    // Render rows and pages
    let sheetPageCount = 0;
    let pageIndexInSheet = 0;
    let currentPage = doc.addPage([pageWidth, pageHeight]);
    sheetPageCount += 1;
    pageIndexInSheet += 1;

    let currentY = pageHeight - margin;

    const drawSheetBanner = (isContinued: boolean) => {
      // Sheet title
      const sheetTitle = sanitizePdfText(sheet.name, charCodes);
      const suffix = isContinued ? ' (continued)' : '';
      currentPage.drawText(sheetTitle + suffix, {
        x: margin,
        y: currentY - 14,
        size: titleFontSize,
        font: helveticaBold,
        color: headerTextColor,
      });

      // Optional document title / subtitle on top right
      if (options.documentTitle) {
        const docTitle = sanitizePdfText(options.documentTitle, charCodes);
        const docTitleWidth = helvetica.widthOfTextAtSize(docTitle, 8);
        currentPage.drawText(docTitle, {
          x: pageWidth - margin - docTitleWidth,
          y: currentY - 14,
          size: 8,
          font: helvetica,
          color: mutedTextColor,
        });
      }

      currentY -= topBannerHeight;

      // Divider line
      currentPage.drawLine({
        start: { x: margin, y: currentY + 6 },
        end: { x: pageWidth - margin, y: currentY + 6 },
        thickness: 0.75,
        color: dividerLineColor,
      });
    };

    const drawHeaderRow = () => {
      const headerY = currentY - headerRowHeight;

      // Draw header row background
      currentPage.drawRectangle({
        x: margin,
        y: headerY,
        width: printableWidth,
        height: headerRowHeight,
        color: headerBgColor,
      });

      // Draw header cells
      const headerData = stringRows[0] || [];
      for (let c = 0; c < colCount; c += 1) {
        const text = headerData[c] || `Col ${c + 1}`;
        const colW = columnWidths[c];
        const cellX = columnXOffsets[c];

        if (drawGridlines) {
          currentPage.drawRectangle({
            x: cellX,
            y: headerY,
            width: colW,
            height: headerRowHeight,
            borderColor: gridlineColor,
            borderWidth: 0.5,
          });
        }

        const maxTextW = colW - 2 * cellHorizontalPadding;
        const fitted = fitText(text, maxTextW, helveticaBold, headerFontSize);
        if (fitted) {
          currentPage.drawText(fitted, {
            x: cellX + cellHorizontalPadding,
            y: headerY + (headerRowHeight - headerFontSize) / 2 + 1,
            size: headerFontSize,
            font: helveticaBold,
            color: headerTextColor,
          });
        }
      }

      currentY -= headerRowHeight;
    };

    // Draw initial sheet banner and header row
    drawSheetBanner(false);
    drawHeaderRow();

    // Data rows (starting from row index 1)
    for (let r = 1; r < stringRows.length; r += 1) {
      // Check if row fits on current page
      if (currentY - rowHeight < margin + bottomFooterHeight) {
        // Advance to next page
        currentPage = doc.addPage([pageWidth, pageHeight]);
        sheetPageCount += 1;
        pageIndexInSheet += 1;
        currentY = pageHeight - margin;

        drawSheetBanner(true);
        if (repeatHeaders) {
          drawHeaderRow();
        }
      }

      const rowY = currentY - rowHeight;
      const isAlternate = r % 2 === 1;

      // Draw row background
      if (isAlternate) {
        currentPage.drawRectangle({
          x: margin,
          y: rowY,
          width: printableWidth,
          height: rowHeight,
          color: alternateRowBgColor,
        });
      }

      const rowData = stringRows[r];
      const rawRowCells = rawRows[r];

      for (let c = 0; c < colCount; c += 1) {
        const text = rowData[c] || '';
        const colW = columnWidths[c];
        const cellX = columnXOffsets[c];
        const cellKind = rawRowCells[c]?.kind;
        const isNumeric = cellKind === 'number';

        if (drawGridlines) {
          currentPage.drawRectangle({
            x: cellX,
            y: rowY,
            width: colW,
            height: rowHeight,
            borderColor: gridlineColor,
            borderWidth: 0.5,
          });
        }

        const maxTextW = colW - 2 * cellHorizontalPadding;
        const fitted = fitText(text, maxTextW, helvetica, fontSize);
        if (fitted) {
          let textX = cellX + cellHorizontalPadding;
          if (isNumeric) {
            // Right-align numbers
            const measuredW = helvetica.widthOfTextAtSize(fitted, fontSize);
            textX = cellX + colW - cellHorizontalPadding - measuredW;
          }

          currentPage.drawText(fitted, {
            x: textX,
            y: rowY + (rowHeight - fontSize) / 2 + 1,
            size: fontSize,
            font: helvetica,
            color: textColor,
          });
        }
      }

      currentY -= rowHeight;
    }

    sheetsSummary.push({
      name: sheet.name,
      rows: rawRows.length,
      columns: colCount,
      pages: sheetPageCount,
    });
  }

  // Footer pass across all pages: page numbering and assurance watermark
  const totalPages = doc.getPageCount();
  const showPageNumbers = options.pageNumbers ?? true;

  for (let p = 0; p < totalPages; p += 1) {
    const page = doc.getPage(p);
    const { width: pWidth } = page.getSize();
    const footerY = margin + 4;

    // Subtle footer separator
    page.drawLine({
      start: { x: margin, y: footerY + 12 },
      end: { x: pWidth - margin, y: footerY + 12 },
      thickness: 0.5,
      color: dividerLineColor,
    });

    // Left attribution
    page.drawText('OpenTools · In-Browser Zero-Egress Conversion', {
      x: margin,
      y: footerY,
      size: 7,
      font: helvetica,
      color: mutedTextColor,
    });

    // Right page numbering
    if (showPageNumbers) {
      const pageText = `Page ${p + 1} of ${totalPages}`;
      const pageTextW = helvetica.widthOfTextAtSize(pageText, 7);
      page.drawText(pageText, {
        x: pWidth - margin - pageTextW,
        y: footerY,
        size: 7,
        font: helvetica,
        color: mutedTextColor,
      });
    }
  }

  // Document metadata
  if (options.documentTitle) {
    doc.setTitle(sanitizePdfText(options.documentTitle, charCodes));
  } else if (sheetsToProcess.length === 1) {
    doc.setTitle(sanitizePdfText(sheetsToProcess[0].name, charCodes));
  }
  doc.setProducer('OpenTools (getopentools.com)');
  doc.setCreationDate(new Date());

  const pdfBytes = await doc.save();
  const durationMs = performance.now() - startTime;

  return {
    pdfBytes,
    pageCount: totalPages,
    sheetCount: sheetsToProcess.length,
    rowCount: totalRows,
    columnCount: maxCols,
    durationMs,
    sheetsProcessed: sheetsSummary,
  };
}
