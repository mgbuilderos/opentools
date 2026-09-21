import { inflateRawSync } from 'node:zlib';

/**
 * Reads the files of a ZIP archive (stored or deflated entries only), enough
 * for the Search Console export ZIP. Uses the central directory, so sizes are
 * right even when an entry uses a data descriptor.
 */
export function readZipEntries(archive: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(
    archive.buffer,
    archive.byteOffset,
    archive.byteLength,
  );
  let end = -1;
  for (let i = archive.byteLength - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error('Not a ZIP archive');

  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, Uint8Array>();

  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('Corrupt ZIP central directory');
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(
      archive.subarray(offset + 46, offset + 46 + nameLength),
    );
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;

    const dataStart =
      localOffset +
      30 +
      view.getUint16(localOffset + 26, true) +
      view.getUint16(localOffset + 28, true);
    const data = archive.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) entries.set(name, data);
    else if (method === 8) entries.set(name, inflateRawSync(data));
    else throw new Error(`${name}: unsupported ZIP compression ${method}`);
  }
  return entries;
}

/** The entry whose file name (any folder) matches, case-insensitively. */
export function findZipEntry(
  entries: ReadonlyMap<string, Uint8Array>,
  fileName: string,
): Uint8Array | undefined {
  const wanted = fileName.toLowerCase();
  for (const [name, data] of entries) {
    if (name.split('/').pop()?.toLowerCase() === wanted) return data;
  }
  return undefined;
}
