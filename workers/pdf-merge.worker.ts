/// <reference lib="webworker" />

import {
  compressPdf,
  extractPdfPages,
  fillPdfForm,
  inspectPdfForm,
  imagesToPdf,
  inspectPdfInputs,
  mergePdfInputs,
  PdfEngineError,
  transformPdfPages,
} from '@/lib/tools/pdf/engine';
import { fitPdfToSize } from '@/lib/tools/pdf/fit-to-size';
import { reencodeJpegWithCanvas } from '@/lib/tools/pdf/jpeg-reencode';
import type {
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';

const workerScope = self as DedicatedWorkerGlobalScope;

function toTransferableBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer);
}

function send(message: PdfWorkerResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(message, transfer);
}

function sendError(
  error: unknown,
  fallbackCode: 'MERGE_FAILED' | 'FILL_FAILED' | 'INVALID_PDF' = 'MERGE_FAILED',
) {
  if (error instanceof PdfEngineError) {
    send({
      type: 'error',
      code: error.code,
      message: error.message,
      inputId: error.inputId,
      fieldIds: error.fieldIds,
    });
    return;
  }

  send({
    type: 'error',
    code: fallbackCode,
    message:
      'The PDF task stopped unexpectedly. Your original files are unchanged.',
  });
}

workerScope.onmessage = (event: MessageEvent<PdfWorkerRequest>) => {
  const request = event.data;

  if (request.type === 'inspect') {
    inspectPdfInputs(request.inputs)
      .then((files) => send({ type: 'inspected', files }))
      .catch(sendError);
    return;
  }

  if (request.type === 'extract') {
    extractPdfPages(request.input, request.pages, (phase, completed, total) => {
      send({ type: 'progress', phase, completed, total });
    })
      .then((result) => {
        const output = toTransferableBuffer(result.bytes);
        send(
          {
            type: 'result',
            bytes: output,
            pageCount: result.pageCount,
            computeDurationMs: result.computeDurationMs,
            validationDurationMs: result.validationDurationMs,
          },
          [output],
        );
      })
      .catch(sendError);
    return;
  }

  if (request.type === 'transform') {
    transformPdfPages(
      request.input,
      request.options,
      (phase, completed, total) => {
        send({ type: 'progress', phase, completed, total });
      },
    )
      .then((result) => {
        const output = toTransferableBuffer(result.bytes);
        send(
          {
            type: 'result',
            bytes: output,
            pageCount: result.pageCount,
            computeDurationMs: result.computeDurationMs,
            validationDurationMs: result.validationDurationMs,
          },
          [output],
        );
      })
      .catch(sendError);
    return;
  }

  if (request.type === 'inspect-form') {
    inspectPdfForm(request.input)
      .then((result) => send({ type: 'form', ...result }))
      .catch((error: unknown) => sendError(error, 'INVALID_PDF'));
    return;
  }

  if (request.type === 'fill') {
    fillPdfForm(request.input, request.options, (phase, completed, total) => {
      send({ type: 'progress', phase, completed, total });
    })
      .then((result) => {
        const output = toTransferableBuffer(result.bytes);
        send(
          {
            type: 'result',
            bytes: output,
            pageCount: result.pageCount,
            computeDurationMs: result.computeDurationMs,
            validationDurationMs: result.validationDurationMs,
            fieldsChanged: result.fieldsChanged,
            signaturePlaced: result.signaturePlaced,
            flattened: result.flattened,
          },
          [output],
        );
      })
      .catch((error: unknown) => sendError(error, 'FILL_FAILED'));
    return;
  }

  if (request.type === 'compress') {
    compressPdf(
      request.input,
      request.options,
      reencodeJpegWithCanvas,
      (phase, completed, total) => {
        send({ type: 'progress', phase, completed, total });
      },
    )
      .then((result) => {
        const output = toTransferableBuffer(result.bytes);
        send(
          {
            type: 'result',
            bytes: output,
            pageCount: result.pageCount,
            computeDurationMs: result.computeDurationMs,
            validationDurationMs: result.validationDurationMs,
            originalByteLength: result.originalByteLength,
            compressedByteLength: result.compressedByteLength,
            imagesRecompressed: result.imagesRecompressed,
            imagesLeftAlone: result.imagesLeftAlone,
          },
          [output],
        );
      })
      .catch(sendError);
    return;
  }

  if (request.type === 'fit-to-size') {
    const { input, options } = request;
    const started = performance.now();
    void (async () => {
      // Attempts re-parse the whole document, so the count is worth surfacing:
      // it is the honest measure of how hard this file was to get under.
      let ran = 0;
      const { outcome, chosen, settings, attempts } = await fitPdfToSize({
        targetBytes: options.targetBytes,
        originalBytes: input.bytes.byteLength,
        attempt: async ({ quality, maxImageDimension }) => {
          ran += 1;
          send({
            type: 'progress',
            phase: 'fitting',
            completed: ran,
            total: 0,
          });
          const pass = await compressPdf(
            input,
            {
              recompressImages: true,
              imageQuality: quality,
              maxImageDimension,
              removeMetadata: options.removeMetadata,
            },
            reencodeJpegWithCanvas,
          );
          return { byteLength: pass.bytes.length, value: pass };
        },
      });

      // Already under the target: hand the file back untouched rather than
      // rewrite it. Someone who asked for "under 2 MB" and is already there
      // has nothing to gain from a lossy pass.
      if (outcome === 'already-under' || chosen === null) {
        const [inspected] = await inspectPdfInputs([input]);
        const original = new Uint8Array(input.bytes).slice();
        const output = toTransferableBuffer(original);
        send(
          {
            type: 'result',
            bytes: output,
            pageCount: inspected?.pages ?? 0,
            computeDurationMs: performance.now() - started,
            validationDurationMs: 0,
            originalByteLength: input.bytes.byteLength,
            compressedByteLength: input.bytes.byteLength,
            imagesRecompressed: 0,
            imagesLeftAlone: 0,
            fitOutcome: 'already-under',
            fitAttempts: attempts,
            targetBytes: options.targetBytes,
          },
          [output],
        );
        return;
      }

      const result = chosen.value;
      const output = toTransferableBuffer(result.bytes);
      send(
        {
          type: 'result',
          bytes: output,
          pageCount: result.pageCount,
          computeDurationMs: performance.now() - started,
          validationDurationMs: result.validationDurationMs,
          originalByteLength: result.originalByteLength,
          compressedByteLength: result.compressedByteLength,
          imagesRecompressed: result.imagesRecompressed,
          imagesLeftAlone: result.imagesLeftAlone,
          fitOutcome: outcome,
          fitQuality: settings?.quality,
          fitMaxImageDimension: settings?.maxImageDimension,
          fitAttempts: attempts,
          targetBytes: options.targetBytes,
        },
        [output],
      );
    })().catch(sendError);
    return;
  }

  if (request.type === 'images-to-pdf') {
    imagesToPdf(request.inputs, request.options, (phase, completed, total) => {
      send({ type: 'progress', phase, completed, total });
    })
      .then((result) => {
        const output = toTransferableBuffer(result.bytes);
        send(
          {
            type: 'result',
            bytes: output,
            pageCount: result.pageCount,
            computeDurationMs: result.computeDurationMs,
            validationDurationMs: result.validationDurationMs,
          },
          [output],
        );
      })
      .catch(sendError);
    return;
  }

  mergePdfInputs(request.inputs, (phase, completed, total) => {
    send({ type: 'progress', phase, completed, total });
  })
    .then((result) => {
      const output = toTransferableBuffer(result.bytes);
      send(
        {
          type: 'result',
          bytes: output,
          pageCount: result.pageCount,
          computeDurationMs: result.computeDurationMs,
          validationDurationMs: result.validationDurationMs,
        },
        [output],
      );
    })
    .catch(sendError);
};
