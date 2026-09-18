import { describe, expect, it } from 'vitest';
import {
  applyFade,
  applyGainDb,
  extractChannel,
  normalizePeak,
  peakDbfs,
  toMono,
  trim,
} from './pcm';
import type { AudioData } from './wav';

/**
 * Every number checked here is arithmetic someone can do on paper: halving an
 * amplitude is -6.02 dB, averaging a signal with its own negative is silence,
 * and halfway through a linear fade a sample is at half its value. That is the
 * point of keeping these functions pure — the alternative to arithmetic is
 * listening, and a test cannot listen.
 */
const audio = (channels: number[][], sampleRate = 8000): AudioData => ({
  channels: channels.map((values) => Float32Array.from(values)),
  sampleRate,
});

const ramp = (length: number, sampleRate = 8000): AudioData =>
  audio([Array.from({ length }, () => 1)], sampleRate);

describe('measuring the loudest moment', () => {
  it('calls full scale zero decibels', () => {
    expect(peakDbfs(audio([[1, 0, -0.5]]))).toBeCloseTo(0, 6);
  });

  it('calls half amplitude -6.02 dB, which is what halving is', () => {
    expect(peakDbfs(audio([[0.5, -0.25]]))).toBeCloseTo(-6.0206, 3);
  });

  it('looks across every channel, not only the first', () => {
    expect(peakDbfs(audio([[0.1], [0.9]]))).toBeCloseTo(-0.9151, 3);
  });

  it('reports silence as -Infinity rather than inventing a floor', () => {
    // Zero has no logarithm. Any finite number here would be a number this
    // project made up, and it would be shown on screen as though measured.
    expect(peakDbfs(audio([[0, 0, 0]]))).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe('normalising to a peak', () => {
  it('puts the loudest moment exactly where it was asked to go', () => {
    for (const target of [0, -1, -3, -12]) {
      expect(
        peakDbfs(normalizePeak(audio([[0.2, -0.05]]), target)),
      ).toBeCloseTo(target, 5);
    }
  });

  it('leaves the shape alone while changing the level', () => {
    const before = audio([[0.2, -0.1, 0.05]]);
    const after = normalizePeak(before, 0);
    // Every sample scaled by the same factor: ratios between them are intact.
    expect(after.channels[0][1] / after.channels[0][0]).toBeCloseTo(-0.5, 6);
    expect(after.channels[0][2] / after.channels[0][0]).toBeCloseTo(0.25, 6);
  });

  it('scales channels together, so the stereo image does not move', () => {
    const after = normalizePeak(audio([[0.5], [0.25]]), 0);
    expect(after.channels[0][0]).toBeCloseTo(1, 6);
    expect(after.channels[1][0]).toBeCloseTo(0.5, 6);
  });

  it('returns silence untouched, because no gain makes zero louder', () => {
    const silent = audio([[0, 0]]);
    expect(normalizePeak(silent, -3)).toBe(silent);
  });

  it('can quieten as well as raise', () => {
    expect(peakDbfs(normalizePeak(audio([[1]]), -20))).toBeCloseTo(-20, 5);
  });
});

describe('gain in decibels', () => {
  it('doubles the amplitude at +6.02 dB', () => {
    expect(applyGainDb(audio([[0.25]]), 6.0206).channels[0][0]).toBeCloseTo(
      0.5,
      5,
    );
  });

  it('does not touch the samples at 0 dB', () => {
    const same = audio([[0.3]]);
    expect(applyGainDb(same, 0)).toBe(same);
  });

  it('lets a sample go past full scale rather than clamping it here', () => {
    // Clamping at each step would destroy a peak that a later fade was about
    // to bring back down. Clipping happens once, where integers are written.
    expect(applyGainDb(audio([[0.8]]), 12).channels[0][0]).toBeGreaterThan(1);
  });
});

describe('trimming', () => {
  it('keeps exactly the range asked for', () => {
    const ten = audio([Array.from({ length: 10 }, (_, index) => index / 10)]);
    const cut = trim(ten, 2 / 8000, 5 / 8000);
    expect(Array.from(cut.channels[0])).toHaveLength(3);
    expect(cut.channels[0][0]).toBeCloseTo(0.2, 6);
  });

  it('trims every channel to the same length', () => {
    const cut = trim(
      audio([
        [1, 2, 3, 4],
        [5, 6, 7, 8],
      ]),
      1 / 8000,
      3 / 8000,
    );
    expect(cut.channels[0]).toHaveLength(2);
    expect(cut.channels[1]).toHaveLength(2);
    expect(Array.from(cut.channels[1])).toEqual([6, 7]);
  });

  it('clamps an end past the file to the end of the file', () => {
    // Asking for the first minute of a forty-second recording means the forty
    // seconds, not an error.
    expect(trim(ramp(10), 0, 60).channels[0]).toHaveLength(10);
  });

  it('clamps a negative start to the beginning', () => {
    expect(trim(ramp(10), -5, 10 / 8000).channels[0]).toHaveLength(10);
  });

  it('refuses a range that ends before it starts', () => {
    expect(() => trim(ramp(10), 5 / 8000, 2 / 8000)).toThrow(
      /after its start/u,
    );
  });

  it('refuses a range with nothing in it', () => {
    expect(() => trim(ramp(10), 3 / 8000, 3 / 8000)).toThrow(
      /after its start/u,
    );
  });

  it('keeps the sample rate, since trimming does not change the clock', () => {
    expect(trim(ramp(10, 44_100), 0, 5 / 44_100).sampleRate).toBe(44_100);
  });
});

describe('folding channels down to one', () => {
  it('averages rather than sums, so stereo cannot be made to clip', () => {
    const mono = toMono(
      audio([
        [1, 1],
        [1, 1],
      ]),
    );
    expect(mono.channels).toHaveLength(1);
    expect(Array.from(mono.channels[0])).toEqual([1, 1]);
  });

  it('averages two different channels', () => {
    expect(
      Array.from(
        toMono(
          audio([
            [1, 0],
            [0, 1],
          ]),
        ).channels[0],
      ),
    ).toEqual([0.5, 0.5]);
  });

  it('cancels to silence when the channels are opposite, which is arithmetic not a bug', () => {
    // Worth pinning: someone will hit this with a badly mastered file and it
    // will look like the tool ate their audio. The page shows the peak after
    // conversion for exactly this reason.
    expect(
      Array.from(
        toMono(
          audio([
            [0.5, -0.5],
            [-0.5, 0.5],
          ]),
        ).channels[0],
      ),
    ).toEqual([0, 0]);
  });

  it('leaves a file that is already mono exactly as it was', () => {
    const already = audio([[0.3, 0.4]]);
    expect(toMono(already)).toBe(already);
  });
});

describe('picking a single channel', () => {
  it('takes the channel asked for', () => {
    expect(
      Array.from(
        extractChannel(
          audio([
            [1, 2],
            [3, 4],
          ]),
          1,
        ).channels[0],
      ),
    ).toEqual([3, 4]);
  });

  it('copies rather than aliasing the original samples', () => {
    const source = audio([[1, 2]]);
    const taken = extractChannel(source, 0);
    taken.channels[0][0] = 99;
    expect(source.channels[0][0]).toBe(1);
  });

  it('says how many channels there actually are when asked for one that is not there', () => {
    expect(() => extractChannel(audio([[1]]), 1)).toThrow(
      /has 1 channel, so there is no channel 2/u,
    );
    expect(() => extractChannel(audio([[1], [2]]), 5)).toThrow(
      /has 2 channels, so there is no channel 6/u,
    );
  });
});

describe('fading', () => {
  it('reaches half volume halfway through a linear fade-in', () => {
    const faded = applyFade(ramp(100), 100 / 8000, 0);
    expect(faded.channels[0][0]).toBe(0);
    expect(faded.channels[0][50]).toBeCloseTo(0.5, 6);
  });

  it('ends a fade-out at silence', () => {
    const faded = applyFade(ramp(100), 0, 100 / 8000);
    expect(faded.channels[0][99]).toBe(0);
    expect(faded.channels[0][50]).toBeCloseTo(0.49, 2);
  });

  it('leaves the middle untouched when the fades are short', () => {
    const faded = applyFade(ramp(100), 10 / 8000, 10 / 8000);
    expect(faded.channels[0][50]).toBe(1);
  });

  it('multiplies both gains where the fades overlap', () => {
    // A fade-in and fade-out covering the whole file at once: the midpoint is
    // half from each, so a quarter.
    const faded = applyFade(ramp(100), 100 / 8000, 100 / 8000);
    expect(faded.channels[0][50]).toBeCloseTo(0.5 * 0.49, 2);
  });

  it('shortens a fade longer than the audio rather than failing', () => {
    const faded = applyFade(ramp(10), 60, 0);
    expect(faded.channels[0][0]).toBe(0);
    expect(faded.channels[0]).toHaveLength(10);
  });

  it('returns the audio untouched when neither fade was asked for', () => {
    const same = ramp(10);
    expect(applyFade(same, 0, 0)).toBe(same);
  });

  it('fades every channel by the same amount', () => {
    const faded = applyFade(
      audio([
        [1, 1, 1, 1],
        [1, 1, 1, 1],
      ]),
      4 / 8000,
      0,
    );
    expect(faded.channels[0][2]).toBeCloseTo(faded.channels[1][2], 6);
    expect(faded.channels[0][2]).toBeCloseTo(0.5, 6);
  });
});
