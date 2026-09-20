import { describe, expect, it } from 'vitest';

import { extractPaletteFromRgba, PALETTE_METHOD_NOTICE } from './palette';

describe('Dominant Colour Palette Extraction', () => {
  it('extracts distinct swatches using Median Cut Color Quantization', () => {
    // Synthetic 10x10 image: 50 red pixels, 30 blue pixels, 20 green pixels
    const width = 10;
    const height = 10;
    const rgba = new Uint8Array(width * height * 4);

    let offset = 0;
    // 50 Red pixels
    for (let i = 0; i < 50; i++) {
      rgba[offset++] = 255;
      rgba[offset++] = 0;
      rgba[offset++] = 0;
      rgba[offset++] = 255;
    }
    // 30 Blue pixels
    for (let i = 0; i < 30; i++) {
      rgba[offset++] = 0;
      rgba[offset++] = 0;
      rgba[offset++] = 255;
      rgba[offset++] = 255;
    }
    // 20 Green pixels
    for (let i = 0; i < 20; i++) {
      rgba[offset++] = 0;
      rgba[offset++] = 255;
      rgba[offset++] = 0;
      rgba[offset++] = 255;
    }

    const result = extractPaletteFromRgba(rgba, 3);

    expect(result.method).toBe('Median Cut Color Quantization');
    expect(result.totalSampledPixels).toBe(100);
    expect(result.swatches.length).toBeGreaterThanOrEqual(3);

    // Primary red swatch should be dominant
    const topSwatch = result.swatches[0]!;
    expect(topSwatch.percentage).toBeGreaterThanOrEqual(40);
    expect(topSwatch.profile.rgb.r).toBeGreaterThan(200);

    // Swatches should include blue and green representations
    const hasBlue = result.swatches.some((s) => s.profile.rgb.b > 200);
    const hasGreen = result.swatches.some((s) => s.profile.rgb.g > 200);
    expect(hasBlue).toBe(true);
    expect(hasGreen).toBe(true);
  });

  it('filters out transparent pixels', () => {
    const rgba = new Uint8Array(4 * 4); // 4 pixels
    // Pixel 0: Red, fully opaque
    rgba[0] = 255;
    rgba[1] = 0;
    rgba[2] = 0;
    rgba[3] = 255;
    // Pixel 1: Blue, completely transparent
    rgba[4] = 0;
    rgba[5] = 0;
    rgba[6] = 255;
    rgba[7] = 0;
    // Pixel 2: Green, translucent (< 128)
    rgba[8] = 0;
    rgba[9] = 255;
    rgba[10] = 0;
    rgba[11] = 50;
    // Pixel 3: White, fully opaque
    rgba[12] = 255;
    rgba[13] = 255;
    rgba[14] = 255;
    rgba[15] = 255;

    const result = extractPaletteFromRgba(rgba, 2);
    expect(result.totalSampledPixels).toBe(2); // Only opaque red and white
  });

  it('exports honest algorithm methodology notice', () => {
    expect(PALETTE_METHOD_NOTICE).toContain('Median Cut Color Quantization');
    expect(PALETTE_METHOD_NOTICE).toContain(
      'partitions the 3D RGB color space',
    );
  });
});
