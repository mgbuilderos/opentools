/**
 * Whether this browser can already run a tool with the network switched off.
 *
 * WHAT THIS ANSWERS, AND WHY IT IS NOT A CLAIM IN PROSE. The site precaches a
 * short list of pages so they load with no network -- see
 * `scripts/build-service-worker-precache.mjs`. That list is a build-time
 * decision; whether a particular browser *has* the bytes is a runtime fact,
 * and the two are not the same. A visitor who has never been here before, or
 * who blocks service workers, or whose storage was evicted, is not offline
 * ready however carefully the build was written. So `/pdf/compress-offline`
 * does not tell anyone it works offline: it reads the cache and reports what
 * is actually held, which is the only version of that sentence that can be
 * checked by the person reading it.
 *
 * TWO GATES, AND WHY THE SECOND ONE EXISTS. Holding the page means the page
 * opens. It does not mean the tool runs. The compressor's engine is a separate
 * bundle started with `new Worker(...)`, and until 2026-09-24 it was not in the
 * payload at all: `/pdf/compress` opened with the network off and then failed
 * on the first file, because the one request it had to make was the one nobody
 * had cached. A readiness panel that checked only for the page would have
 * reported "ready" on exactly that browser. It checks for both.
 *
 * The cache is read by the page rather than asked of the service worker on
 * purpose. `caches` is same-origin storage, so this needs no message channel,
 * no worker cooperation and no network -- which matters, because the whole
 * point is a page that answers with the network off.
 */

/** The cache the service worker stores its payload in, minus the build id. */
export const OFFLINE_CACHE_PREFIX = 'opentools-offline-';

/**
 * Where a bundled engine lives.
 *
 * The build emits every `new Worker(new URL(...))` target into one directory --
 * `dist/client/_next/static/workers/` held three of them on 2026-09-24, for the
 * PDF engine, the background remover and the ID masker. Matching the directory
 * rather than a filename is what keeps this module free of a content hash that
 * changes on most builds. `offline-readiness.test.ts` pins the prefix so a
 * bundler that moves them fails a test instead of quietly reporting an engine
 * that is not held.
 */
export const ENGINE_PATH_PREFIX = '/_next/static/workers/';

export interface OfflineHolding {
  /** Pathnames the offline cache holds, in any order. */
  readonly paths: readonly string[];
  /** The route being asked about, e.g. `/pdf/compress-offline`. */
  readonly route: string;
}

export interface OfflineReadiness {
  /** How many responses are held in total, for the "what is held" line. */
  readonly held: number;
  /** This page's own HTML is held, so the address opens with no network. */
  readonly page: boolean;
  /** An engine bundle is held, so the tool can actually run with no network. */
  readonly engine: boolean;
  /** Both of the above. Anything less is reported as not ready, by name. */
  readonly ready: boolean;
  /** What is missing, in words a reader can act on. Empty when ready. */
  readonly missing: readonly string[];
}

/**
 * Read a cache listing into an answer.
 *
 * Pure, and separated from the browser call for one reason: the interesting
 * cases -- held page and no engine, engine and no page, an empty cache that
 * exists -- are the ones a real browser is least willing to produce on demand,
 * and they are exactly the ones a wrong answer would be shipped in.
 * `offline-readiness.test.ts` walks all of them.
 */
export function summariseOfflineHolding({
  paths,
  route,
}: OfflineHolding): OfflineReadiness {
  const held = new Set(paths);
  const page = held.has(route);
  const engine = [...held].some((path) => path.startsWith(ENGINE_PATH_PREFIX));
  const missing: string[] = [];
  if (!page) missing.push('this page');
  if (!engine) missing.push('the compression engine');
  return { held: held.size, page, engine, ready: page && engine, missing };
}

/** The cache key this build wrote, out of everything the browser holds. */
export function offlineCacheName(keys: readonly string[]): string | undefined {
  /*
    Newest last is not something Cache Storage promises, and two builds can
    briefly coexist while a new worker activates. Either one is a true answer
    to "can this browser work offline", so the first match is taken rather
    than a guess at which is current.
  */
  return keys.find((key) => key.startsWith(OFFLINE_CACHE_PREFIX));
}
