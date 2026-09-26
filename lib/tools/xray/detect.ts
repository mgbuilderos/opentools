/**
 * Deciding what a file is from its bytes, not its name.
 *
 * The extension is the one thing about a dropped file that is never checked
 * here. A photo saved from a chat app arrives as `IMG-20260919-WA0001.jpg` when
 * it is a WebP; a spreadsheet mailed by a finance system arrives as `.xls` when
 * it is a ZIP of OOXML parts. Reading the magic bytes is both more reliable and
 * the only option for a file dropped with no extension at all.
 *
 * `lib/tools/metadata` already sniffs the three image containers, so that is
 * reused rather than reimplemented; this adds the document and video containers
 * on top.
 */

import { readZip } from '../archive/zip-reader';
import { detectImageFormat } from '../metadata';
import type { XrayFormat } from './types';

/** `%PDF` — the header every PDF opens with. */
function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

/**
 * `PK\x03\x04` — a local file header, so the start of a ZIP.
 *
 * Every OOXML document (`.docx`, `.xlsx`, `.pptx`) is a ZIP, so this is a
 * first pass only; `ooxmlFlavour` decides which one by looking inside.
 */
function isZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

/**
 * An ISO base media file (MP4, M4V, MOV): `ftyp` at offset 4.
 *
 * The brand that follows says which dialect, but every dialect this tool reads
 * metadata from is parsed by the same `readMp4`, so the brand is not consulted.
 */
function isIsoBaseMedia(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 // p
  );
}

/**
 * Which OOXML document a ZIP is, by the part that only that kind has.
 *
 * Reads the archive index only -- the central directory -- so this costs a seek
 * to the end of the file rather than a decompression pass. A ZIP that is not an
 * OOXML document at all comes back as `zip`, which is a useful answer in itself:
 * the report can then say the archive's own entry names and dates are readable
 * without pretending to find a document author in it.
 */
function ooxmlFlavour(bytes: Uint8Array): XrayFormat {
  let paths: Set<string>;
  try {
    paths = new Set(readZip(bytes).entries.map((entry) => entry.path));
  } catch {
    // Truncated or unreadable index. It opened as a ZIP by its magic bytes and
    // cannot be read as one, so the caller is told `zip` and the reader gets
    // the warning from whoever tries to open it.
    return 'zip';
  }
  if (paths.has('word/document.xml')) return 'docx';
  if (paths.has('xl/workbook.xml')) return 'xlsx';
  if (paths.has('ppt/presentation.xml')) return 'pptx';
  return 'zip';
}

/**
 * What this file is.
 *
 * Returns `unsupported` rather than throwing. A person who drops a `.heic` or a
 * `.rar` should be told plainly that this tool cannot open it, and an exception
 * is a worse way to say so than a value the UI can render.
 */
export function detectFormat(bytes: Uint8Array): XrayFormat {
  if (bytes.length === 0) return 'unsupported';

  const image = detectImageFormat(bytes);
  if (image !== 'unsupported') return image;

  if (isPdf(bytes)) return 'pdf';
  if (isIsoBaseMedia(bytes)) return 'mp4';
  if (isZip(bytes)) return ooxmlFlavour(bytes);

  return 'unsupported';
}
