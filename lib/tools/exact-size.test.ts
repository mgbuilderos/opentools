import { crc32 } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import {
  MIN_SHRINK_EDGE,
  QUALITY_CEILING,
  QUALITY_FLOOR,
  aspectDiffers,
  checkConstraints,
  fitToSize,
  maxBytesFor,
  minBytesFor,
  planDraw,
  readDpi,
  readJpegDpi,
  readPngDpi,
  resolveOutputSize,
  setJpegDpi,
  setPngDpi,
  sniffFormat,
  validateRequest,
  type Encode,
  type ExactSizeRequest,
} from './exact-size';

/** A structurally valid JPEG prefix (SOI + JFIF APP0) padded to `length`. */
function fakeJpeg(length: number, withJfif = true) {
  const head = withJfif
    ? [
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      ]
    : [0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00];
  const bytes = new Uint8Array(Math.max(length, head.length + 2));
  bytes.set(head);
  bytes[bytes.length - 2] = 0xff;
  bytes[bytes.length - 1] = 0xd9;
  return bytes;
}

function pngChunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** A PNG with a real IHDR and an IDAT of `payload` bytes. */
function fakePng(
  width: number,
  height: number,
  payload = 32,
  extra: Uint8Array[] = [],
) {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    ...extra,
    pngChunk('IDAT', new Uint8Array(payload)),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pngChunkTypes(bytes: Uint8Array) {
  const types: string[] = [];
  let offset = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const stored = view.getUint32(offset + 8 + length);
    expect(stored, `${type} CRC`).toBe(
      crc32(bytes.subarray(offset + 4, offset + 8 + length)),
    );
    types.push(type);
    offset += 12 + length;
  }
  return types;
}

/** JPEG size model: grows with pixels and quality. */
const jpegSize = (w: number, h: number, q: number) =>
  Math.round(600 + w * h * (0.05 + (q / 100) ** 2 * 1.2));

function jpegEncoder(size = jpegSize) {
  const calls: Array<[number, number, number]> = [];
  const encode: Encode = async (w, h, q) => {
    calls.push([w, h, q]);
    return fakeJpeg(size(w, h, q));
  };
  return { encode, calls };
}

const request = (
  overrides: Partial<ExactSizeRequest> = {},
): ExactSizeRequest => ({
  format: 'image/jpeg',
  maxKb: 50,
  kbUnit: 1024,
  fit: 'crop',
  ...overrides,
});

describe('exact-size units and validation', () => {
  it('uses 1,024 or 1,000 bytes per KB and rounds limits inward', () => {
    expect(maxBytesFor(50, 1024)).toBe(51200);
    expect(maxBytesFor(50, 1000)).toBe(50000);
    expect(maxBytesFor(19.9, 1024)).toBe(20377);
    expect(minBytesFor(19.9, 1024)).toBe(20378);
  });

  it('rejects impossible requests with a reason', () => {
    expect(validateRequest(request())).toBeNull();
    expect(validateRequest(request({ maxKb: 0 }))).toMatch(/maximum/u);
    expect(validateRequest(request({ maxKb: Number.NaN }))).toMatch(/maximum/u);
    expect(validateRequest(request({ minKb: 60 }))).toMatch(/minimum/u);
    expect(validateRequest(request({ minKb: 50 }))).toBeNull();
    expect(validateRequest(request({ width: 0 }))).toMatch(/Width/u);
    expect(validateRequest(request({ height: 12.5 }))).toMatch(/Height/u);
    expect(validateRequest(request({ width: 12001 }))).toMatch(/Width/u);
    expect(validateRequest(request({ dpi: 0 }))).toMatch(/DPI/u);
    expect(validateRequest(request({ dpi: 70000 }))).toMatch(/DPI/u);
  });
});

describe('exact-size geometry', () => {
  it('keeps the aspect ratio when only one edge is given', () => {
    expect(resolveOutputSize(1200, 800, 300)).toEqual({
      width: 300,
      height: 200,
    });
    expect(resolveOutputSize(1200, 800, undefined, 100)).toEqual({
      width: 150,
      height: 100,
    });
    expect(resolveOutputSize(1200, 800, 200, 230)).toEqual({
      width: 200,
      height: 230,
    });
    expect(resolveOutputSize(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it('detects a different shape but not a rounding pixel', () => {
    expect(aspectDiffers(1200, 800, 300, 200)).toBe(false);
    expect(aspectDiffers(1001, 667, 300, 200)).toBe(false);
    expect(aspectDiffers(1200, 800, 200, 230)).toBe(true);
  });

  it('crops the centre, pads to fit or stretches', () => {
    // 400×200 source into a 100×100 square.
    expect(planDraw(400, 200, 100, 100, 'crop')).toEqual({
      sx: 100,
      sy: 0,
      sw: 200,
      sh: 200,
      dx: 0,
      dy: 0,
      dw: 100,
      dh: 100,
    });
    expect(planDraw(400, 200, 100, 100, 'pad')).toEqual({
      sx: 0,
      sy: 0,
      sw: 400,
      sh: 200,
      dx: 0,
      dy: 25,
      dw: 100,
      dh: 50,
    });
    expect(planDraw(400, 200, 100, 100, 'stretch')).toEqual({
      sx: 0,
      sy: 0,
      sw: 400,
      sh: 200,
      dx: 0,
      dy: 0,
      dw: 100,
      dh: 100,
    });
  });
});

describe('exact-size DPI metadata', () => {
  it('rewrites the JFIF density of an existing APP0 in place', () => {
    const source = fakeJpeg(64);
    const stamped = setJpegDpi(source, 300);
    expect(stamped.length).toBe(source.length);
    // units = 1 (dpi), Xdensity = Ydensity = 300 (0x012C), big-endian.
    expect([...stamped.subarray(13, 18)]).toEqual([1, 0x01, 0x2c, 0x01, 0x2c]);
    expect(readJpegDpi(stamped)).toEqual({ units: 1, x: 300, y: 300 });
    expect(readDpi(stamped)).toBe(300);
    expect(readJpegDpi(source)).toEqual({ units: 0, x: 1, y: 1 });
    expect(readDpi(source)).toBeNull();
  });

  it('inserts a JFIF APP0 right after SOI when the JPEG has none', () => {
    const source = fakeJpeg(40, false);
    expect(readJpegDpi(source)).toBeNull();
    const stamped = setJpegDpi(source, 200);
    expect(stamped.length).toBe(source.length + 18);
    expect([...stamped.subarray(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xe0]);
    expect(new TextDecoder().decode(stamped.subarray(6, 10))).toBe('JFIF');
    expect(readDpi(stamped)).toBe(200);
    // The original segments follow unchanged.
    expect([...stamped.subarray(20)]).toEqual([...source.subarray(2)]);
  });

  it('writes PNG pHYs in pixels per metre after IHDR with a valid CRC', () => {
    const source = fakePng(10, 10);
    const stamped = setPngDpi(source, 300);
    expect(pngChunkTypes(stamped)).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND']);
    const phys = readPngDpi(stamped)!;
    expect(phys.unit).toBe(1);
    expect(phys.pixelsPerMetreX).toBe(11811); // round(300 / 0.0254)
    expect(phys.pixelsPerMetreY).toBe(11811);
    expect(readDpi(stamped)).toBe(300);
    expect(stamped.length).toBe(source.length + 21);
  });

  it('replaces an existing pHYs instead of adding a second one', () => {
    const old = new Uint8Array(9);
    new DataView(old.buffer).setUint32(0, 2835);
    new DataView(old.buffer).setUint32(4, 2835);
    old[8] = 1;
    const source = fakePng(4, 4, 16, [pngChunk('pHYs', old)]);
    expect(readDpi(source)).toBe(72);
    const stamped = setPngDpi(source, 96);
    expect(pngChunkTypes(stamped)).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND']);
    expect(readDpi(stamped)).toBe(96);
  });

  it('round-trips every whole DPI a user can type', () => {
    for (const dpi of [1, 72, 96, 150, 200, 240, 300, 600, 1200, 65535]) {
      expect(readDpi(setPngDpi(fakePng(2, 2), dpi)), `png ${dpi}`).toBe(dpi);
      expect(readDpi(setJpegDpi(fakeJpeg(32), dpi)), `jpeg ${dpi}`).toBe(dpi);
    }
  });
});

describe('exact-size quality search', () => {
  it('converges on the highest quality that fits under the maximum', async () => {
    const { encode, calls } = jpegEncoder();
    const maxBytes = 30_000;
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 200,
      height: 230,
      maxBytes,
      allowSmallerPixels: false,
      encode,
    });
    expect(result.outcome).toBe('met');
    expect(result.pixelsReduced).toBe(false);
    const { quality, bytes, width, height } = result.attempt;
    expect([width, height]).toEqual([200, 230]);
    expect(bytes.length).toBeLessThanOrEqual(maxBytes);
    expect(quality).toBeGreaterThanOrEqual(QUALITY_FLOOR);
    expect(jpegSize(200, 230, quality! + 1)).toBeGreaterThan(maxBytes);
    // 100, 10, then a binary search over 90 steps: at most 9 encodes.
    expect(calls.length).toBeLessThanOrEqual(9);
    expect(result.encodes).toBe(calls.length);
  });

  it('uses full quality straight away when it already fits', async () => {
    const { encode, calls } = jpegEncoder();
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 50,
      height: 50,
      maxBytes: 100_000,
      allowSmallerPixels: false,
      encode,
    });
    expect(result.outcome).toBe('met');
    expect(result.attempt.quality).toBe(QUALITY_CEILING);
    expect(calls).toHaveLength(1);
  });

  it('prefers a quality inside the min–max window', async () => {
    const { encode } = jpegEncoder();
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 200,
      height: 230,
      maxBytes: 40_000,
      minBytes: 20_000,
      allowSmallerPixels: false,
      encode,
    });
    expect(result.outcome).toBe('met');
    expect(result.attempt.bytes.length).toBeGreaterThanOrEqual(20_000);
    expect(result.attempt.bytes.length).toBeLessThanOrEqual(40_000);
  });

  it('counts the DPI bytes it adds against the maximum', async () => {
    // Every raw encode is exactly 1,000 bytes without a JFIF header, so the
    // inserted APP0 makes each file 1,018 bytes.
    const encode: Encode = async () => fakeJpeg(1000, false);
    const tight = await fitToSize({
      format: 'image/jpeg',
      width: 10,
      height: 10,
      maxBytes: 1010,
      dpi: 300,
      allowSmallerPixels: false,
      encode,
    });
    expect(tight.outcome).toBe('over-max');
    const roomy = await fitToSize({
      format: 'image/jpeg',
      width: 10,
      height: 10,
      maxBytes: 1018,
      dpi: 300,
      allowSmallerPixels: false,
      encode,
    });
    expect(roomy.outcome).toBe('met');
    expect(roomy.attempt.bytes.length).toBe(1018);
    expect(readDpi(roomy.attempt.bytes)).toBe(300);
  });

  it('still returns a file under the limit when size is not monotonic in quality', async () => {
    const bumpy = (w: number, h: number, q: number) =>
      jpegSize(w, h, q) + (q % 7 === 0 ? 9_000 : 0);
    const { encode } = jpegEncoder(bumpy);
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 200,
      height: 230,
      maxBytes: 30_000,
      allowSmallerPixels: false,
      encode,
    });
    expect(result.outcome).toBe('met');
    expect(result.attempt.bytes.length).toBeLessThanOrEqual(30_000);
  });
});

describe('exact-size unreachable targets', () => {
  it('reports over-max at the requested pixels and does not shrink them', async () => {
    const { encode, calls } = jpegEncoder();
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 2000,
      height: 2000,
      maxBytes: 20_000,
      allowSmallerPixels: false,
      encode,
    });
    expect(result.outcome).toBe('over-max');
    expect(result.pixelsReduced).toBe(false);
    expect(calls.every(([w, h]) => w === 2000 && h === 2000)).toBe(true);
    expect(result.attempt.quality).toBe(QUALITY_FLOOR);
    expect(result.attempt.bytes.length).toBeGreaterThan(20_000);
  });

  it('reduces pixels only when allowed, keeping the shape and meeting the limit', async () => {
    const { encode } = jpegEncoder();
    const maxBytes = 20_000;
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 2000,
      height: 1000,
      maxBytes,
      allowSmallerPixels: true,
      encode,
    });
    expect(result.outcome).toBe('met');
    expect(result.pixelsReduced).toBe(true);
    const { width, height, bytes } = result.attempt;
    expect(width).toBeLessThan(2000);
    expect(Math.abs(width / height - 2)).toBeLessThan(0.02);
    expect(bytes.length).toBeLessThanOrEqual(maxBytes);
    // Close to the largest size that could fit at the lowest quality.
    expect(jpegSize(width + 4, height + 2, QUALITY_FLOOR)).toBeGreaterThan(
      maxBytes,
    );
  });

  it('reports over-max when even the smallest allowed pixels are too big', async () => {
    const { encode, calls } = jpegEncoder();
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 800,
      height: 800,
      maxBytes: 500,
      allowSmallerPixels: true,
      encode,
    });
    expect(result.outcome).toBe('over-max');
    expect(result.pixelsReduced).toBe(false);
    expect([result.attempt.width, result.attempt.height]).toEqual([800, 800]);
    expect(calls.some(([w]) => w === MIN_SHRINK_EDGE)).toBe(true);
  });

  it('reports under-min honestly at full quality and never pads the file', async () => {
    const { encode } = jpegEncoder();
    const raw = jpegSize(40, 40, 100);
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 40,
      height: 40,
      maxBytes: 100_000,
      minBytes: 50_000,
      allowSmallerPixels: false,
      encode,
    });
    expect(result.outcome).toBe('under-min');
    expect(result.gapBetweenQualities).toBe(false);
    expect(result.attempt.quality).toBe(100);
    expect(result.attempt.bytes.length).toBe(raw);
  });

  it('flags a min–max window that falls between two quality steps', async () => {
    // Quality 50 and below: 5,000 bytes. Above 50: 9,000 bytes.
    const step: Encode = async (_w, _h, q) => fakeJpeg(q > 50 ? 9000 : 5000);
    const result = await fitToSize({
      format: 'image/jpeg',
      width: 10,
      height: 10,
      maxBytes: 8000,
      minBytes: 6000,
      allowSmallerPixels: false,
      encode: step,
    });
    expect(result.outcome).toBe('under-min');
    expect(result.gapBetweenQualities).toBe(true);
    expect(result.attempt.quality).toBe(50);
  });

  it('controls PNG size only through pixels', async () => {
    const calls: number[] = [];
    const encode: Encode = async (w, h, q) => {
      calls.push(q);
      return fakePng(w, h, Math.round((w * h * 3) / 2));
    };
    const fits = await fitToSize({
      format: 'image/png',
      width: 50,
      height: 50,
      maxBytes: 10_000,
      dpi: 300,
      allowSmallerPixels: false,
      encode,
    });
    expect(fits.outcome).toBe('met');
    expect(fits.attempt.quality).toBeNull();
    expect(readDpi(fits.attempt.bytes)).toBe(300);
    expect(sniffFormat(fits.attempt.bytes)).toBe('image/png');

    const tooBig = await fitToSize({
      format: 'image/png',
      width: 400,
      height: 400,
      maxBytes: 10_000,
      allowSmallerPixels: false,
      encode,
    });
    expect(tooBig.outcome).toBe('over-max');

    const shrunk = await fitToSize({
      format: 'image/png',
      width: 400,
      height: 400,
      maxBytes: 10_000,
      allowSmallerPixels: true,
      encode,
    });
    expect(shrunk.outcome).toBe('met');
    expect(shrunk.pixelsReduced).toBe(true);
    expect(shrunk.attempt.width).toBe(shrunk.attempt.height);
    expect(shrunk.attempt.bytes.length).toBeLessThanOrEqual(10_000);
  });
});

describe('exact-size constraint checks', () => {
  it('passes only what the saved bytes actually satisfy', () => {
    const bytes = setJpegDpi(fakeJpeg(30_000), 300);
    const req = request({
      maxKb: 50,
      minKb: 20,
      width: 200,
      height: 230,
      dpi: 300,
    });
    const checks = checkConstraints(bytes, { width: 200, height: 230 }, req, {
      width: 200,
      height: 230,
    });
    expect(checks.map((c) => [c.label, c.pass])).toEqual([
      ['Maximum size', true],
      ['Minimum size', true],
      ['Pixels', true],
      ['DPI', true],
      ['Format', true],
    ]);

    const failing = checkConstraints(
      fakeJpeg(60_000),
      { width: 199, height: 230 },
      request({
        maxKb: 50,
        width: 200,
        height: 230,
        dpi: 300,
        format: 'image/png',
      }),
      { width: 200, height: 230 },
    );
    expect(failing.map((c) => [c.label, c.pass])).toEqual([
      ['Maximum size', false],
      ['Pixels', false],
      ['DPI', false],
      ['Format', false],
    ]);
    expect(failing.find((c) => c.label === 'DPI')?.actual).toBe('not set');
  });

  it('applies the chosen KB definition to the limit', () => {
    const bytes = fakeJpeg(50_500);
    const [binary] = checkConstraints(
      bytes,
      { width: 1, height: 1 },
      request({ maxKb: 50 }),
      { width: 1, height: 1 },
    );
    const [decimal] = checkConstraints(
      bytes,
      { width: 1, height: 1 },
      request({ maxKb: 50, kbUnit: 1000 }),
      { width: 1, height: 1 },
    );
    expect(binary!.pass).toBe(true);
    expect(decimal!.pass).toBe(false);
  });
});
