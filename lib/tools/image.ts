export type RasterFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export const supportedRasterTypes = new Set<RasterFormat>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function calculateContainDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  if (
    ![sourceWidth, sourceHeight, maxWidth, maxHeight].every(Number.isFinite) ||
    sourceWidth < 1 ||
    sourceHeight < 1 ||
    maxWidth < 1 ||
    maxHeight < 1
  ) {
    throw new Error('Image dimensions must be positive numbers.');
  }
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function extensionForRasterType(type: RasterFormat) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}
