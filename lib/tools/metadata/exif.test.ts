import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTiff } from './exif';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

describe('TIFF/EXIF metadata parser', () => {
  it('returns hasExif: false on truncated or empty bytes', () => {
    expect(parseTiff(new Uint8Array(0)).hasExif).toBe(false);
    expect(parseTiff(new Uint8Array([0x49, 0x49])).hasExif).toBe(false);
    expect(parseTiff(new Uint8Array(7)).hasExif).toBe(false);
  });

  it('rejects invalid byte order markers with warnings', () => {
    const invalid = new Uint8Array([
      0x58, 0x58, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    ]);
    const res = parseTiff(invalid);
    expect(res.hasExif).toBe(false);
    expect(res.warnings[0]).toContain('Invalid TIFF byte order marker');
  });

  it('rejects invalid magic numbers (not 42)', () => {
    const badMagic = new Uint8Array([
      0x49, 0x49, 0x12, 0x34, 0x08, 0x00, 0x00, 0x00,
    ]);
    const res = parseTiff(badMagic);
    expect(res.hasExif).toBe(false);
    expect(res.warnings[0]).toContain('TIFF magic number 42 mismatch');
  });

  it('handles division by zero in rational tags safely without throwing', () => {
    // Little-endian TIFF with 1 IFD entry: ExposureTime (tag 0x829a) with den=0
    // Header (8) + IFD (2 + 12 + 4) + Heap (8) = 34 bytes
    const buf = new Uint8Array(34);
    buf[0] = 0x49;
    buf[1] = 0x49; // II
    buf[2] = 0x2a;
    buf[3] = 0x00; // 42
    buf[4] = 0x08;
    buf[5] = 0x00;
    buf[6] = 0x00;
    buf[7] = 0x00; // IFD0 at 8

    // IFD0 count: 1 entry
    buf[8] = 0x01;
    buf[9] = 0x00;
    // Entry: tag 0x829a, type 5 (RATIONAL), count 1, offset 26
    buf[10] = 0x9a;
    buf[11] = 0x82; // tag 0x829a
    buf[12] = 0x05;
    buf[13] = 0x00; // type 5
    buf[14] = 0x01;
    buf[15] = 0x00;
    buf[16] = 0x00;
    buf[17] = 0x00; // count 1
    buf[18] = 26;
    buf[19] = 0x00;
    buf[20] = 0x00;
    buf[21] = 0x00; // offset 26
    // Next IFD: 0
    buf[22] = 0;
    buf[23] = 0;
    buf[24] = 0;
    buf[25] = 0;

    // Heap at 26: num=10, den=0
    buf[26] = 10;
    buf[27] = 0;
    buf[28] = 0;
    buf[29] = 0;
    buf[30] = 0;
    buf[31] = 0;
    buf[32] = 0;
    buf[33] = 0;

    const res = parseTiff(buf);
    expect(res.hasExif).toBe(true);
    // Denominator 0 yields 0, so exposureTime is undefined or safe
    expect(res.shot.exposureTime).toBeUndefined();
  });

  it('correctly parses big-endian MM TIFF from big-endian fixture', () => {
    const raw = new Uint8Array(
      readFileSync(path.join(fixturesDir, 'big-endian-exif.jpg')),
    );
    // Extract TIFF from APP1
    const app1Index = raw.indexOf(0xe1);
    expect(app1Index).toBeGreaterThan(0);
    const tiffStart = app1Index + 1 + 2 + 6; // FF E1 + length (2) + "Exif\0\0" (6)
    const tiffBytes = raw.subarray(tiffStart);

    const res = parseTiff(tiffBytes);
    expect(res.hasExif).toBe(true);
    expect(res.camera.make).toBe('Nikon');
    expect(res.camera.model).toBe('Z 8');
    expect(res.shot.orientation).toBe(6);
    expect(res.shot.exposureTime).toBe('1/1000s');
    expect(res.shot.fNumber).toBe('f/4.0');
    expect(res.shot.iso).toBe(100);
    expect(res.shot.focalLength).toBe('50.0 mm');
    expect(res.camera.serialNumber).toBe('NIKON-Z8-2026');
  });

  it('correctly calculates GPS coordinates and hemisphere signs', () => {
    const raw = new Uint8Array(
      readFileSync(path.join(fixturesDir, 'gps-camera-photo.jpg')),
    );
    const app1Index = raw.indexOf(0xe1);
    const tiffStart = app1Index + 1 + 2 + 6;
    const tiffBytes = raw.subarray(tiffStart);

    const res = parseTiff(tiffBytes);
    expect(res.hasExif).toBe(true);
    expect(res.gps).toBeDefined();

    // 37 deg 46 min 29.76 sec N -> ~37.774933
    expect(res.gps!.latitude).toBeCloseTo(37.774933, 5);
    // 122 deg 25 min 9.84 sec W -> -122.419400
    expect(res.gps!.longitude).toBeCloseTo(-122.4194, 5);
    expect(res.gps!.formattedLat).toContain('37°');
    expect(res.gps!.formattedLat).toContain('N');
    expect(res.gps!.formattedLon).toContain('122°');
    expect(res.gps!.formattedLon).toContain('W');
    expect(res.gps!.altitude).toBe(52.4);
    expect(res.gps!.formattedAltitude).toBe('52.4 m above sea level');
    expect(res.gps!.timestamp).toBe('14:32:08 UTC');
    expect(res.gps!.dateStamp).toBe('2026:09:19');
    expect(res.gps!.mapUrl).toContain(
      'openstreetmap.org/?mlat=37.774933&mlon=-122.419400',
    );
  });
});
