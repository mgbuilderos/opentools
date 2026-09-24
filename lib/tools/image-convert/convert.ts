import type {
  HeicDecodeRequest,
  HeicDecodeResponse,
} from './protocol';
import { imageFormatById, type ImageFormat } from './formats';

/**
 * Decode any image the browser will take, then re-encode it with a canvas.
 *
 * THE PROBE IS THE WHOLE DESIGN. `createImageBitmap` is tried first for every
 * format including HEIC, and the 0.45 MB decoder is fetched **only** when it
 * throws. That is free, and it is self-correcting: the day Chromium ships a HEIC
 * decoder this code starts using it without an edit. It is also why there is no
 * user-agent check anywhere here — sniffing would have frozen 2026's browser
 * support into the build.
 *
 * MEASURED 2026-09-24: WebKit decodes HEIC natively, Chromium does not. The
 * person searching "heic to jpg" cannot open the file, so they are overwhelmingly
 * on the Chromium path — the fallback is the common case, not the edge case.
 * See `HEIC_BUILD_SPEC.md` §1.
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
  return from.needsDecoder || file.type === 'image/heic' || file.type === 'image/heif';
}

async function decodeNatively(file: Blob) {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

async function decodeWithLibheif(file: Blob): Promise<ImageBitmap> {
  const worker = new Worker(
    new URL('../../../workers/heic-decode.worker.ts', import.meta.url),
    { type: 'module' },
  );
  try {
    const buffer = await file.arrayBuffer();
    const response = await new Promise<HeicDecodeResponse>((resolve, reject) => {
      worker.addEventListener('message', (event: MessageEvent<HeicDecodeResponse>) =>
        resolve(event.data),
      );
      worker.addEventListener('error', () =>
        reject(new ImageConvertError('The decoder could not start.')),
      );
      const request: HeicDecodeRequest = { buffer };
      worker.postMessage(request, [buffer]);
    });
    if (!response.ok) throw new ImageConvertError(response.message);
    const pixels = new Uint8ClampedArray(response.pixels);
    return await createImageBitmap(
      new ImageData(pixels, response.width, response.height),
    );
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
async function encode(bitmap: ImageBitmap, to: ImageFormat, quality: number) {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) throw new ImageConvertError('This browser would not give us a canvas.');
  // A JPEG has no transparency, so anything see-through would come out black.
  // White is what every other converter does and what people expect.
  if (to.mime === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0);
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
      `No browser can write ${to.name}, so we do not offer it. Nothing was uploaded.`,
    );
  }

  let bitmap = await decodeNatively(file);
  let usedDecoder = false;
  if (!bitmap) {
    if (!isHeic(file, from)) {
      throw new ImageConvertError(
        `This browser could not read that ${from.name} file. It may be damaged.`,
      );
    }
    bitmap = await decodeWithLibheif(file);
    usedDecoder = true;
  }

  try {
    const blob = await encode(bitmap, to, quality);
    return { blob, width: bitmap.width, height: bitmap.height, usedDecoder };
  } finally {
    bitmap.close();
  }
}
