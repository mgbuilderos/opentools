import { expect, test, type Page, type Request } from '@playwright/test';

/**
 * The nine counters, driven in a real browser in both engines.
 *
 * The unit suite proves the module's shape; this proves what actually leaves
 * the page when somebody uses the site. Everything below asserts on **observed
 * network**, never on a return value — `navigator.sendBeacon` returning `true`
 * for a blocked request is the trap `egress-proof.spec.ts` records, and the
 * same discipline applies to an `Image`, whose `src` assignment succeeds
 * whether or not anything is fetched.
 *
 * ADR-020 is the decision. `lib/product-telemetry.ts` is the implementation.
 */

const TELEMETRY = /\/telemetry\/v1\//u;

/** Every telemetry request the page made, in order, with everything about it. */
function watchSignals(page: Page) {
  const seen: { url: string; method: string; body: string | null }[] = [];
  const failed: string[] = [];
  const all: string[] = [];
  const onRequest = (request: Request) => {
    all.push(request.url());
    if (!TELEMETRY.test(request.url())) return;
    seen.push({
      url: request.url(),
      method: request.method(),
      body: request.postData(),
    });
  };
  const onFailed = (request: Request) => {
    if (TELEMETRY.test(request.url())) failed.push(request.url());
  };
  page.on('request', onRequest);
  page.on('requestfailed', onFailed);
  return {
    seen,
    failed,
    all,
    /**
     * Every telemetry path the page ASKED for, whether or not it arrived.
     *
     * `request` fires in both engines for a request that is then refused —
     * measured 2026-09-28: an aborted route gives Chromium `request` +
     * `requestfailed` and WebKit `request` + `requestfinished`. So `seen` is
     * the attempt, and `failed` says separately whether it got through.
     * Counting both together double-counted one aborted request as two.
     */
    paths: () => seen.map((entry) => new URL(entry.url).pathname),
    /** Failures the browser reported, for tests that can wait for one. */
    failureCount: () => failed.length,
    stop: () => {
      page.off('request', onRequest);
      page.off('requestfailed', onFailed);
    },
  };
}

/**
 * Make the document look installed.
 *
 * Playwright has no display-mode emulation, so `matchMedia` is wrapped before
 * any application script runs. `navigator.standalone` is set alongside it
 * because that is the only signal Safari gives and it is the branch iOS takes.
 */
async function pretendStandalone(page: Page) {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) =>
      query.includes('display-mode: standalone')
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList)
        : real(query)) as typeof window.matchMedia;
    Object.defineProperty(navigator, 'standalone', {
      value: true,
      configurable: true,
    });
  });
}

/**
 * Run a real tool to completion and return when the result is downloadable.
 *
 * `/image/optimize` deliberately: it is the route `egress-proof.spec.ts`
 * already drives, so a failure here is about telemetry rather than about a
 * tool that was already broken. The file is built in the page and handed over
 * exactly as a file picker would, after hydration — assigning `input.files`
 * before React attaches is silently discarded and reads as a broken tool.
 */
async function handOverImage(page: Page, filename: string, stamp: string) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(
    async ({ name, text }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 180;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#2a6f4f';
      context.fillRect(0, 0, 240, 180);
      context.fillStyle = '#ffffff';
      context.font = '16px monospace';
      context.fillText(text, 10, 90);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
      const file = new File([await blob!.arrayBuffer()], name, {
        type: 'image/png',
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { name: filename, text: stamp },
  );
}

/** Press the button and wait until the result is offered for saving. */
async function runOptimise(page: Page) {
  const run = page.getByRole('button', { name: /optimi[sz]e image/iu });
  await expect(run).toBeEnabled({ timeout: 15_000 });
  await run.click();
  await expect(
    page.locator('[data-receipt-download], a[download]').first(),
  ).toBeVisible({ timeout: 30_000 });
}

async function optimiseAnImage(page: Page, filename: string, stamp: string) {
  await handOverImage(page, filename, stamp);
  await runOptimise(page);
}

test.describe('the counter assets themselves', () => {
  test('answer 200 and refuse to be cached', async ({ request }) => {
    const response = await request.get('/telemetry/v1/completed-web.svg');
    expect(response.status()).toBe(200);
    // The one header the whole design depends on. A cacheable counter is
    // answered from a copy on the second event and stops counting, and the
    // flat line reads as a site nobody uses.
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['content-type']).toContain('image/svg');
  });

  test('carry nothing that could identify anyone', async ({ request }) => {
    const response = await request.get('/telemetry/v1/pwa-launch.svg');
    expect(response.headers()['set-cookie']).toBeUndefined();
    const body = await response.text();
    expect(body.length).toBeLessThan(400);
    expect(body).not.toMatch(/script|id=|data-/iu);
  });

  test('do not relax the policy that makes the promise real', async ({
    request,
  }) => {
    const tool = await request.get('/image/optimize');
    const csp = tool.headers()['content-security-policy'] ?? '';
    // Unchanged by this feature, which is the point of using an image.
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("img-src 'self'");
  });
});

test.describe('completing a real tool', () => {
  test('sends exactly one success signal, on a fixed path, with no payload', async ({
    page,
  }) => {
    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    await optimiseAnImage(page, 'telemetry-probe-a1b2c3.png', 'PROBE-A1B2C3');

    // The signal is issued synchronously inside `announceCompletion`, but the
    // request itself is the browser's to schedule. Poll rather than assume.
    await expect.poll(() => watcher.paths().length, { timeout: 10_000 }).toBe(1);

    const [signal] = watcher.seen;
    expect(new URL(signal.url).pathname).toBe('/telemetry/v1/completed-web.svg');
    expect(new URL(signal.url).search).toBe('');
    expect(new URL(signal.url).hash).toBe('');
    expect(signal.method).toBe('GET');
    expect(signal.body).toBeNull();
    // Same origin as the page, so a self-hosted instance can only reach itself.
    expect(new URL(signal.url).origin).toBe(new URL(page.url()).origin);
  });

  test('sends no second success signal for a second completion', async ({
    page,
  }) => {
    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    await optimiseAnImage(page, 'telemetry-probe-first.png', 'FIRST');
    await expect.poll(() => watcher.paths().length, { timeout: 10_000 }).toBe(1);

    await optimiseAnImage(page, 'telemetry-probe-second.png', 'SECOND');
    // Give the second run every chance to produce one. It must not.
    await page.waitForTimeout(1500);
    expect(watcher.paths()).toEqual(['/telemetry/v1/completed-web.svg']);
  });

  test('selects the PWA path when the document is standalone', async ({
    page,
  }) => {
    await pretendStandalone(page);
    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    // A standalone document also reports its own launch, once.
    await expect
      .poll(() => watcher.paths(), { timeout: 10_000 })
      .toContain('/telemetry/v1/pwa-launch.svg');

    await optimiseAnImage(page, 'telemetry-probe-pwa.png', 'PWA');
    await expect
      .poll(() => watcher.paths(), { timeout: 10_000 })
      .toContain('/telemetry/v1/completed-pwa.svg');
    expect(watcher.paths()).not.toContain('/telemetry/v1/completed-web.svg');
    expect(
      watcher.paths().filter((p) => p === '/telemetry/v1/pwa-launch.svg'),
    ).toHaveLength(1);
  });

  test('records no launch signal in an ordinary browser tab', async ({
    page,
  }) => {
    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(watcher.paths()).toEqual([]);
  });
});

test.describe('a counter can never damage the work', () => {
  test('the tool still produces its result when the signal is aborted', async ({
    page,
  }) => {
    await page.route('**/telemetry/v1/**', (route) => route.abort());
    const watcher = watchSignals(page);
    await page.goto('/image/optimize');

    // The real assertion is inside: `optimiseAnImage` only returns once the
    // download link is visible, so reaching the end means the output survived.
    await optimiseAnImage(page, 'telemetry-probe-aborted.png', 'ABORTED');

    const download = page.locator('[data-receipt-download], a[download]').first();
    await expect(download).toBeVisible();

    // One attempt, which the route refused.
    await expect
      .poll(() => watcher.paths(), { timeout: 10_000 })
      .toEqual(['/telemetry/v1/completed-web.svg']);

    // And no retry followed the failure. This is the assertion that matters:
    // a retry would turn one event into several and would mean holding state
    // about a request that did not happen.
    await page.waitForTimeout(2000);
    expect(watcher.paths()).toHaveLength(1);
  });

  test('an offline completion succeeds, and nothing is replayed afterwards', async ({
    page,
    context,
  }) => {
    /*
     * `/text/word-counter`, not `/image/optimize`, and the reason is a real
     * finding rather than a convenience. Measured 2026-09-28 in both engines:
     * the optimiser never produces a download with the network cut, because
     * clicking Run starts a worker whose script it fetches at that moment, and
     * the worker is not in the service worker's precache. So `/image/optimize`
     * is NOT an offline-capable tool today, and using it here would have made
     * this test fail for a reason that has nothing to do with telemetry.
     *
     * The word counter runs entirely inside the chunk the page already loaded,
     * which is what makes it a truthful subject for "the job still finishes
     * with no network". It also goes through `text-workbench-tool.tsx`, one of
     * the shared workbenches that covers hundreds of operations at a single
     * `announceCompletion`.
     */
    const watcher = watchSignals(page);
    await page.goto('/text/word-counter');
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    await page
      .locator('main textarea')
      .first()
      .fill('one two three four five');

    // The work itself succeeded with no network: the count is on the page.
    await expect(page.locator('main')).toContainText('5', { timeout: 15_000 });

    /*
     * WAIT FOR THE ATTEMPT WHILE STILL OFFLINE. Reading the count the moment
     * the result appears gives zero — the `request` event trails the `img.src`
     * assignment by a little — and then the event arrives during the
     * reconnection wait below and reads exactly like a replay. That is what
     * this test reported on its first run, and it was the test's timing rather
     * than the product's behaviour.
     */
    await expect
      .poll(() => watcher.paths(), { timeout: 10_000 })
      .toEqual(['/telemetry/v1/completed-web.svg']);
    const attemptedOffline = watcher.paths().length;

    /*
     * Whether the engine then reports that attempt as failed is not asserted:
     * measured 2026-09-28, neither Chromium nor WebKit had emitted
     * `requestfailed` by the time the result was on screen, and waiting for
     * one would be a flake dressed as a guarantee. The requirement is that the
     * job finishes with no network and that reconnecting produces no second
     * request — and nothing is queued because there is nowhere to queue it:
     * `recordProductSignal` sets `img.src` and forgets, and `onerror` only
     * releases the reference.
     */

    // Back online. Nothing may arrive late: there is no queue and no replay.
    await context.setOffline(false);
    await page.waitForTimeout(3000);
    expect(
      watcher.paths().length,
      'a signal was replayed after the network came back',
    ).toBe(attemptedOffline);
  });
});

test.describe('installation, only where the engine supports it', () => {
  test('appinstalled records one installation', async ({ page, browserName }) => {
    // `appinstalled` is Chromium's. Firing a synthetic event in WebKit would
    // test our own listener against an event that engine never sends, which
    // is a test of nothing.
    test.skip(browserName !== 'chromium', 'appinstalled is Chromium-only');

    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect
      .poll(() => watcher.paths(), { timeout: 10_000 })
      .toEqual(['/telemetry/v1/pwa-installed.svg']);

    /*
     * A SECOND `appinstalled` IN THE SAME DOCUMENT PRODUCES NO SECOND REQUEST,
     * and that is the browser rather than this code. Measured 2026-09-28 in
     * both engines: three `new Image()` assignments of one identical URL in
     * one document produce **one** network request, and a fourth to a
     * different path produces a second — so it is per-URL de-duplication in
     * the in-memory resource cache, which `Cache-Control: no-store` does not
     * bypass within a document.
     *
     * It costs nothing here, because every one of the nine is at most once per
     * document by design. It is recorded as a measured undercount in ADR-020
     * rather than left to be rediscovered, and it is deliberately NOT relied
     * on as the once-per-document guarantee — that is `completionRecorded`,
     * and the mutation test proves removing it fails.
     */
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await page.waitForTimeout(2000);
    expect(watcher.paths()).toEqual(['/telemetry/v1/pwa-installed.svg']);
  });

  test('an identical path twice in one document is de-duplicated by the browser', async ({
    page,
  }) => {
    // The measurement behind the note above, kept as a test so that a future
    // engine change is noticed here rather than in a number that quietly rose.
    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const held: HTMLImageElement[] = [];
      (window as unknown as { __held: unknown }).__held = held;
      for (let index = 0; index < 3; index += 1) {
        const image = new Image();
        held.push(image);
        image.src = '/telemetry/v1/pwa-installed.svg';
      }
      const other = new Image();
      held.push(other);
      other.src = '/telemetry/v1/pwa-launch.svg';
    });
    await expect.poll(() => watcher.paths().length, { timeout: 10_000 }).toBe(2);
    expect(watcher.paths().sort()).toEqual([
      '/telemetry/v1/pwa-installed.svg',
      '/telemetry/v1/pwa-launch.svg',
    ]);
  });

  test('beforeinstallprompt alone records no installation', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'beforeinstallprompt is Chromium-only');

    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt?: () => Promise<void>;
      };
      event.prompt = async () => undefined;
      window.dispatchEvent(event);
    });
    await page.waitForTimeout(1200);
    // The event that means "we could offer an install" is not an install, and
    // is not an offer either — the banner waits for a finished job.
    expect(watcher.paths()).toEqual([]);
  });
});

test.describe('the share target, with nothing about the file', () => {
  test('an arrival the service worker produced is counted once', async ({
    page,
  }) => {
    const watcher = watchSignals(page);
    // What `public/sw.js` redirects to after answering the share POST: the
    // tool, with the handoff flag, and no sessionStorage marker — because a
    // service worker has none to set. That absence is the whole discriminator.
    await page.goto('/image/optimize?shared=1');
    await expect
      .poll(() => watcher.paths(), { timeout: 10_000 })
      .toEqual(['/telemetry/v1/share-target-opened.svg']);

    // No part of the URL, and nothing about any file, travelled with it.
    expect(new URL(watcher.seen[0].url).search).toBe('');
  });

  test('ordinary navigation to the share target is not counted', async ({
    page,
  }) => {
    const watcher = watchSignals(page);
    await page.goto('/share-target');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    expect(watcher.paths()).toEqual([]);
  });

  test('an in-page handoff is not mistaken for a share', async ({ page }) => {
    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    await page.waitForLoadState('networkidle');
    // The marker every in-page route raises before navigating, via `offerFile`.
    await page.evaluate(() =>
      sessionStorage.setItem('opentools-handoff-waiting', '1'),
    );
    await page.goto('/image/optimize?shared=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    expect(watcher.paths()).toEqual([]);
  });
});

test.describe('refusing to be counted', () => {
  test('a local opt-out stops every signal', async ({ page }) => {
    await page.goto('/image/optimize');
    await page.evaluate(() =>
      localStorage.setItem('opentools-product-signals', 'off'),
    );

    const watcher = watchSignals(page);
    await page.goto('/image/optimize');
    await optimiseAnImage(page, 'telemetry-probe-optout.png', 'OPTOUT');
    await page.waitForTimeout(1500);
    expect(watcher.paths()).toEqual([]);
  });

  test('the privacy page offers the switch and states what is counted', async ({
    page,
  }) => {
    await page.goto('/privacy');
    await expect(
      page.getByRole('heading', { name: /nine anonymous counters/iu }),
    ).toBeVisible();
    await expect(page.getByText('/telemetry/v1/completed-web.svg')).toBeVisible();
    const toggle = page.getByRole('button', { name: /turn them (off|on)/iu });
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();
    await expect(
      page.getByRole('button', { name: /turn them on/iu }),
    ).toBeVisible();
  });
});

/**
 * THE CANARY.
 *
 * A uniquely named file and a uniquely worded input go through a real tool,
 * and then every request the page made — URL, method, headers and body — is
 * searched for either of them. The only new request permitted is one of the
 * nine allowlisted paths.
 *
 * Both canaries are checked against *every* request rather than against the
 * telemetry ones, because a leak that mattered would not announce itself by
 * appearing on a path called `/telemetry/`.
 */
test('no canary value appears in any request the page makes', async ({
  page,
}) => {
  const CANARY_FILE = 'canary-ravenous-thimble-91d4e7.png';
  const CANARY_TEXT = 'CANARY-QUIXOTIC-LANTERN-5B8F2A';

  const requests: { url: string; method: string; headers: Record<string, string>; body: string | null }[] = [];
  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      body: request.postData(),
    });
  });

  await page.goto('/image/optimize');
  const before = requests.length;
  await optimiseAnImage(page, CANARY_FILE, CANARY_TEXT);
  await expect
    .poll(
      () => requests.filter((entry) => TELEMETRY.test(entry.url)).length,
      { timeout: 10_000 },
    )
    .toBe(1);

  const haystack = requests
    .map((entry) =>
      [
        entry.url,
        entry.method,
        JSON.stringify(entry.headers),
        entry.body ?? '',
      ].join(' '),
    )
    .join('\n');

  for (const canary of [
    CANARY_FILE,
    CANARY_TEXT,
    'canary-ravenous-thimble',
    'QUIXOTIC-LANTERN',
  ]) {
    expect(haystack, `the canary "${canary}" appeared in a request`).not.toContain(
      canary,
    );
  }

  // The only request that may be new after the operation is the allowlisted
  // counter. Anything else appearing here is what this test exists to catch.
  const after = requests.slice(before).map((entry) => new URL(entry.url));
  const offOrigin = after.filter(
    (url) => url.origin !== new URL(page.url()).origin,
  );
  expect(offOrigin.map(String), 'an off-origin request was made').toEqual([]);

  const telemetry = after.filter((url) => TELEMETRY.test(url.href));
  expect(telemetry.map((url) => url.pathname)).toEqual([
    '/telemetry/v1/completed-web.svg',
  ]);
  for (const url of telemetry) {
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  }
  // And no request anywhere carried a body during the operation.
  expect(
    requests.slice(before).filter((entry) => entry.body),
    'a request with a body was made during the operation',
  ).toEqual([]);
});
