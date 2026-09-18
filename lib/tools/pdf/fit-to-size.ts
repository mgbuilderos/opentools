/**
 * Finds the highest-fidelity compression settings whose output actually lands
 * under a byte ceiling.
 *
 * Kept free of pdf-lib and of the browser so it can be tested against a fake
 * compressor in Node, the same way `exact-size.ts` is tested against a fake
 * encoder. The caller supplies `attempt`, which runs one real compression and
 * reports its measured byte length.
 *
 * Nothing here estimates. A PDF's compressed size is not a predictable
 * function of JPEG quality — one photo-heavy page can dominate a hundred text
 * pages, and JPEG size is not even strictly monotonic in quality — so every
 * decision below is made on bytes that were actually produced.
 */

export const QUALITY_FLOOR = 30;
export const QUALITY_CEILING = 92;

/**
 * Longest-edge rungs, in pixels, descended only when quality alone cannot get
 * a file under its ceiling. The first rung is high enough to leave most
 * documents' images untouched.
 */
export const DIMENSION_LADDER = [4000, 2000, 1400, 1000, 700] as const;

/**
 * Attempts are expensive — each one re-parses and rewrites the whole document
 * — so the search is capped. The cap is above the worst case the ladder can
 * produce (11) and exists only to stop a pathological file from spinning.
 */
export const MAX_ATTEMPTS = 14;

/**
 * Quality steps finer than this are not worth another full rewrite: they move
 * the output by well under a percent while costing a whole pass.
 */
const QUALITY_RESOLUTION = 2;

/** One measured attempt and the settings that produced it. */
type PdfFitCandidate<T> = {
  trial: PdfFitTrial<T>;
  settings: PdfFitSettings;
};

export type PdfFitOutcome =
  /** The file was already within the target. Nothing was changed. */
  | 'already-under'
  /** Settings were found whose measured output is within the target. */
  | 'met'
  /** Even the floor quality at the smallest rung stayed over the target. */
  | 'over-max';

export interface PdfFitTrial<T> {
  byteLength: number;
  /** Whatever the caller needs back — in the worker, the compressed bytes. */
  value: T;
}

export interface PdfFitSettings {
  quality: number;
  maxImageDimension: number;
}

export interface PdfFitOptions<T> {
  targetBytes: number;
  originalBytes: number;
  attempt: (settings: PdfFitSettings) => Promise<PdfFitTrial<T>>;
  ladder?: readonly number[];
  maxAttempts?: number;
}

export interface PdfFitResult<T> {
  outcome: PdfFitOutcome;
  /**
   * The trial to hand back. For `met`, the best fitting attempt. For
   * `over-max`, the smallest attempt tried, so the caller still has the best
   * effort rather than nothing. Null for `already-under`.
   */
  chosen: PdfFitTrial<T> | null;
  /** The settings that produced `chosen`. Null when nothing was run. */
  settings: PdfFitSettings | null;
  attempts: number;
}

/**
 * Searches the ladder for the largest images and highest quality that still
 * fit.
 *
 * Rung by rung, from the largest images down:
 *
 * 1. Run the floor quality. If even that is over the target, this rung cannot
 *    work at any quality — drop to smaller images and try again.
 * 2. Run the ceiling quality. If that fits, take it: the whole range fits, so
 *    there is nothing to gain from searching.
 * 3. Otherwise bisect between them, holding the invariant that `low` fits and
 *    `high` does not, and keep the highest quality whose measured output fits.
 *
 * Because size is not strictly monotonic in quality, every attempt is judged
 * on its own bytes rather than assumed from its neighbours.
 */
export async function fitPdfToSize<T>(
  options: PdfFitOptions<T>,
): Promise<PdfFitResult<T>> {
  const {
    targetBytes,
    originalBytes,
    attempt,
    ladder = DIMENSION_LADDER,
    maxAttempts = MAX_ATTEMPTS,
  } = options;

  if (originalBytes <= targetBytes) {
    return {
      outcome: 'already-under',
      chosen: null,
      settings: null,
      attempts: 0,
    };
  }

  let attempts = 0;

  /**
   * Held on one object rather than in two `let`s because `run` below is the
   * only writer. TypeScript narrows a `let` to the type of its initialiser
   * when every assignment to it happens inside a closure, so reading `best`
   * or `smallest` after the loop would see `null` and nothing else.
   */
  const picked: {
    best: PdfFitCandidate<T> | null;
    smallest: PdfFitCandidate<T> | null;
  } = { best: null, smallest: null };

  const run = async (settings: PdfFitSettings) => {
    attempts += 1;
    const trial = await attempt(settings);
    if (
      picked.smallest === null ||
      trial.byteLength < picked.smallest.trial.byteLength
    ) {
      picked.smallest = { trial, settings };
    }
    if (trial.byteLength <= targetBytes) {
      // A later rung is always smaller images, so an earlier fit wins ties.
      if (
        picked.best === null ||
        settings.quality > picked.best.settings.quality
      ) {
        picked.best = { trial, settings };
      }
    }
    return trial;
  };

  const budgetLeft = () => attempts < maxAttempts;

  for (const maxImageDimension of ladder) {
    if (!budgetLeft()) break;

    const bottom = await run({ quality: QUALITY_FLOOR, maxImageDimension });
    if (bottom.byteLength > targetBytes) continue;

    if (!budgetLeft()) break;
    const top = await run({ quality: QUALITY_CEILING, maxImageDimension });
    if (top.byteLength <= targetBytes) break;

    let low = QUALITY_FLOOR;
    let high = QUALITY_CEILING;
    while (high - low > QUALITY_RESOLUTION && budgetLeft()) {
      const mid = Math.floor((low + high) / 2);
      const trial = await run({ quality: mid, maxImageDimension });
      if (trial.byteLength <= targetBytes) {
        low = mid;
      } else {
        high = mid;
      }
    }
    break;
  }

  if (picked.best !== null) {
    return {
      outcome: 'met',
      chosen: picked.best.trial,
      settings: picked.best.settings,
      attempts,
    };
  }

  return {
    outcome: 'over-max',
    chosen: picked.smallest?.trial ?? null,
    settings: picked.smallest?.settings ?? null,
    attempts,
  };
}
