import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { OperationContext } from '@/lib/kernel/types';

import { parseGeoJson } from './geo';
import { geoOperations } from './kernel';

const fixtures = resolve(import.meta.dirname, '__fixtures__');

async function context(name: string, params: Record<string, string> = {}) {
  const bytes = new Uint8Array(await readFile(resolve(fixtures, name)));
  return {
    text: '',
    files: [{ name, type: '', size: bytes.length, lastModified: 0, bytes }],
    params,
    signal: new AbortController().signal,
  } satisfies OperationContext;
}

function operation(id: string) {
  const found = geoOperations.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing test operation ${id}.`);
  return found;
}

async function outputBytes(id: string, input: OperationContext) {
  const result = await operation(id).run(input);
  if (result.kind !== 'files') throw new Error(`${id} did not return a file.`);
  return result.files[0]!.bytes;
}

describe('geographic kernel operations', () => {
  it('registers three conversions and two privacy operations', () => {
    expect(geoOperations.map(({ id }) => id)).toEqual([
      'geo-convert-to-gpx',
      'geo-convert-to-kml',
      'geo-convert-to-geojson',
      'geo-trim-ends',
      'geo-strip-timestamps',
    ]);
  });

  it('converts GPX to GeoJSON through the kernel contract', async () => {
    const bytes = await outputBytes(
      'geo-convert-to-geojson',
      await context('track.gpx'),
    );
    const result = await parseGeoJson(bytes);
    expect(result.tracks[0]?.points).toHaveLength(4);
  });

  it('runs both privacy transformations through the kernel contract', async () => {
    const trimmed = await parseGeoJson(
      await outputBytes(
        'geo-trim-ends',
        await context('track.gpx', { metres: '25' }),
      ),
    );
    expect(trimmed.tracks[0]!.points.length).toBeLessThan(4);

    const stripped = new TextDecoder().decode(
      await outputBytes('geo-strip-timestamps', await context('track.gpx')),
    );
    expect(stripped).not.toContain('timestamp');
    expect(stripped).not.toContain('2026-09-26T06:30:00Z');
  });
});
