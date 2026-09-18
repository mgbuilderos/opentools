/**
 * A minimal ZIP writer, built because a `.docx` is a ZIP of OOXML parts and
 * this repo had gzip only — `CompressionStream('gzip')` compresses one stream
 * and cannot produce a container.
 *
 * Deliberately small: store or deflate, no ZIP64, no encryption, no directory
 * entries. That covers every `.docx` we emit and nothing more. Output is
 * deterministic — a fixed timestamp — so tests can assert on exact bytes.
 */

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

/** Bit 11 tells the reader the name is UTF-8 rather than CP437. */
const UTF8_NAME_FLAG = 0x0800;

const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

/**
 * 1980-01-01 00:00:00 in MS-DOS date/time. Real timestamps would make byte
 * output vary run to run, which costs more in untestability than it is worth.
 */
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

export interface ZipEntry {
  /** Path inside the archive, forward slashes, no leading slash. */
  path: string;
  data: Uint8Array;
}

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  crcTable = table;
  return table;
}

export function crc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = table[(crc ^ bytes[index]) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    // A fresh copy: the stream detaches the buffer it is handed.
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const compressed = await new Response(
      new Blob([copy])
        .stream()
        .pipeThrough(new CompressionStream('deflate-raw')),
    ).arrayBuffer();
    return new Uint8Array(compressed);
  } catch {
    // Older engines reject 'deflate-raw'; storing is always valid.
    return null;
  }
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value & 0xffff, true);
}

/**
 * Build a ZIP archive. Each entry is deflated when the engine supports it and
 * the result is actually smaller; otherwise it is stored, which every reader
 * accepts.
 */
export async function createZip(
  entries: readonly ZipEntry[],
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const prepared: {
    nameBytes: Uint8Array;
    data: Uint8Array;
    method: number;
    crc: number;
    uncompressedSize: number;
    offset: number;
  }[] = [];

  const chunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const crc = crc32(entry.data);
    const deflated = await deflateRaw(entry.data);
    const useDeflate = deflated !== null && deflated.length < entry.data.length;
    const payload = useDeflate ? deflated : entry.data;
    const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    writeUint32(view, 0, LOCAL_HEADER_SIGNATURE);
    writeUint16(view, 4, 20);
    writeUint16(view, 6, UTF8_NAME_FLAG);
    writeUint16(view, 8, method);
    writeUint16(view, 10, DOS_TIME);
    writeUint16(view, 12, DOS_DATE);
    writeUint32(view, 14, crc);
    writeUint32(view, 18, payload.length);
    writeUint32(view, 22, entry.data.length);
    writeUint16(view, 26, nameBytes.length);
    writeUint16(view, 28, 0);
    header.set(nameBytes, 30);

    prepared.push({
      nameBytes,
      data: payload,
      method,
      crc,
      uncompressedSize: entry.data.length,
      offset,
    });

    chunks.push(header, payload);
    offset += header.length + payload.length;
  }

  const centralStart = offset;
  for (const item of prepared) {
    const header = new Uint8Array(46 + item.nameBytes.length);
    const view = new DataView(header.buffer);
    writeUint32(view, 0, CENTRAL_HEADER_SIGNATURE);
    writeUint16(view, 4, 20);
    writeUint16(view, 6, 20);
    writeUint16(view, 8, UTF8_NAME_FLAG);
    writeUint16(view, 10, item.method);
    writeUint16(view, 12, DOS_TIME);
    writeUint16(view, 14, DOS_DATE);
    writeUint32(view, 16, item.crc);
    writeUint32(view, 20, item.data.length);
    writeUint32(view, 24, item.uncompressedSize);
    writeUint16(view, 28, item.nameBytes.length);
    writeUint16(view, 30, 0);
    writeUint16(view, 32, 0);
    writeUint16(view, 34, 0);
    writeUint16(view, 36, 0);
    writeUint32(view, 38, 0);
    writeUint32(view, 42, item.offset);
    header.set(item.nameBytes, 46);
    chunks.push(header);
    offset += header.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, END_OF_CENTRAL_DIRECTORY_SIGNATURE);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, prepared.length);
  writeUint16(endView, 10, prepared.length);
  writeUint32(endView, 12, offset - centralStart);
  writeUint32(endView, 16, centralStart);
  writeUint16(endView, 20, 0);
  chunks.push(end);

  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let position = 0;
  for (const chunk of chunks) {
    out.set(chunk, position);
    position += chunk.length;
  }
  return out;
}
