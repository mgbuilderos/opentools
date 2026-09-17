/// <reference lib="webworker" />

import {
  compressPdf,
  extractPdfPages,
  imagesToPdf,
  inspectPdfInputs,
  mergePdfInputs,
  PdfEngineError,
  transformPdfPages,
} from '@/lib/tools/pdf/engine';
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

function sendError(error: unknown) {
  if (error instanceof PdfEngineError) {
    send({
      type: 'error',
      code: error.code,
      message: error.message,
      inputId: error.inputId,
    });
    return;
  }

  send({
    type: 'error',
    code: 'MERGE_FAILED',
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
