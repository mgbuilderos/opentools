import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { rgbaToTensor, saliencyToMatte, U2NETP } from './u2netp';

const projectRoot = path.resolve(import.meta.dirname, '../../..');

describe('u2netp pre-processing', () => {
  it('scales by the image peak and normalizes each channel into NCHW order', () => {
    // 2×2 image: red, green, blue, black. Peak channel value is 200.
    const rgba = new Uint8ClampedArray([
      200, 0, 0, 255, 0, 200, 0, 255, 0, 0, 200, 255, 0, 0, 0, 255,
    ]);
    const tensor = rgbaToTensor(rgba, 2);
    expect(tensor).toHaveLength(12);
    expect(tensor[0]).toBeCloseTo((1 - 0.485) / 0.229, 5);
    expect(tensor[1]).toBeCloseTo(-0.485 / 0.229, 5);
    expect(tensor[4 + 1]).toBeCloseTo((1 - 0.456) / 0.224, 5);
    expect(tensor[8 + 2]).toBeCloseTo((1 - 0.406) / 0.225, 5);
  });

  it('does not divide by zero on an all-black image', () => {
    const tensor = rgbaToTensor(new Uint8ClampedArray(16), 2);
    expect(tensor.every(Number.isFinite)).toBe(true);
  });

  it('rejects a buffer of the wrong size', () => {
    expect(() => rgbaToTensor(new Uint8ClampedArray(12), 2)).toThrow(
      RangeError,
    );
  });
});

describe('u2netp post-processing', () => {
  it('min-max normalizes saliency into the alpha channel', () => {
    const { matte, foregroundRatio } = saliencyToMatte([0.1, 0.9, 0.5, 0.3], 2);
    expect(Array.from(matte.filter((_, i) => i % 4 === 3))).toEqual([
      0, 255, 128, 64,
    ]);
    expect(Array.from(matte.filter((_, i) => i % 4 !== 3))).toEqual(
      Array.from({ length: 12 }, () => 0),
    );
    // Only values strictly above the midpoint count as foreground.
    expect(foregroundRatio).toBe(0.25);
  });

  it('reports no foreground for a flat saliency map', () => {
    expect(saliencyToMatte([0.4, 0.4, 0.4, 0.4], 2).foregroundRatio).toBe(0);
  });
});

describe('self-hosted inference assets', () => {
  it('serves the pinned u2netp weights', () => {
    const bytes = readFileSync(
      path.join(projectRoot, 'public', U2NETP.modelPath),
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      U2NETP.sha256,
    );
  });

  it.each(['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'])(
    'serves %s from the installed onnxruntime-web',
    (file) => {
      const hash = (source: string) =>
        createHash('sha256').update(readFileSync(source)).digest('hex');
      expect(hash(path.join(projectRoot, 'public/ort', file))).toBe(
        hash(path.join(projectRoot, 'node_modules/onnxruntime-web/dist', file)),
      );
    },
  );
});
