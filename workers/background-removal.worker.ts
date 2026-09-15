/// <reference lib="webworker" />

import * as ort from 'onnxruntime-web/wasm';

import type {
  BackgroundRemovalRequest,
  BackgroundRemovalResponse,
} from '@/lib/tools/background-removal/protocol';
import {
  MIN_FOREGROUND_RATIO,
  rgbaToTensor,
  saliencyToMatte,
  U2NETP,
} from '@/lib/tools/background-removal/u2netp';

const workerScope = self as DedicatedWorkerGlobalScope;

// Runtime and weights are same-origin static assets; nothing else is loaded.
ort.env.wasm.wasmPaths = {
  mjs: '/ort/ort-wasm-simd-threaded.mjs',
  wasm: '/ort/ort-wasm-simd-threaded.wasm',
};
ort.env.wasm.numThreads = 1;

let session: Promise<ort.InferenceSession> | undefined;

function getSession() {
  if (!session) {
    const created = ort.InferenceSession.create(U2NETP.modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    // A failed load must not be cached, or every retry fails.
    created.catch(() => {
      session = undefined;
    });
    session = created;
  }
  return session;
}

function context2d(canvas: OffscreenCanvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('This browser cannot run local background removal.');
  }
  return context;
}

async function removeBackground(image: Blob) {
  const bitmap = await createImageBitmap(image, {
    imageOrientation: 'from-image',
  });
  try {
    const size = U2NETP.inputSize;
    const input = new OffscreenCanvas(size, size);
    const inputContext = context2d(input);
    inputContext.drawImage(bitmap, 0, 0, size, size);
    const tensor = rgbaToTensor(
      inputContext.getImageData(0, 0, size, size).data,
    );

    const model = await getSession();
    const outputs = await model.run({
      [model.inputNames[0]]: new ort.Tensor('float32', tensor, [
        1,
        3,
        size,
        size,
      ]),
    });
    const saliency = outputs[model.outputNames[0]]?.data;
    if (!(saliency instanceof Float32Array)) {
      throw new Error('The background removal model returned no mask.');
    }

    const { matte, foregroundRatio } = saliencyToMatte(saliency);
    if (foregroundRatio < MIN_FOREGROUND_RATIO) {
      throw new Error(
        'No clear subject was found in this image. Try Solid Color mode.',
      );
    }

    const matteCanvas = new OffscreenCanvas(size, size);
    context2d(matteCanvas).putImageData(new ImageData(matte, size, size), 0, 0);

    // The mask is upscaled; the subject keeps its original resolution.
    const output = new OffscreenCanvas(bitmap.width, bitmap.height);
    const outputContext = context2d(output);
    outputContext.drawImage(bitmap, 0, 0);
    outputContext.globalCompositeOperation = 'destination-in';
    outputContext.imageSmoothingQuality = 'high';
    outputContext.drawImage(matteCanvas, 0, 0, bitmap.width, bitmap.height);

    return {
      image: await output.convertToBlob({ type: 'image/png' }),
      foregroundRatio,
    };
  } finally {
    bitmap.close();
  }
}

workerScope.onmessage = async (
  event: MessageEvent<BackgroundRemovalRequest>,
) => {
  try {
    const { image, foregroundRatio } = await removeBackground(event.data.image);
    workerScope.postMessage({
      type: 'done',
      image,
      foregroundRatio,
    } satisfies BackgroundRemovalResponse);
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Local background removal failed.',
    } satisfies BackgroundRemovalResponse);
  }
};
