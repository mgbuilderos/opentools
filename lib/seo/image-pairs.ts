import {
  IMAGE_PAIRS_ANSWERED_ELSEWHERE,
  imagePairs,
  type ImagePair,
} from '../tools/image-convert/formats';

/**
 * One page per image conversion pair, on the same route and the same terms as
 * the unit pairs and the file-format pairs beside it.
 *
 * WHY THESE AND NOT THE OTHER FAMILY. 512 unit pairs produced 15 page-opens on
 * 2026-09-23, because Google answers "cm to inches" in its own results and
 * nobody needs to leave. It cannot answer "webp to png": converting a file
 * requires a converter, so the person has to open one. That is the whole case
 * for this family, and it is the same case the file-format pairs make.
 *
 * DERIVED, NEVER TYPED. `canEncode` in `lib/tools/image-convert/formats.ts` is
 * the only thing that decides whether a format can be a destination, because
 * `canvas.toBlob` emits jpeg, png and webp and silently returns a PNG for
 * anything else. A URL here therefore cannot promise a conversion the browser
 * will not perform -- there is no list to keep in step, and `formats.test.ts`
 * fails if one is introduced.
 *
 * WHAT IS NOT HERE. `heic-to-jpg` and `heic-to-png` have hand-written pages,
 * because HEIC needs a downloaded decoder and owes the reader a disclosure no
 * generated page would carry. They are excluded by
 * `IMAGE_PAIRS_ANSWERED_ELSEWHERE` and linked from every page in this family,
 * so the query has one address rather than two competing ones.
 */
export const IMAGE_PAIRS: readonly ImagePair[] = imagePairs();

const PAIR_BY_ID = new Map(IMAGE_PAIRS.map((pair) => [pair.id, pair]));

export function imageSeoPairById(id: string) {
  return PAIR_BY_ID.get(id);
}

export interface ImagePairFacts {
  description: string;
  /** What this conversion does to the file, stated rather than promised. */
  measured: string;
  /** Format token -> display name, for the two selects. */
  formats: Record<string, string>;
  /** `${from}|${to}` -> the page that answers it. */
  routes: Record<string, string>;
  /** Extension the download gets. */
  extension: string;
  /** True when the source format needs the libheif download. */
  needsDecoder: boolean;
}

/**
 * What a search result prints of a description before it truncates it.
 *
 * The same 160 characters the file-format pairs measured against on
 * 2026-09-23, when 100 of 103 pages ran to about 181 and every one of them
 * ended mid-sentence.
 */
const SNIPPET_LIMIT = 160;

/** The fullest true sentence about this pair that still fits a snippet. */
function descriptionFor(pair: ImagePair): string {
  const from = pair.from.name;
  const to = pair.to.name;
  const candidates = [
    `Convert ${from} to ${to} in your own browser tab — ${pair.to.summary}. The picture is decoded and re-encoded here and is never uploaded.`,
    `Convert ${from} to ${to} in your own browser tab. The picture is decoded and re-encoded here and is never uploaded.`,
    `Convert ${from} to ${to} in your browser. Nothing is sent anywhere.`,
  ];
  return (
    candidates.find((text) => text.length <= SNIPPET_LIMIT) ??
    candidates[candidates.length - 1]!
  );
}

/**
 * The one sentence that is true of this pair and of no other.
 *
 * Three things actually change when a picture crosses formats, and which of
 * them applies is decided by the two formats rather than by a template: the
 * loss, the transparency and the size. A JPEG destination fills transparency
 * with white because it cannot store it; a PNG destination stores the decoded
 * pixels exactly and costs several times the bytes; WebP does both depending
 * on the quality. Saying so is the difference between a page that answers the
 * query and 16 pages that say the same thing about different words.
 */
function measuredFor(pair: ImagePair): string {
  const to = pair.to;
  const from = pair.from;

  if (to.id === 'png') {
    return `PNG stores the decoded pixels exactly, so nothing is re-compressed on the way out and any transparency in the ${from.name} survives. Expect a file several times the size of the original: lossless compression cannot shrink photographic detail the way ${from.name} does.`;
  }
  if (to.id === 'jpg') {
    return `JPEG cannot hold transparency, so any see-through area is filled with white before encoding rather than coming out black. The picture is re-compressed at quality 92, which is a second generation of loss on top of whatever the ${from.name} already discarded.`;
  }
  return `WebP is written at quality 92 and keeps transparency, so it is usually the smallest of the three destinations at the same visible quality. It is a lossy re-encode, so this is a second generation of loss on top of whatever the ${from.name} already discarded.`;
}

export function imagePairFacts(pair: ImagePair): ImagePairFacts {
  const formats: Record<string, string> = {};
  for (const other of IMAGE_PAIRS) {
    formats[other.from.id] = other.from.name;
    formats[other.to.id] = other.to.name;
  }

  const routes: Record<string, string> = {};
  for (const other of IMAGE_PAIRS) {
    routes[`${other.from.id}|${other.to.id}`] = `/convert/${other.id}`;
  }
  for (const [id, href] of Object.entries(IMAGE_PAIRS_ANSWERED_ELSEWHERE)) {
    const [from = '', to = ''] = id.split('-to-');
    routes[`${from}|${to}`] = href;
    // A hand-written page still needs its formats named in the two selects.
    formats[from] ||= from.toUpperCase();
    formats[to] ||= to.toUpperCase();
  }

  return {
    description: descriptionFor(pair),
    measured: measuredFor(pair),
    formats,
    routes,
    extension: pair.to.extension,
    needsDecoder: pair.from.needsDecoder,
  };
}
