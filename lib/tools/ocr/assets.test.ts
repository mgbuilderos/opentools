import { statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { OCR_ASSET_BYTES, OCR_MAX_INITIAL_DOWNLOAD_BYTES } from './assets';

const publicOcr = path.resolve(import.meta.dirname, '../../../public/ocr');

describe('vendored OCR assets', () => {
  it('keeps the disclosure tied to the exact checked-in bytes', () => {
    expect(statSync(path.join(publicOcr, 'worker.min.js')).size).toBe(
      OCR_ASSET_BYTES.worker,
    );
    expect(statSync(path.join(publicOcr, 'lang/eng.traineddata.gz')).size).toBe(
      OCR_ASSET_BYTES.english,
    );
    expect(
      statSync(path.join(publicOcr, 'core/tesseract-core-lstm.wasm.js')).size +
        statSync(path.join(publicOcr, 'core/tesseract-core-lstm.wasm')).size,
    ).toBe(OCR_ASSET_BYTES.cores.fallback);
    expect(
      statSync(path.join(publicOcr, 'core/tesseract-core-simd-lstm.wasm.js'))
        .size +
        statSync(path.join(publicOcr, 'core/tesseract-core-simd-lstm.wasm'))
          .size,
    ).toBe(OCR_ASSET_BYTES.cores.simd);
    expect(
      statSync(
        path.join(publicOcr, 'core/tesseract-core-relaxedsimd-lstm.wasm.js'),
      ).size +
        statSync(
          path.join(publicOcr, 'core/tesseract-core-relaxedsimd-lstm.wasm'),
        ).size,
    ).toBe(OCR_ASSET_BYTES.cores.relaxedSimd);
    expect(OCR_MAX_INITIAL_DOWNLOAD_BYTES).toBe(9_832_213);
  });
});
