import { expect, test, type BrowserContext, type Page, type Worker } from '@playwright/test';

/**
 * The share target, the install offer and offline use — the three things that
 * only exist once the site is installed as an app.
 *
 * All of them are Chromium behaviour. WebKit fires no `beforeinstallprompt`,
 * has no share target and no file handlers, and installing there is a manual
 * Add to Home Screen. Running these in WebKit would assert nothing.
 */
test.describe('installed-app behaviour', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'share targets, file handlers and install prompts are Chromium-only',
  );

  /** The worker that is actually controlling the page, not merely registered. */
  async function activeWorker(context: BrowserContext, page: Page): Promise<Worker> {
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 30_000,
    });
    const worker = context.serviceWorkers().find((entry) => entry.url().endsWith('/sw.js'));
    expect(worker, 'no service worker is running for this origin').toBeTruthy();
    return worker as Worker;
  }

  /** Waits for `install` to have finished writing the offline payload. */
  async function waitForPrecache(worker: Worker) {
    await expect
      .poll(
        async () =>
          await worker.evaluate(async () => {
            const names = await caches.keys();
            const name = names.find((entry) => entry.startsWith('opentools-offline-'));
            if (!name) return 0;
            return (await (await caches.open(name)).keys()).length;
          }),
        { timeout: 30_000, message: 'the worker never filled its offline cache' },
      )
      .toBeGreaterThan(5);
  }

  test('accepts a shared file and opens it in the tool for its kind', async ({
    context,
    page,
  }) => {
    await page.goto('/');
    const worker = await activeWorker(context, page);

    /*
     * The POST is handed to the worker's own handler rather than submitted
     * from the page, because the page cannot make one: this origin is served
     * `form-action 'none'` and `connect-src 'none'`, so a form submit and a
     * `fetch` are both refused by design. What the browser does on a share is
     * dispatch exactly this request to exactly this function, so this drives
     * the same code with the same multipart body.
     */
    const outcome = await worker.evaluate(async () => {
      const body = new FormData();
      body.append(
        'file',
        new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'bank-statement.pdf', {
          // The type Android hands over for a document forwarded from a chat
          // app: no useful MIME type at all, only the name to go on.
          type: 'application/octet-stream',
        }),
      );
      const request = new Request('/share-target', { method: 'POST', body });
      const response = await (
        self as unknown as { acceptShare: (request: Request) => Promise<Response> }
      ).acceptShare(request);
      return { status: response.status, location: response.headers.get('Location') };
    });

    expect(outcome.status).toBe(303);
    expect(outcome.location).toContain('/pdf/page-tools');
    expect(outcome.location).toContain('shared=1');

    // The redirect the browser would follow. The file has to be in the tool
    // when it gets there, with nobody having chosen it from a picker.
    await page.goto(new URL(outcome.location as string).pathname + new URL(outcome.location as string).search);
    const input = page.locator('input[type="file"]').first();
    await expect(input).toBeAttached({ timeout: 15_000 });
    await expect
      .poll(async () => await input.evaluate((node: HTMLInputElement) => node.files?.[0]?.name ?? ''), {
        timeout: 15_000,
        message: 'the shared file never reached the tool',
      })
      .toBe('bank-statement.pdf');
  });

  test('sends each kind of file to its own tool', async ({ context, page }) => {
    await page.goto('/');
    const worker = await activeWorker(context, page);

    const routed = await worker.evaluate(async () => {
      const share = (
        self as unknown as { acceptShare: (request: Request) => Promise<Response> }
      ).acceptShare;
      const cases: [string, string][] = [
        ['photo.jpg', 'image/jpeg'],
        ['ledger.csv', 'application/octet-stream'],
        ['payload.json', ''],
        ['archive.bin', ''],
      ];
      const results: Record<string, string> = {};
      for (const [name, type] of cases) {
        const body = new FormData();
        body.append('file', new File([new Uint8Array([1, 2, 3])], name, { type }));
        const response = await share(new Request('/share-target', { method: 'POST', body }));
        results[name] = new URL(response.headers.get('Location') as string).pathname;
      }
      return results;
    });

    expect(routed).toEqual({
      'photo.jpg': '/image/optimize',
      'ledger.csv': '/data/csv-to-json',
      'payload.json': '/developer/workbench',
      'archive.bin': '/file/hash-calculator',
    });
  });

  test('sends a share with nothing usable in it to the front page', async ({
    context,
    page,
  }) => {
    await page.goto('/');
    const worker = await activeWorker(context, page);

    const location = await worker.evaluate(async () => {
      const response = await (
        self as unknown as { acceptShare: (request: Request) => Promise<Response> }
      ).acceptShare(new Request('/share-target', { method: 'POST', body: new FormData() }));
      return new URL(response.headers.get('Location') as string).pathname;
    });

    // Never an error page: a standalone window has no address bar to escape
    // from, so the worst outcome has to still be a usable site.
    expect(location).toBe('/');
  });

  test('serves the app with the network switched off', async ({ context, page }) => {
    await page.goto('/');
    const worker = await activeWorker(context, page);
    await waitForPrecache(worker);

    await context.setOffline(true);
    try {
      // The browser genuinely has no network here, which is the only condition
      // under which the worker answers a GET at all.
      expect(await worker.evaluate(() => self.navigator.onLine)).toBe(false);

      const response = await page.goto('/pdf/merge');
      expect(response?.status(), 'the cached page did not answer').toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('input[type="file"]').first()).toBeAttached({
        timeout: 15_000,
      });

      /*
       * The point of the whole design. A response the worker synthesised does
       * not arrive with the origin's headers, so if the worker did not put
       * them back this would be the one page on the site that is not sealed.
       */
      expect(
        response?.headers()['content-security-policy'],
        'the offline page shipped without the policy that seals it',
      ).toContain("connect-src 'none'");

      // And the page really is sealed, not merely labelled.
      const blocked = await page.evaluate(async () => {
        try {
          await fetch('/site.webmanifest');
          return 'allowed';
        } catch (error) {
          return (error as Error).name;
        }
      });
      expect(blocked).toBe('TypeError');
    } finally {
      await context.setOffline(false);
    }
  });

  test('leaves pages it holds no bytes for to the browser', async ({ context, page }) => {
    await page.goto('/');
    const worker = await activeWorker(context, page);
    await waitForPrecache(worker);

    await context.setOffline(true);
    try {
      // Stepping aside is the correct answer for anything not precached: the
      // browser shows its own error, which is honest, rather than ours.
      const failed = await page
        .goto('/pdf/sign')
        .then(() => null)
        .catch((error: Error) => error.message);
      expect(failed, 'a page with no cached copy was answered anyway').toBeTruthy();
    } finally {
      await context.setOffline(false);
    }
  });
});
