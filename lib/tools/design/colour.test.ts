import { describe, expect, it } from 'vitest';

import {
  cmykToRgb,
  colorFromRgb,
  hslToRgb,
  parseHexColor,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  CMYK_APPROXIMATION_NOTICE,
} from './colour';

describe('Colour Space Conversions', () => {
  describe('HEX parsing & formatting', () => {
    it('parses 6-character hex correctly', () => {
      expect(parseHexColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(parseHexColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseHexColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseHexColor('3498db')).toEqual({ r: 52, g: 152, b: 219 });
    });

    it('parses 3-character hex shorthand', () => {
      expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(parseHexColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseHexColor('0f0')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('returns null for invalid hex strings', () => {
      expect(parseHexColor('not-a-color')).toBeNull();
      expect(parseHexColor('#12345')).toBeNull();
      expect(parseHexColor('#gggggg')).toBeNull();
    });

    it('formats RGB into hex', () => {
      expect(rgbToHex({ r: 52, g: 152, b: 219 })).toBe('#3498db');
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    });
  });

  describe('RGB ⇄ HSL conversions', () => {
    it('converts pure primaries and neutrals', () => {
      // Red
      const redHsl = rgbToHsl({ r: 255, g: 0, b: 0 });
      expect(redHsl).toEqual({ h: 0, s: 100, l: 50 });
      expect(hslToRgb(redHsl)).toEqual({ r: 255, g: 0, b: 0 });

      // Green
      const greenHsl = rgbToHsl({ r: 0, g: 255, b: 0 });
      expect(greenHsl).toEqual({ h: 120, s: 100, l: 50 });
      expect(hslToRgb(greenHsl)).toEqual({ r: 0, g: 255, b: 0 });

      // Blue
      const blueHsl = rgbToHsl({ r: 0, g: 0, b: 255 });
      expect(blueHsl).toEqual({ h: 240, s: 100, l: 50 });
      expect(hslToRgb(blueHsl)).toEqual({ r: 0, g: 0, b: 255 });

      // White
      const whiteHsl = rgbToHsl({ r: 255, g: 255, b: 255 });
      expect(whiteHsl).toEqual({ h: 0, s: 0, l: 100 });
      expect(hslToRgb(whiteHsl)).toEqual({ r: 255, g: 255, b: 255 });

      // Black
      const blackHsl = rgbToHsl({ r: 0, g: 0, b: 0 });
      expect(blackHsl).toEqual({ h: 0, s: 0, l: 0 });
      expect(hslToRgb(blackHsl)).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('RGB ⇄ CMYK conversions', () => {
    it('converts RGB to CMYK accurately', () => {
      // Pure Cyan
      expect(rgbToCmyk({ r: 0, g: 255, b: 255 })).toEqual({
        c: 100,
        m: 0,
        y: 0,
        k: 0,
      });
      // Pure Magenta
      expect(rgbToCmyk({ r: 255, g: 0, b: 255 })).toEqual({
        c: 0,
        m: 100,
        y: 0,
        k: 0,
      });
      // Pure Yellow
      expect(rgbToCmyk({ r: 255, g: 255, b: 0 })).toEqual({
        c: 0,
        m: 0,
        y: 100,
        k: 0,
      });
      // Pure Black
      expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({
        c: 0,
        m: 0,
        y: 0,
        k: 100,
      });
      // Pure White
      expect(rgbToCmyk({ r: 255, g: 255, b: 255 })).toEqual({
        c: 0,
        m: 0,
        y: 0,
        k: 0,
      });
    });

    it('roundtrips RGB through CMYK and back', () => {
      const originalRgb = { r: 128, g: 200, b: 64 };
      const cmyk = rgbToCmyk(originalRgb);
      const restoredRgb = cmykToRgb(cmyk);

      // Integer quantization tolerance of +- 2 levels
      expect(Math.abs(restoredRgb.r - originalRgb.r)).toBeLessThanOrEqual(2);
      expect(Math.abs(restoredRgb.g - originalRgb.g)).toBeLessThanOrEqual(2);
      expect(Math.abs(restoredRgb.b - originalRgb.b)).toBeLessThanOrEqual(2);
    });

    it('exports the honest print approximation notice', () => {
      expect(CMYK_APPROXIMATION_NOTICE).toContain('approximation');
      expect(CMYK_APPROXIMATION_NOTICE).toContain('ICC device profile');
    });
  });

  describe('colorFromRgb aggregate', () => {
    it('produces complete color profile with CSS representations', () => {
      const profile = colorFromRgb({ r: 33, g: 150, b: 243 });
      expect(profile.hex).toBe('#2196f3');
      expect(profile.rgbCss).toBe('rgb(33, 150, 243)');
      expect(profile.hslCss).toBe('hsl(207, 90%, 54%)');
      expect(profile.cmykCss).toBe('cmyk(86%, 38%, 0%, 5%)');
    });
  });
});
