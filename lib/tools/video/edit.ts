/**
 * Trimming, muting and extracting audio — all without a codec.
 *
 * Pure functions over an `Mp4File` from `mp4.ts` and the source bytes. Nothing
 * here decodes a frame: the compressed samples are selected and copied, so the
 * output holds the same bytes the input did. See `docs/VIDEO_SPIKE.md` for the
 * ffmpeg verification.
 *
 * **The one thing a caller must surface to the reader.** A cut can only begin at
 * a keyframe. Ask to start at 7.3 seconds and the real start is the last keyframe
 * at or before it — often a second or two earlier. Starting anywhere else would
 * mean the opening frames reference pixels that were never decoded, which is the
 * smeared mess everyone has seen in a badly cut clip.
 *
 * So every result reports `actualStartSeconds` alongside `requestedStartSeconds`,
 * and the page says when they differ. The alternative — re-encoding the opening
 * few frames so the cut lands exactly — needs an encoder, which is the entire
 * thing this approach avoids.
 */

import {
  keyframeAtOrBefore,
  type Mp4File,
  type Mp4Sample,
  type Mp4Track,
} from './mp4';
import { writeMp4, type TrackPlan } from './writer';

export interface EditOptions {
  startSeconds: number;
  /** `null` means "to the end of the file". */
  endSeconds: number | null;
  keepVideo: boolean;
  keepAudio: boolean;
}

export interface EditResult {
  bytes: Uint8Array;
  requestedStartSeconds: number;
  /** Where the cut actually begins, after moving back to a keyframe. */
  actualStartSeconds: number;
  endSeconds: number;
  videoFrames: number;
  audioFrames: number;
  /** How far the cut moved. Zero when the request already landed on a keyframe. */
  movedBackBySeconds: number;
}

function secondsOf(sample: Mp4Sample, track: Mp4Track): number {
  return sample.timestamp / track.timescale;
}

function samplesInRange(
  track: Mp4Track,
  startSeconds: number,
  endSeconds: number | null,
): Mp4Sample[] {
  return track.samples.filter((sample) => {
    const at = secondsOf(sample, track);
    if (at < startSeconds) return false;
    // A sample starting exactly at the end time belongs to the next clip.
    return endSeconds === null || at < endSeconds;
  });
}

/**
 * Builds a new file from the chosen range and tracks.
 *
 * Dropping a track is how mute and audio-extraction work: there is no separate
 * operation for either, only a choice about which tracks to carry over.
 */
export function editVideo(
  source: Uint8Array,
  movie: Mp4File,
  options: EditOptions,
): EditResult {
  const video = movie.tracks.find((track) => track.kind === 'video') ?? null;
  const audio = movie.tracks.find((track) => track.kind === 'audio') ?? null;

  if (!options.keepVideo && !options.keepAudio) {
    throw new Error('Keep at least one of the picture or the sound.');
  }
  if (options.keepVideo && !video) {
    throw new Error('This file has no video track.');
  }
  if (options.keepAudio && !audio) {
    throw new Error(
      'This file has no audio track, so there is no sound to keep.',
    );
  }
  if (options.startSeconds < 0) {
    throw new Error('The start time cannot be negative.');
  }
  if (
    options.endSeconds !== null &&
    options.endSeconds <= options.startSeconds
  ) {
    throw new Error('The end of the clip must come after its start.');
  }

  // The cut point is decided by the video track, because it is the one with
  // keyframes. Audio follows it so the two stay in step.
  let actualStartSeconds = options.startSeconds;
  if (options.keepVideo && video && options.startSeconds > 0) {
    const keyframe = keyframeAtOrBefore(video, options.startSeconds);
    if (keyframe) actualStartSeconds = secondsOf(keyframe, video);
  }

  const plans: TrackPlan[] = [];
  let videoFrames = 0;
  let audioFrames = 0;

  if (options.keepVideo && video) {
    const samples = samplesInRange(
      video,
      actualStartSeconds,
      options.endSeconds,
    );
    videoFrames = samples.length;
    plans.push({
      track: video,
      samples,
      sampleDescription: video.sampleDescription,
    });
  }
  if (options.keepAudio && audio) {
    const samples = samplesInRange(
      audio,
      actualStartSeconds,
      options.endSeconds,
    );
    audioFrames = samples.length;
    plans.push({
      track: audio,
      samples,
      sampleDescription: audio.sampleDescription,
    });
  }

  const bytes = writeMp4(source, plans, movie);
  const longest = Math.max(
    ...plans.map(
      (plan) =>
        plan.samples.reduce((sum, sample) => sum + sample.duration, 0) /
        plan.track.timescale,
    ),
  );

  return {
    bytes,
    requestedStartSeconds: options.startSeconds,
    actualStartSeconds,
    endSeconds: actualStartSeconds + longest,
    videoFrames,
    audioFrames,
    movedBackBySeconds: options.startSeconds - actualStartSeconds,
  };
}

/** Every keyframe's position in seconds — the only places a cut can begin. */
export function keyframeSeconds(track: Mp4Track): number[] {
  return track.samples
    .filter((sample) => sample.isKeyframe)
    .map((sample) => secondsOf(sample, track));
}
