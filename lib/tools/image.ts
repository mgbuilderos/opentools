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

export type ImageCrop = { x: number; y: number; width: number; height: number };
export type QuarterTurn = 0 | 90 | 180 | 270;

export function validateCrop(
  crop: ImageCrop,
  sourceWidth: number,
  sourceHeight: number,
) {
  const values = [crop.x, crop.y, crop.width, crop.height];
  if (!values.every(Number.isFinite) || !values.every(Number.isInteger)) {
    throw new Error('Crop values must be whole numbers.');
  }
  if (
    crop.x < 0 ||
    crop.y < 0 ||
    crop.width < 1 ||
    crop.height < 1 ||
    crop.x + crop.width > sourceWidth ||
    crop.y + crop.height > sourceHeight
  ) {
    throw new Error(
      `Crop must stay inside the ${sourceWidth} × ${sourceHeight}px image.`,
    );
  }
  return crop;
}

export function transformedDimensions(
  width: number,
  height: number,
  rotation: QuarterTurn,
) {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

export function canvasFilter(options: {
  brightness: number;
  contrast: number;
  grayscale: number;
  sepia: number;
}) {
  const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(
      maximum,
      Math.max(minimum, Number.isFinite(value) ? value : minimum),
    );
  return [
    `brightness(${clamp(options.brightness, 0, 200)}%)`,
    `contrast(${clamp(options.contrast, 0, 200)}%)`,
    `grayscale(${clamp(options.grayscale, 0, 100)}%)`,
    `sepia(${clamp(options.sepia, 0, 100)}%)`,
  ].join(' ');
}

export function parseHexColor(value: string): [number, number, number] {
  const match = /^#([\da-f]{6})$/iu.exec(value.trim());
  if (!match) throw new Error('Choose a six-digit background color.');
  const hex = match[1]!;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

export function makeSolidBackgroundTransparent(
  pixels: Uint8ClampedArray,
  targetHex: string,
  tolerance: number,
  softness: number,
) {
  if (pixels.length % 4 !== 0) {
    throw new Error('Pixel data must contain complete RGBA values.');
  }
  if (
    !Number.isFinite(tolerance) ||
    !Number.isFinite(softness) ||
    tolerance < 0 ||
    tolerance > 255 ||
    softness < 0 ||
    softness > 128
  ) {
    throw new Error('Background tolerance or softness is outside its limit.');
  }
  const [targetRed, targetGreen, targetBlue] = parseHexColor(targetHex);
  const toleranceSq = tolerance * tolerance;
  const maxDistance = tolerance + softness;
  const maxDistanceSq = maxDistance * maxDistance;
  let changedPixels = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const dr = pixels[index]! - targetRed;
    const dg = pixels[index + 1]! - targetGreen;
    const db = pixels[index + 2]! - targetBlue;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= toleranceSq) {
      if (pixels[index + 3]! !== 0) {
        pixels[index + 3] = 0;
        changedPixels += 1;
      }
    } else if (softness > 0 && distSq < maxDistanceSq) {
      const distance = Math.sqrt(distSq);
      const originalAlpha = pixels[index + 3]!;
      const nextAlpha = Math.round(
        originalAlpha * ((distance - tolerance) / softness),
      );
      if (nextAlpha !== originalAlpha) {
        pixels[index + 3] = nextAlpha;
        changedPixels += 1;
      }
    }
  }
  return changedPixels;
}
