import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { editVideo } from './edit';
import { readMp4 } from './mp4';

/**
 * Golden files: the writer's output, frozen as bytes.
 *
 * **The problem these solve.** The proof that this writer produces valid video
 * is that ffmpeg decodes its output without complaint. ffmpeg is not a
 * dependency of this project and must never become one — the whole unit suite
 * runs on a machine with nothing installed, which was checked by removing it
 * from `PATH` and watching all 1,111 tests still pass.
 *
 * But that left the verification stranded. It happened once, on one machine, and
 * the documentation said "re-run it after any change" — an instruction nobody
 * without ffmpeg can follow. So the guarantee would quietly decay: someone
 * changes the writer, cannot run the check, and the tests stay green because
 * they only ever compared this code against itself.
 *
 * The fix is to commit the exact bytes ffmpeg approved. Now:
 *
 * - the verified result is checkable **anywhere**, with nothing installed;
 * - any change that alters the output fails loudly and shows what moved;
 * - the ffmpeg run becomes optional confirmation rather than the only proof.
 *
 * **Verified with ffmpeg on 2026-09-19**, against these exact files:
 *
 * | File | ffprobe | `ffmpeg -v error -f null -` |
 * |---|---|---|
 * | `golden-trim-from-1s.mp4` | h264 15 frames, aac 44 | clean |
 * | `golden-audio-only.m4a` | aac 88 frames | clean |
 *
 * **If one of these tests fails**, the writer's output changed. That is not
 * automatically wrong — but it is no longer covered by the run above, so the
 * change has to be re-verified (`npm run verify:media`, which needs ffmpeg) and
 * the golden file regenerated deliberately, not just to make the test pass.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

function source() {
  const bytes = load('tone-video.mp4');
  return { bytes, movie: readMp4(bytes) };
}

describe('the writer still produces the bytes ffmpeg approved', () => {
  it('reproduces the trimmed clip exactly', () => {
    const { bytes, movie } = source();
    const result = editVideo(bytes, movie, {
      startSeconds: 1,
      endSeconds: null,
      keepVideo: true,
      keepAudio: true,
    });
    expect(Array.from(result.bytes)).toEqual(
      Array.from(load('golden-trim-from-1s.mp4')),
    );
  });

  it('reproduces the extracted audio exactly', () => {
    const { bytes, movie } = source();
    const result = editVideo(bytes, movie, {
      startSeconds: 0,
      endSeconds: null,
      keepVideo: false,
      keepAudio: true,
    });
    expect(Array.from(result.bytes)).toEqual(
      Array.from(load('golden-audio-only.m4a')),
    );
  });

  it('is deterministic, or a golden file would prove nothing', () => {
    // Timestamps in the header are fixed at zero for exactly this reason: a
    // writer that stamped the current time would produce different bytes every
    // run, and no frozen output could ever be compared against it.
    const { bytes, movie } = source();
    const options = {
      startSeconds: 1,
      endSeconds: null,
      keepVideo: true,
      keepAudio: true,
    };
    const first = editVideo(bytes, movie, options);
    const second = editVideo(bytes, movie, options);
    expect(Array.from(first.bytes)).toEqual(Array.from(second.bytes));
  });

  it('would notice a change in the output, rather than passing regardless', () => {
    // A golden test that cannot fail is decoration. A different range must
    // produce different bytes, or the comparison above is meaningless.
    const { bytes, movie } = source();
    const different = editVideo(bytes, movie, {
      startSeconds: 0,
      endSeconds: null,
      keepVideo: true,
      keepAudio: true,
    });
    expect(Array.from(different.bytes)).not.toEqual(
      Array.from(load('golden-trim-from-1s.mp4')),
    );
  });
});
