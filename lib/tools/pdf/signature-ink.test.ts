import { describe, expect, it } from 'vitest';

import { PAPER_INK, cssRgb, parseCssColor, tintPixels } from './signature-ink';

describe('signature ink', () => {
  it('reads the colour formats getComputedStyle returns', () => {
    expect(parseCssColor('rgb(245, 245, 242)')).toEqual([245, 245, 242]);
    expect(parseCssColor('rgba(17, 17, 17, 0.5)')).toEqual([17, 17, 17]);
    expect(parseCssColor('rgb(245 245 242)')).toEqual([245, 245, 242]);
    expect(parseCssColor('#f5f5f2')).toEqual([245, 245, 242]);
    expect(parseCssColor('#111')).toEqual([17, 17, 17]);
    expect(parseCssColor('oklch(0.9 0 0)')).toBeNull();
    expect(cssRgb(PAPER_INK)).toBe('rgb(17, 17, 17)');
  });

  it('recolours painted pixels and keeps alpha and transparency', () => {
    const data = new Uint8ClampedArray([
      245, 245, 242, 255, 245, 245, 242, 90, 0, 0, 0, 0,
    ]);
    expect([...tintPixels(data, PAPER_INK)]).toEqual([
      17, 17, 17, 255, 17, 17, 17, 90, 0, 0, 0, 0,
    ]);
  });
});
