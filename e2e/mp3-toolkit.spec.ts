import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';

import { parseMp3 } from '../lib/tools/audio/mp3';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'audio',
  '__fixtures__',
);

const CBR_STEREO = 'cbr-stereo-44k.mp3'; // 40 frames, 44.1 kHz stereo, 128 kbps
const CBR_MONO = 'cbr-mono-22k.mp3'; // 41 frames, 22.05 kHz mono, 32 kbps
const VBR_STEREO = 'vbr-stereo-44k.mp3'; // 59 frames, VBR, Unicode ID3v2 tags

function fixture(name: string) {
  return readFile(path.join(fixtureDir, name));
}

async function chooseMp3s(page: Page, names: readonly string[]) {
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      mimeType: 'audio/mpeg',
      buffer: await fixture(name),
    })),
  );
  await page.getByLabel('Choose MP3 files').setInputFiles(files);
}

async function savedMp3(page: Page) {
  const download: Promise<Download> = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save MP3' }).click();
  return new Uint8Array(await readFile((await (await download).path())!));
}

function frameBytes(
  bytes: Uint8Array,
  frame: { offset: number; length: number },
) {
  return bytes.subarray(frame.offset, frame.offset + frame.length);
}

test.describe('MP3 toolkit', () => {
  test('cuts a range and copies every selected frame through unchanged', async ({
    page,
  }) => {
    await page.goto('/audio/mp3-toolkit');
    await chooseMp3s(page, [CBR_STEREO]);

    await expect(page.getByText('1. cbr-stereo-44k.mp3')).toBeVisible();
    await page.getByLabel('Start').fill('0:00.2');
    await page.getByLabel('End').fill('0:00.6');
    await page.getByRole('button', { name: 'Cut MP3' }).click();

    // 200 ms falls inside frame 7 and 600 ms rounds up to frame 23, so the cut
    // reads 0:00.18 to 0:00.60 and carries 16 frames.
    await expect(
      page.getByRole('heading', { name: /^Cut 0:00\.18 to 0:00\.60$/u }),
    ).toBeVisible();
    await expect(page.getByText('16 frames copied unchanged')).toBeVisible();

    const saved = await savedMp3(page);
    const cut = parseMp3(saved);
    const source = parseMp3(new Uint8Array(await fixture(CBR_STEREO)));

    expect(cut.frames).toHaveLength(16);
    expect(cut.sampleRate).toBe(44_100);
    expect(cut.channels).toBe(2);
    expect(cut.skippedBytes).toBe(0);

    // The point of the tool: the compressed bytes are the source's bytes.
    for (let index = 0; index < cut.frames.length; index += 1) {
      expect(Buffer.from(frameBytes(saved, cut.frames[index]))).toEqual(
        Buffer.from(frameBytes(source.bytes, source.frames[7 + index])),
      );
    }
  });

  test('refuses an impossible range and offers no download', async ({
    page,
  }) => {
    await page.goto('/audio/mp3-toolkit');
    await chooseMp3s(page, [CBR_STEREO]);
    await page.getByLabel('Start').fill('0:00.9');
    await page.getByLabel('End').fill('0:00.2');
    await page.getByRole('button', { name: 'Cut MP3' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'The end time must be later than the start time.',
    );
    await expect(page.getByRole('button', { name: 'Save MP3' })).toHaveCount(0);
  });

  test('joins two files and keeps both sets of frames', async ({ page }) => {
    await page.goto('/audio/mp3-toolkit');
    await chooseMp3s(page, [CBR_STEREO, VBR_STEREO]);

    // Choosing more than one file switches to Join on its own.
    await expect(page.getByRole('tab', { name: 'Join' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByRole('button', { name: 'Join MP3s' }).click();

    await expect(
      page.getByRole('heading', { name: /^Joined 2 files into 0:02\.59$/u }),
    ).toBeVisible();

    const joined = parseMp3(await savedMp3(page));
    expect(joined.frames).toHaveLength(40 + 59);
    expect(joined.skippedBytes).toBe(0);
    // A mixed-bitrate join needs a bitrate header that describes the result.
    expect(joined.header?.vbr.kind).toBe('Xing');
    expect(joined.header?.vbr.frameCount).toBe(99);
  });

  test('refuses a mismatched join by naming both files', async ({ page }) => {
    await page.goto('/audio/mp3-toolkit');
    await chooseMp3s(page, [CBR_STEREO, CBR_MONO]);
    await page.getByRole('button', { name: 'Join MP3s' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'cbr-mono-22k.mp3 is 22050 Hz but cbr-stereo-44k.mp3 is 44100 Hz',
    );
    await expect(page.getByRole('button', { name: 'Save MP3' })).toHaveCount(0);
  });

  test('writes tags that survive a round trip, including ₹ and Devanagari', async ({
    page,
  }) => {
    await page.goto('/audio/mp3-toolkit');
    await chooseMp3s(page, [VBR_STEREO]);
    await page.getByRole('tab', { name: 'Tags' }).click();

    // The existing tags are read out of the file and shown for editing.
    await expect(page.getByLabel('Title')).toHaveValue('Sine ₹ तरंग');

    await page.getByLabel('Title').fill('₹500 का गाना 🎧');
    await page.getByLabel('Artist').fill('OpenTools');
    await page.getByRole('button', { name: 'Write tags' }).click();

    await expect(
      page.getByRole('heading', { name: 'Wrote 3 tag fields' }),
    ).toBeVisible();

    const tagged = parseMp3(await savedMp3(page));
    expect(tagged.tags.title).toBe('₹500 का गाना 🎧');
    expect(tagged.tags.artist).toBe('OpenTools');
    expect(tagged.tags.album).toBe('Fixtures');
    // Audio untouched.
    expect(tagged.frames).toHaveLength(59);
  });

  test('clearing every tag field removes the tags', async ({ page }) => {
    await page.goto('/audio/mp3-toolkit');
    await chooseMp3s(page, [VBR_STEREO]);
    await page.getByRole('tab', { name: 'Tags' }).click();
    await page.getByRole('button', { name: 'Clear every field' }).click();
    await page.getByRole('button', { name: 'Write tags' }).click();

    await expect(
      page.getByRole('heading', { name: 'Removed every tag' }),
    ).toBeVisible();

    const stripped = parseMp3(await savedMp3(page));
    expect(stripped.tags).toEqual({});
    expect(stripped.id3v2Size).toBe(0);
    expect(stripped.frames).toHaveLength(59);
  });

  test('reports what is measured about the file, and nothing else', async ({
    page,
  }) => {
    await page.goto('/audio/mp3-toolkit');
    await chooseMp3s(page, [VBR_STEREO]);
    await page.getByRole('tab', { name: 'Inspect' }).click();

    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText('MPEG1 Layer 3');
    await expect(panel).toContainText('44,100 Hz');
    await expect(panel).toContainText('Xing header present');
    await expect(panel).toContainText('59');
    await expect(panel).toContainText('26.12 ms');
  });

  test('refuses a file that is not an MP3, by name', async ({ page }) => {
    await page.goto('/audio/mp3-toolkit');
    const wav = Buffer.alloc(2048);
    wav.write('RIFF', 0);
    wav.write('WAVE', 8);
    await page.getByLabel('Choose MP3 files').setInputFiles({
      name: 'voice-note.wav',
      mimeType: 'audio/wav',
      buffer: wav,
    });

    await expect(page.getByRole('alert')).toContainText(
      'If this is an M4A, WAV, FLAC or OGG file, it is not an MP3',
    );
    await expect(page.getByRole('tab', { name: 'Cut' })).toHaveCount(0);
  });

  test('states the two limits of a lossless cut before you run one', async ({
    page,
  }) => {
    await page.goto('/audio/mp3-toolkit');
    await chooseMp3s(page, [CBR_STEREO]);
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText(
      'a cut lands on a frame edge rather than an exact millisecond',
    );
    await expect(panel).toContainText(
      'roughly the first 60 ms after a cut can sound very slightly different',
    );
  });

  test('sends nothing off this origin while doing the work', async ({
    page,
  }) => {
    await page.goto('/audio/mp3-toolkit');
    const origin = new URL(page.url()).origin;

    // Listening only after the page itself has loaded, so the navigation that
    // fetched it is not counted as an upload.
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) {
        offOrigin.push(request.url());
      }
    });

    await chooseMp3s(page, [CBR_STEREO]);
    await page.getByLabel('End').fill('0:00.5');
    await page.getByRole('button', { name: 'Cut MP3' }).click();
    await expect(page.getByRole('button', { name: 'Save MP3' })).toBeVisible();

    expect(offOrigin).toEqual([]);
  });
});
