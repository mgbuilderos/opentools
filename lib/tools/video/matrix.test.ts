import { describe, expect, it } from 'vitest';
import {
  applyTransform,
  bytesToMatrix,
  detectOrientation,
  IDENTITY_MATRIX,
  matrixToBytes,
  multiplyMatrices,
  MATRIX_ROT_90,
  MATRIX_ROT_180,
  MATRIX_ROT_270,
  MATRIX_FLIP_H,
  MATRIX_FLIP_V,
} from './matrix';

describe('matrix transformation operations for video orientation', () => {
  it('converts between integer arrays and 36-byte Uint8Array correctly', () => {
    const bytes = matrixToBytes(IDENTITY_MATRIX);
    expect(bytes.length).toBe(36);
    const parsed = bytesToMatrix(bytes);
    expect(parsed).toEqual(IDENTITY_MATRIX);
  });

  it('detects identity orientation', () => {
    const info = detectOrientation(matrixToBytes(IDENTITY_MATRIX));
    expect(info.isIdentity).toBe(true);
    expect(info.degrees).toBe(0);
    expect(info.flipH).toBe(false);
    expect(info.flipV).toBe(false);
  });

  it('detects 90, 180, 270 degree rotation matrices', () => {
    expect(detectOrientation(matrixToBytes(MATRIX_ROT_90)).degrees).toBe(90);
    expect(detectOrientation(matrixToBytes(MATRIX_ROT_180)).degrees).toBe(180);
    expect(detectOrientation(matrixToBytes(MATRIX_ROT_270)).degrees).toBe(270);
  });

  it('detects flip horizontal and flip vertical', () => {
    const h = detectOrientation(matrixToBytes(MATRIX_FLIP_H));
    expect(h.flipH).toBe(true);
    expect(h.flipV).toBe(false);

    const v = detectOrientation(matrixToBytes(MATRIX_FLIP_V));
    expect(v.flipH).toBe(false);
    expect(v.flipV).toBe(true);
  });

  it('multiplies matrices correctly (rotating 90 twice gives 180)', () => {
    const combined = multiplyMatrices(MATRIX_ROT_90, MATRIX_ROT_90);
    expect(combined).toEqual(MATRIX_ROT_180);

    const rot360 = multiplyMatrices(MATRIX_ROT_180, MATRIX_ROT_180);
    expect(rot360).toEqual(IDENTITY_MATRIX);
  });

  it('applies successive transforms cleanly', () => {
    const rot90 = applyTransform(undefined, 'rotate-90');
    expect(detectOrientation(rot90).degrees).toBe(90);

    const rot180 = applyTransform(rot90, 'rotate-90');
    expect(detectOrientation(rot180).degrees).toBe(180);

    const reset = applyTransform(rot180, 'reset');
    expect(detectOrientation(reset).isIdentity).toBe(true);
  });
});
