/**
 * Video splitting and middle section removal via container surgery.
 *
 * Cuts without re-encoding by assembling sample slices from keyframe boundaries.
 */

import { createZip } from '../docx/zip';
import {
  keyframeAtOrBefore,
  type Mp4File,
  type Mp4Sample,
  type Mp4Track,
} from './mp4';
import { type ByteSource } from './source';
import { writeMp4Source, type TrackPlan } from './writer';

export interface RemoveSectionResult {
  blob: Blob;
  size: number;
  requestedCutStart: number;
  requestedCutEnd: number;
  actualResumeSeconds: number;
  movedBackBySeconds: number;
  durationSeconds: number;
  videoFrames: number;
  audioFrames: number;
}

export interface ClipResult {
  name: string;
  blob: Blob;
  size: number;
  startSeconds: number;
  actualStartSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  videoFrames: number;
  audioFrames: number;
}

export interface SplitClipsResult {
  clips: ClipResult[];
  zipBlob?: Blob;
  totalSize: number;
}

function secondsOf(sample: Mp4Sample, track: Mp4Track): number {
  return sample.timestamp / track.timescale;
}

function cloneSamplesWithOffset(
  samples: Mp4Sample[],
  timestampDelta: number,
): Mp4Sample[] {
  return samples.map((s) => ({
    ...s,
    timestamp: s.timestamp + timestampDelta,
  }));
}

/**
 * Cuts out a middle section of the video (from cutStart to cutEnd),
 * seamlessly joining [0 .. cutStart] and [actualCutEnd .. end].
 */
export async function removeSection(
  source: ByteSource,
  movie: Mp4File,
  cutStart: number,
  cutEnd: number,
): Promise<RemoveSectionResult> {
  if (cutStart < 0) {
    throw new Error('Cut start time cannot be negative.');
  }
  if (cutEnd <= cutStart) {
    throw new Error('Cut end time must come after cut start time.');
  }
  if (cutEnd >= movie.durationSeconds) {
    throw new Error(
      'Cut end time extends past the end of the video. Use video trim to cut the end.',
    );
  }

  const video = movie.tracks.find((t) => t.kind === 'video');
  const audio = movie.tracks.find((t) => t.kind === 'audio');

  if (!video) {
    throw new Error('This file has no video track.');
  }

  // Find nearest keyframe at or before cutEnd for clean resume
  let actualResumeSeconds = cutEnd;
  const resumeKeyframe = keyframeAtOrBefore(video, cutEnd);
  if (resumeKeyframe) {
    actualResumeSeconds = secondsOf(resumeKeyframe, video);
    // If the keyframe was before or at cutStart, find next keyframe after cutStart
    if (actualResumeSeconds <= cutStart) {
      const laterKeyframes = video.samples.filter(
        (s) => s.isKeyframe && secondsOf(s, video) > cutStart,
      );
      if (laterKeyframes.length > 0) {
        actualResumeSeconds = secondsOf(laterKeyframes[0], video);
      }
    }
  }

  const movedBackBySeconds = Math.max(0, cutEnd - actualResumeSeconds);

  // Build track plans for both tracks
  const plans: TrackPlan[] = [];
  let videoFrames = 0;
  let audioFrames = 0;

  // Video track: part 1 + part 2
  const part1Video = video.samples.filter(
    (s) => secondsOf(s, video) < cutStart,
  );
  const part2Video = video.samples.filter(
    (s) => secondsOf(s, video) >= actualResumeSeconds,
  );

  if (part1Video.length === 0 && part2Video.length === 0) {
    throw new Error('No video frames remaining after removing section.');
  }

  // Calculate timestamp adjustment so part 2 seamlessly follows part 1
  let adjustedPart2Video: Mp4Sample[] = part2Video;
  if (part1Video.length > 0 && part2Video.length > 0) {
    const lastPart1 = part1Video[part1Video.length - 1];
    const firstPart2 = part2Video[0];
    const expectedNextTimestamp = lastPart1.timestamp + lastPart1.duration;
    const delta = expectedNextTimestamp - firstPart2.timestamp;
    adjustedPart2Video = cloneSamplesWithOffset(part2Video, delta);
  }

  const combinedVideo = [...part1Video, ...adjustedPart2Video];
  videoFrames = combinedVideo.length;
  plans.push({
    track: video,
    samples: combinedVideo,
    sampleDescription: video.sampleDescription,
  });

  // Audio track
  if (audio) {
    const part1Audio = audio.samples.filter(
      (s) => secondsOf(s, audio) < cutStart,
    );
    const part2Audio = audio.samples.filter(
      (s) => secondsOf(s, audio) >= actualResumeSeconds,
    );
    let adjustedPart2Audio: Mp4Sample[] = part2Audio;
    if (part1Audio.length > 0 && part2Audio.length > 0) {
      const lastPart1 = part1Audio[part1Audio.length - 1];
      const firstPart2 = part2Audio[0];
      const expectedNext = lastPart1.timestamp + lastPart1.duration;
      const delta = expectedNext - firstPart2.timestamp;
      adjustedPart2Audio = cloneSamplesWithOffset(part2Audio, delta);
    }
    const combinedAudio = [...part1Audio, ...adjustedPart2Audio];
    audioFrames = combinedAudio.length;
    plans.push({
      track: audio,
      samples: combinedAudio,
      sampleDescription: audio.sampleDescription,
    });
  }

  const written = await writeMp4Source(source, plans, movie);
  const durationSeconds =
    combinedVideo.reduce((sum, s) => sum + s.duration, 0) / video.timescale;

  return {
    blob: written.blob,
    size: written.size,
    requestedCutStart: cutStart,
    requestedCutEnd: cutEnd,
    actualResumeSeconds,
    movedBackBySeconds,
    durationSeconds,
    videoFrames,
    audioFrames,
  };
}

/**
 * Splits a video into multiple clips at the specified timestamps.
 */
export async function splitIntoClips(
  source: ByteSource,
  movie: Mp4File,
  splitSeconds: number[],
  baseName = 'clip',
): Promise<SplitClipsResult> {
  const video = movie.tracks.find((t) => t.kind === 'video');
  const audio = movie.tracks.find((t) => t.kind === 'audio');

  if (!video) throw new Error('This file has no video track.');

  // Sort and filter cut points
  const points = [
    0,
    ...splitSeconds.filter((p) => p > 0 && p < movie.durationSeconds),
    movie.durationSeconds,
  ].sort((a, b) => a - b);

  const clips: ClipResult[] = [];
  let totalSize = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const requestedStart = points[i];
    const end = points[i + 1];

    let actualStart = requestedStart;
    if (requestedStart > 0) {
      const kf = keyframeAtOrBefore(video, requestedStart);
      if (kf) actualStart = secondsOf(kf, video);
    }

    const videoSamples = video.samples.filter((s) => {
      const t = secondsOf(s, video);
      return t >= actualStart && t < end;
    });

    if (videoSamples.length === 0) continue;

    const plans: TrackPlan[] = [
      {
        track: video,
        samples: videoSamples,
        sampleDescription: video.sampleDescription,
      },
    ];

    let audioSamplesCount = 0;
    if (audio) {
      const audioSamples = audio.samples.filter((s) => {
        const t = secondsOf(s, audio);
        return t >= actualStart && t < end;
      });
      audioSamplesCount = audioSamples.length;
      if (audioSamples.length > 0) {
        plans.push({
          track: audio,
          samples: audioSamples,
          sampleDescription: audio.sampleDescription,
        });
      }
    }

    const written = await writeMp4Source(source, plans, movie);
    const duration =
      videoSamples.reduce((sum, s) => sum + s.duration, 0) / video.timescale;

    const clipName = `${baseName}-part-${i + 1}.mp4`;
    clips.push({
      name: clipName,
      blob: written.blob,
      size: written.size,
      startSeconds: requestedStart,
      actualStartSeconds: actualStart,
      endSeconds: end,
      durationSeconds: duration,
      videoFrames: videoSamples.length,
      audioFrames: audioSamplesCount,
    });
    totalSize += written.size;
  }

  // Create ZIP archive of all clips
  let zipBlob: Blob | undefined;
  if (clips.length > 1) {
    const zipEntries = await Promise.all(
      clips.map(async (c) => ({
        path: c.name,
        data: new Uint8Array(await c.blob.arrayBuffer()),
      })),
    );
    const zipBytes = await createZip(zipEntries);
    zipBlob = new Blob([zipBytes as BlobPart], { type: 'application/zip' });
  }

  return { clips, zipBlob, totalSize };
}
