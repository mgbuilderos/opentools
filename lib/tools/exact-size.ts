/**
 * Exact-size image engine: fit an image to a byte limit at exact pixels and
 * write real DPI metadata.
 *
 * Everything here is pure. The page supplies an `encode` function that draws
 * and encodes with Canvas; the engine decides which qualities and pixel sizes
 * to try, stamps DPI into the encoded bytes and judges the result on the bytes
 * it will actually hand back. It never pads a file and never changes the pixels
 * unless the caller explicitly allows it.
 */

export type ExactOutputFormat = 'image/jpeg' | 'image/png';
export type FitMode = 'crop' | 'pad' | 'stretch';
/** Bytes in one KB. 1,024 by default; some portals count 1,000. */
export type KbUnit = 1024 | 1000;

/** JPEG quality is searched in whole percent inside this range. */
export const QUALITY_FLOOR = 10;
export const QUALITY_CEILING = 100;
/** "Allow smaller pixels" never shrinks the shorter edge below this. */
export const MIN_SHRINK_EDGE = 16;
export const MAX_EDGE = 12000;
export const MAX_DPI = 65535;

export interface ExactSizeRequest {
  format: ExactOutputFormat;
  maxKb: number;
  minKb?: number;
  kbUnit: KbUnit;
  width?: number;
  height?: number;
  fit: FitMode;
  dpi?: number;
}

/** Largest byte count that still counts as "at most maxKb". */
export function maxBytesFor(kb: number, unit: KbUnit) {
  return Math.floor(kb * unit);
}

/** Smallest byte count that still counts as "at least minKb". */
export function minBytesFor(kb: number, unit: KbUnit) {
  return Math.ceil(kb * unit);
}

const isWhole = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

/** A reason the request cannot run, or null when it is valid. */
export function validateRequest(request: ExactSizeRequest): string | null {
  if (!Number.isFinite(request.maxKb) || request.maxKb <= 0) {
    return 'Enter a maximum size in KB greater than 0.';
  }
  if (request.maxKb > 1_000_000) {
    return 'The maximum size must be 1,000,000 KB or less.';
  }
  if (request.minKb !== undefined) {
    if (!Number.isFinite(request.minKb) || request.minKb < 0) {
      return 'The minimum size must be 0 KB or more.';
    }
    if (
      minBytesFor(request.minKb, request.kbUnit) >
      maxBytesFor(request.maxKb, request.kbUnit)
    ) {
      return 'The minimum size must not be larger than the maximum size.';
    }
  }
  for (const [label, value] of [
    ['Width', request.width],
    ['Height', request.height],
  ] as const) {
    if (value !== undefined && !isWhole(value, 1, MAX_EDGE)) {
      return `${label} must be a whole number of pixels from 1 to 12,000.`;
    }
  }
  if (request.dpi !== undefined && !isWhole(request.dpi, 1, MAX_DPI)) {
    return 'DPI must be a whole number from 1 to 65,535.';
  }
  return null;
}

/**
 * Output pixels. Both edges given: exactly those. One edge given: the other
 * follows the source aspect ratio. Neither: the source size.
 */
export function resolveOutputSize(
  sourceWidth: number,
  sourceHeight: number,
  width?: number,
  height?: number,
) {
  if (width !== undefined && height !== undefined) return { width, height };
  if (width !== undefined) {
    return {
      width,
      height: Math.max(1, Math.round((sourceHeight * width) / sourceWidth)),
    };
  }
  if (height !== undefined) {
    return {
      width: Math.max(1, Math.round((sourceWidth * height) / sourceHeight)),
      height,
    };
  }
  return { width: sourceWidth, height: sourceHeight };
}

/** True when drawing at these pixels needs a crop, padding or stretching. */
export function aspectDiffers(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
) {
  const ratio = width / height / (sourceWidth / sourceHeight);
  // One pixel of rounding on either edge is not a different shape.
  const tolerance =
    1 / Math.min(width, height) + 1 / Math.min(sourceWidth, sourceHeight);
  return Math.abs(ratio - 1) > tolerance;
}

export interface DrawPlan {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** Source and destination rectangles for `drawImage` under each fit mode. */
export function planDraw(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  fit: FitMode,
): DrawPlan {
  const full = { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight };
  if (fit === 'stretch')
    return { ...full, dx: 0, dy: 0, dw: width, dh: height };
  if (fit === 'crop') {
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const sw = width / scale;
    const sh = height / scale;
    return {
      sx: (sourceWidth - sw) / 2,
      sy: (sourceHeight - sh) / 2,
      sw,
      sh,
      dx: 0,
      dy: 0,
      dw: width,
      dh: height,
    };
  }
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  return { ...full, dx: (width - dw) / 2, dy: (height - dh) / 2, dw, dh };
}

/* ------------------------------------------------------------------ DPI -- */

const JFIF = [0x4a, 0x46, 0x49, 0x46, 0x00];

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(bytes: Uint8Array) {
  return (
    bytes.length >= 8 && PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)
  );
}

/** Format read from the file's own magic bytes, not from a label. */
export function sniffFormat(bytes: Uint8Array): ExactOutputFormat | null {
  if (isJpeg(bytes)) return 'image/jpeg';
  if (isPng(bytes)) return 'image/png';
  return null;
}

/**
 * Sets JFIF density to `dpi` dots per inch. Rewrites an existing JFIF APP0 in
 * place, or inserts one straight after SOI (where JFIF requires it).
 */
export function setJpegDpi(bytes: Uint8Array, dpi: number) {
  if (!isJpeg(bytes)) throw new Error('This is not a JPEG file.');
  const hasJfif =
    bytes[2] === 0xff &&
    bytes[3] === 0xe0 &&
    bytes.length >= 18 &&
    JFIF.every((byte, i) => bytes[6 + i] === byte);
  if (hasJfif) {
    const out = bytes.slice();
    out[13] = 1; // units: dots per inch
    out[14] = dpi >> 8;
    out[15] = dpi & 0xff;
    out[16] = dpi >> 8;
    out[17] = dpi & 0xff;
    return out;
  }
  const app0 = [
    0xff,
    0xe0,
    0x00,
    0x10,
    ...JFIF,
    0x01,
    0x01,
    0x01,
    dpi >> 8,
    dpi & 0xff,
    dpi >> 8,
    dpi & 0xff,
    0x00,
    0x00,
  ];
  const out = new Uint8Array(bytes.length + app0.length);
  out.set(bytes.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(bytes.subarray(2), 2 + app0.length);
  return out;
}

/** JFIF density, or null when the file has no JFIF APP0 segment. */
export function readJpegDpi(bytes: Uint8Array) {
  if (!isJpeg(bytes)) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1]!;
    if (marker === 0xda || marker === 0xd9) break; // image data / end
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (
      marker === 0xe0 &&
      length >= 16 &&
      JFIF.every((byte, i) => bytes[offset + 4 + i] === byte)
    ) {
      return {
        units: bytes[offset + 11]!,
        x: (bytes[offset + 12]! << 8) | bytes[offset + 13]!,
        y: (bytes[offset + 14]! << 8) | bytes[offset + 15]!,
      };
    }
    offset += 2 + length;
  }
  return null;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const readUint32 = (bytes: Uint8Array, offset: number) =>
  ((bytes[offset]! << 24) |
    (bytes[offset + 1]! << 16) |
    (bytes[offset + 2]! << 8) |
    bytes[offset + 3]!) >>>
  0;

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value >>> 24;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

const METRES_PER_INCH = 0.0254;

/**
 * Sets PNG pHYs to `dpi`, stored as pixels per metre. Any existing pHYs is
 * replaced; the new chunk goes straight after IHDR, before IDAT as required.
 */
export function setPngDpi(bytes: Uint8Array, dpi: number) {
  if (!isPng(bytes)) throw new Error('This is not a PNG file.');
  const pixelsPerMetre = Math.round(dpi / METRES_PER_INCH);
  const phys = new Uint8Array(21);
  writeUint32(phys, 0, 9);
  phys.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  writeUint32(phys, 8, pixelsPerMetre);
  writeUint32(phys, 12, pixelsPerMetre);
  phys[16] = 1; // unit: metre
  writeUint32(phys, 17, crc32(phys.subarray(4, 17)));

  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error('This PNG file is truncated.');
    if (type !== 'pHYs') parts.push(bytes.subarray(offset, end));
    if (type === 'IHDR') parts.push(phys);
    offset = end;
  }
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) {
    out.set(part, position);
    position += part.length;
  }
  return out;
}

/** pHYs density converted to DPI, or null when the PNG has none. */
export function readPngDpi(bytes: Uint8Array) {
  if (!isPng(bytes)) return null;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === 'pHYs' && length === 9) {
      const x = readUint32(bytes, offset + 8);
      const y = readUint32(bytes, offset + 12);
      const unit = bytes[offset + 16]!;
      return {
        unit,
        pixelsPerMetreX: x,
        pixelsPerMetreY: y,
        x: Math.round(x * METRES_PER_INCH),
        y: Math.round(y * METRES_PER_INCH),
      };
    }
    if (type === 'IDAT') break;
    offset += 12 + length;
  }
  return null;
}

/** DPI stored in the file, or null when it declares none in inches/metres. */
export function readDpi(bytes: Uint8Array) {
  const jpeg = readJpegDpi(bytes);
  if (jpeg) return jpeg.units === 1 && jpeg.x === jpeg.y ? jpeg.x : null;
  const png = readPngDpi(bytes);
  if (png) return png.unit === 1 && png.x === png.y ? png.x : null;
  return null;
}

export function applyDpi(
  bytes: Uint8Array,
  format: ExactOutputFormat,
  dpi?: number,
) {
  if (dpi === undefined) return bytes;
  return format === 'image/jpeg'
    ? setJpegDpi(bytes, dpi)
    : setPngDpi(bytes, dpi);
}

/* --------------------------------------------------------------- search -- */

/**
 * Draws the image at `width` × `height` and encodes it. `quality` is a whole
 * percent and is ignored for PNG.
 */
export type Encode = (
  width: number,
  height: number,
  quality: number,
) => Promise<Uint8Array>;

export interface Attempt {
  width: number;
  height: number;
  /** Null for PNG, which has no quality setting. */
  quality: number | null;
  bytes: Uint8Array;
}

export type FitOutcome =
  /** The file is within every size limit. */
  | 'met'
  /** Even the lowest quality at these pixels is over the maximum. */
  | 'over-max'
  /** The best file under the maximum is still under the minimum. */
  | 'under-min';

export interface FitResult {
  outcome: FitOutcome;
  /** The file to hand back: the chosen attempt, or the smallest one tried. */
  attempt: Attempt;
  requestedWidth: number;
  requestedHeight: number;
  pixelsReduced: boolean;
  /** Under-min only: true when a higher quality was tried and went over max. */
  gapBetweenQualities: boolean;
  encodes: number;
}

export interface FitOptions {
  format: ExactOutputFormat;
  width: number;
  height: number;
  maxBytes: number;
  minBytes?: number;
  dpi?: number;
  allowSmallerPixels: boolean;
  encode: Encode;
}

interface SizeSearch {
  /** Highest quality whose file is within [min, max]; else highest ≤ max. */
  chosen: Attempt | null;
  smallest: Attempt;
  hitCeiling: boolean;
}

export async function fitToSize(options: FitOptions): Promise<FitResult> {
  const { format, maxBytes, minBytes, dpi } = options;
  let encodes = 0;

  const attempt = async (width: number, height: number, quality: number) => {
    encodes += 1;
    const raw = await options.encode(width, height, quality);
    return {
      width,
      height,
      quality: format === 'image/jpeg' ? quality : null,
      bytes: applyDpi(raw, format, dpi),
    } satisfies Attempt;
  };

  const fits = (a: Attempt) => a.bytes.length <= maxBytes;
  const inRange = (a: Attempt) =>
    fits(a) && (minBytes === undefined || a.bytes.length >= minBytes);

  const searchAt = async (
    width: number,
    height: number,
  ): Promise<SizeSearch> => {
    if (format === 'image/png') {
      const only = await attempt(width, height, QUALITY_CEILING);
      return {
        chosen: fits(only) ? only : null,
        smallest: only,
        hitCeiling: true,
      };
    }
    const tried: Attempt[] = [];
    const top = await attempt(width, height, QUALITY_CEILING);
    tried.push(top);
    if (!fits(top)) {
      const bottom = await attempt(width, height, QUALITY_FLOOR);
      tried.push(bottom);
      if (fits(bottom)) {
        // Invariant: `low` fits, `high` does not. JPEG size is close to, but
        // not strictly, monotonic in quality, so every attempt is kept and
        // judged on its own measured bytes.
        let low = QUALITY_FLOOR;
        let high = QUALITY_CEILING;
        while (high - low > 1) {
          const mid = Math.floor((low + high) / 2);
          const next = await attempt(width, height, mid);
          tried.push(next);
          if (fits(next)) low = mid;
          else high = mid;
        }
      }
    }
    const byQuality = (a: Attempt, b: Attempt) => b.quality! - a.quality!;
    const chosen =
      tried.filter(inRange).sort(byQuality)[0] ??
      tried.filter(fits).sort(byQuality)[0] ??
      null;
    const smallest = tried.reduce((a, b) =>
      b.bytes.length < a.bytes.length ? b : a,
    );
    return { chosen, smallest, hitCeiling: fits(top) };
  };

  const finish = (search: SizeSearch, pixelsReduced: boolean): FitResult => {
    const base = {
      requestedWidth: options.width,
      requestedHeight: options.height,
      pixelsReduced,
      encodes,
    };
    if (!search.chosen) {
      return {
        ...base,
        outcome: 'over-max',
        attempt: search.smallest,
        gapBetweenQualities: false,
      };
    }
    return {
      ...base,
      outcome: inRange(search.chosen) ? 'met' : 'under-min',
      attempt: search.chosen,
      gapBetweenQualities: !inRange(search.chosen) && !search.hitCeiling,
    };
  };

  const atRequested = await searchAt(options.width, options.height);
  if (atRequested.chosen || !options.allowSmallerPixels) {
    return finish(atRequested, false);
  }

  // Explicitly allowed: find the largest scale whose lowest-quality file fits,
  // keeping the aspect ratio, then run the full quality search there.
  const shorter = Math.min(options.width, options.height);
  const minScale = Math.min(1, MIN_SHRINK_EDGE / shorter);
  const sizeAt = (scale: number) => ({
    width: Math.max(1, Math.round(options.width * scale)),
    height: Math.max(1, Math.round(options.height * scale)),
  });
  const floorFits = async (scale: number) => {
    const { width, height } = sizeAt(scale);
    return fits(await attempt(width, height, QUALITY_FLOOR));
  };

  if (minScale >= 1 || !(await floorFits(minScale))) {
    // Not reachable even at the smallest allowed pixels: report the requested
    // size honestly rather than a shrunken file that still fails.
    return finish(atRequested, false);
  }

  let low = minScale; // fits
  let high = 1; // does not fit
  for (let step = 0; step < 16; step += 1) {
    const a = sizeAt(low);
    const b = sizeAt(high);
    if (
      Math.abs(a.width - b.width) <= 1 &&
      Math.abs(a.height - b.height) <= 1
    ) {
      break;
    }
    const mid = (low + high) / 2;
    if (await floorFits(mid)) low = mid;
    else high = mid;
  }
  const { width, height } = sizeAt(low);
  // The lowest quality fits here, so the search always finds a file.
  return finish(await searchAt(width, height), true);
}

/* ---------------------------------------------------------------- checks -- */

export interface ConstraintCheck {
  label: string;
  required: string;
  actual: string;
  pass: boolean;
}

export function formatKb(bytes: number, unit: KbUnit) {
  const kb = bytes / unit;
  return `${kb.toLocaleString('en-US', { maximumFractionDigits: kb < 10 ? 2 : 1 })} KB`;
}

/**
 * Judges the file that will be saved: its measured byte length, its decoded
 * pixels, the DPI read back out of its bytes and its magic bytes. Nothing here
 * trusts what the encoder was asked to do.
 */
export function checkConstraints(
  bytes: Uint8Array,
  decoded: { width: number; height: number },
  request: ExactSizeRequest,
  requestedSize: { width: number; height: number },
): ConstraintCheck[] {
  const unit = request.kbUnit;
  const size = bytes.length;
  const maxBytes = maxBytesFor(request.maxKb, unit);
  const checks: ConstraintCheck[] = [
    {
      label: 'Maximum size',
      required: `≤ ${request.maxKb.toLocaleString('en-US')} KB (${maxBytes.toLocaleString('en-US')} bytes)`,
      actual: `${formatKb(size, unit)} (${size.toLocaleString('en-US')} bytes)`,
      pass: size <= maxBytes,
    },
  ];
  if (request.minKb !== undefined && request.minKb > 0) {
    const minBytes = minBytesFor(request.minKb, unit);
    checks.push({
      label: 'Minimum size',
      required: `≥ ${request.minKb.toLocaleString('en-US')} KB (${minBytes.toLocaleString('en-US')} bytes)`,
      actual: `${formatKb(size, unit)} (${size.toLocaleString('en-US')} bytes)`,
      pass: size >= minBytes,
    });
  }
  if (request.width !== undefined || request.height !== undefined) {
    checks.push({
      label: 'Pixels',
      required: `${requestedSize.width} × ${requestedSize.height} px`,
      actual: `${decoded.width} × ${decoded.height} px`,
      pass:
        decoded.width === requestedSize.width &&
        decoded.height === requestedSize.height,
    });
  }
  if (request.dpi !== undefined) {
    const dpi = readDpi(bytes);
    checks.push({
      label: 'DPI',
      required: `${request.dpi}`,
      actual: dpi === null ? 'not set' : `${dpi}`,
      pass: dpi === request.dpi,
    });
  }
  const format = sniffFormat(bytes);
  checks.push({
    label: 'Format',
    required: request.format === 'image/jpeg' ? 'JPEG' : 'PNG',
    actual:
      format === 'image/jpeg'
        ? 'JPEG'
        : format === 'image/png'
          ? 'PNG'
          : 'unknown',
    pass: format === request.format,
  });
  return checks;
}
