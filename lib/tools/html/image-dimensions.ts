import type { ImageDimension } from './types';

/**
 * Extracts width and height from image binary bytes without canvas or DOM.
 * Supports PNG, JPEG, WebP, and SVG formats in any JS/TS environment.
 */
export function getImageDimensions(bytes: Uint8Array): ImageDimension | null {
  if (bytes.length < 8) return null;

  // 1. PNG check: signature 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    if (bytes.length < 24) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    if (width > 0 && height > 0) {
      return { format: 'png', width, height };
    }
  }

  // 2. JPEG check: starts with FF D8
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    while (offset < bytes.length - 1) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break; // End of image or start of scan

      // Markers without length
      if (
        marker === 0x00 ||
        (marker >= 0xd0 && marker <= 0xd7) ||
        marker === 0x01
      ) {
        offset += 2;
        continue;
      }

      if (offset + 4 > bytes.length) break;
      const length = view.getUint16(offset + 2, false);

      // Start of Frame markers (SOF0, SOF1, SOF2)
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        if (offset + 9 <= bytes.length) {
          const height = view.getUint16(offset + 5, false);
          const width = view.getUint16(offset + 7, false);
          if (width > 0 && height > 0) {
            return { format: 'jpeg', width, height };
          }
        }
      }
      offset += 2 + length;
    }
  }

  // 3. WebP check: RIFF .... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 30
  ) {
    const riff = String.fromCharCode(
      bytes[8] ?? 0,
      bytes[9] ?? 0,
      bytes[10] ?? 0,
      bytes[11] ?? 0,
    );
    if (riff === 'WEBP') {
      const chunk = String.fromCharCode(
        bytes[12] ?? 0,
        bytes[13] ?? 0,
        bytes[14] ?? 0,
        bytes[15] ?? 0,
      );
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );

      // Extended WebP: VP8X
      if (chunk === 'VP8X' && bytes.length >= 30) {
        const width = 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16));
        const height =
          1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16));
        return { format: 'webp', width, height };
      }

      // Simple lossy WebP: VP8
      if (chunk === 'VP8 ' && bytes.length >= 30) {
        const width = view.getUint16(26, true) & 0x3fff;
        const height = view.getUint16(28, true) & 0x3fff;
        if (width > 0 && height > 0) {
          return { format: 'webp', width, height };
        }
      }

      // Simple lossless WebP: VP8L
      if (chunk === 'VP8L' && bytes.length >= 25) {
        const b0 = bytes[21]!;
        const b1 = bytes[22]!;
        const b2 = bytes[23]!;
        const b3 = bytes[24]!;
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height =
          1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { format: 'webp', width, height };
      }
    }
  }

  // 4. SVG check: text check for <svg ...>
  try {
    const textSlice = new TextDecoder('utf-8', { fatal: false }).decode(
      bytes.slice(0, 4096),
    );
    if (/<svg\b[^>]*>/i.test(textSlice)) {
      const viewBoxMatch =
        /viewBox\s*=\s*["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i.exec(
          textSlice,
        );
      if (viewBoxMatch) {
        const width = Math.round(Math.abs(parseFloat(viewBoxMatch[3]!)));
        const height = Math.round(Math.abs(parseFloat(viewBoxMatch[4]!)));
        if (width > 0 && height > 0) {
          return { format: 'svg', width, height };
        }
      }
      const widthMatch = /\bwidth\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/i.exec(
        textSlice,
      );
      const heightMatch = /\bheight\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/i.exec(
        textSlice,
      );
      if (widthMatch && heightMatch) {
        const width = Math.round(parseFloat(widthMatch[1]!));
        const height = Math.round(parseFloat(heightMatch[1]!));
        if (width > 0 && height > 0) {
          return { format: 'svg', width, height };
        }
      }
      // Default SVG fallback if unbounded
      return { format: 'svg', width: 600, height: 400 };
    }
  } catch {
    // Not valid UTF-8
  }

  return null;
}

export function detectImageMimeType(bytes: Uint8Array): string {
  const info = getImageDimensions(bytes);
  if (!info) return 'application/octet-stream';
  switch (info.format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
  }
}
