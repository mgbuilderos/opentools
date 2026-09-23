import { describe, expect, it } from 'vitest';

import {
  applyBoxBlur,
  applyBrightnessContrast,
  applyGrayscale,
  applyInvert,
  applyMedianDenoise,
  applyPixelate,
  applyRegionBlur,
  applySepia,
  applySharpen,
  borderPlan,
  centredAspectCrop,
  clampRect,
  cornerRadius,
  extensionForImageType,
  extractPalette,
  gridPlan,
  outputFileName,
  overlayOrigin,
  parseImageDataUrl,
  pixelAt,
  resizePlan,
  sniffImageType,
  socialPreset,
  splitPlan,
  spriteCss,
  toHex,
  FAVICON_SIZES,
  ICO_SIZES,
  SOCIAL_PRESETS,
} from './image-studio';

/**
 * These are the functions that decide what comes out of every page under
 * `/image`, so they are checked against arithmetic rather than against a
 * screenshot. A canvas is not needed for any of it: the geometry is numbers
 * and the filters are loops over RGBA bytes, which is exactly why they were
 * put here instead of inside the component.
 */

/** An RGBA buffer of one flat colour, the fixture most of these need. */
function flat(
  width: number,
  height: number,
  [red, green, blue, alpha]: [number, number, number, number],
) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
    pixels[index + 3] = alpha;
  }
  return pixels;
}

function at(pixels: Uint8ClampedArray, width: number, x: number, y: number) {
  const index = (y * width + x) * 4;
  return [
    pixels[index],
    pixels[index + 1],
    pixels[index + 2],
    pixels[index + 3],
  ];
}

function setPixel(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  [red, green, blue, alpha]: [number, number, number, number],
) {
  const index = (y * width + x) * 4;
  pixels[index] = red;
  pixels[index + 1] = green;
  pixels[index + 2] = blue;
  pixels[index + 3] = alpha;
}

describe('resizePlan', () => {
  it('fits inside a box without changing the proportions', () => {
    expect(
      resizePlan(4000, 3000, { mode: 'fit', width: 800, height: 800 }),
    ).toEqual({ width: 800, height: 600 });
    expect(
      resizePlan(3000, 4000, { mode: 'fit', width: 800, height: 800 }),
    ).toEqual({ width: 600, height: 800 });
  });

  it('takes one side and works the other out', () => {
    expect(
      resizePlan(1600, 900, { mode: 'fit', width: 800, height: 0 }),
    ).toEqual({ width: 800, height: 450 });
    expect(
      resizePlan(1600, 900, { mode: 'fit', width: 0, height: 450 }),
    ).toEqual({ width: 800, height: 450 });
  });

  it('takes both numbers literally when asked to', () => {
    expect(
      resizePlan(1600, 900, { mode: 'exact', width: 100, height: 100 }),
    ).toEqual({ width: 100, height: 100 });
  });

  it('scales by percentage, and rounds to whole pixels', () => {
    expect(resizePlan(101, 51, { mode: 'percent', percent: 50 })).toEqual({
      width: 51,
      height: 26,
    });
    expect(resizePlan(100, 100, { mode: 'percent', percent: 250 })).toEqual({
      width: 250,
      height: 250,
    });
  });

  it('never returns a zero side, because a zero canvas throws', () => {
    expect(resizePlan(10, 10, { mode: 'percent', percent: 1 })).toEqual({
      width: 1,
      height: 1,
    });
  });

  it('refuses the inputs that would silently produce nothing', () => {
    expect(() => resizePlan(0, 100, { mode: 'fit', width: 10 })).toThrow(
      /no usable size/u,
    );
    expect(() =>
      resizePlan(100, 100, { mode: 'fit', width: 0, height: 0 }),
    ).toThrow(/width, a height, or both/u);
    expect(() =>
      resizePlan(100, 100, { mode: 'exact', width: 0, height: 10 }),
    ).toThrow(/at least 1 pixel/u);
    expect(() => resizePlan(100, 100, { mode: 'percent', percent: 0 })).toThrow(
      /between 1% and 1000%/u,
    );
    expect(() =>
      resizePlan(100, 100, { mode: 'percent', percent: Number.NaN }),
    ).toThrow(/between 1% and 1000%/u);
  });
});

describe('clampRect', () => {
  it('keeps a rectangle inside the image', () => {
    expect(
      clampRect({ x: -5, y: -5, width: 500, height: 500 }, 100, 80),
    ).toEqual({ x: 0, y: 0, width: 100, height: 80 });
    expect(clampRect({ x: 90, y: 70, width: 50, height: 50 }, 100, 80)).toEqual(
      { x: 90, y: 70, width: 10, height: 10 },
    );
  });

  it('survives values a number input can produce', () => {
    expect(
      clampRect({ x: Number.NaN, y: 2.6, width: 0, height: -3 }, 10, 10),
    ).toEqual({ x: 0, y: 3, width: 1, height: 1 });
  });
});

describe('centredAspectCrop', () => {
  it('takes the middle of a wide picture for a square', () => {
    expect(centredAspectCrop(1000, 500, 1, 1)).toEqual({
      x: 250,
      y: 0,
      width: 500,
      height: 500,
    });
  });

  it('takes the middle of a tall picture for a wide frame', () => {
    expect(centredAspectCrop(600, 1200, 2, 1)).toEqual({
      x: 0,
      y: 450,
      width: 600,
      height: 300,
    });
  });

  it('leaves an already-matching picture alone', () => {
    expect(centredAspectCrop(800, 400, 1200, 600)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 400,
    });
  });

  it('refuses a ratio that is not a ratio', () => {
    expect(() => centredAspectCrop(100, 100, 0, 1)).toThrow(/positive/u);
  });
});

describe('the preset tables', () => {
  it('names every social size once, with usable dimensions', () => {
    const values = SOCIAL_PRESETS.map((preset) => preset.value);
    expect(new Set(values).size).toBe(values.length);
    for (const preset of SOCIAL_PRESETS) {
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
      expect(socialPreset(preset.value)).toEqual(preset);
    }
  });

  it('refuses a size nobody offered', () => {
    expect(() => socialPreset('myspace-banner')).toThrow(/listed sizes/u);
  });

  it('packs only squares an .ico can hold into the .ico', () => {
    for (const size of ICO_SIZES) {
      expect(FAVICON_SIZES).toContain(size);
      expect(size).toBeLessThanOrEqual(256);
    }
  });
});

describe('whole-image pixel passes', () => {
  it('desaturates with luma weights, not a flat average', () => {
    // Pure green is far brighter than pure blue to an eye, and the Rec. 709
    // weights are what say so. A flat average would make both 85.
    const pixels = new Uint8ClampedArray([0, 255, 0, 255, 0, 0, 255, 255]);
    applyGrayscale(pixels);
    expect(pixels[0]).toBe(182);
    expect(pixels[1]).toBe(182);
    expect(pixels[2]).toBe(182);
    expect(pixels[4]).toBe(18);
  });

  it('inverts colour but never alpha', () => {
    const pixels = new Uint8ClampedArray([10, 200, 255, 128]);
    applyInvert(pixels);
    expect([...pixels]).toEqual([245, 55, 0, 128]);
  });

  it('applies sepia in proportion to its strength', () => {
    const none = new Uint8ClampedArray([120, 120, 120, 255]);
    applySepia(none, 0);
    expect([...none]).toEqual([120, 120, 120, 255]);

    const full = new Uint8ClampedArray([120, 120, 120, 255]);
    applySepia(full, 100);
    expect(full[0]).toBeGreaterThan(full[1]!);
    expect(full[1]).toBeGreaterThan(full[2]!);
  });

  it('leaves brightness and contrast at 100% exactly as they were', () => {
    const pixels = new Uint8ClampedArray([17, 129, 240, 200]);
    applyBrightnessContrast(pixels, 100, 100);
    expect([...pixels]).toEqual([17, 129, 240, 200]);
  });

  it('pushes contrast away from mid grey and brightness away from black', () => {
    const darker = new Uint8ClampedArray([100, 100, 100, 255]);
    applyBrightnessContrast(darker, 100, 200);
    expect(darker[0]).toBe(72);

    const brighter = new Uint8ClampedArray([100, 100, 100, 255]);
    applyBrightnessContrast(brighter, 150, 100);
    expect(brighter[0]).toBe(150);
  });
});

describe('blur', () => {
  it('leaves a flat picture flat', () => {
    const pixels = flat(8, 8, [40, 60, 80, 255]);
    applyBoxBlur(pixels, 8, 8, 2);
    expect(at(pixels, 8, 4, 4)).toEqual([40, 60, 80, 255]);
    expect(at(pixels, 8, 0, 0)).toEqual([40, 60, 80, 255]);
  });

  it('spreads a single bright pixel into its neighbours', () => {
    const pixels = flat(9, 9, [0, 0, 0, 255]);
    setPixel(pixels, 9, 4, 4, [255, 255, 255, 255]);
    applyBoxBlur(pixels, 9, 9, 2);
    expect(pixels[(4 * 9 + 4) * 4]!).toBeLessThan(255);
    expect(pixels[(4 * 9 + 3) * 4]!).toBeGreaterThan(0);
    expect(pixels[(4 * 9 + 5) * 4]!).toBeGreaterThan(0);
  });

  it('does nothing at radius zero', () => {
    const pixels = flat(4, 4, [10, 20, 30, 255]);
    setPixel(pixels, 4, 1, 1, [200, 200, 200, 255]);
    applyBoxBlur(pixels, 4, 4, 0);
    expect(at(pixels, 4, 1, 1)).toEqual([200, 200, 200, 255]);
  });

  it('refuses pixel data that does not match the size it was given', () => {
    expect(() => applyBoxBlur(flat(4, 4, [0, 0, 0, 255]), 5, 5, 1)).toThrow(
      /does not match/u,
    );
  });

  it('blurs inside a rectangle and leaves everything outside it alone', () => {
    const pixels = flat(20, 20, [0, 0, 0, 255]);
    for (let y = 8; y < 12; y += 1) {
      for (let x = 8; x < 12; x += 1) {
        setPixel(pixels, 20, x, y, [255, 255, 255, 255]);
      }
    }
    const before = at(pixels, 20, 0, 0);
    applyRegionBlur(pixels, 20, 20, { x: 6, y: 6, width: 8, height: 8 }, 3);
    expect(at(pixels, 20, 0, 0)).toEqual(before);
    expect(at(pixels, 20, 19, 19)).toEqual(before);
    // Inside, the hard square has been softened into its surroundings.
    expect(pixels[(9 * 20 + 9) * 4]!).toBeLessThan(255);
    expect(pixels[(7 * 20 + 7) * 4]!).toBeGreaterThan(0);
  });
});

describe('pixelate', () => {
  it('replaces each block with the block average', () => {
    const pixels = flat(4, 4, [0, 0, 0, 255]);
    setPixel(pixels, 4, 0, 0, [200, 200, 200, 255]);
    applyPixelate(pixels, 4, 4, 2);
    // One 200 among four pixels in the top-left block averages to 50.
    expect(at(pixels, 4, 0, 0)).toEqual([50, 50, 50, 255]);
    expect(at(pixels, 4, 1, 1)).toEqual([50, 50, 50, 255]);
    expect(at(pixels, 4, 3, 3)).toEqual([0, 0, 0, 255]);
  });

  it('stays inside its rectangle', () => {
    const pixels = flat(8, 8, [0, 0, 0, 255]);
    setPixel(pixels, 8, 0, 0, [240, 240, 240, 255]);
    setPixel(pixels, 8, 5, 5, [240, 240, 240, 255]);
    applyPixelate(pixels, 8, 8, 4, { x: 4, y: 4, width: 4, height: 4 });
    expect(at(pixels, 8, 0, 0)).toEqual([240, 240, 240, 255]);
    expect(at(pixels, 8, 5, 5)).toEqual([15, 15, 15, 255]);
  });
});

describe('sharpen', () => {
  it('changes nothing at zero strength', () => {
    const pixels = flat(6, 6, [90, 90, 90, 255]);
    setPixel(pixels, 6, 3, 3, [180, 180, 180, 255]);
    applySharpen(pixels, 6, 6, 0);
    expect(at(pixels, 6, 3, 3)).toEqual([180, 180, 180, 255]);
  });

  it('pulls a bright pixel further from its neighbourhood', () => {
    const pixels = flat(9, 9, [90, 90, 90, 255]);
    setPixel(pixels, 9, 4, 4, [150, 150, 150, 255]);
    applySharpen(pixels, 9, 9, 100, 1);
    expect(pixels[(4 * 9 + 4) * 4]!).toBeGreaterThan(150);
    expect(pixels[(4 * 9 + 3) * 4]!).toBeLessThan(90);
  });
});

describe('median denoise', () => {
  it('removes a lone speck', () => {
    const pixels = flat(7, 7, [100, 100, 100, 255]);
    setPixel(pixels, 7, 3, 3, [255, 0, 0, 255]);
    applyMedianDenoise(pixels, 7, 7, 1);
    expect(at(pixels, 7, 3, 3)).toEqual([100, 100, 100, 255]);
  });

  it('leaves a real edge where it is, which a blur would not', () => {
    const width = 9;
    const pixels = flat(width, 9, [0, 0, 0, 255]);
    for (let y = 0; y < 9; y += 1) {
      for (let x = 5; x < 9; x += 1) {
        setPixel(pixels, width, x, y, [255, 255, 255, 255]);
      }
    }
    applyMedianDenoise(pixels, width, 9, 1);
    expect(at(pixels, width, 4, 4)).toEqual([0, 0, 0, 255]);
    expect(at(pixels, width, 5, 4)).toEqual([255, 255, 255, 255]);
  });
});

describe('extractPalette', () => {
  it('finds two colours in a two-colour picture, with their shares', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    for (let index = 0; index < 16; index += 1) {
      const at4 = index * 4;
      const red = index < 8 ? 255 : 0;
      pixels[at4] = red;
      pixels[at4 + 1] = 0;
      pixels[at4 + 2] = 255 - red;
      pixels[at4 + 3] = 255;
    }
    const palette = extractPalette(pixels, 2);
    expect(palette).toHaveLength(2);
    expect(palette.map((entry) => entry.hex).sort()).toEqual([
      '#0000ff',
      '#ff0000',
    ]);
    expect(palette[0]!.share).toBeCloseTo(0.5, 5);
  });

  it('ignores fully transparent pixels, so a cut-out has no phantom colour', () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0,
    ]);
    const palette = extractPalette(pixels, 4);
    expect(palette).toHaveLength(1);
    expect(palette[0]!.hex).toBe('#ff0000');
  });

  it('cannot return more swatches than the picture has colours', () => {
    expect(extractPalette(flat(8, 8, [12, 34, 56, 255]), 8)).toHaveLength(1);
  });

  it('never lists the same colour twice, and adds the shares together', () => {
    /*
      The regression. Median cut splits the widest box at its median; a box of
      identical colours has zero width on every axis, so asking a three-colour
      picture for eight swatches used to split one of them in half and print
      `#0000ff` twice at 12.5%. Seen on the built page on 2026-09-23.
    */
    const pixels = new Uint8ClampedArray(8 * 8 * 4);
    for (let index = 0; index < 64; index += 1) {
      const at4 = index * 4;
      const band = index < 32 ? 0 : index < 48 ? 1 : 2;
      pixels[at4] = band === 0 ? 255 : 0;
      pixels[at4 + 1] = band === 1 ? 255 : 0;
      pixels[at4 + 2] = band === 2 ? 255 : 0;
      pixels[at4 + 3] = 255;
    }
    const palette = extractPalette(pixels, 8);
    const hexes = palette.map((entry) => entry.hex);
    expect(new Set(hexes).size, hexes.join(' ')).toBe(hexes.length);
    // Green and blue cover a quarter each, so their order between themselves
    // is a tie and not something to assert.
    expect([...hexes].sort()).toEqual(['#0000ff', '#00ff00', '#ff0000']);
    expect(palette[0]!.hex).toBe('#ff0000');
    expect(palette[0]!.share).toBeCloseTo(0.5, 5);
    expect(palette[1]!.share).toBeCloseTo(0.25, 5);
    expect(palette[2]!.share).toBeCloseTo(0.25, 5);
    const total = palette.reduce((sum, entry) => sum + entry.share, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('refuses an image with nothing visible in it', () => {
    expect(() => extractPalette(flat(4, 4, [0, 0, 0, 0]), 4)).toThrow(
      /no visible pixels/u,
    );
  });

  it('refuses pixel data that is not whole RGBA values', () => {
    expect(() => extractPalette(new Uint8ClampedArray(7), 4)).toThrow(
      /complete RGBA/u,
    );
  });
});

describe('reading one pixel', () => {
  it('answers hex and rgb for the pixel asked for', () => {
    const pixels = flat(3, 3, [0, 0, 0, 255]);
    setPixel(pixels, 3, 2, 1, [18, 52, 86, 255]);
    expect(pixelAt(pixels, 3, 3, 2, 1)).toEqual({
      red: 18,
      green: 52,
      blue: 86,
      alpha: 255,
      hex: '#123456',
      rgb: 'rgb(18, 52, 86)',
    });
  });

  it('refuses a point outside the picture rather than reading a stray byte', () => {
    expect(() => pixelAt(flat(3, 3, [0, 0, 0, 255]), 3, 3, 3, 0)).toThrow(
      /outside the image/u,
    );
    expect(() => pixelAt(flat(3, 3, [0, 0, 0, 255]), 3, 3, -1, 0)).toThrow(
      /outside the image/u,
    );
  });

  it('pads every hex channel to two digits', () => {
    expect(toHex(1, 2, 3)).toBe('#010203');
    expect(toHex(-5, 300, 128)).toBe('#00ff80');
  });
});

describe('geometry', () => {
  it('adds the border to both sides and says where the picture starts', () => {
    expect(borderPlan(100, 50, 10)).toEqual({
      width: 120,
      height: 70,
      offset: 10,
    });
    expect(borderPlan(100, 50, -4)).toEqual({
      width: 100,
      height: 50,
      offset: 0,
    });
  });

  it('never lets two corner radiuses overlap', () => {
    expect(cornerRadius(100, 40, 999, 'px')).toBe(20);
    expect(cornerRadius(100, 40, 50, 'percent')).toBe(20);
    expect(cornerRadius(200, 200, 10, 'percent')).toBe(20);
    expect(cornerRadius(200, 200, 0, 'px')).toBe(0);
  });

  it('cuts a grid that covers every pixel exactly once', () => {
    const tiles = splitPlan(101, 50, 3, 3);
    expect(tiles).toHaveLength(9);
    const covered = tiles.reduce(
      (total, tile) => total + tile.width * tile.height,
      0,
    );
    expect(covered).toBe(101 * 50);
    expect(tiles[0]).toMatchObject({ row: 1, column: 1, x: 0, y: 0 });
    const last = tiles[tiles.length - 1]!;
    expect(last.x + last.width).toBe(101);
    expect(last.y + last.height).toBe(50);
  });

  it('refuses to cut more pieces than there are pixels', () => {
    expect(() => splitPlan(4, 4, 8, 2)).toThrow(/too small/u);
  });

  it('lays a grid out with an even gap around and between the cells', () => {
    const plan = gridPlan(5, 2, 100, 80, 10);
    expect(plan.width).toBe(2 * 100 + 3 * 10);
    expect(plan.height).toBe(3 * 80 + 4 * 10);
    expect(plan.cells).toHaveLength(5);
    expect(plan.cells[0]).toMatchObject({ x: 10, y: 10 });
    expect(plan.cells[1]).toMatchObject({ x: 120, y: 10 });
    expect(plan.cells[2]).toMatchObject({ x: 10, y: 100 });
  });

  it('writes one CSS rule per sprite frame, at its own offset', () => {
    const plan = gridPlan(3, 2, 64, 64, 0);
    const css = spriteCss(plan.cells, 'icons.png', 'icon');
    expect(css).toContain("background-image: url('icons.png');");
    expect(css).toContain('.icon--1 {');
    expect(css).toContain('.icon--3 {');
    expect(css).toContain('background-position: -64px -0px;');
    expect(css).not.toContain('.icon--4');
  });

  it('will not let a class name carry anything but a class name', () => {
    const plan = gridPlan(1, 1, 8, 8, 0);
    expect(spriteCss(plan.cells, 'a.png', 'a{}</style>')).toContain('.astyle');
    expect(spriteCss(plan.cells, 'a.png', '')).toContain('.sprite');
  });

  it('places an overlay at each corner and in the middle', () => {
    expect(overlayOrigin(1000, 600, 100, 40, 'top-left', 20)).toEqual({
      x: 20,
      y: 20,
    });
    expect(overlayOrigin(1000, 600, 100, 40, 'bottom-right', 20)).toEqual({
      x: 880,
      y: 540,
    });
    expect(overlayOrigin(1000, 600, 100, 40, 'centre', 20)).toEqual({
      x: 450,
      y: 280,
    });
    expect(overlayOrigin(1000, 600, 100, 40, 'top-centre', 0)).toEqual({
      x: 450,
      y: 0,
    });
  });
});

describe('Base64 in and out', () => {
  it('reads a data URL and keeps its media type', () => {
    expect(parseImageDataUrl('data:image/png;base64,AAAA')).toEqual({
      mediaType: 'image/png',
      base64: 'AAAA',
    });
  });

  it('accepts a bare paste and leaves the type to the bytes', () => {
    expect(parseImageDataUrl('  AAAA\n')).toEqual({
      mediaType: '',
      base64: 'AAAA',
    });
  });

  it('strips the line breaks an email client adds', () => {
    expect(parseImageDataUrl('data:image/png;base64,AA\nAA\n').base64).toBe(
      'AAAA',
    );
  });

  it('says which way it is wrong rather than producing a broken file', () => {
    expect(() => parseImageDataUrl('data:image/png,notbase64')).toThrow(
      /not Base64 encoded/u,
    );
    expect(() => parseImageDataUrl('   ')).toThrow(/Paste some Base64/u);
    expect(() => parseImageDataUrl('AA@A')).toThrow(/stray characters/u);
    expect(() => parseImageDataUrl('AAA')).toThrow(/truncated/u);
  });

  it('names a format from its signature, not from what someone typed', () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(sniffImageType(png)).toBe('image/png');
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      'image/jpeg',
    );
    expect(
      sniffImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])),
    ).toBe('image/gif');
    expect(sniffImageType(new Uint8Array([0x42, 0x4d, 0x00]))).toBe(
      'image/bmp',
    );
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(sniffImageType(webp)).toBe('image/webp');
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns="x"/>'))).toBe(
      'image/svg+xml',
    );
    expect(sniffImageType(new Uint8Array([1, 2, 3, 4]))).toBe('');
  });

  it('gives an unknown type a neutral extension rather than a wrong one', () => {
    expect(extensionForImageType('image/jpeg')).toBe('jpg');
    expect(extensionForImageType('image/x-icon')).toBe('ico');
    expect(extensionForImageType('application/pdf')).toBe('bin');
  });
});

describe('naming the file that comes out', () => {
  it('keeps the stem, replaces the extension, adds what was done', () => {
    expect(outputFileName('holiday.jpeg', 'resized', 'png')).toBe(
      'holiday-resized.png',
    );
  });

  it('survives a name a file system would not', () => {
    expect(outputFileName('a/b:c*.png', '800x600', 'webp')).toBe(
      'a-b-c--800x600.webp',
    );
    expect(outputFileName('', 'x', 'png')).toBe('image-x.png');
    expect(outputFileName('.gitignore', 'x', 'png')).toBe('image-x.png');
  });
});
