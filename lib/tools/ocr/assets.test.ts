import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { OCR_ASSET_BYTES, OCR_MAX_INITIAL_DOWNLOAD_BYTES } from './assets';

const publicOcr = path.resolve(import.meta.dirname, '../../../public/ocr');
const ocrDoc = path.resolve(import.meta.dirname, '../../../docs/OCR.md');

/**
 * The row label in the `docs/OCR.md` checksum table, and the file it describes.
 *
 * WHY THIS EXISTS. `docs/OCR.md` publishes a SHA-256 for every vendored OCR
 * file so a reader can confirm the bytes we serve are the bytes upstream
 * released. Nothing checked those digests, and one of them shipped wrong: the
 * fallback WASM row carried the fallback *JS wrapper's* tail spliced onto the
 * real digest's first eleven characters, 62 characters long instead of 64. A
 * provenance table nobody verifies is worse than no table, so the test below
 * hashes the checked-in bytes and fails on any row that has drifted -- and on
 * any vendored file the table forgot.
 */
const DOCUMENTED_CHECKSUMS: ReadonlyArray<readonly [string, string]> = [
  ['worker.min.js', 'worker.min.js'],
  ['lang/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
  ['fallback JS wrapper', 'core/tesseract-core-lstm.wasm.js'],
  ['fallback WASM', 'core/tesseract-core-lstm.wasm'],
  ['SIMD JS wrapper', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['SIMD WASM', 'core/tesseract-core-simd-lstm.wasm'],
  ['relaxed-SIMD JS wrapper', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['relaxed-SIMD WASM', 'core/tesseract-core-relaxedsimd-lstm.wasm'],
];

/** The checksum table's rows, keyed by the label in their first cell. */
function readDocumentedChecksums() {
  const rows = new Map<string, string>();
  for (const line of readFileSync(ocrDoc, 'utf8').split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim().replace(/`/g, ''));
    // A table row splits into a leading empty cell, the two columns, and a
    // trailing empty cell; the separator row's second cell is all dashes.
    if (cells.length !== 4 || !/^[0-9a-f]+$/.test(cells[2])) continue;
    rows.set(cells[1], cells[2]);
  }
  return rows;
}

function sha256(relativePath: string) {
  return createHash('sha256')
    .update(readFileSync(path.join(publicOcr, relativePath)))
    .digest('hex');
}

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

  it('publishes a SHA-256 that matches the bytes we actually serve', () => {
    const documented = readDocumentedChecksums();

    expect([...documented.keys()].sort()).toEqual(
      DOCUMENTED_CHECKSUMS.map(([label]) => label).sort(),
    );

    for (const [label, file] of DOCUMENTED_CHECKSUMS) {
      expect(
        documented.get(label),
        `${label} is missing from docs/OCR.md`,
      ).toBe(sha256(file));
    }
  });
});
