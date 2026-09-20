/**
 * Dominant Colour Palette Extraction using Median Cut Color Quantization.
 * Includes explicit algorithm methodology attribution.
 */

import {
  colorFromRgb,
  type ConvertedColorProfile,
  type RgbColor,
} from './colour';

export interface PaletteColorSwatch {
  profile: ConvertedColorProfile;
  pixelCount: number;
  percentage: number; // 0-100
}

export interface PaletteExtractionResult {
  swatches: PaletteColorSwatch[];
  totalSampledPixels: number;
  method: string;
}

export const PALETTE_METHOD_NOTICE =
  'Extracted using Median Cut Color Quantization. Unlike naive frequency sorting (which clusters around subtle background gradients) or k-means (which varies with random seeds), Median Cut recursively partitions the 3D RGB color space along the channel with the largest range, producing balanced, representative swatches.';

interface PixelRgb {
  r: number;
  g: number;
  b: number;
}

interface ColorBox {
  pixels: PixelRgb[];
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
}

function createBox(pixels: PixelRgb[]): ColorBox {
  let rMin = 255,
    rMax = 0;
  let gMin = 255,
    gMax = 0;
  let bMin = 255,
    bMax = 0;

  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i]!;
    if (p.r < rMin) rMin = p.r;
    if (p.r > rMax) rMax = p.r;
    if (p.g < gMin) gMin = p.g;
    if (p.g > gMax) gMax = p.g;
    if (p.b < bMin) bMin = p.b;
    if (p.b > bMax) bMax = p.b;
  }

  return { pixels, rMin, rMax, gMin, gMax, bMin, bMax };
}

function getLongestChannel(box: ColorBox): 'r' | 'g' | 'b' {
  const rRange = box.rMax - box.rMin;
  const gRange = box.gMax - box.gMin;
  const bRange = box.bMax - box.bMin;

  if (rRange >= gRange && rRange >= bRange) return 'r';
  if (gRange >= rRange && gRange >= bRange) return 'g';
  return 'b';
}

function canSplitBox(box: ColorBox): boolean {
  return (
    box.pixels.length >= 2 &&
    (box.rMax > box.rMin || box.gMax > box.gMin || box.bMax > box.bMin)
  );
}

function splitBox(box: ColorBox): [ColorBox, ColorBox] | null {
  if (!canSplitBox(box)) return null;

  const channel = getLongestChannel(box);
  box.pixels.sort((a, b) => a[channel] - b[channel]);

  const median = Math.floor(box.pixels.length / 2);
  const part1 = box.pixels.slice(0, median);
  const part2 = box.pixels.slice(median);

  if (part1.length === 0 || part2.length === 0) return null;

  return [createBox(part1), createBox(part2)];
}

/**
 * Extract dominant palette from flat RGBA Uint8ClampedArray/Uint8Array.
 */
export function extractPaletteFromRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  maxColors = 6,
  sampleStep = 1,
): PaletteExtractionResult {
  const pixels: PixelRgb[] = [];
  const step = Math.max(1, sampleStep);

  for (let i = 0; i < rgba.length; i += 4 * step) {
    const a = rgba[i + 3]!;
    // Filter out transparent pixels
    if (a < 128) continue;
    pixels.push({
      r: rgba[i]!,
      g: rgba[i + 1]!,
      b: rgba[i + 2]!,
    });
  }

  // Fallback: If image has only transparent pixels, sample all pixels
  if (pixels.length === 0) {
    for (let i = 0; i < rgba.length; i += 4 * step) {
      pixels.push({
        r: rgba[i]!,
        g: rgba[i + 1]!,
        b: rgba[i + 2]!,
      });
    }
  }

  if (pixels.length === 0) {
    return {
      swatches: [],
      totalSampledPixels: 0,
      method: 'Median Cut Color Quantization',
    };
  }

  const boxes: ColorBox[] = [createBox(pixels)];

  while (boxes.length < maxColors) {
    const splittable = boxes.filter(canSplitBox);
    if (splittable.length === 0) break;

    splittable.sort((a, b) => b.pixels.length - a.pixels.length);
    const boxToSplit = splittable[0]!;
    const split = splitBox(boxToSplit);
    if (!split) break;

    const idx = boxes.indexOf(boxToSplit);
    boxes.splice(idx, 1, split[0], split[1]);
  }

  // Calculate average color and statistics for each box
  const swatches: PaletteColorSwatch[] = boxes
    .map((box) => {
      let sumR = 0,
        sumG = 0,
        sumB = 0;
      for (const p of box.pixels) {
        sumR += p.r;
        sumG += p.g;
        sumB += p.b;
      }
      const count = box.pixels.length;
      const rgb: RgbColor = {
        r: Math.round(sumR / count),
        g: Math.round(sumG / count),
        b: Math.round(sumB / count),
      };
      const percentage = Number(((count / pixels.length) * 100).toFixed(1));
      return {
        profile: colorFromRgb(rgb),
        pixelCount: count,
        percentage,
      };
    })
    .sort((a, b) => b.pixelCount - a.pixelCount);

  return {
    swatches,
    totalSampledPixels: pixels.length,
    method: 'Median Cut Color Quantization',
  };
}
