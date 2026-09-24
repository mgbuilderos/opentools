/**
 * Streaming byte abstraction for MP4/MOV container surgery.
 *
 * For operations like trim, rotate, remux, split and merge, the engine only
 * needs the `moov` box (sample index tables, typically 10 KB to 2 MB) and the
 * specific byte ranges of the frames being copied.
 *
 * Loading a 4 GB video into memory as a `Uint8Array` crashes browser tabs with
 * out-of-memory. `ByteSource` allows random-access slicing via `File.slice()`
 * without buffering the whole file in RAM, and allows constructing the output
 * as a `Blob` in milliseconds.
 */

export interface ByteSource {
  readonly size: number;
  /** Slices a byte range from the source as a Uint8Array */
  slice(start: number, end: number): Promise<Uint8Array>;
  /** Slices synchronously when the whole buffer is in memory */
  sliceSync?(start: number, end: number): Uint8Array;
  /** Slices a BlobPart (File/Blob slice or Uint8Array) for zero-copy Blob construction */
  sliceBlob?(start: number, end: number): BlobPart | Uint8Array;
}

export function sourceFromBytes(bytes: Uint8Array): ByteSource {
  return {
    size: bytes.byteLength,
    slice: async (start, end) => bytes.subarray(start, end),
    sliceSync: (start, end) => bytes.subarray(start, end),
    sliceBlob: (start, end) => bytes.subarray(start, end),
  };
}

export function sourceFromFile(file: Blob): ByteSource {
  return {
    size: file.size,
    slice: async (start, end) => {
      const slice = file.slice(start, end);
      return new Uint8Array(await slice.arrayBuffer());
    },
    sliceBlob: (start, end) => file.slice(start, end),
  };
}

export function isByteSource(val: unknown): val is ByteSource {
  return (
    typeof val === 'object' &&
    val !== null &&
    'size' in val &&
    typeof (val as ByteSource).slice === 'function'
  );
}
