import { expect, type Page } from '@playwright/test';

/**
 * The egress detector, extracted so more than one spec can use it.
 *
 * `egress-proof.spec.ts` wrote this and still owns the argument for why each
 * assertion is shaped the way it is; read that file's header first. It moved
 * here unchanged when `egress-sweep.spec.ts` needed the same detector across
 * every tool route, because two copies of a leak detector is how one of them
 * quietly stops detecting.
 */

let sameOrigin = new URL(
  process.env.EGRESS_BASE_URL ??
    `http://localhost:${process.env.E2E_PORT ?? 8788}`,
).host;

/**
 * Take the origin from the config the run is actually using.
 *
 * Without this the default above wins, and a run pointed at a deployed site
 * scores every real request as off-origin.
 */
export function useOriginOf(baseURL: string | undefined) {
  if (baseURL) sameOrigin = new URL(baseURL).host;
}

export function currentSameOrigin() {
  return sameOrigin;
}

export const isOffOrigin = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:')
      return false;
    return !parsed.host.includes(sameOrigin);
  } catch {
    return false;
  }
};

/**
 * What an off-origin request *did*, not that one was attempted.
 *
 * Chromium raises a request event for an XHR the CSP is about to kill, then
 * reports `csp` as the failure and transfers zero bytes; WebKit raises nothing
 * at all. Asserting "nothing was attempted" therefore fails Chromium on a page
 * that is behaving exactly as intended. What matters is that no off-origin
 * request ever received a response, and that anything attempted was refused by
 * policy rather than by a network error that could go the other way tomorrow.
 */
export function watchOffOrigin(page: Page) {
  const responded: string[] = [];
  const refused: string[] = [];
  /**
   * Any request that could be carrying a file out.
   *
   * A GET for a script or a stylesheet cannot. Anything with a body, or a
   * method that implies one, can — including to our own origin, which is the
   * case CSP does not cover and therefore the case worth watching.
   */
  const withBody: string[] = [];
  /**
   * Every request URL, same-origin included.
   *
   * The probe-name check used to scan only `responded`, `refused` and
   * `withBody`. All three exclude a same-origin GET, so a page that put the
   * filename in an image URL — which `default-src 'self'` permits, and which is
   * a real exfiltration shape — was invisible to it. The check passed and
   * proved nothing. Found by mutating the sweep on 2026-09-26; the fix is to
   * scan what was actually requested rather than what was already suspicious.
   */
  const allUrls: string[] = [];

  page.on('request', (request) => {
    allUrls.push(request.url());
  });

  page.on('response', (response) => {
    if (isOffOrigin(response.url())) {
      responded.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (isOffOrigin(request.url())) {
      refused.push(
        `${request.failure()?.errorText ?? 'unknown'} ${request.url()}`,
      );
    }
  });
  page.on('request', (request) => {
    if (request.method() !== 'GET' || request.postData()) {
      withBody.push(`${request.method()} ${request.url()}`);
    }
  });

  return {
    assertNothingLeft(context: string) {
      expect(responded, `${context}: an off-origin host answered`).toEqual([]);
      for (const refusal of refused) {
        expect(refusal, `${context}: refused, but not by policy`).toMatch(
          /csp|blocked|security|refused|denied/iu,
        );
      }
    },

    /** Nothing that could carry a file was sent anywhere, including to us. */
    assertNothingCarriedAFile(context: string, probeName: string) {
      expect(withBody, `${context}: a request with a body was sent`).toEqual(
        [],
      );
      const leaked = allUrls.filter((url) =>
        decodeURIComponent(url).includes(probeName),
      );
      expect(
        leaked,
        `${context}: the probe filename reached a request URL`,
      ).toEqual([]);
    },

    /** Bytes actually put on the wire to anywhere off-origin. Must be zero. */
    async assertZeroBytesOffOrigin(target: Page) {
      const transferred = await target.evaluate(
        (host) =>
          performance
            .getEntriesByType('resource')
            .map((entry) => entry as PerformanceResourceTiming)
            .filter((entry) => !entry.name.includes(host))
            .filter(
              (entry) =>
                !entry.name.startsWith('blob:') &&
                !entry.name.startsWith('data:'),
            )
            .map((entry) => ({ url: entry.name, bytes: entry.transferSize })),
        sameOrigin,
      );
      for (const entry of transferred) {
        expect(entry.bytes, `bytes reached ${entry.url}`).toBe(0);
      }
    },
  };
}
