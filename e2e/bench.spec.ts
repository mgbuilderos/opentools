import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { extractEntry, readZip } from '@/lib/tools/archive/zip-reader';
import { typeUntilVisible } from './hydration';
import { setFilesWhenLive } from './upload';

/**
 * The passage that warms the dedicated workbench before the benchmark's clock
 * starts, and the reason it is not the passage the benchmark times.
 *
 * Two words, where the timed passage has three. React ignores an event carrying
 * the value it already holds, so warming with 'one two three' and then timing a
 * fill of 'one two three' leaves the finished panel from the warm-up on screen
 * and the wait is answered before any work happens. Measured on 2026-09-30:
 * that shape reports `dedicatedMs=3.2` where the true figure is ~300.
 */
const WARM_UP = 'alpha beta';

/**
 * How long one warm-up attempt waits for the page to answer.
 *
 * The workbench auto-runs on a 250 ms debounce, so `typeUntilVisible`'s own
 * 500 ms default leaves almost no headroom on a loaded machine — and this
 * repository has ~19 worktrees whose lanes run at the same time.
 */
const WARM_UP_SETTLE = 3_000;

/**
 * Choose one pipeline step, waiting for the picker to actually offer it.
 *
 * The search box is server-rendered, so `fill` can land before React has
 * hydrated its change handler: the text appears, `setQuery` never fires, and
 * the option list stays unfiltered. `selectOption` then spends its whole
 * timeout reporting "did not find some options". WebKit lost that race on
 * 2026-09-26 while Chromium won it, which is exactly the shape of bug a
 * one-browser gate cannot see. Retrying the fill until the option appears
 * waits for the state the test needs rather than for a fixed number of
 * milliseconds.
 */
async function pickStep(page: Page, query: string, value: string) {
  const search = page.getByLabel('Search operations that can come next');
  const picker = page.getByLabel('Operation for this step');
  await expect(async () => {
    await search.fill(query);
    await expect(picker.locator(`option[value="${value}"]`)).toBeAttached({
      timeout: 1_000,
    });
  }).toPass({ timeout: 15_000 });
  await picker.selectOption(value);
}

test.describe('The Bench', () => {
  test('is discoverable from the home page and opens from search', async ({
    page,
  }) => {
    await page.goto('/');
    // The prerendered input exists before its React change handler is hydrated,
    // and it is controlled (`value={query}` in components/app-shell.tsx), so a
    // fill landing in that window is written back over rather than merely lost:
    // `setQuery` never fires, the results listbox is never rendered, and the
    // wait below fails on an option that is never coming. What used to be here
    // was `waitForTimeout(500)`, which is a guess about hydration rather than a
    // fact about it. Reproduced 2026-09-30 by delaying this page's own chunks
    // 1.5s: the sleep shape failed, this one passed on the same page.
    const benchResult = page.getByRole('option', { name: /The Bench/u });
    await typeUntilVisible(
      page.getByRole('combobox', { name: 'Search tools' }),
      'The Bench',
      benchResult,
      WARM_UP_SETTLE,
    );
    await benchResult.click();

    await expect(page).toHaveURL(/\/batch$/u);
    await expect(
      page.getByRole('heading', { level: 1, name: /Run one operation over a whole folder/u }),
    ).toBeVisible();
  });

  test('previews and runs files without external egress', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname))
        external.push(request.url());
    });

    await page.goto('/batch');
    await expect(
      page.getByRole('heading', { level: 1, name: /Run one operation over a whole folder/u }),
    ).toBeVisible();
    // The file input is server-rendered, so files handed to it before React
    // attaches `onChange` fire a change event into nothing: the page keeps
    // saying 'No files selected.' and every later step fails on a control that
    // depends on the upload. This was not hypothetical here — it is the
    // `bench.spec.ts:49` failure this board recorded on 2026-09-26, read at the
    // time as an egress problem. Reproduced deterministically on 2026-09-30 by
    // delaying this page's own chunks 1.5s.
    await setFilesWhenLive(
      page.getByLabel('Upload file to inspect and detect tools'),
      [
        {
          name: 'alpha.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('one two three'),
        },
        {
          name: 'beta.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('four five'),
        },
      ],
      page.getByTestId('input-summary').filter({ hasText: '2 files ready' }),
    );
    await expect(page.getByTestId('input-summary')).toContainText(
      '2 files ready',
    );
    await page.getByRole('button', { name: 'Dry run first file' }).click();
    await expect(page.getByTestId('dry-run')).toContainText(
      'alpha-word-counter.txt',
    );
    await page.getByRole('button', { name: 'Run 2 files' }).click();
    await expect(
      page.getByTestId('outcomes').getByRole('listitem'),
    ).toHaveCount(2);
    const receipt = page.getByTestId('receipt');
    await expect(receipt).toContainText('Inputs: 2');
    await expect(receipt).toContainText('Succeeded: 2');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download receipt.txt' }).click();
    const receiptDownload = await downloadPromise;
    expect(receiptDownload.suggestedFilename()).toBe('receipt.txt');
    const receiptPath = await receiptDownload.path();
    expect(receiptPath).not.toBeNull();
    const receiptText = await readFile(receiptPath!, 'utf8');
    expect(
      receiptText.endsWith(
        'Bytes uploaded: 0 - this page cannot make a network request.',
      ),
    ).toBe(true);
    expect(external).toEqual([]);
  });

  test('runs a two-step pipeline over two files with zero external egress', async ({
    page,
  }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname))
        external.push(request.url());
    });

    await page.goto('/batch');
    await expect(
      page.getByRole('heading', { level: 1, name: /Run one operation over a whole folder/u }),
    ).toBeVisible();
    // Same lost-upload race as the test above; see the comment there.
    await setFilesWhenLive(
      page.getByLabel('Upload file to inspect and detect tools'),
      [
        {
          name: 'alpha.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('one two three'),
        },
        {
          name: 'beta.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('four five'),
        },
      ],
      page.getByTestId('input-summary').filter({ hasText: '2 files ready' }),
    );

    // Each step is chosen inside the editor, from the operations that can
    // take what the step before it produces.
    await pickStep(page, 'word counter', 'text:word-counter');
    await page
      .getByRole('button', { name: 'Add Word counter', exact: true })
      .click();

    await pickStep(page, 'text reverser', 'text:text-reverser');
    await page
      .getByRole('button', { name: 'Add Text reverser', exact: true })
      .click();
    await expect(
      page.getByTestId('pipeline-steps').getByRole('listitem'),
    ).toHaveCount(2);

    await page
      .getByRole('button', { name: 'Run pipeline over 2 files' })
      .click();
    await expect(
      page.getByTestId('outcomes').getByRole('listitem'),
    ).toHaveCount(2);
    await expect(page.getByTestId('receipt')).toContainText('Steps:');
    await expect(page.getByTestId('receipt')).toContainText(
      '1. Word counter (word-counter @ text)',
    );
    await expect(page.getByTestId('receipt')).toContainText(
      '2. Text reverser (text-reverser @ text)',
    );

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download results ZIP' }).click();
    const resultDownload = await downloadPromise;
    const resultPath = await resultDownload.path();
    expect(resultPath).not.toBeNull();
    const zipBytes = new Uint8Array(await readFile(resultPath!));
    const archive = readZip(zipBytes);
    const texts = await Promise.all(
      archive.entries.map(async (entry) =>
        new TextDecoder().decode(await extractEntry(zipBytes, entry)),
      ),
    );
    expect(texts.toSorted()).toEqual(['2', '3']);
    expect(external).toEqual([]);
  });

  test('shares a chain as a link that carries the steps and nothing else', async ({
    page,
  }) => {
    await page.goto('/batch');

    await pickStep(page, 'word counter', 'text:word-counter');
    await page
      .getByRole('button', { name: 'Add Word counter', exact: true })
      .click();

    await pickStep(page, 'text reverser', 'text:text-reverser');
    await page
      .getByRole('button', { name: 'Add Text reverser', exact: true })
      .click();

    await page.getByLabel('Pipeline name').fill('Novak board minutes');
    await page.getByRole('button', { name: 'Copy recipe link' }).click();
    const link = await page.getByTestId('recipe-link').inputValue();

    // The steps travel, spelled out. The name the sender typed does not.
    expect(link).toContain('s1=text.word-counter');
    expect(link).toContain('s2=text.text-reverser');
    expect(link.toLowerCase()).not.toContain('novak');
    expect(link.toLowerCase()).not.toContain('minutes');

    // Opening it shows the steps to read before anything runs.
    await page.goto(link);
    const arrival = page.getByTestId('recipe-arrival');
    await expect(arrival).toContainText('Word counter');
    await expect(arrival).toContainText('Text reverser');
    await page.getByRole('button', { name: 'Use these steps' }).click();
    await expect(
      page.getByTestId('pipeline-steps').getByRole('listitem'),
    ).toHaveCount(2);
    // Answering the link takes its keys out of the address bar.
    await expect(page).toHaveURL(/\/batch$/u);
  });

  test('names the folder mode available in this browser', async ({ page }) => {
    await page.goto('/batch');
    await expect(
      page.getByText(/browser can read a folder|folders read-only/u),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Choose folder for ZIP' }),
    ).toBeVisible();
  });

  test('measures one file against its dedicated workbench', async ({
    page,
  }, testInfo) => {
    const fixture = {
      name: 'timing.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('one two three'),
    };

    await page.goto('/text/workbench?tool=word-counter');
    const input = page.getByLabel('Text to count');
    const anyResult = page.getByRole('heading', { name: /^Done/u });

    /*
      Warm the shell before the clock starts.

      What used to be here was `await expect(getByLabel('Text to count'))
      .toBeVisible()` followed by `waitForTimeout(500)`, and neither line could
      establish hydration. `word-counter` is the first entry in TEXT_OPERATIONS
      and this component's own initial state, so `Text to count` is in the
      prerendered HTML — checked against dist/client/text/workbench.html, it is
      there — and is visible while the textarea is still inert. The textarea is
      controlled (`value={input}` in components/text-workbench-tool.tsx), so a
      fill landing in that window is not merely ignored: React writes its own
      state back over it, the tool never runs, and the wait below times out on a
      result that is never coming.

      Note the file. The race lives in components/text-workbench-tool.tsx, which
      is what app/text/workbench/page.tsx renders — not in
      components/schema-workbench-tool.tsx, which this page never loads.

      Reproduced on 2026-09-30 by delaying this page's own chunks 1.5s: the two
      lines above failed every time, this one passed on the same page.
    */
    await typeUntilVisible(
      input,
      WARM_UP,
      page.getByRole('heading', { name: /Done — 2 words counted/u }),
      WARM_UP_SETTLE,
    );

    /*
      Then hand the page back exactly as the sleep used to leave it — hydrated,
      field empty, no result — so this still times a first run rather than a warm
      re-run, and so the wait below cannot be answered by the warm-up's own
      output. Both properties are load-bearing, and the numbers say the
      measurement survived: 307.7 ms on the old shape, 297.5 ms on this one, and
      293.6 ms on this one with the bundle delayed 1.5s, where the old shape
      produces no number at all.
    */
    await input.fill('');
    await expect(anyResult).toHaveCount(0);

    const dedicatedStarted = performance.now();
    await input.fill('one two three');
    // Named rather than the bare /Done/u, because the heading renders
    // `Done — {summary}` and word-counter's summary carries the count: only a
    // three-word input can produce this one. The bare version would be
    // satisfied by any result still on screen, which is how a warm-up turns a
    // benchmark into a no-op.
    await expect(
      page.getByRole('heading', { name: /Done — 3 words counted/u }),
    ).toBeVisible();
    const dedicatedMs = performance.now() - dedicatedStarted;

    await page.goto('/batch');
    await expect(
      page.getByRole('heading', { level: 1, name: /Run one operation over a whole folder/u }),
    ).toBeVisible();
    // A blind sleep stood here too, and this is the half that carries the only
    // assertion in the test. `Run 1 files` is named after the number of files
    // the page has read, so an upload lost to the same pre-hydration race gives
    // a button that never exists and a click that spends its whole timeout —
    // and the failure surfaces as this benchmark being slow rather than as a
    // lost file.
    await setFilesWhenLive(
      page.getByLabel('Upload file to inspect and detect tools'),
      fixture,
      page.getByTestId('input-summary').filter({ hasText: '1 files ready' }),
    );
    const benchStarted = performance.now();
    await page.getByRole('button', { name: 'Run 1 files' }).click();
    await expect(
      page.getByTestId('outcomes').getByRole('listitem'),
    ).toHaveCount(1);
    const benchMs = performance.now() - benchStarted;

    console.info(
      `${testInfo.project.name} single-file timing: dedicated ${dedicatedMs.toFixed(1)} ms; Bench ${benchMs.toFixed(1)} ms`,
    );
    expect(benchMs).toBeLessThan(2_000);
  });
});
