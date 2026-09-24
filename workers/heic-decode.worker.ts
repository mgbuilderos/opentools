/// <reference lib="webworker" />

import type {
  HeicDecodeRequest,
  HeicDecodeResponse,
} from '@/lib/tools/image-convert/protocol';
import { HEIC_WASM_PATH } from '@/lib/tools/image-convert/protocol';

/**
 * Decode one HEIC to raw RGBA, off the main thread.
 *
 * WHY A WORKER AT ALL, when the native path does not need one: libheif is a
 * synchronous C decoder compiled to wasm, so a 12 MP photo blocks whatever
 * thread it runs on for as long as it takes. On the main thread that is a frozen
 * page with no way to say so. Here the page stays responsive and can show
 * progress honestly.
 *
 * WHY THE NON-BUNDLED BUILD. `libheif-js/libheif-wasm/libheif.js` is 29 KB
 * gzipped of glue that fetches `libheif.wasm` (0.45 MB gzipped) separately. The
 * alternative entry, `libheif-js/wasm-bundle`, inlines the binary as base64 — one
 * file, nothing to configure, and it **breaches the separability condition** the
 * owner's LGPL approval of 2026-09-24 depends on. It is also bigger. Do not
 * "simplify" this import.
 */

/**
 * VERIFIED AGAINST THE REAL PACKAGE, 2026-09-24, not inferred from its types.
 * `libheif-wasm/libheif.d.ts` describes only the raw embind C surface and does
 * **not** declare `HeifDecoder`, so a cast is unavoidable; it is written through
 * `unknown` and against the shape actually probed in Node:
 *   - the module factory returns **synchronously** (it is not a promise),
 *   - `module.HeifDecoder` exists on the returned object,
 *   - `decoder.decode(bytes)` is **lazy** and returns in ~1 ms — it does not decode,
 *   - `image.display(...)` does the real work and calls back **asynchronously**
 *     (~145 ms for 12.2 MP here). Timing `decode()` therefore measures nothing;
 *     awaiting the callback is the only correct way to know it finished.
 *   - `locateFile` is honoured, which is what keeps the binary same-origin.
 */
interface LibheifImage {
  get_width(): number;
  get_height(): number;
  display(
    target: { data: Uint8ClampedArray; width: number; height: number },
    done: (result: unknown) => void,
  ): void;
}

interface LibheifDecoder {
  decode(bytes: Uint8Array): LibheifImage[];
}

interface LibheifModule {
  HeifDecoder: new () => LibheifDecoder;
}

type LibheifFactory = (options: {
  locateFile: (path: string) => string;
}) => LibheifModule;

let decoderPromise: Promise<LibheifDecoder> | null = null;

function loadDecoder(): Promise<LibheifDecoder> {
  if (!decoderPromise) {
    decoderPromise = (async () => {
      const imported = await import('libheif-js/libheif-wasm/libheif.js');
      const factory = ((imported as { default?: unknown }).default ??
        imported) as unknown as LibheifFactory;
      const module = factory({
        // Point the glue at our own copy rather than letting it resolve a path
        // next to the worker chunk, whose name hashes on every build.
        locateFile: (path: string) =>
          path.endsWith('.wasm') ? HEIC_WASM_PATH : path,
      });
      return new module.HeifDecoder();
    })().catch((error: unknown) => {
      // Let the next attempt retry rather than caching a failed load forever.
      decoderPromise = null;
      throw error;
    });
  }
  return decoderPromise;
}

async function decodeHeic(buffer: ArrayBuffer) {
  const decoder = await loadDecoder();
  const images = decoder.decode(new Uint8Array(buffer));
  if (images.length === 0) {
    throw new Error('That file did not contain an image we could read.');
  }
  // A HEIC can hold a burst or a Live Photo. The first image is the one the
  // photo app shows, which is the one the person means by "the photo".
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('That file reported an image size we could not use.');
  }
  const data = new Uint8ClampedArray(width * height * 4);
  await new Promise<void>((resolve, reject) => {
    image.display({ data, width, height }, (result) => {
      if (result) resolve();
      else reject(new Error('The decoder could not read that image.'));
    });
  });
  return { pixels: data.buffer, width, height };
}

self.addEventListener('message', (event: MessageEvent<HeicDecodeRequest>) => {
  void (async () => {
    try {
      const { pixels, width, height } = await decodeHeic(event.data.buffer);
      const response: HeicDecodeResponse = { ok: true, pixels, width, height };
      (self as unknown as Worker).postMessage(response, [pixels]);
    } catch (error) {
      const response: HeicDecodeResponse = {
        ok: false,
        message:
          error instanceof Error && error.message
            ? error.message
            : 'That file could not be decoded.',
      };
      (self as unknown as Worker).postMessage(response);
    }
  })();
});
