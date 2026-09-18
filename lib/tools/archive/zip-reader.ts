/**
 * A ZIP reader, to go with the writer in `lib/tools/docx/zip.ts`.
 *
 * Reads the central directory, which is the authoritative index of a ZIP, then
 * finds each entry's data through its own local header. Decompression is the
 * browser's own `DecompressionStream('deflate-raw')`, so there is no
 * dependency and nothing to keep up to date.
 *
 * Two things here that most unzip tools do not do, and that are the reason
 * this is worth writing rather than shelling out to a library:
 *
 * 1. **Every extracted file is checked against the checksum the archive itself
 *    stores.** A truncated or corrupted entry is reported, not handed over.
 * 2. **Unsafe paths are named before anything is written.** An entry called
 *    `../../.ssh/authorized_keys` is a real and well-known attack on unzip
 *    tools; it is flagged rather than quietly extracted.
 */

import { crc32 } from '../docx/zip';

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP64_END_LOCATOR_SIGNATURE = 0x07064b50;

const UTF8_NAME_FLAG = 0x0800;
const ENCRYPTED_FLAG = 0x0001;

/** The compression methods a ZIP may declare, so refusals can name one. */
const METHOD_NAMES: Record<number, string> = {
  0: 'stored (no compression)',
  1: 'shrunk',
  6: 'imploded',
  8: 'deflate',
  9: 'enhanced deflate',
  12: 'bzip2',
  14: 'LZMA',
  93: 'Zstandard',
  95: 'XZ',
  96: 'JPEG variant',
  97: 'WavPack',
  98: 'PPMd',
  99: 'AES encrypted',
};

export const SUPPORTED_METHODS = new Set([0, 8]);

/**
 * Code page 437 for the bytes 0x80–0xFF. A ZIP whose entry does not set the
 * UTF-8 flag names its files in this encoding, which is most archives made by
 * older Windows tools — reading those bytes as UTF-8 or Latin-1 mangles every
 * accented filename.
 */
const CP437_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■' +
  String.fromCharCode(0xa0);

function decodeCp437(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += byte < 0x80 ? String.fromCharCode(byte) : CP437_HIGH[byte - 0x80];
  }
  return out;
}

export type NameEncoding = 'utf-8' | 'cp437';

/**
 * Works out the filename, and does **not** simply trust the UTF-8 flag.
 *
 * Plenty of real archivers — macOS's own `zip` among them — write UTF-8
 * filenames and never set the flag. Trusting it mangles every accented or
 * non-Latin name in those archives. CP437 can "decode" any byte sequence, so
 * a cleared flag is weak evidence; valid UTF-8 is strong evidence. Try UTF-8
 * strictly first, fall back to CP437, and report which was used.
 */
function decodeName(
  bytes: Uint8Array,
  flaggedUtf8: boolean,
): { name: string; encoding: NameEncoding } {
  try {
    return {
      name: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      encoding: 'utf-8',
    };
  } catch {
    if (flaggedUtf8) {
      // The flag claims UTF-8 and the bytes are not. Trust the bytes.
    }
    return { name: decodeCp437(bytes), encoding: 'cp437' };
  }
}

/** MS-DOS packs a date and a time into two 16-bit words, from 1980. */
function decodeDosDateTime(time: number, date: number): Date | null {
  const year = ((date >> 9) & 0x7f) + 1980;
  const month = (date >> 5) & 0x0f;
  const day = date & 0x1f;
  const hours = (time >> 11) & 0x1f;
  const minutes = (time >> 5) & 0x3f;
  const seconds = (time & 0x1f) * 2;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/** True when a name hides control characters, which can disguise it. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Why an entry cannot be written to disk as named, or `null` when it is fine.
 * This is the "zip slip" class of problem: a path that escapes the folder you
 * extract into.
 */
export function unsafePathReason(path: string): string | null {
  if (!path) return 'The entry has no name.';
  if (path.startsWith('/') || path.startsWith('\\')) {
    return 'Starts at the root of the drive rather than inside the folder you choose.';
  }
  if (/^[a-z]:/iu.test(path)) {
    return 'Names a Windows drive letter, so it would not stay inside the folder you choose.';
  }
  if (path.includes('\\')) {
    return 'Uses backslashes, which some tools read as folder separators and some do not.';
  }
  if (path.split('/').includes('..')) {
    return 'Contains "..", which walks out of the folder you extract into.';
  }
  if (hasControlCharacter(path)) {
    return 'Contains control characters, which can hide the real name.';
  }
  return null;
}

export interface ZipArchiveEntry {
  path: string;
  isDirectory: boolean;
  method: number;
  methodName: string;
  supported: boolean;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  encrypted: boolean;
  /** The encoding the name was actually read with, not the one it claimed. */
  nameEncoding: NameEncoding;
  modified: Date | null;
  comment: string;
  localHeaderOffset: number;
  /** Non-null when writing this entry to disk would be unsafe. */
  pathWarning: string | null;
}

export interface ZipArchive {
  entries: ZipArchiveEntry[];
  comment: string;
  fileCount: number;
  directoryCount: number;
  totalCompressed: number;
  totalUncompressed: number;
  encryptedCount: number;
  unsupportedCount: number;
  unsafeCount: number;
}

function findEndOfCentralDirectory(view: DataView, length: number): number {
  // The archive comment can be up to 65,535 bytes, so scan back that far plus
  // the 22-byte record itself.
  const earliest = Math.max(0, length - 22 - 0xffff);
  for (let offset = length - 22; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }
  return -1;
}

/**
 * Reads the index of a ZIP. Throws with a plain reason for anything that is
 * not a ZIP this can open, rather than returning a half-read archive.
 */
export function readZip(bytes: Uint8Array): ZipArchive {
  if (bytes.length < 22) {
    throw new Error('This file is too small to be a ZIP archive.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const eocd = findEndOfCentralDirectory(view, bytes.length);
  if (eocd < 0) {
    const looksLikeZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
    throw new Error(
      looksLikeZip
        ? 'This looks like a ZIP but its index is missing, which usually means the download was cut short.'
        : 'This is not a ZIP archive. RAR, 7z and tar.gz are different formats and cannot be opened here.',
    );
  }

  // ZIP64 stores the real counts elsewhere; the 32-bit fields are saturated.
  const entryCount = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  if (
    entryCount === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff ||
    (eocd >= 20 &&
      view.getUint32(eocd - 20, true) === ZIP64_END_LOCATOR_SIGNATURE)
  ) {
    throw new Error(
      'This is a ZIP64 archive — over 4 GB or over 65,535 files. This page reads standard ZIP archives only.',
    );
  }

  const commentLength = view.getUint16(eocd + 20, true);
  const comment = commentLength
    ? decodeCp437(bytes.subarray(eocd + 22, eocd + 22 + commentLength))
    : '';

  if (directoryOffset + directorySize > bytes.length) {
    throw new Error(
      'The archive index points past the end of the file, so this ZIP is incomplete.',
    );
  }

  const entries: ZipArchiveEntry[] = [];
  let cursor = directoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.length) {
      throw new Error(
        `The archive index ends after ${index} of ${entryCount} entries, so this ZIP is incomplete.`,
      );
    }
    if (view.getUint32(cursor, true) !== CENTRAL_HEADER_SIGNATURE) {
      throw new Error(
        `Entry ${index + 1} of the archive index is not where the ZIP says it is.`,
      );
    }

    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const modTime = view.getUint16(cursor + 12, true);
    const modDate = view.getUint16(cursor + 14, true);
    const crc = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const entryCommentLength = view.getUint16(cursor + 32, true);
    const externalAttributes = view.getUint32(cursor + 38, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const nameStart = cursor + 46;
    const flaggedUtf8 = (flags & UTF8_NAME_FLAG) !== 0;
    const decodedName = decodeName(
      bytes.subarray(nameStart, nameStart + nameLength),
      flaggedUtf8,
    );
    const path = decodedName.name;
    const entryComment = entryCommentLength
      ? decodeName(
          bytes.subarray(
            nameStart + nameLength + extraLength,
            nameStart + nameLength + extraLength + entryCommentLength,
          ),
          flaggedUtf8,
        ).name
      : '';

    // A directory is marked by a trailing slash, or by the MS-DOS directory
    // attribute in the low byte of the external attributes.
    const isDirectory = path.endsWith('/') || (externalAttributes & 0x10) !== 0;

    entries.push({
      path,
      isDirectory,
      method,
      methodName: METHOD_NAMES[method] ?? `method ${method}`,
      supported: SUPPORTED_METHODS.has(method),
      compressedSize,
      uncompressedSize,
      crc32: crc,
      encrypted: (flags & ENCRYPTED_FLAG) !== 0,
      nameEncoding: decodedName.encoding,
      modified: decodeDosDateTime(modTime, modDate),
      comment: entryComment,
      localHeaderOffset,
      pathWarning: isDirectory ? null : unsafePathReason(path),
    });

    cursor = nameStart + nameLength + extraLength + entryCommentLength;
  }

  let totalCompressed = 0;
  let totalUncompressed = 0;
  let fileCount = 0;
  let directoryCount = 0;
  let encryptedCount = 0;
  let unsupportedCount = 0;
  let unsafeCount = 0;

  for (const entry of entries) {
    if (entry.isDirectory) {
      directoryCount += 1;
      continue;
    }
    fileCount += 1;
    totalCompressed += entry.compressedSize;
    totalUncompressed += entry.uncompressedSize;
    if (entry.encrypted) encryptedCount += 1;
    if (!entry.supported) unsupportedCount += 1;
    if (entry.pathWarning) unsafeCount += 1;
  }

  return {
    entries,
    comment,
    fileCount,
    directoryCount,
    totalCompressed,
    totalUncompressed,
    encryptedCount,
    unsupportedCount,
    unsafeCount,
  };
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'This browser cannot decompress ZIP entries. Try a current Chrome, Edge, Firefox or Safari.',
    );
  }
  // A fresh copy: the stream detaches the buffer it is handed.
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const inflated = await new Response(
    new Blob([copy as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream('deflate-raw')),
  ).arrayBuffer();
  return new Uint8Array(inflated);
}

/**
 * Pulls one entry out of the archive and checks it against the checksum the
 * ZIP itself stores. Refuses rather than returning bytes it cannot vouch for.
 */
export async function extractEntry(
  bytes: Uint8Array,
  entry: ZipArchiveEntry,
): Promise<Uint8Array> {
  if (entry.isDirectory) {
    throw new Error(`"${entry.path}" is a folder, not a file.`);
  }
  if (entry.encrypted) {
    throw new Error(
      `"${entry.path}" is password-protected. This page does not open encrypted entries, and will not pretend to.`,
    );
  }
  if (!entry.supported) {
    throw new Error(
      `"${entry.path}" uses ${entry.methodName}, which this page cannot decompress. Only stored and deflated entries are supported.`,
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = entry.localHeaderOffset;
  if (
    header + 30 > bytes.length ||
    view.getUint32(header, true) !== LOCAL_HEADER_SIGNATURE
  ) {
    throw new Error(
      `The archive says "${entry.path}" starts at a place that is not the start of a file.`,
    );
  }

  // The local header's own name and extra lengths decide where data begins;
  // they are allowed to differ from the central directory's.
  const nameLength = view.getUint16(header + 26, true);
  const extraLength = view.getUint16(header + 28, true);
  const start = header + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > bytes.length) {
    throw new Error(
      `"${entry.path}" runs past the end of the file, so this ZIP is incomplete.`,
    );
  }

  const payload = bytes.subarray(start, end);
  const data = entry.method === 0 ? payload : await inflateRaw(payload);

  if (data.length !== entry.uncompressedSize) {
    throw new Error(
      `"${entry.path}" unpacked to ${data.length.toLocaleString()} bytes but the archive says it should be ${entry.uncompressedSize.toLocaleString()}.`,
    );
  }

  // The archive stores a checksum of the original file. Checking it is the
  // difference between handing over bytes and handing over the right bytes.
  const actual = crc32(data);
  if (actual !== entry.crc32) {
    throw new Error(
      `"${entry.path}" failed its checksum — the archive expects ${entry.crc32.toString(16).padStart(8, '0')} and the data gives ${actual.toString(16).padStart(8, '0')}. The file is damaged.`,
    );
  }
  return data;
}
