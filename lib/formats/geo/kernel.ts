import type { KernelOperation } from '@/lib/kernel/types';

import {
  parseGeo,
  stripTimestamps,
  trimEnds,
  writeGeoJson,
  writeGpx,
  writeKml,
} from './geo';

type Context = Parameters<KernelOperation['run']>[0];

function inputFile(context: Context) {
  if (context.signal.aborted) {
    throw new DOMException('Operation cancelled.', 'AbortError');
  }
  const file = context.files[0];
  if (!file) throw new Error('Choose a GPX, KML, or GeoJSON file first.');
  return file;
}

function textFile(name: string, type: string, text: string) {
  return { name, type, bytes: new TextEncoder().encode(text) };
}

function convertedName(name: string, extension: string): string {
  const base = name.replace(/\.[^.]*$/u, '') || 'track';
  return `${base}.${extension}`;
}

const conversions = [
  {
    id: 'geo-convert-to-gpx',
    name: 'Convert track to GPX',
    description: 'Convert a GPX, KML, or GeoJSON track document to GPX.',
    extension: 'gpx',
    type: 'application/gpx+xml',
    write: writeGpx,
  },
  {
    id: 'geo-convert-to-kml',
    name: 'Convert track to KML',
    description: 'Convert a GPX, KML, or GeoJSON track document to KML.',
    extension: 'kml',
    type: 'application/xml',
    write: writeKml,
  },
  {
    id: 'geo-convert-to-geojson',
    name: 'Convert track to GeoJSON',
    description: 'Convert a GPX, KML, or GeoJSON track document to GeoJSON.',
    extension: 'geojson',
    type: 'application/geo+json',
    write: writeGeoJson,
  },
] as const;

const conversionOperations = conversions.map(
  (conversion) =>
    ({
      id: conversion.id,
      source: 'formats-geo',
      name: conversion.name,
      description: conversion.description,
      input: 'file',
      params: [],
      output: { kind: 'files', extension: conversion.extension },
      runtime: 'pure',
      deterministic: true,
      async run(context) {
        const file = inputFile(context);
        const document = await parseGeo(file.bytes);
        return {
          kind: 'files',
          files: [
            textFile(
              convertedName(file.name, conversion.extension),
              conversion.type,
              conversion.write(document),
            ),
          ],
          summary: `Converted ${document.tracks.length} track${document.tracks.length === 1 ? '' : 's'} to ${conversion.extension.toUpperCase()}.`,
        };
      },
    }) satisfies KernelOperation,
);

export const geoOperations = [
  ...conversionOperations,
  {
    id: 'geo-trim-ends',
    source: 'formats-geo',
    name: 'Trim track ends',
    description:
      'Remove a WGS 84 Haversine distance from both ends of every track.',
    input: 'file',
    params: [
      {
        id: 'metres',
        label: 'Metres from each end',
        type: 'number',
        defaultValue: '100',
        serialisable: true,
      },
    ],
    output: { kind: 'files', extension: 'geojson' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const file = inputFile(context);
      const document = await parseGeo(file.bytes);
      const metres = Number(context.params.metres ?? '100');
      const tracks = document.tracks.map((track) => trimEnds(track, metres));
      return {
        kind: 'files',
        files: [
          textFile(
            `${convertedName(file.name, 'geojson').replace(/\.geojson$/u, '')}-trimmed.geojson`,
            'application/geo+json',
            writeGeoJson({ tracks }),
          ),
        ],
        summary: `Trimmed ${metres} metres from both ends of ${tracks.length} track${tracks.length === 1 ? '' : 's'}.`,
      };
    },
  },
  {
    id: 'geo-strip-timestamps',
    source: 'formats-geo',
    name: 'Remove track timestamps',
    description: 'Remove every timestamp while preserving track coordinates.',
    input: 'file',
    params: [],
    output: { kind: 'files', extension: 'geojson' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const file = inputFile(context);
      const document = await parseGeo(file.bytes);
      const tracks = document.tracks.map(stripTimestamps);
      return {
        kind: 'files',
        files: [
          textFile(
            `${convertedName(file.name, 'geojson').replace(/\.geojson$/u, '')}-without-timestamps.geojson`,
            'application/geo+json',
            writeGeoJson({ tracks }),
          ),
        ],
        summary: `Removed timestamps from ${tracks.length} track${tracks.length === 1 ? '' : 's'}.`,
      };
    },
  },
] as const satisfies readonly KernelOperation[];
