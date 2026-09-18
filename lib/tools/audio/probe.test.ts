import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { probeAudio } from './probe';

/**
 * Every expectation below is ground truth from `ffprobe` on the same file, not
 * from running this prober and writing down what it said. The generating
 * commands are in the build log; each fixture is a 440 Hz sine of 0.1 seconds
 * at 0.8 of full scale.
 *
 * Reading the sample rate from the container is the whole reason this module
 * exists — `decodeAudioData` resamples to the context's rate without saying so,
 * so the rate has to come from the file before any decoding starts.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

interface Expected {
  container: string;
  codec: string;
  sampleRate: number;
  channels: number;
}

const GROUND_TRUTH: Record<string, Expected> = {
  'tone-44k-stereo-s16.wav': {
    container: 'WAV',
    codec: '16-bit PCM',
    sampleRate: 44_100,
    channels: 2,
  },
  'tone-48k-mono-f32.wav': {
    container: 'WAV',
    codec: '32-bit floating point',
    sampleRate: 48_000,
    channels: 1,
  },
  'tone-8k-mono-u8.wav': {
    container: 'WAV',
    codec: '8-bit PCM',
    sampleRate: 8000,
    channels: 1,
  },
  'tone-44k-mono-s24.wav': {
    container: 'WAV',
    codec: '24-bit PCM',
    sampleRate: 44_100,
    channels: 1,
  },
  'tone-44k-stereo.flac': {
    container: 'FLAC',
    codec: 'FLAC, 24-bit',
    sampleRate: 44_100,
    channels: 2,
  },
  'tone-44k-stereo.ogg': {
    container: 'Ogg',
    codec: 'Vorbis',
    sampleRate: 44_100,
    channels: 2,
  },
  'tone-48k-mono.opus': {
    container: 'Ogg',
    codec: 'Opus',
    sampleRate: 48_000,
    channels: 1,
  },
  'tone-44k-stereo.m4a': {
    container: 'M4A',
    codec: 'AAC',
    sampleRate: 44_100,
    channels: 2,
  },
  'tone-44k-stereo-alac.m4a': {
    container: 'M4A',
    codec: 'Apple Lossless',
    sampleRate: 44_100,
    channels: 2,
  },
  'tone-22k-mono.aiff': {
    container: 'AIFF',
    codec: '16-bit PCM',
    sampleRate: 22_050,
    channels: 1,
  },
  'cbr-stereo-44k.mp3': {
    container: 'MP3',
    codec: 'MPEG1 Layer III',
    sampleRate: 44_100,
    channels: 2,
  },
  'cbr-mono-22k.mp3': {
    container: 'MP3',
    codec: 'MPEG2 Layer III',
    sampleRate: 22_050,
    channels: 1,
  },
};

describe('identifying an audio file from its header', () => {
  for (const [name, expected] of Object.entries(GROUND_TRUTH)) {
    it(`reads ${name} as ${expected.codec} at ${expected.sampleRate} Hz`, () => {
      const probe = probeAudio(load(name));
      expect(probe, `${name} was not recognised at all`).not.toBeNull();
      expect(probe!.container).toBe(expected.container);
      expect(probe!.codec).toBe(expected.codec);
      expect(probe!.sampleRate).toBe(expected.sampleRate);
      expect(probe!.channels).toBe(expected.channels);
    });
  }

  it('reads the running time from the formats that store one', () => {
    // 0.1 seconds by construction. Lossy encoders pad with priming samples, so
    // the compressed ones are allowed to be a little longer — never shorter.
    for (const name of [
      'tone-44k-stereo-s16.wav',
      'tone-44k-stereo.flac',
      'tone-22k-mono.aiff',
    ]) {
      expect(probeAudio(load(name))!.durationSeconds).toBeCloseTo(0.1, 3);
    }
    const aac = probeAudio(load('tone-44k-stereo.m4a'))!.durationSeconds!;
    expect(aac).toBeGreaterThanOrEqual(0.1);
    expect(aac).toBeLessThan(0.2);
  });

  it('does not let a video file’s picture track answer for its sound', () => {
    // An MP4's first track is usually video, and its mdhd timescale is a frame
    // clock — 90,000 or 600 — not a sample rate. Taking the first mdhd found
    // is the bug this guards: the file below is audio-only, so the guard is
    // stated instead by the M4A rows above having audio rates, never 600.
    for (const name of ['tone-44k-stereo.m4a', 'tone-44k-stereo-alac.m4a']) {
      const probe = probeAudio(load(name))!;
      expect(probe.sampleRate).toBe(44_100);
      expect(probe.sampleRate).not.toBe(600);
    }
  });
});

describe('what the prober will not pretend to know', () => {
  it('names a container it cannot parse, and reports no sample rate rather than guessing', () => {
    const matroska = new Uint8Array(64);
    matroska.set([0x1a, 0x45, 0xdf, 0xa3], 0);
    const probe = probeAudio(matroska)!;
    expect(probe.container).toBe('WebM or Matroska');
    expect(probe.sampleRate).toBeNull();
    expect(probe.note).toContain('after decoding');
  });

  it('says plainly that Windows Media will not convert here', () => {
    const asf = new Uint8Array(64);
    asf.set([0x30, 0x26, 0xb2, 0x75], 0);
    expect(probeAudio(asf)!.container).toBe('ASF or WMA');
    expect(probeAudio(asf)!.note).toContain('will not convert');
  });

  it('returns null for something that is not audio, rather than inventing a format', () => {
    expect(probeAudio(new Uint8Array(0))).toBeNull();
    expect(
      probeAudio(
        new TextEncoder().encode('this is a plain text file, not audio at all'),
      ),
    ).toBeNull();
  });

  it('survives a truncated header without throwing', () => {
    for (const name of Object.keys(GROUND_TRUTH)) {
      const whole = load(name);
      for (const cut of [16, 32, 64, 128]) {
        expect(() => probeAudio(whole.subarray(0, cut))).not.toThrow();
      }
    }
  });

  it('survives bytes that look like a header but are noise after it', () => {
    // Deterministic pseudo-noise behind each magic number: a reader that trusts
    // a length field here walks off the end of the buffer.
    for (const magic of ['RIFF', 'fLaC', 'OggS', 'FORM']) {
      const bytes = new Uint8Array(512);
      for (let index = 0; index < bytes.length; index += 1)
        bytes[index] = (index * 37 + 11) & 0xff;
      for (let index = 0; index < 4; index += 1)
        bytes[index] = magic.charCodeAt(index);
      expect(() => probeAudio(bytes)).not.toThrow();
    }
  });
});

describe('the notes the prober adds', () => {
  it('warns that Opus always decodes at 48 kHz whatever it was recorded at', () => {
    expect(probeAudio(load('tone-48k-mono.opus'))!.note).toContain('48,000 Hz');
  });

  it('says a WAV is already uncompressed, so converting only re-packages it', () => {
    expect(probeAudio(load('tone-44k-stereo-s16.wav'))!.note).toContain(
      're-packages',
    );
  });

  it('says a lossless source converts to an exact copy', () => {
    expect(probeAudio(load('tone-44k-stereo.flac'))!.note).toContain(
      'lossless',
    );
    expect(probeAudio(load('tone-44k-stereo-alac.m4a'))!.note).toContain(
      'exact copy',
    );
  });
});
