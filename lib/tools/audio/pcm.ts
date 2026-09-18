/**
 * Operations on decoded samples: trim, downmix, normalise, fade.
 *
 * Everything here is a pure function from `AudioData` to `AudioData`. No
 * `AudioContext`, no DOM, nothing asynchronous — which is why every one of them
 * can be tested in Node against arithmetic anyone can check by hand, rather
 * than only by listening.
 *
 * Samples are floats nominally in [-1, 1]. Nothing here clamps them: a gain
 * that pushes a sample past 1 keeps its real value all the way to the writer,
 * and clipping happens once, at the moment integers are written. Clamping at
 * each step instead would quietly destroy a peak that a later fade was about to
 * bring back down.
 */

import type { AudioData } from './wav';

/**
 * The loudest sample in the file, as decibels relative to full scale.
 *
 * 0 dBFS is the loudest an integer WAV can represent; everything below it is
 * negative. Digital silence has no logarithm, so it is reported as `-Infinity`
 * rather than as some agreed-upon floor — callers can decide what to show, and
 * a made-up number here would be a made-up number on the screen.
 */
export function peakDbfs(audio: AudioData): number {
  let peak = 0;
  for (const channel of audio.channels) {
    for (let index = 0; index < channel.length; index += 1) {
      const magnitude = Math.abs(channel[index]);
      if (magnitude > peak) peak = magnitude;
    }
  }
  return peak === 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(peak);
}

function mapChannels(
  audio: AudioData,
  gain: (sample: number, index: number) => number,
): AudioData {
  return {
    sampleRate: audio.sampleRate,
    channels: audio.channels.map((channel) => {
      const next = new Float32Array(channel.length);
      for (let index = 0; index < channel.length; index += 1) {
        next[index] = gain(channel[index], index);
      }
      return next;
    }),
  };
}

/**
 * Scales the whole file so its loudest moment sits at `targetDbfs`.
 *
 * This is **peak** normalisation, not loudness normalisation, and the
 * difference matters enough to say out loud: it makes the loudest instant hit a
 * known ceiling, which is not the same as making two files *sound* equally
 * loud. Matching perceived loudness needs LUFS, which needs a filter bank and a
 * gating algorithm, and pretending otherwise would be the sort of claim this
 * project does not make.
 *
 * Silence is returned untouched — there is no gain that makes zero louder.
 */
export function normalizePeak(audio: AudioData, targetDbfs: number): AudioData {
  const current = peakDbfs(audio);
  if (!Number.isFinite(current)) return audio;
  const gain = Math.pow(10, (targetDbfs - current) / 20);
  return mapChannels(audio, (sample) => sample * gain);
}

/** Applies a constant gain in decibels. */
export function applyGainDb(audio: AudioData, decibels: number): AudioData {
  if (decibels === 0) return audio;
  const gain = Math.pow(10, decibels / 20);
  return mapChannels(audio, (sample) => sample * gain);
}

/**
 * Keeps the audio between two times, in seconds.
 *
 * Both edges are clamped into the file rather than rejected: asking for the
 * first minute of a forty-second recording gives the forty seconds, which is
 * what was meant. An empty or backwards range is an error, because that is a
 * mistake rather than an intention.
 */
export function trim(
  audio: AudioData,
  startSeconds: number,
  endSeconds: number,
): AudioData {
  const frames = audio.channels.length ? audio.channels[0].length : 0;
  const from = Math.max(
    0,
    Math.min(frames, Math.round(startSeconds * audio.sampleRate)),
  );
  const to = Math.max(
    0,
    Math.min(frames, Math.round(endSeconds * audio.sampleRate)),
  );
  if (to <= from) {
    throw new Error('The end of the range must come after its start.');
  }
  return {
    sampleRate: audio.sampleRate,
    channels: audio.channels.map((channel) => channel.slice(from, to)),
  };
}

/**
 * Averages every channel into one.
 *
 * Averaging rather than summing is deliberate: two channels summed can reach 2,
 * which clips on the way out. The average of samples in [-1, 1] is always back
 * inside [-1, 1], so a stereo file cannot be made to clip by folding it down.
 *
 * The cost is the one thing worth warning about — if the two channels hold the
 * same sound with opposite sign, averaging cancels them to silence. That is
 * arithmetic, not a bug, and it is why the page shows the peak after the
 * conversion as well as before.
 */
export function toMono(audio: AudioData): AudioData {
  if (audio.channels.length <= 1) return audio;
  const frames = audio.channels[0].length;
  const mono = new Float32Array(frames);
  for (const channel of audio.channels) {
    for (let index = 0; index < frames; index += 1) {
      mono[index] += channel[index];
    }
  }
  for (let index = 0; index < frames; index += 1) {
    mono[index] /= audio.channels.length;
  }
  return { sampleRate: audio.sampleRate, channels: [mono] };
}

/** Keeps a single channel — the usual reason is an interview recorded on one side. */
export function extractChannel(audio: AudioData, index: number): AudioData {
  const channel = audio.channels[index];
  if (!channel) {
    throw new Error(
      `This audio has ${audio.channels.length} channel${audio.channels.length === 1 ? '' : 's'}, so there is no channel ${index + 1}.`,
    );
  }
  return { sampleRate: audio.sampleRate, channels: [channel.slice()] };
}

/**
 * Ramps the volume up at the start and down at the end.
 *
 * The ramp is linear in amplitude, which is what an editor's default fade does
 * and what makes the arithmetic checkable: halfway through a fade-in, a sample
 * is at half its value. Fades longer than the audio are shortened to fit, and
 * overlapping fades are allowed — both gains simply multiply.
 */
export function applyFade(
  audio: AudioData,
  fadeInSeconds: number,
  fadeOutSeconds: number,
): AudioData {
  const frames = audio.channels.length ? audio.channels[0].length : 0;
  if (frames === 0) return audio;
  const fadeIn = Math.max(
    0,
    Math.min(frames, Math.round(fadeInSeconds * audio.sampleRate)),
  );
  const fadeOut = Math.max(
    0,
    Math.min(frames, Math.round(fadeOutSeconds * audio.sampleRate)),
  );
  if (fadeIn === 0 && fadeOut === 0) return audio;

  return mapChannels(audio, (sample, index) => {
    let gain = 1;
    if (fadeIn > 0 && index < fadeIn) gain *= index / fadeIn;
    const fromEnd = frames - 1 - index;
    if (fadeOut > 0 && fromEnd < fadeOut) gain *= fromEnd / fadeOut;
    return sample * gain;
  });
}
