import { describe, expect, it } from 'vitest';

import {
  calculateContainDimensions,
  canvasFilter,
  extensionForRasterType,
  transformedDimensions,
  validateCrop,
} from './image';

describe('image tool helpers', () => {
  it('fits an image inside both bounds without enlarging it', () => {
    expect(calculateContainDimensions(4000, 3000, 1200, 1200)).toEqual({
      width: 1200,
      height: 900,
    });
    expect(calculateContainDimensions(640, 480, 1200, 1200)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it('handles portrait bounds and rejects invalid dimensions', () => {
    expect(calculateContainDimensions(3000, 4000, 1200, 1000)).toEqual({
      width: 750,
      height: 1000,
    });
    expect(() => calculateContainDimensions(0, 4000, 1200, 1000)).toThrow(
      'positive numbers',
    );
  });

  it('maps browser raster types to safe file extensions', () => {
    expect(extensionForRasterType('image/jpeg')).toBe('jpg');
    expect(extensionForRasterType('image/png')).toBe('png');
    expect(extensionForRasterType('image/webp')).toBe('webp');
  });

  it('validates crop bounds', () => {
    expect(
      validateCrop({ x: 10, y: 20, width: 100, height: 80 }, 200, 150),
    ).toEqual({ x: 10, y: 20, width: 100, height: 80 });
    expect(() =>
      validateCrop({ x: 150, y: 0, width: 100, height: 80 }, 200, 150),
    ).toThrow('inside');
  });

  it('swaps dimensions for quarter turns', () => {
    expect(transformedDimensions(640, 480, 90)).toEqual({
      width: 480,
      height: 640,
    });
    expect(transformedDimensions(640, 480, 180)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it('builds a bounded canvas filter string', () => {
    expect(
      canvasFilter({ brightness: 240, contrast: 80, grayscale: 25, sepia: -5 }),
    ).toBe('brightness(200%) contrast(80%) grayscale(25%) sepia(0%)');
  });
});
