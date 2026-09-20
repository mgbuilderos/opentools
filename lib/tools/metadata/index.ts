import { readJpegMetadata, stripJpegMetadata } from './jpeg';
import { isPng, readPngMetadata, stripPngMetadata } from './png';
import { isWebp, readWebpMetadata, stripWebpMetadata } from './webp';
import type {
  ImageFormat,
  ImageMetadataResult,
  ImageStripResult,
} from './types';

export * from './types';
export * from './exif';
export * from './jpeg';
export * from './png';
export * from './webp';

export function detectImageFormat(bytes: Uint8Array): ImageFormat {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'jpeg';
  }
  if (isPng(bytes)) {
    return 'png';
  }
  if (isWebp(bytes)) {
    return 'webp';
  }
  return 'unsupported';
}

export function readMetadata(bytes: Uint8Array): ImageMetadataResult {
  const format = detectImageFormat(bytes);

  switch (format) {
    case 'jpeg':
      return readJpegMetadata(bytes);
    case 'png':
      return readPngMetadata(bytes);
    case 'webp':
      return readWebpMetadata(bytes);
    case 'unsupported':
    default:
      return {
        format: 'unsupported',
        hasMetadata: false,
        camera: {},
        shot: {},
        rawTextEntries: [],
        warnings: [
          'Unsupported file container. This tool parses and strips metadata from JPEG, PNG, and WebP images only.',
        ],
      };
  }
}

export function stripMetadata(bytes: Uint8Array): ImageStripResult {
  const format = detectImageFormat(bytes);

  switch (format) {
    case 'jpeg':
      return stripJpegMetadata(bytes);
    case 'png':
      return stripPngMetadata(bytes);
    case 'webp':
      return stripWebpMetadata(bytes);
    case 'unsupported':
    default:
      return {
        format: 'unsupported',
        success: false,
        cleanedBytes: bytes,
        originalSize: bytes.length,
        cleanedSize: bytes.length,
        bytesSaved: 0,
        removed: [],
        kept: [],
        warnings: [
          'Unsupported file container. Only JPEG, PNG, and WebP files are stripped directly without pixel re-encoding.',
        ],
      };
  }
}
