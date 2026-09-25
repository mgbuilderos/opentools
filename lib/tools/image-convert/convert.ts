import type { HeicDecodeRequest, HeicDecodeResponse } from './protocol';
import { imageFormatById, type ImageFormat } from './formats';

/**
 * Decode any image the browser will take, then re-encode it with a canvas.
 *
 * THE PROBE IS THE WHOLE DESIGN. The browser is asked to decode the file first,
 * for every format including HEIC, and the 0.45 MB decoder is fetched **only**
 * when the browser cannot. That is free, and it is self-correcting: the day
 * Chromium ships a HEIC decoder this code starts using it without an edit. It is
 * also why there is no user-agent check anywhere here — sniffing would have
 * frozen 2026's browser support into the build.
 *
 * TWO NATIVE PATHS, AND THE SECOND ONE IS NOT BELT AND BRACES. Measured
 * 2026-09-24 in both engines, on a plain 64x64 PNG as well as a real HEIC:
 *
 *   WebKit   PNG: createImageBitmap ok, <img> ok.  HEIC: both ok.
 *   Chromium PNG: createImageBitmap FAILS, <img> ok. HEIC: both fail.
 *
 * `createImageBitmap` refuses **ordinary images** in the Chromium build the
 * browser suite runs, so a converter that only tried that path would refuse
 * every PNG there and report it as a damaged file. The element path is what
 * actually decodes in that engine, and it is also the path older Safari needs,
 * which has no `createImageBitmap` at all. Only when both fail is the file
 * treated as something the browser genuinely cannot read — which for HEIC in
 * Chromium is the truth, and is the case libheif exists for.
 *
 * The person searching "heic to jpg" cannot open the file, so they are
 * overwhelmingly on the Chromium path: the libheif fallback is the common case
 * for HEIC, not the edge case. See `HEIC_BUILD_SPEC.md` §1.
 */

export interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
  /** True when the 0.45 MB decoder had to be fetched, so the UI can say so. */
  usedDecoder: boolean;
}

/** Thrown with a sentence a reader can act on, never a stack. */
export class ImageConvertError extends Error {}

function isHeic(file: Blob, from: ImageFormat) {
  return (
    from.needsDecoder ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  );
}

/**
 * A decoded picture, whichever path produced it.
 *
 * `drawImage` takes both an `ImageBitmap` and an `HTMLImageElement`, so the
 * encoder below does not care which one it was handed — but the cleanup does:
 * a bitmap must be closed and an element's object URL must be revoked, and
 * leaking either costs memory on a twenty-file batch.
 */
interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

async function decodeWithImageBitmap(file: Blob): Promise<Decoded | null> {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    return null;
  }
}

async function decodeWithImageElement(file: Blob): Promise<Decoded | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('the browser refused the image'));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('the browser reported an image with no size');
    }
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

async function decodeNatively(file: Blob): Promise<Decoded | null> {
  return (
    (await decodeWithImageBitmap(file)) ?? (await decodeWithImageElement(file))
  );
}

async function decodeWithLibheif(file: Blob): Promise<Decoded> {
  const worker = new Worker(
    new URL('../../../workers/heic-decode.worker.ts', import.meta.url),
    { type: 'module' },
  );
  try {
    const buffer = await file.arrayBuffer();
    const response = await new Promise<HeicDecodeResponse>(
      (resolve, reject) => {
        worker.addEventListener(
          'message',
          (event: MessageEvent<HeicDecodeResponse>) => resolve(event.data),
        );
        worker.addEventListener('error', () =>
          reject(new ImageConvertError('The decoder could not start.')),
        );
        const request: HeicDecodeRequest = { buffer };
        worker.postMessage(request, [buffer]);
      },
    );
    if (!response.ok) throw new ImageConvertError(response.message);
    const pixels = new Uint8ClampedArray(response.pixels);
    const data = new ImageData(pixels, response.width, response.height);
    // Straight onto a canvas rather than through `createImageBitmap`: that
    // function is exactly the one Chromium's headless build refuses, and this
    // is the engine that needed libheif in the first place.
    const canvas = document.createElement('canvas');
    canvas.width = data.width;
    canvas.height = data.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new ImageConvertError('This browser would not give us a canvas.');
    }
    context.putImageData(data, 0, 0);
    return {
      source: canvas,
      width: data.width,
      height: data.height,
      release: () => {
        canvas.width = 0;
        canvas.height = 0;
      },
    };
  } finally {
    worker.terminate();
  }
}

/**
 * Re-encode a decoded bitmap.
 *
 * WHY THE TYPE IS CHECKED AFTERWARDS. A canvas asked for a type it cannot write
 * does not fail — it silently returns a PNG. So a `png-to-avif` bug would ship a
 * file named `.avif` that is really a PNG, and the person would only find out
 * when something refused it. `formats.ts` gates this at the pair level with
 * `canEncode`; this check is the second line, in case a caller bypasses that.
 */
async function encode(decoded: Decoded, to: ImageFormat, quality: number) {
  const canvas = document.createElement('canvas');
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const context = canvas.getContext('2d');
  if (!context)
    throw new ImageConvertError('This browser would not give us a canvas.');
  // A JPEG has no transparency, so anything see-through would come out black.
  // White is what every other converter does and what people expect.
  if (to.mime === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(decoded.source, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, to.mime, quality),
  );
  if (!blob) throw new ImageConvertError('That image could not be re-encoded.');
  if (blob.type !== to.mime) {
    throw new ImageConvertError(
      `This browser cannot write ${to.name}. Nothing was saved, rather than saving a file with the wrong contents.`,
    );
  }
  return blob;
}

export async function convertImage(
  file: Blob,
  fromId: string,
  toId: string,
  quality = 0.92,
): Promise<ConvertResult> {
  const from = imageFormatById(fromId);
  const to = imageFormatById(toId);
  if (!from) throw new ImageConvertError(`We do not read ${fromId} files.`);
  if (!to) throw new ImageConvertError(`We do not write ${toId} files.`);
  if (!to.canEncode) {
    throw new ImageConvertError(
      `No browser can write ${to.name}, so this page does not offer it.`,
    );
  }

  let decoded = await decodeNatively(file);
  let usedDecoder = false;
  if (!decoded) {
    if (!isHeic(file, from)) {
      throw new ImageConvertError(
        `This browser could not read that ${from.name} file. It may be damaged.`,
      );
    }
    decoded = await decodeWithLibheif(file);
    usedDecoder = true;
  }

  try {
    const blob = await encode(decoded, to, quality);
    return { blob, width: decoded.width, height: decoded.height, usedDecoder };
  } finally {
    decoded.release();
  }
}
