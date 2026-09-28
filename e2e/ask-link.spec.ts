import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type Request } from '@playwright/test';

import { findAskRequest } from '../lib/tools/ask-link';
import { testDetailedPng, testPhotoPdf } from './fixtures';
import { networkSettled } from './hydration';

/**
 * Ask links, driven end to end in a real browser.
 *
 * `lib/tools/ask-link.test.ts` proves the encoding rules in isolation. What a
 * unit test cannot show is the part the whole feature rests on: that a link
 * created on `/ask` reaches the real tool with its settings intact, that the
 * recipient chooses their file **once**, and that the bytes they end up with
 * actually satisfy what they were asked for. So every test here reads the saved
 * download rather than the receipt on the screen.
 *
 * WHY THE ASSERTIONS ARE ON BYTES AND NOT ON CONTROLS. A test that checked the
 * format dropdown would pass even if the setting never reached the encoder —
 * which is exactly the fault `e2e/recipe-links.spec.ts` was written after. The
 * format is read from the magic bytes, the pixel size by decoding the file in
 * the browser, and the KB limit from the file's own length.
 */

/**
 * The dashed picker on a recipient page.
 *
 * ANCHORED AT BOTH ENDS, learned by being wrong first. The `sr-only`
 * `input[type=file]` beside it also maps to the button role, so an unanchored
 * `/choose your image/` matched two elements and failed on strict mode instead
 * of clicking anything. The two now carry different accessible names — see
 * `components/ask-link-request.tsx` — and the anchors keep it that way.
 */
function picker(page: Page, noun: string) {
  return page.getByRole('button', {
    name: new RegExp(`^choose your ${noun}$`, 'iu'),
  });
}

/**
 * Wait until the page's React has taken over its own controls.
 *
 * Every input here is server-rendered, so it exists before `onChange` is
 * attached: a value set in that window is written into the DOM and the component
 * never hears about it. The failure then surfaces somewhere else entirely — a
 * validation message that never appears — and reads as a product bug. This is
 * the same race `e2e/upload.ts` documents, one control class up.
 *
 * **The body of this function used to be that comment and nothing else.** It
 * called `waitForLoadState('networkidle')`, which does not detect hydration —
 * it returns when no request has been in flight for 500ms, and React hydrating
 * is CPU work that finishes either side of that. So every caller below read as
 * guarded against the race described above while being guarded against nothing,
 * which is worse than no helper at all: the name asserted a property the code
 * did not have.
 *
 * It is now honest about what it does. The callers here hand a file to a picker
 * rather than typing into a field, and each already retries the click/chooser
 * handshake and then asserts on the page having taken the file — that assertion
 * is what actually proves React arrived. Where a spec types into a control
 * instead, `./hydration.ts` has the probe that proves it.
 */
async function hydrated(page: Page) {
  await networkSettled(page);
}

/**
 * Choose a file on the recipient page.
 *
 * Retries the whole click/chooser handshake, which is the idiom every spec here
 * uses: observed flaking about one run in ten when the click lands before the
 * listener is attached.
 */
async function chooseOnAskPage(
  page: Page,
  noun: string,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  await hydrated(page);
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 5_000 });
    await picker(page, noun).click();
    await (await chooser).setFiles(file);
    // The name appearing on the button is the page having taken the file, not
    // merely the chooser having closed.
    await expect(page.getByText(file.name)).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 45_000 });
}

/** Decode saved bytes in the page and report the real pixel size. */
async function decodedSize(page: Page, bytes: Uint8Array, type: string) {
  return page.evaluate(
    async ([base64, mime]) => {
      const binary = atob(base64);
      const data = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([data], { type: mime }));
      return { width: bitmap.width, height: bitmap.height };
    },
    [Buffer.from(bytes).toString('base64'), type] as const,
  );
}

/**
 * Make the clipboard refuse, the way a non-secure context or a locked-down
 * browser does, so the creator's fallback runs and the link lands in the DOM
 * where it can simply be read.
 *
 * Reading the clipboard back is not portable — WebKit permits `writeText` and
 * denies `readText` — so forcing the refusal is what makes this deterministic in
 * both engines, and it exercises the fallback rather than reasoning about it.
 */
async function refuseClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('blocked for test')) },
    });
  });
}

/** The link the creator produced, read out of the fallback box. */
async function copiedLink(page: Page) {
  await page.getByRole('button', { name: 'Copy request link' }).click();
  return page
    .getByRole('textbox', { name: /blocked the clipboard/iu })
    .inputValue();
}

function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

/**
 * Every request that left this page for somewhere that is not this origin.
 *
 * The claim on both surfaces is that the file stays on the device. `connect-src
 * 'none'` is what enforces it, and this is what checks the enforcement held
 * while a real file was being processed.
 */
function trackOffOrigin(page: Page, origin: string) {
  const offOrigin: string[] = [];
  page.on('request', (request: Request) => {
    const url = request.url();
    // `blob:` and `data:` never leave the machine — an object URL for a preview
    // or a download is the browser reading its own memory.
    if (
      url.startsWith(origin) ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return;
    }
    offOrigin.push(url);
  });
  return offOrigin;
}

test.describe('Ask Link — the creator', () => {
  test('builds a link that carries the settings and no file or person', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await refuseClipboard(page);
    await page.goto('/ask');
    await hydrated(page);

    // The default request is the image one; configure it as the brief's own
    // example does — JPEG, 1200 px wide, quality 80.
    await page.getByLabel('File format').selectOption('jpeg');
    await page.getByLabel('Maximum width').fill('1200');
    await page.getByLabel('Maximum height').fill('1200');
    await page.getByLabel('Quality').fill('80');

    // The sentence the recipient will read, shown before the link is copied.
    await expect(page.getByText('Prepare an image')).toBeVisible();
    await expect(
      page.getByText(
        'Please provide a JPEG image no wider than 1200 px and no taller than 1200 px.',
      ),
    ).toBeVisible();

    const link = await copiedLink(page);
    const url = new URL(link);
    expect(url.pathname).toBe('/ask/image');
    expect(url.searchParams.get('v')).toBe('1');
    expect(url.searchParams.get('format')).toBe('jpeg');
    expect(url.searchParams.get('width')).toBe('1200');
    expect(url.searchParams.get('quality')).toBe('80');
    // Nothing else may be in it at all.
    expect([...url.searchParams.keys()].sort()).toEqual([
      'format',
      'height',
      'quality',
      'v',
      'width',
    ]);

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('refuses to copy a link whose numbers the tool could not honour', async ({
    page,
  }) => {
    await page.goto('/ask');
    await hydrated(page);
    await page.getByLabel('Maximum width').fill('99999');

    // Named, not silently dropped: a link that quietly asks for less than the
    // sender typed is the worst of the three outcomes.
    await expect(
      page.getByText(/Enter a number from 1 to 12,000/u),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Copy request link' }),
    ).toBeDisabled();

    await page.getByLabel('Maximum width').fill('1200');
    await expect(
      page.getByRole('button', { name: 'Copy request link' }),
    ).toBeEnabled();
  });

  test('writes to the real clipboard when the browser allows it', async ({
    page,
    context,
    browserName,
  }) => {
    // Chromium only, and deliberately: it is the one engine here that hands the
    // clipboard back for inspection. The fallback above covers both engines.
    test.skip(
      browserName !== 'chromium',
      'WebKit permits writeText but denies readText, and rejects the permission name',
    );
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/ask');
    await hydrated(page);
    await page.getByLabel('File format').selectOption('webp');

    await page.getByRole('button', { name: 'Copy request link' }).click();
    await expect(
      page.getByRole('button', { name: 'Request link copied' }),
    ).toBeVisible();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('/ask/image?v=1&format=webp');
  });

  test('offers native sharing only where the browser has it', async ({
    page,
  }) => {
    await page.goto('/ask');
    const share = page.getByRole('button', { name: 'Share the request' });
    const supported = await page.evaluate(() => 'share' in navigator);
    // Asserted both ways round: a share button rendered where `navigator.share`
    // does not exist throws when pressed, which is worse than no button.
    if (supported) await expect(share).toBeVisible();
    else await expect(share).toHaveCount(0);
  });

  test('works at 375 px with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await page.goto('/ask');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ask someone for a file' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Copy request link' }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(
      overflow,
      'the creator scrolls sideways on a phone',
    ).toBeLessThanOrEqual(0);
  });
});

test.describe('Ask Link — the recipient', () => {
  test('image: one file choice, and the saved bytes are a JPEG inside the bound', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = trackPageErrors(page);
    await page.goto(
      '/ask/image?v=1&format=jpeg&width=320&height=320&quality=80',
    );
    const offOrigin = trackOffOrigin(page, new URL(page.url()).origin);

    // What the recipient is told, in words, before anything is chosen.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Prepare an image' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Please provide a JPEG image no wider than 320 px and no taller than 320 px.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText('Your file stays on this device.'),
    ).toBeVisible();

    const source = await testDetailedPng(page, 1200, 900);
    await chooseOnAskPage(page, 'image', {
      name: 'holiday-photo.png',
      mimeType: 'image/png',
      buffer: source,
    });
    await page.getByRole('button', { name: 'Prepare image' }).click();

    // The handoff lands on the real tool with the settings applied.
    await page.waitForURL(/\/image\/optimize/u);
    await expect(page.getByRole('status').first()).toContainText('JPEG');
    await expect(
      page.getByRole('combobox', { name: /output format/iu }),
    ).toHaveValue('image/jpeg');

    /*
     * THE ASSERTION THIS WHOLE SPEC EXISTS FOR: the file is already in the
     * tool. The recipient chose it on the previous page and is not asked again,
     * which is the difference between this and sending somebody a bare tool
     * link. `Optimize image` is disabled until a source is loaded, so its being
     * enabled is the handoff having arrived.
     */
    const run = page.getByRole('button', { name: 'Optimize image' });
    await expect(
      run,
      'the handed-over file never reached the tool',
    ).toBeEnabled({
      timeout: 30_000,
    });
    await run.click();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save image' }).click();
    const saved = new Uint8Array(
      await readFile((await (await download).path())!),
    );

    const signature = findAskRequest('image')!.verify.signatures.jpeg!;
    expect(
      [...saved.subarray(0, signature.length)],
      'the requested JPEG format did not reach the encoder',
    ).toEqual([...signature]);

    const size = await decodedSize(page, saved, 'image/jpeg');
    expect(size.width, 'wider than the request allowed').toBeLessThanOrEqual(
      320,
    );
    expect(size.height, 'taller than the request allowed').toBeLessThanOrEqual(
      320,
    );
    // And it really was resized rather than left alone.
    expect(Math.max(size.width, size.height)).toBe(320);

    expect(offOrigin, `left this origin: ${offOrigin.join(' | ')}`).toEqual([]);
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('photo-size: the saved file is a JPEG at exact pixels under the KB limit', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = trackPageErrors(page);
    /*
     * 10 KB, not 50, and the number is the point.
     *
     * A 200 × 230 JPEG is under 50 KB at any quality the encoder will produce,
     * so a 50 KB ceiling is met by doing nothing — and a test that cannot fail
     * proves nothing about the search. 10 KB is a real signature spec and it is
     * over the line: the tool has to drop quality to reach it, and breaking
     * the byte comparison in `fitToSize` makes this assertion go red. Verified
     * by mutation, 2026-09-27.
     */
    await page.goto(
      '/ask/photo-size?v=1&format=jpeg&width=200&height=230&maxkb=10&fit=crop',
    );
    const offOrigin = trackOffOrigin(page, new URL(page.url()).origin);

    await expect(
      page.getByText(
        'Please provide a JPEG photo 200 × 230 px and no larger than 10 KB.',
      ),
    ).toBeVisible();

    const source = await testDetailedPng(page, 1200, 900);
    await chooseOnAskPage(page, 'photo', {
      name: 'passport-photo.png',
      mimeType: 'image/png',
      buffer: source,
    });
    await page.getByRole('button', { name: 'Prepare photo' }).click();

    await page.waitForURL(/\/image\/exact-size/u);
    // The settings arrived in the boxes, which is what the tool runs from.
    await expect(page.getByLabel('Maximum size (KB)')).toHaveValue('10');
    await expect(page.getByLabel('Width (px)')).toHaveValue('200');
    await expect(page.getByLabel('Height (px)')).toHaveValue('230');
    await expect(page.getByLabel('Output format')).toHaveValue('image/jpeg');
    // The file came with them — the button is disabled without a source.
    const fit = page.getByRole('button', { name: 'Fit to size' });
    await expect(
      fit,
      'the handed-over photo never reached the tool',
    ).toBeEnabled({
      timeout: 30_000,
    });
    await fit.click();

    await expect(
      page.getByRole('heading', { name: 'Meets every requirement' }),
    ).toBeVisible({ timeout: 90_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Save .+\.(jpg|png)$/u }).click();
    const file = await download;
    const saved = new Uint8Array(await readFile((await file.path())!));

    expect([...saved.subarray(0, 3)], 'not a JPEG').toEqual([0xff, 0xd8, 0xff]);
    /*
     * The one place this feature states a size, so the bytes are what decides
     * it. 50 KB means 1,024-byte KB, which is what the page's own unit selector
     * says and what `maxBytesFor` computes.
     */
    expect(
      saved.byteLength,
      `saved ${saved.byteLength} bytes, over the 10 KB the request asked for`,
    ).toBeLessThanOrEqual(10 * 1024);

    const size = await decodedSize(page, saved, 'image/jpeg');
    expect(size).toEqual({ width: 200, height: 230 });

    expect(offOrigin, `left this origin: ${offOrigin.join(' | ')}`).toEqual([]);
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('pdf: the saved file is a valid PDF and smaller than the original', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const errors = trackPageErrors(page);
    await page.goto(
      '/ask/pdf?v=1&recompress=on&quality=60&maxedge=1000&metadata=on',
    );

    await expect(page.getByText('Please provide a PDF.')).toBeVisible();
    // No size is promised, because nothing here can promise one.
    await expect(page.getByText(/under \d+ ?(KB|MB)/u)).toHaveCount(0);

    const source = await testPhotoPdf(page, 3);
    await chooseOnAskPage(page, 'PDF', {
      name: 'scanned-contract.pdf',
      mimeType: 'application/pdf',
      buffer: source,
    });
    await page.getByRole('button', { name: 'Prepare PDF' }).click();

    await page.waitForURL(/\/pdf\/compress/u);
    await expect(
      page.getByRole('combobox', { name: 'Largest photo edge' }),
    ).toHaveValue('1000');
    const compress = page.getByRole('button', { name: 'Compress PDF' });
    await expect(
      compress,
      'the handed-over PDF never reached the tool',
    ).toBeEnabled({ timeout: 30_000 });
    await compress.click();

    await expect(
      page.getByRole('heading', { name: /^Done — \d+% smaller$/u }),
    ).toBeVisible({ timeout: 180_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save compressed PDF' }).click();
    const saved = new Uint8Array(
      await readFile((await (await download).path())!),
    );

    const signature = findAskRequest('pdf')!.verify.signatures.pdf!;
    expect([...saved.subarray(0, signature.length)], 'not a PDF').toEqual([
      ...signature,
    ]);
    expect(saved.byteLength).toBeLessThan(source.byteLength);

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  /*
   * WebP, in both engines, because they disagree and the disagreement is the
   * whole point.
   *
   * Measured 2026-09-27: WebKit's `canvas.toBlob(cb, 'image/webp')` returns a
   * blob typed `image/png` — it substitutes rather than refusing. So a page
   * saying "Please provide a WebP image" would send a Safari or iOS recipient
   * away with a PNG. The first version of this spec never saw it, because the
   * image test only asked for JPEG.
   *
   * The assertion is therefore per engine and reads the saved bytes either way:
   * where WebP is real, the file must be RIFF/WEBP and no notice may appear;
   * where it is substituted, the notice must say so BEFORE a file is chosen.
   * Both halves matter — a notice that showed up everywhere would be inventing
   * a limitation, which is the same untruth pointing the other way.
   */
  test('webp: says so when this browser cannot make the format asked for', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(180_000);
    await page.goto(
      '/ask/image?v=1&format=webp&width=320&height=320&quality=80',
    );
    await expect(
      page.getByText('Please provide a WebP image no wider than 320 px'),
    ).toBeVisible();

    const notice = page.getByText('This browser cannot make that format.');
    // What this engine will really encode, asked of the engine itself rather
    // than hard-coded per browser name.
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

    if (substitutes) {
      // Before the file is chosen, not after: it changes what they are about
      // to make.
      await expect(notice).toBeVisible({ timeout: 15_000 });
      await expect(notice.locator('..')).toContainText(
        produced === 'image/png' ? 'PNG' : 'instead',
      );
    } else {
      await expect(notice).toHaveCount(0);
    }

    const source = await testDetailedPng(page, 600, 400);
    await chooseOnAskPage(page, 'image', {
      name: 'holiday.png',
      mimeType: 'image/png',
      buffer: source,
    });
    await page.getByRole('button', { name: 'Prepare image' }).click();
    await page.waitForURL(/\/image\/optimize/u);
    const run = page.getByRole('button', { name: 'Optimize image' });
    await expect(run).toBeEnabled({ timeout: 30_000 });
    await run.click();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save image' }).click();
    const file = await download;
    const saved = new Uint8Array(await readFile((await file.path())!));
    const riff = new TextDecoder('ascii').decode(saved.subarray(8, 12));

    if (substitutes) {
      // The bytes are PNG and the FILENAME says PNG — the tool never
      // mislabels. That is what makes the sentence the only thing at risk, and
      // the notice above is what repairs it.
      expect(
        file.suggestedFilename(),
        `${browserName} named it wrongly`,
      ).toMatch(/\.png$/u);
      expect([...saved.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    } else {
      expect(riff, `${browserName} did not produce WebP`).toBe('WEBP');
      expect(file.suggestedFilename()).toMatch(/\.webp$/u);
    }
  });

  /*
   * The recipient presses the button and the handoff cannot happen.
   *
   * Reachable for real: a private window, or a browser with storage switched
   * off. Until now nothing proved what they see. The failure being guarded
   * against is not a wrong message but NO message — `busy` stuck true, a
   * disabled button reading "Opening the tool…", and no route out of the page.
   */
  test('says so, and offers a way on, when storage will not hold the file', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      // Both halves of the handoff refuse: IndexedDB will not open, and the
      // sessionStorage fallback throws on write.
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: {
          open: () => {
            throw new Error('blocked for test');
          },
        },
      });
      // A plain object, not a spread of the real Storage: spreading a class
      // instance drops its prototype, and the three methods below are the only
      // ones `lib/file-handoff.ts` calls.
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        value: {
          getItem: () => null,
          removeItem: () => {},
          setItem: () => {
            throw new Error('blocked for test');
          },
        },
      });
    });

    await page.goto('/ask/image?v=1&format=jpeg&width=480');
    const source = await testDetailedPng(page, 400, 300);
    await chooseOnAskPage(page, 'image', {
      name: 'holiday.png',
      mimeType: 'image/png',
      buffer: source,
    });
    await page.getByRole('button', { name: 'Prepare image' }).click();

    // A message naming the cause, not a hang.
    await expect(
      page.getByText('This browser would not hold the file between pages.'),
    ).toBeVisible({ timeout: 30_000 });
    // And a route onward, with the settings intact.
    const onward = page.getByRole('link', {
      name: 'Open the tool with these settings',
    });
    await expect(onward).toBeVisible();
    expect(await onward.getAttribute('href')).toContain('format=jpeg');

    // The button must be usable again rather than stuck on its busy label.
    await expect(
      page.getByRole('button', { name: 'Prepare image' }),
    ).toBeEnabled();
    // Still on the ask page: it did not navigate to an empty tool.
    expect(new URL(page.url()).pathname).toBe('/ask/image');
  });

  test('a hostile link applies nothing and still works', async ({ page }) => {
    await page.goto(
      '/ask/image?v=1&format=gif&quality=99999&width=abc&height=-5' +
        '&filename=passport.pdf&redirect=https://evil.test&__proto__[x]=1',
    );

    // The settings were all dropped, so the requirement names the file kind and
    // claims nothing else.
    await expect(page.getByText('Please provide an image.')).toBeVisible();
    await expect(page.getByText('evil.test')).toHaveCount(0);
    await expect(page.getByText('passport')).toHaveCount(0);
    // And the page is still usable rather than an error.
    await expect(picker(page, 'image')).toBeVisible();
    expect(
      await page.evaluate(
        () => (({}) as Record<string, unknown>).x === undefined,
      ),
      'a query parameter reached Object.prototype',
    ).toBe(true);
  });

  test('a link with no version says so instead of guessing', async ({
    page,
  }) => {
    await page.goto('/ask/image?format=jpeg&width=1200');
    await expect(
      page.getByText('This link is missing its settings'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Open the tool' }),
    ).toBeVisible();
  });

  test('an unknown request type is a 404, not a page', async ({ page }) => {
    const response = await page.goto('/ask/not-a-request?v=1');
    expect(response?.status()).toBe(404);
  });

  test('is noindex, and the creator is not', async ({ page }) => {
    // Asserted in the served bytes, not only in the source: these are private
    // requests between two people and must never be a search result.
    await page.goto('/ask/image?v=1&format=jpeg');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await page.goto('/ask');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow',
    );
  });

  test('works at 375 px with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await page.goto(
      '/ask/photo-size?v=1&format=jpeg&width=200&height=230&maxkb=50',
    );
    await expect(
      page.getByRole('heading', { level: 1, name: 'Prepare a photo' }),
    ).toBeVisible();
    await expect(picker(page, 'photo')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(
      overflow,
      'the recipient page scrolls sideways on a phone',
    ).toBeLessThanOrEqual(0);
  });

  test('never puts the chosen file or its name in a URL', async ({ page }) => {
    // The whole promise, checked at the one moment it could be broken: the
    // navigation the page performs after a file has been chosen.
    await page.goto('/ask/image?v=1&format=jpeg&width=480');
    const source = await testDetailedPng(page, 600, 400);
    await chooseOnAskPage(page, 'image', {
      name: 'my-private-passport-scan.png',
      mimeType: 'image/png',
      buffer: source,
    });
    await page.getByRole('button', { name: 'Prepare image' }).click();
    await page.waitForURL(/\/image\/optimize/u);

    const landed = page.url();
    expect(landed).not.toContain('passport');
    expect(landed).not.toContain('.png');
    expect(landed).not.toContain('base64');
    expect(landed).toContain('format=jpeg');
  });
});

test.describe('Ask Link — the loop back', () => {
  test('a finished job offers a request with the settings it just ran', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/image/optimize?format=png&quality=70&width=48&height=48');
    await expect(page.getByRole('status').first()).toBeVisible();

    // No offer before there is a result: the CTA is for somebody who has just
    // seen the tool work, and it must never sit above the file they came for.
    const offer = page.getByRole('link', {
      name: 'Ask someone for this file',
    });
    await expect(offer).toHaveCount(0);

    await expect(async () => {
      const chooser = page.waitForEvent('filechooser', { timeout: 5_000 });
      await page
        .getByRole('button', { name: /^choose (image\(s\)|another)$/iu })
        .click();
      await (
        await chooser
      ).setFiles({
        name: 'source.png',
        mimeType: 'image/png',
        buffer: await testDetailedPng(page, 200, 200),
      });
    }).toPass({ timeout: 45_000 });
    await page.getByRole('button', { name: 'Optimize image' }).click();

    // The download is reachable first, and the offer is beside it rather than
    // over it.
    await expect(page.getByRole('button', { name: 'Save image' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(offer).toBeVisible();

    await offer.click();
    await page.waitForURL(/\/ask\?/u);
    // Opened on the right request with the settings already filled in.
    await expect(page.getByLabel('File format')).toHaveValue('png');
    await expect(page.getByLabel('Maximum width')).toHaveValue('48');
    await expect(
      page.getByRole('button', { name: 'Copy request link' }),
    ).toBeVisible();
  });
});

test.describe('Ask Link — the existing shared links still work', () => {
  test('a /shared setup link still reaches its tool with its settings', async ({
    page,
  }) => {
    // `ALL_RECIPES` gained an entry for the exact-size request in the same
    // change as this feature, and `recipeLinkTarget` is matched against that
    // list. A link somebody pasted into a group chat last week must still open.
    await page.goto('/shared/image/optimize?format=png&quality=70&width=48');
    await page.waitForURL(/\/image\/optimize/u);
    await expect(page.getByRole('status').first()).toContainText('PNG');
    await expect(
      page.getByRole('combobox', { name: /output format/iu }),
    ).toHaveValue('image/png');
  });

  test('the new exact-size setup link works through /shared too', async ({
    page,
  }) => {
    await page.goto(
      '/shared/image/exact-size?format=jpeg&maxkb=40&width=160&height=160&fit=pad',
    );
    await page.waitForURL(/\/image\/exact-size/u);
    await expect(page.getByLabel('Maximum size (KB)')).toHaveValue('40');
    await expect(page.getByLabel('Width (px)')).toHaveValue('160');
    await expect(page.getByRole('status').first()).toContainText('JPEG');
  });
});
