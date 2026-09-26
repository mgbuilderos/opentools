import { expect, test } from '@playwright/test';

import { useOriginOf, watchOffOrigin } from './egress-watch';

/**
 * The command bar, in a browser, with the network watched.
 *
 * Unit tests cover the reading and the ranking (`lib/command/*.test.ts`). Two
 * things only a browser can show, and they are the two the box is claiming:
 *
 *   1. It works at all after hydration -- the index is imported on the first
 *      keystroke, and a dynamic import that fails leaves a box that takes typing
 *      and answers nothing.
 *   2. The sentence does not leave. Typing a whole request must produce no
 *      request with a body, nothing off-origin, and none of the typed words in
 *      any URL -- including a same-origin one, which is the shape CSP does not
 *      cover.
 *
 * The words typed here are deliberately distinctive ("margaret"), so the URL scan
 * is looking for something that could only have come from the box.
 */

/** The sentence the box offers as its own placeholder. */
const SENTENCE = 'make this under 2MB and strip my name out of it';

/**
 * A word that could only have come from the box, for the URL scan.
 *
 * It is typed as a SECOND sentence rather than dropped into the first: a word no
 * tool on the site contains is, correctly, a word the plan refuses to cover, so
 * putting it in the example would have been testing the refusal instead of the
 * answer. Either way it is typed, and either way no URL may contain it.
 */
const DISTINCTIVE = 'margaret';

test.beforeEach(({ baseURL }) => {
  useOriginOf(baseURL);
});

test.describe('the command bar', () => {
  test('answers a two-part request without sending anything', async ({
    page,
  }) => {
    const watcher = watchOffOrigin(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const box = page.getByLabel('What do you need done?');
    await expect(box).toBeVisible();
    await box.fill(SENTENCE);

    // Scoped to the box's own region: the home page is full of `<li>` elements,
    // and the first one on it is a category chip.
    const answer = page
      .getByRole('region', { name: 'Say what you need done' })
      .getByRole('listitem');
    await expect(answer.first()).toContainText('Compress PDF', {
      timeout: 15_000,
    });
    await expect(answer.nth(1)).toContainText('PDF metadata');
    // The ceiling it read, said back in the words it was given.
    await expect(page.getByText('2 MB or under')).toBeVisible();

    // Typed as its own sentence, and answered -- with a refusal, since no tool
    // here draws a flowchart. What matters for the scan below is that the word was
    // typed at all.
    await box.fill(`draw a flowchart of ${DISTINCTIVE}`);
    await expect(
      page.getByText(
        `Nothing here does \u201cdraw a flowchart of ${DISTINCTIVE}\u201d`,
      ),
    ).toBeVisible({ timeout: 15_000 });

    watcher.assertNothingLeft('command bar, after a full request');
    watcher.assertNothingCarriedAFile('command bar', DISTINCTIVE);
    await watcher.assertZeroBytesOffOrigin(page);
  });

  /**
   * The refusal. There are four translators in this catalogue and not one of them
   * is a language, so a box that ranks confidently would answer this with Pig
   * Latin. `lib/command/limits.ts` exists for exactly this sentence.
   */
  test('says it cannot translate, and why', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page
      .getByLabel('What do you need done?')
      .fill('translate this to spanish');

    await expect(
      page.getByText('Nothing here does \u201ctranslate this to spanish\u201d'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText('needs a model this site does not carry'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Morse-code translator' }),
    ).toBeVisible();
  });

  /**
   * A gap that is a gap, rather than a rule of the place, offers to be reported.
   * The link is built and not followed: nothing is sent by rendering it, and the
   * test asserts the words are in it rather than clicking through to GitHub.
   */
  test('offers to file a tool this site does not have', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page
      .getByLabel('What do you need done?')
      .fill('make me a flowchart of this process');

    const request = page.getByRole('link', {
      name: 'Ask for this tool on GitHub',
    });
    await expect(request).toBeVisible({ timeout: 15_000 });
    const href = await request.getAttribute('href');
    expect(href).toContain('template=tool_request.yml');
    expect(decodeURIComponent(href ?? '')).toContain('flowchart');
  });

  /**
   * The chain. Two operations the kernel can run, handed to the batch runner as a
   * pipeline it loads and reports -- which is the same path a shared pipeline link
   * takes, so this also proves the link is in the shape that page accepts.
   */
  test('hands a two-step chain to the batch runner', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page
      .getByLabel('What do you need done?')
      .fill('deduplicate this csv then sort the lines');

    const chain = page.getByRole('link', { name: /Run all 2 steps/u });
    await expect(chain).toBeVisible({ timeout: 15_000 });
    await chain.click();

    await expect(page).toHaveURL(/\/batch\?pipeline=/u);
    await expect(
      page.getByText('Loaded settings-only pipeline link'),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('CSV deduplicator')).toBeVisible();
    await expect(page.getByText('Line sorter')).toBeVisible();
  });

  /**
   * The dropzone answers "this".
   *
   * The same sentence, with a PNG on the dropzone below: every step has to move
   * from the PDF tools to the image ones, because "make this under 2MB" depends
   * entirely on what "this" is. The file does not move -- only the one word
   * saying what kind it is crosses between the two components.
   */
  test('answers "this" with whatever is on the dropzone', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const box = page.getByLabel('What do you need done?');
    await box.fill(SENTENCE);
    const steps = page
      .getByRole('region', { name: 'Say what you need done' })
      .getByRole('listitem');
    await expect(steps.first()).toContainText('Compress PDF', {
      timeout: 15_000,
    });

    // A 1x1 PNG, dropped the way the page's own file input takes one.
    await page.setInputFiles('input[type="file"]', {
      name: 'holiday.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    });

    await expect(
      page.getByText('Reading \u201cthis\u201d as the image'),
    ).toBeVisible();
    await expect(steps.first()).toContainText('Resize image to exact KB', {
      timeout: 15_000,
    });
    await expect(steps.nth(1)).toContainText('Photo metadata');
  });

  /** The box is in the prerendered HTML, so it is there before any script runs. */
  test('is in the page before hydration', async ({ page }) => {
    await page.route('**/*.js', (route) => route.abort());
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.getByText('Say what you need done')).toBeVisible();
  });
});
