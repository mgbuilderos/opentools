import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { encodeGif, type GifFrame } from './gif';

/**
 * **Verified by Pillow, and the approved bytes are committed.**
 *
 * Pillow is not a dependency of this project and must not become one — the suite
 * has to pass on a machine with nothing installed. So the check was run once and
 * its result frozen as `golden-flat.gif` and `golden-gradient.gif`, which these
 * tests compare against byte for byte. That is the same arrangement ffmpeg has
 * for the MP4 writer and openpyxl for the spreadsheet writer.
 *
 * What Pillow read back from these exact files on 2026-09-20:
 *
 *     golden-flat.gif      (16, 16)  frames=4  loop=0  duration=200  185 bytes
 *       frame colours: (255,0,0) (0,255,0) (0,0,255) (255,255,0)
 *     golden-gradient.gif  (64, 64)  frames=1  loop=0  duration=100  1365 bytes
 *       64 distinct colours after quantising to a 64-entry palette
 *
 * `ffprobe` agrees independently on the first: `gif,16,16,4`.
 *
 * The flat-colour readback is the strongest single result here. Those four
 * colours came back **exactly**, which means the palette, the LZW coding and the
 * frame framing are all correct — a fault in any one of them would have shifted
 * or smeared them.
 *
 * **If a golden test fails**, the output changed. That may be intended, but it is
 * no longer covered by the run above: re-open the file with Pillow or ffmpeg and
 * regenerate the fixture deliberately rather than editing the test to pass.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

const FLAT_COLOURS: [number, number, number][] = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
];

function flatFrames(size = 16, delay = 20): GifFrame[] {
  return FLAT_COLOURS.map(([r, g, b]) => {
    const rgba = new Uint8Array(size * size * 4);
    for (let pixel = 0; pixel < size * size; pixel += 1) {
      rgba[pixel * 4] = r;
      rgba[pixel * 4 + 1] = g;
      rgba[pixel * 4 + 2] = b;
      rgba[pixel * 4 + 3] = 255;
    }
    return { rgba, delayCentiseconds: delay };
  });
}

function gradient(size = 64): Uint8Array {
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const at = (y * size + x) * 4;
      rgba[at] = x * 4;
      rgba[at + 1] = y * 4;
      rgba[at + 2] = 128;
      rgba[at + 3] = 255;
    }
  }
  return rgba;
}

describe('the encoder still produces the bytes Pillow accepted', () => {
  it('reproduces the four-frame animation exactly', () => {
    const bytes = encodeGif(flatFrames(), { width: 16, height: 16 });
    expect(Array.from(bytes)).toEqual(Array.from(load('golden-flat.gif')));
  });

  it('reproduces the quantised gradient exactly', () => {
    const bytes = encodeGif([{ rgba: gradient(), delayCentiseconds: 10 }], {
      width: 64,
      height: 64,
      colors: 64,
    });
    expect(Array.from(bytes)).toEqual(Array.from(load('golden-gradient.gif')));
  });

  it('is deterministic, or a golden file would prove nothing', () => {
    const once = encodeGif(flatFrames(), { width: 16, height: 16 });
    const twice = encodeGif(flatFrames(), { width: 16, height: 16 });
    expect(Array.from(once)).toEqual(Array.from(twice));
  });

  it('would notice a change, rather than passing regardless', () => {
    // A golden test that cannot fail is decoration.
    const different = encodeGif(flatFrames(16, 5), { width: 16, height: 16 });
    expect(Array.from(different)).not.toEqual(
      Array.from(load('golden-flat.gif')),
    );
  });
});

describe('the parts a GIF reader checks', () => {
  it('writes a GIF89a header and a trailer', () => {
    const bytes = encodeGif(flatFrames(), { width: 16, height: 16 });
    expect(new TextDecoder().decode(bytes.subarray(0, 6))).toBe('GIF89a');
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });

  it('records the size where the reader looks for it', () => {
    const bytes = encodeGif(flatFrames(), { width: 16, height: 16 });
    // Little-endian, immediately after the six-byte signature.
    expect(bytes[6] | (bytes[7] << 8)).toBe(16);
    expect(bytes[8] | (bytes[9] << 8)).toBe(16);
  });

  it('includes the Netscape extension, or the animation plays once', () => {
    // The single most surprising thing about GIF: without this block a viewer
    // shows the frames one time and stops.
    const bytes = encodeGif(flatFrames(), { width: 16, height: 16 });
    expect(new TextDecoder().decode(bytes).includes('NETSCAPE2.0')).toBe(true);
  });

  it('writes one graphic control block per frame', () => {
    // 0x21 0xF9 introduces a graphic control extension, which carries the delay.
    const bytes = encodeGif(flatFrames(), { width: 16, height: 16 });
    let found = 0;
    for (let at = 0; at < bytes.length - 1; at += 1) {
      if (bytes[at] === 0x21 && bytes[at + 1] === 0xf9) found += 1;
    }
    expect(found).toBe(4);
  });

  it('pads the colour table to a power of two', () => {
    // A reader computes the table's size from three bits in the header, so a
    // table of any other length puts the image data at the wrong offset.
    for (const colors of [2, 3, 5, 17, 200]) {
      const bytes = encodeGif([{ rgba: gradient(32), delayCentiseconds: 10 }], {
        width: 32,
        height: 32,
        colors,
      });
      const tableBits = (bytes[10] & 0x07) + 1;
      const declared = 1 << tableBits;
      expect(declared).toBeGreaterThanOrEqual(Math.min(colors, 256));
      // The table sits right after the 13-byte header, three bytes per entry.
      expect(bytes.length).toBeGreaterThan(13 + declared * 3);
    }
  });
});

describe('colour and dithering', () => {
  it('keeps flat colours exactly, with no palette to approximate them', () => {
    // Four colours into a 256-entry palette: nothing should be approximated.
    // Pillow confirmed these come back exactly; this asserts the palette itself
    // holds them, which is what makes that true.
    const bytes = encodeGif(flatFrames(), { width: 16, height: 16 });
    const tableStart = 13;
    const table: string[] = [];
    for (let entry = 0; entry < 4; entry += 1) {
      const at = tableStart + entry * 3;
      table.push(`${bytes[at]},${bytes[at + 1]},${bytes[at + 2]}`);
    }
    for (const [r, g, b] of FLAT_COLOURS) {
      expect(table).toContain(`${r},${g},${b}`);
    }
  });

  it('makes a smaller file with fewer colours', () => {
    const rgba = gradient();
    const many = encodeGif([{ rgba, delayCentiseconds: 10 }], {
      width: 64,
      height: 64,
      colors: 256,
    });
    const few = encodeGif([{ rgba, delayCentiseconds: 10 }], {
      width: 64,
      height: 64,
      colors: 8,
    });
    expect(few.length).toBeLessThan(many.length);
  });

  it('costs size when dithering, which is the trade it makes', () => {
    // Dithering breaks banding into noise, and noise compresses worse than flat
    // areas. A dithered file being *smaller* would mean it was not dithering.
    const rgba = gradient();
    const plain = encodeGif([{ rgba, delayCentiseconds: 10 }], {
      width: 64,
      height: 64,
      colors: 16,
    });
    const dithered = encodeGif([{ rgba, delayCentiseconds: 10 }], {
      width: 64,
      height: 64,
      colors: 16,
      dither: true,
    });
    expect(dithered.length).toBeGreaterThan(plain.length);
    expect(Array.from(dithered)).not.toEqual(Array.from(plain));
  });

  it('does not alter the caller’s frame while dithering it', () => {
    // Floyd-Steinberg spreads error into neighbouring pixels. Doing that in
    // place would corrupt the caller's buffer, and a second encode of the same
    // frames would then produce something different.
    const rgba = gradient(32);
    const before = Array.from(rgba);
    encodeGif([{ rgba, delayCentiseconds: 10 }], {
      width: 32,
      height: 32,
      colors: 8,
      dither: true,
    });
    expect(Array.from(rgba)).toEqual(before);
  });

  it('handles an image with fewer colours than the palette has room for', () => {
    // Median cut runs out of boxes to split. It must stop rather than loop.
    const rgba = new Uint8Array(8 * 8 * 4);
    for (let pixel = 0; pixel < 64; pixel += 1) {
      rgba[pixel * 4] = pixel < 32 ? 0 : 255;
      rgba[pixel * 4 + 3] = 255;
    }
    const bytes = encodeGif([{ rgba, delayCentiseconds: 10 }], {
      width: 8,
      height: 8,
      colors: 256,
    });
    expect(new TextDecoder().decode(bytes.subarray(0, 6))).toBe('GIF89a');
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });
});

describe('what it refuses', () => {
  it('refuses to write no frames', () => {
    expect(() => encodeGif([], { width: 8, height: 8 })).toThrow(/no frames/u);
  });

  it('refuses a frame whose byte count does not match the size', () => {
    // The commonest caller mistake, and silently encoding it would produce a
    // skewed image rather than an error.
    const wrong = { rgba: new Uint8Array(10), delayCentiseconds: 10 };
    expect(() => encodeGif([wrong], { width: 8, height: 8 })).toThrow(
      /8x8 needs 256/u,
    );
  });

  it('refuses a zero-sized image', () => {
    expect(() => encodeGif(flatFrames(), { width: 0, height: 8 })).toThrow(
      /at least one pixel/u,
    );
  });

  it('clamps a silly palette size rather than failing', () => {
    const rgba = gradient(16);
    for (const colors of [0, 1, 1000]) {
      const bytes = encodeGif([{ rgba, delayCentiseconds: 10 }], {
        width: 16,
        height: 16,
        colors,
      });
      expect(bytes[bytes.length - 1]).toBe(0x3b);
    }
  });
});
