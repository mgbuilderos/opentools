import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';

import { readMp4 } from '../lib/tools/video/mp4';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'video',
  '__fixtures__',
);

/**
 * The fixture is 2 seconds of H.264 at 15 fps — 30 frames — with keyframes at
 * 0.0s and 1.0s, plus 88 frames of mono AAC. The tests count frames in the
 * downloaded file rather than reading labels off the screen.
 */
const VIDEO = 'tone-video.mp4';

async function choose(page: Page, name = VIDEO, buffer?: Buffer) {
  await page.getByLabel('Choose a video file').setInputFiles({
    name,
    mimeType: name.endsWith('.mov') ? 'video/quicktime' : 'video/mp4',
    buffer: buffer ?? (await readFile(path.join(fixtureDir, name))),
  });
}

async function make(page: Page) {
  await page.getByRole('button', { name: 'Make the clip' }).click();
  await expect(page.getByRole('button', { name: /^Save / })).toBeVisible();
  const download: Promise<Download> = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Save / }).click();
  return new Uint8Array(await readFile((await (await download).path())!));
}

test.describe('Video trimmer', () => {
  test('says what the file is, and where a cut may begin', async ({ page }) => {
    await page.goto('/video/trim');
    await choose(page);

    await expect(page.getByText('160×120 · avc1')).toBeVisible();
    await expect(page.getByText('30', { exact: true })).toBeVisible();
    // The honesty that matters most on this page: keyframes constrain the cut.
    await expect(page.getByText(/2 keyframes/u)).toBeVisible();
  });

  test('the file it hands back is a real MP4 with both tracks', async ({ page }) => {
    await page.goto('/video/trim');
    await choose(page);
    const mp4 = readMp4(await make(page));

    expect(mp4.tracks).toHaveLength(2);
    expect(mp4.tracks.find((track) => track.kind === 'video')!.samples).toHaveLength(30);
    expect(mp4.tracks.find((track) => track.kind === 'audio')!.samples).toHaveLength(88);
  });

  test('trims to the range typed in, counted in frames', async ({ page }) => {
    await page.goto('/video/trim');
    await choose(page);
    await page.getByLabel('Start at (seconds)').fill('1');

    const mp4 = readMp4(await make(page));
    // 15 fps for the second half of a 2s clip.
    expect(mp4.tracks.find((track) => track.kind === 'video')!.samples).toHaveLength(15);
    expect(mp4.tracks.find((track) => track.kind === 'audio')!.samples).toHaveLength(44);
  });

  test('tells the reader when it moved the cut back to a keyframe', async ({ page }) => {
    // 1.5s is between keyframes. Silently returning half a second the reader did
    // not ask for would be the surprise; saying so is the feature.
    await page.goto('/video/trim');
    await choose(page);
    await page.getByLabel('Start at (seconds)').fill('1.5');
    await page.getByRole('button', { name: 'Make the clip' }).click();

    await expect(page.getByText(/A cut can only begin on a keyframe/u)).toBeVisible();
    await expect(page.getByText(/0\.50s earlier/u)).toBeVisible();
  });

  test('mutes by removing the sound track, not by silencing it', async ({ page }) => {
    await page.goto('/video/trim');
    await choose(page);
    await page.getByLabel('What to keep').selectOption('video');

    const mp4 = readMp4(await make(page));
    expect(mp4.tracks).toHaveLength(1);
    expect(mp4.tracks[0].kind).toBe('video');
  });

  test('saves the sound on its own', async ({ page }) => {
    await page.goto('/video/trim');
    await choose(page);
    await page.getByLabel('What to keep').selectOption('audio');

    const mp4 = readMp4(await make(page));
    expect(mp4.tracks).toHaveLength(1);
    expect(mp4.tracks[0].kind).toBe('audio');
    expect(mp4.tracks[0].samples).toHaveLength(88);
  });

  test('copies the frames rather than re-encoding them', async ({ page }) => {
    // The claim the page makes in its own headline, checked: the first kept
    // frame must be byte-identical to the source's frame at that position.
    const source = new Uint8Array(await readFile(path.join(fixtureDir, VIDEO)));
    const original = readMp4(source);
    const sourceVideo = original.tracks.find((track) => track.kind === 'video')!;

    await page.goto('/video/trim');
    await choose(page);
    const written = await make(page);
    const back = readMp4(written);
    const first = back.tracks.find((track) => track.kind === 'video')!.samples[0];

    expect(first.size).toBe(sourceVideo.samples[0].size);
    expect(Array.from(written.subarray(first.offset, first.offset + first.size))).toEqual(
      Array.from(
        source.subarray(
          sourceVideo.samples[0].offset,
          sourceVideo.samples[0].offset + sourceVideo.samples[0].size,
        ),
      ),
    );
  });

  test('reads a QuickTime .mov, which is what an iPhone records', async ({ page }) => {
    await page.goto('/video/trim');
    await choose(page, 'pcm-audio.mov');
    await expect(page.getByText('128×96 · avc1')).toBeVisible();
  });

  test('names WebM rather than calling it a broken MP4', async ({ page }) => {
    const webm = Buffer.alloc(256);
    webm.set([0x1a, 0x45, 0xdf, 0xa3], 0);
    await page.goto('/video/trim');
    await choose(page, 'clip.webm', webm);

    await expect(page.getByRole('alert')).toContainText('WebM or Matroska');
    await expect(page.getByRole('button', { name: 'Make the clip' })).toHaveCount(0);
  });

  test('refuses a backwards range', async ({ page }) => {
    await page.goto('/video/trim');
    await choose(page);
    await page.getByLabel('Start at (seconds)').fill('1.5');
    await page.getByLabel('End at (seconds)').fill('0.5');
    await page.getByRole('button', { name: 'Make the clip' }).click();

    await expect(page.getByRole('alert')).toContainText('after its start');
    await expect(page.getByRole('button', { name: /^Save / })).toHaveCount(0);
  });

  test('does not offer GIF, which it cannot do without decoding', async ({ page }) => {
    await page.goto('/video/trim');
    await expect(page.getByText(/cannot do, because that genuinely needs decoding/u)).toBeVisible();
  });

  test('sends nothing off this origin while doing the work', async ({ page }) => {
    await page.goto('/video/trim');
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) offOrigin.push(request.url());
    });

    await choose(page);
    await page.getByRole('button', { name: 'Make the clip' }).click();
    await expect(page.getByRole('button', { name: /^Save / })).toBeVisible();

    expect(offOrigin).toEqual([]);
  });
});
