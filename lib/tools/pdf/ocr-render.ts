import type { OcrProgress, OcrSession } from '../ocr/types';
import type { OcrPdfPageResult } from './ocr-pdf';

async function ensurePdfWorker(pdfjs: {
  GlobalWorkerOptions: { workerSrc: string };
}) {
  if (pdfjs.GlobalWorkerOptions.workerSrc || typeof Worker === 'undefined')
    return;
  const workerModule =
    await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('This PDF page could not be rasterised for OCR.'));
    }, 'image/png');
  });
}

export async function recognisePdfPages(
  bytes: Uint8Array,
  session: OcrSession,
  options: {
    signal: AbortSignal;
    onPage: (pageNumber: number, pageCount: number) => void;
    onProgress: (progress: OcrProgress) => void;
  },
): Promise<OcrPdfPageResult[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  await ensurePdfWorker(
    pdfjs as unknown as Parameters<typeof ensurePdfWorker>[0],
  );
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const task = pdfjs.getDocument({ data: copy, useSystemFonts: false });

  try {
    const pdfDocument = await task.promise;
    const results: OcrPdfPageResult[] = [];
    for (
      let pageNumber = 1;
      pageNumber <= pdfDocument.numPages;
      pageNumber += 1
    ) {
      if (options.signal.aborted) {
        throw new DOMException('OCR was cancelled.', 'AbortError');
      }
      options.onPage(pageNumber, pdfDocument.numPages);
      const page = await pdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 2 });
      const basePixels = baseViewport.width * baseViewport.height;
      const scale =
        basePixels > 16_000_000 ? 2 * Math.sqrt(16_000_000 / basePixels) : 2;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context)
        throw new Error('Canvas rendering is unavailable in this browser.');
      const renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
      });
      const cancel = () => renderTask.cancel();
      options.signal.addEventListener('abort', cancel, { once: true });
      try {
        await renderTask.promise;
      } finally {
        options.signal.removeEventListener('abort', cancel);
      }
      const image = await canvasBlob(canvas);
      const result = await session.recognise(image, {
        signal: options.signal,
        onProgress: options.onProgress,
      });
      results.push({ ...result, pageNumber });
      canvas.width = 1;
      canvas.height = 1;
      page.cleanup();
    }
    return results;
  } finally {
    await task.destroy();
  }
}
