import { expect, test } from '@playwright/test';

import { LIVE_TOOL_ROUTES } from '../lib/seo/live-tools';
import {
  REMOTE_FETCH_VECTORS,
  TRACKER_HOST,
  trackerProbeEml,
} from './remote-fetch-vectors';

/**
 * Opening a message must not tell the sender you opened it.
 *
 * `/email/reader` renders HTML somebody else wrote, which no other tool on this
 * site does. Every other route takes a file and computes something; this one
 * takes a document authored by a stranger, sanitises it, and puts it in the
 * DOM. A single surviving remote URL turns the page into a read receipt: the
 * sender learns the message was opened, when, and the reader's IP.
 *
 * Found on 2026-09-26 against `antigravity/email-reader`: three SVG vectors
 * fetched on the shipped build while the page said images were not loaded.
 * The unit tests could not have caught it — `vitest.config` sets
 * `environment: 'node'`, `DOMParser` is undefined there, and the sanitiser
 * silently takes its regex fallback. The path that ships had never run in a
 * test.
 *
 * So this is an end-to-end spec, and it asserts on the network rather than on
 * the sanitiser's return value. What matters is not what the string looks like;
 * it is whether the browser made the request.
 */

const ROUTE = '/email/reader';
const SUBJECT = 'remote fetch probe 4c1d8e';

test.describe('email reader tells the sender nothing', () => {
  test.skip(
    !LIVE_TOOL_ROUTES.includes(ROUTE),
    `${ROUTE} is not registered yet — this spec arms itself when it is`,
  );

  test('renders a hostile message and fetches nothing its author chose', async ({
    page,
  }) => {
    const reached: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(TRACKER_HOST)) reached.push(request.url());
    });

    await page.goto(ROUTE);
    await page.waitForLoadState('networkidle');

    await page.evaluate((eml) => {
      const file = new File([eml], 'probe.eml', { type: 'message/rfc822' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector<HTMLInputElement>(
        'input[type=file]',
      );
      if (!input) throw new Error('no file input on the email reader');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, trackerProbeEml(SUBJECT));

    // Parse, sanitise, render, and leave room for anything deferred.
    await page.waitForTimeout(3000);

    /*
     * Guards the guard. A page that failed to open the message fetches nothing
     * either, and would pass every assertion below while proving nothing at
     * all. The subject has to be on screen before the silence means anything.
     */
    const rendered = await page.evaluate(() => document.body.innerText);
    expect(
      rendered,
      'the probe message never rendered, so the silence proves nothing',
    ).toContain(SUBJECT);

    expect(
      reached,
      `the sender was told the message was opened, via: ${reached.join(', ')}`,
    ).toEqual([]);
  });

  test('every known vector is still in the probe', () => {
    /*
     * The probe is only worth what is in it. Shrinking the vector list is the
     * quiet way to make this spec pass, so the count is asserted and the three
     * that once fetched are named individually.
     */
    expect(REMOTE_FETCH_VECTORS.length).toBeGreaterThanOrEqual(18);

    const names = REMOTE_FETCH_VECTORS.map((vector) => vector.name);
    for (const required of [
      'svg image href',
      'svg image xlink:href',
      'svg use href',
    ]) {
      expect(names, `${required} was removed from the probe`).toContain(
        required,
      );
    }

    const eml = trackerProbeEml(SUBJECT);
    for (const vector of REMOTE_FETCH_VECTORS) {
      expect(eml, `${vector.name} is not in the probe message`).toContain(
        vector.html,
      );
    }
  });
});
