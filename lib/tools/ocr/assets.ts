/** Exact byte sizes of the vendored files under `public/ocr/`. */
export const OCR_ASSET_BYTES = {
  worker: 111_307,
  english: 2_952_873,
  cores: {
    fallback: 3_896_484 + 2_855_361,
    simd: 3_899_472 + 2_857_601,
    relaxedSimd: 3_905_767 + 2_862_266,
  },
} as const;

export const OCR_MAX_INITIAL_DOWNLOAD_BYTES =
  OCR_ASSET_BYTES.worker +
  OCR_ASSET_BYTES.english +
  OCR_ASSET_BYTES.cores.relaxedSimd;

export function formatExactBytes(bytes: number) {
  return `${bytes.toLocaleString('en-US')} bytes (${(bytes / 1_048_576).toFixed(2)} MiB)`;
}
