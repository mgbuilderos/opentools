import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { keyframeAtOrBefore, readMp4 } from './mp4';

/**
 * Ground truth comes from `ffprobe` on the same file, not from running this
 * reader and writing down what it said.
 *
 * The fixture is 2 seconds of H.264 at 15 fps (so 30 video frames) plus mono
 * AAC at 44,100 Hz (88 frames), written by ffmpeg with a keyframe every 15
 * frames. Every number below is either from `ffprobe` or is arithmetic on those
 * facts.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

describe('reading an MP4 written by ffmpeg', () => {
  it('finds both tracks and names their codecs', () => {
    const mp4 = readMp4(load('tone-video.mp4'));
    expect(mp4.durationSeconds).toBeCloseTo(2, 1);
    expect(mp4.tracks).toHaveLength(2);

    const video = mp4.tracks.find((track) => track.kind === 'video')!;
    const audio = mp4.tracks.find((track) => track.kind === 'audio')!;
    expect(video.codec).toBe('avc1');
    expect(video.width).toBe(160);
    expect(video.height).toBe(120);
    expect(audio.codec).toBe('mp4a');
    expect(audio.channels).toBe(1);
    expect(audio.sampleRate).toBe(44_100);
  });

  it('counts exactly the frames ffprobe counts', () => {
    // This is the whole spike in one assertion. The frames are in one
    // undelimited blob; getting 30 and 88 out means the five sample tables were
    // combined correctly.
    const mp4 = readMp4(load('tone-video.mp4'));
    expect(
      mp4.tracks.find((track) => track.kind === 'video')!.samples,
    ).toHaveLength(30);
    expect(
      mp4.tracks.find((track) => track.kind === 'audio')!.samples,
    ).toHaveLength(88);
  });

  it('locates every sample inside the file and never off the end', () => {
    const bytes = load('tone-video.mp4');
    const mp4 = readMp4(bytes);
    for (const track of mp4.tracks) {
      for (const sample of track.samples) {
        expect(sample.size).toBeGreaterThan(0);
        expect(sample.offset).toBeGreaterThan(0);
        expect(sample.offset + sample.size).toBeLessThanOrEqual(bytes.length);
      }
    }
  });

  it('lays samples out without gaps or overlaps inside a chunk', () => {
    // A wrong `stsc` walk shows up here: samples either overlap or leave holes.
    const mp4 = readMp4(load('tone-video.mp4'));
    const video = mp4.tracks.find((track) => track.kind === 'video')!;
    const sorted = [...video.samples].sort((a, b) => a.offset - b.offset);
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index].offset).toBeGreaterThanOrEqual(
        sorted[index - 1].offset + sorted[index - 1].size,
      );
    }
  });

  it('reads H.264 frame data, not whatever happened to be at that offset', () => {
    // Every H.264 sample here is length-prefixed NAL units: a 4-byte big-endian
    // length followed by that many bytes, repeated to fill the sample exactly.
    // Landing on the wrong offset gives lengths that do not add up.
    const bytes = load('tone-video.mp4');
    const mp4 = readMp4(bytes);
    const video = mp4.tracks.find((track) => track.kind === 'video')!;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    for (const sample of video.samples.slice(0, 10)) {
      let at = sample.offset;
      const stop = sample.offset + sample.size;
      while (at + 4 <= stop) {
        const nalLength = view.getUint32(at, false);
        expect(nalLength).toBeGreaterThan(0);
        at += 4 + nalLength;
      }
      expect(at, 'NAL units did not tile the sample exactly').toBe(stop);
    }
  });

  it('marks the keyframes ffmpeg was told to write', () => {
    // `-g 15` over 30 frames: frames 1 and 16, so two keyframes.
    const mp4 = readMp4(load('tone-video.mp4'));
    const video = mp4.tracks.find((track) => track.kind === 'video')!;
    const keyframes = video.samples.filter((sample) => sample.isKeyframe);
    expect(keyframes).toHaveLength(2);
    expect(keyframes[0]).toBe(video.samples[0]);
  });

  it('treats every audio sample as a keyframe, because AAC frames are independent', () => {
    const mp4 = readMp4(load('tone-video.mp4'));
    const audio = mp4.tracks.find((track) => track.kind === 'audio')!;
    expect(audio.samples.every((sample) => sample.isKeyframe)).toBe(true);
  });

  it('adds the sample durations up to the running time', () => {
    const mp4 = readMp4(load('tone-video.mp4'));
    for (const track of mp4.tracks) {
      const total = track.samples.reduce(
        (sum, sample) => sum + sample.duration,
        0,
      );
      expect(total / track.timescale).toBeCloseTo(2, 1);
    }
  });

  it('moves a cut back to the last keyframe rather than cutting mid-frame', () => {
    const mp4 = readMp4(load('tone-video.mp4'));
    const video = mp4.tracks.find((track) => track.kind === 'video')!;

    // 1.5s is past the second keyframe (frame 16, at 1.0s), so the cut lands there.
    const chosen = keyframeAtOrBefore(video, 1.5)!;
    expect(chosen.isKeyframe).toBe(true);
    expect(chosen.timestamp / video.timescale).toBeCloseTo(1, 1);

    // Before the first keyframe there is nowhere earlier to go, so it stays.
    expect(keyframeAtOrBefore(video, 0)).toBe(video.samples[0]);
  });

  it('refuses a file that is not an MP4', () => {
    expect(() => readMp4(new Uint8Array(64))).toThrow(/not an MP4 or MOV/u);
    expect(() => readMp4(new Uint8Array(4))).toThrow(/too small/u);
  });

  it('says the index is missing when there is no index', () => {
    // `ftyp` then straight into `mdat`, with no `moov` anywhere: what a file
    // still being written looks like, and what an interrupted upload leaves.
    const bytes = new Uint8Array(64);
    const view = new DataView(bytes.buffer);
    const write = (text: string, at: number) => {
      for (let index = 0; index < 4; index += 1)
        bytes[at + index] = text.charCodeAt(index);
    };
    view.setUint32(0, 16, false);
    write('ftyp', 4);
    write('isom', 8);
    view.setUint32(16, 48, false);
    write('mdat', 20);
    expect(() => readMp4(bytes)).toThrow(/no index/u);
  });

  it('refuses a half-downloaded file instead of reading half an index', () => {
    // This fixture was written with `+faststart`, which moves the index to the
    // front of the file so playback can begin before the download finishes. A
    // truncated copy therefore has the index's outer box but not the tracks
    // inside it — a different failure from having no index at all, and it must
    // still be a refusal rather than a file that reads as empty.
    const truncated = load('tone-video.mp4').slice(0, 200);
    expect(() => readMp4(truncated)).toThrow(/no tracks/u);
  });

  it('detects fragmented MP4 (fMP4) and names it plainly', () => {
    const bytes = new Uint8Array(64);
    const view = new DataView(bytes.buffer);
    const write = (text: string, at: number) => {
      for (let index = 0; index < 4; index += 1)
        bytes[at + index] = text.charCodeAt(index);
    };
    view.setUint32(0, 16, false);
    write('ftyp', 4);
    write('isom', 8);
    view.setUint32(16, 16, false);
    write('moof', 20); // Fragmented movie fragment box
    view.setUint32(32, 32, false);
    write('mdat', 36);
    expect(() => readMp4(bytes)).toThrow(/fragmented MP4/u);
  });

  it('reads identically via ByteSource without full file buffering', async () => {
    const bytes = load('tone-video.mp4');
    const syncResult = readMp4(bytes);
    const { sourceFromBytes } = await import('./source');
    const source = sourceFromBytes(bytes);
    const asyncResult = await readMp4(source);

    expect(asyncResult.timescale).toBe(syncResult.timescale);
    expect(asyncResult.durationSeconds).toBeCloseTo(
      syncResult.durationSeconds,
      4,
    );
    expect(asyncResult.tracks.length).toBe(syncResult.tracks.length);
    for (let i = 0; i < syncResult.tracks.length; i++) {
      expect(asyncResult.tracks[i].kind).toBe(syncResult.tracks[i].kind);
      expect(asyncResult.tracks[i].codec).toBe(syncResult.tracks[i].codec);
      expect(asyncResult.tracks[i].samples.length).toBe(
        syncResult.tracks[i].samples.length,
      );
      expect(asyncResult.tracks[i].samples[0].offset).toBe(
        syncResult.tracks[i].samples[0].offset,
      );
    }
  });
});
describe('a QuickTime .mov, which is what an iPhone records', () => {
  /**
   * Same box structure as MP4, and it covers a branch the MP4 fixture cannot:
   * `stsz` can declare **one size for every sample** instead of listing them,
   * and then no table follows it. Uncompressed audio does exactly that.
   *
   * Mutation testing found this gap. Removing the uniform-size branch entirely
   * left all twelve MP4 tests passing, because H.264 and AAC both have
   * variable-size frames and never reach it.
   */
  it('reads uncompressed audio stored as one repeated sample size', () => {
    // ffprobe: pcm_s16be, 8,000 Hz, mono, 2,400 frames. 16-bit mono is 2 bytes
    // a frame, which is the size `stsz` declares once.
    const mp4 = readMp4(load('pcm-audio.mov'));
    const audio = mp4.tracks.find((track) => track.kind === 'audio')!;
    expect(audio.samples).toHaveLength(2400);
    expect(audio.samples.every((sample) => sample.size === 2)).toBe(true);
    expect(audio.sampleRate).toBe(8000);
    expect(audio.channels).toBe(1);
  });

  it('still lays those samples out contiguously', () => {
    const bytes = load('pcm-audio.mov');
    const mp4 = readMp4(bytes);
    const audio = mp4.tracks.find((track) => track.kind === 'audio')!;
    const sorted = [...audio.samples].sort((a, b) => a.offset - b.offset);
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index].offset).toBe(sorted[index - 1].offset + 2);
    }
    expect(sorted[sorted.length - 1].offset + 2).toBeLessThanOrEqual(
      bytes.length,
    );
  });

  it('reads the video track beside it', () => {
    const mp4 = readMp4(load('pcm-audio.mov'));
    const video = mp4.tracks.find((track) => track.kind === 'video')!;
    expect(video.codec).toBe('avc1');
    expect(video.width).toBe(128);
    expect(video.height).toBe(96);
    expect(video.samples).toHaveLength(3);
  });
});
