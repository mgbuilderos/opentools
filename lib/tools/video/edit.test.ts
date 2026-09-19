import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { editVideo, keyframeSeconds } from './edit';
import { readMp4 } from './mp4';

/**
 * The fixture is 2 seconds of H.264 at 15 fps — 30 frames — with `-g 15`, so
 * keyframes at frame 1 (0.0s) and frame 16 (1.0s). Audio is mono AAC at
 * 44,100 Hz in 1,024-sample frames, which is 88 frames over two seconds.
 *
 * Every expectation below is arithmetic on those facts.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

function open(name = 'tone-video.mp4') {
  const bytes = load(name);
  return { bytes, movie: readMp4(bytes) };
}

const everything = {
  startSeconds: 0,
  endSeconds: null,
  keepVideo: true,
  keepAudio: true,
};

describe('trimming', () => {
  it('halves a two-second clip cut at one second', () => {
    const { bytes, movie } = open();
    const result = editVideo(bytes, movie, { ...everything, startSeconds: 1 });
    expect(result.videoFrames).toBe(15);
    expect(result.audioFrames).toBe(44);
    expect(result.actualStartSeconds).toBeCloseTo(1, 2);
    expect(result.movedBackBySeconds).toBeCloseTo(0, 2);
  });

  it('moves a cut back to the keyframe before it, and says how far', () => {
    // 1.5s sits between keyframes, so the cut lands on the one at 1.0s. The
    // page must tell the reader this happened — half a second of video they did
    // not ask for is a surprise, not a bug, and it should not be a silent one.
    const { bytes, movie } = open();
    const result = editVideo(bytes, movie, {
      ...everything,
      startSeconds: 1.5,
    });
    expect(result.actualStartSeconds).toBeCloseTo(1, 2);
    expect(result.requestedStartSeconds).toBe(1.5);
    expect(result.movedBackBySeconds).toBeCloseTo(0.5, 2);
    expect(result.videoFrames).toBe(15);
  });

  it('does not move a cut that already lands on a keyframe', () => {
    const { bytes, movie } = open();
    for (const start of [0, 1]) {
      expect(
        editVideo(bytes, movie, { ...everything, startSeconds: start })
          .movedBackBySeconds,
      ).toBeCloseTo(0, 3);
    }
  });

  it('keeps only the range asked for when an end is given', () => {
    const { bytes, movie } = open();
    const result = editVideo(bytes, movie, {
      ...everything,
      startSeconds: 0,
      endSeconds: 1,
    });
    // The first second at 15 fps is 15 frames.
    expect(result.videoFrames).toBe(15);
    expect(result.audioFrames).toBe(44);
  });

  it('produces a file that reads back with the frames it reported', () => {
    const { bytes, movie } = open();
    const result = editVideo(bytes, movie, { ...everything, startSeconds: 1 });
    const back = readMp4(result.bytes);
    expect(
      back.tracks.find((track) => track.kind === 'video')!.samples,
    ).toHaveLength(result.videoFrames);
    expect(
      back.tracks.find((track) => track.kind === 'audio')!.samples,
    ).toHaveLength(result.audioFrames);
    expect(
      back.tracks.find((track) => track.kind === 'video')!.samples[0]
        .isKeyframe,
    ).toBe(true);
  });

  it('copies the frame bytes rather than re-encoding them', () => {
    const { bytes, movie } = open();
    const video = movie.tracks.find((track) => track.kind === 'video')!;
    const result = editVideo(bytes, movie, { ...everything, startSeconds: 1 });
    const back = readMp4(result.bytes);
    const firstKept = video.samples.find(
      (sample) => sample.timestamp / video.timescale >= 1 && sample.isKeyframe,
    )!;
    const written = back.tracks.find((track) => track.kind === 'video')!
      .samples[0];

    expect(written.size).toBe(firstKept.size);
    expect(
      result.bytes.subarray(written.offset, written.offset + written.size),
    ).toEqual(
      bytes.subarray(firstKept.offset, firstKept.offset + firstKept.size),
    );
  });
});

describe('muting and extracting the sound', () => {
  it('mutes by carrying only the picture over', () => {
    const { bytes, movie } = open();
    const result = editVideo(bytes, movie, { ...everything, keepAudio: false });
    expect(result.audioFrames).toBe(0);
    const back = readMp4(result.bytes);
    expect(back.tracks).toHaveLength(1);
    expect(back.tracks[0].kind).toBe('video');
  });

  it('extracts the sound by carrying only the audio over', () => {
    const { bytes, movie } = open();
    const result = editVideo(bytes, movie, { ...everything, keepVideo: false });
    expect(result.videoFrames).toBe(0);
    expect(result.audioFrames).toBe(88);
    const back = readMp4(result.bytes);
    expect(back.tracks).toHaveLength(1);
    expect(back.tracks[0].kind).toBe('audio');
  });

  it('can mute and trim in one pass', () => {
    const { bytes, movie } = open();
    const result = editVideo(bytes, movie, {
      startSeconds: 1,
      endSeconds: null,
      keepVideo: true,
      keepAudio: false,
    });
    expect(result.videoFrames).toBe(15);
    expect(result.audioFrames).toBe(0);
  });

  it('trims audio alone without a keyframe search, since every frame is one', () => {
    const { bytes, movie } = open();
    const result = editVideo(bytes, movie, {
      startSeconds: 1.5,
      endSeconds: null,
      keepVideo: false,
      keepAudio: true,
    });
    // No video track means nothing to snap to, so the cut is exact.
    expect(result.movedBackBySeconds).toBeCloseTo(0, 3);
    expect(result.actualStartSeconds).toBe(1.5);
    expect(result.audioFrames).toBeGreaterThan(0);
    expect(result.audioFrames).toBeLessThan(44);
  });
});

describe('what it refuses, and how clearly', () => {
  it('refuses to drop both tracks', () => {
    const { bytes, movie } = open();
    expect(() =>
      editVideo(bytes, movie, {
        ...everything,
        keepVideo: false,
        keepAudio: false,
      }),
    ).toThrow(/at least one/u);
  });

  it('refuses a backwards or empty range', () => {
    const { bytes, movie } = open();
    expect(() =>
      editVideo(bytes, movie, {
        ...everything,
        startSeconds: 1,
        endSeconds: 0.5,
      }),
    ).toThrow(/after its start/u);
    expect(() =>
      editVideo(bytes, movie, {
        ...everything,
        startSeconds: 1,
        endSeconds: 1,
      }),
    ).toThrow(/after its start/u);
  });

  it('refuses a negative start', () => {
    const { bytes, movie } = open();
    expect(() =>
      editVideo(bytes, movie, { ...everything, startSeconds: -1 }),
    ).toThrow(/cannot be negative/u);
  });

  it('says so when asked to keep sound a file does not have', () => {
    const { bytes, movie } = open();
    const muted = editVideo(bytes, movie, { ...everything, keepAudio: false });
    const silent = readMp4(muted.bytes);
    expect(() =>
      editVideo(muted.bytes, silent, { ...everything, keepAudio: true }),
    ).toThrow(/no audio track/u);
  });

  it('names WebM rather than calling it an invalid MP4', () => {
    const webm = new Uint8Array(64);
    webm.set([0x1a, 0x45, 0xdf, 0xa3], 0);
    expect(() => readMp4(webm)).toThrow(/WebM or Matroska/u);
  });
});

describe('telling the reader where they may cut', () => {
  it('lists the keyframe positions', () => {
    const { movie } = open();
    const video = movie.tracks.find((track) => track.kind === 'video')!;
    const positions = keyframeSeconds(video);
    // `-g 15` over 30 frames at 15 fps: 0.0s and 1.0s.
    expect(positions).toHaveLength(2);
    expect(positions[0]).toBeCloseTo(0, 3);
    expect(positions[1]).toBeCloseTo(1, 2);
  });

  it('lists every audio frame, because any of them is a valid cut', () => {
    const { movie } = open();
    const audio = movie.tracks.find((track) => track.kind === 'audio')!;
    expect(keyframeSeconds(audio)).toHaveLength(88);
  });
});
