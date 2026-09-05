/// <reference lib="webworker" />

import {
  extractPdfPages,
  inspectPdfInputs,
  mergePdfInputs,
  PdfEngineError,
} from '@/lib/tools/pdf/engine';
import type {
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';

const workerScope = self as DedicatedWorkerGlobalScope;

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
        const output = result.bytes.slice().buffer as ArrayBuffer;
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
      const output = result.bytes.slice().buffer as ArrayBuffer;
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
