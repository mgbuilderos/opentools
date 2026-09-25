/**
 * Container remuxing: MOV to MP4 (and MP4 to MOV) without re-encoding.
 *
 * Rewrites container headers (ftyp, moov) while copying compressed media
 * samples bit-for-bit. Takes seconds even on multi-gigabyte files with zero
 * generation loss.
 */

import { type Mp4File } from './mp4';
import { type ByteSource } from './source';
import { writeMp4, writeMp4Source, type TrackPlan } from './writer';

const COMPATIBLE_VIDEO_CODECS = new Set([
  'avc1', // H.264
  'avc3',
  'hvc1', // HEVC / H.265
  'hev1',
  'dvh1',
]);

const PRORES_CODECS: Record<string, string> = {
  apch: 'ProRes 422 HQ',
  apcn: 'ProRes 422 Standard',
  apcs: 'ProRes 422 LT',
  apco: 'ProRes 422 Proxy',
  ap4h: 'ProRes 4444',
  aprn: 'ProRes 4444 XQ',
};

const PCM_AUDIO_CODECS: Record<string, string> = {
  sowt: '16-bit Little-Endian PCM',
  twos: '16-bit Big-Endian PCM',
  in24: '24-bit PCM',
  in32: '32-bit PCM',
  raw: '8-bit Unsigned PCM',
  lpcm: 'Linear PCM',
};

export interface CompatibilityCheck {
  compatible: boolean;
  reason?: string;
  sourceFormat: 'mp4' | 'mov';
  targetFormat: 'mp4' | 'mov';
}

/**
 * Checks whether an MP4 or MOV file can be remuxed losslessly into the target container.
 */
export function checkRemuxCompatibility(
  movie: Mp4File,
  targetFormat: 'mp4' | 'mov',
): CompatibilityCheck {
  const videoTrack = movie.tracks.find((t) => t.kind === 'video');
  const audioTrack = movie.tracks.find((t) => t.kind === 'audio');

  if (!videoTrack && !audioTrack) {
    return {
      compatible: false,
      reason: 'This file contains no recognizable video or audio tracks.',
      sourceFormat: targetFormat === 'mp4' ? 'mov' : 'mp4',
      targetFormat,
    };
  }

  // Target MP4 has strict codec compatibility rules
  if (targetFormat === 'mp4') {
    if (videoTrack) {
      const vCodec = videoTrack.codec.toLowerCase();
      if (PRORES_CODECS[vCodec]) {
        return {
          compatible: false,
          reason: `This video contains Apple ${PRORES_CODECS[vCodec]} (${vCodec}), which a standard MP4 container cannot carry without re-encoding to H.264 or HEVC.`,
          sourceFormat: 'mov',
          targetFormat: 'mp4',
        };
      }
      if (!COMPATIBLE_VIDEO_CODECS.has(vCodec)) {
        return {
          compatible: false,
          reason: `This video uses the "${videoTrack.codec}" codec, which standard MP4 players cannot read without transcoding.`,
          sourceFormat: 'mov',
          targetFormat: 'mp4',
        };
      }
    }

    if (audioTrack) {
      const aCodec = audioTrack.codec.toLowerCase();
      if (PCM_AUDIO_CODECS[aCodec]) {
        return {
          compatible: false,
          reason: `This video uses ${PCM_AUDIO_CODECS[aCodec]} (${aCodec}) audio. Standard MP4 containers require AAC audio. Professional camera apps that record uncompressed PCM in MOV cannot be remuxed to MP4 without audio transcoding.`,
          sourceFormat: 'mov',
          targetFormat: 'mp4',
        };
      }
      if (aCodec !== 'mp4a' && aCodec !== 'alac') {
        return {
          compatible: false,
          reason: `This file uses "${audioTrack.codec}" audio, which is not supported in standard MP4 without re-encoding.`,
          sourceFormat: 'mov',
          targetFormat: 'mp4',
        };
      }
    }
  }

  return {
    compatible: true,
    sourceFormat: targetFormat === 'mp4' ? 'mov' : 'mp4',
    targetFormat,
  };
}

export interface RemuxResult {
  blob: Blob;
  size: number;
  durationSeconds: number;
  videoFrames: number;
  audioFrames: number;
}

/**
 * Remuxes an MP4/MOV container to the target container (MOV or MP4)
 * using ByteSource streaming. No frames are re-encoded.
 */
export async function remuxVideo(
  source: ByteSource,
  movie: Mp4File,
  targetFormat: 'mp4' | 'mov',
): Promise<RemuxResult> {
  const check = checkRemuxCompatibility(movie, targetFormat);
  if (!check.compatible) {
    throw new Error(check.reason ?? 'This file cannot be remuxed.');
  }

  const plans: TrackPlan[] = movie.tracks.map((track) => ({
    track,
    samples: track.samples,
    sampleDescription: track.sampleDescription,
  }));

  const videoTrack = movie.tracks.find((t) => t.kind === 'video');
  const audioTrack = movie.tracks.find((t) => t.kind === 'audio');

  const written = await writeMp4Source(source, plans, movie, {
    format: targetFormat,
  });

  return {
    blob: written.blob,
    size: written.size,
    durationSeconds: movie.durationSeconds,
    videoFrames: videoTrack ? videoTrack.samples.length : 0,
    audioFrames: audioTrack ? audioTrack.samples.length : 0,
  };
}

/** Synchronous remux for in-memory Uint8Array buffers (tests) */
export function remuxVideoSync(
  bytes: Uint8Array,
  movie: Mp4File,
  targetFormat: 'mp4' | 'mov',
): Uint8Array {
  const check = checkRemuxCompatibility(movie, targetFormat);
  if (!check.compatible) {
    throw new Error(check.reason ?? 'This file cannot be remuxed.');
  }

  const plans: TrackPlan[] = movie.tracks.map((track) => ({
    track,
    samples: track.samples,
    sampleDescription: track.sampleDescription,
  }));

  return writeMp4(bytes, plans, movie, { format: targetFormat });
}

export const convertContainer = remuxVideo;
