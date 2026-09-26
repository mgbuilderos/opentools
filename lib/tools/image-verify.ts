/**
 * Independent verification of image bytes that are about to be saved.
 *
 * This module answers one question: *does the file on disk actually satisfy
 * what we promised?* It is deliberately separate from every encoder, so a
 * successful `toBlob()` cannot be mistaken for a compliant result. Nothing here
 * reads a filename, a requested MIME type, an encoder option, or any UI or plan
 * state — only the bytes, plus an optionally supplied *independently decoded*
 * pixel size.
 *
 * It generalises `checkConstraints` in `./exact-size`, which set the standard
 * ("Nothing here trusts what the encoder was asked to do") but is scoped to
 * that tool's JPEG/PNG request: it has no WebP, no transparency and no metadata
 * check. Those three are added here; `checkConstraints` is left alone because
 * its own tool and tests depend on its exact shape.
 *
 * **On honesty.** A property we cannot actually inspect is never reported as a
 * pass. It goes in `unprovable` with the reason, and it makes `pass` false, so
 * a caller cannot accidentally present an unproven promise as verified. The one
 * subtlety worth stating out loud is transparency: from bytes alone we can
 * prove whether an *alpha channel* is present, not whether any pixel is
 * actually see-through. The checks are worded for what is proven.
 */

import { getImageDimensions } from './html/image-dimensions';
import { detectImageFormat, readMetadata } from './metadata';
import type { SupportedImageFormat } from './metadata/types';

/** The three output containers this project encodes and can verify. */
export type VerifiableFormat = 'image/jpeg' | 'image/png' | 'image/webp';

const MIME_BY_FORMAT: Record<SupportedImageFormat, VerifiableFormat> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const LABEL_BY_MIME: Record<VerifiableFormat, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

/** Human name for a container, for copy that a visitor reads. */
export function formatLabel(mime: VerifiableFormat): string {
  return LABEL_BY_MIME[mime];
}

/**
 * Whether a container can carry an alpha channel at all. JPEG cannot, which is
 * the whole reason the compiler has to ask about a background colour before it
 * encodes a transparent image as JPEG.
 */
export function formatSupportsTransparency(mime: VerifiableFormat): boolean {
  return mime !== 'image/jpeg';
}

/** A pixel size measured somewhere other than in the encoder's arguments. */
export interface DecodedSize {
  width: number;
  height: number;
}

/**
 * What was promised about the output. Every field is optional: only the
 * promises actually made get checked, so a requirement that never mentioned
 * metadata produces no metadata check rather than a vacuous pass.
 */
export interface VerifyTargets {
  format?: VerifiableFormat;
  maxBytes?: number;
  minBytes?: number;
  exactWidth?: number;
  exactHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  /**
   * `true` — the output must still carry an alpha channel.
   * `false` — the output must not carry one (what "flattened onto a
   * background" means in a container that could have kept alpha).
   */
  alphaChannel?: boolean;
  /** `true` — every metadata block we can parse must be gone. */
  metadataRemoved?: boolean;
}

/** One judged promise. `id` is stable for tests; `label` is read by people. */
export interface VerifyCheck {
  id: string;
  label: string;
  required: string;
  actual: string;
  pass: boolean;
}

/** A promise that could not be inspected, and why. Never counts as a pass. */
export interface UnprovableCheck {
  id: string;
  label: string;
  why: string;
}

export interface Verification {
  /** The container actually found in the bytes, or null if unrecognised. */
  detectedFormat: VerifiableFormat | null;
  byteLength: number;
  /** Pixel size read out of the file's own header, not from the encoder. */
  headerSize: DecodedSize | null;
  /** Pixel size from a separate decode, when the caller could supply one. */
  decodedSize: DecodedSize | null;
  /** Alpha channel present in the bytes; null when it could not be determined. */
  alphaChannel: boolean | null;
  /** Metadata still present; null when the container could not be parsed. */
  hasMetadata: boolean | null;
  checks: VerifyCheck[];
  unprovable: UnprovableCheck[];
  /** True only when every check passed and nothing was left unprovable. */
  pass: boolean;
}

/**
 * Read whether an alpha channel is present, from the bytes alone.
 *
 * Returns `null` rather than guessing when the container is one we do not
 * parse, or is truncated before the field that carries the answer. `false` is a
 * positive finding — "there is definitely no alpha channel" — so the two must
 * not be collapsed.
 */
export function readAlphaChannel(bytes: Uint8Array): boolean | null {
  const format = detectImageFormat(bytes);

  if (format === 'jpeg') {
    // Baseline and progressive JPEG have no alpha channel in any variant.
    return false;
  }

  if (format === 'png') {
    // IHDR payload: width(4) height(4) bitDepth(1) colourType(1) ...
    // The signature is 8 bytes, then a 4-byte length and the 4-byte type.
    const ihdr = 8 + 4 + 4;
    if (bytes.length < ihdr + 10) {
      return null;
    }
    const colourType = bytes[ihdr + 9];
    if (colourType === 4 || colourType === 6) {
      // 4 = greyscale + alpha, 6 = truecolour + alpha.
      return true;
    }
    // Types 0, 2 and 3 carry transparency only via a tRNS chunk.
    return hasPngChunk(bytes, 'tRNS');
  }

  if (format === 'webp') {
    return readWebpAlpha(bytes);
  }

  return null;
}

/** Walk PNG chunks looking for one type, without decoding any pixels. */
function hasPngChunk(bytes: Uint8Array, wanted: string): boolean | null {
  let offset = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    if (type === wanted) {
      return true;
    }
    if (type === 'IEND') {
      return false;
    }
    // length + type + payload + CRC
    const next = offset + 8 + length + 4;
    if (next <= offset || next > bytes.length) {
      // Truncated or nonsensical: we cannot say the chunk is absent.
      return null;
    }
    offset = next;
  }
  return null;
}

/**
 * WebP alpha lives in two different places depending on the variant:
 * `VP8X` carries an explicit flags byte, lossless `VP8L` carries a single bit
 * in its bitstream header, and simple lossy `VP8 ` has no alpha at all.
 */
function readWebpAlpha(bytes: Uint8Array): boolean | null {
  // RIFF(4) size(4) WEBP(4), then chunks.
  let offset = 12;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset + 8 <= bytes.length) {
    const fourCC = String.fromCharCode(
      bytes[offset]!,
      bytes[offset + 1]!,
      bytes[offset + 2]!,
      bytes[offset + 3]!,
    );
    const size = view.getUint32(offset + 4, true);
    const payloadStart = offset + 8;
    if (payloadStart + size > bytes.length) {
      return null;
    }

    if (fourCC === 'VP8X') {
      if (size < 1) {
        return null;
      }
      // Flags byte, bit 4 (0x10) is "this image has an alpha channel".
      return (bytes[payloadStart]! & 0x10) !== 0;
    }

    if (fourCC === 'ALPH') {
      // An explicit alpha chunk for a lossy image.
      return true;
    }

    if (fourCC === 'VP8L') {
      // 0x2f signature, then 14 bits width-1, 14 bits height-1, then a single
      // alpha_is_used bit — bit 28 of the little-endian bit stream, which is
      // bit 4 of the fifth payload byte.
      if (size < 5 || bytes[payloadStart] !== 0x2f) {
        return null;
      }
      return ((bytes[payloadStart + 4]! >> 4) & 1) === 1;
    }

    if (fourCC === 'VP8 ') {
      // Simple lossy keyframe: no alpha channel in this variant.
      return false;
    }

    // Chunks are padded to an even length.
    const next = payloadStart + size + (size % 2);
    if (next <= offset) {
      return null;
    }
    offset = next;
  }
  return null;
}

/**
 * Judge the bytes that are about to be saved against what was promised.
 *
 * `decodedSize` is the pixel size measured by decoding the output separately —
 * in a browser, by loading it into an `<img>` and reading `naturalWidth`. When
 * it is supplied and disagrees with the file's own header, that is a failure,
 * not a tie-break: a file whose header and pixels disagree is exactly the kind
 * of result we must not call verified.
 */
export function verifyImageBytes(
  bytes: Uint8Array,
  targets: VerifyTargets,
  decodedSize: DecodedSize | null = null,
): Verification {
  const detected = detectImageFormat(bytes);
  const detectedFormat =
    detected === 'unsupported' ? null : MIME_BY_FORMAT[detected];
  const header = getImageDimensions(bytes);
  const headerSize = header
    ? { width: header.width, height: header.height }
    : null;
  const alphaChannel = readAlphaChannel(bytes);
  const metadata = readMetadata(bytes);
  const hasMetadata =
    metadata.format === 'unsupported' ? null : metadata.hasMetadata;

  const checks: VerifyCheck[] = [];
  const unprovable: UnprovableCheck[] = [];

  // ---- Container --------------------------------------------------------
  if (targets.format !== undefined) {
    checks.push({
      id: 'format',
      label: 'File type',
      required: LABEL_BY_MIME[targets.format],
      actual: detectedFormat
        ? LABEL_BY_MIME[detectedFormat]
        : 'not a JPEG, PNG or WebP file',
      pass: detectedFormat === targets.format,
    });
  }

  // ---- Byte length ------------------------------------------------------
  if (targets.maxBytes !== undefined) {
    checks.push({
      id: 'maxBytes',
      label: 'Maximum file size',
      required: `≤ ${describeBytes(targets.maxBytes)}`,
      actual: describeBytes(bytes.length),
      pass: bytes.length <= targets.maxBytes,
    });
  }
  if (targets.minBytes !== undefined) {
    checks.push({
      id: 'minBytes',
      label: 'Minimum file size',
      required: `≥ ${describeBytes(targets.minBytes)}`,
      actual: describeBytes(bytes.length),
      pass: bytes.length >= targets.minBytes,
    });
  }

  // ---- Pixels -----------------------------------------------------------
  const wantsSize =
    targets.exactWidth !== undefined ||
    targets.exactHeight !== undefined ||
    targets.maxWidth !== undefined ||
    targets.maxHeight !== undefined;

  // Prefer the independently decoded size; fall back to the file's own header.
  const measured = decodedSize ?? headerSize;

  if (wantsSize && measured === null) {
    unprovable.push({
      id: 'pixels',
      label: 'Dimensions',
      why: 'The output’s pixel size could not be read back from the file.',
    });
  }

  if (decodedSize && headerSize) {
    const agrees =
      decodedSize.width === headerSize.width &&
      decodedSize.height === headerSize.height;
    checks.push({
      id: 'headerMatchesPixels',
      label: 'File header matches its pixels',
      required: `${headerSize.width} × ${headerSize.height} px`,
      actual: `${decodedSize.width} × ${decodedSize.height} px decoded`,
      pass: agrees,
    });
  }

  if (measured) {
    if (targets.exactWidth !== undefined || targets.exactHeight !== undefined) {
      const wantW = targets.exactWidth;
      const wantH = targets.exactHeight;
      const okW = wantW === undefined || measured.width === wantW;
      const okH = wantH === undefined || measured.height === wantH;
      checks.push({
        id: 'exactPixels',
        label: 'Exact dimensions',
        required: `${wantW ?? measured.width} × ${wantH ?? measured.height} px`,
        actual: `${measured.width} × ${measured.height} px`,
        pass: okW && okH,
      });
    }
    if (targets.maxWidth !== undefined) {
      checks.push({
        id: 'maxWidth',
        label: 'Maximum width',
        required: `≤ ${targets.maxWidth} px`,
        actual: `${measured.width} px`,
        pass: measured.width <= targets.maxWidth,
      });
    }
    if (targets.maxHeight !== undefined) {
      checks.push({
        id: 'maxHeight',
        label: 'Maximum height',
        required: `≤ ${targets.maxHeight} px`,
        actual: `${measured.height} px`,
        pass: measured.height <= targets.maxHeight,
      });
    }
  }

  // ---- Transparency -----------------------------------------------------
  if (targets.alphaChannel !== undefined) {
    if (alphaChannel === null) {
      unprovable.push({
        id: 'alphaChannel',
        label: 'Transparency',
        why: 'This file’s transparency could not be read from its bytes.',
      });
    } else {
      checks.push({
        id: 'alphaChannel',
        label: 'Transparency',
        required: targets.alphaChannel
          ? 'transparency kept'
          : 'no transparency',
        actual: alphaChannel ? 'transparency kept' : 'no transparency',
        pass: alphaChannel === targets.alphaChannel,
      });
    }
  }

  // ---- Metadata ---------------------------------------------------------
  if (targets.metadataRemoved === true) {
    if (hasMetadata === null) {
      unprovable.push({
        id: 'metadataRemoved',
        label: 'Metadata',
        why: 'This file’s metadata could not be read back, so its removal cannot be confirmed.',
      });
    } else {
      checks.push({
        id: 'metadataRemoved',
        label: 'Metadata',
        required: 'removed',
        actual: hasMetadata ? 'still present' : 'removed',
        pass: hasMetadata === false,
      });
    }
  }

  // An empty file satisfies nothing, however few promises were made.
  if (bytes.length === 0) {
    checks.push({
      id: 'notEmpty',
      label: 'File contents',
      required: 'a real file',
      actual: 'empty',
      pass: false,
    });
  }

  return {
    detectedFormat,
    byteLength: bytes.length,
    headerSize,
    decodedSize,
    alphaChannel,
    hasMetadata,
    checks,
    unprovable,
    pass: checks.every((check) => check.pass) && unprovable.length === 0,
  };
}

/** Bytes as a phrase a visitor reads, keeping the exact count alongside. */
export function describeBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes.toLocaleString('en-US')} bytes`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    const rounded = kb.toLocaleString('en-US', {
      maximumFractionDigits: kb < 10 ? 2 : 1,
    });
    return `${rounded} KB (${bytes.toLocaleString('en-US')} bytes)`;
  }
  const mb = kb / 1024;
  const rounded = mb.toLocaleString('en-US', {
    maximumFractionDigits: mb < 10 ? 2 : 1,
  });
  return `${rounded} MB (${bytes.toLocaleString('en-US')} bytes)`;
}

/**
 * The reasons a verification failed, as sentences. Used for the truthful
 * "this result does not satisfy every requirement" state, so the visitor is
 * told which promise was missed rather than just that something was.
 */
export function unmetReasons(verification: Verification): string[] {
  const reasons = verification.checks
    .filter((check) => !check.pass)
    .map(
      (check) =>
        `${check.label}: needed ${check.required}, got ${check.actual}.`,
    );
  for (const item of verification.unprovable) {
    reasons.push(`${item.label}: ${item.why}`);
  }
  return reasons;
}
