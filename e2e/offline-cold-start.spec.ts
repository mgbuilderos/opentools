import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';

import { TELEMETRY_PREFIX } from '../lib/product-telemetry';
import { testPdf, testPhotoPdf, testPng } from './fixtures';
import { setFilesWhenLive } from './upload';

/**
 * Every precached page, cold-started with no network, doing its actual job.
 *
 * THE GAP THIS CLOSES. `scripts/build-service-worker-precache.mjs` holds nine
 * pages so an installed visitor can open them with the network off, and until
 * now two different things were being checked and only one of them was the
 * promise:
 *
 *   - `lib/seo/tool-page-depth.test.ts` asks whether a route claiming offline
 *     use is in that `PAGES` array. Membership means the page's *bytes* are
 *     held. It says nothing about whether the tool runs.
 *   - `e2e/share-target.spec.ts` loads `/pdf/merge` offline and requires a 200
 *     with a working file input, and runs one tool to completion offline
 *     (`/pdf/compress-offline`). The other seven were never run offline at all.
 *
 * That difference is not hypothetical. On 2026-09-24 `/pdf/compress` had been
 * precached for as long as the list existed, opened perfectly with the network
 * off, and could not compress anything: its engine is started with
 * `new Worker(...)` from a path that appears in no HTML, so the payload never
 * held it and the first file a visitor chose failed. A 200 and a file input
 * were both true the whole time. So this file asserts the promise itself —
 * open the page from the cache with the browser disconnected, then finish a
 * real piece of work — for **every** route in the list rather than one of them.
 *
 * `covers every page in the precache list` below makes that total: a route
 * added to `PAGES` with no entry here turns this red. Adding a page to the
 * payload is a claim that the page works offline, and this is where that claim
 * gets paid for.
 *
 * MEASURED ON 2026-09-29, against `origin/main` `2c6f4a0` built with
 * `npm run build`: all nine routes cold-start and finish their job with the
 * network off, and none of them makes a single failed request while doing it.
 * The `referencedWorkers` pass in the build script reaches every worker these
 * pages can start; see the note there for how that was re-checked.
 */

/** Sits beside `e2e/`, so the repository root is one level up. */
const projectRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/**
 * The precached pages, read out of the build script rather than copied.
 *
 * Copied, this file would go on passing after someone added a tenth page, and
 * the tenth page is exactly the one nobody has run offline yet. Comments come
 * out before the quoted paths go in, for the reason
 * `lib/seo/tool-page-depth.test.ts` gives at length: the array is annotated,
 * and one apostrophe in an annotation opens a string that the next real quote
 * closes, shifting every path after it by one.
 */
function precachedPages(): readonly string[] {
  const source = readFileSync(
    path.join(projectRoot, 'scripts/build-service-worker-precache.mjs'),
    'utf8',
  );
  const block = /const PAGES = \[([\s\S]*?)\];/u.exec(source);
  expect(block, 'the precache PAGES list could not be found').not.toBeNull();
  const array = block![1]!
    .replaceAll(/\/\*[\s\S]*?\*\//gu, '')
    .replaceAll(/\/\/[^\n]*/gu, '');
  return [...array.matchAll(/'([^']+)'/gu)].map((match) => match[1]!);
}

/** Inputs, built while there is still a network. They are not under test. */
/**
 * What a route needs handed to it, and nothing more.
 *
 * Only the fixtures an entry declares in `needs` are built, and all of them are
 * built before the network goes away — so the offline window contains the
 * tool's own work and nothing else, which is what this file measures.
 *
 * Building all three for every route cost the gate real time for nothing: five
 * of the nine want no PDF at all, and `testPhotoPdf` draws its photos through
 * the browser rather than assembling bytes in Node. The end-to-end gate already
 * runs ~45 minutes on one CI worker and goes flaky under load, so a fixture
 * nobody reads is not free.
 */
type InputName = 'pdf' | 'photoPdf' | 'png';

type Inputs = Partial<Record<InputName, Buffer>>;

interface ColdStart {
  readonly route: string;
  /** What finishing the job means here, for the test name. */
  readonly what: string;
  /** Fixtures to build before disconnecting. Anything not listed is not built. */
  readonly needs?: readonly InputName[];
  readonly run: (page: Page, inputs: Inputs) => Promise<void>;
  readonly finished: (page: Page) => ReturnType<Page['locator']>;
}

/** Hands a file to a tool that opens the picker rather than exposing an input. */
async function chooseThroughPicker(page: Page, buffer: Buffer, name: string) {
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page
      .getByRole('button', { name: /choose a pdf/iu })
      .first()
      .click();
    await (
      await chooser
    ).setFiles({ name, mimeType: 'application/pdf', buffer });
  }).toPass({ timeout: 45_000 });
}

const COLD_STARTS: readonly ColdStart[] = [
  {
    /*
      The one entry with no tool of its own. Almost nobody renders this page: a
      share from the Android share sheet is a POST that `public/sw.js` answers
      and redirects before anything paints, and that handler is what
      `e2e/share-target.spec.ts` exercises directly. What is precached is the
      landing it falls back to — a file-handler launch, or somebody opening the
      address — so what there is to prove offline is that the landing renders.
    */
    route: '/share-target',
    what: 'renders the landing a file handler launch falls back to',
    run: async () => {},
    finished: (page) =>
      page.getByRole('heading', { level: 1, name: 'Open a shared file' }),
  },
  {
    route: '/pdf/page-tools',
    what: 'rewrites a three-page PDF',
    needs: ['pdf'],
    run: async (page, inputs) => {
      await chooseThroughPicker(page, inputs.pdf!, 'three-pages.pdf');
      const apply = page.getByRole('button', { name: 'Apply PDF changes' });
      await expect(apply).toBeEnabled({ timeout: 30_000 });
      await apply.click();
    },
    finished: (page) =>
      page.getByRole('heading', { name: /^Done — \d+ pages? ready$/u }),
  },
  {
    route: '/pdf/merge',
    what: 'merges two PDFs into one',
    needs: ['pdf'],
    run: async (page, inputs) => {
      await setFilesWhenLive(
        page.locator('input[type="file"]').first(),
        [
          { name: 'one.pdf', mimeType: 'application/pdf', buffer: inputs.pdf! },
          { name: 'two.pdf', mimeType: 'application/pdf', buffer: inputs.pdf! },
        ],
        page.getByRole('button', { name: /^Merge 2 PDFs$/u }),
      );
      const merge = page.getByRole('button', { name: /^Merge 2 PDFs$/u });
      await expect(merge).toBeEnabled({ timeout: 30_000 });
      await merge.click();
    },
    finished: (page) => page.getByText(/Done — 2 PDFs became 1 PDF/u),
  },
  {
    /* The route the 2026-09-24 defect was found on. */
    route: '/pdf/compress',
    what: 'compresses a photo-heavy PDF',
    needs: ['photoPdf'],
    run: async (page, inputs) => {
      await chooseThroughPicker(page, inputs.photoPdf!, 'photos.pdf');
      await page.getByRole('slider', { name: 'Photo quality' }).fill('50');
      const compress = page.getByRole('button', { name: 'Compress PDF' });
      await expect(compress).toBeEnabled({ timeout: 30_000 });
      await compress.click();
    },
    finished: (page) =>
      page.getByRole('heading', { name: /^Done — \d+% smaller$/u }),
  },
  {
    route: '/pdf/compress-offline',
    what: 'reports itself ready and then compresses',
    needs: ['photoPdf'],
    run: async (page, inputs) => {
      /*
        This page's whole subject is the network being off, and the panel is
        its answer computed from Cache Storage rather than written in prose.
        Asserted here as well as in `e2e/share-target.spec.ts` because a panel
        that said "yes" while the run below failed would be the worst of the
        available outcomes: a reassurance the same page then disproves.
      */
      await expect(
        page.getByRole('region', {
          name: /Can this device compress a PDF with the network off/iu,
        }),
      ).toContainText('The compression engine, stored for offline use: yes', {
        timeout: 15_000,
      });
      await chooseThroughPicker(page, inputs.photoPdf!, 'offline.pdf');
      await page.getByRole('slider', { name: 'Photo quality' }).fill('50');
      const compress = page.getByRole('button', { name: 'Compress PDF' });
      await expect(compress).toBeEnabled({ timeout: 30_000 });
      await compress.click();
    },
    finished: (page) =>
      page.getByRole('heading', { name: /^Done — \d+% smaller$/u }),
  },
  {
    route: '/image/optimize',
    what: 'optimizes one image',
    needs: ['png'],
    run: async (page, inputs) => {
      /*
        The single-file path, not the batch. They are different code — one file
        fills `source` and enables "Optimize image", two or more switch the page
        into the batch runner — and `e2e/offline-dare.spec.ts` covers only the
        batch, so an offline failure in the single-file path had nowhere to
        show up. It is also the path a visitor takes first.
      */
      await setFilesWhenLive(
        page.locator('input[type="file"]').first(),
        { name: 'photo.png', mimeType: 'image/png', buffer: inputs.png! },
        page.getByRole('button', { name: 'Optimize image' }),
      );
      const optimize = page.getByRole('button', { name: 'Optimize image' });
      await expect(optimize).toBeEnabled({ timeout: 20_000 });
      await optimize.click();
    },
    // The save control, which exists only once a real encoded blob does.
    finished: (page) => page.locator('[data-receipt-download]'),
  },
  {
    route: '/data/csv-to-json',
    what: 'converts pasted CSV',
    run: async (page) => {
      await page.locator('textarea').first().fill('name,role\nAda,Engineer');
      await page.getByRole('button', { name: 'Convert to JSON' }).click();
    },
    finished: (page) => page.getByRole('heading', { name: /^Done — /u }),
  },
  {
    route: '/developer/workbench',
    what: 'runs its opening operation',
    /*
      No action: this workbench computes as its fields change and opens with a
      worked example already in them, so a cold start that hydrated at all has
      already produced output. There is no "Run tool" button to press, despite
      the `actionLabel` prop `components/developer-data-workbench-tool.tsx`
      passes — `components/schema-workbench-tool.tsx` destructures it and never
      renders it.
    */
    run: async () => {},
    finished: (page) => page.getByRole('heading', { name: /^Done — /u }),
  },
  {
    route: '/file/hash-calculator',
    what: 'checksums a file',
    run: async (page) => {
      await setFilesWhenLive(
        page.locator('input[type="file"]').first(),
        {
          name: 'statement.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.7 a small file to checksum'),
        },
        page.getByRole('button', { name: 'Calculate hash' }),
      );
      await page.getByRole('button', { name: 'Calculate hash' }).click();
    },
    finished: (page) => page.getByText('Done — SHA-256 calculated'),
  },
];

/*
  The rule that keeps this file total. Deliberately outside the block below, so
  it runs in every project rather than only the one engine that can drive a
  service worker: the list is parsed from a file, needs no browser, and a lane
  that runs the suite in WebKit alone should still be told it added a page
  nobody proved.
*/
test.describe('the precache list and this file are the same list', () => {
  test('covers every page in the precache list', () => {
    expect(COLD_STARTS.map((entry) => entry.route).sort()).toEqual(
      [...precachedPages()].sort(),
    );
  });
});

test.describe('cold start with no network', () => {
  /*
    Chromium only, and for two measured reasons rather than convenience.

    A controlling service worker answering navigations while the context is
    offline is Chromium-reliable and nothing else is; `e2e/share-target.spec.ts`
    skips every other engine for the same reason.

    And `context.setOffline(true)` is actively wrong in Playwright's WebKit:
    measured on 2026-09-29, an `<img>` given an in-memory `blob:` URL — a URL
    that needs no network at all — loads online and fails offline with "WebKit
    encountered an internal error". Half the tools here hand the browser a blob
    of their own output to decode, `/image/optimize` twice over (the preview and
    the check that the encoded bytes came out at the requested size), so a
    WebKit run of this file would report those tools broken while measuring the
    harness. `e2e/offline-dare.spec.ts` is the file that does run in both
    engines: it takes the network away by refusing every request instead, which
    is engine-independent and stricter, and it covers the same tools once they
    are open.
  */
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'a service worker answering offline navigations, and setOffline itself, are only sound in Chromium',
  );

  /** The worker that is actually controlling the page, not merely registered. */
  async function activeWorker(
    context: BrowserContext,
    page: Page,
  ): Promise<Worker> {
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      undefined,
      { timeout: 30_000 },
    );
    const worker = context
      .serviceWorkers()
      .find((entry) => entry.url().endsWith('/sw.js'));
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
            const name = names.find((entry) =>
              entry.startsWith('opentools-offline-'),
            );
            if (!name) return 0;
            return (await (await caches.open(name)).keys()).length;
          }),
        {
          timeout: 30_000,
          message: 'the worker never filled its offline cache',
        },
      )
      .toBeGreaterThan(5);
  }

  for (const entry of COLD_STARTS) {
    test(`${entry.route} — ${entry.what}`, async ({ context, page }) => {
      test.setTimeout(240_000);

      /*
        The sharpest assertion in the file, and the one that would have caught
        the 2026-09-24 defect on its own. A tool can finish while still having
        missed something the payload should hold — a font, a stylesheet, a
        second engine used for one branch — and a tool that cannot finish leaves
        the name of the file it wanted right here. Nothing offline is allowed to
        ask the network for anything, because there is nothing to ask.
      */
      const missed: string[] = [];
      const errors: string[] = [];
      let offline = false;
      page.on('requestfailed', (request) => {
        if (!offline) return;
        const requested = request.url().replace(/^https?:\/\/[^/]+/u, '');
        /*
          THE ONE EXEMPTION, AND WHY IT IS NOT FIXABLE ON THE PRODUCT SIDE.

          `/telemetry/v1/*` is the product-signal counter. Its assets are
          deliberately absent from the precache, so a completed job offline
          issues one `Image` GET that cannot succeed, loses the count, and
          carries on — ADR-020 records that visit as permanently uncounted.
          Nothing is queued, retried or replayed, and
          `e2e/product-telemetry.spec.ts` holds that shape.

          The product does try not to ask: `recordProductSignal` returns early
          when `navigator.onLine` is false. That covers a real browser and does
          nothing here, and the difference was measured rather than assumed
          (chromium-1194, this build):

            before setOffline(true)                     onLine = true
            same document, after setOffline(true)        onLine = false
            NEW document navigated to while offline      onLine = TRUE

          A document created while the context is offline comes up reporting
          online, and step 4 of this test is exactly such a navigation. So the
          guard cannot fire here, and no product change can make it: the page
          genuinely believes it has a network.

          The exemption is therefore on the harness side, by exact path prefix,
          imported from the module that owns it so a rename cannot silently
          widen it. Everything else still lands in `missed` — a missed font,
          stylesheet or second engine fails exactly as before, and this test
          still requires the tool to finish and the page not to say it is
          offline, so a counter that broke a tool would fail here regardless.
        */
        if (requested.startsWith(TELEMETRY_PREFIX)) return;
        missed.push(`${requested} (${request.failure()?.errorText})`);
      });
      page.on('pageerror', (error) => errors.push(String(error)));

      // Installing the worker is the visitor's first visit, which has a network.
      await page.goto('/');
      const worker = await activeWorker(context, page);
      await waitForPrecache(worker);
      // Built while there is still a network, and only what this route asked
      // for. The fixtures are the input, not the thing under test.
      const inputs: Inputs = {};
      for (const name of entry.needs ?? []) {
        if (name === 'pdf') inputs.pdf = await testPdf(3);
        if (name === 'photoPdf') inputs.photoPdf = await testPhotoPdf(page, 2);
        if (name === 'png') inputs.png = testPng();
      }

      await context.setOffline(true);
      offline = true;
      try {
        // The browser genuinely has no network here, which is the only
        // condition under which the worker answers a GET at all.
        expect(await worker.evaluate(() => self.navigator.onLine)).toBe(false);

        const response = await page.goto(entry.route);
        expect(
          response?.status(),
          `${entry.route} was not served from the offline payload`,
        ).toBe(200);

        await entry.run(page, inputs);
        await expect(
          entry.finished(page).first(),
          `${entry.route} opened offline and then could not ${entry.what}`,
        ).toBeVisible({ timeout: 180_000 });

        // A page that told the visitor it is offline instead of working.
        await expect(page.locator('body')).not.toContainText('You are offline');
      } finally {
        offline = false;
        await context.setOffline(false);
      }

      expect(
        missed,
        `${entry.route} asked the network for something the payload does not hold`,
      ).toEqual([]);
      expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
    });
  }
});
