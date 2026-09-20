/**
 * Client-side PDF page slice renderer.
 * Renders each page of a PDF file to high-resolution PNG image bytes.
 */

import type { RawFileInput } from './converter';

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
    /* Fallback if worker cannot be loaded via ?url */
  }
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 // F
  );
}

export async function renderPdfToSlices(
  bytes: Uint8Array,
  baseFilename: string,
  scale = 2,
): Promise<RawFileInput[]> {
  if (typeof window === 'undefined' || typeof window.document === 'undefined') {
    throw new Error(
      'PDF rendering to image slices requires a browser environment.',
    );
  }

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

  const pdfDoc = await task.promise;
  const slices: RawFileInput[] = [];
  const baseClean = baseFilename
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\w.-]/g, '_');

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = window.document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(
        `Failed to get canvas 2D context for PDF page ${pageNum}.`,
      );
    }

    // White background in case PDF has transparent elements
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render page
    await page.render({
      canvas: canvas,
      canvasContext: ctx,
      viewport,
    }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );

    if (!blob) {
      throw new Error(
        `Failed to export canvas to PNG blob for page ${pageNum}.`,
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    slices.push({
      name: `${baseClean}_page_${pageNum}.png`,
      bytes: new Uint8Array(arrayBuffer),
      altText: `Page ${pageNum} of ${baseClean}`,
    });
  }

  return slices;
}
