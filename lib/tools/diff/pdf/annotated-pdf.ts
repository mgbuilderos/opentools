import { PDFDocument, rgb } from 'pdf-lib';
import type { PdfDiffResult } from './types';

export async function generateAnnotatedPdf(
  basePdfBytes: Uint8Array,
  diffResult: PdfDiffResult,
  targetSide: 'revised' | 'original' = 'revised',
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(basePdfBytes);
  const pages = pdfDoc.getPages();

  const colors = {
    insert: rgb(0.13, 0.77, 0.36), // Green
    delete: rgb(0.94, 0.27, 0.24), // Red
    move: rgb(0.96, 0.62, 0.13), // Amber/Orange
    format: rgb(0.23, 0.51, 0.96), // Blue
  };

  for (const chg of diffResult.changes) {
    const pageNum =
      targetSide === 'revised'
        ? (chg.pageB ?? chg.pageA)
        : (chg.pageA ?? chg.pageB);
    if (!pageNum || pageNum < 1 || pageNum > pages.length) continue;

    const page = pages[pageNum - 1];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const box =
      targetSide === 'revised'
        ? (chg.boxB ?? chg.boxA)
        : (chg.boxA ?? chg.boxB);

    if (box) {
      const color = colors[chg.type] ?? colors.insert;

      // PDF coordinates have origin at bottom-left
      // box coordinates from geometry are in PDF user space
      const x = Math.max(0, Math.min(box.x - 2, pageWidth - 10));
      const y = Math.max(0, Math.min(box.y - 2, pageHeight - 10));
      const w = Math.min(box.width + 4, pageWidth - x);
      const h = Math.min(box.height + 4, pageHeight - y);

      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color,
        opacity: 0.28,
        borderWidth: 1,
        borderColor: color,
        borderOpacity: 0.6,
      });

      if (chg.type === 'delete') {
        // Draw strikethrough line across center of box
        page.drawLine({
          start: { x, y: y + h / 2 },
          end: { x: x + w, y: y + h / 2 },
          color,
          thickness: 1.5,
          opacity: 0.8,
        });
      }
    }
  }

  return pdfDoc.save();
}
