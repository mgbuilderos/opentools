import { expect, test, type Page } from '@playwright/test';

import { testDetailedPng } from './fixtures';

/**
 * Fix My Upload, driven the way a real integration runs it.
 *
 * WHY THERE IS A FAKE SITE IN HERE. The whole feature is about a *different
 * origin* asking for a file and getting one back, and a test that called the
 * functions directly would prove none of it: not that `window.open` reaches the
 * page, not that the handshake completes across an origin boundary, not that a
 * `File` survives a structured clone, and not that the bytes are right at the
 * far end. So the integrator is served as its own origin through route
 * interception, and everything below happens between two real windows.
 *
 * `integrator.localhost` is used because it is a genuinely distinct origin from
 * the app under test while still being a local development host — which is the
 * one case `isReturnableOrigin` allows over plaintext, and the app is served
 * over plaintext here. An https fake would be mixed content and the popup would
 * never open.
 */

const INTEGRATOR = 'http://integrator.localhost';

/**
 * A minimal site with an upload that "rejected" a file, wired exactly as the
 * copy-paste snippet on `/fix` is. Kept deliberately close to that snippet:
 * if the two drift, this test stops proving what the page tells people to do.
 */
function integratorPage(appOrigin: string) {
  return `<!doctype html><meta charset="utf-8"><title>Recruiter</title>
<body>
  <p id="error">Your image must be JPEG and no wider than 320 px.</p>
  <button id="fix">Fix this file privately</button>
  <output id="out">idle</output>
  <script>
    const target = ${JSON.stringify(appOrigin)};
    window.__result = null;
    document.getElementById('fix').addEventListener('click', () => {
      const popup = window.open(target + '/fix/image?v=1&format=jpeg&width=320&height=320&quality=80',
        'opentools-fix', 'width=520,height=760');
      window.__popup = popup;
      if (!popup) { document.getElementById('out').textContent = 'blocked'; return; }
      const hello = {
        channel: 'opentools.fix-my-upload', version: 1, type: 'hello',
        request: 'image', values: { format: 'jpeg', width: 320, height: 320, quality: 80 },
      };
      const say = () => { try { popup.postMessage(hello, target); } catch (e) {} };
      const ticker = setInterval(say, 200);
      say();
      window.addEventListener('message', function onMessage(event) {
        if (event.origin !== target) return;
        const data = event.data;
        if (!data || data.channel !== hello.channel || data.version !== 1) return;
        if (data.type === 'ready') { clearInterval(ticker); document.getElementById('out').textContent = 'ready'; return; }
        if (data.type === 'result') {
          clearInterval(ticker);
          window.removeEventListener('message', onMessage);
          const file = data.file;
          window.__result = file;
          document.getElementById('out').textContent =
            'got:' + (file instanceof File) + ':' + file.name + ':' + file.type + ':' + file.size;
          return;
        }
        if (data.type === 'cancelled') {
          clearInterval(ticker);
          document.getElementById('out').textContent = 'cancelled:' + data.reason;
        }
      });
    });
  </script>
</body>`;
}

async function openIntegrator(page: Page, appOrigin: string) {
  await page.route(`${INTEGRATOR}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: integratorPage(appOrigin),
    }),
  );
  await page.goto(`${INTEGRATOR}/apply`);
  await expect(page.getByText('Your image must be JPEG')).toBeVisible();
}

/** Choose a file in the popup, which is its own page. */
async function chooseInPopup(popup: Page, buffer: Buffer) {
  await popup.waitForLoadState('networkidle');
  await expect(async () => {
    const chooser = popup.waitForEvent('filechooser', { timeout: 5_000 });
    await popup.getByRole('button', { name: /^choose your image$/iu }).click();
    await (
      await chooser
    ).setFiles({
      name: 'rejected-by-the-form.png',
      mimeType: 'image/png',
      buffer,
    });
    await expect(popup.getByText('rejected-by-the-form.png')).toBeVisible({
      timeout: 5_000,
    });
  }).toPass({ timeout: 45_000 });
}

/**
 * THE RETURN CHANNEL IS BLOCKED BY A HEADER, AND THIS IS THE MEASUREMENT.
 *
 * `next.config.ts` and `public/_headers` both send
 * `Cross-Origin-Opener-Policy: same-origin` on every route. That severs the
 * browsing-context group between a cross-origin opener and this site, so a
 * third-party page that calls `window.open` gets a handle that immediately
 * reports `closed`, and the popup's own `window.opener` is `null`. Neither side
 * can `postMessage` to the other, so mode B cannot work — and no amount of
 * client-side cleverness changes it, because the browser has cut the link
 * before any script runs.
 *
 * The alternative route is an `iframe`, which `frame-ancestors 'none'` closes
 * just as firmly (see `lib/security/embed-framing.test.ts`).
 *
 * So the capability needs an owner-level decision — a route-scoped
 * `Cross-Origin-Opener-Policy: unsafe-none` on `/fix/*`, exactly parallel to
 * what ADR-019 did for `frame-ancestors` on `/embed/*`. That is a security
 * relaxation on shared files, and the brief says to preserve these directives,
 * so it is not this lane's call to make.
 *
 * The test below is a GUARD rather than a skip: it asserts the severing that
 * exists today. The day COOP changes for these routes it goes red, which is the
 * signal to enable the two `fixme` tests under it.
 */
test.describe('Fix My Upload — the return channel', () => {
  test('the opener is severed today, which is why mode B is not live', async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    await openIntegrator(page, new URL(baseURL!).origin);
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Fix this file privately' }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');

    expect(
      await popup.evaluate(() => window.opener === null),
      'window.opener is no longer null — COOP has changed, so enable the two ' +
        'fixme tests below and delete this guard',
    ).toBe(true);
    expect(
      await page.evaluate(
        () => (window as unknown as { __popup?: Window }).__popup?.closed,
      ),
    ).not.toBe(false);

    // And the page degrades honestly rather than hanging: no opener means no
    // offer to send anything anywhere.
    await expect(
      popup.getByRole('button', { name: /send it back/iu }),
    ).toHaveCount(0);
  });

  test.fixme('a third-party site gets a real corrected File back, and the bytes are right', async () => {
    /* Enable once `/fix/*` may send Cross-Origin-Opener-Policy: unsafe-none.
         The flow, the handshake and the byte assertions are written and were
         proven against the transport in lib/tools/fix-my-upload.test.ts; what
         cannot be exercised is the window boundary itself. */
  });

  test.fixme('tells the site when the person closes the window instead', async () => {
    /* Same blocker. */
  });
});

test.describe('Fix My Upload — without an integration', () => {
  test('a plain link still works, and offers only a download', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(
      '/fix/image?v=1&format=jpeg&width=240&height=240&quality=80',
    );
    await expect(
      page.getByText('Please provide a JPEG image no wider than 240 px'),
    ).toBeVisible();

    const source = await testDetailedPng(page, 800, 600);
    await chooseInPopup(page, source);
    await page.getByRole('button', { name: 'Correct the file' }).click();
    await expect(page.getByText('Your corrected image')).toBeVisible({
      timeout: 60_000,
    });

    // No opener, so there is nowhere to send it and no button offering to.
    await expect(
      page.getByRole('button', { name: /send it back/iu }),
    ).toHaveCount(0);
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download it' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.jpe?g$/u);
  });

  test('is noindex, and the integration page is not', async ({ page }) => {
    await page.goto('/fix/image?v=1&format=jpeg');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await page.goto('/fix');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow',
    );
  });

  test('an unknown request type is a 404', async ({ page }) => {
    const response = await page.goto('/fix/not-a-request');
    expect(response?.status()).toBe(404);
  });

  test('works at 375 px with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await page.goto('/fix/image?v=1&format=jpeg&width=320');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Prepare an image' }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
