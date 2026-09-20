import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readJpegMetadata, stripJpegMetadata } from './jpeg';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(fixturesDir, name)));
}

describe('JPEG metadata reader and stripper', () => {
  it('reads metadata from a complete photo fixture', () => {
    const bytes = loadFixture('gps-camera-photo.jpg');
    const res = readJpegMetadata(bytes);

    expect(res.format).toBe('jpeg');
    expect(res.hasMetadata).toBe(true);
    expect(res.camera.make).toBe('Sony');
    expect(res.camera.model).toBe('ILCE-7RM4');
    expect(res.camera.ownerName).toBe('Alice Walker');
    expect(res.camera.serialNumber).toBe('SN-987654321');
    expect(res.shot.exposureTime).toBe('1/250s');
    expect(res.shot.fNumber).toBe('f/2.8');
    expect(res.shot.iso).toBe(400);
    expect(res.shot.focalLength).toBe('35.0 mm');
    expect(res.gps).toBeDefined();
    expect(res.gps!.latitude).toBeCloseTo(37.774933, 5);
    expect(res.gps!.longitude).toBeCloseTo(-122.4194, 5);
    expect(res.rawTextEntries.some((e) => e.key === 'Comment')).toBe(true);
  });

  it('handles clean JPEG with no metadata gracefully', () => {
    const bytes = loadFixture('no-metadata.jpg');
    const res = readJpegMetadata(bytes);

    expect(res.format).toBe('jpeg');
    expect(res.hasMetadata).toBe(false);
    expect(res.gps).toBeUndefined();
    expect(res.camera.make).toBeUndefined();

    const stripped = stripJpegMetadata(bytes);
    expect(stripped.success).toBe(true);
    expect(stripped.removed).toHaveLength(0);
  });

  it('refuses truncated JPEG without crashing', () => {
    const bytes = loadFixture('corrupt-truncated.jpg');
    const res = readJpegMetadata(bytes);
    expect(res.format).toBe('jpeg');
    expect(res.warnings.length).toBeGreaterThan(0);

    const stripped = stripJpegMetadata(bytes);
    expect(stripped.success).toBe(true);
  });

  it('preserves APP0 (JFIF) and APP2 (ICC Profile)', () => {
    const bytes = loadFixture('gps-camera-photo.jpg');
    const stripped = stripJpegMetadata(bytes);

    expect(stripped.kept).toContain('JFIF header (APP0)');
    expect(stripped.kept).toContain('ICC colour profile (APP2)');

    // Verify APP0 and APP2 segments exist in output
    let hasApp0 = false;
    let hasApp2 = false;
    let hasApp1 = false;
    for (let i = 0; i < stripped.cleanedBytes.length - 1; i++) {
      if (stripped.cleanedBytes[i] === 0xff) {
        if (stripped.cleanedBytes[i + 1] === 0xe0) hasApp0 = true;
        if (stripped.cleanedBytes[i + 1] === 0xe2) hasApp2 = true;
        if (stripped.cleanedBytes[i + 1] === 0xe1) hasApp1 = true;
      }
    }
    expect(hasApp0).toBe(true);
    expect(hasApp2).toBe(true);
    // Because orientation was 1, no orientation APP1 was re-emitted
    expect(hasApp1).toBe(false);
  });

  it('preserves orientation when photo is rotated (orientation = 6)', () => {
    const bytes = loadFixture('big-endian-exif.jpg');
    const inspected = readJpegMetadata(bytes);
    expect(inspected.shot.orientation).toBe(6);

    const stripped = stripJpegMetadata(bytes);
    expect(stripped.kept.some((k) => k.includes('Orientation 6'))).toBe(true);

    // Re-inspecting stripped file should show orientation 6 and nothing else
    const strippedInspected = readJpegMetadata(stripped.cleanedBytes);
    expect(strippedInspected.shot.orientation).toBe(6);
    expect(strippedInspected.camera.make).toBeUndefined();
    expect(strippedInspected.camera.model).toBeUndefined();
  });

  it('strips trailing bytes after end of image (EOI)', () => {
    const bytes = loadFixture('gps-camera-photo.jpg');
    const stripped = stripJpegMetadata(bytes);

    expect(stripped.removed.some((r) => r.includes('after end-of-image'))).toBe(
      true,
    );
    // Last two bytes of stripped file must be FF D9
    const len = stripped.cleanedBytes.length;
    expect(stripped.cleanedBytes[len - 2]).toBe(0xff);
    expect(stripped.cleanedBytes[len - 1]).toBe(0xd9);
  });
});
