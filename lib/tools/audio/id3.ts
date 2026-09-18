/**
 * ID3v1 and ID3v2 (2.2, 2.3, 2.4) tag reading, plus an ID3v2.3 writer.
 *
 * Tags sit outside the MPEG audio stream, so they can be read, replaced or
 * removed without touching a single audio byte.
 */

export interface Id3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  track?: string;
  genre?: string;
  comment?: string;
}

export const ID3_FIELDS = [
  'title',
  'artist',
  'album',
  'year',
  'track',
  'genre',
  'comment',
] as const;

export type Id3Field = (typeof ID3_FIELDS)[number];

/** ID3v2.3/2.4 frame id for each field we read and write. */
const FRAME_IDS: Record<Id3Field, readonly string[]> = {
  title: ['TIT2', 'TT2'],
  artist: ['TPE1', 'TP1'],
  album: ['TALB', 'TAL'],
  year: ['TYER', 'TDRC', 'TYE'],
  track: ['TRCK', 'TRK'],
  genre: ['TCON', 'TCO'],
  comment: ['COMM', 'COM'],
};

const WRITE_FRAME_ID: Record<Id3Field, string> = {
  title: 'TIT2',
  artist: 'TPE1',
  album: 'TALB',
  year: 'TYER',
  track: 'TRCK',
  genre: 'TCON',
  comment: 'COMM',
};

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += String.fromCharCode(bytes[offset + index]);
  }
  return out;
}

/** ID3 sizes are "syncsafe": 7 usable bits per byte so no false frame sync. */
export function readSyncsafe(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

export function writeSyncsafe(
  target: Uint8Array,
  offset: number,
  value: number,
): void {
  target[offset] = (value >> 21) & 0x7f;
  target[offset + 1] = (value >> 14) & 0x7f;
  target[offset + 2] = (value >> 7) & 0x7f;
  target[offset + 3] = value & 0x7f;
}

export interface Id3v2Block {
  /** Always 0 — a leading ID3v2 tag is the only placement we accept. */
  offset: number;
  /** Total bytes to skip: 10-byte header, body, and footer when present. */
  size: number;
  majorVersion: number;
  unsynchronised: boolean;
}

/** Locates a leading ID3v2 tag, or returns `null` when there is none. */
export function findId3v2(bytes: Uint8Array): Id3v2Block | null {
  if (bytes.length < 10) return null;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null;
  const majorVersion = bytes[3];
  if (majorVersion === 0xff) return null;
  const flags = bytes[5];
  const body = readSyncsafe(bytes, 6);
  const footer = (flags & 0x10) !== 0 ? 10 : 0;
  const size = 10 + body + footer;
  if (size > bytes.length) return null;
  return {
    offset: 0,
    size,
    majorVersion,
    unsynchronised: (flags & 0x80) !== 0,
  };
}

/** Locates a trailing 128-byte ID3v1 tag, or returns `null`. */
export function findId3v1(
  bytes: Uint8Array,
): { offset: number; size: 128 } | null {
  if (bytes.length < 128) return null;
  const offset = bytes.length - 128;
  if (ascii(bytes, offset, 3) !== 'TAG') return null;
  return { offset, size: 128 };
}

/** Locates a trailing APEv2 tag, which some taggers append after the audio. */
export function findApeTag(
  bytes: Uint8Array,
  end: number,
): { offset: number; size: number } | null {
  const footer = end - 32;
  if (footer < 0) return null;
  if (ascii(bytes, footer, 8) !== 'APETAGEX') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tagSize = view.getUint32(footer + 12, true); // body plus footer
  const flags = view.getUint32(footer + 20, true);
  const header = (flags & 0x8000_0000) !== 0 ? 32 : 0;
  const size = tagSize + header;
  const offset = end - size;
  if (offset < 0) return null;
  return { offset, size };
}

function decodeTextFrame(body: Uint8Array): string {
  if (!body.length) return '';
  const encoding = body[0];
  const payload = body.subarray(1);
  if (encoding === 0x00) return decodeLatin1(payload);
  if (encoding === 0x03) return new TextDecoder().decode(payload).trim();
  // 0x01 UTF-16 with BOM, 0x02 UTF-16BE without BOM
  if (payload.length >= 2 && payload[0] === 0xff && payload[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(payload.subarray(2));
  }
  if (payload.length >= 2 && payload[0] === 0xfe && payload[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(payload.subarray(2));
  }
  return new TextDecoder(encoding === 0x02 ? 'utf-16be' : 'utf-16le').decode(
    payload,
  );
}

function decodeLatin1(payload: Uint8Array): string {
  let out = '';
  for (const byte of payload) out += String.fromCharCode(byte);
  return out;
}

const NUL = String.fromCharCode(0);

function trimNulls(value: string): string {
  const end = value.indexOf(NUL);
  return (end >= 0 ? value.slice(0, end) : value).trim();
}

/**
 * A COMM frame is `encoding, 3-byte language, short description, 0x00, text`.
 * Only the text after the description separator is the comment.
 */
function decodeCommentFrame(body: Uint8Array): string {
  if (body.length < 5) return '';
  const encoding = body[0];
  const rest = body.subarray(4);
  const wide = encoding === 0x01 || encoding === 0x02;
  if (wide) {
    let index = 0;
    while (index + 1 < rest.length) {
      if (rest[index] === 0 && rest[index + 1] === 0) break;
      index += 2;
    }
    const text = rest.subarray(Math.min(index + 2, rest.length));
    return trimNulls(decodeTextFrame(concat(Uint8Array.of(encoding), text)));
  }
  const separator = rest.indexOf(0);
  const text = rest.subarray(separator < 0 ? 0 : separator + 1);
  return trimNulls(decodeTextFrame(concat(Uint8Array.of(encoding), text)));
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * Reads the text frames we care about from a leading ID3v2 tag.
 * Unsynchronised tags are reported as empty rather than mis-parsed.
 */
export function parseId3v2(bytes: Uint8Array): Id3Tags {
  const block = findId3v2(bytes);
  if (!block || block.unsynchronised) return {};

  const major = block.majorVersion;
  const idLength = major === 2 ? 3 : 4;
  const headerLength = major === 2 ? 6 : 10;

  let cursor = 10;
  if (major >= 3 && (bytes[5] & 0x40) !== 0) {
    // Extended header: 2.3 stores its own size excluding itself, 2.4 syncsafe
    // and including itself.
    if (cursor + 4 <= bytes.length) {
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      cursor +=
        major === 4 ? readSyncsafe(bytes, cursor) : view.getUint32(cursor) + 4;
    }
  }

  const tags: Id3Tags = {};
  const end = Math.min(block.size, bytes.length);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (cursor + headerLength <= end) {
    const id = ascii(bytes, cursor, idLength);
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding reached

    let size: number;
    if (major === 2) {
      size =
        (bytes[cursor + 3] << 16) |
        (bytes[cursor + 4] << 8) |
        bytes[cursor + 5];
    } else if (major === 4) {
      size = readSyncsafe(bytes, cursor + 4);
    } else {
      size = view.getUint32(cursor + 4);
    }
    if (size <= 0 || cursor + headerLength + size > end) break;

    const body = bytes.subarray(
      cursor + headerLength,
      cursor + headerLength + size,
    );
    for (const field of ID3_FIELDS) {
      if (tags[field] !== undefined) continue;
      if (!FRAME_IDS[field].includes(id)) continue;
      const value = id.startsWith('COM')
        ? decodeCommentFrame(body)
        : trimNulls(decodeTextFrame(body));
      if (value) tags[field] = value;
    }

    cursor += headerLength + size;
  }

  return tags;
}

const ID3V1_GENRES: readonly string[] = [
  'Blues',
  'Classic Rock',
  'Country',
  'Dance',
  'Disco',
  'Funk',
  'Grunge',
  'Hip-Hop',
  'Jazz',
  'Metal',
  'New Age',
  'Oldies',
  'Other',
  'Pop',
  'R&B',
  'Rap',
  'Reggae',
  'Rock',
  'Techno',
  'Industrial',
  'Alternative',
  'Ska',
  'Death Metal',
  'Pranks',
  'Soundtrack',
  'Euro-Techno',
  'Ambient',
  'Trip-Hop',
  'Vocal',
  'Jazz+Funk',
  'Fusion',
  'Trance',
  'Classical',
  'Instrumental',
  'Acid',
  'House',
  'Game',
  'Sound Clip',
  'Gospel',
  'Noise',
  'Alternative Rock',
  'Bass',
  'Soul',
  'Punk',
  'Space',
];

/** Reads a trailing ID3v1 tag. Used only to fill gaps an ID3v2 tag left. */
export function parseId3v1(bytes: Uint8Array): Id3Tags {
  const block = findId3v1(bytes);
  if (!block) return {};
  const at = block.offset;
  const tags: Id3Tags = {};
  const title = trimNulls(decodeLatin1(bytes.subarray(at + 3, at + 33)));
  const artist = trimNulls(decodeLatin1(bytes.subarray(at + 33, at + 63)));
  const album = trimNulls(decodeLatin1(bytes.subarray(at + 63, at + 93)));
  const year = trimNulls(decodeLatin1(bytes.subarray(at + 93, at + 97)));
  const comment = trimNulls(decodeLatin1(bytes.subarray(at + 97, at + 125)));
  if (title) tags.title = title;
  if (artist) tags.artist = artist;
  if (album) tags.album = album;
  if (year) tags.year = year;
  if (comment) tags.comment = comment;
  // ID3v1.1 reuses the last two comment bytes for the track number.
  if (bytes[at + 125] === 0 && bytes[at + 126] !== 0) {
    tags.track = String(bytes[at + 126]);
  }
  const genre = ID3V1_GENRES[bytes[at + 127]];
  if (genre) tags.genre = genre;
  return tags;
}

/** ID3v2 first, ID3v1 only where ID3v2 said nothing. */
export function readTags(bytes: Uint8Array): Id3Tags {
  const v2 = parseId3v2(bytes);
  const v1 = parseId3v1(bytes);
  const merged: Id3Tags = { ...v1 };
  for (const field of ID3_FIELDS) {
    const value = v2[field];
    if (value) merged[field] = value;
  }
  for (const field of ID3_FIELDS) {
    if (!merged[field]) delete merged[field];
  }
  return merged;
}

function utf16leWithBom(value: string): Uint8Array {
  const out = new Uint8Array(2 + value.length * 2);
  out[0] = 0xff;
  out[1] = 0xfe;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    out[2 + index * 2] = code & 0xff;
    out[3 + index * 2] = code >> 8;
  }
  return out;
}

/**
 * Builds an ID3v2.3 tag. Every string is written as UTF-16 with a byte order
 * mark, which is the only ID3v2.3 encoding that can carry ₹, Devanagari or
 * emoji — so tags survive instead of being replaced with question marks.
 */
export function buildId3v2(tags: Id3Tags): Uint8Array {
  const frames: Uint8Array[] = [];

  for (const field of ID3_FIELDS) {
    const value = tags[field]?.trim();
    if (!value) continue;
    const id = WRITE_FRAME_ID[field];

    let body: Uint8Array;
    if (id === 'COMM') {
      const text = utf16leWithBom(value);
      body = new Uint8Array(1 + 3 + 2 + text.length);
      body[0] = 0x01; // UTF-16 with BOM
      body[1] = 0x65; // 'e'
      body[2] = 0x6e; // 'n'
      body[3] = 0x67; // 'g'
      body[4] = 0x00; // empty description, terminated by two null bytes
      body[5] = 0x00;
      body.set(text, 6);
    } else {
      const text = utf16leWithBom(value);
      body = new Uint8Array(1 + text.length);
      body[0] = 0x01;
      body.set(text, 1);
    }

    const frame = new Uint8Array(10 + body.length);
    for (let index = 0; index < 4; index += 1) {
      frame[index] = id.charCodeAt(index);
    }
    new DataView(frame.buffer).setUint32(4, body.length);
    frame.set(body, 10);
    frames.push(frame);
  }

  if (!frames.length) return new Uint8Array(0);

  let bodySize = 0;
  for (const frame of frames) bodySize += frame.length;

  const tag = new Uint8Array(10 + bodySize);
  tag[0] = 0x49; // I
  tag[1] = 0x44; // D
  tag[2] = 0x33; // 3
  tag[3] = 3; // version 2.3
  tag[4] = 0;
  tag[5] = 0; // no flags
  writeSyncsafe(tag, 6, bodySize);

  let cursor = 10;
  for (const frame of frames) {
    tag.set(frame, cursor);
    cursor += frame.length;
  }
  return tag;
}
