/**
 * `libheif-js` ships `libheif-wasm/libheif.d.ts`, which describes the raw
 * embind C surface and declares neither the package root nor `HeifDecoder`.
 * This is the shape verified against the real package in Node on 2026-09-24:
 * `decode` is lazy and returns immediately, and `display` does the work and
 * calls back asynchronously. See workers/heic-decode.worker.ts.
 */
declare module 'libheif-js' {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(
      target: { data: Uint8ClampedArray; width: number; height: number },
      done: (result: unknown) => void,
    ): void;
  }

  export interface HeifDecoderInstance {
    decode(bytes: Uint8Array): HeifImage[];
  }

  const libheif: {
    HeifDecoder: new () => HeifDecoderInstance;
  };

  export default libheif;
}
