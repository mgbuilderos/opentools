import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  GeoFormatError,
  parseGeoJson,
  parseGpx,
  parseKml,
  stripTimestamps,
  trimEnds,
  writeGeoJson,
  writeGpx,
  writeKml,
} from './index';

const fixtures = resolve(import.meta.dirname, '__fixtures__');

async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve(fixtures, name)));
}

describe('geographic formats', () => {
  it('parses GPX tracks with names, timestamps, and elevation', async () => {
    const result = await parseGpx(await fixture('track.gpx'));

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]?.name).toBe('Morning route & return');
    expect(result.tracks[0]?.points[0]).toEqual({
      latitude: 51.5007,
      longitude: -0.1246,
      elevation: 14.2,
      timestamp: '2026-09-26T06:30:00Z',
    });
    expect(result.tracks[0]?.points).toHaveLength(4);
  });

  it('parses a KML Placemark LineString', async () => {
    const result = await parseKml(await fixture('route.kml'));

    expect(result.tracks).toEqual([
      {
        name: 'Synthetic ridge',
        points: [
          {
            longitude: -122.0822035425683,
            latitude: 37.42228990140251,
            elevation: 12,
          },
          { longitude: -122.085, latitude: 37.422, elevation: 18 },
          { longitude: -122.086, latitude: 37.421, elevation: 21 },
        ],
      },
    ]);
  });

  it('parses a GeoJSON FeatureCollection', async () => {
    const result = await parseGeoJson(await fixture('tracks.geojson'));

    expect(result.tracks[0]?.name).toBe('Synthetic walk');
    expect(result.tracks[0]?.points[0]).toEqual({
      longitude: 72.8777,
      latitude: 19.076,
      elevation: 8,
      timestamp: '2026-09-26T07:00:00Z',
    });
  });

  it('round-trips each supported representation', async () => {
    const gpx = await parseGpx(await fixture('track.gpx'));
    const viaGeoJson = await parseGeoJson(
      new TextEncoder().encode(writeGeoJson(gpx)),
    );
    const gpxRoundTrip = await parseGpx(
      new TextEncoder().encode(writeGpx(viaGeoJson)),
    );
    expect(gpxRoundTrip).toEqual(gpx);

    const kml = await parseKml(await fixture('route.kml'));
    await expect(
      parseKml(new TextEncoder().encode(writeKml(kml))),
    ).resolves.toEqual(kml);
  });

  it('trims cumulative WGS 84 Haversine distance from both ends', () => {
    const track = {
      name: 'Privacy test',
      points: [
        { latitude: 0, longitude: 0, timestamp: 'a' },
        { latitude: 0, longitude: 0.001, timestamp: 'b' },
        { latitude: 0, longitude: 0.002, timestamp: 'c' },
        { latitude: 0, longitude: 0.003, timestamp: 'd' },
        { latitude: 0, longitude: 0.004, timestamp: 'e' },
      ],
    };

    expect(trimEnds(track, 110).points).toEqual(track.points.slice(1, 4));
    expect(track.points).toHaveLength(5);
  });

  it('returns an empty track when privacy trims overlap', () => {
    const shortTrack = {
      name: 'Short route',
      points: [
        { latitude: 51.5, longitude: -0.1 },
        { latitude: 51.50001, longitude: -0.10001 },
      ],
    };

    expect(trimEnds(shortTrack, 10)).toEqual({
      name: 'Short route',
      points: [],
    });
  });

  it('strips only timestamps without mutating the input', () => {
    const track = {
      points: [
        {
          latitude: 1,
          longitude: 2,
          elevation: 3,
          timestamp: '2026-09-26T00:00:00Z',
        },
      ],
    };

    expect(stripTimestamps(track)).toEqual({
      points: [{ latitude: 1, longitude: 2, elevation: 3 }],
    });
    expect(track.points[0]?.timestamp).toBe('2026-09-26T00:00:00Z');
  });

  it.each([
    ['truncated.gpx', parseGpx, 'MALFORMED_GPX'],
    ['wrong-magic.bin', parseGpx, 'UNSUPPORTED_FORMAT'],
    ['malformed.geojson', parseGeoJson, 'INVALID_COORDINATE'],
  ] as const)('throws a typed error for %s', async (name, parse, code) => {
    const error = await parse(await fixture(name)).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(GeoFormatError);
    expect(error).toMatchObject({ code });
  });
});
