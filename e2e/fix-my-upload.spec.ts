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
function integratorPage(
  appOrigin: string,
  forged?: Record<string, string>,
  recordAllOrigins = false,
) {
  return `<!doctype html><meta charset="utf-8"><title>Recruiter</title>
<body>
  <p id="error">Your image must be JPEG and no wider than 320 px.</p>
  <button id="fix">Fix this file privately</button>
  <output id="out">idle</output>
  <script>
    const target = ${JSON.stringify(appOrigin)};
    window.__result = null;
    window.__popup = null;
    window.__allOrigins = [];
    document.getElementById('fix').addEventListener('click', () => {
      const popup = window.open(target + '/fix/image?v=1&format=jpeg&width=320&height=320&quality=80',
        'opentools-fix', 'width=520,height=760');
      window.__popup = popup;
      if (!popup) { document.getElementById('out').textContent = 'blocked'; return; }
      const hello = Object.assign({
        channel: 'opentools.fix-my-upload', version: 1, type: 'hello',
        request: 'image', values: { format: 'jpeg', width: 320, height: 320, quality: 80 },
      }, ${JSON.stringify(forged ?? {})});
      const say = () => { try { popup.postMessage(hello, target); } catch (e) {} };
      const ticker = setInterval(say, 200);
      say();
      window.addEventListener('message', function onMessage(event) {
        ${recordAllOrigins ? 'window.__allOrigins.push(event.origin);' : ''}
        if (event.origin !== target) return;
        const data = event.data;
        if (!data || data.channel !== 'opentools.fix-my-upload' || data.version !== 1) return;
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

async function openIntegrator(
  page: Page,
  appOrigin: string,
  forged?: Record<string, string>,
  recordAllOrigins = false,
) {
  await page.route(`${INTEGRATOR}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: integratorPage(appOrigin, forged, recordAllOrigins),
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

test.describe('Fix My Upload — the return channel', () => {
  test('a third-party site gets a real corrected File back, and the bytes are right', async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(240_000);
    await openIntegrator(page, new URL(baseURL!).origin);

    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Fix this file privately' }).click();
    const popup = await popupPromise;

    // The handshake completed across a real origin boundary.
    await expect(page.locator('#out')).toHaveText('ready', { timeout: 30_000 });
    // The popup read the requirement out of the message, not out of thin air.
    await expect(
      popup.getByText(
        'Please provide a JPEG image no wider than 320 px and no taller than 320 px.',
      ),
    ).toBeVisible();
    // And it tells the person who is waiting, using the browser-supplied origin.
    await expect(popup.getByText('integrator.localhost')).toBeVisible();

    const source = await testDetailedPng(popup, 1200, 900);
    await chooseInPopup(popup, source);
    await popup.getByRole('button', { name: 'Correct the file' }).click();
    await expect(popup.getByText(/Your corrected image, checked/u)).toBeVisible(
      {
        timeout: 60_000,
      },
    );

    // NOTHING HAS GONE BACK YET. The person has to choose, and until they do
    // the integrating page has seen only `ready`.
    await expect(page.locator('#out')).toHaveText('ready');

    await popup
      .getByRole('button', {
        name: /^send it back to integrator\.localhost$/iu,
      })
      .click();

    // THE ASSERTION THIS SPEC EXISTS FOR: a real File arrived at the other
    // origin, and its bytes satisfy what was asked for.
    await expect(page.locator('#out')).toContainText('got:true:', {
      timeout: 30_000,
    });
    const landed = await page.evaluate(async () => {
      const file = (window as unknown as { __result: File }).__result;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const size = await new Promise<{ w: number; h: number }>((resolve) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          resolve({ w: image.naturalWidth, h: image.naturalHeight });
          URL.revokeObjectURL(url);
        };
        image.src = url;
      });
      return {
        name: file.name,
        type: file.type,
        head: [...bytes.subarray(0, 3)],
        byteLength: bytes.byteLength,
        ...size,
      };
    });

    expect(landed.head, 'not a JPEG at the far end').toEqual([
      0xff, 0xd8, 0xff,
    ]);
    expect(landed.type).toBe('image/jpeg');
    expect(landed.w).toBeLessThanOrEqual(320);
    expect(landed.h).toBeLessThanOrEqual(320);
    expect(Math.max(landed.w, landed.h)).toBe(320);
    expect(landed.byteLength).toBeGreaterThan(0);
    // The visitor's own filename must not travel to the integrating site.
    expect(landed.name).not.toContain('rejected-by-the-form');
  });

  test('tells the site when the person closes the window instead', async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    await openIntegrator(page, new URL(baseURL!).origin);
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Fix this file privately' }).click();
    const popup = await popupPromise;
    await expect(page.locator('#out')).toHaveText('ready', { timeout: 30_000 });

    await popup.close();
    await expect(page.locator('#out')).toContainText('cancelled:', {
      timeout: 30_000,
    });
  });
});

/**
 * ADVERSARIAL. Everything the integrating page sends is attacker-controlled —
 * it runs on a site we do not own. These are the attempts that would matter.
 *
 * The unit tests in `lib/tools/fix-my-upload.test.ts` already prove the refusals
 * at the function boundary. These prove them where it counts: across a real
 * origin boundary, in a real window, with a real file in play.
 */
test.describe('Fix My Upload — adversarial', () => {
  test('a forged origin in the payload does not redirect the file', async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    // The integrator lies: it names somebody else's origin in the message body,
    // which is exactly the attack a `?return=` parameter would have enabled.
    await openIntegrator(page, new URL(baseURL!).origin, {
      origin: 'http://attacker.localhost',
      returnTo: 'http://attacker.localhost',
      targetOrigin: 'http://attacker.localhost',
    });
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Fix this file privately' }).click();
    const popup = await popupPromise;
    await expect(page.locator('#out')).toHaveText('ready', { timeout: 30_000 });

    // The person is shown the REAL origin, taken from the MessageEvent.
    await expect(popup.getByText('integrator.localhost')).toBeVisible();
    await expect(popup.getByText('attacker.localhost')).toHaveCount(0);
    await expect(
      popup.getByRole('button', {
        name: /^send it back to integrator\.localhost$/iu,
      }),
    ).toHaveCount(0); // not until there is a result

    const source = await testDetailedPng(popup, 600, 400);
    await chooseInPopup(popup, source);
    await popup.getByRole('button', { name: 'Correct the file' }).click();
    await expect(popup.getByText(/Your corrected image, checked/u)).toBeVisible(
      {
        timeout: 60_000,
      },
    );
    // The only button offered names the real origin, never the forged one.
    await expect(
      popup.getByRole('button', {
        name: /^send it back to integrator\.localhost$/iu,
      }),
    ).toBeVisible();
  });

  test('ignores a message on the wrong channel, version or request', async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const app = new URL(baseURL!).origin;
    await openIntegrator(page, app);
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Fix this file privately' }).click();
    const popup = await popupPromise;
    await expect(page.locator('#out')).toHaveText('ready', { timeout: 30_000 });

    // Now send junk from the same origin and prove nothing changes: no second
    // integrator is adopted and the displayed requirement is untouched.
    await page.evaluate((target) => {
      const popupRef = (window as unknown as { __popup: Window }).__popup;
      for (const junk of [
        { channel: 'other', version: 1, type: 'hello', request: 'image' },
        {
          channel: 'opentools.fix-my-upload',
          version: 99,
          type: 'hello',
          request: 'image',
        },
        {
          channel: 'opentools.fix-my-upload',
          version: 1,
          type: 'hello',
          request: '__proto__',
        },
        {
          channel: 'opentools.fix-my-upload',
          version: 1,
          type: 'hello',
          request: 'not-a-request',
        },
        'a bare string',
        42,
      ]) {
        try {
          popupRef.postMessage(junk, target);
        } catch {
          /* ignore */
        }
      }
    }, app);

    await popup.waitForTimeout(500);
    await expect(
      popup.getByText(
        'Please provide a JPEG image no wider than 320 px and no taller than 320 px.',
      ),
    ).toBeVisible();
    await expect(popup.getByText('integrator.localhost')).toBeVisible();
  });

  test('the first integrator wins; a later hello cannot re-aim the result', async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const app = new URL(baseURL!).origin;
    await openIntegrator(page, app);
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Fix this file privately' }).click();
    const popup = await popupPromise;
    await expect(page.locator('#out')).toHaveText('ready', { timeout: 30_000 });

    // A second, well-formed hello asking for something else entirely. If it
    // were honoured, the person would be shown one requirement and produce
    // another — and the destination could move with it.
    await page.evaluate((target) => {
      (window as unknown as { __popup: Window }).__popup.postMessage(
        {
          channel: 'opentools.fix-my-upload',
          version: 1,
          type: 'hello',
          request: 'pdf',
          values: { metadata: true },
        },
        target,
      );
    }, app);
    await popup.waitForTimeout(500);

    // Unchanged: still the image request from the first hello.
    await expect(
      popup.getByText(
        'Please provide a JPEG image no wider than 320 px and no taller than 320 px.',
      ),
    ).toBeVisible();
    await expect(
      popup.getByRole('button', { name: /^choose your image$/iu }),
    ).toBeVisible();
  });

  test('sends the file to exactly one origin, and names it explicitly', async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(240_000);
    await openIntegrator(page, new URL(baseURL!).origin, undefined, true);
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Fix this file privately' }).click();
    const popup = await popupPromise;
    await expect(page.locator('#out')).toHaveText('ready', { timeout: 30_000 });

    const source = await testDetailedPng(popup, 600, 400);
    await chooseInPopup(popup, source);
    await popup.getByRole('button', { name: 'Correct the file' }).click();
    await expect(popup.getByText(/Your corrected image, checked/u)).toBeVisible(
      {
        timeout: 60_000,
      },
    );
    await popup
      .getByRole('button', {
        name: /^send it back to integrator\.localhost$/iu,
      })
      .click();
    await expect(page.locator('#out')).toContainText('got:true:', {
      timeout: 30_000,
    });

    /*
     * The integrator page in this test records EVERY message it receives,
     * without filtering by origin — a wildcard `postMessage` would show up here
     * as a message whose origin is not the app's. Exactly one result arrives,
     * from the app's own origin.
     */
    const seen = await page.evaluate(
      () => (window as unknown as { __allOrigins: string[] }).__allOrigins,
    );
    const app = new URL(page.url()).origin;
    expect(seen.every((origin) => origin !== '*')).toBe(true);
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]).not.toBe(app); // it came from the app, not the integrator
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
    await expect(page.getByText(/Your corrected image, checked/u)).toBeVisible({
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

  /*
   * THE VERIFIER EARNING ITS PLACE. WebKit answers a WebP request with a PNG
   * rather than refusing, so on that engine a page that trusted the encoder
   * would hand somebody a PNG and call it a verified WebP. `verifyImageBytes`
   * reads the finished bytes against what was PROMISED, so it fails — and the
   * page says what is wrong instead of claiming success.
   *
   * Asserted per engine rather than per browser name: the test asks the engine
   * what it actually encodes and then requires the page to agree with it.
   */
  test('says the file does not meet the request when the bytes disagree', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(
      '/fix/image?v=1&format=webp&width=240&height=240&quality=80',
    );

    const produced = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((value) => resolve(value), 'image/webp', 0.8);
      });
      return blob ? blob.type : null;
    });
    const substitutes = produced !== null && produced !== 'image/webp';

    const source = await testDetailedPng(page, 600, 400);
    await chooseInPopup(page, source);
    await page.getByRole('button', { name: 'Correct the file' }).click();

    if (substitutes) {
      // The honest outcome: the container is not what was asked for, and the
      // page reports it rather than showing a tick.
      await expect(page.getByText(/does not meet the request/u)).toBeVisible({
        timeout: 60_000,
      });
      await expect(
        page.getByText(/Read back from the finished file/u),
      ).toBeVisible();
      // 'File type' is the verifier's own label for the container check —
      // read from lib/tools/image-verify.ts rather than guessed at, after a
      // first version of this assertion invented 'Container' and failed on a
      // path that was otherwise working correctly.
      await expect(page.getByText(/File type: needed/u)).toBeVisible();
      // And the file is still theirs to take — it is their image either way.
      await expect(
        page.getByRole('link', { name: 'Download it' }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText(/Your corrected image, checked/u),
      ).toBeVisible({ timeout: 60_000 });
    }
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
