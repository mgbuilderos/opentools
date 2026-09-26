export type GeoFormatErrorCode =
  | 'INVALID_ENCODING'
  | 'UNSUPPORTED_FORMAT'
  | 'MALFORMED_GPX'
  | 'MALFORMED_KML'
  | 'MALFORMED_GEOJSON'
  | 'INVALID_COORDINATE'
  | 'INVALID_DISTANCE';

export class GeoFormatError extends Error {
  readonly code: GeoFormatErrorCode;

  constructor(code: GeoFormatErrorCode, message: string) {
    super(message);
    this.name = 'GeoFormatError';
    this.code = code;
  }
}

export interface TrackPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: string;
}

export interface Track {
  name?: string;
  points: readonly TrackPoint[];
}

export interface GeoDocument {
  tracks: readonly Track[];
}

type XmlErrorCode = 'MALFORMED_GPX' | 'MALFORMED_KML';

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/u, '');
  } catch {
    throw new GeoFormatError(
      'INVALID_ENCODING',
      'The geographic file is not valid UTF-8.',
    );
  }
}

function findMarkupEnd(source: string, start: number): number {
  let quote = '';
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function malformedXml(code: XmlErrorCode): never {
  throw new GeoFormatError(
    code,
    'The XML document is incomplete or malformed.',
  );
}

function validateXml(source: string, code: XmlErrorCode): void {
  if (/<!DOCTYPE\b/iu.test(source)) {
    throw new GeoFormatError(
      code,
      'Document type declarations are not supported.',
    );
  }

  const stack: string[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;
    if (source.startsWith('<!--', start)) {
      const end = source.indexOf('-->', start + 4);
      if (end < 0) malformedXml(code);
      cursor = end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', start)) {
      const end = source.indexOf(']]>', start + 9);
      if (end < 0) malformedXml(code);
      cursor = end + 3;
      continue;
    }
    if (source.startsWith('<?', start)) {
      const end = source.indexOf('?>', start + 2);
      if (end < 0) malformedXml(code);
      cursor = end + 2;
      continue;
    }

    const end = findMarkupEnd(source, start + 1);
    if (end < 0) malformedXml(code);
    const markup = source.slice(start + 1, end).trim();
    if (!markup || markup.startsWith('!')) malformedXml(code);

    const closing = markup.startsWith('/');
    const selfClosing = markup.endsWith('/');
    const name = (closing ? markup.slice(1) : markup).match(
      /^([A-Za-z_][\w.:-]*)/u,
    )?.[1];
    if (!name) malformedXml(code);

    if (closing) {
      if (selfClosing || stack.pop() !== name) malformedXml(code);
    } else if (!selfClosing) {
      stack.push(name);
    }
    cursor = end + 1;
  }
  if (stack.length > 0) malformedXml(code);
}

function decodeXml(value: string, code: XmlErrorCode): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/giu,
    (_match, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower === 'amp') return '&';
      if (lower === 'apos') return "'";
      if (lower === 'gt') return '>';
      if (lower === 'lt') return '<';
      if (lower === 'quot') return '"';
      const point = lower.startsWith('#x')
        ? Number.parseInt(lower.slice(2), 16)
        : Number.parseInt(lower.slice(1), 10);
      if (!Number.isSafeInteger(point) || point < 0 || point > 0x10ffff) {
        throw new GeoFormatError(
          code,
          'The XML document has an invalid entity.',
        );
      }
      return String.fromCodePoint(point);
    },
  );
}

function elementBlocks(source: string, localName: string): string[] {
  const expression = new RegExp(
    `<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${localName}\\s*>`,
    'giu',
  );
  return [...source.matchAll(expression)].map((match) => match[0]);
}

function elementBody(source: string, localName: string): string | undefined {
  const expression = new RegExp(
    `<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${localName}\\s*>`,
    'iu',
  );
  return source.match(expression)?.[1];
}

function attribute(source: string, name: string): string | undefined {
  const openingEnd = source.indexOf('>');
  if (openingEnd < 0) return undefined;
  const opening = source.slice(0, openingEnd + 1);
  const expression = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    'iu',
  );
  const match = opening.match(expression);
  return match?.[1] ?? match?.[2];
}

function textElement(
  source: string,
  name: string,
  code: XmlErrorCode,
): string | undefined {
  const body = elementBody(source, name);
  return body === undefined ? undefined : decodeXml(body.trim(), code);
}

function coordinate(
  longitude: unknown,
  latitude: unknown,
  elevation?: unknown,
): TrackPoint {
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    (elevation !== undefined &&
      (typeof elevation !== 'number' || !Number.isFinite(elevation)))
  ) {
    throw new GeoFormatError(
      'INVALID_COORDINATE',
      'A coordinate is outside the supported geographic range.',
    );
  }
  return elevation === undefined
    ? { latitude, longitude }
    : { latitude, longitude, elevation };
}

function parseFinite(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function parseGpx(bytes: Uint8Array): Promise<GeoDocument> {
  const source = decodeUtf8(bytes);
  validateXml(source, 'MALFORMED_GPX');
  if (!/<(?:[\w.-]+:)?gpx(?:\s|>)/iu.test(source)) {
    throw new GeoFormatError('UNSUPPORTED_FORMAT', 'The file is not GPX.');
  }

  const tracks = elementBlocks(source, 'trk').map((trackSource) => {
    const points = elementBlocks(trackSource, 'trkpt').map((pointSource) => {
      const point = coordinate(
        parseFinite(attribute(pointSource, 'lon')),
        parseFinite(attribute(pointSource, 'lat')),
        parseFinite(textElement(pointSource, 'ele', 'MALFORMED_GPX')),
      );
      const timestamp = textElement(pointSource, 'time', 'MALFORMED_GPX');
      return timestamp ? { ...point, timestamp } : point;
    });
    if (points.length === 0) {
      throw new GeoFormatError(
        'MALFORMED_GPX',
        'A GPX track must contain at least one track point.',
      );
    }
    const name = textElement(trackSource, 'name', 'MALFORMED_GPX');
    return name ? { name, points } : { points };
  });

  if (tracks.length === 0) {
    throw new GeoFormatError(
      'MALFORMED_GPX',
      'The GPX document does not contain a track.',
    );
  }
  return { tracks };
}

export async function parseKml(bytes: Uint8Array): Promise<GeoDocument> {
  const source = decodeUtf8(bytes);
  validateXml(source, 'MALFORMED_KML');
  if (!/<(?:[\w.-]+:)?kml(?:\s|>)/iu.test(source)) {
    throw new GeoFormatError('UNSUPPORTED_FORMAT', 'The file is not KML.');
  }

  const tracks: Track[] = [];
  for (const placemark of elementBlocks(source, 'Placemark')) {
    const name = textElement(placemark, 'name', 'MALFORMED_KML');
    for (const lineString of elementBlocks(placemark, 'LineString')) {
      const raw = textElement(lineString, 'coordinates', 'MALFORMED_KML');
      if (!raw) {
        throw new GeoFormatError(
          'MALFORMED_KML',
          'A KML LineString has no coordinates.',
        );
      }
      const points = raw.split(/\s+/u).map((item) => {
        const values = item.split(',').map(Number);
        if (values.length < 2 || values.length > 3) {
          throw new GeoFormatError(
            'INVALID_COORDINATE',
            'A KML coordinate must contain longitude and latitude.',
          );
        }
        return coordinate(values[0], values[1], values[2]);
      });
      tracks.push(name ? { name, points } : { points });
    }
  }

  if (tracks.length === 0) {
    throw new GeoFormatError(
      'MALFORMED_KML',
      'The KML document does not contain a Placemark LineString.',
    );
  }
  return { tracks };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function geoJsonPoint(value: unknown, timestamp: unknown): TrackPoint {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
    throw new GeoFormatError(
      'MALFORMED_GEOJSON',
      'A GeoJSON position must contain two or three numbers.',
    );
  }
  const point = coordinate(value[0], value[1], value[2]);
  return typeof timestamp === 'string' ? { ...point, timestamp } : point;
}

export async function parseGeoJson(bytes: Uint8Array): Promise<GeoDocument> {
  let value: unknown;
  try {
    value = JSON.parse(decodeUtf8(bytes));
  } catch (error) {
    if (error instanceof GeoFormatError) throw error;
    throw new GeoFormatError(
      'MALFORMED_GEOJSON',
      'The GeoJSON document is not valid JSON.',
    );
  }
  if (!isRecord(value) || value.type !== 'FeatureCollection') {
    throw new GeoFormatError(
      'UNSUPPORTED_FORMAT',
      'The file is not a GeoJSON FeatureCollection.',
    );
  }
  if (!Array.isArray(value.features)) {
    throw new GeoFormatError(
      'MALFORMED_GEOJSON',
      'The GeoJSON FeatureCollection has no features array.',
    );
  }

  const tracks: Track[] = [];
  for (const feature of value.features) {
    if (!isRecord(feature) || feature.type !== 'Feature') {
      throw new GeoFormatError(
        'MALFORMED_GEOJSON',
        'The GeoJSON features array contains an invalid feature.',
      );
    }
    const properties = isRecord(feature.properties) ? feature.properties : {};
    const geometry = feature.geometry;
    if (!isRecord(geometry) || !Array.isArray(geometry.coordinates)) {
      throw new GeoFormatError(
        'MALFORMED_GEOJSON',
        'A GeoJSON feature has no supported geometry.',
      );
    }
    const name =
      typeof properties.name === 'string' ? properties.name : undefined;
    const timestamps = Array.isArray(properties.timestamps)
      ? properties.timestamps
      : [];
    const addTrack = (positions: unknown[], suffix?: number) => {
      const points = positions.map((position, index) =>
        geoJsonPoint(position, timestamps[index]),
      );
      const trackName =
        suffix === undefined || name === undefined
          ? name
          : `${name} ${suffix + 1}`;
      tracks.push(trackName ? { name: trackName, points } : { points });
    };
    if (geometry.type === 'LineString') {
      addTrack(geometry.coordinates);
    } else if (geometry.type === 'MultiLineString') {
      geometry.coordinates.forEach((positions, index) => {
        if (!Array.isArray(positions)) {
          throw new GeoFormatError(
            'MALFORMED_GEOJSON',
            'A GeoJSON MultiLineString contains an invalid line.',
          );
        }
        addTrack(positions, index);
      });
    } else {
      throw new GeoFormatError(
        'MALFORMED_GEOJSON',
        'Only GeoJSON LineString and MultiLineString geometries are supported.',
      );
    }
  }
  return { tracks };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;');
}

function checkedPoint(point: TrackPoint): TrackPoint {
  coordinate(point.longitude, point.latitude, point.elevation);
  return point;
}

export function writeGpx(document: GeoDocument): string {
  const tracks = document.tracks
    .map((track) => {
      const name = track.name ? `<name>${escapeXml(track.name)}</name>` : '';
      const points = track.points
        .map((candidate) => {
          const point = checkedPoint(candidate);
          const elevation =
            point.elevation === undefined
              ? ''
              : `<ele>${point.elevation}</ele>`;
          const timestamp = point.timestamp
            ? `<time>${escapeXml(point.timestamp)}</time>`
            : '';
          return `<trkpt lat="${point.latitude}" lon="${point.longitude}">${elevation}${timestamp}</trkpt>`;
        })
        .join('');
      return `<trk>${name}<trkseg>${points}</trkseg></trk>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="offline-tool" xmlns="http://www.topografix.com/GPX/1/1">${tracks}</gpx>`;
}

export function writeKml(document: GeoDocument): string {
  const placemarks = document.tracks
    .map((track) => {
      const name = track.name ? `<name>${escapeXml(track.name)}</name>` : '';
      const coordinates = track.points
        .map((candidate) => {
          const point = checkedPoint(candidate);
          return point.elevation === undefined
            ? `${point.longitude},${point.latitude}`
            : `${point.longitude},${point.latitude},${point.elevation}`;
        })
        .join(' ');
      return `<Placemark>${name}<LineString><coordinates>${coordinates}</coordinates></LineString></Placemark>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>${placemarks}</Document></kml>`;
}

export function writeGeoJson(document: GeoDocument): string {
  return JSON.stringify({
    type: 'FeatureCollection',
    features: document.tracks.map((track) => {
      const hasTimestamps = track.points.some((point) => point.timestamp);
      return {
        type: 'Feature',
        properties: {
          ...(track.name ? { name: track.name } : {}),
          ...(hasTimestamps
            ? {
                timestamps: track.points.map(
                  (point) => point.timestamp ?? null,
                ),
              }
            : {}),
        },
        geometry: {
          type: 'LineString',
          coordinates: track.points.map((candidate) => {
            const point = checkedPoint(candidate);
            return point.elevation === undefined
              ? [point.longitude, point.latitude]
              : [point.longitude, point.latitude, point.elevation];
          }),
        },
      };
    }),
  });
}

const WGS84_MEAN_RADIUS_METRES = 6_371_008.8;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates point-to-point distance with Haversine on a sphere using the
 * WGS 84 mean Earth radius. It intentionally performs no map matching or
 * coordinate-system conversion.
 */
export function haversineMetres(left: TrackPoint, right: TrackPoint): number {
  checkedPoint(left);
  checkedPoint(right);
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const leftLatitude = radians(left.latitude);
  const rightLatitude = radians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    WGS84_MEAN_RADIUS_METRES *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

/** Removes the requested WGS 84 Haversine distance from both track ends. */
export function trimEnds(track: Track, metres: number): Track {
  if (!Number.isFinite(metres) || metres < 0) {
    throw new GeoFormatError(
      'INVALID_DISTANCE',
      'The trim distance must be a non-negative finite number.',
    );
  }
  if (metres === 0) return { ...track, points: [...track.points] };
  if (track.points.length < 2) return { ...track, points: [] };

  const cumulative = [0];
  for (let index = 1; index < track.points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1]! +
        haversineMetres(track.points[index - 1]!, track.points[index]!),
    );
  }
  const total = cumulative[cumulative.length - 1]!;
  const points = track.points.filter(
    (_point, index) =>
      cumulative[index]! >= metres && total - cumulative[index]! >= metres,
  );
  return { ...track, points };
}

export function stripTimestamps(track: Track): Track {
  return {
    ...track,
    points: track.points.map(({ timestamp: _timestamp, ...point }) => point),
  };
}
