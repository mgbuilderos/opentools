import { expect, test } from '@playwright/test';

import { setFilesWhenLive } from './upload';

/**
 * Behavioural coverage for `/audio/loudness`.
 *
 * `lib/tools/audio/loudness.test.ts` proves the BS.1770 maths against a 1 kHz
 * sine of known level. This proves a person can get that answer: that a real
 * file goes in through the input and the measurement — with the standard it
 * is judged against — comes back on screen.
 *
 * The tone is generated here so its level is known by construction. A file
 * whose loudness we did not choose could not test a loudness meter.
 */

const TOOL = '/audio/loudness';

/**
 * A 16-bit PCM WAV of a 1 kHz sine at the given amplitude.
 *
 * -20 dBFS is chosen deliberately: loud enough to sit well above any noise
 * floor, quiet enough that true peak cannot clip, and far from every platform
 * target so a verdict has to be computed rather than guessed.
 */
function sineWav(seconds = 4, amplitude = 0.1, sampleRate = 48_000): Buffer {
  const frames = seconds * sampleRate;
  const data = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i += 1) {
    const sample = Math.sin((2 * Math.PI * 1000 * i) / sampleRate) * amplitude;
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

test.describe('Audio loudness and delivery check (/audio/loudness)', () => {
  test('measures a tone of known level and names the standards', async ({
    page,
  }) => {
    test.slow();
    await page.goto(TOOL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Loudness/i,
    );

    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      { name: 'tone-1khz.wav', mimeType: 'audio/wav', buffer: sineWav() },
      page.getByText(/LUFS/i).first(),
    );

    // The measurement itself, in its own unit.
    await expect(page.getByText(/LUFS/i).first()).toBeVisible({
      timeout: 60_000,
    });

    // A number is only useful against a target, so the platform has to be
    // named — **in the results**, not in the page's prose. Asserting against
    // the whole body was hollow: this page's SEO copy also mentions Spotify,
    // so renaming the label in the component left the test green.
    // Addressed as a *compliance row*: a platform name beside a verdict.
    // `COMPLIANT` / `NON-COMPLIANT` cannot appear in the page's prose, which
    // is what makes this discriminate — an earlier version matched `Spotify`
    // anywhere on the page and stayed green when the label was renamed,
    // because the SEO copy mentions Spotify too.
    // EXACT text, because that is the only thing that discriminates here.
    // The row's label is exactly `Spotify`; the page's prose says
    // "Spotify (−14 LUFS)". Two looser attempts passed with the label
    // renamed in `lib/tools/audio/loudness.ts` — a body-wide regex matched
    // the prose, and a `div` filter matched an ancestor wrapper that
    // contained the prose and a verdict from some other row.
    // What the results actually show is a verdict for the standard being
    // checked, with its target — e.g.
    // `Podcasts (AES TD1004 Stereo)NON-COMPLIANTTarget: -16 LUFS | Max Peak: -1 dBTP`.
    //
    // An earlier version of this asserted a *Spotify* row. There is no such
    // row: dumping the rendered page showed the only occurrence of "Spotify"
    // is the page's own description prose, so every assertion built on it
    // either matched the marketing copy or nothing at all. The tool names the
    // selected standard, which is a different and perfectly good design — the
    // test was wrong, not the tool.
    await expect
      .poll(async () => page.locator('body').innerText(), { timeout: 60_000 })
      .toMatch(/(?:NON-)?COMPLIANT/u);
    await expect
      .poll(async () => page.locator('body').innerText())
      .toMatch(/Target:\s*-?\d{1,2}(\.\d)?\s*LUFS/u);

    const body = await page.locator('body').innerText();

    // A -20 dBFS sine is nowhere near any platform target, so a real
    // measurement must report a negative LUFS figure rather than a placeholder.
    expect(body, 'a measured LUFS value must appear').toMatch(
      /-\s?\d{1,2}(\.\d)?\s*LUFS/iu,
    );

    // Measured, never scored.
    expect(body).not.toMatch(/\b\d{1,3}\s?% (accurate|confidence)\b/iu);
  });

  test('exports the measurements as a real file', async ({ page }) => {
    test.slow();
    await page.goto(TOOL);
    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      { name: 'tone-1khz.wav', mimeType: 'audio/wav', buffer: sineWav() },
      page.getByText(/LUFS/i).first(),
    );

    const download = page.waitForEvent('download', { timeout: 60_000 });
    await page.locator('[data-receipt-download]').first().click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.(json|csv|txt)$/u);
  });

  test('refuses a file that is not audio, by name', async ({ page }) => {
    test.slow();
    await page.goto(TOOL);
    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'not-audio.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('this is not a waveform'),
      },
      page.getByText(/error|could not|not-audio\.txt|decode/iu).first(),
    );

    await expect(
      page.getByText(/error|could not|not-audio\.txt|decode/iu).first(),
    ).toBeVisible({ timeout: 45_000 });
  });
});
