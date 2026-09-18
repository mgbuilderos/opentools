/**
 * Reading and writing WAV files, byte by byte.
 *
 * WAV is the format this toolkit converts *to*, for a reason worth stating
 * plainly rather than hiding: **there is no MP3 encoder in this project.** A
 * patent-free, license-clean MP3 encoder is not something that can be shipped
 * responsibly, and a WebAssembly one would be a megabyte of dependency for an
 * output that is worse than its input. So the honest conversion is to WAV:
 * uncompressed, universally readable, and lossless with respect to whatever the
 * browser decoded.
 *
 * WAV is a RIFF file: a four-character tag, a length, and a payload, repeated.
 * Two chunks matter — `fmt ` says how the samples are laid out, and `data`
 * holds them. Everything else (`LIST`, `fact`, `cue `, and whatever an editor
 * felt like leaving behind) is skipped.
 *
 * **Every length in the file is treated as a claim, not a fact.** A chunk header
 * can say it holds four gigabytes inside a two-kilobyte file, and a reader that
 * believes it either allocates wildly or walks off the end of the buffer. Each
 * size here is clamped to what is actually present before it is used.
 */

/** PCM samples, one `Float32Array` per channel, nominally in [-1, 1]. */
export interface AudioData {
  channels: Float32Array[];
  sampleRate: number;
}

export type WavBitDepth = 16 | 24 | 32;

export interface DecodedWav extends AudioData {
  /** What the file said it held, for display. */
  bitsPerSample: number;
  /** `true` when samples were stored as floating point rather than integers. */
  isFloat: boolean;
  /**
   * Set when the `data` chunk claimed more bytes than the file contains. The
   * samples that *are* present are still returned — a truncated recording is
   * usually worth more than an error message.
   */
  truncated: boolean;
}

const RIFF = 0x52494646; // 'RIFF'
const WAVE = 0x57415645; // 'WAVE'
const RF64 = 0x52463634; // 'RF64'
const FMT = 0x666d7420; // 'fmt '
const DATA = 0x64617461; // 'data'

/** `WAVE_FORMAT_EXTENSIBLE` hides the real format in a GUID; see `readFmt`. */
const FORMAT_PCM = 1;
const FORMAT_FLOAT = 3;
const FORMAT_EXTENSIBLE = 0xfffe;

function tag(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function ascii(text: string, into: Uint8Array, at: number) {
  for (let index = 0; index < text.length; index += 1) {
    into[at + index] = text.charCodeAt(index);
  }
}

interface FmtChunk {
  format: number;
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function readFmt(view: DataView, at: number, size: number): FmtChunk {
  if (size < 16) {
    throw new Error('This WAV file has a damaged format header.');
  }
  let format = view.getUint16(at, true);
  const channels = view.getUint16(at + 2, true);
  const sampleRate = view.getUint32(at + 4, true);
  const bitsPerSample = view.getUint16(at + 14, true);

  // `EXTENSIBLE` exists so a file can name a channel layout. The actual sample
  // format is the first two bytes of a 16-byte GUID that follows, and those two
  // bytes hold exactly the code that would otherwise have been here.
  if (format === FORMAT_EXTENSIBLE && size >= 40) {
    format = view.getUint16(at + 24, true);
  }

  if (channels < 1 || channels > 64) {
    throw new Error(
      `This WAV file claims ${channels} channels, which cannot be right.`,
    );
  }
  if (sampleRate < 1 || sampleRate > 768_000) {
    throw new Error(
      `This WAV file claims a sample rate of ${sampleRate} Hz, which cannot be right.`,
    );
  }
  return { format, channels, sampleRate, bitsPerSample };
}

/**
 * Turns stored samples into floats in [-1, 1].
 *
 * The one genuine trap in WAV: **8-bit samples are unsigned**, centred on 128,
 * while every wider integer depth is signed and centred on zero. A reader that
 * treats 8-bit as signed gets a loud buzz and a waveform that looks inverted
 * either side of the middle.
 */
function readSamples(
  bytes: Uint8Array,
  view: DataView,
  start: number,
  frames: number,
  fmt: FmtChunk,
): Float32Array[] {
  const { channels: count, bitsPerSample, format } = fmt;
  const isFloat = format === FORMAT_FLOAT;
  const bytesPerSample = bitsPerSample >> 3;
  const channels: Float32Array[] = [];
  for (let channel = 0; channel < count; channel += 1) {
    channels.push(new Float32Array(frames));
  }

  for (let frame = 0; frame < frames; frame += 1) {
    const frameStart = start + frame * bytesPerSample * count;
    for (let channel = 0; channel < count; channel += 1) {
      const at = frameStart + channel * bytesPerSample;
      let value: number;
      if (isFloat) {
        value =
          bitsPerSample === 64
            ? view.getFloat64(at, true)
            : view.getFloat32(at, true);
      } else if (bitsPerSample === 8) {
        value = (bytes[at] - 128) / 128;
      } else if (bitsPerSample === 16) {
        value = view.getInt16(at, true) / 32_768;
      } else if (bitsPerSample === 24) {
        // No `getInt24`, so rebuild it: little-endian bytes, then carry the
        // sign down from the top byte.
        const raw = bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
        value = (raw & 0x800000 ? raw - 0x1000000 : raw) / 8_388_608;
      } else {
        value = view.getInt32(at, true) / 2_147_483_648;
      }
      channels[channel][frame] = value;
    }
  }
  return channels;
}

export function decodeWav(input: Uint8Array): DecodedWav {
  if (input.length < 12) {
    throw new Error('This file is too small to be a WAV file.');
  }
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);

  if (tag(view, 0) === RF64) {
    throw new Error(
      'This is an RF64 file — a WAV variant for recordings over 4 GB. This page reads standard WAV files only.',
    );
  }
  if (tag(view, 0) !== RIFF || tag(view, 8) !== WAVE) {
    throw new Error('This is not a WAV file.');
  }

  let fmt: FmtChunk | null = null;
  let dataAt = -1;
  let dataSize = 0;
  let truncated = false;

  // Walk the chunk list. A chunk is a 4-byte tag, a 4-byte length, then that
  // many bytes — padded to an even boundary, which is the detail most
  // hand-written readers miss and which silently misaligns everything after an
  // odd-sized chunk.
  let at = 12;
  while (at + 8 <= input.length) {
    const kind = tag(view, at);
    const claimed = view.getUint32(at + 4, true);
    const body = at + 8;
    const available = input.length - body;
    const size = Math.min(claimed, available);

    if (kind === FMT) {
      fmt = readFmt(view, body, size);
    } else if (kind === DATA) {
      dataAt = body;
      dataSize = size;
      if (claimed > available) truncated = true;
    }

    at = body + size + (size % 2);
  }

  if (!fmt)
    throw new Error(
      'This WAV file has no format header, so nothing can be read from it.',
    );
  if (dataAt < 0) throw new Error('This WAV file contains no audio data.');

  const { format, bitsPerSample } = fmt;
  if (format !== FORMAT_PCM && format !== FORMAT_FLOAT) {
    throw new Error(
      `This WAV file holds compressed audio (format ${format}) rather than plain samples. This page reads uncompressed WAV files.`,
    );
  }
  const widths = format === FORMAT_FLOAT ? [32, 64] : [8, 16, 24, 32];
  if (!widths.includes(bitsPerSample)) {
    throw new Error(
      `This WAV file stores ${bitsPerSample}-bit samples, which this page cannot read.`,
    );
  }

  const bytesPerFrame = (bitsPerSample >> 3) * fmt.channels;
  const frames = Math.floor(dataSize / bytesPerFrame);

  return {
    channels: readSamples(input, view, dataAt, frames, fmt),
    sampleRate: fmt.sampleRate,
    bitsPerSample,
    isFloat: format === FORMAT_FLOAT,
    truncated,
  };
}

/**
 * Turning a float back into an integer sample.
 *
 * Full scale is asymmetric in two's complement: with 16 bits there are 32,768
 * steps below zero and only 32,767 above. Both directions are scaled by the
 * larger number and the result is then clamped, which is what ffmpeg and
 * libsndfile do — it keeps -1.0 exactly representable and costs only the
 * single topmost step, and it means a round trip is limited by rounding alone
 * rather than by a mismatch between the scale used to write and the scale used
 * to read.
 *
 * **+1.0 is the one value that cannot survive a round trip** through integer
 * PCM: there is no positive step that far out, so it comes back one step short.
 * That is a property of the format, not of this code, and it is true of every
 * encoder.
 */
function writeInteger(
  out: DataView,
  at: number,
  sample: number,
  bytesPerSample: number,
) {
  const clamped = sample > 1 ? 1 : sample < -1 ? -1 : sample;
  if (bytesPerSample === 2) {
    const value = Math.round(clamped * 32_768);
    out.setInt16(at, value > 32_767 ? 32_767 : value, true);
    return;
  }
  const scaled = Math.round(clamped * 8_388_608);
  const value = scaled > 8_388_607 ? 8_388_607 : scaled;
  const unsigned = value < 0 ? value + 0x1000000 : value;
  out.setUint8(at, unsigned & 0xff);
  out.setUint8(at + 1, (unsigned >> 8) & 0xff);
  out.setUint8(at + 2, (unsigned >> 16) & 0xff);
}

export function encodeWav(
  audio: AudioData,
  bitDepth: WavBitDepth = 16,
): Uint8Array {
  const { channels, sampleRate } = audio;
  if (!channels.length) throw new Error('There are no channels to write.');
  const frames = channels[0].length;
  for (const channel of channels) {
    if (channel.length !== frames) {
      throw new Error(
        'The channels are different lengths, so they cannot be interleaved.',
      );
    }
  }

  const isFloat = bitDepth === 32;
  const bytesPerSample = bitDepth >> 3;
  const blockAlign = bytesPerSample * channels.length;
  const dataSize = frames * blockAlign;
  // A non-PCM `fmt ` chunk carries a `cbSize` field and the spec expects a
  // `fact` chunk beside it. Writing both is what makes a float WAV open
  // everywhere rather than only in the editor that wrote it.
  const fmtSize = isFloat ? 18 : 16;
  const factSize = isFloat ? 12 : 0;
  const pad = dataSize % 2;
  const total = 12 + 8 + fmtSize + factSize + 8 + dataSize + pad;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  ascii('RIFF', out, 0);
  view.setUint32(4, total - 8, true);
  ascii('WAVE', out, 8);

  ascii('fmt ', out, 12);
  view.setUint32(16, fmtSize, true);
  view.setUint16(20, isFloat ? FORMAT_FLOAT : FORMAT_PCM, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  let at = 20 + fmtSize;
  if (isFloat) {
    view.setUint16(36, 0, true); // cbSize: no extra format bytes follow.
    ascii('fact', out, at);
    view.setUint32(at + 4, 4, true);
    view.setUint32(at + 8, frames, true);
    at += 12;
  }

  ascii('data', out, at);
  view.setUint32(at + 4, dataSize, true);
  at += 8;

  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels.length; channel += 1) {
      const sample = channels[channel][frame];
      const target = at + (frame * blockAlign + channel * bytesPerSample);
      if (isFloat) {
        view.setFloat32(target, sample, true);
      } else {
        writeInteger(view, target, sample, bytesPerSample);
      }
    }
  }

  return out;
}

/** How long the audio runs, in seconds. */
export function durationSeconds(audio: AudioData): number {
  return audio.channels.length
    ? audio.channels[0].length / audio.sampleRate
    : 0;
}

/** The size a WAV of this audio would occupy, without building it. */
export function wavByteLength(audio: AudioData, bitDepth: WavBitDepth): number {
  const frames = audio.channels.length ? audio.channels[0].length : 0;
  const dataSize = frames * (bitDepth >> 3) * audio.channels.length;
  return 44 + (bitDepth === 32 ? 14 : 0) + dataSize + (dataSize % 2);
}
