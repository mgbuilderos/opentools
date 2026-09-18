/**
 * MPEG-1 / MPEG-2 / MPEG-2.5 Audio frame header decoding (ISO/IEC 11172-3 and
 * ISO/IEC 13818-3), plus the Xing / Info / VBRI variable-bitrate headers.
 *
 * Everything here is pure arithmetic over bytes. Nothing decodes audio, so the
 * compressed payload can be copied through a cut or a join untouched — which is
 * what makes lossless editing possible in a browser tab with no codec.
 */

export type MpegVersion = 'MPEG1' | 'MPEG2' | 'MPEG2.5';
export type MpegLayer = 1 | 2 | 3;
export type ChannelMode = 'stereo' | 'joint-stereo' | 'dual-channel' | 'mono';

export interface Mp3Frame {
  /** Byte offset of the frame header inside the source file. */
  offset: number;
  /** Total frame size in bytes, header included. */
  length: number;
  version: MpegVersion;
  layer: MpegLayer;
  bitrateKbps: number;
  sampleRate: number;
  channelMode: ChannelMode;
  channels: 1 | 2;
  /** PCM samples this frame represents once decoded. */
  samples: number;
  durationMs: number;
  padded: boolean;
  crcProtected: boolean;
}

const VERSION_BY_BITS: readonly (MpegVersion | null)[] = [
  'MPEG2.5',
  null, // reserved
  'MPEG2',
  'MPEG1',
];

const LAYER_BY_BITS: readonly (MpegLayer | null)[] = [
  null, // reserved
  3,
  2,
  1,
];

const CHANNEL_MODE_BY_BITS: readonly ChannelMode[] = [
  'stereo',
  'joint-stereo',
  'dual-channel',
  'mono',
];

/** kbps by bitrate index. Index 0 is "free format" and index 15 is invalid. */
const BITRATES_MPEG1: Record<MpegLayer, readonly number[]> = {
  1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
};

const BITRATES_MPEG2: Record<MpegLayer, readonly number[]> = {
  1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};

const SAMPLE_RATES: Record<MpegVersion, readonly number[]> = {
  MPEG1: [44_100, 48_000, 32_000],
  MPEG2: [22_050, 24_000, 16_000],
  'MPEG2.5': [11_025, 12_000, 8_000],
};

export function samplesPerFrame(
  version: MpegVersion,
  layer: MpegLayer,
): number {
  if (layer === 1) return 384;
  if (layer === 2) return 1152;
  return version === 'MPEG1' ? 1152 : 576;
}

/**
 * Bytes of side information between the header (plus optional CRC) and the
 * main data of a Layer III frame. The Xing/Info tag lives immediately after it.
 */
export function sideInfoSize(
  version: MpegVersion,
  channelMode: ChannelMode,
): number {
  const mono = channelMode === 'mono';
  if (version === 'MPEG1') return mono ? 17 : 32;
  return mono ? 9 : 17;
}

/** True when the four bytes at `offset` start with an 11-bit MPEG sync word. */
export function hasFrameSync(bytes: Uint8Array, offset: number): boolean {
  return (
    offset >= 0 &&
    offset + 1 < bytes.length &&
    bytes[offset] === 0xff &&
    (bytes[offset + 1] & 0xe0) === 0xe0
  );
}

/**
 * Decodes the 4-byte frame header at `offset`.
 * Returns `null` for anything that is not a frame this library can copy safely:
 * a bad sync word, a reserved version or layer, a reserved sample rate, or the
 * "free format" and invalid bitrate indexes, whose frame length cannot be read
 * from the header alone.
 */
export function decodeFrameHeader(
  bytes: Uint8Array,
  offset: number,
): Mp3Frame | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  if (!hasFrameSync(bytes, offset)) return null;

  const b1 = bytes[offset + 1];
  const b2 = bytes[offset + 2];
  const b3 = bytes[offset + 3];

  const version = VERSION_BY_BITS[(b1 >> 3) & 0b11];
  const layer = LAYER_BY_BITS[(b1 >> 1) & 0b11];
  if (!version || !layer) return null;

  const bitrateIndex = (b2 >> 4) & 0b1111;
  if (bitrateIndex === 0 || bitrateIndex === 0b1111) return null;

  const sampleRateIndex = (b2 >> 2) & 0b11;
  if (sampleRateIndex === 0b11) return null;

  const table = version === 'MPEG1' ? BITRATES_MPEG1 : BITRATES_MPEG2;
  const bitrateKbps = table[layer][bitrateIndex];
  const sampleRate = SAMPLE_RATES[version][sampleRateIndex];
  if (!bitrateKbps || !sampleRate) return null;

  const padded = ((b2 >> 1) & 1) === 1;
  const channelMode = CHANNEL_MODE_BY_BITS[(b3 >> 6) & 0b11];
  const samples = samplesPerFrame(version, layer);
  const padding = padded ? 1 : 0;

  const length =
    layer === 1
      ? (Math.floor((12 * bitrateKbps * 1000) / sampleRate) + padding) * 4
      : Math.floor((samples / 8) * ((bitrateKbps * 1000) / sampleRate)) +
        padding;

  if (length < 4) return null;

  return {
    offset,
    length,
    version,
    layer,
    bitrateKbps,
    sampleRate,
    channelMode,
    channels: channelMode === 'mono' ? 1 : 2,
    samples,
    durationMs: (samples / sampleRate) * 1000,
    padded,
    crcProtected: (b1 & 1) === 0,
  };
}

/** Two frames belong to the same stream only if these agree. */
export function framesAreCompatible(a: Mp3Frame, b: Mp3Frame): boolean {
  return (
    a.version === b.version &&
    a.layer === b.layer &&
    a.sampleRate === b.sampleRate &&
    a.channels === b.channels
  );
}

/**
 * Finds the offset of the next header that looks like a real frame, by
 * requiring `chain` consecutive frames to decode and line up end-to-end. One
 * valid-looking header is not enough — 0xFFE byte pairs occur inside compressed
 * audio and inside cover art.
 */
export function findFrameSync(
  bytes: Uint8Array,
  from: number,
  limit: number,
  chain = 3,
): number {
  for (let offset = Math.max(0, from); offset + 4 <= limit; offset += 1) {
    if (bytes[offset] !== 0xff) continue;
    const first = decodeFrameHeader(bytes, offset);
    if (!first) continue;

    let cursor = offset + first.length;
    let confirmed = 1;
    let ok = true;
    while (confirmed < chain) {
      if (cursor + 4 > limit) break; // ran out of file: a short tail is fine
      const next = decodeFrameHeader(bytes, cursor);
      if (!next || !framesAreCompatible(first, next)) {
        ok = false;
        break;
      }
      cursor += next.length;
      confirmed += 1;
    }
    if (ok) return offset;
  }
  return -1;
}

export type VbrHeaderKind = 'Xing' | 'Info' | 'VBRI';

export interface VbrHeader {
  kind: VbrHeaderKind;
  /** Offset of the tag string itself, not of the frame. */
  offset: number;
  frameCount: number | null;
  byteCount: number | null;
}

/**
 * Reads the Xing, Info or VBRI header carried by the first frame of most MP3
 * files. `Xing` marks variable bitrate, `Info` marks constant bitrate, and
 * `VBRI` is Fraunhofer's equivalent at a fixed offset.
 */
export function readVbrHeader(
  bytes: Uint8Array,
  frame: Mp3Frame,
): VbrHeader | null {
  const tagAt = (offset: number): string =>
    offset + 4 <= bytes.length
      ? String.fromCharCode(
          bytes[offset],
          bytes[offset + 1],
          bytes[offset + 2],
          bytes[offset + 3],
        )
      : '';

  const vbriOffset = frame.offset + 36;
  if (tagAt(vbriOffset) === 'VBRI') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const byteCount =
      vbriOffset + 14 <= bytes.length ? view.getUint32(vbriOffset + 10) : null;
    const frameCount =
      vbriOffset + 18 <= bytes.length ? view.getUint32(vbriOffset + 14) : null;
    return { kind: 'VBRI', offset: vbriOffset, frameCount, byteCount };
  }

  if (frame.layer !== 3) return null;

  // Xing/Info sits after the side info. Some encoders write the CRC, some do
  // not, so try both placements rather than assuming.
  const base =
    frame.offset + 4 + sideInfoSize(frame.version, frame.channelMode);
  for (const offset of [base, base + 2]) {
    const tag = tagAt(offset);
    if (tag !== 'Xing' && tag !== 'Info') continue;
    if (offset + 8 > bytes.length) {
      return { kind: tag, offset, frameCount: null, byteCount: null };
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const flags = view.getUint32(offset + 4);
    let cursor = offset + 8;
    let frameCount: number | null = null;
    let byteCount: number | null = null;
    if (flags & 0x0001) {
      frameCount = cursor + 4 <= bytes.length ? view.getUint32(cursor) : null;
      cursor += 4;
    }
    if (flags & 0x0002) {
      byteCount = cursor + 4 <= bytes.length ? view.getUint32(cursor) : null;
    }
    return { kind: tag, offset, frameCount, byteCount };
  }

  return null;
}

/**
 * Builds a fresh single-frame Xing header describing `frameCount` audio frames
 * occupying `byteCount` bytes. A cut or a join invalidates the source's own
 * header, so a correct replacement is written rather than a stale one copied.
 *
 * The frame is a real, decodable MPEG frame whose payload is silence, which is
 * how every encoder does this; players that do not recognise the tag simply
 * play one frame (~26 ms at 44.1 kHz) of nothing.
 */
export function buildXingFrame(options: {
  version: MpegVersion;
  layer: MpegLayer;
  sampleRate: number;
  channelMode: ChannelMode;
  frameCount: number;
  byteCount: number;
}): Uint8Array {
  const { version, layer, sampleRate, channelMode } = options;
  if (layer !== 3) {
    throw new Error('A Xing header frame is only defined for MPEG Layer III.');
  }

  const versionBits =
    version === 'MPEG1' ? 0b11 : version === 'MPEG2' ? 0b10 : 0b00;
  const rates = SAMPLE_RATES[version];
  const sampleRateIndex = rates.indexOf(sampleRate);
  if (sampleRateIndex < 0) {
    throw new Error(
      `${sampleRate} Hz is not a valid sample rate for ${version}.`,
    );
  }
  const channelBits = CHANNEL_MODE_BY_BITS.indexOf(channelMode);

  const side = sideInfoSize(version, channelMode);
  const needed = 4 + side + 4 + 4 + 4 + 4; // header, side info, tag, flags, 2 fields
  const table = version === 'MPEG1' ? BITRATES_MPEG1 : BITRATES_MPEG2;
  const samples = samplesPerFrame(version, layer);

  let bitrateIndex = -1;
  let frameLength = 0;
  for (let index = 1; index <= 14; index += 1) {
    const kbps = table[layer][index];
    if (!kbps) continue;
    const length = Math.floor((samples / 8) * ((kbps * 1000) / sampleRate));
    if (length >= needed) {
      bitrateIndex = index;
      frameLength = length;
      break;
    }
  }
  if (bitrateIndex < 0) {
    throw new Error(
      'No bitrate in this MPEG version leaves room for a Xing header.',
    );
  }

  const frame = new Uint8Array(frameLength);
  frame[0] = 0xff;
  frame[1] = 0xe0 | (versionBits << 3) | (0b01 << 1) | 1; // Layer III, no CRC
  frame[2] = (bitrateIndex << 4) | (sampleRateIndex << 2);
  frame[3] = channelBits << 6;

  const tagOffset = 4 + side;
  frame[tagOffset] = 0x58; // X
  frame[tagOffset + 1] = 0x69; // i
  frame[tagOffset + 2] = 0x6e; // n
  frame[tagOffset + 3] = 0x67; // g

  const view = new DataView(frame.buffer);
  view.setUint32(tagOffset + 4, 0x0003); // frame count and byte count present
  view.setUint32(tagOffset + 8, Math.max(0, Math.round(options.frameCount)));
  view.setUint32(tagOffset + 12, Math.max(0, Math.round(options.byteCount)));

  return frame;
}
