import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mergeVideos } from './merge';
import { readMp4 } from './mp4';
import { sourceFromBytes } from './source';

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

function open(name = 'tone-video.mp4') {
  const bytes = load(name);
  const source = sourceFromBytes(bytes);
  return { bytes, source, movie: readMp4(bytes), name };
}

describe('mergeVideos', () => {
  it('merges two compatible videos into a seamless video with double duration', async () => {
    const clip1 = open('tone-video.mp4');
    const clip2 = open('tone-video.mp4');

    const result = await mergeVideos([clip1, clip2]);

    expect(result.clipCount).toBe(2);
    expect(result.durationSeconds).toBeCloseTo(
      clip1.movie.durationSeconds * 2,
      1,
    );
    expect(result.totalVideoFrames).toBe(30 * 2);
    expect(result.totalAudioFrames).toBe(88 * 2);
    expect(result.blob.size).toBeGreaterThan(clip1.bytes.length);

    // Verify output structure with readMp4
    const outBytes = new Uint8Array(await result.blob.arrayBuffer());
    const outMovie = readMp4(outBytes);
    expect(outMovie.tracks.length).toBe(2);
    expect(outMovie.durationSeconds).toBeCloseTo(4.0, 1);
  });

  it('rejects merging when fewer than 2 inputs are provided', async () => {
    const clip1 = open('tone-video.mp4');
    await expect(mergeVideos([clip1])).rejects.toThrow(
      'At least two video files are required to merge.',
    );
  });

  it('rejects merging videos with mismatched codecs or configurations', async () => {
    const clip1 = open('tone-video.mp4');
    const clip2 = open('tone-video.mp4');

    // Tamper with video codec in clip 2
    const tamperedMovie = {
      ...clip2.movie,
      tracks: clip2.movie.tracks.map((t) =>
        t.kind === 'video' ? { ...t, codec: 'hvc1' } : t,
      ),
    };

    await expect(
      mergeVideos([clip1, { ...clip2, movie: tamperedMovie }]),
    ).rejects.toThrow(/Codec mismatch/);
  });

  it('rejects merging videos with mismatched dimensions', async () => {
    const clip1 = open('tone-video.mp4');
    const clip2 = open('tone-video.mp4');

    // Tamper with video dimensions in clip 2
    const tamperedMovie = {
      ...clip2.movie,
      tracks: clip2.movie.tracks.map((t) =>
        t.kind === 'video' ? { ...t, width: 1280, height: 720 } : t,
      ),
    };

    await expect(
      mergeVideos([clip1, { ...clip2, movie: tamperedMovie }]),
    ).rejects.toThrow(/Resolution mismatch/);
  });
});
