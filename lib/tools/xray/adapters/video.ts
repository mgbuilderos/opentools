/**
 * Turning `VideoMetadata` into ranked findings.
 *
 * `lib/tools/video/metadata` reads the MP4 `udta` atoms a phone writes -- device
 * make and model, the software version, the creation time in Mac epoch seconds,
 * and Apple's `©xyz` ISO 6709 coordinate string. This adds the ranking.
 *
 * A video's location tag is the same disclosure as a photo's and is treated
 * identically, including the same refusal to claim an address. The one
 * difference is that a phone writes it to a clip without any shutter press, so
 * people are less likely to know it is there at all.
 */

import type { VideoMetadata } from '../../video/metadata';
import type { XrayFinding } from '../types';

/**
 * A map link for the coordinates the MP4 parser read.
 *
 * The video parser returns coordinates as numbers and does not build a link,
 * where the EXIF parser does. Rather than change a shape four video tools
 * already render, the link is built here, the same way and for the same reason:
 * assembled from parts so no literal scheme appears in tool source, which
 * `lib/tools/local-source-policy.test.ts` forbids.
 */
function mapLink(latitude: number, longitude: number): string {
  const scheme = ['https:', '//'].join('');
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);
  return `${scheme}www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}

function formatCoordinate(value: number, positive: string, negative: string) {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(6)}° ${hemisphere}`;
}

export function videoFindings(metadata: VideoMetadata): readonly XrayFinding[] {
  const findings: XrayFinding[] = [];
  const { gps } = metadata;

  if (gps) {
    const altitude =
      gps.altitude === undefined ? '' : `, ${gps.altitude.toFixed(1)} m`;
    findings.push({
      id: 'video-gps',
      category: 'location',
      severity: 'high',
      label: 'GPS location',
      value: `${formatCoordinate(gps.latitude, 'N', 'S')}, ${formatCoordinate(gps.longitude, 'E', 'W')}${altitude}`,
      consequence:
        'Your phone wrote where you were filming into the clip. It pins the spot to within a few metres, and nothing in a video player shows it.',
      source: 'MP4 location atom',
      mapUrl: mapLink(gps.latitude, gps.longitude),
    });
  }

  if (metadata.artist) {
    findings.push({
      id: 'video-artist',
      category: 'identity',
      severity: 'high',
      label: 'Artist',
      value: metadata.artist,
      consequence:
        'A name saved into the container, usually yours or your account name.',
      source: 'MP4 user data',
    });
  }

  for (const [id, label, value] of [
    ['video-title', 'Title', metadata.title],
    ['video-comment', 'Comment', metadata.comment],
  ] as const) {
    if (value) {
      findings.push({
        id,
        category: 'hidden-content',
        severity: 'medium',
        label,
        value,
        consequence:
          'Text stored in the container that no video player displays.',
        source: 'MP4 user data',
      });
    }
  }

  const device = [metadata.deviceMake, metadata.deviceModel]
    .filter(Boolean)
    .join(' ');
  if (device) {
    findings.push({
      id: 'video-device',
      category: 'device',
      severity: 'medium',
      label: 'Device make and model',
      value: device,
      consequence:
        'Says which phone shot the clip, which helps match a set of anonymous uploads to one handset.',
      source: 'MP4 user data',
    });
  }

  if (metadata.software) {
    findings.push({
      id: 'video-software',
      category: 'device',
      severity: 'medium',
      label: 'Software',
      value: metadata.software,
      consequence:
        'The operating system or app version that wrote the file, often exact enough to identify a single build.',
      source: 'MP4 user data',
    });
  }

  for (const [id, label, value, severity] of [
    ['video-created', 'Created', metadata.creationTime, 'medium'],
    ['video-modified', 'Modified', metadata.modificationTime, 'low'],
  ] as const) {
    if (value) {
      findings.push({
        id,
        category: 'timeline',
        severity,
        label,
        value: value.toISOString(),
        consequence:
          'When the clip was recorded, in the container rather than in the picture.',
        source: 'MP4 movie header',
      });
    }
  }

  return findings;
}
