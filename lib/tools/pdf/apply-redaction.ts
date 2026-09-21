/**
 * Apply Redaction Engine:
 * True PDF Redaction by rasterising redacted pages into flattened images
 * and burning solid black boxes into the pixels.
 *
 * Guaranteed Properties:
 * 1. Physical Removal: No text operators (BT/Tj/TJ/ET) or fonts exist on redacted pages.
 * 2. Surgical Precision: Pages without redactions remain untouched native vector/text pages.
 * 3. Leak Purging: Document /Info, XMP Metadata, Bookmarks/Outlines, Names (attachments/JS),
 *    and Annotations (comments/form fields) are completely purged.
 */

import { PDFDocument, PDFName } from 'pdf-lib';
import type { RedactionTarget } from './redaction-targets';

export interface RedactionCanvas {
  canvas: unknown;
  context: unknown;
  toPng(): Promise<Uint8Array>;
}

export type CanvasFactory = (
  width: number,
  height: number,
) => Promise<RedactionCanvas> | RedactionCanvas;

export interface ApplyRedactionOptions {
  /** Target print DPI for rasterised pages: 150, 200 (default), or 300. */
  dpi?: 150 | 200 | 300;
  /** Custom canvas factory for headless or test environments. */
  canvasFactory?: CanvasFactory;
  /** Progress callback reporting page index and current phase. */
  onProgress?: (current: number, total: number, phase: string) => void;
}

export interface RedactionResult {
  bytes: Uint8Array;
  redactedPagesCount: number;
  unredactedPagesCount: number;
  totalRedactionsCount: number;
  rasterizedPages: number[];
  purgedMetadata: {
    infoCleared: boolean;
    xmpPurged: boolean;
    outlinesPurged: boolean;
    namesPurged: boolean;
    annotationsPurged: boolean;
  };
}

/**
 * Creates a canvas instance in browser (DOM/OffscreenCanvas) or Node (@napi-rs/canvas).
 */
async function getOrCreateCanvas(
  width: number,
  height: number,
  customFactory?: CanvasFactory,
): Promise<RedactionCanvas> {
  if (customFactory) {
    return customFactory(width, height);
  }

  // Browser Window with DOM
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Failed to get 2D canvas context in browser.');

    return {
      canvas,
      context,
      toPng: async () => {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        );
        if (!blob) throw new Error('Failed to export canvas to PNG blob.');
        const ab = await blob.arrayBuffer();
        return new Uint8Array(ab);
      },
    };
  }

  // Web Worker or modern runtime with OffscreenCanvas
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(Math.floor(width), Math.floor(height));
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Failed to get 2D context for OffscreenCanvas.');

    return {
      canvas,
      context,
      toPng: async () => {
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        const ab = await blob.arrayBuffer();
        return new Uint8Array(ab);
      },
    };
  }

  throw new Error(
    'No canvas implementation available. In browser environments, HTML5 Canvas is used. ' +
      'In headless Node environments, please provide a canvasFactory in RedactionOptions.',
  );
}

/**
 * Configures the pdf.js worker URL if needed.
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
    /* resolved by runtime */
  }
}

/**
 * True PDF Redaction:
 * Black out targets, rasterise touched pages, leave untouched pages as clean vector text,
 * and strip all metadata, bookmarks, annotations, and attachments.
 */
export async function applyRedaction(
  pdfBytes: Uint8Array,
  targets: readonly RedactionTarget[],
  options: ApplyRedactionOptions = {},
): Promise<RedactionResult> {
  // 1. Validation and Refusal by Name (Guardrail G7)
  if (pdfBytes.byteLength === 0) {
    throw new Error(
      'This PDF file is empty (0 bytes). Cannot perform redaction.',
    );
  }

  let srcDoc: PDFDocument;
  try {
    srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  } catch (err) {
    throw new Error(
      `Failed to parse PDF: ${err instanceof Error ? err.message : 'Invalid PDF format'}`,
    );
  }

  if (srcDoc.isEncrypted) {
    throw new Error(
      'This PDF is password-protected or encrypted. OpenTools does not bypass passwords ' +
        'or encryption. Please decrypt or unlock the document before applying redaction.',
    );
  }

  const pageCount = srcDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error('This PDF contains 0 pages. Cannot perform redaction.');
  }

  // Group targets by 1-indexed pageNumber
  const targetsByPage = new Map<number, RedactionTarget[]>();
  for (const t of targets) {
    const pageNum = t.pageNumber;
    if (pageNum >= 1 && pageNum <= pageCount) {
      const list = targetsByPage.get(pageNum);
      if (list) {
        list.push(t);
      } else {
        targetsByPage.set(pageNum, [t]);
      }
    }
  }

  const dpi = options.dpi ?? 200;
  const scale = dpi / 72; // Standard PDF points are 1/72 inch

  // 2. Setup pdfjs-dist for rendering touched pages
  interface PdfjsPageLike {
    getViewport: (options: { scale: number }) => {
      width: number;
      height: number;
      convertToViewportPoint: (x: number, y: number) => [number, number];
    };
    render: (params: { canvasContext: unknown; viewport: unknown }) => {
      promise: Promise<void>;
    };
  }

  interface PdfjsDocLike {
    getPage: (pageNumber: number) => Promise<PdfjsPageLike>;
  }

  let pdfjsDoc: PdfjsDocLike | null = null;
  if (targetsByPage.size > 0) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    await ensurePdfWorker(
      pdfjs as unknown as Parameters<typeof ensurePdfWorker>[0],
    );
    const copy = new Uint8Array(pdfBytes.length);
    copy.set(pdfBytes);
    const task = pdfjs.getDocument({ data: copy, useSystemFonts: false });
    pdfjsDoc = (await task.promise) as unknown as PdfjsDocLike;
  }

  // 3. Construct new sanitized document
  const outDoc = await PDFDocument.create();
  const rasterizedPages: number[] = [];

  for (let p = 1; p <= pageCount; p++) {
    options.onProgress?.(p, pageCount, `Processing page ${p} of ${pageCount}`);
    const pageTargets = targetsByPage.get(p);

    if (!pageTargets || pageTargets.length === 0) {
      // Untouched page: copy directly from source document (preserves selectable vector text!)
      const [copiedPage] = await outDoc.copyPages(srcDoc, [p - 1]);
      outDoc.addPage(copiedPage);
    } else {
      // Redacted page: rasterise to canvas, burn black rectangles, embed as clean image page
      rasterizedPages.push(p);
      if (!pdfjsDoc) {
        throw new Error('PDF renderer not initialized.');
      }
      const pdfjsPage = await pdfjsDoc.getPage(p);
      const viewport = pdfjsPage.getViewport({ scale });

      const canvasHelper = await getOrCreateCanvas(
        viewport.width,
        viewport.height,
        options.canvasFactory,
      );
      const ctx = canvasHelper.context as CanvasRenderingContext2D;

      // Solid white base to eliminate transparency bleed
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      // Render the original page graphics and text
      await pdfjsPage.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // Burn black boxes over every target rectangle
      ctx.fillStyle = '#000000';
      for (const target of pageTargets) {
        const rect = target.rect;
        // In PDF coordinates: rect.y is bottom-left.
        // Convert top-left (rect.x, rect.y + rect.height) and bottom-right (rect.x + rect.width, rect.y) to viewport
        const [vx1, vy1] = viewport.convertToViewportPoint(
          rect.x,
          rect.y + rect.height,
        );
        const [vx2, vy2] = viewport.convertToViewportPoint(
          rect.x + rect.width,
          rect.y,
        );

        const bx = Math.min(vx1, vx2);
        const by = Math.min(vy1, vy2);
        const bw = Math.abs(vx2 - vx1);
        const bh = Math.abs(vy2 - vy1);

        ctx.fillRect(bx, by, bw, bh);
      }

      // Export canvas to PNG image bytes
      const pngBytes = await canvasHelper.toPng();
      const embeddedImage = await outDoc.embedPng(pngBytes);

      // Add new page with original dimensions
      const origPage = srcDoc.getPage(p - 1);
      const { width, height } = origPage.getSize();
      const newPage = outDoc.addPage([width, height]);

      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }
  }

  // 4. Purge Document-Wide Leak Vectors
  options.onProgress?.(
    pageCount,
    pageCount,
    'Purging metadata and hidden attachments',
  );

  // A. Clear Document Info Dictionary
  outDoc.setTitle('');
  outDoc.setAuthor('');
  outDoc.setSubject('');
  outDoc.setKeywords([]);
  outDoc.setProducer('');
  outDoc.setCreator('');

  // B. Delete XMP Metadata Packet
  const hadXmp = srcDoc.catalog.has(PDFName.of('Metadata'));
  let xmpPurged = hadXmp;
  if (outDoc.catalog.has(PDFName.of('Metadata'))) {
    outDoc.catalog.delete(PDFName.of('Metadata'));
    xmpPurged = true;
  }

  // C. Delete Outlines / Bookmarks (which frequently quote headings with client names)
  const hadOutlines = srcDoc.catalog.has(PDFName.of('Outlines'));
  let outlinesPurged = hadOutlines;
  if (outDoc.catalog.has(PDFName.of('Outlines'))) {
    outDoc.catalog.delete(PDFName.of('Outlines'));
    outDoc.catalog.delete(PDFName.of('PageMode'));
    outlinesPurged = true;
  }

  // D. Delete Names tree (Embedded files, attachments, JavaScript)
  const hadNames = srcDoc.catalog.has(PDFName.of('Names'));
  let namesPurged = hadNames;
  if (outDoc.catalog.has(PDFName.of('Names'))) {
    outDoc.catalog.delete(PDFName.of('Names'));
    namesPurged = true;
  }

  // E. Delete JavaScript triggers
  if (outDoc.catalog.has(PDFName.of('OpenAction'))) {
    outDoc.catalog.delete(PDFName.of('OpenAction'));
  }
  if (outDoc.catalog.has(PDFName.of('AA'))) {
    outDoc.catalog.delete(PDFName.of('AA'));
  }

  // F. Purge Annotations from all pages (comments, form fields, popups)
  let annotationsPurged = false;
  for (const page of outDoc.getPages()) {
    if (page.node.has(PDFName.of('Annots'))) {
      page.node.delete(PDFName.of('Annots'));
      annotationsPurged = true;
    }
  }

  const outputBytes = await outDoc.save({ useObjectStreams: true });

  return {
    bytes: outputBytes,
    redactedPagesCount: rasterizedPages.length,
    unredactedPagesCount: pageCount - rasterizedPages.length,
    totalRedactionsCount: targets.length,
    rasterizedPages,
    purgedMetadata: {
      infoCleared: true,
      xmpPurged,
      outlinesPurged,
      namesPurged,
      annotationsPurged,
    },
  };
}
