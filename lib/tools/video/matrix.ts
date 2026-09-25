/**
 * 3x3 Transformation matrix operations for MP4/MOV `tkhd` boxes.
 *
 * In ISO base media file format (ISO/IEC 14496-12) and QuickTime, orientation
 * is stored as nine 32-bit integers in the track header (`tkhd`):
 *   [ a,  b,  u ]
 *   [ c,  d,  v ]
 *   [ x,  y,  w ]
 * where a, b, c, d, x, y are 16.16 fixed-point values (value * 65536),
 * u, v are 0, and w is 2.30 fixed-point (1.0 = 0x40000000).
 *
 * Rotating or flipping via container surgery rewrites these 9 numbers in the
 * header in milliseconds, leaving video frame bytes byte-identical and 100%
 * lossless without any re-encoding.
 */

import type { Mp4File } from './mp4';
import type { ByteSource } from './source';
import { writeMp4Source, type TrackPlan } from './writer';

export type RotationOperation =
  | 'rotate-90'
  | 'rotate-180'
  | 'rotate-270'
  | 'flip-h'
  | 'flip-v'
  | 'reset';

const FIXED_ONE = 0x00010000;
const FIXED_MINUS_ONE = -0x00010000;
const FIXED_W = 0x40000000;

export const IDENTITY_MATRIX: number[] = [
  FIXED_ONE,
  0,
  0,
  0,
  FIXED_ONE,
  0,
  0,
  0,
  FIXED_W,
];

// Pre-defined base matrices for standard transformations
export const MATRIX_ROT_90: number[] = [
  0,
  FIXED_ONE,
  0,
  FIXED_MINUS_ONE,
  0,
  0,
  0,
  0,
  FIXED_W,
];

export const MATRIX_ROT_180: number[] = [
  FIXED_MINUS_ONE,
  0,
  0,
  0,
  FIXED_MINUS_ONE,
  0,
  0,
  0,
  FIXED_W,
];

export const MATRIX_ROT_270: number[] = [
  0,
  FIXED_MINUS_ONE,
  0,
  FIXED_ONE,
  0,
  0,
  0,
  0,
  FIXED_W,
];

export const MATRIX_FLIP_H: number[] = [
  FIXED_MINUS_ONE,
  0,
  0,
  0,
  FIXED_ONE,
  0,
  0,
  0,
  FIXED_W,
];

export const MATRIX_FLIP_V: number[] = [
  FIXED_ONE,
  0,
  0,
  0,
  FIXED_MINUS_ONE,
  0,
  0,
  0,
  FIXED_W,
];

/** Multiplies two 2D affine 16.16 transform matrices (M1 x M2) */
export function multiplyMatrices(m1: number[], m2: number[]): number[] {
  // m1 and m2 are arrays of 9 numbers
  // [a, b, u, c, d, v, x, y, w]
  // In 2D affine:
  // a' = (a1*a2 + b1*c2) >> 16
  // b' = (a1*b2 + b1*d2) >> 16
  // c' = (c1*a2 + d1*c2) >> 16
  // d' = (c1*b2 + d1*d2) >> 16
  const a1 = m1[0],
    b1 = m1[1],
    c1 = m1[3],
    d1 = m1[4];
  const a2 = m2[0],
    b2 = m2[1],
    c2 = m2[3],
    d2 = m2[4];

  const a = Math.round((a1 * a2 + b1 * c2) / 65536) || 0;
  const b = Math.round((a1 * b2 + b1 * d2) / 65536) || 0;
  const c = Math.round((c1 * a2 + d1 * c2) / 65536) || 0;
  const d = Math.round((c1 * b2 + d1 * d2) / 65536) || 0;

  return [a, b, 0, c, d, 0, 0, 0, FIXED_W];
}

/** Converts array of 9 integer values into a 36-byte Uint8Array for tkhd */
export function matrixToBytes(matrix: number[]): Uint8Array {
  const bytes = new Uint8Array(36);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < 9; i++) {
    view.setInt32(i * 4, matrix[i], false);
  }
  return bytes;
}

/** Parses 36-byte Uint8Array into 9 integer values */
export function bytesToMatrix(bytes: Uint8Array): number[] {
  if (bytes.length < 36) return [...IDENTITY_MATRIX];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const matrix: number[] = [];
  for (let i = 0; i < 9; i++) {
    matrix.push(view.getInt32(i * 4, false));
  }
  return matrix;
}

/**
 * Detects rotation degrees (0, 90, 180, 270) and flips from a matrix.
 */
export function detectOrientation(matrix?: Uint8Array): {
  degrees: number;
  flipH: boolean;
  flipV: boolean;
  isIdentity: boolean;
  label: string;
} {
  if (!matrix || matrix.length < 36) {
    return {
      degrees: 0,
      flipH: false,
      flipV: false,
      isIdentity: true,
      label: 'Original (0°)',
    };
  }
  const [a, b, , c, d] = bytesToMatrix(matrix);

  // Normalize to integer +/- 1
  const na = Math.round(a / 65536);
  const nb = Math.round(b / 65536);
  const nc = Math.round(c / 65536);
  const nd = Math.round(d / 65536);

  if (na === 1 && nb === 0 && nc === 0 && nd === 1) {
    return {
      degrees: 0,
      flipH: false,
      flipV: false,
      isIdentity: true,
      label: 'Original (0°)',
    };
  }
  if (na === 0 && nb === 1 && nc === -1 && nd === 0) {
    return {
      degrees: 90,
      flipH: false,
      flipV: false,
      isIdentity: false,
      label: '90° Clockwise (Portrait)',
    };
  }
  if (na === 0 && nb === -1 && nc === 1 && nd === 0) {
    return {
      degrees: 270,
      flipH: false,
      flipV: false,
      isIdentity: false,
      label: '270° Clockwise (90° Counter-Clockwise)',
    };
  }
  if (na === -1 && nb === 0 && nc === 0 && nd === -1) {
    return {
      degrees: 180,
      flipH: false,
      flipV: false,
      isIdentity: false,
      label: '180° Inverted',
    };
  }
  if (na === -1 && nb === 0 && nc === 0 && nd === 1) {
    return {
      degrees: 0,
      flipH: true,
      flipV: false,
      isIdentity: false,
      label: 'Flipped Horizontally',
    };
  }
  if (na === 1 && nb === 0 && nc === 0 && nd === -1) {
    return {
      degrees: 0,
      flipH: false,
      flipV: true,
      isIdentity: false,
      label: 'Flipped Vertically',
    };
  }

  return {
    degrees: 0,
    flipH: false,
    flipV: false,
    isIdentity: false,
    label: 'Custom Orientation Matrix',
  };
}

/**
 * Applies a rotation or flip operation to an existing matrix (or identity).
 */
export function applyTransform(
  currentMatrix: Uint8Array | undefined,
  operation: RotationOperation,
): Uint8Array {
  if (operation === 'reset') {
    return matrixToBytes(IDENTITY_MATRIX);
  }

  let transform: number[];
  switch (operation) {
    case 'rotate-90':
      transform = MATRIX_ROT_90;
      break;
    case 'rotate-180':
      transform = MATRIX_ROT_180;
      break;
    case 'rotate-270':
      transform = MATRIX_ROT_270;
      break;
    case 'flip-h':
      transform = MATRIX_FLIP_H;
      break;
    case 'flip-v':
      transform = MATRIX_FLIP_V;
      break;
  }

  const base = currentMatrix
    ? bytesToMatrix(currentMatrix)
    : [...IDENTITY_MATRIX];
  const combined = multiplyMatrices(transform, base);
  return matrixToBytes(combined);
}

export type RotationAngle = 0 | 90 | 180 | 270;

export interface RotateVideoOptions {
  angle: RotationAngle;
  flipH?: boolean;
  flipV?: boolean;
}

export async function rotateVideo(
  source: ByteSource,
  movie: Mp4File,
  options: RotateVideoOptions,
): Promise<{ blob: Blob; size: number }> {
  let op: RotationOperation = 'reset';
  if (options.angle === 90) op = 'rotate-90';
  else if (options.angle === 180) op = 'rotate-180';
  else if (options.angle === 270) op = 'rotate-270';

  let matrix = applyTransform(undefined, op);
  if (options.flipH) {
    matrix = applyTransform(matrix, 'flip-h');
  }
  if (options.flipV) {
    matrix = applyTransform(matrix, 'flip-v');
  }

  const plans: TrackPlan[] = movie.tracks.map((track) => {
    if (track.kind === 'video') {
      return {
        track: { ...track, matrix },
        samples: track.samples,
        sampleDescription: track.sampleDescription,
      };
    }
    return {
      track,
      samples: track.samples,
      sampleDescription: track.sampleDescription,
    };
  });

  return writeMp4Source(source, plans, movie);
}
