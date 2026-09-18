/**
 * Reading an audio file's own header to find out what it is.
 *
 * This exists for a reason that is easy to miss. `decodeAudioData` resamples
 * whatever it decodes to the sample rate of the `AudioContext` it was called
 * on, and it does that **silently**. Decode a 44,100 Hz recording on a
 * 48,000 Hz context and you get a 48,000 Hz result that nothing in the returned
 * object admits was resampled — the original rate is simply gone. A converter
 * built that way quietly resamples every file it touches and calls the output
 * lossless.
 *
 * So the rate is read from the file first, from the bytes the encoder wrote,
 * and the decoding context is then created at that rate. Nothing is resampled
 * unless the person asks for it.
 *
 * The second reason is plainer: it lets the page say *"44,100 Hz stereo AAC,
 * 3 minutes 12"* before anything is decoded, so what happens next is not a
 * surprise.
 *
 * Only headers are read — the first few hundred bytes — and no format is
 * decoded here. Where a container is recognised but its sample rate is not
 * reachable without decoding it, the rate is reported as `null` rather than
 * guessed, and the browser's own decoder settles it.
 */

import { decodeFrameHeader, findFrameSync } from './mp3-frames';

export interface AudioProbe {
  /** The file format, as a person would name it. */
  container: string;
  /** How the audio inside is coded. */
  codec: string;
  sampleRate: number | null;
  channels: number | null;
  durationSeconds: number | null;
  /** Something the header revealed that is worth knowing. Never filler. */
  note: string | null;
}

function fourcc(bytes: Uint8Array, at: number): string {
  if (at + 4 > bytes.length) return '';
  return String.fromCharCode(
    bytes[at],
    bytes[at + 1],
    bytes[at + 2],
    bytes[at + 3],
  );
}

function startsWith(bytes: Uint8Array, at: number, text: string): boolean {
  if (at + text.length > bytes.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[at + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

/** Skips an ID3v2 tag, which is what usually sits in front of an MP3. */
function afterId3(bytes: Uint8Array): number {
  if (!startsWith(bytes, 0, 'ID3') || bytes.length < 10) return 0;
  // The size is four bytes with the top bit of each cleared, so a size can
  // never be mistaken for a frame sync.
  const size =
    (bytes[6] & 0x7f) * 0x200000 +
    (bytes[7] & 0x7f) * 0x4000 +
    (bytes[8] & 0x7f) * 0x80 +
    (bytes[9] & 0x7f);
  return Math.min(bytes.length, 10 + size);
}

function probeWav(bytes: Uint8Array): AudioProbe | null {
  if (!startsWith(bytes, 0, 'RIFF') || !startsWith(bytes, 8, 'WAVE'))
    return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 12;
  let format = 0;
  let channels: number | null = null;
  let sampleRate: number | null = null;
  let bits = 0;
  let dataBytes = 0;

  while (at + 8 <= bytes.length) {
    const kind = fourcc(bytes, at);
    const size = Math.min(view.getUint32(at + 4, true), bytes.length - at - 8);
    if (kind === 'fmt ' && size >= 16) {
      format = view.getUint16(at + 8, true);
      channels = view.getUint16(at + 10, true);
      sampleRate = view.getUint32(at + 12, true);
      bits = view.getUint16(at + 22, true);
      if (format === 0xfffe && size >= 40)
        format = view.getUint16(at + 32, true);
    } else if (kind === 'data') {
      dataBytes = size;
    }
    at += 8 + size + (size % 2);
  }
  if (!channels || !sampleRate) return null;

  const codec =
    format === 3
      ? `${bits}-bit floating point`
      : format === 1
        ? `${bits}-bit PCM`
        : `format ${format}`;
  const bytesPerFrame = (bits >> 3) * channels;
  return {
    container: 'WAV',
    codec,
    sampleRate,
    channels,
    durationSeconds:
      bytesPerFrame > 0 ? dataBytes / bytesPerFrame / sampleRate : null,
    note:
      format === 1 || format === 3
        ? 'Already uncompressed — converting re-packages it rather than decoding it.'
        : null,
  };
}

function probeMp3(bytes: Uint8Array): AudioProbe | null {
  const start = afterId3(bytes);
  const offset = findFrameSync(
    bytes,
    start,
    Math.min(bytes.length, start + 200_000),
  );
  if (offset < 0) return null;
  const frame = decodeFrameHeader(bytes, offset);
  if (!frame) return null;
  return {
    container: 'MP3',
    codec: `${frame.version} Layer ${'I'.repeat(frame.layer === 3 ? 3 : frame.layer)}`,
    sampleRate: frame.sampleRate,
    channels: frame.channels,
    durationSeconds: null,
    note:
      start > 0
        ? 'Carries an ID3 tag. Tags are metadata, not audio, and are not carried into a WAV.'
        : null,
  };
}

/**
 * FLAC's STREAMINFO is a bit field, not a byte layout: the sample rate is 20
 * bits that begin partway through byte 12 and end partway through byte 14, so
 * it has to be assembled by shifting rather than read out.
 */
function readFlacStreamInfo(bytes: Uint8Array, at: number): AudioProbe | null {
  if (at + 18 > bytes.length) return null;
  const sampleRate =
    (bytes[at + 10] << 12) | (bytes[at + 11] << 4) | (bytes[at + 12] >> 4);
  const channels = ((bytes[at + 12] >> 1) & 0x07) + 1;
  const bits = (((bytes[at + 12] & 0x01) << 4) | (bytes[at + 13] >> 4)) + 1;
  // Total sample count is 36 bits. It exceeds 32, so it is assembled with
  // multiplication rather than shifts, which in JavaScript wrap at 32.
  const totalSamples =
    (bytes[at + 13] & 0x0f) * 4_294_967_296 +
    bytes[at + 14] * 16_777_216 +
    bytes[at + 15] * 65_536 +
    bytes[at + 16] * 256 +
    bytes[at + 17];
  if (!sampleRate) return null;
  return {
    container: 'FLAC',
    codec: `FLAC, ${bits}-bit`,
    sampleRate,
    channels,
    durationSeconds: totalSamples > 0 ? totalSamples / sampleRate : null,
    note: 'Lossless in, lossless out — a WAV of this holds exactly the samples FLAC was compressing.',
  };
}

function probeFlac(bytes: Uint8Array): AudioProbe | null {
  if (!startsWith(bytes, 0, 'fLaC')) return null;
  // 'fLaC', then a 4-byte metadata block header, then STREAMINFO.
  return readFlacStreamInfo(bytes, 8);
}

function probeOgg(bytes: Uint8Array): AudioProbe | null {
  if (!startsWith(bytes, 0, 'OggS') || bytes.length < 28) return null;
  const segments = bytes[26];
  const payload = 27 + segments;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (startsWith(bytes, payload + 1, 'vorbis') && bytes[payload] === 1) {
    return {
      container: 'Ogg',
      codec: 'Vorbis',
      sampleRate: view.getUint32(payload + 12, true),
      channels: bytes[payload + 11],
      durationSeconds: null,
      note: null,
    };
  }
  if (startsWith(bytes, payload, 'OpusHead')) {
    return {
      container: 'Ogg',
      codec: 'Opus',
      // Opus always decodes at 48,000 Hz whatever it was encoded from; the
      // rate stored here records the original and does not control playback.
      sampleRate: 48_000,
      channels: bytes[payload + 9],
      durationSeconds: null,
      note: 'Opus always decodes at 48,000 Hz, whatever it was recorded at.',
    };
  }
  if (bytes[payload] === 0x7f && startsWith(bytes, payload + 1, 'FLAC')) {
    return readFlacStreamInfo(bytes, payload + 13);
  }
  return {
    container: 'Ogg',
    codec: 'unrecognised',
    sampleRate: null,
    channels: null,
    durationSeconds: null,
    note: null,
  };
}

interface Box {
  type: string;
  body: number;
  end: number;
}

/** Walks one level of MP4 boxes. Sizes are clamped so a bad one cannot escape. */
function boxes(
  bytes: Uint8Array,
  view: DataView,
  from: number,
  to: number,
): Box[] {
  const found: Box[] = [];
  let at = from;
  while (at + 8 <= to) {
    let size = view.getUint32(at, false);
    // An MP4 box is its size first and its four-character type second, unlike
    // RIFF and AIFF where the type comes first. Reading the type at the box
    // start gets four bytes of the size and matches nothing.
    const type = fourcc(bytes, at + 4);
    let body = at + 8;
    if (size === 1) {
      if (at + 16 > to) break;
      // 64-bit size. The high word is read but a file that needs it is far
      // beyond anything this page can hold in memory anyway.
      size =
        view.getUint32(at + 8, false) * 4_294_967_296 +
        view.getUint32(at + 12, false);
      body = at + 16;
    } else if (size === 0) {
      size = to - at;
    }
    if (size < body - at) break;
    const end = Math.min(to, at + size);
    found.push({ type, body, end });
    at = end > at ? end : to;
  }
  return found;
}

function find(list: Box[], type: string): Box | undefined {
  return list.find((box) => box.type === type);
}

const MP4_CODECS: Record<string, string> = {
  mp4a: 'AAC',
  alac: 'Apple Lossless',
  ac_3: 'Dolby Digital',
  Opus: 'Opus',
  fLaC: 'FLAC',
};

function probeMp4(bytes: Uint8Array): AudioProbe | null {
  if (!startsWith(bytes, 4, 'ftyp')) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const brand = fourcc(bytes, 8);
  const top = boxes(bytes, view, 0, bytes.length);
  const moov = find(top, 'moov');
  const fallback: AudioProbe = {
    container: brand === 'M4A ' ? 'M4A' : 'MP4',
    codec: 'unrecognised',
    sampleRate: null,
    channels: null,
    durationSeconds: null,
    note: null,
  };
  if (!moov) return fallback;

  for (const trak of boxes(bytes, view, moov.body, moov.end).filter(
    (box) => box.type === 'trak',
  )) {
    const mdia = find(boxes(bytes, view, trak.body, trak.end), 'mdia');
    if (!mdia) continue;
    const inside = boxes(bytes, view, mdia.body, mdia.end);
    const hdlr = find(inside, 'hdlr');
    // A video file's first track is the picture. Only a 'soun' handler is audio.
    if (!hdlr || fourcc(bytes, hdlr.body + 8) !== 'soun') continue;

    const mdhd = find(inside, 'mdhd');
    let sampleRate: number | null = null;
    let durationSeconds: number | null = null;
    if (mdhd) {
      const version = bytes[mdhd.body];
      const at = version === 1 ? mdhd.body + 20 : mdhd.body + 12;
      sampleRate = view.getUint32(at, false);
      const duration =
        version === 1
          ? view.getUint32(at + 4, false) * 4_294_967_296 +
            view.getUint32(at + 8, false)
          : view.getUint32(at + 4, false);
      if (sampleRate > 0) durationSeconds = duration / sampleRate;
    }

    let codec = 'unrecognised';
    let channels: number | null = null;
    const stbl = find(
      boxes(
        bytes,
        view,
        find(inside, 'minf')?.body ?? 0,
        find(inside, 'minf')?.end ?? 0,
      ),
      'stbl',
    );
    const stsd = stbl
      ? find(boxes(bytes, view, stbl.body, stbl.end), 'stsd')
      : undefined;
    if (stsd && stsd.body + 16 <= stsd.end) {
      const entry = stsd.body + 8;
      codec = MP4_CODECS[fourcc(bytes, entry + 4)] ?? fourcc(bytes, entry + 4);
      if (entry + 26 <= stsd.end) channels = view.getUint16(entry + 24, false);
    }

    return {
      container: brand === 'M4A ' ? 'M4A' : 'MP4',
      codec,
      sampleRate: sampleRate && sampleRate > 0 ? sampleRate : null,
      channels: channels && channels > 0 ? channels : null,
      durationSeconds,
      note:
        codec === 'Apple Lossless'
          ? 'Apple Lossless, so a WAV of this is an exact copy of the samples.'
          : null,
    };
  }
  return { ...fallback, note: 'No audio track found in this file.' };
}

/**
 * AIFF stores its sample rate as an 80-bit floating-point number — a format
 * from 1985 that JavaScript has no type for, so it is assembled by hand: a sign
 * bit, a 15-bit exponent, and a 64-bit mantissa with its leading bit written
 * out rather than implied.
 */
function readExtendedFloat(bytes: Uint8Array, at: number): number {
  const exponent = ((bytes[at] & 0x7f) << 8) | bytes[at + 1];
  let mantissa = 0;
  for (let index = 2; index < 10; index += 1) {
    mantissa = mantissa * 256 + bytes[at + index];
  }
  if (exponent === 0 && mantissa === 0) return 0;
  const value = mantissa * Math.pow(2, exponent - 16_383 - 63);
  return bytes[at] & 0x80 ? -value : value;
}

function probeAiff(bytes: Uint8Array): AudioProbe | null {
  if (!startsWith(bytes, 0, 'FORM')) return null;
  const kind = fourcc(bytes, 8);
  if (kind !== 'AIFF' && kind !== 'AIFC') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let at = 12;
  while (at + 8 <= bytes.length) {
    const type = fourcc(bytes, at);
    const size = Math.min(view.getUint32(at + 4, false), bytes.length - at - 8);
    if (type === 'COMM' && size >= 18) {
      const channels = view.getUint16(at + 8, false);
      const frames = view.getUint32(at + 10, false);
      const bits = view.getUint16(at + 14, false);
      const sampleRate = readExtendedFloat(bytes, at + 16);
      const compression =
        kind === 'AIFC' && size >= 22 ? fourcc(bytes, at + 26) : 'NONE';
      return {
        container: kind === 'AIFC' ? 'AIFF-C' : 'AIFF',
        codec:
          compression === 'NONE' || compression === 'sowt'
            ? `${bits}-bit PCM`
            : compression,
        sampleRate: sampleRate > 0 ? Math.round(sampleRate) : null,
        channels,
        durationSeconds: sampleRate > 0 ? frames / sampleRate : null,
        note: null,
      };
    }
    at += 8 + size + (size % 2);
  }
  return {
    container: kind === 'AIFC' ? 'AIFF-C' : 'AIFF',
    codec: 'unrecognised',
    sampleRate: null,
    channels: null,
    durationSeconds: null,
    note: null,
  };
}

/**
 * Containers that are recognised but not parsed. Reporting the format without
 * its sample rate is honest and still useful; guessing 44,100 Hz because it is
 * common would be neither.
 */
function probeBySignature(bytes: Uint8Array): AudioProbe | null {
  const unparsed = (container: string, note: string): AudioProbe => ({
    container,
    codec: 'read by the browser',
    sampleRate: null,
    channels: null,
    durationSeconds: null,
    note,
  });
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return unparsed(
      'WebM or Matroska',
      'The sample rate is inside the compressed stream, so the browser reports it after decoding.',
    );
  }
  if (startsWith(bytes, 0, 'caff')) {
    return unparsed('CAF', 'Apple Core Audio. Not every browser decodes it.');
  }
  if (startsWith(bytes, 0, '.snd')) {
    return unparsed(
      'AU',
      'A Sun/NeXT audio file. Most browsers do not decode it.',
    );
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x30 &&
    bytes[1] === 0x26 &&
    bytes[2] === 0xb2 &&
    bytes[3] === 0x75
  ) {
    return unparsed(
      'ASF or WMA',
      'Windows Media. No browser decodes it, so this file will not convert here.',
    );
  }
  return null;
}

/**
 * Identifies an audio file from its header. Returns `null` when nothing is
 * recognised — the browser is still given a chance to decode it, because a
 * format this does not know is not necessarily a format the browser cannot
 * read.
 */
export function probeAudio(bytes: Uint8Array): AudioProbe | null {
  if (bytes.length < 16) return null;
  return (
    probeWav(bytes) ??
    probeFlac(bytes) ??
    probeOgg(bytes) ??
    probeMp4(bytes) ??
    probeAiff(bytes) ??
    probeBySignature(bytes) ??
    probeMp3(bytes)
  );
}
