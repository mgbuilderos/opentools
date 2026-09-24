/**
 * Merging/joining video clips without re-encoding via container surgery.
 *
 * Strict validation: clips must share the exact same codec, sample description (stsd),
 * dimensions, and timescale. Frames are copied byte-for-byte with zero quality loss.
 */

import type { Mp4File, Mp4Sample } from './mp4';
import type { ByteSource } from './source';
import { writeMp4Source, type TrackPlan } from './writer';

export interface MergeInput {
  source: ByteSource;
  movie: Mp4File;
  name?: string;
}

export interface MergeResult {
  blob: Blob;
  size: number;
  durationSeconds: number;
  clipCount: number;
  totalVideoFrames: number;
  totalAudioFrames: number;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Validates and merges two or more MP4 files together into a single container.
 */
export async function mergeVideos(inputs: MergeInput[]): Promise<MergeResult> {
  if (!inputs || inputs.length < 2) {
    throw new Error('At least two video files are required to merge.');
  }

  const first = inputs[0];
  const firstVideo = first.movie.tracks.find((t) => t.kind === 'video');
  const firstAudio = first.movie.tracks.find((t) => t.kind === 'audio');

  if (!firstVideo) {
    throw new Error(
      `First file "${first.name ?? 'Video 1'}" has no video track.`,
    );
  }

  // Validate all subsequent inputs against the first input
  for (let i = 1; i < inputs.length; i++) {
    const item = inputs[i];
    const name = item.name ?? `Video ${i + 1}`;
    const video = item.movie.tracks.find((t) => t.kind === 'video');
    const audio = item.movie.tracks.find((t) => t.kind === 'audio');

    if (!video) {
      throw new Error(`File "${name}" has no video track.`);
    }

    // 1. Codec match
    if (video.codec !== firstVideo.codec) {
      throw new Error(
        `Codec mismatch: "${first.name ?? 'Video 1'}" uses ${firstVideo.codec} but "${name}" uses ${video.codec}. Joining different video codecs without re-encoding is not possible.`,
      );
    }

    // 2. Resolution match
    if (
      video.width !== firstVideo.width ||
      video.height !== firstVideo.height
    ) {
      throw new Error(
        `Resolution mismatch: "${first.name ?? 'Video 1'}" is ${firstVideo.width}x${firstVideo.height} but "${name}" is ${video.width}x${video.height}. Joining videos of different dimensions without re-encoding is not possible.`,
      );
    }

    // 3. Timescale match
    if (video.timescale !== firstVideo.timescale) {
      throw new Error(
        `Timescale mismatch: "${first.name ?? 'Video 1'}" has timescale ${firstVideo.timescale} but "${name}" has timescale ${video.timescale}.`,
      );
    }

    // 4. Sample description (stsd) match - SPS/PPS / avcC / hvcC
    if (!bytesEqual(video.sampleDescription, firstVideo.sampleDescription)) {
      throw new Error(
        `Encoding parameters differ between "${first.name ?? 'Video 1'}" and "${name}" (SPS/PPS profile mismatch). Joining them without re-encoding is not possible.`,
      );
    }

    // 5. Audio track consistency
    if (firstAudio && !audio) {
      throw new Error(
        `"${first.name ?? 'Video 1'}" has an audio track, but "${name}" has no audio. All clips must have matching tracks to merge without re-encoding.`,
      );
    }
    if (!firstAudio && audio) {
      throw new Error(
        `"${first.name ?? 'Video 1'}" has no audio track, but "${name}" has audio. All clips must have matching tracks to merge without re-encoding.`,
      );
    }
    if (firstAudio && audio) {
      if (audio.codec !== firstAudio.codec) {
        throw new Error(
          `Audio codec mismatch: "${firstAudio.codec}" vs "${audio.codec}".`,
        );
      }
      if (audio.timescale !== firstAudio.timescale) {
        throw new Error(
          `Audio timescale mismatch: ${firstAudio.timescale} vs ${audio.timescale}.`,
        );
      }
      if (!bytesEqual(audio.sampleDescription, firstAudio.sampleDescription)) {
        throw new Error(
          `Audio configuration (sample description) differs between "${first.name ?? 'Video 1'}" and "${name}".`,
        );
      }
    }

    // 6. Check that subsequent video tracks start with a keyframe
    if (video.samples.length > 0 && !video.samples[0].isKeyframe) {
      throw new Error(
        `"${name}" does not begin with a keyframe (I-frame). Merging it would cause visual artifacts.`,
      );
    }
  }

  // Concatenate video samples
  const combinedVideoSamples: Mp4Sample[] = [];
  let videoTimestampOffset = 0;

  for (const input of inputs) {
    const video = input.movie.tracks.find((t) => t.kind === 'video')!;
    if (video.samples.length === 0) continue;

    const baseTimestamp = video.samples[0].timestamp;
    for (const sample of video.samples) {
      combinedVideoSamples.push({
        ...sample,
        timestamp: sample.timestamp - baseTimestamp + videoTimestampOffset,
        source: input.source,
      });
    }

    const clipVideoDuration = video.samples.reduce(
      (sum, s) => sum + s.duration,
      0,
    );
    videoTimestampOffset += clipVideoDuration;
  }

  const plans: TrackPlan[] = [
    {
      track: firstVideo,
      samples: combinedVideoSamples,
      sampleDescription: firstVideo.sampleDescription,
    },
  ];

  // Concatenate audio samples if present
  let combinedAudioSamplesCount = 0;
  if (firstAudio) {
    const combinedAudioSamples: Mp4Sample[] = [];
    let audioTimestampOffset = 0;

    for (const input of inputs) {
      const audio = input.movie.tracks.find((t) => t.kind === 'audio');
      if (!audio || audio.samples.length === 0) continue;

      const baseTimestamp = audio.samples[0].timestamp;
      for (const sample of audio.samples) {
        combinedAudioSamples.push({
          ...sample,
          timestamp: sample.timestamp - baseTimestamp + audioTimestampOffset,
          source: input.source,
        });
      }

      const clipAudioDuration = audio.samples.reduce(
        (sum, s) => sum + s.duration,
        0,
      );
      audioTimestampOffset += clipAudioDuration;
    }

    combinedAudioSamplesCount = combinedAudioSamples.length;
    plans.push({
      track: firstAudio,
      samples: combinedAudioSamples,
      sampleDescription: firstAudio.sampleDescription,
    });
  }

  const written = await writeMp4Source(first.source, plans, first.movie);
  const totalDuration =
    combinedVideoSamples.reduce((sum, s) => sum + s.duration, 0) /
    firstVideo.timescale;

  return {
    blob: written.blob,
    size: written.size,
    durationSeconds: totalDuration,
    clipCount: inputs.length,
    totalVideoFrames: combinedVideoSamples.length,
    totalAudioFrames: combinedAudioSamplesCount,
  };
}
