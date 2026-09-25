import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readMp4 } from './mp4';
import { sourceFromBytes } from './source';
import { removeSection, splitIntoClips } from './split';

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

function open(name = 'tone-video.mp4') {
  const bytes = load(name);
  const source = sourceFromBytes(bytes);
  return { bytes, source, movie: readMp4(bytes) };
}

describe('removeSection', () => {
  it('cuts middle section and joins beginning and end', async () => {
    const { source, movie } = open();
    // tone-video has keyframes at 0.0s and 1.0s.
    // If cutStart = 0.5s and cutEnd = 1.0s:
    // part 1: frames before 0.5s (frames 0..7 => ~0.467s)
    // part 2: frames >= 1.0s (frames 15..29 => 15 frames)
    // Resume is exactly at 1.0s (a keyframe).
    const result = await removeSection(source, movie, 0.5, 1.0);

    expect(result.requestedCutStart).toBe(0.5);
    expect(result.requestedCutEnd).toBe(1.0);
    expect(result.actualResumeSeconds).toBeCloseTo(1.0, 2);
    expect(result.movedBackBySeconds).toBeCloseTo(0, 2);
    expect(result.videoFrames).toBeGreaterThan(15);
    expect(result.blob.size).toBeGreaterThan(0);

    // Verify the resulting file can be read and has valid mp4 structure
    const outBytes = new Uint8Array(await result.blob.arrayBuffer());
    const outMovie = readMp4(outBytes);
    expect(outMovie.tracks.length).toBe(2);
    expect(outMovie.durationSeconds).toBeCloseTo(result.durationSeconds, 1);
  });

  it('snaps cutEnd to earlier keyframe when cutEnd is not on a keyframe', async () => {
    const { source, movie } = open();
    // cutEnd at 1.4s -> keyframe is at 1.0s.
    const result = await removeSection(source, movie, 0.4, 1.4);
    expect(result.actualResumeSeconds).toBeCloseTo(1.0, 2);
    expect(result.movedBackBySeconds).toBeCloseTo(0.4, 2);
  });

  it('validates invalid cut parameters', async () => {
    const { source, movie } = open();
    await expect(removeSection(source, movie, -1, 1)).rejects.toThrow(
      'Cut start time cannot be negative.',
    );
    await expect(removeSection(source, movie, 1.5, 1.0)).rejects.toThrow(
      'Cut end time must come after cut start time.',
    );
    await expect(removeSection(source, movie, 0.5, 3.0)).rejects.toThrow(
      'Cut end time extends past the end of the video',
    );
  });
});

describe('splitIntoClips', () => {
  it('splits video at keyframe timestamp into two clips and produces a ZIP', async () => {
    const { source, movie } = open();
    // Split at 1.0s (exact keyframe)
    const result = await splitIntoClips(source, movie, [1.0], 'my-clip');

    expect(result.clips.length).toBe(2);
    expect(result.clips[0].name).toBe('my-clip-part-1.mp4');
    expect(result.clips[1].name).toBe('my-clip-part-2.mp4');
    expect(result.clips[0].videoFrames).toBe(15);
    expect(result.clips[1].videoFrames).toBe(15);
    expect(result.zipBlob).toBeDefined();
    expect(result.totalSize).toBeGreaterThan(0);

    // Verify both clips are readable mp4s
    for (const clip of result.clips) {
      const clipBytes = new Uint8Array(await clip.blob.arrayBuffer());
      const clipMovie = readMp4(clipBytes);
      expect(clipMovie.tracks.length).toBe(2);
    }
  });

  it('ignores duplicate or out-of-range split points', async () => {
    const { source, movie } = open();
    // Out of range (< 0, > duration)
    const result = await splitIntoClips(source, movie, [-0.5, 1.0, 5.0]);
    expect(result.clips.length).toBe(2);
  });
});
