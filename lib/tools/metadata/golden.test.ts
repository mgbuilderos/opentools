import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stripMetadata } from './index';
import { findJpegEndOfImage } from './jpeg';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(fixturesDir, name)));
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

describe('golden byte-for-byte frozen stripped comparisons', () => {
  it('matches frozen golden output for JPEG with GPS', () => {
    const input = loadFixture('gps-camera-photo.jpg');
    const golden = loadFixture('gps-camera-photo.stripped.jpg');

    const result = stripMetadata(input);
    expect(result.success).toBe(true);
    expect(result.cleanedBytes.length).toBe(golden.length);
    expect(bytesEqual(result.cleanedBytes, golden)).toBe(true);
  });

  it('matches frozen golden output for PNG with text and eXIf chunks', () => {
    const input = loadFixture('sample-text.png');
    const golden = loadFixture('sample-text.stripped.png');

    const result = stripMetadata(input);
    expect(result.success).toBe(true);
    expect(result.cleanedBytes.length).toBe(golden.length);
    expect(bytesEqual(result.cleanedBytes, golden)).toBe(true);
  });

  it('matches frozen golden output for WebP with EXIF chunk', () => {
    const input = loadFixture('sample-exif.webp');
    const golden = loadFixture('sample-exif.stripped.webp');

    const result = stripMetadata(input);
    expect(result.success).toBe(true);
    expect(result.cleanedBytes.length).toBe(golden.length);
    expect(bytesEqual(result.cleanedBytes, golden)).toBe(true);
  });

  it('proves non-vacuity: different inputs produce different stripped outputs', () => {
    const jpegInput = loadFixture('gps-camera-photo.jpg');
    const bigEndianInput = loadFixture('big-endian-exif.jpg');

    const stripped1 = stripMetadata(jpegInput).cleanedBytes;
    const stripped2 = stripMetadata(bigEndianInput).cleanedBytes;

    // Both are stripped, but originate from different images and must differ
    expect(bytesEqual(stripped1, stripped2)).toBe(false);
  });

  it('proves image payload is byte-for-byte unchanged after stripping (JPEG scan data)', () => {
    const input = loadFixture('gps-camera-photo.jpg');
    const stripped = stripMetadata(input).cleanedBytes;

    // Locate SOS (FF DA) in input
    let inputSos = -1;
    for (let i = 0; i < input.length - 1; i++) {
      if (input[i] === 0xff && input[i + 1] === 0xda) {
        inputSos = i;
        break;
      }
    }
    expect(inputSos).toBeGreaterThan(0);
    const inputEoi = findJpegEndOfImage(input, inputSos + 2);
    expect(inputEoi).toBeGreaterThan(inputSos);
    const inputScan = input.subarray(inputSos, inputEoi + 2);

    // Locate SOS in stripped
    let strippedSos = -1;
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] === 0xff && stripped[i + 1] === 0xda) {
        strippedSos = i;
        break;
      }
    }
    expect(strippedSos).toBeGreaterThan(0);
    const strippedEoi = findJpegEndOfImage(stripped, strippedSos + 2);
    expect(strippedEoi).toBeGreaterThan(strippedSos);
    const strippedScan = stripped.subarray(strippedSos, strippedEoi + 2);

    // Assert compressed image scan data is bit-for-bit identical
    expect(bytesEqual(inputScan, strippedScan)).toBe(true);
  });

  it('proves image payload is byte-for-byte unchanged after stripping (PNG IDAT chunks)', () => {
    const input = loadFixture('sample-text.png');
    const stripped = stripMetadata(input).cleanedBytes;

    const extractIdat = (bytes: Uint8Array): Uint8Array => {
      let offset = 8;
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      while (offset + 8 <= bytes.length) {
        const len = view.getUint32(offset, false);
        const type = String.fromCharCode(
          bytes[offset + 4],
          bytes[offset + 5],
          bytes[offset + 6],
          bytes[offset + 7],
        );
        if (type === 'IDAT') {
          return bytes.subarray(offset + 8, offset + 8 + len);
        }
        offset += 12 + len;
      }
      throw new Error('IDAT not found');
    };

    const inputIdat = extractIdat(input);
    const strippedIdat = extractIdat(stripped);
    expect(bytesEqual(inputIdat, strippedIdat)).toBe(true);
  });

  it('proves image payload is byte-for-byte unchanged after stripping (WebP VP8 chunk)', () => {
    const input = loadFixture('sample-exif.webp');
    const stripped = stripMetadata(input).cleanedBytes;

    const extractVp8 = (bytes: Uint8Array): Uint8Array => {
      let offset = 12;
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      while (offset + 8 <= bytes.length) {
        const fourCC = String.fromCharCode(
          bytes[offset],
          bytes[offset + 1],
          bytes[offset + 2],
          bytes[offset + 3],
        );
        const len = view.getUint32(offset + 4, true);
        if (fourCC === 'VP8 ') {
          return bytes.subarray(offset + 8, offset + 8 + len);
        }
        offset += 8 + len + (len % 2);
      }
      throw new Error('VP8 chunk not found');
    };

    const inputVp8 = extractVp8(input);
    const strippedVp8 = extractVp8(stripped);
    expect(bytesEqual(inputVp8, strippedVp8)).toBe(true);
  });
});
