import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectImageFormat, readMetadata, stripMetadata } from './index';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(fixturesDir, name)));
}

describe('unified metadata engine index', () => {
  it('detects supported image formats accurately', () => {
    expect(detectImageFormat(loadFixture('gps-camera-photo.jpg'))).toBe('jpeg');
    expect(detectImageFormat(loadFixture('sample-text.png'))).toBe('png');
    expect(detectImageFormat(loadFixture('sample-exif.webp'))).toBe('webp');
    expect(detectImageFormat(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBe(
      'unsupported',
    );
  });

  it('refuses unsupported formats with honest explanation', () => {
    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0]);
    const readRes = readMetadata(gifBytes);
    expect(readRes.format).toBe('unsupported');
    expect(readRes.hasMetadata).toBe(false);
    expect(readRes.warnings[0]).toContain('Unsupported file container');

    const stripRes = stripMetadata(gifBytes);
    expect(stripRes.format).toBe('unsupported');
    expect(stripRes.success).toBe(false);
    expect(stripRes.warnings[0]).toContain('Only JPEG, PNG, and WebP');
  });

  it('correctly reads and strips JPEG through index interface', () => {
    const bytes = loadFixture('gps-camera-photo.jpg');
    const meta = readMetadata(bytes);
    expect(meta.format).toBe('jpeg');
    expect(meta.hasMetadata).toBe(true);
    expect(meta.camera.make).toBe('Sony');

    const stripped = stripMetadata(bytes);
    expect(stripped.format).toBe('jpeg');
    expect(stripped.success).toBe(true);
    expect(stripped.bytesSaved).toBeGreaterThan(0);
  });

  it('correctly reads and strips PNG through index interface', () => {
    const bytes = loadFixture('sample-text.png');
    const meta = readMetadata(bytes);
    expect(meta.format).toBe('png');
    expect(meta.hasMetadata).toBe(true);

    const stripped = stripMetadata(bytes);
    expect(stripped.format).toBe('png');
    expect(stripped.success).toBe(true);
    expect(stripped.bytesSaved).toBeGreaterThan(0);
  });

  it('correctly reads and strips WebP through index interface', () => {
    const bytes = loadFixture('sample-exif.webp');
    const meta = readMetadata(bytes);
    expect(meta.format).toBe('webp');
    expect(meta.hasMetadata).toBe(true);

    const stripped = stripMetadata(bytes);
    expect(stripped.format).toBe('webp');
    expect(stripped.success).toBe(true);
    expect(stripped.bytesSaved).toBeGreaterThan(0);
  });
});
