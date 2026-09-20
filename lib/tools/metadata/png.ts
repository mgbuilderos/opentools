import { parseTiff } from './exif';
import type { ImageMetadataResult, ImageStripResult } from './types';

export const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

export function readPngMetadata(bytes: Uint8Array): ImageMetadataResult {
  const result: ImageMetadataResult = {
    format: 'png',
    hasMetadata: false,
    camera: {},
    shot: {},
    rawTextEntries: [],
    warnings: [],
  };

  if (!isPng(bytes)) {
    result.warnings.push('Not a valid PNG file (invalid signature)');
    return result;
  }

  let offset = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const chunkType = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );

    const chunkTotal = 12 + length;
    if (offset + chunkTotal > bytes.length) {
      result.warnings.push(`Truncated PNG chunk ${chunkType}`);
      break;
    }

    const payload = bytes.subarray(offset + 8, offset + 8 + length);

    if (chunkType === 'IHDR') {
      if (length >= 8) {
        result.shot.width = view.getUint32(offset + 8, false);
        result.shot.height = view.getUint32(offset + 12, false);
      }
    } else if (chunkType === 'eXIf') {
      result.hasMetadata = true;
      const tiffRes = parseTiff(payload);
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
    } else if (chunkType === 'tEXt') {
      result.hasMetadata = true;
      // Format: keyword\0text
      let nullIndex = -1;
      for (let i = 0; i < payload.length; i++) {
        if (payload[i] === 0) {
          nullIndex = i;
          break;
        }
      }
      if (nullIndex !== -1) {
        let keyword = '';
        for (let i = 0; i < nullIndex; i++) {
          keyword += String.fromCharCode(payload[i]);
        }
        let text = '';
        for (let i = nullIndex + 1; i < payload.length; i++) {
          text += String.fromCharCode(payload[i]);
        }
        result.rawTextEntries.push({ key: keyword.trim(), value: text.trim() });
      }
    } else if (chunkType === 'iTXt' || chunkType === 'zTXt') {
      result.hasMetadata = true;
      let nullIndex = -1;
      for (let i = 0; i < payload.length; i++) {
        if (payload[i] === 0) {
          nullIndex = i;
          break;
        }
      }
      if (nullIndex !== -1) {
        let keyword = '';
        for (let i = 0; i < nullIndex; i++) {
          keyword += String.fromCharCode(payload[i]);
        }
        result.rawTextEntries.push({
          key: keyword.trim(),
          value: `[${chunkType} metadata entry]`,
        });
      }
    } else if (chunkType === 'tIME') {
      result.hasMetadata = true;
      if (payload.length >= 7) {
        const year = (payload[0] << 8) | payload[1];
        const month = String(payload[2]).padStart(2, '0');
        const day = String(payload[3]).padStart(2, '0');
        const hour = String(payload[4]).padStart(2, '0');
        const minute = String(payload[5]).padStart(2, '0');
        const second = String(payload[6]).padStart(2, '0');
        result.rawTextEntries.push({
          key: 'Timestamp (tIME)',
          value: `${year}-${month}-${day} ${hour}:${minute}:${second}`,
        });
      }
    }

    if (chunkType === 'IEND') {
      break;
    }

    offset += chunkTotal;
  }

  return result;
}

export function stripPngMetadata(bytes: Uint8Array): ImageStripResult {
  const removed: string[] = [];
  const kept: string[] = [];
  const warnings: string[] = [];

  if (!isPng(bytes)) {
    return {
      format: 'png',
      success: false,
      cleanedBytes: bytes,
      originalSize: bytes.length,
      cleanedSize: bytes.length,
      bytesSaved: 0,
      removed,
      kept,
      warnings: ['Not a valid PNG file'],
    };
  }

  const chunks: Uint8Array[] = [PNG_SIGNATURE];
  let offset = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const chunkType = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );

    const chunkTotal = 12 + length;
    if (offset + chunkTotal > bytes.length) {
      warnings.push(
        `Truncated chunk ${chunkType} at end of file; preserved remainder`,
      );
      chunks.push(bytes.subarray(offset));
      break;
    }

    const chunkData = bytes.subarray(offset, offset + chunkTotal);

    if (chunkType === 'eXIf') {
      removed.push('eXIf metadata chunk');
    } else if (chunkType === 'tEXt') {
      removed.push('tEXt textual metadata chunk');
    } else if (chunkType === 'zTXt') {
      removed.push('zTXt compressed textual chunk');
    } else if (chunkType === 'iTXt') {
      removed.push('iTXt international textual chunk');
    } else if (chunkType === 'tIME') {
      removed.push('tIME modification timestamp chunk');
    } else {
      // Essential chunks and colour chunks:
      // IHDR, PLTE, IDAT, IEND, cHRM, gAMA, iCCP, sRGB, pHYs, sBIT
      chunks.push(chunkData);
      if (chunkType === 'iCCP') {
        kept.push('iCCP embedded colour profile');
      } else if (chunkType === 'sRGB') {
        kept.push('sRGB colour space chunk');
      }
    }

    if (chunkType === 'IEND') {
      // Any bytes after IEND are non-standard trailing data
      const trailer = bytes.length - (offset + chunkTotal);
      if (trailer > 0) {
        removed.push(`${trailer.toLocaleString()} bytes after IEND trailer`);
      }
      break;
    }

    offset += chunkTotal;
  }

  let totalSize = 0;
  for (const c of chunks) totalSize += c.length;
  const cleanedBytes = new Uint8Array(totalSize);
  let pos = 0;
  for (const c of chunks) {
    cleanedBytes.set(c, pos);
    pos += c.length;
  }

  const bytesSaved = Math.max(0, bytes.length - cleanedBytes.length);

  return {
    format: 'png',
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
