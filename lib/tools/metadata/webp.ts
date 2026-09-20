import { parseTiff } from './exif';
import type { ImageMetadataResult, ImageStripResult } from './types';

export function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  return (
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46 && // 'F'
    bytes[8] === 0x57 && // 'W'
    bytes[9] === 0x45 && // 'E'
    bytes[10] === 0x42 && // 'B'
    bytes[11] === 0x50 // 'P'
  );
}

export function readWebpMetadata(bytes: Uint8Array): ImageMetadataResult {
  const result: ImageMetadataResult = {
    format: 'webp',
    hasMetadata: false,
    camera: {},
    shot: {},
    rawTextEntries: [],
    warnings: [],
  };

  if (!isWebp(bytes)) {
    result.warnings.push('Not a valid WebP RIFF file');
    return result;
  }

  let offset = 12;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (offset + 8 <= bytes.length) {
    const fourCC = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const chunkSize = view.getUint32(offset + 4, true); // little-endian
    const paddedSize = chunkSize + (chunkSize % 2); // 1-byte pad if odd

    if (offset + 8 + chunkSize > bytes.length) {
      result.warnings.push(`Truncated WebP chunk ${fourCC}`);
      break;
    }

    const payload = bytes.subarray(offset + 8, offset + 8 + chunkSize);

    if (fourCC === 'VP8X') {
      if (chunkSize >= 10) {
        // 24-bit canvas width and height
        const w = payload[4] | (payload[5] << 8) | (payload[6] << 16);
        const h = payload[7] | (payload[8] << 8) | (payload[9] << 16);
        result.shot.width = w + 1;
        result.shot.height = h + 1;
      }
    } else if (fourCC === 'VP8 ') {
      // Simple lossy VP8 keyframe dimensions (10 bytes header)
      if (
        chunkSize >= 10 &&
        payload[0] === 0x9d &&
        payload[1] === 0x01 &&
        payload[2] === 0x2a
      ) {
        // Uncompressed keyframe tag starts with 0x9d012a at byte 3
        const w = (payload[6] | (payload[7] << 8)) & 0x3fff;
        const h = (payload[8] | (payload[9] << 8)) & 0x3fff;
        if (!result.shot.width) result.shot.width = w;
        if (!result.shot.height) result.shot.height = h;
      }
    } else if (fourCC === 'VP8L') {
      // Lossless VP8L signature: 0x2f, then 14-bit width-1, 14-bit height-1
      if (chunkSize >= 5 && payload[0] === 0x2f) {
        const b1 = payload[1];
        const b2 = payload[2];
        const b3 = payload[3];
        const b4 = payload[4];
        const w = 1 + (((b2 & 0x3f) << 8) | b1);
        const h = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
        if (!result.shot.width) result.shot.width = w;
        if (!result.shot.height) result.shot.height = h;
      }
    } else if (fourCC === 'EXIF') {
      result.hasMetadata = true;
      let tiffPayload = payload;
      // Some encoders prepend "Exif\0\0"
      if (
        payload.length >= 6 &&
        payload[0] === 0x45 &&
        payload[1] === 0x78 &&
        payload[2] === 0x69 &&
        payload[3] === 0x66 &&
        payload[4] === 0x00 &&
        payload[5] === 0x00
      ) {
        tiffPayload = payload.subarray(6);
      }
      const tiffRes = parseTiff(tiffPayload);
      if (tiffRes.hasExif) {
        result.camera = { ...result.camera, ...tiffRes.camera };
        result.shot = { ...result.shot, ...tiffRes.shot };
        if (tiffRes.gps) {
          result.gps = tiffRes.gps;
        }
        if (tiffRes.warnings.length) {
          result.warnings.push(...tiffRes.warnings);
        }
      }
    } else if (fourCC === 'XMP ') {
      result.hasMetadata = true;
      result.rawTextEntries.push({
        key: 'XMP',
        value: 'XMP metadata packet',
      });
    }

    offset += 8 + paddedSize;
  }

  return result;
}

export function stripWebpMetadata(bytes: Uint8Array): ImageStripResult {
  const removed: string[] = [];
  const kept: string[] = [];
  const warnings: string[] = [];

  if (!isWebp(bytes)) {
    return {
      format: 'webp',
      success: false,
      cleanedBytes: bytes,
      originalSize: bytes.length,
      cleanedSize: bytes.length,
      bytesSaved: 0,
      removed,
      kept,
      warnings: ['Not a valid WebP RIFF file'],
    };
  }

  const chunks: Uint8Array[] = [];
  // 12-byte RIFF header (placeholder, updated at end)
  chunks.push(new Uint8Array(12));

  let offset = 12;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (offset + 8 <= bytes.length) {
    const fourCC = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const chunkSize = view.getUint32(offset + 4, true);
    const paddedSize = chunkSize + (chunkSize % 2);

    if (offset + 8 + chunkSize > bytes.length) {
      warnings.push(`Truncated chunk ${fourCC}; copying remaining bytes`);
      chunks.push(bytes.subarray(offset));
      break;
    }

    const chunkTotal = 8 + paddedSize;
    const chunkBytes = bytes.subarray(offset, offset + chunkTotal);

    if (fourCC === 'EXIF') {
      removed.push('EXIF metadata chunk');
    } else if (fourCC === 'XMP ') {
      removed.push('XMP metadata chunk');
    } else if (fourCC === 'VP8X') {
      // Clone VP8X chunk and clear Exif (bit 3: 0x08) and XMP (bit 2: 0x04)
      const vp8xCopy = new Uint8Array(chunkBytes);
      if (vp8xCopy.length >= 9) {
        // Byte 8 is flags byte in chunk (offset 8 in chunk is payload byte 0)
        vp8xCopy[8] = vp8xCopy[8] & ~(0x04 | 0x08);
      }
      chunks.push(vp8xCopy);
    } else {
      chunks.push(chunkBytes);
      if (fourCC === 'ICCP') {
        kept.push('ICCP embedded colour profile');
      }
    }

    offset += chunkTotal;
  }

  let totalSize = 0;
  for (const c of chunks) totalSize += c.length;
  const cleanedBytes = new Uint8Array(totalSize);

  // Write updated RIFF header:
  // 'RIFF'
  cleanedBytes[0] = 0x52;
  cleanedBytes[1] = 0x49;
  cleanedBytes[2] = 0x46;
  cleanedBytes[3] = 0x46;
  // Size = totalSize - 8
  const riffSize = totalSize - 8;
  cleanedBytes[4] = riffSize & 0xff;
  cleanedBytes[5] = (riffSize >> 8) & 0xff;
  cleanedBytes[6] = (riffSize >> 16) & 0xff;
  cleanedBytes[7] = (riffSize >> 24) & 0xff;
  // 'WEBP'
  cleanedBytes[8] = 0x57;
  cleanedBytes[9] = 0x45;
  cleanedBytes[10] = 0x42;
  cleanedBytes[11] = 0x50;

  // Copy remaining chunks starting from index 1
  let pos = 12;
  for (let i = 1; i < chunks.length; i++) {
    cleanedBytes.set(chunks[i], pos);
    pos += chunks[i].length;
  }

  const bytesSaved = Math.max(0, bytes.length - cleanedBytes.length);

  return {
    format: 'webp',
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
