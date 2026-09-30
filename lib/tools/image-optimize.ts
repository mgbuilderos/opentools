/**
 * The image optimiser's actual pipeline: decode, fit, encode, check.
 *
 * WHY THIS IS A MODULE AND NOT A COMPONENT HELPER ANY MORE. It was defined
 * inside `components/image-optimize-tool.tsx` and used only by that page, which
 * was right while one surface ran it. Fix My Upload needs the finished bytes in
 * its own hand — it has to hand a `File` back to the window that asked for it,
 * so it cannot navigate away to the tool page the way an ask link does. The
 * choice was to extract this or to write a second encoder, and a second encoder
 * is the thing the brief forbids and the thing that would quietly start
 * producing different files from the same settings.
 *
 * MOVED, NOT REWRITTEN. Every line below is the code that shipped on
 * `/image/optimize`, including the two behaviours worth naming because they
 * look like accidents and are not:
 *
 * - **The encoded format is read back off the produced blob, not assumed from
 *   the request.** WebKit answers a `image/webp` request with a PNG instead of
 *   refusing, so trusting the request would name a file `.webp` that is not one.
 * - **The result is decoded a second time and its pixel size compared.** That
 *   is an independent check on the encoder rather than a restatement of what it
 *   was asked for, and it is why this returns dimensions it has seen rather
 *   than dimensions it computed.
 *
 * The message bundle is still a parameter for the same reason it always was:
 * a thrown `Error` here is shown to a reader, so its text has to be in the
 * reader's language, and this module has no hook to read one from.
 */
import {
  calculateContainDimensions,
  supportedRasterTypes,
  type RasterFormat,
} from './image';
import type { ToolUiMessages } from '../i18n/tool-ui';

/*
  The bundle is a parameter, not a hook call: these three are plain helpers
  outside the component, and the message a thrown Error carries is shown to the
  reader, so it has to be in the reader's language.
*/
export function loadImage(url: string, t: ToolUiMessages) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t.optimizeDecodeFailed));
    image.src = url;
  });
}

export function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: RasterFormat,
  quality: number,
  t: ToolUiMessages,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error(t.optimizeEncodeFailed)),
      format,
      quality,
    );
  });
}

export async function optimizeImage({
  t,
  url,
  width,
  height,
  maxWidth,
  maxHeight,
  format,
  quality,
}: {
  t: ToolUiMessages;
  url: string;
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  format: RasterFormat;
  quality: number;
}) {
  const decoded = await loadImage(url, t);
  const dimensions = calculateContainDimensions(
    width,
    height,
    maxWidth,
    maxHeight,
  );
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d', {
    alpha: format !== 'image/jpeg',
  });
  if (!context) throw new Error(t.optimizeCanvasUnavailable);
  if (format === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
  const blob = await encodeCanvas(canvas, format, quality / 100, t);
  // WebKit answers a WebP request with a PNG rather than failing. Keep what the
  // browser produced and name the file for the format it actually is.
  const encodedFormat = blob.type as RasterFormat;
  if (!supportedRasterTypes.has(encodedFormat)) {
    throw new Error(t.optimizeNoFormat);
  }
  const validationUrl = URL.createObjectURL(blob);
  try {
    const validationImage = await loadImage(validationUrl, t);
    if (
      validationImage.naturalWidth !== dimensions.width ||
      validationImage.naturalHeight !== dimensions.height
    ) {
      throw new Error(t.optimizeDimensionCheckFailed);
    }
  } finally {
    URL.revokeObjectURL(validationUrl);
  }
  return { blob, format: encodedFormat, ...dimensions };
}
