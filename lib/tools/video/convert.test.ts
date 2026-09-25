import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkRemuxCompatibility, remuxVideo, remuxVideoSync } from './convert';
import { readMp4 } from './mp4';
import { sourceFromBytes } from './source';

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

describe('video container converter (MOV ↔ MP4 remuxing)', () => {
  it('allows remuxing standard H.264 + AAC MP4 into MOV', () => {
    const bytes = load('tone-video.mp4');
    const movie = readMp4(bytes);
    const check = checkRemuxCompatibility(movie, 'mov');
    expect(check.compatible).toBe(true);

    const movBytes = remuxVideoSync(bytes, movie, 'mov');
    // Verify first box is ftyp with major brand qt
    const brand = String.fromCharCode(...movBytes.subarray(8, 12));
    expect(brand).toBe('qt  ');

    // Reads back cleanly
    const movParsed = readMp4(movBytes);
    expect(movParsed.tracks).toHaveLength(2);
    expect(movParsed.tracks[0].samples.length).toBe(
      movie.tracks[0].samples.length,
    );
    expect(movParsed.tracks[1].samples.length).toBe(
      movie.tracks[1].samples.length,
    );
  });

  it('refuses PCM audio from MOV by name when targeting MP4', () => {
    const pcmMov = load('pcm-audio.mov');
    const movie = readMp4(pcmMov);
    const check = checkRemuxCompatibility(movie, 'mp4');
    expect(check.compatible).toBe(false);
    expect(check.reason).toMatch(/PCM/i);
    expect(() => remuxVideoSync(pcmMov, movie, 'mp4')).toThrow(/PCM/i);
  });

  it('remuxes via streaming ByteSource', async () => {
    const bytes = load('tone-video.mp4');
    const movie = readMp4(bytes);
    const source = sourceFromBytes(bytes);
    const result = await remuxVideo(source, movie, 'mov');

    expect(result.videoFrames).toBe(30);
    expect(result.audioFrames).toBe(88);
    expect(result.blob.type).toBe('video/quicktime');

    const outputBytes = new Uint8Array(await result.blob.arrayBuffer());
    const brand = String.fromCharCode(...outputBytes.subarray(8, 12));
    expect(brand).toBe('qt  ');
  });
});
