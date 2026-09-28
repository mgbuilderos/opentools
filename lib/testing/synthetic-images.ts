/**
 * Image files built byte by byte, for tests that need properties no committed
 * fixture has.
 *
 * Every fixture in `lib/tools/metadata/__fixtures__` is opaque: colour type 2
 * PNGs and VP8X WebPs with the alpha flag clear. That is fine as a cross-check
 * against real encoder output, and tests should keep using it as one. It cannot
 * test the paths that matter most here, because none of those files carries an
 * alpha channel, and a blob could not show *why* a byte means what it means. The
 * WebP lossless alpha flag is bit 4 of the fifth payload byte; a fixture proves
 * nothing about that, and an off-by-one there silently corrupts either the
 * dimensions or the transparency answer.
 *
 * So these are real, parseable files — CRCs are computed, not faked — with every
 * significant byte named in a comment.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Join byte arrays without spreading them into a call.
 *
 * `new Uint8Array([...a, ...b])` overflows the stack once a piece is a few tens
 * of thousands of bytes long, which a size-search test hits immediately when it
 * asks for a deliberately oversized file. Everything here assembles through
 * this instead.
 */
function concatBytes(pieces: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const piece of pieces) total += piece.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const piece of pieces) {
    out.set(piece, offset);
    offset += piece.length;
  }
  return out;
}

/** ASCII tag to bytes. Avoids spreading a string, which the linter forbids. */
function ascii(text: string): number[] {
  const out: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    out.push(text.charCodeAt(index));
  }
  return out;
}

/** A run of the same byte, built without spreading. */
function filler(length: number, byte = 0x20): Uint8Array {
  return new Uint8Array(length).fill(byte);
}

function u32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function pngChunk(type: string, payload: number[]): number[] {
  const typeBytes = ascii(type);
  const body = new Uint8Array([...typeBytes, ...payload]);
  return [
    ...u32(payload.length),
    ...typeBytes,
    ...payload,
    ...u32(crc32(body)),
  ];
}

export interface PngOptions {
  width: number;
  height: number;
  /** 0 grey · 2 RGB · 3 palette · 4 grey+alpha · 6 RGBA. Decides alpha. */
  colourType: 0 | 2 | 3 | 4 | 6;
  /** Add a tRNS chunk, which gives types 0, 2 and 3 transparency. */
  withTrns?: boolean;
  /** Add a tEXt chunk, so the file genuinely carries metadata. */
  withText?: boolean;
  /**
   * Pad the file to at least this many bytes using a private ancillary chunk.
   * A lowercase first letter marks a chunk as safe to ignore, so the file stays
   * valid and no metadata reader treats it as content.
   */
  padTo?: number;
}

/** A minimal but structurally valid PNG. IDAT content is never decoded. */
export function buildPng(options: PngOptions): Uint8Array {
  const { width, height, colourType } = options;
  const chunks: number[] = [
    ...pngChunk('IHDR', [
      ...u32(width),
      ...u32(height),
      8, // bit depth
      colourType,
      0, // deflate
      0, // adaptive filtering
      0, // no interlace
    ]),
  ];
  if (options.withText) {
    const text = ascii('Comment\u0000made by a camera');
    chunks.push(...pngChunk('tEXt', text));
  }
  if (options.withTrns) {
    chunks.push(...pngChunk('tRNS', [0x00]));
  }
  if (colourType === 3) {
    chunks.push(...pngChunk('PLTE', [0xff, 0x00, 0x00]));
  }
  chunks.push(
    ...pngChunk(
      'IDAT',
      [0x78, 0x01, 0x01, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x01],
    ),
  );

  const signature = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const pieces: Uint8Array[] = [signature, new Uint8Array(chunks)];

  if (options.padTo !== undefined) {
    // 8 signature + chunks + 12 for IEND, then a padding chunk's own 12 bytes.
    const current = 8 + chunks.length + 12;
    const needed = options.padTo - current - 12;
    if (needed > 0) {
      pieces.push(pngChunkBytes('prVt', filler(needed)));
    }
  }

  pieces.push(new Uint8Array(pngChunk('IEND', [])));
  return concatBytes(pieces);
}

/** `pngChunk` for a payload too large to spread into a call. */
function pngChunkBytes(type: string, payload: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array(ascii(type));
  const body = concatBytes([typeBytes, payload]);
  return concatBytes([
    new Uint8Array(u32(payload.length)),
    body,
    new Uint8Array(u32(crc32(body))),
  ]);
}

function riff(chunks: number[], extra?: Uint8Array): Uint8Array {
  const webp = ascii('WEBP');
  const size = webp.length + chunks.length + (extra?.length ?? 0);
  const head = new Uint8Array([
    ...ascii('RIFF'),
    size & 0xff,
    (size >>> 8) & 0xff,
    (size >>> 16) & 0xff,
    (size >>> 24) & 0xff,
    ...webp,
  ]);
  return concatBytes(
    extra
      ? [head, new Uint8Array(chunks), extra]
      : [head, new Uint8Array(chunks)],
  );
}

/** `webpChunk` for a payload too large to spread into a call. */
function webpChunkBytes(fourCC: string, payload: Uint8Array): Uint8Array {
  const size = payload.length;
  const header = new Uint8Array([
    ...ascii(fourCC),
    size & 0xff,
    (size >>> 8) & 0xff,
    (size >>> 16) & 0xff,
    (size >>> 24) & 0xff,
  ]);
  return size % 2 === 1
    ? concatBytes([header, payload, new Uint8Array(1)])
    : concatBytes([header, payload]);
}

function webpChunk(fourCC: string, payload: number[]): number[] {
  const size = payload.length;
  const padded = size % 2 === 1 ? [...payload, 0x00] : payload;
  return [
    ...ascii(fourCC),
    size & 0xff,
    (size >>> 8) & 0xff,
    (size >>> 16) & 0xff,
    (size >>> 24) & 0xff,
    ...padded,
  ];
}

/**
 * Extended WebP. Alpha is bit 4 (0x10) of the VP8X flags byte, separate from
 * the Exif bit (0x08) and the XMP bit (0x04). `sample-exif.webp` in this
 * repository has flags 0x08 and no alpha, so a parser testing the wrong bit
 * would call it transparent — which is exactly what `exif: true` here is for.
 */
export function buildWebpVp8x(options: {
  width: number;
  height: number;
  alpha: boolean;
  exif?: boolean;
  /**
   * Pad to at least this many bytes with an unknown chunk. WebP readers skip
   * chunks they do not recognise, so the file stays valid and its metadata
   * answer is unaffected — which is what lets a test drive a size search with a
   * byte length it chose.
   */
  padTo?: number;
}): Uint8Array {
  const { width, height } = options;
  const w = width - 1;
  const h = height - 1;
  let flags = 0;
  if (options.alpha) flags |= 0x10;
  if (options.exif) flags |= 0x08;
  const chunks = [
    ...webpChunk('VP8X', [
      flags,
      0,
      0,
      0, // three reserved bytes
      w & 0xff,
      (w >>> 8) & 0xff,
      (w >>> 16) & 0xff,
      h & 0xff,
      (h >>> 8) & 0xff,
      (h >>> 16) & 0xff,
    ]),
  ];
  if (options.exif) {
    chunks.push(
      ...webpChunk(
        'EXIF',
        [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00],
      ),
    );
  }
  chunks.push(
    ...webpChunk('VP8 ', [
      0x00,
      0x00,
      0x00,
      0x9d,
      0x01,
      0x2a,
      width & 0xff,
      (width >>> 8) & 0x3f,
      height & 0xff,
      (height >>> 8) & 0x3f,
      0x00,
      0x00,
    ]),
  );
  if (options.padTo !== undefined) {
    // 12 bytes of RIFF header, the chunks so far, and the padding chunk's own 8.
    const needed = options.padTo - (12 + chunks.length) - 8;
    if (needed > 0) {
      return riff(chunks, webpChunkBytes('XTRA', filler(needed)));
    }
  }
  return riff(chunks);
}

/**
 * Lossless WebP. After the 0x2f signature the bit stream is little-endian:
 * 14 bits of width-1, 14 bits of height-1, then one `alpha_is_used` bit. That is
 * bit 28 — bit 4 of the fifth payload byte, the same byte whose low four bits
 * carry the top of the height.
 */
export function buildWebpVp8l(options: {
  width: number;
  height: number;
  alpha: boolean;
}): Uint8Array {
  const w = options.width - 1;
  const h = options.height - 1;
  const bits = w | (h << 14) | ((options.alpha ? 1 : 0) << 28);
  return riff(
    webpChunk('VP8L', [
      0x2f,
      bits & 0xff,
      (bits >>> 8) & 0xff,
      (bits >>> 16) & 0xff,
      (bits >>> 24) & 0xff,
      0x00,
    ]),
  );
}
