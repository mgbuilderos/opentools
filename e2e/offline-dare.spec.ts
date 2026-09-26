import { expect, test, type Page } from '@playwright/test';

import { useOriginOf, watchOffOrigin } from './egress-watch';
import { testPng } from './fixtures';
import { setFilesWhenLive } from './upload';

/**
 * The dare, as something that runs rather than something written on a page.
 *
 * The pitch the product wants to lead with is "turn off your internet, now use
 * the tool". It is the strongest thing this site can say, because no
 * upload-based rival can say it at all — and it is worth exactly nothing if a
 * visitor takes the dare and the tool stalls. A dare that fails once is worse
 * than no dare, because the visitor concludes the privacy claim is the same
 * kind of talk.
 *
 * So the claim needs a measurement, and the measurement has to be the *honest*
 * claim rather than a bigger one. There are two different promises here and
 * only one of them is true for the whole catalogue:
 *
 *   1. **Cold start with no network** — close the tab, disconnect, reopen the
 *      site, navigate to a tool. This works only for what the service worker
 *      carries: `scripts/build-service-worker-precache.mjs` holds **nine**
 *      routes, deliberately, because every path in that list costs every
 *      installed visitor its bytes on every worker update.
 *      `e2e/share-target.spec.ts` already proves those nine with the browser
 *      disconnected, and `lib/seo/tool-page-depth.test.ts` refuses an offline
 *      claim on any page outside the list.
 *
 *   2. **Finish the job with no network** — the tool is open, the scripts are
 *      already in the tab, the network goes away, and the work still completes.
 *      This is true for **every** tool on the site, because the work was never
 *      going to touch the network. It is the larger promise by a factor of
 *      about 160, and until this file existed it had **no test anywhere**.
 *
 * This file is (2). It is what licenses the dare in the product's own words,
 * and it is a guard: a tool that quietly grows a network dependency — a font, a
 * wasm binary fetched on demand, a "check for updates" call — turns this red
 * instead of turning a visitor away.
 *
 * Note what is deliberately not done here: the network is cut **before** the
 * run starts, not during it. Cutting it mid-run would test the browser's
 * scheduling rather than the product, and would pass for the wrong reason on a
 * tool that had already finished.
 */

/**
 * Takes the network away, in a way both engines actually honour.
 *
 * `context.setOffline(true)` is Chromium-only in practice: WebKit accepts the
 * call and the page goes on reaching the server, so a WebKit run of this file
 * built on `setOffline` alone hung all three tests at 30s while measuring
 * nothing. That is why `e2e/share-target.spec.ts` skips every engine but
 * Chromium for its offline work.
 *
 * Aborting every request is engine-independent and *stricter* than the offline
 * flag: the flag asks the browser to behave as if disconnected, whereas this
 * refuses each request outright, service-worker traffic included. A tool that
 * survives it would survive a pulled cable. `setOffline` is kept on top where
 * it is real, so `navigator.onLine` also flips and any code reading it takes
 * the same path a disconnected visitor gets.
 */
async function cutTheNetwork(
  page: Page,
  context: import('@playwright/test').BrowserContext,
  browserName: string,
) {
  await page.route('**/*', (route) => route.abort());
  if (browserName === 'chromium') await context.setOffline(true);
}

async function restoreTheNetwork(
  page: Page,
  context: import('@playwright/test').BrowserContext,
  browserName: string,
) {
  if (browserName === 'chromium') await context.setOffline(false);
  await page.unroute('**/*');
}

test.beforeEach(({ baseURL }) => {
  useOriginOf(baseURL);
});

/**
 * A run of one real tool, described the way the page presents it.
 *
 * `reacted` is whatever the page shows for a file it has actually taken —
 * `setFilesWhenLive` needs it to tell a live handler from a lost change event,
 * which is the race every file input on this server-rendered site can lose.
 */
type Dare = {
  readonly route: string;
  readonly what: string;
  readonly files: Parameters<Page['setInputFiles']>[1];
  readonly reacted: (page: Page) => ReturnType<Page['locator']>;
  readonly run: (page: Page) => Promise<void>;
  readonly finished: (page: Page) => ReturnType<Page['locator']>;
};

const DARES: readonly Dare[] = [
  {
    route: '/file/hash-calculator',
    what: 'checksums a file',
    files: {
      name: 'statement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7 a small file to checksum'),
    },
    reacted: (page) => page.getByRole('button', { name: 'Calculate hash' }),
    run: async (page) => {
      await page.getByRole('button', { name: 'Calculate hash' }).click();
    },
    finished: (page) => page.getByText('Done — SHA-256 calculated'),
  },
  {
    route: '/image/optimize',
    what: 'optimizes three images at once',
    files: [
      { name: 'first.png', mimeType: 'image/png', buffer: testPng() },
      { name: 'second.png', mimeType: 'image/png', buffer: testPng() },
      { name: 'third.png', mimeType: 'image/png', buffer: testPng() },
    ],
    reacted: (page) => page.getByText('Batch of 3 files'),
    run: async (page) => {
      await page.getByRole('button', { name: 'Optimize all' }).click();
    },
    // Three, not one: a batch that stops after the first file offline would
    // still show a result and would still be broken.
    finished: (page) => page.locator('[data-batch-result="done"]'),
  },
];

for (const dare of DARES) {
  test(`${dare.route} — ${dare.what} with the network switched off`, async ({
    page,
    context,
    browserName,
  }) => {
    // The offline half is what is under test, so watch for egress across the
    // whole run: an off-origin request made *before* the cut would be a leak
    // this file should fail on even though the dare itself still passed.
    const watcher = watchOffOrigin(page);

    await page.goto(dare.route);

    // The tool has to be genuinely interactive before the network goes away,
    // or this measures a half-loaded page rather than a working one. Handing
    // the input its files is the strongest available proof of that, because the
    // page has to react to them.
    const input = page.locator('input[type="file"]').first();
    await setFilesWhenLive(input, dare.files, dare.reacted(page));

    await cutTheNetwork(page, context, browserName);
    try {
      // Nothing between here and the assertion is allowed to need a server.
      await dare.run(page);
      await expect(
        dare.finished(page).first(),
        `${dare.route} did not finish its job with the network off`,
      ).toBeVisible({ timeout: 30_000 });

      // A tool that silently degraded — caught nothing, produced an empty
      // result and called it done — would satisfy a visibility check. The
      // batch case asserts the full count for the same reason.
      if (dare.route === '/image/optimize') {
        await expect(dare.finished(page)).toHaveCount(3);
      }

      // The page must not have told the visitor it is offline. The service
      // worker's offline notice appearing here would mean the *navigation*
      // layer reacted to the cut even though no navigation happened.
      await expect(page.locator('body')).not.toContainText('You are offline');
    } finally {
      // Leave the context usable for teardown and for any retry.
      await restoreTheNetwork(page, context, browserName);
    }

    watcher.assertNothingLeft('the offline dare');
    await watcher.assertZeroBytesOffOrigin(page);
  });
}

/**
 * The dare is a property of the whole page load, not of the moment after it.
 *
 * A tool that fetches something on first use would pass the tests above if the
 * fetch happened while `setFilesWhenLive` was still running. This one never
 * lets the page reach the network after the initial navigation at all, which is
 * the state a visitor who disconnects immediately is actually in.
 */
test('a tool opened and then abandoned by the network still finishes', async ({
  page,
  context,
  browserName,
}) => {
  const watcher = watchOffOrigin(page);

  await page.goto('/file/hash-calculator');
  const input = page.locator('input[type="file"]').first();
  await expect(input).toBeAttached({ timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  // Cut first, then do everything — choosing the file included.
  await cutTheNetwork(page, context, browserName);
  try {
    await input.setInputFiles({
      name: 'contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7 chosen after the network was gone'),
    });
    await page.getByRole('button', { name: 'Calculate hash' }).click();
    await expect(
      page.getByText('Done — SHA-256 calculated'),
      'the tool needed the network between opening and running',
    ).toBeVisible({ timeout: 30_000 });
  } finally {
    await restoreTheNetwork(page, context, browserName);
  }

  watcher.assertNothingLeft('the offline dare');
  await watcher.assertZeroBytesOffOrigin(page);
});
