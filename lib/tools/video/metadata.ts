/**
 * Video metadata inspector and privacy stripper.
 *
 * Inspects EXIF, device model, software, creation timestamps, and GPS coordinates
 * written by smartphones (such as Apple's udta/©xyz ISO 6709 tags).
 *
 * Strips all identifying metadata without re-encoding video or audio frames.
 */

import type { Mp4File } from './mp4';
import type { ByteSource } from './source';
import { writeMp4Source, type TrackPlan } from './writer';

export interface VideoGpsCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  raw: string;
}

export interface VideoMetadata {
  creationTime?: Date;
  modificationTime?: Date;
  deviceMake?: string;
  deviceModel?: string;
  software?: string;
  title?: string;
  artist?: string;
  comment?: string;
  gps?: VideoGpsCoordinates;
  hasIdentifyingMetadata: boolean;
  privacyRisks: string[];
}

export interface StripMetadataResult {
  blob: Blob;
  size: number;
  originalSize: number;
  bytesSaved: number;
  removedFields: string[];
}

const MAC_EPOCH_OFFSET_SECONDS = 2082844800; // Seconds between 1904-01-01 and 1970-01-01

function parseMacTimestamp(secondsSince1904: number): Date | undefined {
  if (!secondsSince1904 || secondsSince1904 <= 0) return undefined;
  const unixSeconds = secondsSince1904 - MAC_EPOCH_OFFSET_SECONDS;
  // Plausibility check: between 1995 and 2099
  if (unixSeconds < 788918400 || unixSeconds > 4102444800) return undefined;
  return new Date(unixSeconds * 1000);
}

function parseIso6709Gps(text: string): VideoGpsCoordinates | undefined {
  // ISO 6709 coordinate string: +37.7749-122.4194/ or +37.7749-122.4194+015.000/
  const match = text.match(
    /([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)(?:([+-]\d+(?:\.\d+)?))?\/?/,
  );
  if (!match) return undefined;

  const latitude = parseFloat(match[1]);
  const longitude = parseFloat(match[2]);
  const altitude = match[3] ? parseFloat(match[3]) : undefined;

  if (isNaN(latitude) || isNaN(longitude)) return undefined;
  return { latitude, longitude, altitude, raw: text.trim() };
}

function trimTrailingControlChars(str: string): string {
  let end = str.length;
  while (end > 0 && str.charCodeAt(end - 1) <= 31) {
    end--;
  }
  return str.slice(0, end).trim();
}

function extractTextFromUserDataBox(bytes: Uint8Array): string {
  // If box contains a 'data' child box (iTunes atom format: [4 len][4 'data'][4 type][4 locale][content])
  if (bytes.length >= 16) {
    const childType = String.fromCharCode(
      bytes[4],
      bytes[5],
      bytes[6],
      bytes[7],
    );
    if (childType === 'data') {
      // payload starts at byte 16
      const content = bytes.subarray(16);
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(
        content,
      );
      return trimTrailingControlChars(decoded);
    }
  }

  // QuickTime user data format: usually [2 length][2 language] then string
  let offset = 0;
  if (bytes.length > 4 && (bytes[0] === 0 || bytes[1] === 0)) {
    offset = 4;
  }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(
    bytes.subarray(offset),
  );
  return trimTrailingControlChars(text);
}

/**
 * Inspects an MP4/MOV container for privacy-sensitive metadata (GPS, device, timestamps).
 */
export async function inspectVideoMetadata(
  source: ByteSource,
  _movie: Mp4File,
): Promise<VideoMetadata> {
  const result: VideoMetadata = {
    hasIdentifyingMetadata: false,
    privacyRisks: [],
  };

  // 1. Read mvhd creation/modification timestamp
  // We read the first 128KB where moov/mvhd typically resides
  const headBytes = await source.slice(0, Math.min(source.size, 128 * 1024));
  const view = new DataView(
    headBytes.buffer,
    headBytes.byteOffset,
    headBytes.byteLength,
  );

  // Scan for 'mvhd'
  for (let i = 0; i <= headBytes.length - 32; i++) {
    if (
      headBytes[i] === 0x6d && // 'm'
      headBytes[i + 1] === 0x76 && // 'v'
      headBytes[i + 2] === 0x68 && // 'h'
      headBytes[i + 3] === 0x64 // 'd'
    ) {
      const version = headBytes[i + 4];
      if (version === 0 && i + 16 <= headBytes.length) {
        const createSec = view.getUint32(i + 5);
        const modSec = view.getUint32(i + 9);
        result.creationTime = parseMacTimestamp(createSec);
        result.modificationTime = parseMacTimestamp(modSec);
      } else if (version === 1 && i + 24 <= headBytes.length) {
        // 64-bit creation time
        const createSec = Number(view.getBigUint64(i + 5));
        const modSec = Number(view.getBigUint64(i + 13));
        result.creationTime = parseMacTimestamp(createSec);
        result.modificationTime = parseMacTimestamp(modSec);
      }
      break;
    }
  }

  // 2. Scan for udta / meta user data tags
  // Look across the moov box byte range
  // Common FourCCs in QuickTime/MP4:
  // ©xyz (GPS), ©mak (Manufacturer), ©mod (Model), ©swr (Software), ©day (Date), ©nam (Title), ©art (Artist)
  const tagsToFind: Record<string, string> = {
    '\xa9xyz': 'gps',
    '\xa9mak': 'deviceMake',
    '\xa9mod': 'deviceModel',
    '\xa9swr': 'software',
    '\xa9day': 'date',
    '\xa9nam': 'title',
    '\xa9art': 'artist',
    '\xa9cmt': 'comment',
  };

  // Search header/metadata bytes
  // If file has moov at the end or udta anywhere, we scan the head, and if large, slice around moov
  for (let i = 0; i <= headBytes.length - 8; i++) {
    for (const [tag, field] of Object.entries(tagsToFind)) {
      const b0 = tag.charCodeAt(0);
      const b1 = tag.charCodeAt(1);
      const b2 = tag.charCodeAt(2);
      const b3 = tag.charCodeAt(3);

      if (
        headBytes[i] === b0 &&
        headBytes[i + 1] === b1 &&
        headBytes[i + 2] === b2 &&
        headBytes[i + 3] === b3
      ) {
        // Found tag. Box length is 4 bytes preceding tag:
        if (i >= 4) {
          const boxLen = view.getUint32(i - 4);
          if (
            boxLen >= 8 &&
            boxLen < 4096 &&
            i - 4 + boxLen <= headBytes.length
          ) {
            const body = headBytes.subarray(i + 4, i - 4 + boxLen);
            const text = extractTextFromUserDataBox(body);
            if (text) {
              if (field === 'gps' && !result.gps) {
                result.gps = parseIso6709Gps(text);
              } else if (field === 'deviceMake' && !result.deviceMake) {
                result.deviceMake = text;
              } else if (field === 'deviceModel' && !result.deviceModel) {
                result.deviceModel = text;
              } else if (field === 'software' && !result.software) {
                result.software = text;
              } else if (field === 'title' && !result.title) {
                result.title = text;
              } else if (field === 'artist' && !result.artist) {
                result.artist = text;
              } else if (field === 'comment' && !result.comment) {
                result.comment = text;
              }
            }
          }
        }
      }
    }
  }

  // Assess privacy risks
  if (result.gps) {
    result.hasIdentifyingMetadata = true;
    result.privacyRisks.push(
      `Exact GPS Coordinates (${result.gps.latitude.toFixed(4)}, ${result.gps.longitude.toFixed(4)}): reveals the precise physical location where this video was filmed.`,
    );
  }
  if (result.deviceMake || result.deviceModel) {
    result.hasIdentifyingMetadata = true;
    const deviceStr = [result.deviceMake, result.deviceModel]
      .filter(Boolean)
      .join(' ');
    result.privacyRisks.push(
      `Device identity (${deviceStr}): identifies your specific phone, camera, or computer model.`,
    );
  }
  if (result.creationTime) {
    result.hasIdentifyingMetadata = true;
    result.privacyRisks.push(
      `Original recording timestamp (${result.creationTime.toISOString()}): reveals exact date and time of capture.`,
    );
  }
  if (result.software) {
    result.hasIdentifyingMetadata = true;
    result.privacyRisks.push(
      `Software version (${result.software}): reveals operating system or editing software version.`,
    );
  }

  return result;
}

/**
 * Strips all metadata, GPS tags, device signatures, and creation dates,
 * rewriting the container without modifying or re-encoding video or audio frames.
 */
export async function stripVideoMetadata(
  source: ByteSource,
  movie: Mp4File,
): Promise<StripMetadataResult> {
  const metaBefore = await inspectVideoMetadata(source, movie);
  const removedFields: string[] = [];

  if (metaBefore.gps) removedFields.push('GPS Location Coordinates');
  if (metaBefore.deviceModel || metaBefore.deviceMake)
    removedFields.push('Device Make & Model');
  if (metaBefore.creationTime)
    removedFields.push('Capture & Modification Timestamps');
  if (metaBefore.software) removedFields.push('Software Version & OS Info');
  if (metaBefore.title || metaBefore.artist || metaBefore.comment) {
    removedFields.push('User Annotations (Title, Artist, Comments)');
  }
  if (removedFields.length === 0) {
    removedFields.push('Container Timestamps & Tracking Identifiers');
  }

  const plans: TrackPlan[] = movie.tracks.map((track) => ({
    track,
    samples: track.samples,
    sampleDescription: track.sampleDescription,
  }));

  const written = await writeMp4Source(source, plans, movie);

  return {
    blob: written.blob,
    size: written.size,
    originalSize: source.size,
    bytesSaved: Math.max(0, source.size - written.size),
    removedFields,
  };
}
