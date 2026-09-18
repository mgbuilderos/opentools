/**
 * Reading AIFF, because Chromium will not.
 *
 * Measured 2026-09-19 with `e2e/audio-convert.spec.ts`: WebKit decodes AIFF
 * through `decodeAudioData` and **Chromium refuses it**. AIFF is what a Mac
 * records and what Logic exports, so a page that offers it and then fails in
 * Chrome is worse than one that never offered it.
 *
 * It is also uncompressed PCM in a container this project already parses for
 * `probe.ts`, so reading it directly is a few dozen lines and removes the
 * browser from the question entirely.
 *
 * **The trap, and it is the opposite of the WAV one:** AIFF samples are
 * **signed at every depth, including 8-bit**. WAV is unsigned at 8-bit and
 * signed above. Code that shares a sample reader between the two formats gets
 * one of them wrong, which is why these are two functions.
 *
 * Samples are big-endian, which is the other difference — AIFF comes from
 * Motorola-era Macs. AIFF-C adds compression types; the only one handled here
 * is `sowt`, which means "uncompressed, but little-endian after all".
 */

import type { DecodedWav } from './wav';

const FORM = 0x464f524d;
const AIFF = 0x41494646;
const AIFC = 0x41494643;

function tag(view: DataView, at: number): number {
  return view.getUint32(at, false);
}

function fourcc(bytes: Uint8Array, at: number): string {
  return String.fromCharCode(
    bytes[at],
    bytes[at + 1],
    bytes[at + 2],
    bytes[at + 3],
  );
}

/**
 * The sample rate is an 80-bit IEEE 754 extended float — a type JavaScript does
 * not have, so it is assembled by hand: a sign bit, a 15-bit exponent, and a
 * 64-bit mantissa whose leading bit is written out rather than implied.
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

interface Common {
  channels: number;
  frames: number;
  bitsPerSample: number;
  sampleRate: number;
  compression: string;
}

/** Whether this looks like an AIFF at all, without committing to reading it. */
export function isAiff(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (tag(view, 0) !== FORM) return false;
  const kind = tag(view, 8);
  return kind === AIFF || kind === AIFC;
}

export function decodeAiff(input: Uint8Array): DecodedWav {
  if (!isAiff(input)) throw new Error('This is not an AIFF file.');
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const isAifc = tag(view, 8) === AIFC;

  let common: Common | null = null;
  let soundAt = -1;
  let soundSize = 0;
  let truncated = false;

  // Chunks are id, big-endian length, body — padded to an even boundary, the
  // same alignment rule RIFF has and the same one hand-written readers miss.
  let at = 12;
  while (at + 8 <= input.length) {
    const kind = fourcc(input, at);
    const claimed = view.getUint32(at + 4, false);
    const body = at + 8;
    const size = Math.min(claimed, input.length - body);

    if (kind === 'COMM' && size >= 18) {
      common = {
        channels: view.getUint16(body, false),
        frames: view.getUint32(body + 2, false),
        bitsPerSample: view.getUint16(body + 6, false),
        sampleRate: readExtendedFloat(input, body + 8),
        compression: isAifc && size >= 22 ? fourcc(input, body + 18) : 'NONE',
      };
    } else if (kind === 'SSND' && size >= 8) {
      // SSND begins with an offset and a block size, then the samples. The
      // offset is almost always zero and is almost always ignored; a file that
      // sets it and a reader that does not will be out of alignment.
      const offset = view.getUint32(body, false);
      soundAt = body + 8 + offset;
      soundSize = Math.max(0, size - 8 - offset);
      if (claimed > input.length - body) truncated = true;
    }
    at = body + size + (size % 2);
  }

  if (!common)
    throw new Error(
      'This AIFF file has no COMM header, so nothing can be read from it.',
    );
  if (soundAt < 0) throw new Error('This AIFF file contains no audio data.');

  const { channels: count, bitsPerSample, sampleRate, compression } = common;
  if (compression !== 'NONE' && compression !== 'sowt') {
    throw new Error(
      `This AIFF-C file is compressed as "${compression}". This page reads uncompressed AIFF.`,
    );
  }
  if (![8, 16, 24, 32].includes(bitsPerSample)) {
    throw new Error(
      `This AIFF file stores ${bitsPerSample}-bit samples, which this page cannot read.`,
    );
  }
  if (count < 1 || count > 64) {
    throw new Error(
      `This AIFF file claims ${count} channels, which cannot be right.`,
    );
  }
  if (!(sampleRate > 0) || sampleRate > 768_000) {
    throw new Error('This AIFF file does not state a usable sample rate.');
  }

  // 'sowt' is AIFF-C for "the samples are little-endian" — the layout a Mac
  // writes when it is not byte-swapping for its own history.
  const littleEndian = compression === 'sowt';
  const bytesPerSample = bitsPerSample >> 3;
  const bytesPerFrame = bytesPerSample * count;
  const frames = Math.min(common.frames, Math.floor(soundSize / bytesPerFrame));

  const channels: Float32Array[] = [];
  for (let index = 0; index < count; index += 1)
    channels.push(new Float32Array(frames));

  for (let frame = 0; frame < frames; frame += 1) {
    const frameStart = soundAt + frame * bytesPerFrame;
    for (let channel = 0; channel < count; channel += 1) {
      const offset = frameStart + channel * bytesPerSample;
      let value: number;
      if (bitsPerSample === 8) {
        // Signed, unlike WAV. This is the difference that matters.
        value = view.getInt8(offset) / 128;
      } else if (bitsPerSample === 16) {
        value = view.getInt16(offset, littleEndian) / 32_768;
      } else if (bitsPerSample === 24) {
        const a = input[offset];
        const b = input[offset + 1];
        const c = input[offset + 2];
        const raw = littleEndian
          ? a | (b << 8) | (c << 16)
          : (a << 16) | (b << 8) | c;
        value = (raw & 0x800000 ? raw - 0x1000000 : raw) / 8_388_608;
      } else {
        value = view.getInt32(offset, littleEndian) / 2_147_483_648;
      }
      channels[channel][frame] = value;
    }
  }

  return {
    channels,
    sampleRate: Math.round(sampleRate),
    bitsPerSample,
    isFloat: false,
    truncated: truncated || frames < common.frames,
  };
}
