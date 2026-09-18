import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  decodeWav,
  encodeWav,
  durationSeconds,
  wavByteLength,
  type AudioData,
} from './wav';

/**
 * The fixtures are written by ffmpeg, not by this code. Each is a 440 Hz sine
 * of exactly 0.1 seconds at exactly 0.8 of full scale — an amplitude asked for
 * by name in the generating command rather than left to a default, so the
 * number below is ground truth and not an observation of whatever came out. That matters: a test that builds its own fixture
 * with the same assumptions as the reader will agree with a reader that is
 * wrong. Here the bytes come from a different program, and the thing asserted
 * is arithmetic that was true before either program existed — 440 cycles a
 * second means 44 cycles in a tenth of a second, whatever wrote the file.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

/**
 * Sign changes per second, halved — the frequency of any waveform that crosses
 * zero. The count is exact to within one crossing at the ends of the buffer,
 * which over a tenth of a second is +/-5 Hz, so callers assert a band rather
 * than a point. The band is still decisive: reading the wrong bit depth, the
 * wrong endianness or the wrong sign gives a figure that is out by a multiple,
 * not by five hertz.
 */
function measuredFrequency(samples: Float32Array, sampleRate: number): number {
  let crossings = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const before = samples[index - 1];
    const now = samples[index];
    if ((before < 0 && now >= 0) || (before >= 0 && now < 0)) crossings += 1;
  }
  return (crossings * sampleRate) / samples.length / 2;
}

function expectTone(samples: Float32Array, sampleRate: number) {
  const hertz = measuredFrequency(samples, sampleRate);
  expect(hertz).toBeGreaterThan(430);
  expect(hertz).toBeLessThan(450);
}

function peakOf(samples: Float32Array): number {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    peak = Math.max(peak, Math.abs(samples[index]));
  }
  return peak;
}

describe('reading a WAV written by another program', () => {
  it('reads 16-bit stereo and recovers the tone that was written', () => {
    const wav = decodeWav(load('tone-44k-stereo-s16.wav'));
    expect(wav.sampleRate).toBe(44_100);
    expect(wav.channels).toHaveLength(2);
    expect(wav.bitsPerSample).toBe(16);
    expect(wav.isFloat).toBe(false);
    expect(wav.truncated).toBe(false);
    expect(wav.channels[0]).toHaveLength(4410);
    for (const channel of wav.channels) {
      expectTone(channel, wav.sampleRate);
      expect(peakOf(channel)).toBeCloseTo(0.8, 3);
    }
  });

  it('reads 8-bit, where samples are unsigned and centred on 128', () => {
    // The one real trap in WAV. Read as signed, this file is a loud buzz whose
    // waveform is torn in half; the frequency check below would not survive it.
    const wav = decodeWav(load('tone-8k-mono-u8.wav'));
    expect(wav.sampleRate).toBe(8000);
    expect(wav.bitsPerSample).toBe(8);
    expect(wav.channels).toHaveLength(1);
    expectTone(wav.channels[0], 8000);
    // 8 bits resolve to 1/128, so 0.8 is met to within one step and no closer.
    expect(peakOf(wav.channels[0])).toBeCloseTo(0.8, 1);
  });

  it('reads 24-bit, which has no DataView accessor and is assembled by hand', () => {
    const wav = decodeWav(load('tone-44k-mono-s24.wav'));
    expect(wav.sampleRate).toBe(44_100);
    expect(wav.bitsPerSample).toBe(24);
    expectTone(wav.channels[0], 44_100);
    // A sign error in the top byte shows up as a peak nowhere near 0.8.
    expect(peakOf(wav.channels[0])).toBeCloseTo(0.8, 4);
  });

  it('reads 32-bit floating point', () => {
    const wav = decodeWav(load('tone-48k-mono-f32.wav'));
    expect(wav.sampleRate).toBe(48_000);
    expect(wav.isFloat).toBe(true);
    expect(wav.bitsPerSample).toBe(32);
    expectTone(wav.channels[0], 48_000);
    expect(peakOf(wav.channels[0])).toBeCloseTo(0.8, 6);
  });

  it('agrees with the file on how long it runs', () => {
    const wav = decodeWav(load('tone-44k-stereo-s16.wav'));
    expect(durationSeconds(wav)).toBeCloseTo(0.1, 5);
  });
});

describe('WAV files that are damaged or unusual', () => {
  function chunk(id: string, body: Uint8Array): Uint8Array {
    const out = new Uint8Array(8 + body.length + (body.length % 2));
    for (let index = 0; index < 4; index += 1)
      out[index] = id.charCodeAt(index);
    new DataView(out.buffer).setUint32(4, body.length, true);
    out.set(body, 8);
    return out;
  }

  function riff(...parts: Uint8Array[]): Uint8Array {
    const size = parts.reduce((total, part) => total + part.length, 0);
    const out = new Uint8Array(12 + size);
    out.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    new DataView(out.buffer).setUint32(4, 4 + size, true);
    out.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
    let at = 12;
    for (const part of parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }

  const fmt16 = () => {
    const body = new Uint8Array(16);
    const view = new DataView(body.buffer);
    view.setUint16(0, 1, true);
    view.setUint16(2, 1, true);
    view.setUint32(4, 8000, true);
    view.setUint32(8, 16_000, true);
    view.setUint16(12, 2, true);
    view.setUint16(14, 16, true);
    return chunk('fmt ', body);
  };

  it('stays aligned after an odd-sized chunk, which is padded to an even boundary', () => {
    // A 5-byte LIST chunk occupies 6. A reader that skips only 5 lands one byte
    // early and every chunk after it is garbage — including the audio.
    const odd = chunk('LIST', new Uint8Array([1, 2, 3, 4, 5]));
    expect(odd.length).toBe(14);
    const file = riff(
      fmt16(),
      odd,
      chunk('data', new Uint8Array([0, 0, 0x00, 0x40])),
    );
    const wav = decodeWav(file);
    expect(wav.sampleRate).toBe(8000);
    expect(wav.channels[0]).toHaveLength(2);
    expect(wav.channels[0][1]).toBeCloseTo(0.5, 3);
  });

  it('keeps the audio that is present when the data chunk claims more than the file holds', () => {
    const file = riff(fmt16(), chunk('data', new Uint8Array([0, 0, 0, 0x40])));
    // Rewrite the data chunk's length to claim four gigabytes.
    const view = new DataView(file.buffer);
    view.setUint32(file.length - 8, 0xfffffff0, true);
    const wav = decodeWav(file);
    expect(wav.truncated).toBe(true);
    expect(wav.channels[0]).toHaveLength(2);
  });

  it('refuses RF64 by name rather than misreading it', () => {
    const file = riff(fmt16(), chunk('data', new Uint8Array(4)));
    file.set([0x52, 0x46, 0x36, 0x34], 0); // RF64
    expect(() => decodeWav(file)).toThrow(/RF64/u);
  });

  it('refuses a WAV holding compressed audio, naming the format', () => {
    const body = new Uint8Array(16);
    const view = new DataView(body.buffer);
    view.setUint16(0, 0x11, true); // IMA ADPCM
    view.setUint16(2, 1, true);
    view.setUint32(4, 8000, true);
    view.setUint16(14, 4, true);
    const file = riff(chunk('fmt ', body), chunk('data', new Uint8Array(8)));
    expect(() => decodeWav(file)).toThrow(/compressed audio \(format 17\)/u);
  });

  it('refuses a file that is not a WAV at all', () => {
    expect(() => decodeWav(new Uint8Array(64))).toThrow(/not a WAV/u);
    expect(() => decodeWav(new Uint8Array(4))).toThrow(/too small/u);
  });

  it('refuses a WAV with no samples in it', () => {
    expect(() => decodeWav(riff(fmt16()))).toThrow(/no audio data/u);
  });

  it('rejects a format header claiming an impossible channel count', () => {
    const body = new Uint8Array(16);
    const view = new DataView(body.buffer);
    view.setUint16(0, 1, true);
    view.setUint16(2, 9999, true);
    view.setUint32(4, 44_100, true);
    view.setUint16(14, 16, true);
    expect(() =>
      decodeWav(riff(chunk('fmt ', body), chunk('data', new Uint8Array(4)))),
    ).toThrow(/9999 channels/u);
  });
});

describe('writing a WAV', () => {
  const tone = (): AudioData => {
    const samples = new Float32Array(1000);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin((2 * Math.PI * 440 * index) / 44_100) * 0.8;
    }
    return { channels: [samples], sampleRate: 44_100 };
  };

  it('comes back the same through its own reader, at every depth', () => {
    for (const depth of [16, 24, 32] as const) {
      const decoded = decodeWav(encodeWav(tone(), depth));
      expect(decoded.sampleRate).toBe(44_100);
      expect(decoded.bitsPerSample).toBe(depth);
      expect(decoded.channels[0]).toHaveLength(1000);
      // Rounding alone, so half a step: 0.5/32,768 at 16 bits and
      // 0.5/8,388,608 at 24. Anything larger would mean the scale used to
      // write disagrees with the scale used to read.
      const tolerance = depth === 16 ? 2e-5 : depth === 24 ? 1e-7 : 1e-7;
      for (let index = 0; index < 1000; index += 1) {
        expect(
          Math.abs(decoded.channels[0][index] - tone().channels[0][index]),
        ).toBeLessThan(tolerance);
      }
    }
  });

  it('predicts its own size before building it', () => {
    for (const depth of [16, 24, 32] as const) {
      expect(encodeWav(tone(), depth).length).toBe(
        wavByteLength(tone(), depth),
      );
    }
  });

  it('interleaves channels rather than laying them end to end', () => {
    const left = Float32Array.from([1, 0, 1, 0]);
    const right = Float32Array.from([-1, 0, -1, 0]);
    const wav = decodeWav(
      encodeWav({ channels: [left, right], sampleRate: 8000 }, 16),
    );
    // -1 is exactly representable; +1 is not, and comes back one step short.
    expect(Array.from(wav.channels[1])).toEqual([-1, 0, -1, 0]);
    expect(wav.channels[0][0]).toBeCloseTo(1, 4);
    expect(
      Array.from(wav.channels[0].filter((_, index) => index % 2 === 1)),
    ).toEqual([0, 0]);
  });

  it('clips rather than wrapping when a sample is past full scale', () => {
    // Wrapping is the failure that matters: +1.5 stored as an integer that
    // overflows comes back as a large negative number, which is a loud click.
    const wav = decodeWav(
      encodeWav(
        { channels: [Float32Array.from([1.5, -1.5])], sampleRate: 8000 },
        16,
      ),
    );
    expect(wav.channels[0][0]).toBeCloseTo(1, 3);
    expect(wav.channels[0][1]).toBeCloseTo(-1, 3);
  });

  it('writes a float WAV that carries the fact chunk the format expects', () => {
    const bytes = encodeWav(tone(), 32);
    expect(new TextDecoder().decode(bytes.subarray(0, 64))).toContain('fact');
    expect(new DataView(bytes.buffer).getUint16(20, true)).toBe(3); // IEEE float
  });

  it('refuses channels of different lengths instead of writing a torn file', () => {
    const uneven = {
      channels: [new Float32Array(10), new Float32Array(9)],
      sampleRate: 8000,
    };
    expect(() => encodeWav(uneven, 16)).toThrow(/different lengths/u);
  });

  it('refuses to write nothing', () => {
    expect(() => encodeWav({ channels: [], sampleRate: 8000 }, 16)).toThrow(
      /no channels/u,
    );
  });
});
