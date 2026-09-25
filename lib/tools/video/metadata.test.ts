import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { inspectVideoMetadata, stripVideoMetadata } from './metadata';
import { readMp4 } from './mp4';
import { sourceFromBytes } from './source';

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

function open(name = 'tone-video.mp4') {
  const bytes = load(name);
  const source = sourceFromBytes(bytes);
  return { bytes, source, movie: readMp4(bytes) };
}

/** Helper to inject a custom box inside an MP4 array before mdat */
function injectBoxInHeader(
  original: Uint8Array,
  boxType: string,
  payload: Uint8Array,
): Uint8Array {
  const boxLen = 8 + payload.length;
  const newBox = new Uint8Array(boxLen);
  const view = new DataView(newBox.buffer);
  view.setUint32(0, boxLen);
  for (let i = 0; i < 4; i++) newBox[4 + i] = boxType.charCodeAt(i);
  newBox.set(payload, 8);

  // Insert right after ftyp (first 32 bytes)
  const out = new Uint8Array(original.length + boxLen);
  out.set(original.subarray(0, 32), 0);
  out.set(newBox, 32);
  out.set(original.subarray(32), 32 + boxLen);
  return out;
}

describe('inspectVideoMetadata and stripVideoMetadata', () => {
  it('inspects baseline video and handles clean containers', async () => {
    const { source, movie } = open();
    const meta = await inspectVideoMetadata(source, movie);
    // baseline tone-video does not have GPS
    expect(meta.gps).toBeUndefined();
  });

  it('detects GPS and device metadata and strips them losslessly', async () => {
    const { bytes } = open();

    // Create an Apple-style GPS atom: ©xyz with "+37.7749-122.4194+015.000/"
    const gpsText = '+37.7749-122.4194+015.000/';
    const gpsBytes = new TextEncoder().encode(gpsText);
    const gpsPayload = new Uint8Array(4 + gpsBytes.length);
    gpsPayload.set(gpsBytes, 4);

    const withGps = injectBoxInHeader(bytes, '\xa9xyz', gpsPayload);
    const movieWithGps = readMp4(withGps);
    const sourceWithGps = sourceFromBytes(withGps);

    // Inspect
    const meta = await inspectVideoMetadata(sourceWithGps, movieWithGps);
    expect(meta.hasIdentifyingMetadata).toBe(true);
    expect(meta.gps).toBeDefined();
    expect(meta.gps?.latitude).toBeCloseTo(37.7749, 4);
    expect(meta.gps?.longitude).toBeCloseTo(-122.4194, 4);
    expect(meta.gps?.altitude).toBeCloseTo(15.0, 1);
    expect(meta.privacyRisks.length).toBeGreaterThan(0);

    // Strip
    const stripped = await stripVideoMetadata(sourceWithGps, movieWithGps);
    expect(stripped.removedFields).toContain('GPS Location Coordinates');
    expect(stripped.blob.size).toBeGreaterThan(0);

    // Verify stripped output
    const strippedBytes = new Uint8Array(await stripped.blob.arrayBuffer());
    const strippedMovie = readMp4(strippedBytes);
    const strippedSource = sourceFromBytes(strippedBytes);
    const metaAfter = await inspectVideoMetadata(strippedSource, strippedMovie);

    expect(metaAfter.gps).toBeUndefined();
    expect(metaAfter.hasIdentifyingMetadata).toBe(false);
    expect(strippedMovie.tracks.length).toBe(movieWithGps.tracks.length);
  });
});
