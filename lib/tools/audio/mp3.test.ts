import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findId3v2 } from './id3';
import {
  describeMp3,
  formatDurationMs,
  joinMp3,
  type Mp3File,
  parseMp3,
  parseTimecode,
  retagMp3,
  sliceMp3,
  stripTags,
} from './mp3';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(fixtureDir, name)));
}

/**
 * Real files produced by LAME through ffmpeg, kept small on purpose.
 * The expected values below were cross-checked against `ffprobe`, and the frame
 * counts against the frame count LAME itself wrote into the Xing/Info header.
 */
const CBR_MONO = 'cbr-mono-22k.mp3'; // MPEG-2, 22.05 kHz, mono, 32 kbps, no Xing
const CBR_STEREO = 'cbr-stereo-44k.mp3'; // MPEG-1, 44.1 kHz, stereo, 128 kbps, Info
const VBR_STEREO = 'vbr-stereo-44k.mp3'; // MPEG-1, 44.1 kHz, stereo, VBR, Xing + ID3v2

function frameBytes(file: Mp3File, index: number): Uint8Array {
  const frame = file.frames[index];
  return file.bytes.subarray(frame.offset, frame.offset + frame.length);
}

function expectSameBytes(actual: Uint8Array, expected: Uint8Array): void {
  expect(actual.length).toBe(expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new Error(
        `byte ${index} differs: ${actual[index]} vs ${expected[index]}`,
      );
    }
  }
}

describe('parsing real MP3 files', () => {
  it('reads a constant-bitrate mono MPEG-2 file with no Xing header', () => {
    const file = parseMp3(fixture(CBR_MONO));
    expect(file.version).toBe('MPEG2');
    expect(file.layer).toBe(3);
    expect(file.sampleRate).toBe(22_050);
    expect(file.channels).toBe(1);
    expect(file.channelMode).toBe('mono');
    expect(file.header).toBeNull();
    expect(file.variableBitrate).toBe(false);
    expect(file.frames).toHaveLength(41);
    // ffprobe reports 1.071000 s for this file.
    expect(file.durationMs).toBeCloseTo(1071.02, 1);
    expect(file.averageBitrateKbps).toBeCloseTo(32, 1);
    expect(file.id3v2Size).toBe(0);
    expect(file.trailerSize).toBe(0);
    expect(file.skippedBytes).toBe(0);
  });

  it('reads a constant-bitrate stereo file and agrees with its Info header', () => {
    const file = parseMp3(fixture(CBR_STEREO));
    expect(file.version).toBe('MPEG1');
    expect(file.sampleRate).toBe(44_100);
    expect(file.channels).toBe(2);
    expect(file.header?.vbr.kind).toBe('Info');
    expect(file.variableBitrate).toBe(false);
    // LAME wrote 40 into the header; the scanner must find exactly 40.
    expect(file.header?.vbr.frameCount).toBe(40);
    expect(file.frames).toHaveLength(40);
    expect(file.header?.vbr.byteCount).toBe(file.bytes.length);
    expect(file.averageBitrateKbps).toBeCloseTo(128, 1);
    expect(file.skippedBytes).toBe(0);
  });

  it('reads a variable-bitrate file, its Xing header and its Unicode tags', () => {
    const file = parseMp3(fixture(VBR_STEREO));
    expect(file.variableBitrate).toBe(true);
    expect(file.header?.vbr.kind).toBe('Xing');
    expect(file.header?.vbr.frameCount).toBe(59);
    expect(file.frames).toHaveLength(59);
    // LAME's byte count covers the MPEG stream and excludes the ID3v2 tag.
    expect(file.header?.vbr.byteCount).toBe(file.bytes.length - file.id3v2Size);
    expect(file.id3v2Size).toBe(123);
    expect(file.tags.title).toBe('Sine ₹ तरंग');
    expect(file.tags.artist).toBe('OpenTools');
    expect(file.tags.album).toBe('Fixtures');
    expect(file.skippedBytes).toBe(0);
    const bitrates = new Set(file.frames.map((frame) => frame.bitrateKbps));
    expect(bitrates.size).toBeGreaterThan(1);
  });

  it('refuses files that are not MPEG audio, by name', () => {
    const wav = new Uint8Array(64);
    wav.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    wav.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
    expect(() => parseMp3(wav)).toThrow(/not an MP3/);

    expect(() => parseMp3(new Uint8Array(2))).toThrow('too small to be an MP3');

    // An ID3v2 tag that fills the whole file: 10-byte header plus a syncsafe
    // body size of 190 is exactly 200 bytes, so there is no room for audio.
    const tagOnly = new Uint8Array(200);
    tagOnly.set([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 1, 62], 0);
    expect(findId3v2(tagOnly)?.size).toBe(200);
    expect(() => parseMp3(tagOnly)).toThrow('tags but no MPEG audio');
  });

  it('ignores a trailing ID3v1 tag instead of scanning it as audio', () => {
    const source = fixture(CBR_MONO);
    const withTag = new Uint8Array(source.length + 128);
    withTag.set(source, 0);
    withTag.set([0x54, 0x41, 0x47], source.length); // TAG
    const file = parseMp3(withTag);
    expect(file.trailerSize).toBe(128);
    expect(file.frames).toHaveLength(41);
    expect(file.skippedBytes).toBe(0);
  });

  it('skips junk in front of the stream and reports how much', () => {
    const source = fixture(CBR_MONO);
    const junk = new Uint8Array(37).fill(0x2a);
    const withJunk = new Uint8Array(junk.length + source.length);
    withJunk.set(junk, 0);
    withJunk.set(source, junk.length);
    const file = parseMp3(withJunk);
    expect(file.skippedBytes).toBe(37);
    expect(file.frames).toHaveLength(41);
  });
});

describe('cutting without re-encoding', () => {
  it('copies the selected frames through byte for byte', () => {
    const file = parseMp3(fixture(CBR_STEREO));
    const result = sliceMp3(file, 200, 600, { keepTags: false });
    const cut = parseMp3(result.bytes);

    expect(cut.frames.length).toBe(result.frameCount);
    // 200 ms lands inside frame 7 (7 x 26.12 = 182.9), 600 ms rounds up to 23.
    expect(result.startMs).toBeCloseTo(182.86, 1);
    expect(result.endMs).toBeCloseTo(600.82, 1);
    expect(result.startDriftMs).toBeLessThanOrEqual(0);
    expect(result.endDriftMs).toBeGreaterThanOrEqual(0);
    expect(Math.abs(result.startDriftMs)).toBeLessThan(26.13);
    expect(Math.abs(result.endDriftMs)).toBeLessThan(26.13);

    const firstIndex = 7;
    for (let index = 0; index < cut.frames.length; index += 1) {
      expectSameBytes(
        frameBytes(cut, index),
        frameBytes(file, firstIndex + index),
      );
    }
  });

  it('keeps the format and produces a file that parses as an MP3', () => {
    const file = parseMp3(fixture(VBR_STEREO));
    const cut = parseMp3(sliceMp3(file, 300, 900).bytes);
    expect(cut.version).toBe(file.version);
    expect(cut.sampleRate).toBe(file.sampleRate);
    expect(cut.channels).toBe(file.channels);
    expect(cut.channelMode).toBe(file.channelMode);
    expect(cut.skippedBytes).toBe(0);
    expect(cut.durationMs).toBeGreaterThan(590);
    expect(cut.durationMs).toBeLessThan(660);
  });

  it('writes a correct Xing header for a cut out of a variable-bitrate file', () => {
    const file = parseMp3(fixture(VBR_STEREO));
    const result = sliceMp3(file, 200, 800);
    const cut = parseMp3(result.bytes);
    expect(cut.header?.vbr.kind).toBe('Xing');
    expect(cut.header?.vbr.frameCount).toBe(cut.frames.length);
    expect(cut.header?.vbr.byteCount).toBe(cut.bytes.length - cut.id3v2Size);
    expect(cut.variableBitrate).toBe(true);
  });

  it('carries the tags across by default and drops them on request', () => {
    const file = parseMp3(fixture(VBR_STEREO));
    expect(parseMp3(sliceMp3(file, 0, 500).bytes).tags.title).toBe(
      'Sine ₹ तरंग',
    );
    const bare = sliceMp3(file, 0, 500, { keepTags: false }).bytes;
    expect(findId3v2(bare)).toBeNull();
    const renamed = sliceMp3(file, 0, 500, { tags: { title: 'Clip 1' } }).bytes;
    expect(parseMp3(renamed).tags).toEqual({ title: 'Clip 1' });
  });

  it('clamps an end time past the file to the last frame', () => {
    const file = parseMp3(fixture(CBR_MONO));
    const result = sliceMp3(file, 0, 999_999);
    expect(result.frameCount).toBe(41);
    expect(result.endMs).toBeCloseTo(file.durationMs, 6);
  });

  it.each([
    ['a negative start', -1, 100, 'cannot be negative'],
    ['an end at the start', 100, 100, 'later than the start time'],
    ['an end before the start', 500, 100, 'later than the start time'],
    ['a start past the end', 5000, 6000, 'past the end'],
    ['a non-numeric range', Number.NaN, 100, 'start and end time'],
  ])('refuses %s', (_label, start, end, message) => {
    const file = parseMp3(fixture(CBR_MONO));
    expect(() => sliceMp3(file, start, end)).toThrow(message);
  });

  it('returns the one frame that contains a sub-frame range', () => {
    // A request narrower than a frame cannot be honoured exactly, so it is
    // widened to the frame that contains it rather than returning nothing.
    const file = parseMp3(fixture(CBR_MONO));
    const result = sliceMp3(file, 100, 100.5);
    expect(result.frameCount).toBe(1);
    expect(result.startMs).toBeLessThanOrEqual(100);
    expect(result.endMs).toBeGreaterThanOrEqual(100.5);
    expect(result.endMs - result.startMs).toBeCloseTo(26.1224, 3);
  });
});

describe('joining without re-encoding', () => {
  it('concatenates two files and reports the combined length', () => {
    const file = parseMp3(fixture(CBR_STEREO));
    const result = joinMp3([
      { name: 'a.mp3', file },
      { name: 'b.mp3', file },
    ]);
    expect(result.frameCount).toBe(file.frames.length * 2);
    expect(result.durationMs).toBeCloseTo(file.durationMs * 2, 6);

    const joined = parseMp3(result.bytes);
    expect(joined.frames).toHaveLength(file.frames.length * 2);
    expect(joined.skippedBytes).toBe(0);
    expectSameBytes(frameBytes(joined, 0), frameBytes(file, 0));
    expectSameBytes(
      frameBytes(joined, file.frames.length),
      frameBytes(file, 0),
    );
  });

  it('gives a variable-bitrate join a correct Xing header', () => {
    const cbr = parseMp3(fixture(CBR_STEREO));
    const vbr = parseMp3(fixture(VBR_STEREO));
    const result = joinMp3([
      { name: 'cbr.mp3', file: cbr },
      { name: 'vbr.mp3', file: vbr },
    ]);
    const joined = parseMp3(result.bytes);
    expect(joined.header?.vbr.kind).toBe('Xing');
    expect(joined.header?.vbr.frameCount).toBe(result.frameCount);
    expect(joined.variableBitrate).toBe(true);
  });

  it('refuses a sample-rate mismatch and names both files', () => {
    const mono = parseMp3(fixture(CBR_MONO));
    const stereo = parseMp3(fixture(CBR_STEREO));
    expect(() =>
      joinMp3([
        { name: 'first.mp3', file: stereo },
        { name: 'second.mp3', file: mono },
      ]),
    ).toThrow(/second\.mp3 is 22050 Hz but first\.mp3 is 44100 Hz/);
  });

  it('refuses a channel mismatch and names both files', () => {
    const mono = parseMp3(fixture(CBR_MONO));
    // Same sample rate, different channel count, so only the channels differ.
    const fakeStereo: Mp3File = { ...mono, channels: 2, channelMode: 'stereo' };
    expect(() =>
      joinMp3([
        { name: 'left.mp3', file: fakeStereo },
        { name: 'right.mp3', file: mono },
      ]),
    ).toThrow(/right\.mp3 is mono but left\.mp3 is stereo/);
  });

  it('refuses fewer than two files', () => {
    const file = parseMp3(fixture(CBR_MONO));
    expect(() => joinMp3([{ name: 'only.mp3', file }])).toThrow(
      'at least two MP3 files',
    );
  });
});

describe('tags on a whole file', () => {
  it('replaces the tags and leaves every audio frame identical', () => {
    const file = parseMp3(fixture(VBR_STEREO));
    const retagged = parseMp3(retagMp3(file, { title: 'New', artist: 'Me' }));
    expect(retagged.tags).toEqual({ title: 'New', artist: 'Me' });
    expect(retagged.frames).toHaveLength(file.frames.length);
    for (let index = 0; index < file.frames.length; index += 1) {
      expectSameBytes(frameBytes(retagged, index), frameBytes(file, index));
    }
  });

  it('strips every tag, including a trailing ID3v1', () => {
    const source = fixture(VBR_STEREO);
    const withV1 = new Uint8Array(source.length + 128);
    withV1.set(source, 0);
    withV1.set([0x54, 0x41, 0x47], source.length);
    const file = parseMp3(withV1);
    expect(file.trailerSize).toBe(128);

    const stripped = stripTags(file);
    expect(findId3v2(stripped)).toBeNull();
    const reparsed = parseMp3(stripped);
    expect(reparsed.tags).toEqual({});
    expect(reparsed.trailerSize).toBe(0);
    expect(reparsed.frames).toHaveLength(file.frames.length);
  });
});

describe('time formatting and parsing', () => {
  it.each([
    ['83.5', 83_500],
    ['1:23.5', 83_500],
    ['0:00', 0],
    ['1:02:03', 3_723_000],
    ['  12  ', 12_000],
  ])('parses %s', (input, expected) => {
    expect(parseTimecode(input, 'the start time')).toBeCloseTo(expected, 6);
  });

  it.each(['', '  ', 'abc', '1:2:3:4', '1:-2', '.', '1:.'])(
    'refuses %s',
    (input) => {
      expect(() => parseTimecode(input, 'the start time')).toThrow(
        'the start time',
      );
    },
  );

  it('formats durations with and without an hour', () => {
    expect(formatDurationMs(0)).toBe('0:00.00');
    expect(formatDurationMs(9_500)).toBe('0:09.50');
    expect(formatDurationMs(83_500)).toBe('1:23.50');
    expect(formatDurationMs(3_723_000)).toBe('1:02:03.00');
  });
});

describe('the analysis the page shows', () => {
  it('describes a variable-bitrate file without inventing anything', () => {
    const rows = describeMp3(parseMp3(fixture(VBR_STEREO)));
    const value = (label: string) =>
      rows.find((row) => row.label === label)?.value;
    expect(value('Format')).toBe('MPEG1 Layer 3');
    expect(value('Sample rate')).toBe('44,100 Hz');
    expect(value('Channels')).toBe('Stereo');
    expect(value('Audio frames')).toBe('59');
    expect(value('Bitrate')).toMatch(/^Variable, \d+ kbps average$/);
    expect(value('Bitrate header')).toBe('Xing header present');
    expect(value('ID3v2 tag')).toBe('123 bytes at the start');
    expect(value('Trailing tag')).toBe('None');
    expect(value('Frame length')).toMatch(/^26\.12 ms/);
  });

  it('describes a constant-bitrate file and counts skipped bytes', () => {
    const source = fixture(CBR_MONO);
    const junk = new Uint8Array(9).fill(0x2a);
    const withJunk = new Uint8Array(junk.length + source.length);
    withJunk.set(junk, 0);
    withJunk.set(source, junk.length);
    const rows = describeMp3(parseMp3(withJunk));
    const value = (label: string) =>
      rows.find((row) => row.label === label)?.value;
    expect(value('Bitrate')).toBe('Constant, 32 kbps');
    expect(value('Bitrate header')).toBe('None');
    expect(value('Channels')).toBe('Mono');
    expect(value('Bytes outside any frame')).toBe('9 — skipped when copying');
  });
});
