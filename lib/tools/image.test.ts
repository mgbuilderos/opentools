import { describe, expect, it } from 'vitest';

import { calculateContainDimensions, extensionForRasterType } from './image';

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
});
