/**
 * U²-Net (lite) pre- and post-processing, independent of the inference runtime.
 *
 * Weights: u2netp.onnx, Apache-2.0 (xuebinqin/U-2-Net), served from
 * `/models/u2netp.onnx`. The recipe matches the reference rembg pipeline so the
 * matte is identical to the upstream implementation.
 */
export const U2NETP = {
  modelPath: '/models/u2netp.onnx',
  sha256: '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8',
  inputSize: 320,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
} as const;

/** Below this share of foreground pixels the model found no subject. */
export const MIN_FOREGROUND_RATIO = 0.002;

/**
 * Converts square RGBA pixels into a normalized NCHW float tensor.
 *
 * The reference implementation scales by the image's own maximum channel value
 * rather than by 255; on dark photographs that changes the matte, so it is
 * reproduced exactly.
 */
export function rgbaToTensor(
  rgba: Uint8ClampedArray,
  size: number = U2NETP.inputSize,
): Float32Array {
  const plane = size * size;
  if (rgba.length !== plane * 4) {
    throw new RangeError(
      `Expected ${plane * 4} RGBA bytes, received ${rgba.length}.`,
    );
  }
  let peak = 0;
  for (let i = 0; i < plane; i++) {
    const offset = i * 4;
    peak = Math.max(peak, rgba[offset], rgba[offset + 1], rgba[offset + 2]);
  }
  const scale = peak > 0 ? peak : 255;
  const [mr, mg, mb] = U2NETP.mean;
  const [sr, sg, sb] = U2NETP.std;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const offset = i * 4;
    tensor[i] = (rgba[offset] / scale - mr) / sr;
    tensor[plane + i] = (rgba[offset + 1] / scale - mg) / sg;
    tensor[2 * plane + i] = (rgba[offset + 2] / scale - mb) / sb;
  }
  return tensor;
}

/**
 * Min-max normalizes the saliency map into an RGBA matte whose alpha channel
 * holds the subject mask, ready for `destination-in` compositing.
 */
export function saliencyToMatte(
  saliency: ArrayLike<number>,
  size: number = U2NETP.inputSize,
): { matte: Uint8ClampedArray<ArrayBuffer>; foregroundRatio: number } {
  const plane = size * size;
  if (saliency.length < plane) {
    throw new RangeError(
      `Expected ${plane} saliency values, received ${saliency.length}.`,
    );
  }
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < plane; i++) {
    const value = saliency[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const range = max - min || 1;
  const matte = new Uint8ClampedArray(plane * 4);
  let foreground = 0;
  for (let i = 0; i < plane; i++) {
    const normalized = (saliency[i] - min) / range;
    if (normalized > 0.5) foreground++;
    matte[i * 4 + 3] = Math.round(normalized * 255);
  }
  return { matte, foregroundRatio: foreground / plane };
}
