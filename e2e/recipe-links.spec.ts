import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

import { testPng } from './fixtures';

/**
 * Recipe links in a real browser.
 *
 * `lib/tools/recipe-link.test.ts` already proves the encoding rules in
 * isolation. What a unit test cannot show is the part that matters to someone
 * who was sent a link: that the settings reach the running job, that a hostile
 * link changes nothing, and that the copied link reproduces the setup when it
 * is opened again. Those need the page.
 *
 * The strongest assertion here reads the saved file's magic bytes. A test that
 * only checked the dropdown would pass even if the shared setting never
 * reached the encoder.
 *
 * LOCATOR NOTES, both learned by being wrong first. The notice is matched by
 * `getByRole('status')` — its `<output>` element — and not by its text: the
 * text matches the inner `<span>` that carries the heading alone, so a
 * `toContainText` of the settings against it fails. And the dimension boxes
 * are `input[type=number]`, whose role is `spinbutton`, not `textbox`.
 */

async function chooseImage(page: Page, name = 'source.png') {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /choose (an )?image$/iu }).click();
  await (
    await chooser
  ).setFiles({ name, mimeType: 'image/png', buffer: testPng(64) });
}

async function savedImageBytes(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image' }).click();
  return new Uint8Array(await readFile(await (await download).path()));
}

/**
 * Make the clipboard refuse, the way a non-secure context, a locked-down
 * browser or an embedded webview does, so the button's fallback is what runs.
 *
 * WHY FORCE IT rather than let each engine do as it pleases. Reading the
 * clipboard back is not portable: WebKit permits `writeText` but denies
 * `readText`, and refuses the `clipboard-write` permission name outright, so a
 * test that reads the clipboard passes in Chromium and fails in WebKit for
 * reasons that have nothing to do with this feature. Forcing the refusal makes
 * the path deterministic in both engines and puts the link in the DOM, where
 * it can simply be read — and it means the fallback is genuinely exercised
 * rather than reasoned about.
 */
async function refuseClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('blocked for test')),
      },
    });
  });
}

/** The link the button produced, read out of the fallback box. */
async function copiedLink(page: Page) {
  await page.getByRole('button', { name: 'Copy setup link' }).click();
  return page
    .getByRole('textbox', { name: /blocked the clipboard/iu })
    .inputValue();
}

test.describe('Recipe links carry settings between people', () => {
  test('a shared link reaches the encoder, not just the controls', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    // The page's own default is WebP. If the link is dropped anywhere along
    // the way, the saved bytes are WebP and this fails.
    await page.goto('/image/optimize?format=png&quality=70&width=48&height=48');

    await expect(page.getByRole('status')).toContainText(
      'PNG · quality 70 · max width 48 px · max height 48 px',
    );

    await chooseImage(page);
    await page.getByRole('button', { name: 'Optimize image' }).click();

    const saved = await savedImageBytes(page);
    expect(
      [...saved.subarray(0, 8)],
      'the shared PNG setting did not reach the encoder',
    ).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // Said the other way round too, because WebP is the signature a silently
    // ignored link would have left behind.
    expect(
      new TextDecoder('ascii').decode(saved.subarray(8, 12)),
    ).not.toContain('WEBP');

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('takes the settings out of the address bar so a later edit is not fought', async ({
    page,
  }) => {
    await page.goto('/image/optimize?format=jpeg&quality=55&width=900');
    await expect(page.getByRole('status')).toBeVisible();

    // Applied once, then cleared: the URL must not keep re-asserting values
    // the person is now free to change.
    await expect.poll(() => new URL(page.url()).search).toBe('');
    await expect(
      page.getByRole('combobox', { name: /output format/iu }),
    ).toHaveValue('image/jpeg');
    await expect(
      page.getByRole('spinbutton', { name: /max width/iu }),
    ).toHaveValue('900');
  });

  test('ignores a link whose values could never have been chosen', async ({
    page,
  }) => {
    await page.goto(
      '/image/optimize?format=gif&quality=99999&width=abc&height=-5&filename=passport.pdf',
    );
    await expect(
      page.getByRole('button', { name: 'Copy setup link' }),
    ).toBeVisible();

    // Nothing applied, so nothing announced, and the tool sits on its own
    // defaults rather than on a stranger's numbers.
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.getByRole('combobox', { name: /output format/iu }),
    ).toHaveValue('image/webp');
    await expect(
      page.getByRole('spinbutton', { name: /max width/iu }),
    ).toHaveValue('1600');
    await expect(page.getByRole('slider', { name: /quality/iu })).toHaveValue(
      '82',
    );
  });

  test('the copied link reopens the same setup and carries no file', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await refuseClipboard(page);

    await page.goto('/image/optimize');
    // The file goes first on purpose: for someone who did NOT arrive from a
    // link, choosing an image re-fits the dimension boxes to it, so settings
    // made beforehand would be overwritten here and this would be testing the
    // wrong thing. Loading one at all matters — "carries no file" has to be
    // asserted against a page that actually holds one.
    await chooseImage(page, 'private-passport-scan.png');
    await page
      .getByRole('combobox', { name: /output format/iu })
      .selectOption('image/jpeg');
    await page.getByRole('spinbutton', { name: /max width/iu }).fill('720');

    const copied = await copiedLink(page);
    expect(copied).toContain('format=jpeg');
    expect(copied).toContain('width=720');
    expect(copied, 'the chosen filename reached a shareable URL').not.toContain(
      'passport',
    );

    const reopened = new URL(copied);
    await page.goto(`${reopened.pathname}${reopened.search}`);
    await expect(page.getByRole('status')).toContainText('JPEG');
    await expect(
      page.getByRole('combobox', { name: /output format/iu }),
    ).toHaveValue('image/jpeg');
    await expect(
      page.getByRole('spinbutton', { name: /max width/iu }),
    ).toHaveValue('720');
  });

  test('writes to the real clipboard when the browser allows it', async ({
    page,
    context,
    browserName,
  }) => {
    // Chromium only, and deliberately: it is the one engine here that will
    // hand the clipboard back for inspection. The fallback test above covers
    // both engines, so skipping this loses coverage of the happy path on
    // WebKit only — which is the same trade every clipboard test makes.
    test.skip(
      browserName !== 'chromium',
      'WebKit permits writeText but denies readText, and rejects the permission name',
    );
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/text/case-converter?mode=title');
    // Wait for the shared mode to land, or the button would copy the page's
    // default and this would pass while proving nothing.
    await expect(page.getByRole('status')).toContainText('Title Case');
    await page.getByRole('button', { name: 'Copy setup link' }).click();

    await expect(
      page.getByRole('button', { name: 'Setup link copied' }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${new URL(page.url()).origin}/text/case-converter?mode=title`,
    );
    // The fallback box is for when the write fails; it must not appear here.
    await expect(
      page.getByRole('textbox', { name: /blocked the clipboard/iu }),
    ).toHaveCount(0);
  });

  test('keeps the shared size when the recipient picks their own file', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // The defect this exists for: choosing an image re-fits the dimension
    // boxes to that image, which silently replaced a shared "max width 720 px"
    // with 64 the moment the recipient added a file — while the notice above
    // still promised 720. A link whose settings evaporate on use is worse than
    // no link.
    await page.goto('/image/optimize?format=jpeg&width=720&height=720');
    await expect(page.getByRole('status')).toContainText('max width 720 px');

    await chooseImage(page);

    await expect(
      page.getByRole('spinbutton', { name: /max width/iu }),
      'choosing a file overwrote the shared max width',
    ).toHaveValue('720');
    await expect(
      page.getByRole('spinbutton', { name: /max height/iu }),
    ).toHaveValue('720');
  });

  test('still fits the boxes to the image when no link was involved', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // The other side of the guard above: someone who just opened the tool
    // must keep the old convenience of the boxes matching their image.
    await page.goto('/image/optimize');
    await chooseImage(page);

    await expect(
      page.getByRole('spinbutton', { name: /max width/iu }),
    ).toHaveValue('64');
  });

  test('describes a PDF recipe in words before anything runs', async ({
    page,
  }) => {
    // The recipient arrives with no file, and this page's settings controls
    // only render once a PDF is loaded — so these words are the only thing
    // they have to judge the link by. That is why the notice states every
    // setting rather than just saying "settings applied".
    await page.goto(
      '/pdf/compress?recompress=on&quality=55&maxedge=1000&metadata=off',
    );

    await expect(page.getByRole('status')).toContainText(
      'images recompressed · photo quality 55 · photos to 1000 px (email) · metadata kept',
    );
    await expect.poll(() => new URL(page.url()).search).toBe('');
  });

  test('applies a shared case mode on the text converter', async ({ page }) => {
    await page.goto('/text/case-converter?mode=upper');

    await expect(page.getByRole('status')).toContainText('UPPERCASE');
    await expect(
      page.getByRole('button', { name: 'UPPERCASE' }),
    ).toHaveAttribute('aria-pressed', 'true');

    // End to end: the shared mode is the one the tool actually runs.
    await page.getByRole('textbox', { name: 'Text to convert' }).fill('hello');
    await page.getByRole('button', { name: 'Convert text' }).click();
    await expect(page.getByText('HELLO', { exact: true })).toBeVisible();
  });
});
