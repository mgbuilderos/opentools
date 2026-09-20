import { parseTiff } from './exif';
import type { ImageMetadataResult, ImageStripResult } from './types';

function matchesAscii(
  bytes: Uint8Array,
  offset: number,
  text: string,
): boolean {
  if (offset + text.length > bytes.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

function concatByteArrays(chunks: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

/**
 * Within entropy-coded scan data, a literal 0xFF is stuffed as FF 00, and
 * restart markers are FF D0-D7. The first FF D9 after the scan starts is
 * the real end of image. Anything following it is trailer data (e.g. motion photo video).
 */
export function findJpegEndOfImage(bytes: Uint8Array, from: number): number {
  for (let i = from; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
      return i;
    }
  }
  return -1;
}

/**
 * A minimal EXIF segment carrying Orientation (tag 0x0112) and nothing else.
 *
 * Orientation lives inside the EXIF block. Dropping it silently rotates phone photos
 * on download, so when the source declares a rotation we re-emit just this one tag:
 * no GPS, no serial number, no timestamp, no thumbnail.
 */
export function createOrientationExifSegment(orientation: number): Uint8Array {
  return new Uint8Array([
    0xff,
    0xe1,
    0x00,
    0x22, // APP1, length 34
    0x45,
    0x78,
    0x69,
    0x66,
    0x00,
    0x00, // "Exif\0\0"
    0x49,
    0x49,
    0x2a,
    0x00, // little-endian TIFF header
    0x08,
    0x00,
    0x00,
    0x00, // IFD0 begins at offset 8
    0x01,
    0x00, // 1 directory entry
    0x12,
    0x01, // tag 0x0112 Orientation
    0x03,
    0x00, // type SHORT (2)
    0x01,
    0x00,
    0x00,
    0x00, // count 1
    orientation & 0xff,
    0x00,
    0x00,
    0x00, // inline value
    0x00,
    0x00,
    0x00,
    0x00, // next IFD offset: 0
  ]);
}

export function readJpegMetadata(bytes: Uint8Array): ImageMetadataResult {
  const result: ImageMetadataResult = {
    format: 'jpeg',
    hasMetadata: false,
    camera: {},
    shot: {},
    rawTextEntries: [],
    warnings: [],
  };

  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    result.warnings.push('Not a valid JPEG file (missing SOI header)');
    return result;
  }

  let offset = 2;
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) {
      break;
    }
    const marker = bytes[offset + 1];

    // SOS (Start of Scan) or EOI (End of Image) stops segment walking
    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    if (offset + 4 > bytes.length) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) {
      result.warnings.push('Malformed JPEG segment length');
      break;
    }

    const payload = bytes.subarray(offset + 4, offset + 2 + length);

    // APP1: Exif or XMP
    if (marker === 0xe1) {
      if (
        payload.length > 6 &&
        payload[0] === 0x45 &&
        payload[1] === 0x78 &&
        payload[2] === 0x69 &&
        payload[3] === 0x66 &&
        payload[4] === 0x00 &&
        payload[5] === 0x00
      ) {
        const tiffData = payload.subarray(6);
        const tiffRes = parseTiff(tiffData);
        if (tiffRes.hasExif) {
          result.hasMetadata = true;
          result.camera = { ...result.camera, ...tiffRes.camera };
          result.shot = { ...result.shot, ...tiffRes.shot };
          if (tiffRes.gps) {
            result.gps = tiffRes.gps;
          }
          if (tiffRes.warnings.length) {
            result.warnings.push(...tiffRes.warnings);
          }
        }
      } else if (matchesAscii(payload, 7, 'ns.adobe.com/xap/1.0/')) {
        result.hasMetadata = true;
        result.rawTextEntries.push({
          key: 'XMP',
          value: 'Adobe XMP metadata packet',
        });
      }
    } else if (marker === 0xed) {
      // APP13: IPTC / Photoshop
      result.hasMetadata = true;
      result.rawTextEntries.push({
        key: 'IPTC',
        value: 'Photoshop / IPTC metadata record',
      });
    } else if (marker === 0xfe) {
      // COM: Comment
      result.hasMetadata = true;
      let comment = '';
      for (let i = 0; i < payload.length; i++) {
        comment += String.fromCharCode(payload[i]);
      }
      result.rawTextEntries.push({
        key: 'Comment',
        value: comment.trim(),
      });
    }

    offset += 2 + length;
  }

  return result;
}

export function stripJpegMetadata(bytes: Uint8Array): ImageStripResult {
  const removed: string[] = [];
  const kept: string[] = [];
  const warnings: string[] = [];

  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    return {
      format: 'jpeg',
      success: false,
      cleanedBytes: bytes,
      originalSize: bytes.length,
      cleanedSize: bytes.length,
      bytesSaved: 0,
      removed,
      kept,
      warnings: ['Not a valid JPEG image file'],
    };
  }

  // Pre-parse to check if orientation needs to be preserved
  const inspected = readJpegMetadata(bytes);
  const orientation = inspected.shot.orientation ?? 0;

  const chunks: Uint8Array[] = [new Uint8Array([0xff, 0xd8])]; // SOI

  // If orientation is rotated (2-8), emit clean orientation segment
  if (orientation >= 2 && orientation <= 8) {
    chunks.push(createOrientationExifSegment(orientation));
    kept.push(`Orientation ${orientation}, preserved as the only EXIF tag`);
  }

  let offset = 2;
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) {
      warnings.push(
        'Parsing stopped at non-marker byte; remainder was copied unchanged',
      );
      chunks.push(bytes.subarray(offset));
      break;
    }
    const marker = bytes[offset + 1];

    if (marker === 0xd9) {
      // EOI reached before SOS
      chunks.push(bytes.subarray(offset, offset + 2));
      const trailer = bytes.length - (offset + 2);
      if (trailer > 0) {
        removed.push(`${trailer.toLocaleString()} bytes after end-of-image`);
      }
      break;
    }

    if (marker === 0xda) {
      // SOS (Start of Scan): image scan data begins
      const end = findJpegEndOfImage(bytes, offset + 2);
      if (end === -1) {
        warnings.push('No end-of-image marker found; scan data copied to EOF');
        chunks.push(bytes.subarray(offset));
      } else {
        chunks.push(bytes.subarray(offset, end + 2));
        const trailer = bytes.length - (end + 2);
        if (trailer > 0) {
          removed.push(`${trailer.toLocaleString()} bytes after end-of-image`);
        }
      }
      break;
    }

    if (offset + 4 > bytes.length) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) {
      warnings.push('Malformed segment encountered; copied remaining bytes');
      chunks.push(bytes.subarray(offset));
      break;
    }

    const segment = bytes.subarray(offset, offset + 2 + length);
    const payload = bytes.subarray(offset + 4, offset + 2 + length);

    if (marker === 0xe1) {
      // APP1: EXIF or XMP
      if (
        payload.length >= 6 &&
        payload[0] === 0x45 &&
        payload[1] === 0x78 &&
        payload[2] === 0x69 &&
        payload[3] === 0x66 &&
        payload[4] === 0x00 &&
        payload[5] === 0x00
      ) {
        removed.push('EXIF metadata block (APP1)');
      } else if (matchesAscii(payload, 7, 'ns.adobe.com/xap/1.0/')) {
        removed.push('Adobe XMP metadata packet (APP1)');
      } else {
        removed.push('APP1 application metadata segment');
      }
    } else if (marker === 0xfe) {
      removed.push('JPEG comment block (COM)');
    } else if (marker === 0xed) {
      removed.push('IPTC / Photoshop record (APP13)');
    } else if (marker === 0xe0) {
      // Keep APP0 JFIF
      chunks.push(segment);
      kept.push('JFIF header (APP0)');
    } else if (marker === 0xe2) {
      // Keep APP2 if ICC profile
      if (matchesAscii(payload, 0, 'ICC_PROFILE\0')) {
        chunks.push(segment);
        kept.push('ICC colour profile (APP2)');
      } else {
        removed.push('APP2 non-colour metadata segment');
      }
    } else if (marker === 0xee) {
      // Keep APP14 Adobe colour transform
      chunks.push(segment);
      kept.push('Adobe colour transform (APP14)');
    } else if (marker >= 0xe3 && marker <= 0xef) {
      // Other APPn metadata segments
      removed.push(`APP${marker - 0xe0} metadata block`);
    } else {
      // Keep essential image headers (DQT, SOF, DHT, DRI, etc.)
      chunks.push(segment);
    }

    offset += 2 + length;
  }

  const cleanedBytes = concatByteArrays(chunks);
  const bytesSaved = Math.max(0, bytes.length - cleanedBytes.length);

  return {
    format: 'jpeg',
    success: true,
    cleanedBytes,
    originalSize: bytes.length,
    cleanedSize: cleanedBytes.length,
    bytesSaved,
    removed,
    kept,
    warnings,
  };
}
