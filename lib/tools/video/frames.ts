/**
 * Getting pixels out of a video, in the browser.
 *
 * The only browser-dependent file in the video engine, and deliberately the
 * dullest possible implementation: load the file into a `<video>` element, seek
 * to a time, draw that instant onto a canvas, read the pixels back. Repeat.
 *
 * **Why not WebCodecs.** `VideoDecoder` is faster and gives frame-accurate
 * output, and it is the obvious choice — but it needs the codec configuration
 * extracted from the container and fed to it, its availability differs across
 * browsers, and on iOS it has been patchy. Seeking a `<video>` element works
 * everywhere a video can be played at all, which for a tool whose whole promise
 * is "this runs in your browser" matters more than speed. A GIF is a handful of
 * frames from a short clip; there is nothing here that needs to be fast.
 *
 * **The video never leaves this tab.** It is handed to the element as a blob URL
 * pointing at memory in this page, and the page's `connect-src 'none'` means the
 * browser would refuse an outbound connection even if this code attempted one.
 * Stated as the mechanism rather than as a result, because
 * `local-source-policy.test.ts` reserves the stronger phrasing for a release
 * that has passed the formal egress proof — and it caught this comment.
 *
 * **The honest limit, and the page says it:** seeking lands on the nearest frame
 * the browser chooses to show, not on an exact timestamp. For a GIF sampled a few
 * times a second that is invisible. It would not be good enough for
 * frame-accurate work, and this does not claim to do frame-accurate work.
 */

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

/** Seeks and waits for the browser to actually show that instant. */
function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // A seek that never completes must not hang the page forever.
    const giveUp = setTimeout(
      () => reject(new Error('The video stopped responding while seeking.')),
      10_000,
    );
    const done = () => {
      clearTimeout(giveUp);
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done);
    video.currentTime = time;
  });
}

function loadMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const giveUp = setTimeout(
      () => reject(new Error('This browser could not read that video.')),
      15_000,
    );
    video.addEventListener('loadedmetadata', () => {
      clearTimeout(giveUp);
      resolve();
    });
    video.addEventListener('error', () => {
      clearTimeout(giveUp);
      reject(new Error('This browser could not decode that video.'));
    });
  });
}

/**
 * Samples frames out of a video file.
 *
 * The blob URL is always revoked and the element always torn down, even on
 * failure — a leaked video element holds the whole decoded file in memory.
 */
export async function extractFrames(
  file: Blob,
  options: ExtractOptions,
): Promise<ExtractedFrames> {
  const { startSeconds, endSeconds, framesPerSecond, maxEdge, maxFrames } =
    options;
  if (endSeconds <= startSeconds) {
    throw new Error('The end of the range must come after its start.');
  }
  if (framesPerSecond <= 0)
    throw new Error('The frame rate must be above zero.');

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  // Needed on iOS, which otherwise refuses to decode without a user gesture.
  video.playsInline = true;
  video.src = url;

  try {
    await loadMetadata(video);
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) {
      throw new Error(
        'That video reported no picture size, so no frames can be taken.',
      );
    }

    const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
    // Even dimensions keep the drawing simple and avoid a half-pixel column.
    const width = Math.max(2, Math.round((sourceWidth * scale) / 2) * 2);
    const height = Math.max(2, Math.round((sourceHeight * scale) / 2) * 2);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context)
      throw new Error('This browser would not give us a canvas to draw on.');

    const step = 1 / framesPerSecond;
    const duration = Number.isFinite(video.duration)
      ? video.duration
      : endSeconds;
    const until = Math.min(endSeconds, duration);

    const frames: Uint8Array[] = [];
    let truncated = false;
    for (let at = startSeconds; at < until; at += step) {
      if (frames.length >= maxFrames) {
        truncated = true;
        break;
      }
      await seek(video, at);
      context.drawImage(video, 0, 0, width, height);
      // A copy, because getImageData's buffer is reused by some engines.
      frames.push(
        new Uint8Array(context.getImageData(0, 0, width, height).data),
      );
    }

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
  } finally {
    // Order matters: drop the source before revoking, or Safari can keep
    // fetching a URL that no longer exists and log an error.
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
