import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type Request } from '@playwright/test';

import { testDetailedPng } from './fixtures';

/**
 * `/do`, driven end to end in a real browser.
 *
 * WHY THE ASSERTIONS DO NOT USE THIS PROJECT'S OWN VERIFIER. `verifyImageBytes`
 * is the thing under test. Checking its output with itself would pass even if it
 * were wrong in exactly the same way twice, which is not a check. So every
 * assertion here reads the **saved download's raw bytes** — magic bytes compared
 * against literals written out below, byte length from the file on disk — and
 * gets the pixel size by decoding the saved file in the browser through an
 * `<img>` element, which is a decoder nothing in this repository wrote.
 *
 * WHY NOT `createImageBitmap`. It refuses ordinary valid PNGs in this test
 * browser, which has cost this project a day before. `decodeInBrowser` below
 * uses `<img>` and `naturalWidth`, the widest-supported path there is.
 *
 * A NOTE ON LOCATORS, learned by getting it wrong first. `getByText` resolves to
 * the *smallest* element whose text matches, so a label rendered as its own
 * `<span>` inside a paragraph matches the span — whose text is the label and
 * nothing else. Asserting `toContainText('JPEG')` against that can never pass.
 * Readbacks are therefore asserted in two parts: the label is visible, and the
 * value is visible. Headings are addressed by role for the same reason.
 *
 * WHY THE SCREEN IS NEVER THE EVIDENCE. A receipt saying "Verified result" is
 * produced by the same code path that decided the result was verified. The
 * mutation proof in `lib/tools/image-verify.test.ts` includes exactly this case:
 * ignoring the measured byte length while the screen still reports success. Only
 * the file on disk can catch that, so the file on disk is what is read.
 */

/*
 * Every test here decodes a real image, scans its pixels and then encodes it
 * several times over while looking for a byte limit. `playwright.config.ts`
 * already caps workers for exactly this reason — "two browsers doing that at
 * once starve each other into timeouts that look like product failures" — and
 * three of these at once on one machine is the same problem. A timeout at the
 * 30-second default here would be a budget, not a fault, so the budget is
 * stated. A genuine hang still fails, two minutes later.
 */
test.describe.configure({ timeout: 120_000 });

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

/** Container read from the bytes, with no help from this project's code. */
function sniff(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | 'other' {
  if (startsWith(bytes, JPEG)) return 'jpeg';
  if (startsWith(bytes, PNG)) return 'png';
  if (startsWith(bytes, RIFF) && startsWith(bytes.subarray(8), WEBP)) {
    return 'webp';
  }
  return 'other';
}

/** Decode the saved file in the browser and report the pixels it really has. */
async function decodeInBrowser(page: Page, bytes: Uint8Array, type: string) {
  return page.evaluate(
    async ([data, mime]) => {
      const blob = new Blob([new Uint8Array(data as number[])], {
        type: mime as string,
      });
      const url = URL.createObjectURL(blob);
      try {
        return await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const image = new Image();
            image.onload = () =>
              resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            image.onerror = () => reject(new Error('undecodable'));
            image.src = url;
          },
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [Array.from(bytes), type] as const,
  );
}

/** A PNG with genuinely transparent pixels; no committed fixture has any. */
async function transparentPng(page: Page, size = 400) {
  const base64 = await page.evaluate((edge) => {
    const canvas = document.createElement('canvas');
    canvas.width = edge;
    canvas.height = edge;
    const context = canvas.getContext('2d')!;
    // Left half opaque, right half untouched and therefore transparent.
    context.fillStyle = '#3366cc';
    context.fillRect(0, 0, edge / 2, edge);
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, size);
  return Buffer.from(base64, 'base64');
}

async function open(page: Page, fragment = '') {
  await page.goto(`/do${fragment}`);
  await expect(
    page.getByRole('heading', { name: /what must the final file satisfy/iu }),
  ).toBeVisible();
}

async function choose(page: Page, bytes: Buffer, name = 'photo.png') {
  await page.locator('#file-compiler-input').setInputFiles({
    name,
    mimeType: name.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
    buffer: bytes,
  });
  // The panel appears only once the bytes have really been inspected: the file
  // is read, the container sniffed, the image decoded and — when it has an alpha
  // channel — its pixels scanned. That is genuine work, and Playwright runs
  // several of these tests at once on one machine, so the default five seconds
  // is too tight. Waiting longer here is not hiding a hang; a hang still fails.
  await expect(page.getByText(/^Your file$/iu).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function say(page: Page, command: string) {
  await page.locator('#command').fill(command);
}

async function runAndSave(page: Page) {
  await page.getByRole('button', { name: /prepare my file/iu }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^download$/iu }).click();
  const saved = await download;
  return new Uint8Array(await readFile((await saved.path())!));
}

test.describe('the file is inspected truthfully before anything is asked', () => {
  test('reports the real format, pixels and byte size', async ({ page }) => {
    await open(page);
    const bytes = await testDetailedPng(page, 800, 600);
    await choose(page, bytes);

    // "PNG" is also the label on a format chip, so read the file panel's own
    // definition list rather than the first match on the page.
    await expect(
      page.locator('dd', { hasText: /^PNG$/u }).first(),
    ).toBeVisible();
    await expect(page.getByText('800 × 600 px')).toBeVisible();
    // The byte size shown must be the real one, to the byte. Asserted against
    // the panel's own list so the KB figure beside it cannot affect the match.
    await expect(page.locator('dl').first()).toContainText(
      `${bytes.length.toLocaleString('en-US')} bytes`,
    );
  });

  test('refuses a file that is not an image it can work with', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#file-compiler-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not an image'),
    });
    await expect(page.getByRole('alert')).toContainText(/not a JPEG, PNG or WebP/iu);
    // And it does not pretend to have loaded anything.
    await expect(page.getByText(/^Your file$/iu).first()).toBeHidden();
  });
});

test.describe('a typed command becomes a real, verified file', () => {
  test('JPEG under a byte limit: the saved file is a JPEG and is under it', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 1600, 1200));
    await say(page, 'jpeg under 120 kb');

    await expect(page.getByText(/OpenTools understood:/iu).first()).toBeVisible();
    await expect(page.getByText(/Here is the plan:/iu).first()).toBeVisible();

    const saved = await runAndSave(page);
    expect(sniff(saved)).toBe('jpeg');
    expect(saved.length).toBeLessThanOrEqual(120 * 1024);
    await expect(page.getByRole('heading', { name: /Verified result/iu })).toBeVisible();
  });

  test('WebP with a maximum width: either real WebP, or an honest refusal', async ({
    page,
  }) => {
    // WebKit's canvas answers a WebP request with a PNG instead of refusing, so
    // what must hold in every browser is not "a WebP appears" — it is that the
    // page never passes off a PNG as a WebP. Asked of a browser that can encode
    // WebP, the bytes are WebP. Asked of one that cannot, it says so and hands
    // over nothing.
    const canEncodeWebp = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp'),
      );
      return blob?.type === 'image/webp';
    });

    await open(page);
    await choose(page, await testDetailedPng(page, 1600, 1200));
    await say(page, 'make it webp, maximum width 640 px');

    if (!canEncodeWebp) {
      await page.getByRole('button', { name: /prepare my file/iu }).click();
      await expect(page.getByRole('alert')).toContainText(
        /cannot save WebP/iu,
      );
      await expect(
        page.getByRole('button', { name: /^download$/iu }),
      ).toBeHidden();
      return;
    }

    const saved = await runAndSave(page);
    expect(sniff(saved)).toBe('webp');
    const size = await decodeInBrowser(page, saved, 'image/webp');
    expect(size.width).toBeLessThanOrEqual(640);
    // Fitted, not stretched: the shape is kept.
    expect(size.height).toBe(Math.floor((size.width * 1200) / 1600));
  });

  test('exact dimensions with crop: the saved file really is that size', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 1600, 1200));
    await say(page, 'exactly 300x300 crop to fit');

    const saved = await runAndSave(page);
    const size = await decodeInBrowser(page, saved, 'image/png');
    expect(size).toEqual({ width: 300, height: 300 });
  });

  test('exact dimensions with pad: the saved file really is that size', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 1600, 1200));
    await say(page, 'exactly 500x500 pad to fit');

    const saved = await runAndSave(page);
    const size = await decodeInBrowser(page, saved, 'image/png');
    expect(size).toEqual({ width: 500, height: 500 });
  });

  test('removing metadata is reported only when the bytes agree', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 400, 300));
    await say(page, 'png remove metadata');

    const saved = await runAndSave(page);
    expect(sniff(saved)).toBe('png');
    await expect(page.getByRole('heading', { name: /Verified result/iu })).toBeVisible();
    // Independent of this project's parser: no PNG text or Exif chunk names.
    const text = Buffer.from(saved).toString('latin1');
    expect(text).not.toContain('tEXt');
    expect(text).not.toContain('eXIf');
    expect(text).not.toContain('iTXt');
  });
});

test.describe('unknown text is disclosed and never acted on', () => {
  test('names the part it did not understand, and keeps the part it did', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 400, 300));
    await say(page, 'make it a jpeg and enhance it beautifully');

    await expect(
      page.getByText(/OpenTools understood:/iu).first(),
    ).toBeVisible();
    await expect(page.getByText('JPEG', { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText(/Not understood, and not acted on:/iu).first(),
    ).toBeVisible();
    // The unrecognised fragment is shown back in quotes, exactly as typed.
    await expect(page.getByText(/“enhance beautifully”/u)).toBeVisible();

    const saved = await runAndSave(page);
    // The recognised half really happened.
    expect(sniff(saved)).toBe('jpeg');
  });

  test('a wholly unrecognised command produces no plan at all', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 400, 300));
    await say(page, 'upscale it with ai please');

    await expect(
      page.getByText(/Not understood, and not acted on:/iu).first(),
    ).toBeVisible();
    await expect(page.getByText(/Here is the plan:/iu).first()).toBeHidden();
    await expect(
      page.getByRole('button', { name: /prepare my file/iu }),
    ).toBeHidden();
  });

  test('refuses an over-long command rather than running part of it', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 200, 200));
    // Two separate defences, and this is the browser's one: the box itself
    // cannot hold more than MAX_COMMAND_LENGTH characters, so a 275-character
    // command never reaches the parser intact. The parser's own refusal of an
    // over-long string — the whole command dropped rather than truncated — is
    // proved in `lib/tools/file-compiler/parse.test.ts`, which can hand it a
    // string no input element would accept.
    await say(page, `jpeg ${'and also '.repeat(30)}`);
    const held = await page.locator('#command').inputValue();
    expect(held.length).toBe(200);
    await expect(page.locator('#command')).toHaveAttribute('maxlength', '200');
  });
});

test.describe('bounded decisions, never open questions', () => {
  test('asks for a background when transparency cannot survive, then honours it', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await transparentPng(page, 400), 'logo.png');
    await expect(page.getByText(/Transparency/iu).first()).toBeVisible();

    await say(page, 'jpeg');
    await expect(page.getByText(/OpenTools needs one decision:/iu).first()).toBeVisible();
    await expect(page.getByText(/cannot store transparent pixels/iu).first()).toBeVisible();
    // No plan exists until it is answered.
    await expect(page.getByText(/Here is the plan:/iu).first()).toBeHidden();

    await page.getByRole('button', { name: /^white$/iu }).click();
    await expect(page.getByText(/Here is the plan:/iu).first()).toBeVisible();

    const saved = await runAndSave(page);
    expect(sniff(saved)).toBe('jpeg');
  });

  test('offers PNG as a way out of the same decision', async ({ page }) => {
    await open(page);
    await choose(page, await transparentPng(page, 400), 'logo.png');
    await say(page, 'jpeg');
    await page.getByRole('button', { name: /use png instead/iu }).click();

    const saved = await runAndSave(page);
    // Choosing PNG really changed the container, not just the label.
    expect(sniff(saved)).toBe('png');
  });

  test('asks how an exact size should reshape the image', async ({ page }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 1600, 900));
    await say(page, 'exactly 400x400');

    await expect(page.getByText(/changes this image’s shape/iu).first()).toBeVisible();
    await page.getByRole('button', { name: /crop the edges/iu }).click();

    const saved = await runAndSave(page);
    const size = await decodeInBrowser(page, saved, 'image/png');
    expect(size).toEqual({ width: 400, height: 400 });
  });

  test('a contradiction is a question, not a guess', async ({ page }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 400, 300));
    await say(page, 'jpeg png');

    await expect(page.getByText(/OpenTools needs one decision:/iu).first()).toBeVisible();
    await expect(page.getByText(/two different values/iu).first()).toBeVisible();
    await expect(page.getByText(/Here is the plan:/iu).first()).toBeHidden();
  });
});

test.describe('an impossible requirement is reported, never faked', () => {
  test('says which promise was missed and still offers the real file', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 2000, 1500));
    // An exact size is a hard constraint, so the search may not shrink to reach
    // the limit — which makes this genuinely unreachable.
    await say(page, 'jpeg exactly 2000x2000 stretch under 2 kb');

    await page.getByRole('button', { name: /prepare my file/iu }).click();
    await expect(
      page.getByRole('heading', { name: /does not satisfy every requirement/iu }),
    ).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/Maximum file size/iu).first()).toBeVisible();

    // The file offered is real, and is honestly still over the limit.
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /^download$/iu }).click();
    const saved = new Uint8Array(await readFile((await (await download).path())!));
    expect(sniff(saved)).toBe('jpeg');
    expect(saved.length).toBeGreaterThan(2 * 1024);
    // And it never claimed otherwise.
    await expect(page.getByRole('heading', { name: /Verified result/iu })).toBeHidden();
  });
});

test.describe('cancelling', () => {
  test('leaves nothing behind and says so', async ({ page }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 2400, 1800));
    await say(page, 'jpeg under 30 kb');
    await page.getByRole('button', { name: /prepare my file/iu }).click();
    const cancel = page.getByRole('button', { name: /^cancel$/iu });
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click();
      await expect(page.getByText(/Cancelled/iu).first()).toBeVisible();
    } else {
      // Fast machines can finish before the cancel button is reachable. That is
      // not a failure of cancellation; assert the run completed truthfully.
      await expect(
        page.getByRole('heading', {
          name: /Verified result|does not satisfy every requirement/iu,
        }),
      ).toBeVisible({ timeout: 25_000 });
    }
  });
});

test.describe('the structured controls and the typed command stay in step', () => {
  test('typing updates the controls', async ({ page }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 800, 600));
    await say(page, 'webp maximum width 320 px remove metadata');

    await expect(page.getByRole('button', { name: 'WebP' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      page.getByLabel(/Maximum width \(px\)/iu),
    ).toHaveValue('320');
    await expect(
      page.getByRole('button', { name: /remove camera & location info/iu }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('a control updates the summary without rewriting what was typed', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 800, 600));
    await say(page, 'jpeg');
    await page.getByRole('button', { name: /remove camera & location info/iu }).click();

    await expect(page.getByRole('list', { name: /Requirement summary/iu })).toContainText(
      /Metadata removed/iu,
    );
    // The visitor's own words are untouched.
    await expect(page.locator('#command')).toHaveValue('jpeg');
  });

  test('a control alone is enough — the box is not the only way in', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 900, 700));
    await page.getByRole('button', { name: 'JPEG' }).click();
    await page.getByLabel(/Maximum width \(px\)/iu).fill('250');

    const saved = await runAndSave(page);
    expect(sniff(saved)).toBe('jpeg');
    const size = await decodeInBrowser(page, saved, 'image/jpeg');
    expect(size.width).toBeLessThanOrEqual(250);
    await expect(page.locator('#command')).toHaveValue('');
  });
});

test.describe('File Prompts carry the requirement and nothing else', () => {
  test('a fragment sets the requirement, and a second file satisfies it', async ({
    page,
  }) => {
    // The link a sender would copy: version, format, byte limit, width.
    await open(page, '#v=1&f=jpeg&b=122880&mw=500');
    await expect(page.getByRole('list', { name: /Requirement summary/iu })).toContainText('JPEG');

    await choose(page, await testDetailedPng(page, 1400, 1000), 'theirs.png');
    const saved = await runAndSave(page);
    expect(sniff(saved)).toBe('jpeg');
    expect(saved.length).toBeLessThanOrEqual(122_880);
    const size = await decodeInBrowser(page, saved, 'image/jpeg');
    expect(size.width).toBeLessThanOrEqual(500);
  });

  test('a hostile fragment cannot set anything it does not own', async ({
    page,
  }) => {
    await open(
      page,
      '#v=1&f=jpeg&__proto__=polluted&filename=secret.png&token=abc&mw=99999',
    );
    const summary = page
      .getByRole('list', { name: /Requirement summary/iu })
      .first();
    await expect(summary).toContainText('JPEG');
    // The out-of-range width was dropped, not clamped.
    await expect(summary).not.toContainText('99999');
    await expect(summary).not.toContainText('secret');
    // And nothing was polluted.
    expect(
      await page.evaluate(
        () => ({} as Record<string, unknown>).polluted === undefined,
      ),
    ).toBe(true);
  });

  test('a fragment from a newer version is refused, not guessed at', async ({
    page,
  }) => {
    await open(page, '#v=99&f=jpeg');
    await expect(page.getByRole('alert')).toContainText(/newer version/iu);
  });

  test('the shared link contains no file, no name and no identifier', async ({
    page,
  }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 600, 400), 'holiday-photo.png');
    await say(page, 'jpeg under 100 kb');
    await page.getByRole('button', { name: /prepare my file/iu }).click();
    await expect(page.getByRole('heading', { name: /Verified result/iu })).toBeVisible();

    await page.getByText(/ask someone for a file like this/iu).click();
    const link = await page.locator('code').first().innerText();

    expect(link.startsWith('/do#')).toBe(true);
    expect(link).not.toContain('holiday-photo');
    expect(link).not.toContain('blob:');
    expect(link).not.toContain('data:');
    for (const key of [
      'filename',
      'file=',
      'content',
      'bytes',
      'data=',
      'text=',
      'message',
      'email',
      'token',
      'secret',
      'hash',
      'path',
      'redirect',
      'callback',
      'webhook',
      'user',
      'account',
    ]) {
      expect(link).not.toContain(key);
    }
  });
});

test.describe('nothing about the file reaches the network', () => {
  test('no request carries the bytes, the filename or the requirement', async ({
    page,
  }) => {
    const seen: Request[] = [];
    page.on('request', (request) => seen.push(request));

    await open(page);
    await choose(page, await testDetailedPng(page, 900, 700), 'private-scan.png');
    await say(page, 'jpeg under 90 kb remove metadata');
    await runAndSave(page);

    for (const request of seen) {
      const url = request.url();
      // A fragment is never sent, so no request URL may contain one.
      expect(url).not.toContain('#');
      expect(url).not.toContain('private-scan');
      expect(url.toLowerCase()).not.toContain('under%2090');
      const body = request.postData();
      if (body) {
        expect(body).not.toContain('private-scan');
        // The JPEG the page produced must not appear in any request body.
        expect(body.includes('���')).toBe(false);
      }
    }

    // And no upload happened at all.
    const uploads = seen.filter(
      (request) =>
        request.method() === 'POST' || request.method() === 'PUT',
    );
    expect(uploads.map((request) => request.url())).toEqual([]);
  });
});

test.describe('mobile and keyboard', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('nothing overflows sideways at 375 px', async ({ page }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 1200, 900));
    await say(page, 'jpeg under 150 kb maximum width 600 px remove metadata');
    await expect(page.getByText(/Here is the plan:/iu).first()).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test('the whole flow is reachable by keyboard', async ({ page }) => {
    await open(page);
    await choose(page, await testDetailedPng(page, 600, 400));
    await page.locator('#command').focus();
    await page.keyboard.type('jpeg under 200 kb');
    await expect(page.getByText(/Here is the plan:/iu).first()).toBeVisible();

    const run = page.getByRole('button', { name: /prepare my file/iu });
    await run.focus();
    await expect(run).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Verified result/iu })).toBeVisible();

    const download = page.waitForEvent('download');
    const save = page.getByRole('button', { name: /^download$/iu });
    await save.focus();
    await page.keyboard.press('Enter');
    const saved = new Uint8Array(await readFile((await (await download).path())!));
    expect(sniff(saved)).toBe('jpeg');
  });
});

test.describe('existing links still work', () => {
  test('an ask link is untouched by this page', async ({ page }) => {
    // `/do` reads its own fragment and nothing else. A recipient page must
    // still answer exactly as it did before.
    const response = await page.goto('/ask');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).not.toContainText(
      /What must the final file satisfy/iu,
    );
  });
});
