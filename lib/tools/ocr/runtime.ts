import { assembleOcrLayout, DEFAULT_LOW_CONFIDENCE_THRESHOLD } from './layout';
import type {
  OcrBox,
  OcrProgress,
  OcrResult,
  OcrSession,
  RecogniseOptions,
} from './types';

interface TesseractWord {
  text: string;
  confidence: number;
  bbox: OcrBox;
}

interface TesseractBlock {
  paragraphs: Array<{
    lines: Array<{ words: TesseractWord[] }>;
  }>;
}

interface TesseractResult {
  data: {
    blocks: TesseractBlock[] | null;
    confidence: number;
  };
}

interface WorkerLike {
  recognize(
    image: Blob,
    options: Record<string, never>,
    output: { text: true; blocks: true },
  ): Promise<TesseractResult>;
  terminate(): Promise<unknown>;
}

function abortedError() {
  return new DOMException('OCR was cancelled.', 'AbortError');
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(abortedError());
    else
      signal.addEventListener('abort', () => reject(abortedError()), {
        once: true,
      });
  });
}

function imageDimensions(
  image: Blob,
): Promise<{ width: number; height: number }> {
  return createImageBitmap(image).then((bitmap) => {
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  });
}

function flattenWords(blocks: TesseractBlock[] | null) {
  return (blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) =>
        line.words.map((word) => ({
          text: word.text,
          confidence: word.confidence,
          box: word.bbox,
        })),
      ),
    ),
  );
}

/**
 * Dynamically imports Tesseract only when called. Its own dedicated worker is
 * created directly from `/ocr/worker.min.js`; `workerBlobURL: false` ensures
 * the worker receives the narrowly-scoped same-origin asset CSP rather than
 * inheriting the page's stricter `connect-src 'none'` policy through a blob.
 */
export async function createOcrSession(
  onInitialProgress?: (progress: OcrProgress) => void,
  signal?: AbortSignal,
): Promise<OcrSession> {
  if (signal?.aborted) throw abortedError();

  let progressHandler = onInitialProgress;
  const tesseract = await import('tesseract.js');
  const workerPromise = tesseract.createWorker('eng', tesseract.OEM.LSTM_ONLY, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/core',
    langPath: '/ocr/lang',
    workerBlobURL: false,
    gzip: true,
    cacheMethod: 'write',
    logger(message) {
      progressHandler?.({
        status: message.status,
        progress: Math.max(0, Math.min(1, message.progress)),
      });
    },
  }) as unknown as Promise<WorkerLike>;

  let worker: WorkerLike;
  try {
    worker = signal
      ? await Promise.race([workerPromise, rejectOnAbort(signal)])
      : await workerPromise;
  } catch (cause) {
    if (signal?.aborted) {
      void workerPromise.then(
        (created) => created.terminate(),
        () => undefined,
      );
    }
    throw cause;
  }

  let terminated = false;
  const terminate = async () => {
    if (terminated) return;
    terminated = true;
    await worker.terminate();
  };

  if (signal?.aborted) {
    await terminate();
    throw abortedError();
  }

  return {
    async recognise(image: Blob, options: RecogniseOptions = {}) {
      if (terminated || options.signal?.aborted) throw abortedError();
      progressHandler = options.onProgress;
      const onAbort = () => void terminate();
      options.signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const [result, dimensions] = await Promise.all([
          worker.recognize(image, {}, { text: true, blocks: true }),
          imageDimensions(image),
        ]);
        if (options.signal?.aborted) throw abortedError();
        const layout = assembleOcrLayout(
          flattenWords(result.data.blocks),
          options.lowConfidenceThreshold ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD,
        );
        return {
          ...layout,
          confidence: Math.max(0, Math.min(100, result.data.confidence)),
          ...dimensions,
        } satisfies OcrResult;
      } catch (cause) {
        if (options.signal?.aborted) throw abortedError();
        throw cause;
      } finally {
        options.signal?.removeEventListener('abort', onAbort);
        progressHandler = onInitialProgress;
      }
    },
    terminate,
  };
}

export async function recognise(
  image: Blob,
  options: RecogniseOptions = {},
): Promise<OcrResult> {
  const session = await createOcrSession(options.onProgress, options.signal);
  try {
    return await session.recognise(image, options);
  } finally {
    await session.terminate();
  }
}
