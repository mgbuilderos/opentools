import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { detectOrientation } from '../lib/tools/video/matrix';
import { readMp4 } from '../lib/tools/video/mp4';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'video',
  '__fixtures__',
);

const TONE_MP4 = 'tone-video.mp4';

async function uploadFile(page: Page, filename: string, customBuffer?: Uint8Array) {
  const buffer = customBuffer
    ? Buffer.from(customBuffer)
    : await readFile(path.join(fixtureDir, filename));
  const fileInput = page.locator('input[type="file"]');
  await fileInput.waitFor({ state: 'attached' });
  await fileInput.setInputFiles({
    name: filename,
    mimeType: filename.endsWith('.mov') ? 'video/quicktime' : 'video/mp4',
    buffer,
  });
}

test.describe('Video Suite — Lossless Container Surgery', () => {
  test('convert: remuxes MP4 to MOV and MOV to MP4 losslessly', async ({ page }) => {
    await page.goto('/video/convert');

    // 1. Convert MP4 to MOV
    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible();
    await page.getByRole('button', { name: /^MOV / }).click();

    await page.getByRole('button', { name: 'Convert to MOV' }).click();
    const movDownloadLink = page.locator('a[data-receipt-download]');
    await expect(movDownloadLink).toBeVisible();

    const movDownloadPromise = page.waitForEvent('download');
    await movDownloadLink.click();
    const movDownload = await movDownloadPromise;
    const movBytes = new Uint8Array(await readFile((await movDownload.path())!));
    const movBrand = String.fromCharCode(...movBytes.subarray(8, 12));
    expect(movBrand).toBe('qt  ');
    const movParsed = readMp4(movBytes);
    expect(movParsed.tracks).toHaveLength(2);
    expect(movParsed.tracks.find((t) => t.kind === 'video')?.samples).toHaveLength(30);

    // 2. Change file and convert MOV back to MP4
    await page.getByRole('button', { name: /Change file/i }).click();
    await uploadFile(page, 'remuxed.mov', movBytes);
    await expect(page.getByText('remuxed.mov')).toBeVisible();

    await page.getByRole('button', { name: /^MP4 / }).click();
    await page.getByRole('button', { name: 'Convert to MP4' }).click();
    const mp4DownloadLink = page.locator('a[data-receipt-download]');
    await expect(mp4DownloadLink).toBeVisible();

    const mp4DownloadPromise = page.waitForEvent('download');
    await mp4DownloadLink.click();
    const mp4Download = await mp4DownloadPromise;
    const mp4Bytes = new Uint8Array(await readFile((await mp4Download.path())!));
    const mp4Brand = String.fromCharCode(...mp4Bytes.subarray(8, 12));
    expect(mp4Brand).toBe('isom');
    const mp4Parsed = readMp4(mp4Bytes);
    expect(mp4Parsed.tracks).toHaveLength(2);
    expect(mp4Parsed.tracks.find((t) => t.kind === 'video')?.samples).toHaveLength(30);
  });

  test('rotate: updates track matrix to 90 degrees losslessly', async ({ page }) => {
    await page.goto('/video/rotate');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible({ timeout: 15000 });

    // Select 90° Clockwise
    await page.getByRole('button', { name: '90° Clockwise' }).click();

    await page.getByRole('button', { name: /Apply Rotation/i }).click();
    const downloadLink = page.locator('a[data-receipt-download]');
    await expect(downloadLink).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await downloadLink.click();
    const download = await downloadPromise;
    const rotatedBytes = new Uint8Array(await readFile((await download.path())!));
    const rotatedParsed = readMp4(rotatedBytes);
    const videoTrack = rotatedParsed.tracks.find((t) => t.kind === 'video')!;
    const orientation = detectOrientation(videoTrack.matrix);
    expect(orientation.degrees).toBe(90);
    expect(videoTrack.samples).toHaveLength(30);
  });

  test('split: divides video into multiple clips by timestamps', async ({ page }) => {
    await page.goto('/video/split');
    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible();

    // Switch to "Split into Multiple Clips" tab
    await page.getByRole('button', { name: 'Split into Multiple Clips' }).click();

    // Split at 1.0s
    await page.locator('#split-timestamps-input').fill('1');
    await page.getByRole('button', { name: 'Split Into Clips' }).click();

    await expect(page.getByText(/Split into 2 clips/i)).toBeVisible();
    const clipDownloadButtons = page.locator('a[title^="Download "]');
    await expect(clipDownloadButtons).toHaveCount(2);

    const downloadPromise = page.waitForEvent('download');
    await clipDownloadButtons.first().click();
    const download = await downloadPromise;
    const part1Bytes = new Uint8Array(await readFile((await download.path())!));
    const part1Parsed = readMp4(part1Bytes);
    expect(part1Parsed.tracks).toHaveLength(2);
    expect(part1Parsed.tracks.find((t) => t.kind === 'video')?.samples.length).toBeGreaterThan(0);
  });

  test('merge: concatenates matching video clips end-to-end', async ({ page }) => {
    await page.goto('/video/merge');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const filePath = path.join(fixtureDir, TONE_MP4);
    const buffer = await readFile(filePath);

    // Upload 2 copies of tone-video.mp4
    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached' });
    await fileInput.setInputFiles([
      { name: 'clip-1.mp4', mimeType: 'video/mp4', buffer },
      { name: 'clip-2.mp4', mimeType: 'video/mp4', buffer },
    ]);

    await expect(page.getByText(/clip-1\.mp4/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/clip-2\.mp4/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Merge \d+ Clips/i }).click();
    const downloadLink = page.locator('a[data-receipt-download]');
    await expect(downloadLink).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await downloadLink.click();
    const download = await downloadPromise;
    const mergedBytes = new Uint8Array(await readFile((await download.path())!));
    const mergedParsed = readMp4(mergedBytes);
    expect(mergedParsed.tracks).toHaveLength(2);
    const mergedVideo = mergedParsed.tracks.find((t) => t.kind === 'video')!;
    // 30 frames + 30 frames = 60 frames
    expect(mergedVideo.samples).toHaveLength(60);
  });

  test('metadata: inspects and sanitizes metadata', async ({ page }) => {
    await page.goto('/video/metadata');
    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible();
    await expect(page.getByText(/H\.264/i)).toBeVisible();

    await page.getByRole('button', { name: /Strip Metadata/i }).click();
    const downloadLink = page.locator('a[data-receipt-download]');
    await expect(downloadLink).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await downloadLink.click();
    const download = await downloadPromise;
    const sanitizedBytes = new Uint8Array(await readFile((await download.path())!));
    const sanitizedParsed = readMp4(sanitizedBytes);
    expect(sanitizedParsed.tracks).toHaveLength(2);
    expect(sanitizedParsed.tracks.find((t) => t.kind === 'video')?.samples).toHaveLength(30);
  });

  test('to-gif: converts MP4 to animated GIF in browser', async ({ page }) => {
    await page.goto('/video/to-gif');
    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('160×120 · avc1')).toBeVisible();

    await page.getByRole('button', { name: 'Make the GIF' }).click();
    const saveButton = page.getByRole('button', { name: /^Save / });
    await expect(saveButton).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await saveButton.click();
    const download = await downloadPromise;
    const gifBytes = new Uint8Array(await readFile((await download.path())!));
    const header = String.fromCharCode(...gifBytes.subarray(0, 6));
    expect(header).toBe('GIF89a');
  });

  test('extract-audio: extracts standalone audio track from MP4', async ({ page }) => {
    await page.goto('/video/extract-audio');
    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('160×120 · avc1')).toBeVisible();

    await page.getByRole('button', { name: 'Make the clip' }).click();
    const saveButton = page.getByRole('button', { name: /^Save / });
    await expect(saveButton).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await saveButton.click();
    const download = await downloadPromise;
    const audioBytes = new Uint8Array(await readFile((await download.path())!));
    const parsed = readMp4(audioBytes);
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.tracks[0].kind).toBe('audio');
    expect(parsed.tracks[0].samples).toHaveLength(88);
  });

  test('zero network egress during operations', async ({ page }) => {
    await page.goto('/video/convert');
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) offOrigin.push(request.url());
    });

    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible();
    await page.getByRole('button', { name: /^MOV / }).click();
    await page.getByRole('button', { name: 'Convert to MOV' }).click();
    await expect(page.locator('a[data-receipt-download]')).toBeVisible();

    expect(offOrigin).toEqual([]);
  });
});
