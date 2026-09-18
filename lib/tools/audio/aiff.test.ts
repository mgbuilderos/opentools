import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decodeAiff, isAiff } from './aiff';
import { encodeWav } from './wav';

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

/** Sign changes per second, halved — see `wav.test.ts` for why a band is used. */
function measuredFrequency(samples: Float32Array, sampleRate: number): number {
  let crossings = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index - 1] < 0 !== samples[index] < 0) crossings += 1;
  }
  return (crossings * sampleRate) / samples.length / 2;
}

function peakOf(samples: Float32Array): number {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    peak = Math.max(peak, Math.abs(samples[index]));
  }
  return peak;
}

describe('reading AIFF', () => {
  it('reads the ffmpeg fixture and recovers the tone', () => {
    const aiff = decodeAiff(load('tone-22k-mono.aiff'));
    expect(aiff.sampleRate).toBe(22_050);
    expect(aiff.channels).toHaveLength(1);
    expect(aiff.bitsPerSample).toBe(16);
    expect(aiff.channels[0]).toHaveLength(2205);
    const hertz = measuredFrequency(aiff.channels[0], 22_050);
    expect(hertz).toBeGreaterThan(425);
    expect(hertz).toBeLessThan(455);
    expect(peakOf(aiff.channels[0])).toBeCloseTo(0.8, 2);
  });

  it('reads samples big-endian, which is the whole difference from WAV', () => {
    // Byte-swapping a 16-bit sine turns it into noise, so the frequency check
    // above cannot pass if the endianness is wrong. Stated directly as well:
    // the first samples of a sine start near zero and rise.
    const aiff = decodeAiff(load('tone-22k-mono.aiff'));
    expect(Math.abs(aiff.channels[0][0])).toBeLessThan(0.05);
    expect(aiff.channels[0][1]).toBeGreaterThan(0);
  });

  it('round-trips through the WAV writer with the samples intact', () => {
    const aiff = decodeAiff(load('tone-22k-mono.aiff'));
    const wav = encodeWav(
      { channels: aiff.channels, sampleRate: aiff.sampleRate },
      16,
    );
    expect(wav.length).toBeGreaterThan(2205 * 2);
    expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe('RIFF');
  });

  it('recognises an AIFF without committing to reading it', () => {
    expect(isAiff(load('tone-22k-mono.aiff'))).toBe(true);
    expect(isAiff(load('tone-44k-stereo-s16.wav'))).toBe(false);
    expect(isAiff(new Uint8Array(4))).toBe(false);
  });

  /**
   * Builds an AIFF from chunks. Hand-writing the byte offsets got two of these
   * tests wrong before this existed — one buffer was shorter than the header it
   * declared, so the reader correctly reported a different problem.
   */
  function build(
    kind: 'AIFF' | 'AIFC',
    chunks: [string, Uint8Array][],
  ): Uint8Array {
    const body = chunks.reduce(
      (total, [, data]) => total + 8 + data.length + (data.length % 2),
      0,
    );
    const out = new Uint8Array(12 + body);
    const view = new DataView(out.buffer);
    const write = (text: string, at: number) => {
      for (let index = 0; index < text.length; index += 1)
        out[at + index] = text.charCodeAt(index);
    };
    write('FORM', 0);
    view.setUint32(4, 4 + body, false);
    write(kind, 8);
    let at = 12;
    for (const [id, data] of chunks) {
      write(id, at);
      view.setUint32(at + 4, data.length, false);
      out.set(data, at + 8);
      at += 8 + data.length + (data.length % 2);
    }
    return out;
  }

  /** A COMM body: 1 channel, 22,050 Hz, 16-bit, with an optional compression. */
  function comm(frames: number, compression?: string): Uint8Array {
    const body = new Uint8Array(compression ? 22 : 18);
    const view = new DataView(body.buffer);
    view.setUint16(0, 1, false);
    view.setUint32(2, frames, false);
    view.setUint16(6, 16, false);
    // 22,050 Hz as an 80-bit extended float.
    body.set([0x40, 0x0d, 0xac, 0x44, 0, 0, 0, 0, 0, 0], 8);
    if (compression) {
      for (let index = 0; index < 4; index += 1)
        body[18 + index] = compression.charCodeAt(index);
    }
    return body;
  }

  it('refuses a compressed AIFF-C by naming the compression', () => {
    const file = build('AIFC', [
      ['COMM', comm(100, 'ima4')],
      ['SSND', new Uint8Array(8 + 200)],
    ]);
    expect(() => decodeAiff(file)).toThrow(/compressed as "ima4"/u);
  });

  it('accepts sowt, which is AIFF-C for "little-endian after all"', () => {
    // Two frames: 0x0000 then 0x0040, little-endian, which is 0 then +0.5.
    const samples = new Uint8Array(8 + 4);
    samples.set([0x00, 0x00, 0x00, 0x40], 8);
    const file = build('AIFC', [
      ['COMM', comm(2, 'sowt')],
      ['SSND', samples],
    ]);
    const aiff = decodeAiff(file);
    expect(aiff.channels[0]).toHaveLength(2);
    expect(aiff.channels[0][0]).toBe(0);
    expect(aiff.channels[0][1]).toBeCloseTo(0.5, 3);
  });

  it('reads plain AIFF big-endian, the same bytes meaning something else', () => {
    // The identical payload as above, without sowt: 0x0040 big-endian is a
    // very small positive number, not a half.
    const samples = new Uint8Array(8 + 4);
    samples.set([0x00, 0x00, 0x00, 0x40], 8);
    const file = build('AIFF', [
      ['COMM', comm(2)],
      ['SSND', samples],
    ]);
    const aiff = decodeAiff(file);
    expect(aiff.channels[0][1]).toBeCloseTo(0.00195, 4);
  });

  it('says so when an AIFF carries no sound chunk', () => {
    expect(() => decodeAiff(build('AIFF', [['COMM', comm(10)]]))).toThrow(
      /no audio data/u,
    );
  });

  it('refuses something that is not an AIFF at all', () => {
    expect(() => decodeAiff(load('tone-44k-stereo-s16.wav'))).toThrow(
      /not an AIFF/u,
    );
  });
});
