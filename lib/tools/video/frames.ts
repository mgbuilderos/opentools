/**
 * Getting pixels out of a video, in the browser.
 *
 * The only browser-dependent file in the video engine. It hands the file's own
 * compressed frames to `VideoDecoder` and draws each decoded frame onto a
 * canvas.
 *
 * **Why not a `<video>` element, which is the obvious way.** Because it cannot
 * work here. A `<video>` needs a URL, and the only URL available for a file in
 * memory is a `blob:` one. This site serves `connect-src 'none'` and declares
 * no `media-src`, so media falls back to `default-src 'self'` and the browser
 * refuses a `blob:` source outright — "Media load rejected by URL safety
 * check", in every engine. That was diagnosed at length: it looked like a codec
 * problem, because both test engines answer "probably" to `canPlayType` for
 * H.264, and a declared capability is not the same as a policy that permits it.
 *
 * The alternative was to add `media-src 'self' blob:` to the site's policy.
 * This route needs no policy change at all, because `VideoDecoder` takes bytes
 * rather than a URL. Given the choice between widening a security header and
 * not needing to, not needing to wins.
 *
 * **The video never leaves this tab.** Its bytes are handed to a decoder inside
 * the page and never to a network API; the page's `connect-src 'none'` means
 * the browser would refuse an outbound connection even if this code attempted
 * one. Stated as the mechanism rather than as a result, because
 * `local-source-policy.test.ts` reserves the stronger phrasing for a release
 * that has passed the formal egress proof.
 *
 * **The honest limit, and the page says it:** this reads H.264, which is what
 * essentially every MP4 and MOV from a phone or a camera contains. HEVC and AV1
 * are refused by name rather than half-handled. Trimming still works on any
 * file, because trimming copies compressed data without decoding it — so a
 * video whose frames cannot be read here can still be cut.
 */

import { keyframeAtOrBefore, readMp4, type Mp4Track } from './mp4';

export interface ExtractOptions {
  /** Where to start, in seconds. */
  startSeconds: number;
  endSeconds: number;
  /** How many frames to take per second of video. */
  framesPerSecond: number;
  /** Longest edge of the output, in pixels. Aspect ratio is kept. */
  maxEdge: number;
  /** Stop after this many frames, whatever the range asks for. */
  maxFrames: number;
}

export interface ExtractedFrames {
  /** RGBA pixels, one entry per frame. */
  frames: Uint8Array[];
  width: number;
  height: number;
  /** Gap between frames in hundredths of a second, for the GIF. */
  delayCentiseconds: number;
  /** Set when `maxFrames` cut the range short, so the page can say so. */
  truncated: boolean;
}

/**
 * Finds a box inside another box's bytes and returns its payload.
 *
 * Scans for the four-character type rather than walking the sample-entry
 * header, because that header's length varies by entry kind and getting it
 * wrong reads the wrong bytes silently. The size is read from the four bytes
 * *before* the type, as every box in this format stores it, and validated
 * before use so a coincidental four-character match in pixel data cannot send
 * us somewhere absurd.
 */
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

/**
 * The codec string and configuration `VideoDecoder` needs.
 *
 * `avcC` is the H.264 configuration record the file already carries, and the
 * decoder takes it verbatim — the same reason `writer.ts` copies `stsd` rather
 * than understanding it. Its bytes 1, 2 and 3 are the profile, its constraint
 * flags and the level, which is exactly what the codec string spells out.
 */
function decoderConfig(track: Mp4Track): {
  codec: string;
  description: Uint8Array;
} {
  if (track.codec === 'avc1' || track.codec === 'avc3') {
    const avcC = findBoxPayload(track.sampleDescription, 'avcC');
    if (!avcC || avcC.length < 4) {
      throw new Error(
        'That video is H.264 but carries no decoder configuration, so its frames cannot be read.',
      );
    }
    return {
      codec: `avc1.${hex(avcC[1]!)}${hex(avcC[2]!)}${hex(avcC[3]!)}`,
      description: avcC,
    };
  }

  const named =
    track.codec === 'hvc1' || track.codec === 'hev1'
      ? 'HEVC'
      : track.codec === 'av01'
        ? 'AV1'
        : track.codec;
  throw new Error(
    `Making a GIF needs to read the picture, and this video is ${named} rather than H.264. Trimming and muting still work on it, because those copy the video without decoding it.`,
  );
}

/** Keeps the decoder's queue short so a long range cannot balloon memory. */
async function drainTo(decoder: VideoDecoder, limit: number): Promise<void> {
  while (decoder.decodeQueueSize > limit) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Samples frames out of a video file.
 *
 * Decoding starts at the keyframe at or before the range, never at the range
 * itself: every frame in between is needed to reconstruct the first one that is
 * wanted. Starting anywhere else produces the smeared mess everyone has seen in
 * a badly cut clip.
 */
export async function extractFrames(
  bytes: Uint8Array,
  options: ExtractOptions,
): Promise<ExtractedFrames> {
  const { startSeconds, endSeconds, framesPerSecond, maxEdge, maxFrames } =
    options;
  if (endSeconds <= startSeconds) {
    throw new Error('The end of the range must come after its start.');
  }
  if (framesPerSecond <= 0) {
    throw new Error('The frame rate must be above zero.');
  }
  if (typeof VideoDecoder === 'undefined') {
    throw new Error(
      'This browser cannot decode video frames on its own, so it cannot make a GIF here. Trimming and muting still work.',
    );
  }

  const mp4 = readMp4(bytes);
  const track = mp4.tracks.find((candidate) => candidate.kind === 'video');
  if (!track) {
    throw new Error('That file has no video track, so it has no frames.');
  }
  if (!track.width || !track.height) {
    throw new Error(
      'That video reported no picture size, so no frames can be taken.',
    );
  }

  const { codec, description } = decoderConfig(track);
  const config: VideoDecoderConfig = {
    codec,
    description,
    codedWidth: track.width,
    codedHeight: track.height,
  };
  const support = await VideoDecoder.isConfigSupported(config);
  if (!support.supported) {
    throw new Error(
      `This browser will not decode ${codec}, so it cannot make a GIF from this video. Trimming and muting still work.`,
    );
  }

  const scale = Math.min(1, maxEdge / Math.max(track.width, track.height));
  // Even dimensions keep the drawing simple and avoid a half-pixel column.
  const width = Math.max(2, Math.round((track.width * scale) / 2) * 2);
  const height = Math.max(2, Math.round((track.height * scale) / 2) * 2);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('This browser would not give us a canvas to draw on.');
  }

  const step = 1 / framesPerSecond;
  const frames: Uint8Array[] = [];
  let nextWanted = startSeconds;
  let truncated = false;
  let failure: Error | null = null;

  const decoder = new VideoDecoder({
    output: (frame) => {
      try {
        if (failure) return;
        // A frame is kept when it is the first to reach the next sample point.
        // Decoding hands us every frame in the range, most of which are passed
        // over; the ones before the range exist only to reconstruct the rest.
        const seconds = frame.timestamp / 1_000_000;
        if (seconds + 1e-6 < nextWanted || seconds >= endSeconds) return;
        if (frames.length >= maxFrames) {
          truncated = true;
          return;
        }
        context.drawImage(frame, 0, 0, width, height);
        // A copy, because getImageData's buffer is reused by some engines.
        frames.push(
          new Uint8Array(context.getImageData(0, 0, width, height).data),
        );
        do {
          nextWanted += step;
        } while (nextWanted <= seconds);
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error));
      } finally {
        // Not optional. An unclosed VideoFrame holds a decoded picture, and a
        // few hundred of those will exhaust the tab.
        frame.close();
      }
    },
    error: (error) => {
      failure = error instanceof Error ? error : new Error(String(error));
    },
  });

  try {
    decoder.configure(config);

    const first = keyframeAtOrBefore(track, startSeconds);
    const startIndex = first ? track.samples.indexOf(first) : 0;

    for (
      let index = Math.max(0, startIndex);
      index < track.samples.length;
      index++
    ) {
      if (failure || (truncated && frames.length >= maxFrames)) break;
      const sample = track.samples[index]!;
      const presentation =
        (sample.timestamp + sample.compositionOffset) / track.timescale;
      if (presentation >= endSeconds) break;

      decoder.decode(
        new EncodedVideoChunk({
          type: sample.isKeyframe ? 'key' : 'delta',
          timestamp: Math.round(presentation * 1_000_000),
          duration: Math.round((sample.duration / track.timescale) * 1_000_000),
          data: bytes.subarray(sample.offset, sample.offset + sample.size),
        }),
      );
      await drainTo(decoder, 24);
    }

    await decoder.flush();
  } finally {
    if (decoder.state !== 'closed') decoder.close();
  }

  if (failure) throw failure;
  if (!frames.length) {
    throw new Error('No frames could be read from that range.');
  }

  return {
    frames,
    width,
    height,
    delayCentiseconds: Math.max(2, Math.round(100 / framesPerSecond)),
    truncated,
  };
}
