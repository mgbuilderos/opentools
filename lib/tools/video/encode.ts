/**
 * Hardware-accelerated video encoding via WebCodecs (VideoEncoder / VideoDecoder).
 *
 * Implements V6 (/video/compress), V7 (/video/resize), and V8 (/video/crop).
 *
 * Architectural principles proven in docs/VIDEO_ENCODE_SPIKE.md:
 * 1. Hardware acceleration: VideoEncoder produces length-prefixed AVC NALUs in milliseconds.
 * 2. Dynamic AVC level selection: matches codec string to target dimensions to avoid NotSupportedError.
 * 3. Audio passthrough: copies the source audio elementary stream untouched without re-encoding or sync drift.
 * 4. Bounded memory: leverages encoder.encodeQueueSize and ondequeue for back-pressure.
 * 5. ISO Base Media Container: builds a valid MP4 with proper ftyp, moov, and mdat atoms.
 * 6. Honesty rules: explicitly discloses re-encoding, refuses HEVC/AV1 by name, zero watermarks.
 */

import { readMp4, type Mp4Sample, type Mp4Track } from './mp4';
import type { ByteSource } from './source';
import {
  box,
  buildFtyp,
  buildMdatHeader,
  trackBox,
  u32,
  u16,
  UNITY_MATRIX,
  type TrackPlan,
} from './writer';

const NOW = 0;

export interface EncodeResult {
  blob: Blob;
  size: number;
  width: number;
  height: number;
  durationSeconds: number;
  originalSizeBytes: number;
  durationMs: number;
  compressionRatio: number;
}

export interface EncodeTransform {
  width: number;
  height: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  targetBitrateBps?: number;
  fps?: number;
  keyframeIntervalFrames?: number;
}

export interface CompressOptions {
  quality?: 'high' | 'medium' | 'low';
  targetSizeBytes?: number;
}

export interface ResizeOptions {
  preset?: '4k' | '1080p' | '720p' | '480p';
  customHeight?: number;
  scale?: number;
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  preset?: '1:1' | '9:16' | '4:5' | '16:9' | 'free';
}

/** Feature detection for WebCodecs and secure context. */
export function isWebCodecsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoDecoder !== 'undefined'
  );
}

/**
 * Maps target dimensions to the exact AVC level string supported by hardware encoders.
 *
 * Prevents NotSupportedError on high resolutions (Level 3.0 capped at 720x480).
 */
export function getAvcCodecString(width: number, height: number): string {
  const maxDim = Math.max(width, height);
  const minDim = Math.min(width, height);
  const pixels = width * height;

  if (pixels <= 720 * 480 && maxDim <= 720 && minDim <= 480) {
    return 'avc1.42001e'; // Baseline Level 3.0
  }
  if (pixels <= 1280 * 720 && maxDim <= 1280 && minDim <= 720) {
    return 'avc1.42001f'; // Baseline Level 3.1
  }
  if (pixels <= 1920 * 1080 && maxDim <= 1920 && minDim <= 1080) {
    return 'avc1.4d002a'; // Main Level 4.2
  }
  return 'avc1.640033'; // High Level 5.1 (up to 4K / 3840x2160)
}

/** Ensures video codec is H.264; refuses HEVC and AV1 by name. */
export function assertSupportedVideoCodec(track: Mp4Track): void {
  if (track.codec === 'hvc1' || track.codec === 'hev1') {
    throw new Error(
      'This file contains HEVC (H.265) video. In-browser re-encoding currently supports H.264 video. You can still trim, mute, split, or inspect metadata on this file without re-encoding.',
    );
  }
  if (track.codec === 'av01') {
    throw new Error(
      'This file contains AV1 video. In-browser re-encoding currently supports H.264 video. You can still trim, mute, split, or inspect metadata on this file without re-encoding.',
    );
  }
  if (track.codec !== 'avc1' && track.codec !== 'avc3') {
    throw new Error(
      `This video codec (${track.codec}) is not supported for in-browser re-encoding. Only H.264 is supported.`,
    );
  }
}

/** Scans bytes for child box payload by 4-character type. */
function findBoxPayload(bytes: Uint8Array, type: string): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const a = type.charCodeAt(0);
  const b = type.charCodeAt(1);
  const c = type.charCodeAt(2);
  const d = type.charCodeAt(3);

  for (let at = 4; at + 4 <= bytes.length; at++) {
    if (
      bytes[at] !== a ||
      bytes[at + 1] !== b ||
      bytes[at + 2] !== c ||
      bytes[at + 3] !== d
    ) {
      continue;
    }
    const start = at - 4;
    const size = view.getUint32(start, false);
    if (size >= 8 && start + size <= bytes.length) {
      return bytes.subarray(at + 4, start + size);
    }
  }
  return null;
}

const hex = (value: number) => value.toString(16).padStart(2, '0');

/** Extracts decoder config and raw avcC payload from video track. */
export function getDecoderConfig(track: Mp4Track): {
  codec: string;
  description: Uint8Array;
} {
  assertSupportedVideoCodec(track);
  const avcC = findBoxPayload(track.sampleDescription, 'avcC');
  if (!avcC || avcC.length < 4) {
    throw new Error(
      'That video is H.264 but carries no decoder configuration, so its frames cannot be decoded.',
    );
  }
  return {
    codec: `avc1.${hex(avcC[1]!)}${hex(avcC[2]!)}${hex(avcC[3]!)}`,
    description: avcC,
  };
}

/**
 * Builds a valid ISO Base Media stsd box containing an avc1 VisualSampleEntry
 * with child avcC configuration box.
 */
export function buildAvc1SampleDescription(
  width: number,
  height: number,
  avcCBytes: Uint8Array,
): Uint8Array {
  const avcCBox = box('avcC', avcCBytes);
  const visualHeader = new Uint8Array(78);
  const view = new DataView(visualHeader.buffer);
  view.setUint16(6, 1, false); // dataReferenceIndex = 1
  view.setUint16(24, width, false); // width
  view.setUint16(26, height, false); // height
  view.setUint32(28, 0x00480000, false); // 72 dpi
  view.setUint32(32, 0x00480000, false); // 72 dpi
  view.setUint16(40, 1, false); // frame_count = 1
  view.setUint16(74, 0x0018, false); // depth = 24
  view.setUint16(76, 0xffff, false); // pre_defined = -1

  const avc1Box = box('avc1', visualHeader, avcCBox);
  return box('stsd', [...u32(0), ...u32(1)], avc1Box);
}

/** Calculates target bitrate based on duration, dimensions, quality, and audio size. */
export function estimateTargetBitrate(
  width: number,
  height: number,
  durationSeconds: number,
  options: CompressOptions,
  audioSizeBytes: number = 0,
): number {
  if (
    options.targetSizeBytes &&
    options.targetSizeBytes > 0 &&
    durationSeconds > 0
  ) {
    const targetVideoBytes = Math.max(
      50_000,
      options.targetSizeBytes - audioSizeBytes - 64_000,
    );
    const bps = Math.round((targetVideoBytes * 8) / durationSeconds);
    return Math.max(150_000, Math.min(25_000_000, bps));
  }

  const quality = options.quality ?? 'medium';
  const pixels = width * height;
  const bppMap = {
    high: 0.12,
    medium: 0.07,
    low: 0.04,
  };
  const bpp = bppMap[quality];
  const fps = 30;
  const rawBps = Math.round(pixels * fps * bpp);
  return Math.max(250_000, Math.min(12_000_000, rawBps));
}

/**
 * Encodes video frames through WebCodecs, transforming them according to options,
 * and packaging the result with untouched audio into an MP4 file.
 */
export async function encodeVideo(
  source: ByteSource,
  transform: EncodeTransform,
  onProgress?: (progress: number) => void,
): Promise<EncodeResult> {
  if (!isWebCodecsSupported()) {
    throw new Error(
      'This browser does not support hardware video encoding via WebCodecs in this context. Please ensure you are using a modern browser over HTTPS or localhost.',
    );
  }

  const started = performance.now();
  const mp4 = await readMp4(source);
  const videoTrack = mp4.tracks.find((t) => t.kind === 'video');
  if (!videoTrack) {
    throw new Error('That file has no video track to encode.');
  }
  if (!videoTrack.width || !videoTrack.height) {
    throw new Error('That video reported no picture dimensions.');
  }

  assertSupportedVideoCodec(videoTrack);

  const audioTrack = mp4.tracks.find((t) => t.kind === 'audio') ?? null;
  const srcWidth = videoTrack.width;
  const srcHeight = videoTrack.height;

  // Snapped to even dimensions (H.264 requires macroblock alignment)
  const targetWidth = Math.max(2, Math.round(transform.width / 2) * 2);
  const targetHeight = Math.max(2, Math.round(transform.height / 2) * 2);

  const cropX = Math.max(
    0,
    Math.min(srcWidth - 2, Math.round(transform.cropX ?? 0)),
  );
  const cropY = Math.max(
    0,
    Math.min(srcHeight - 2, Math.round(transform.cropY ?? 0)),
  );
  const cropWidth = Math.min(
    srcWidth - cropX,
    Math.round(transform.cropWidth ?? srcWidth),
  );
  const cropHeight = Math.min(
    srcHeight - cropY,
    Math.round(transform.cropHeight ?? srcHeight),
  );

  const codecString = getAvcCodecString(targetWidth, targetHeight);
  const fps = transform.fps ?? 30;
  const keyframeInterval = transform.keyframeIntervalFrames ?? 30;

  const defaultBitrate = Math.round(targetWidth * targetHeight * fps * 0.08);
  const bitrate =
    transform.targetBitrateBps ?? Math.max(300_000, defaultBitrate);

  // Setup OffscreenCanvas / Canvas for frame processing
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null =
    null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetWidth, targetHeight);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) {
    throw new Error(
      'Could not obtain a canvas context for video frame processing.',
    );
  }

  // State for encoder chunks
  const encodedChunks: Uint8Array[] = [];
  const chunkSamples: Mp4Sample[] = [];
  let capturedAvcC: Uint8Array | null = null;
  let encodeFailure: Error | null = null;
  let decodeFailure: Error | null = null;

  const encoder = new VideoEncoder({
    output: (chunk, metadata) => {
      try {
        if (metadata?.decoderConfig?.description && !capturedAvcC) {
          capturedAvcC = new Uint8Array(
            metadata.decoderConfig.description as ArrayBuffer,
          );
        }
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        encodedChunks.push(data);

        chunkSamples.push({
          offset: 0, // Assigned during container assembly
          size: data.length,
          duration: Math.round(
            chunk.duration ? chunk.duration : 1_000_000 / fps,
          ),
          timestamp: chunk.timestamp,
          isKeyframe: chunk.type === 'key',
          compositionOffset: 0,
        });
      } catch (err) {
        encodeFailure = err instanceof Error ? err : new Error(String(err));
      }
    },
    error: (err) => {
      encodeFailure = err instanceof Error ? err : new Error(String(err));
    },
  });

  const encoderConfig: VideoEncoderConfig = {
    codec: codecString,
    width: targetWidth,
    height: targetHeight,
    bitrate,
    framerate: fps,
    avc: { format: 'avc' },
  };

  encoder.configure(encoderConfig);

  let frameCount = 0;
  const totalSamples = videoTrack.samples.length;

  const decoder = new VideoDecoder({
    output: async (frame) => {
      try {
        if (encodeFailure || decodeFailure) return;

        // Draw and transform frame onto canvas
        ctx!.drawImage(
          frame,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          targetWidth,
          targetHeight,
        );

        const outFrame = new VideoFrame(canvas, {
          timestamp: frame.timestamp,
          duration: frame.duration ?? undefined,
        });

        const isKey = frameCount % keyframeInterval === 0;
        encoder.encode(outFrame, { keyFrame: isKey });
        outFrame.close();
        frameCount++;

        if (onProgress && totalSamples > 0) {
          onProgress(
            Math.min(95, Math.round((frameCount / totalSamples) * 95)),
          );
        }

        // Bounded memory back-pressure: pause if encoder queue exceeds 5 frames
        if (encoder.encodeQueueSize > 5) {
          await new Promise<void>((resolve) => {
            encoder.ondequeue = () => {
              encoder.ondequeue = null;
              resolve();
            };
          });
        }
      } catch (err) {
        decodeFailure = err instanceof Error ? err : new Error(String(err));
      } finally {
        frame.close();
      }
    },
    error: (err) => {
      decodeFailure = err instanceof Error ? err : new Error(String(err));
    },
  });

  const decConfig = getDecoderConfig(videoTrack);
  decoder.configure({
    codec: decConfig.codec,
    description: decConfig.description,
    codedWidth: srcWidth,
    codedHeight: srcHeight,
  });

  try {
    for (let i = 0; i < videoTrack.samples.length; i++) {
      if (encodeFailure || decodeFailure) break;
      const sample = videoTrack.samples[i]!;
      const chunkData = await source.slice(
        sample.offset,
        sample.offset + sample.size,
      );

      decoder.decode(
        new EncodedVideoChunk({
          type: sample.isKeyframe ? 'key' : 'delta',
          timestamp: Math.round(
            ((sample.timestamp + sample.compositionOffset) /
              videoTrack.timescale) *
              1_000_000,
          ),
          duration: Math.round(
            (sample.duration / videoTrack.timescale) * 1_000_000,
          ),
          data: chunkData,
        }),
      );

      while (decoder.decodeQueueSize > 10) {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    }

    await decoder.flush();
    await encoder.flush();
  } finally {
    if (decoder.state !== 'closed') decoder.close();
    if (encoder.state !== 'closed') encoder.close();
  }

  if (decodeFailure) throw decodeFailure;
  if (encodeFailure) throw encodeFailure;

  if (!capturedAvcC || !encodedChunks.length) {
    throw new Error('Video encoding failed to produce valid H.264 data.');
  }

  if (onProgress) onProgress(98);

  // Assemble the output MP4 with new video track and untouched audio
  const newStsd = buildAvc1SampleDescription(
    targetWidth,
    targetHeight,
    capturedAvcC,
  );

  const videoTimescale = 1_000_000;
  const newVideoTrack: Mp4Track = {
    id: 1,
    kind: 'video',
    codec: 'avc1',
    timescale: videoTimescale,
    duration: Math.round(mp4.durationSeconds * videoTimescale),
    width: targetWidth,
    height: targetHeight,
    channels: null,
    sampleRate: null,
    sampleDescription: newStsd,
    samples: chunkSamples,
  };

  const plans: TrackPlan[] = [
    {
      track: newVideoTrack,
      samples: chunkSamples,
      sampleDescription: newStsd,
    },
  ];

  // Pass audio through untouched
  const audioBlobs: Uint8Array[] = [];
  if (audioTrack && audioTrack.samples.length > 0) {
    const audioSamples: Mp4Sample[] = [];
    let audioOffset = 0;
    for (const sample of audioTrack.samples) {
      const data = await source.slice(
        sample.offset,
        sample.offset + sample.size,
      );
      audioBlobs.push(data);
      audioSamples.push({
        ...sample,
        offset: audioOffset,
      });
      audioOffset += sample.size;
    }

    const newAudioTrack: Mp4Track = {
      ...audioTrack,
      id: 2,
      samples: audioSamples,
    };

    plans.push({
      track: newAudioTrack,
      samples: audioSamples,
      sampleDescription: audioTrack.sampleDescription,
    });
  }

  const ftyp = buildFtyp('mp4');

  const longest = Math.max(
    ...plans.map(
      (plan) =>
        plan.samples.reduce((sum, sample) => sum + sample.duration, 0) /
        plan.track.timescale,
    ),
  );
  const movieTimescale = 1000;
  const movieDuration = Math.round(longest * movieTimescale);

  const mvhd = box('mvhd', [
    ...u32(0),
    ...u32(NOW),
    ...u32(NOW),
    ...u32(movieTimescale),
    ...u32(movieDuration),
    ...u32(0x00010000), // normal rate
    ...u16(0x0100), // full volume
    ...Array.from({ length: 10 }, () => 0),
    ...UNITY_MATRIX,
    ...Array.from({ length: 24 }, () => 0),
    ...u32(plans.length + 1),
  ]);

  const videoPayloadLength = encodedChunks.reduce(
    (acc, c) => acc + c.length,
    0,
  );
  const audioPayloadLength = audioBlobs.reduce((acc, a) => acc + a.length, 0);
  const totalPayloadLength = videoPayloadLength + audioPayloadLength;
  const mdatHeader = buildMdatHeader(totalPayloadLength);

  const buildMoov = (chunkStart: number) =>
    box(
      'moov',
      mvhd,
      ...plans.map((plan, index) => {
        let offset = chunkStart;
        for (let earlier = 0; earlier < index; earlier += 1) {
          offset += plans[earlier].samples.reduce((sum, s) => sum + s.size, 0);
        }
        return trackBox(plan, movieTimescale, offset);
      }),
    );

  const provisionalMoov = buildMoov(0);
  const dataStart = ftyp.length + provisionalMoov.length + mdatHeader.length;
  const moov = buildMoov(dataStart);

  const blob = new Blob(
    [ftyp, moov, mdatHeader, ...encodedChunks, ...audioBlobs] as BlobPart[],
    {
      type: 'video/mp4',
    },
  );

  const durationMs = Math.round(performance.now() - started);
  const durationSeconds = longest;
  const originalSizeBytes = source.size;
  const size = blob.size;
  const compressionRatio =
    originalSizeBytes > 0 ? (originalSizeBytes - size) / originalSizeBytes : 0;

  if (onProgress) onProgress(100);

  return {
    blob,
    size,
    width: targetWidth,
    height: targetHeight,
    durationSeconds,
    originalSizeBytes,
    durationMs,
    compressionRatio,
  };
}

/** V6 Compress Video wrapper */
export async function compressVideo(
  source: ByteSource,
  options: CompressOptions,
  onProgress?: (progress: number) => void,
): Promise<EncodeResult> {
  const mp4 = await readMp4(source);
  const vTrack = mp4.tracks.find((t) => t.kind === 'video');
  if (!vTrack || !vTrack.width || !vTrack.height) {
    throw new Error('Video track not found.');
  }

  const audioTrack = mp4.tracks.find((t) => t.kind === 'audio');
  const audioBytes = audioTrack
    ? audioTrack.samples.reduce((acc, s) => acc + s.size, 0)
    : 0;
  const duration = mp4.durationSeconds > 0 ? mp4.durationSeconds : 1;

  const targetBitrateBps = estimateTargetBitrate(
    vTrack.width,
    vTrack.height,
    duration,
    options,
    audioBytes,
  );

  return encodeVideo(
    source,
    {
      width: vTrack.width,
      height: vTrack.height,
      targetBitrateBps,
    },
    onProgress,
  );
}

/** V7 Resize Video wrapper */
export async function resizeVideo(
  source: ByteSource,
  options: ResizeOptions,
  onProgress?: (progress: number) => void,
): Promise<EncodeResult> {
  const mp4 = await readMp4(source);
  const vTrack = mp4.tracks.find((t) => t.kind === 'video');
  if (!vTrack || !vTrack.width || !vTrack.height) {
    throw new Error('Video track not found.');
  }

  let targetWidth = vTrack.width;
  let targetHeight = vTrack.height;
  const aspect = vTrack.width / vTrack.height;

  if (options.preset) {
    switch (options.preset) {
      case '4k':
        targetHeight = 2160;
        targetWidth = Math.round(targetHeight * aspect);
        break;
      case '1080p':
        targetHeight = 1080;
        targetWidth = Math.round(targetHeight * aspect);
        break;
      case '720p':
        targetHeight = 720;
        targetWidth = Math.round(targetHeight * aspect);
        break;
      case '480p':
        targetHeight = 480;
        targetWidth = Math.round(targetHeight * aspect);
        break;
    }
  } else if (options.customHeight) {
    targetHeight = options.customHeight;
    targetWidth = Math.round(targetHeight * aspect);
  } else if (options.scale) {
    targetWidth = Math.round(vTrack.width * options.scale);
    targetHeight = Math.round(vTrack.height * options.scale);
  }

  targetWidth = Math.max(2, Math.round(targetWidth / 2) * 2);
  targetHeight = Math.max(2, Math.round(targetHeight / 2) * 2);

  return encodeVideo(
    source,
    {
      width: targetWidth,
      height: targetHeight,
    },
    onProgress,
  );
}

/** V8 Crop Video wrapper */
export async function cropVideo(
  source: ByteSource,
  options: CropOptions,
  onProgress?: (progress: number) => void,
): Promise<EncodeResult> {
  const mp4 = await readMp4(source);
  const vTrack = mp4.tracks.find((t) => t.kind === 'video');
  if (!vTrack || !vTrack.width || !vTrack.height) {
    throw new Error('Video track not found.');
  }

  const cropW = Math.max(2, Math.round(options.width / 2) * 2);
  const cropH = Math.max(2, Math.round(options.height / 2) * 2);

  return encodeVideo(
    source,
    {
      width: cropW,
      height: cropH,
      cropX: options.x,
      cropY: options.y,
      cropWidth: cropW,
      cropHeight: cropH,
    },
    onProgress,
  );
}
