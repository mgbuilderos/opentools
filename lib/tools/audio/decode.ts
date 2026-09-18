/**
 * Decoding a compressed audio file using the decoders the browser already has.
 *
 * This is the one part of the toolkit that cannot be a pure function, and it is
 * deliberately thin: everything it does is get samples out of the browser and
 * hand them to the pure code in `pcm.ts` and `wav.ts`.
 *
 * **Nothing here uploads anything.** `decodeAudioData` is a local decoder — the
 * same one that plays an `<audio>` element — and the page's `connect-src 'none'`
 * means the tab could not send the file anywhere even if this code tried to.
 *
 * The trap this module exists to avoid is described at length in `probe.ts`:
 * `decodeAudioData` resamples its output to the sample rate of the context it
 * was called on, and says nothing about having done so. So the file's own rate
 * is read from its header first, the context is built at that rate, and
 * resampling happens only when it is asked for.
 */

import { decodeAiff, isAiff } from './aiff';
import type { AudioProbe } from './probe';
import { probeAudio } from './probe';
import { decodeWav, type AudioData } from './wav';

export interface DecodeResult {
  audio: AudioData;
  /** What the file's own header said, or `null` if the format was not recognised. */
  probe: AudioProbe | null;
  /**
   * Set when the decoded rate differs from the rate the file declared — which
   * happens for Opus (always 48 kHz), for containers whose rate could not be
   * read, and where a rate falls outside what the browser will build a context
   * at. The page shows this rather than leaving it implicit.
   */
  resampledFrom: number | null;
}

/**
 * What the Web Audio specification guarantees a context can be built at. A
 * file outside this range still decodes — the browser resamples it into range
 * and `resampledFrom` records that it happened.
 */
const MIN_CONTEXT_RATE = 8000;
const MAX_CONTEXT_RATE = 96_000;
const FALLBACK_RATE = 48_000;

type OfflineContextConstructor = new (
  channels: number,
  length: number,
  sampleRate: number,
) => OfflineAudioContext;

function offlineContext(): OfflineContextConstructor | null {
  if (typeof globalThis === 'undefined') return null;
  const scope = globalThis as unknown as {
    OfflineAudioContext?: OfflineContextConstructor;
    webkitOfflineAudioContext?: OfflineContextConstructor;
  };
  return scope.OfflineAudioContext ?? scope.webkitOfflineAudioContext ?? null;
}

/** Whether this browser can decode audio at all. */
export function canDecodeAudio(): boolean {
  return offlineContext() !== null;
}

function build(
  channels: number,
  length: number,
  sampleRate: number,
): OfflineAudioContext {
  const Constructor = offlineContext();
  if (!Constructor) {
    throw new Error(
      'This browser has no Web Audio support, so it cannot decode audio files.',
    );
  }
  return new Constructor(channels, Math.max(1, Math.round(length)), sampleRate);
}

/**
 * Older WebKit only offered the callback form of `decodeAudioData` and returned
 * `undefined` from it. Asking for the promise and falling back costs one branch
 * and removes a whole class of browser-version bug.
 */
function decode(
  context: OfflineAudioContext,
  buffer: ArrayBuffer,
): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const failed = (cause: unknown) =>
      reject(
        cause instanceof Error && cause.message
          ? cause
          : new Error('This browser could not decode that audio file.'),
      );
    let returned: Promise<AudioBuffer> | undefined;
    try {
      returned = context.decodeAudioData(buffer, resolve, failed) as
        | Promise<AudioBuffer>
        | undefined;
    } catch (cause) {
      failed(cause);
      return;
    }
    if (returned && typeof returned.then === 'function') {
      returned.then(resolve, failed);
    }
  });
}

function toAudioData(buffer: AudioBuffer): AudioData {
  const channels: Float32Array[] = [];
  for (let index = 0; index < buffer.numberOfChannels; index += 1) {
    // `getChannelData` hands back a live view into the AudioBuffer. Copying is
    // what makes the result safe to keep after the context is discarded.
    channels.push(new Float32Array(buffer.getChannelData(index)));
  }
  return { channels, sampleRate: buffer.sampleRate };
}

/**
 * Reads the formats this project parses itself, or returns `null` to let the
 * browser try. Never throws: a refusal here is not a refusal overall.
 */
function decodeUncompressed(bytes: Uint8Array): AudioData | null {
  try {
    if (isAiff(bytes)) {
      const aiff = decodeAiff(bytes);
      return { channels: aiff.channels, sampleRate: aiff.sampleRate };
    }
    if (
      bytes.length > 12 &&
      String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF'
    ) {
      const wav = decodeWav(bytes);
      return { channels: wav.channels, sampleRate: wav.sampleRate };
    }
  } catch {
    // The browser may know a variant this code does not. Let it try.
  }
  return null;
}

/**
 * Decodes an audio file into samples, at the file's own sample rate wherever
 * that rate can be read and honoured.
 */
export async function decodeAudioFile(file: File): Promise<DecodeResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length) throw new Error('That file is empty.');

  // Probe before decoding: `decodeAudioData` detaches the buffer it is given,
  // so the bytes have to be read while they are still readable.
  const probe = probeAudio(bytes);

  // Uncompressed formats are read here rather than by the browser. Two reasons,
  // both measured rather than assumed:
  //
  // - **Chromium refuses AIFF** while WebKit accepts it. A page that offers
  //   AIFF and then fails in Chrome is worse than one that never offered it.
  // - It removes the resampling question entirely. There is no context, so
  //   there is nothing to resample to.
  //
  // Either reader may still refuse a file it does not understand — a WAV
  // holding ADPCM, a compressed AIFF-C — and the browser gets its turn after,
  // because it may well know a variant this code does not.
  const local = decodeUncompressed(bytes);
  if (local) return { audio: local, probe, resampledFrom: null };
  const declared = probe?.sampleRate ?? null;
  const wanted =
    declared && declared >= MIN_CONTEXT_RATE && declared <= MAX_CONTEXT_RATE
      ? declared
      : FALLBACK_RATE;

  // A fresh copy, because the decoder takes ownership of whatever it is handed.
  const buffer = bytes.slice().buffer;
  const context = build(1, 1, wanted);
  const decoded = await decode(context, buffer);
  const audio = toAudioData(decoded);

  if (!audio.channels.length || !audio.channels[0].length) {
    throw new Error('That file decoded to no audio at all.');
  }

  return {
    audio,
    probe,
    resampledFrom:
      declared !== null && declared !== audio.sampleRate ? declared : null,
  };
}

/**
 * Changes the sample rate, using the browser's own resampler.
 *
 * Doing this well is a real piece of signal processing — a naive
 * implementation that picks the nearest sample produces audible aliasing — and
 * the browser already contains a good one. Rendering through an
 * `OfflineAudioContext` at the target rate is how it is reached.
 */
export async function resample(
  audio: AudioData,
  targetRate: number,
): Promise<AudioData> {
  if (targetRate === audio.sampleRate) return audio;
  if (targetRate < MIN_CONTEXT_RATE || targetRate > MAX_CONTEXT_RATE) {
    throw new Error(
      `A sample rate of ${targetRate} Hz is outside what browsers will resample to (${MIN_CONTEXT_RATE}–${MAX_CONTEXT_RATE} Hz).`,
    );
  }
  const frames = audio.channels[0].length;
  const length = Math.max(
    1,
    Math.ceil((frames * targetRate) / audio.sampleRate),
  );
  const context = build(audio.channels.length, length, targetRate);

  const source = context.createBufferSource();
  const input = context.createBuffer(
    audio.channels.length,
    frames,
    audio.sampleRate,
  );
  for (let index = 0; index < audio.channels.length; index += 1) {
    // `set` on the channel's own array rather than `copyToChannel`: it wants a
    // Float32Array whose buffer type matches exactly, which a channel read back
    // out of another AudioBuffer does not satisfy.
    input.getChannelData(index).set(audio.channels[index]);
  }
  source.buffer = input;
  source.connect(context.destination);
  source.start();

  return toAudioData(await context.startRendering());
}
