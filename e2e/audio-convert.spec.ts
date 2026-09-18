import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';

import { decodeWav } from '../lib/tools/audio/wav';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'audio',
  '__fixtures__',
);

/**
 * All fixtures are a 440 Hz sine of exactly 0.1 seconds at 0.8 of full scale,
 * written by ffmpeg. 0.1 s at 44,100 Hz is 4,410 frames, and the tests below
 * count them rather than trusting a label on the screen.
 *
 * WAV and FLAC are used for the round trips on purpose: every browser decodes
 * them, while AAC and MP3 depend on codecs a given build may not ship. The page
 * says as much, and the format-support test at the end checks what this browser
 * actually manages rather than asserting a list.
 */
const STEREO_WAV = 'tone-44k-stereo-s16.wav';
const FLAC = 'tone-44k-stereo.flac';

async function choose(page: Page, name: string, buffer?: Buffer) {
  await page.getByLabel('Choose an audio file').setInputFiles({
    name,
    mimeType: name.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream',
    buffer: buffer ?? (await readFile(path.join(fixtureDir, name))),
  });
}

async function saved(page: Page) {
  const download: Promise<Download> = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Save / }).click();
  return new Uint8Array(await readFile((await (await download).path())!));
}

async function convert(page: Page) {
  await page.getByRole('button', { name: 'Convert to WAV' }).click();
  await expect(page.getByRole('button', { name: /^Save / })).toBeVisible();
  return saved(page);
}

function peakOf(samples: Float32Array) {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    peak = Math.max(peak, Math.abs(samples[index]));
  }
  return peak;
}

test.describe('Audio to WAV converter', () => {
  test('says what the file is before anything is converted', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);

    await expect(page.getByText('WAV · 16-bit PCM')).toBeVisible();
    await expect(page.getByText('44,100 Hz', { exact: true })).toBeVisible();
    await expect(page.getByText('stereo', { exact: true })).toBeVisible();
    await expect(page.getByText('0:00.10')).toBeVisible();
    // The claim that matters: the decode used the file's own rate.
    await expect(page.getByText('nothing was resampled on the way in')).toBeVisible();
  });

  test('the file it hands back really is a WAV of the right length', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);
    const wav = decodeWav(await convert(page));

    expect(wav.sampleRate).toBe(44_100);
    expect(wav.channels).toHaveLength(2);
    expect(wav.bitsPerSample).toBe(16);
    expect(wav.channels[0]).toHaveLength(4410);
    expect(peakOf(wav.channels[0])).toBeCloseTo(0.8, 2);
  });

  test('decodes a compressed file and writes out its samples', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, FLAC);
    await expect(page.getByText('FLAC · FLAC, 24-bit')).toBeVisible();

    const wav = decodeWav(await convert(page));
    expect(wav.sampleRate).toBe(44_100);
    expect(wav.channels[0].length).toBeGreaterThan(4000);
    expect(peakOf(wav.channels[0])).toBeCloseTo(0.8, 1);
  });

  test('mixes down to mono when asked', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);
    await page.getByLabel('Channels').selectOption('mono');

    const wav = decodeWav(await convert(page));
    expect(wav.channels).toHaveLength(1);
    expect(wav.channels[0]).toHaveLength(4410);
    await expect(page.getByText('mixed down to mono')).toBeVisible();
  });

  test('trims to the range typed in, counted in samples', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);
    await page.getByLabel('Start at (seconds)').fill('0.02');
    await page.getByLabel('End at (seconds)').fill('0.06');

    const wav = decodeWav(await convert(page));
    // 0.04 s at 44,100 Hz is 1,764 frames exactly.
    expect(wav.channels[0]).toHaveLength(1764);
  });

  test('changes the sample rate through the browser’s own resampler', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);
    await page.getByLabel('Sample rate').selectOption('22050');

    const wav = decodeWav(await convert(page));
    expect(wav.sampleRate).toBe(22_050);
    // Half the rate over the same span is half the frames.
    expect(wav.channels[0].length).toBeGreaterThanOrEqual(2200);
    expect(wav.channels[0].length).toBeLessThanOrEqual(2210);
  });

  test('puts the loudest moment exactly where it was asked to go', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);
    await page.getByLabel(/Normalise the peak to/u).fill('3');

    const wav = decodeWav(await convert(page));
    const dbfs = 20 * Math.log10(peakOf(wav.channels[0]));
    expect(dbfs).toBeGreaterThan(-3.1);
    expect(dbfs).toBeLessThan(-2.9);
  });

  test('writes 24-bit and 32-bit float when those are chosen', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);

    await page.getByLabel('Bit depth').selectOption('24');
    let wav = decodeWav(await convert(page));
    expect(wav.bitsPerSample).toBe(24);
    expect(wav.isFloat).toBe(false);

    await page.getByLabel('Bit depth').selectOption('32');
    wav = decodeWav(await convert(page));
    expect(wav.bitsPerSample).toBe(32);
    expect(wav.isFloat).toBe(true);
  });

  /**
   * Which of these a browser decodes is a property of the browser, not of this
   * page. The test reports what each one managed rather than asserting a list,
   * so a gap shows up as a named failure instead of as a user finding it.
   */
  for (const [fixture, what] of [
    ['tone-44k-mono-s24.wav', '24-bit WAV'],
    ['tone-48k-mono-f32.wav', '32-bit float WAV'],
    ['tone-8k-mono-u8.wav', '8-bit WAV'],
    ['tone-22k-mono.aiff', 'AIFF'],
    ['tone-44k-stereo.ogg', 'Ogg Vorbis'],
  ] as const) {
    test(`converts ${what}`, async ({ page }) => {
      await page.goto('/audio/convert');
      await choose(page, fixture);
      await expect(page.getByRole('button', { name: 'Convert to WAV' })).toBeVisible();

      const wav = decodeWav(await convert(page));
      expect(wav.channels[0].length).toBeGreaterThan(700);
      expect(peakOf(wav.channels[0])).toBeGreaterThan(0.5);
    });
  }

  test('says so plainly when the file is not audio', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, 'notes.txt', Buffer.from('this is not audio at all'));
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Convert to WAV' })).toHaveCount(0);
  });

  test('refuses a backwards trim range instead of writing an empty file', async ({ page }) => {
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);
    await page.getByLabel('Start at (seconds)').fill('0.08');
    await page.getByLabel('End at (seconds)').fill('0.02');
    await page.getByRole('button', { name: 'Convert to WAV' }).click();

    await expect(page.getByRole('alert')).toContainText('after its start');
    await expect(page.getByRole('button', { name: /^Save / })).toHaveCount(0);
  });

  test('names decibels, not seconds, when the level box is wrong', async ({ page }) => {
    // This field reused the seconds parser, so an unparseable level reported
    // "must be a number of seconds" — the wrong units, for the wrong field.
    await page.goto('/audio/convert');
    await choose(page, STEREO_WAV);
    await page.getByLabel(/Normalise the peak to/u).fill('loud');
    await page.getByRole('button', { name: 'Convert to WAV' }).click();

    await expect(page.getByRole('alert')).toContainText('number of decibels');
    await expect(page.getByRole('alert')).not.toContainText('seconds');
  });

  // One conversion per test. An earlier version looped over both signs inside a
  // single test and timed out — every other test here converts once, and two
  // full cycles in one test is a different thing being measured.
  for (const typed of ['3', '-3'] as const) {
    test(`accepts the level typed as ${typed}`, async ({ page }) => {
      // The field says "below full scale", so 3 and -3 mean the same thing. An
      // earlier version refused a positive number — while telling the reader to
      // "try 1 or 3", which is exactly what they had just typed.
      await page.goto('/audio/convert');
      await choose(page, STEREO_WAV);
      await page.getByLabel(/Normalise the peak to/u).fill(typed);

      const wav = decodeWav(await convert(page));
      const dbfs = 20 * Math.log10(peakOf(wav.channels[0]));
      expect(dbfs).toBeGreaterThan(-3.1);
      expect(dbfs).toBeLessThan(-2.9);
    });
  }

  test('never claims to encode MP3, because it has no encoder', async ({ page }) => {
    await page.goto('/audio/convert');
    await expect(page.getByText('There is no MP3 encoder on this page')).toBeVisible();
  });

  test('sends nothing off this origin while doing the work', async ({ page }) => {
    await page.goto('/audio/convert');
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) offOrigin.push(request.url());
    });

    await choose(page, FLAC);
    await page.getByRole('button', { name: 'Convert to WAV' }).click();
    await expect(page.getByRole('button', { name: /^Save / })).toBeVisible();

    expect(offOrigin).toEqual([]);
  });
});
