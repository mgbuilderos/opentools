import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readWebpMetadata, stripWebpMetadata } from './webp';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(fixturesDir, name)));
}

describe('WebP metadata reader and stripper', () => {
  it('reads metadata from WebP fixture with EXIF and GPS', () => {
    const bytes = loadFixture('sample-exif.webp');
    const res = readWebpMetadata(bytes);

    expect(res.format).toBe('webp');
    expect(res.hasMetadata).toBe(true);
    expect(res.shot.width).toBe(64);
    expect(res.shot.height).toBe(64);
    expect(res.camera.make).toBe('Google');
    expect(res.camera.model).toBe('Pixel 9 Pro');
    expect(res.gps).toBeDefined();
    expect(res.gps!.latitude).toBeCloseTo(48.856667, 5);
    expect(res.gps!.longitude).toBeCloseTo(2.351944, 5);
    expect(res.gps!.formattedLat).toContain('48°');
    expect(res.gps!.formattedLat).toContain('N');
    expect(res.gps!.formattedLon).toContain('2°');
    expect(res.gps!.formattedLon).toContain('E');
  });

  it('strips EXIF chunk and updates RIFF size and VP8X flags', () => {
    const bytes = loadFixture('sample-exif.webp');
    const stripped = stripWebpMetadata(bytes);

    expect(stripped.success).toBe(true);
    expect(stripped.bytesSaved).toBeGreaterThan(0);
    expect(stripped.removed).toContain('EXIF metadata chunk');

    const strippedMeta = readWebpMetadata(stripped.cleanedBytes);
    expect(strippedMeta.hasMetadata).toBe(false);
    expect(strippedMeta.camera.make).toBeUndefined();
    expect(strippedMeta.gps).toBeUndefined();
    expect(strippedMeta.shot.width).toBe(64);
    expect(strippedMeta.shot.height).toBe(64);

    // Verify RIFF size matches cleaned byte length - 8
    const view = new DataView(
      stripped.cleanedBytes.buffer,
      stripped.cleanedBytes.byteOffset,
      stripped.cleanedBytes.byteLength,
    );
    const riffSize = view.getUint32(4, true);
    expect(riffSize).toBe(stripped.cleanedBytes.length - 8);
  });

  it('rejects invalid WebP files gracefully', () => {
    const invalid = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const res = readWebpMetadata(invalid);
    expect(res.hasMetadata).toBe(false);
    expect(res.warnings[0]).toContain('Not a valid WebP');

    const stripped = stripWebpMetadata(invalid);
    expect(stripped.success).toBe(false);
  });
});
