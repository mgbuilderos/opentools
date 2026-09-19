import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  keyframeAtOrBefore,
  readMp4,
  type Mp4Sample,
  type Mp4Track,
} from './mp4';
import { writeMp4, type TrackPlan } from './writer';

/**
 * These tests read back what the writer produced, which proves the writer and
 * the reader agree — not that either is right.
 *
 * **What proves it is right is ffmpeg**, and that was done by hand because
 * ffmpeg is not a dependency of this project. On 2026-09-19, against the
 * `tone-video.mp4` fixture, every file below was written to disk and run through
 * `ffmpeg -v error -i FILE -f null -`, which decodes every frame and prints
 * nothing when it is happy:
 *
 * | file          | ffprobe                  | full decode    |
 * |---------------|--------------------------|----------------|
 * | copy          | h264 30 frames, aac 88   | clean          |
 * | mute          | h264 30 frames           | clean          |
 * | audio only    | aac 88 frames            | clean          |
 * | trim from 1s  | h264 15 frames, aac 44   | clean          |
 *
 * And the strongest single check: the trimmed file's **first frame decoded to
 * bytes identical** to the original decoded at 1.0s — same length, same CRC32.
 * The frames are being copied, not re-encoded.
 *
 * **The bug this caught.** The first version omitted `ctts`, and ffmpeg rejected
 * all three video files with "non monotonically increasing dts". The fixture has
 * B-frames, so decode order and display order differ; dropping that table makes
 * a player show frames in the wrong order. Audio passed throughout, which is
 * exactly why testing only the easy track would have shipped the bug.
 *
 * **That run is now frozen as golden files** — `golden-trim-from-1s.mp4` and
 * `golden-audio-only.m4a`, compared byte for byte by `golden.test.ts` on every
 * machine with nothing installed. The earlier instruction here was "re-run the
 * ffmpeg check after any change", which nobody without ffmpeg could follow; the
 * guarantee would have decayed quietly as the tests only ever compared this code
 * against itself.
 *
 * So: change the writer, and `golden.test.ts` fails and shows what moved. If the
 * change is intended, re-earn the files with `node scripts/verify-media.mjs`
 * (which needs ffmpeg and says so plainly when it is absent) and regenerate them
 * deliberately.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

function plan(track: Mp4Track, samples: Mp4Sample[]): TrackPlan {
  return { track, samples, sampleDescription: track.sampleDescription };
}

function source() {
  const bytes = load('tone-video.mp4');
  const mp4 = readMp4(bytes);
  return {
    bytes,
    mp4,
    video: mp4.tracks.find((track) => track.kind === 'video')!,
    audio: mp4.tracks.find((track) => track.kind === 'audio')!,
  };
}

describe('writing an MP4 from copied samples', () => {
  it('rebuilds a file with both tracks intact', () => {
    const { bytes, mp4, video, audio } = source();
    const written = writeMp4(
      bytes,
      [plan(video, video.samples), plan(audio, audio.samples)],
      mp4,
    );
    const back = readMp4(written);

    expect(back.tracks).toHaveLength(2);
    const newVideo = back.tracks.find((track) => track.kind === 'video')!;
    const newAudio = back.tracks.find((track) => track.kind === 'audio')!;
    expect(newVideo.samples).toHaveLength(30);
    expect(newAudio.samples).toHaveLength(88);
    expect(newVideo.codec).toBe('avc1');
    expect(newVideo.width).toBe(160);
    expect(newVideo.height).toBe(120);
    expect(newAudio.sampleRate).toBe(44_100);
  });

  it('copies frame bytes unchanged, which is the entire point', () => {
    const { bytes, mp4, video } = source();
    const written = writeMp4(bytes, [plan(video, video.samples)], mp4);
    const back = readMp4(written);

    for (let index = 0; index < video.samples.length; index += 1) {
      const before = bytes.subarray(
        video.samples[index].offset,
        video.samples[index].offset + video.samples[index].size,
      );
      const after = written.subarray(
        back.tracks[0].samples[index].offset,
        back.tracks[0].samples[index].offset +
          back.tracks[0].samples[index].size,
      );
      expect(after).toEqual(before);
    }
  });

  it('keeps the composition offsets that B-frames depend on', () => {
    // Without this the file plays its frames in the wrong order. The fixture has
    // reordering, so the assertion is meaningful rather than vacuously true.
    const { bytes, mp4, video } = source();
    expect(video.samples.some((sample) => sample.compositionOffset !== 0)).toBe(
      true,
    );

    const back = readMp4(writeMp4(bytes, [plan(video, video.samples)], mp4));
    expect(
      back.tracks[0].samples.map((sample) => sample.compositionOffset),
    ).toEqual(video.samples.map((sample) => sample.compositionOffset));
  });

  it('keeps the keyframe marks, so the result can be trimmed again', () => {
    const { bytes, mp4, video } = source();
    const back = readMp4(writeMp4(bytes, [plan(video, video.samples)], mp4));
    expect(back.tracks[0].samples.map((sample) => sample.isKeyframe)).toEqual(
      video.samples.map((sample) => sample.isKeyframe),
    );
  });

  it('mutes by leaving the audio track out', () => {
    const { bytes, mp4, video } = source();
    const back = readMp4(writeMp4(bytes, [plan(video, video.samples)], mp4));
    expect(back.tracks).toHaveLength(1);
    expect(back.tracks[0].kind).toBe('video');
  });

  it('extracts the audio by leaving the video out', () => {
    const { bytes, mp4, audio } = source();
    const back = readMp4(writeMp4(bytes, [plan(audio, audio.samples)], mp4));
    expect(back.tracks).toHaveLength(1);
    expect(back.tracks[0].kind).toBe('audio');
    expect(back.tracks[0].samples).toHaveLength(88);
  });

  it('trims from a keyframe and halves a two-second clip cut at one second', () => {
    const { bytes, mp4, video, audio } = source();
    const from = keyframeAtOrBefore(video, 1)!;
    const startSeconds = from.timestamp / video.timescale;
    const videoKept = video.samples.filter(
      (sample) => sample.timestamp >= from.timestamp,
    );
    const audioKept = audio.samples.filter(
      (sample) => sample.timestamp / audio.timescale >= startSeconds,
    );

    const back = readMp4(
      writeMp4(bytes, [plan(video, videoKept), plan(audio, audioKept)], mp4),
    );
    // 15 fps for 2s cut at 1s: 15 frames left, and the first is a keyframe.
    expect(
      back.tracks.find((track) => track.kind === 'video')!.samples,
    ).toHaveLength(15);
    expect(
      back.tracks.find((track) => track.kind === 'video')!.samples[0]
        .isKeyframe,
    ).toBe(true);
    // 44,100 Hz AAC in 1,024-sample frames: 44 of the original 88.
    expect(
      back.tracks.find((track) => track.kind === 'audio')!.samples,
    ).toHaveLength(44);
  });

  it('writes the shorter uniform size table when every sample matches', () => {
    // The .mov fixture's PCM audio is 2 bytes a sample throughout, so the
    // writer should use the one-size shortcut rather than list 2,400 identical
    // numbers — a third of the bytes, and the branch would otherwise be untested.
    const bytes = load('pcm-audio.mov');
    const mp4 = readMp4(bytes);
    const audio = mp4.tracks.find((track) => track.kind === 'audio')!;
    const written = writeMp4(bytes, [plan(audio, audio.samples)], mp4);

    const back = readMp4(written);
    expect(back.tracks[0].samples).toHaveLength(2400);
    expect(back.tracks[0].samples.every((sample) => sample.size === 2)).toBe(
      true,
    );
    // 2,400 explicit sizes would add ~9.6 kB. The shortcut keeps it out.
    expect(written.length).toBeLessThan(bytes.length + 2000);
  });

  it('refuses to write a track with nothing in it, naming which', () => {
    const { bytes, mp4, video } = source();
    expect(() => writeMp4(bytes, [plan(video, [])], mp4)).toThrow(
      /video track has no frames/u,
    );
    expect(() => writeMp4(bytes, [], mp4)).toThrow(/no tracks to write/u);
  });

  it('places the frame data where its own index says it is', () => {
    // The index states where frames begin, and the index's size depends on how
    // many frames there are — so it is built twice. If that ever stops being
    // true, every offset in the file is wrong by the difference.
    const { bytes, mp4, video, audio } = source();
    const written = writeMp4(
      bytes,
      [plan(video, video.samples), plan(audio, audio.samples)],
      mp4,
    );
    const back = readMp4(written);
    for (const track of back.tracks) {
      for (const sample of track.samples) {
        expect(sample.offset + sample.size).toBeLessThanOrEqual(written.length);
      }
    }
    // A box is [length:4][type:4][payload], so the first sample sits 8 bytes
    // past the box start and its type is the 4 bytes just before it.
    const first = back.tracks[0].samples[0];
    const type = new TextDecoder().decode(
      written.subarray(first.offset - 4, first.offset),
    );
    expect(type).toBe('mdat');
  });
});
