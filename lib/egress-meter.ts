/**
 * A measurement of what this page actually sent, taken from the browser's own
 * instrumentation rather than from anything this project says about itself.
 *
 * WHY THIS EXISTS. Every file site on the internet has a badge that says
 * "private" or "secure", and nobody believes any of them, correctly — a badge
 * is a sentence the site wrote about itself. This is not that. It is a running
 * instrument fed by `PerformanceObserver`, showing a number the browser
 * measured, next to the file while the person works.
 *
 * WHAT IT COUNTS, AND WHY THAT AND NOT BYTES. There is no browser API that
 * reports request *body* size — `PerformanceResourceTiming.transferSize` is
 * bytes received, not sent — so a literal "bytes uploaded" meter cannot be
 * measured and would be a number we made up. What can be measured exactly is
 * *the requests capable of carrying a file*: `fetch`, `XMLHttpRequest` and
 * `sendBeacon` all appear in resource timing under a known `initiatorType`.
 * A file cannot leave this page without one of them. So the instrument counts
 * those, and `transferSize` alongside, and both are observed facts.
 *
 * This deliberately does NOT count the page's own assets. Scripts, fonts and
 * stylesheets are the bytes that arrived to make the page work; counting them
 * would make the reading jitter for reasons that have nothing to do with the
 * person's file, and the question being answered is "did my document go
 * anywhere", not "did this page load".
 *
 * WHAT IT MUST NOT SAY. `lib/tools/local-source-policy.test.ts` forbids this
 * codebase from printing a settled zero-upload claim, because the release
 * egress proof that would justify one has not been run (decision 5, rule 23).
 * That rule is right and this file respects it: nothing here settles the
 * question. It reports a count. A reading of zero is evidence a
 * person can watch accumulate — or fail to — which is worth more than a claim
 * anyway, and it stays on the page, never on an output file (rule 33).
 */

/** The initiator types that can carry a file body out of the page. */
const CARRIERS = new Set(['fetch', 'xmlhttprequest', 'beacon']);

export interface EgressReading {
  /** Requests observed that were capable of carrying a file body. */
  requests: number;
  /** Bytes transferred on those requests, as the browser reports them. */
  bytes: number;
  /** False when this browser exposes no resource timing to read. */
  measurable: boolean;
}

export const EMPTY_READING: EgressReading = {
  requests: 0,
  bytes: 0,
  measurable: true,
};

interface TimingLike {
  initiatorType?: string;
  transferSize?: number;
}

/** Fold resource-timing entries into a reading. Pure, so it can be tested. */
export function readingFrom(
  entries: readonly TimingLike[],
  base: EgressReading = EMPTY_READING,
): EgressReading {
  let { requests, bytes } = base;
  for (const entry of entries) {
    if (!CARRIERS.has((entry.initiatorType || '').toLowerCase())) continue;
    requests += 1;
    bytes += Number.isFinite(entry.transferSize)
      ? (entry.transferSize ?? 0)
      : 0;
  }
  return { requests, bytes, measurable: base.measurable };
}

/** A byte count for display. Small numbers stay literal on purpose. */
export function formatEgressBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 bytes';
  if (bytes < 1024) return `${Math.round(bytes)} bytes`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

/**
 * Watch for the lifetime of the page, calling back on every change.
 * Returns an unsubscribe function. Safe to call during server rendering, where
 * it reports "not measurable" rather than pretending to a reading of zero.
 */
export function observeEgress(
  onReading: (reading: EgressReading) => void,
): () => void {
  if (
    typeof window === 'undefined' ||
    typeof PerformanceObserver === 'undefined'
  ) {
    onReading({ requests: 0, bytes: 0, measurable: false });
    return () => {};
  }
  let reading = EMPTY_READING;
  const publish = (entries: readonly TimingLike[]) => {
    const next = readingFrom(entries, reading);
    if (next.requests === reading.requests && next.bytes === reading.bytes)
      return;
    reading = next;
    onReading(reading);
  };
  try {
    // Anything that already happened before this component mounted still
    // counts; a meter that only watches from mount could miss the one request
    // it exists to catch.
    publish(performance.getEntriesByType('resource') as TimingLike[]);
    const observer = new PerformanceObserver((list) =>
      publish(list.getEntries() as TimingLike[]),
    );
    observer.observe({ type: 'resource', buffered: true });
    onReading(reading);
    return () => observer.disconnect();
  } catch {
    onReading({ requests: 0, bytes: 0, measurable: false });
    return () => {};
  }
}

/**
 * A reading taken right now, for the moment a job finishes. Same source and
 * same rules as `observeEgress`; this one does not subscribe.
 */
export function currentEgressReading(): EgressReading {
  if (typeof performance === 'undefined' || !performance.getEntriesByType)
    return { requests: 0, bytes: 0, measurable: false };
  try {
    return readingFrom(
      performance.getEntriesByType('resource') as TimingLike[],
    );
  } catch {
    return { requests: 0, bytes: 0, measurable: false };
  }
}
