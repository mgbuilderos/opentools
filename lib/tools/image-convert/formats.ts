/**
 * The image formats this site converts between, and the hard browser limit that
 * decides which pairs can exist at all.
 *
 * WHY THIS IS ASYMMETRIC, AND WHY THAT IS FINE. Decoding is broad: every engine
 * we support already reads JPEG, PNG, WebP, GIF, BMP and AVIF without help, and
 * HEIC needs a library. Encoding is narrow: `canvas.toBlob` emits **only**
 * `image/jpeg`, `image/png` and `image/webp`. `toBlob('image/avif')` is not
 * implemented anywhere, and a canvas asked for a type it does not know silently
 * hands back a PNG — so a naive "any to any" matrix would ship pages promising
 * an AVIF the tool would answer with a mislabelled PNG.
 *
 * The search demand runs in the buildable direction anyway. People look for
 * "heic to jpg", "webp to png" and "avif to jpg"; nobody converts a photo *to*
 * AVIF by hand. So `canEncode` is the gate and no page is generated against it.
 *
 * MEASURED 2026-09-24 (Playwright, real 598-byte HEIC built with macOS `sips`):
 * WebKit decodes HEIC natively via `createImageBitmap` and `<img>`; Chromium
 * fails both with `InvalidStateError`. Neither engine exposes `ImageDecoder`.
 * So `createImageBitmap` in a `try` is the probe, and libheif is the fallback
 * only where the probe fails. See `HEIC_BUILD_SPEC.md` §1.
 */

export interface ImageFormat {
  /** URL token, and the word people type: `heic-to-jpg`. */
  id: string;
  /** MIME type. */
  mime: string;
  /** Display name, in the casing the format's own community writes it. */
  name: string;
  /** File extension the download gets. */
  extension: string;
  /** Every extension that carries this format, for the file picker. */
  extensions: readonly string[];
  /** True when `canvas.toBlob` can emit it. Gates the `to` side of a pair. */
  canEncode: boolean;
  /**
   * True when no engine decodes it unaided, so the page must load a decoder.
   * Only HEIC today. Drives the payload disclosure the page owes the reader.
   */
  needsDecoder: boolean;
  /** What the format is, for the sentence under the title. */
  summary: string;
}

export const IMAGE_FORMATS: readonly ImageFormat[] = [
  {
    id: 'heic',
    mime: 'image/heic',
    name: 'HEIC',
    extension: 'heic',
    extensions: ['heic', 'heif'],
    canEncode: false,
    needsDecoder: true,
    summary: 'what an iPhone saves photos as, which Windows will not open',
  },
  {
    id: 'jpg',
    mime: 'image/jpeg',
    name: 'JPEG',
    extension: 'jpg',
    extensions: ['jpg', 'jpeg'],
    canEncode: true,
    needsDecoder: false,
    summary: 'the photo format every device and site accepts',
  },
  {
    id: 'png',
    mime: 'image/png',
    name: 'PNG',
    extension: 'png',
    extensions: ['png'],
    canEncode: true,
    needsDecoder: false,
    summary: 'lossless, and the one of these three that keeps transparency',
  },
  {
    id: 'webp',
    mime: 'image/webp',
    name: 'WebP',
    extension: 'webp',
    extensions: ['webp'],
    canEncode: true,
    needsDecoder: false,
    summary: 'smaller than JPEG at the same quality, and made for the web',
  },
  {
    id: 'avif',
    mime: 'image/avif',
    name: 'AVIF',
    extension: 'avif',
    extensions: ['avif'],
    canEncode: false,
    needsDecoder: false,
    summary: 'smaller again than WebP, but older software often refuses it',
  },
  {
    id: 'gif',
    mime: 'image/gif',
    name: 'GIF',
    extension: 'gif',
    extensions: ['gif'],
    canEncode: false,
    needsDecoder: false,
    summary: 'the old animated format; only the first frame converts',
  },
  {
    id: 'bmp',
    mime: 'image/bmp',
    name: 'BMP',
    extension: 'bmp',
    extensions: ['bmp'],
    canEncode: false,
    needsDecoder: false,
    summary: 'uncompressed Windows bitmap, large and rarely wanted today',
  },
] as const;

const BY_ID = new Map(IMAGE_FORMATS.map((format) => [format.id, format]));

export function imageFormatById(id: string) {
  return BY_ID.get(id);
}

/** Every MIME type we accept as input, for the file picker's `accept`. */
export const ACCEPTED_IMAGE_MIMES = IMAGE_FORMATS.map((f) => f.mime);

/** Every extension we accept as input, dot-prefixed, for the file picker. */
export const ACCEPTED_IMAGE_EXTENSIONS = IMAGE_FORMATS.flatMap((f) =>
  f.extensions.map((extension) => `.${extension}`),
);

export interface ImagePair {
  /** `heic-to-jpg`. */
  id: string;
  from: ImageFormat;
  to: ImageFormat;
}

/**
 * Pairs a hand-written tool already answers, and the page that answers them.
 *
 * Same rule as `lib/seo/format-pairs.ts`: two addresses for one query with the
 * same tool behind them split whatever either had earned. So the pair is not
 * generated and the converter links to the live page instead. `image-pairs.test.ts`
 * checks every route here is still live, so deleting one of those pages surfaces
 * as a failing test rather than as a dead link.
 */
export const IMAGE_PAIRS_ANSWERED_ELSEWHERE: Readonly<Record<string, string>> = {
  'heic-to-jpg': '/image/heic-to-jpg',
  'heic-to-png': '/image/heic-to-png',
};

/**
 * Every convertible pair, minus the ones a hand-written page already answers.
 *
 * DERIVED, NEVER TYPED — the same discipline as the unit and file-format pairs
 * next door. A format's `canEncode` flag is the only thing that decides whether
 * it can be a destination, so a URL can never promise a conversion `toBlob`
 * will not perform.
 */
export function imagePairs(): ImagePair[] {
  const pairs: ImagePair[] = [];
  for (const from of IMAGE_FORMATS) {
    for (const to of IMAGE_FORMATS) {
      if (from.id === to.id) continue;
      if (!to.canEncode) continue;
      const id = `${from.id}-to-${to.id}`;
      if (id in IMAGE_PAIRS_ANSWERED_ELSEWHERE) continue;
      pairs.push({ id, from, to });
    }
  }
  return pairs;
}

const PAIR_BY_ID = new Map(imagePairs().map((pair) => [pair.id, pair]));

export function imagePairById(id: string) {
  return PAIR_BY_ID.get(id);
}
