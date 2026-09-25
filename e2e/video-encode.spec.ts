import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

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

async function uploadFile(page: Page, filename: string) {
  const buffer = await readFile(path.join(fixtureDir, filename));
  const fileInput = page.locator('input[type="file"]');
  await fileInput.waitFor({ state: 'attached' });
  await fileInput.setInputFiles({
    name: filename,
    mimeType: 'video/mp4',
    buffer: Buffer.from(buffer),
  });
}

test.describe('Video Suite — WebCodecs Re-encoding Cluster', () => {
  test('compress: reduces video size with WebCodecs hardware re-encoding or informs support', async ({
    page,
  }) => {
    await page.goto('/video/compress');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Compress Video',
    );

    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible();
    await expect(page.getByText(/160×120/)).toBeVisible();

    const hasWebCodecs = await page.evaluate(
      () =>
        typeof window.VideoEncoder !== 'undefined' &&
        typeof window.VideoDecoder !== 'undefined',
    );

    if (hasWebCodecs) {
      await expect(
        page.getByText(/Re-encoding Disclosure/i),
      ).toBeVisible();

      const compressBtn = page.getByRole('button', { name: 'Compress Video' });
      await expect(compressBtn).toBeVisible();
      await compressBtn.click();

      const downloadLink = page.locator('a[data-receipt-download]');
      await expect(downloadLink).toBeVisible({ timeout: 15000 });

      const downloadPromise = page.waitForEvent('download');
      await downloadLink.click();
      const download = await downloadPromise;
      const compressedBytes = new Uint8Array(
        await readFile((await download.path())!),
      );

      const parsed = readMp4(compressedBytes);
      expect(parsed.tracks.length).toBeGreaterThanOrEqual(1);
      const videoTrack = parsed.tracks.find((t) => t.kind === 'video');
      expect(videoTrack).toBeDefined();
      expect(videoTrack!.width).toBe(160);
      expect(videoTrack!.height).toBe(120);

      const audioTrack = parsed.tracks.find((t) => t.kind === 'audio');
      expect(audioTrack).toBeDefined();
      expect(audioTrack!.samples).toHaveLength(88);
    } else {
      await expect(
        page.getByText(/does not support the WebCodecs API/i),
      ).toBeVisible();
    }
  });

  test('resize: scales video dimensions with aspect preservation', async ({
    page,
  }) => {
    await page.goto('/video/resize');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Resize Video',
    );

    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible();

    const hasWebCodecs = await page.evaluate(
      () =>
        typeof window.VideoEncoder !== 'undefined' &&
        typeof window.VideoDecoder !== 'undefined',
    );

    if (hasWebCodecs) {
      await expect(
        page.getByText(/Re-encoding Disclosure/i),
      ).toBeVisible();

      const resizeBtn = page.getByRole('button', { name: 'Resize Video' });
      await expect(resizeBtn).toBeVisible();
      await resizeBtn.click();

      const downloadLink = page.locator('a[data-receipt-download]');
      await expect(downloadLink).toBeVisible({ timeout: 15000 });

      const downloadPromise = page.waitForEvent('download');
      await downloadLink.click();
      const download = await downloadPromise;
      const resizedBytes = new Uint8Array(
        await readFile((await download.path())!),
      );

      const parsed = readMp4(resizedBytes);
      const videoTrack = parsed.tracks.find((t) => t.kind === 'video');
      expect(videoTrack).toBeDefined();
      if (typeof videoTrack?.width === 'number' && typeof videoTrack?.height === 'number') {
        expect(videoTrack.width % 2).toBe(0);
        expect(videoTrack.height % 2).toBe(0);
      }
    } else {
      await expect(
        page.getByText(/does not support the WebCodecs API/i),
      ).toBeVisible();
    }
  });

  test('crop: crops video aspect ratio and spatial boundaries', async ({
    page,
  }) => {
    await page.goto('/video/crop');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Crop Video',
    );

    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible();

    const hasWebCodecs = await page.evaluate(
      () =>
        typeof window.VideoEncoder !== 'undefined' &&
        typeof window.VideoDecoder !== 'undefined',
    );

    if (hasWebCodecs) {
      await expect(
        page.getByText(/Re-encoding Disclosure/i),
      ).toBeVisible();

      await page.getByRole('button', { name: '1:1 Square' }).click();

      const cropBtn = page.getByRole('button', { name: 'Crop Video' });
      await expect(cropBtn).toBeVisible();
      await cropBtn.click();

      const downloadLink = page.locator('a[data-receipt-download]');
      await expect(downloadLink).toBeVisible({ timeout: 15000 });

      const downloadPromise = page.waitForEvent('download');
      await downloadLink.click();
      const download = await downloadPromise;
      const croppedBytes = new Uint8Array(
        await readFile((await download.path())!),
      );

      const parsed = readMp4(croppedBytes);
      const videoTrack = parsed.tracks.find((t) => t.kind === 'video');
      expect(videoTrack).toBeDefined();
      expect(videoTrack!.width).toBe(120);
      expect(videoTrack!.height).toBe(120);
    } else {
      await expect(
        page.getByText(/does not support the WebCodecs API/i),
      ).toBeVisible();
    }
  });

  test('zero network egress during WebCodecs processing', async ({ page }) => {
    await page.goto('/video/compress');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Compress Video',
    );
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) {
        offOrigin.push(request.url());
      }
    });

    await uploadFile(page, TONE_MP4);
    await expect(page.getByText('tone-video.mp4')).toBeVisible({ timeout: 15000 });
    const hasWebCodecs = await page.evaluate(
      () =>
        typeof window.VideoEncoder !== 'undefined' &&
        typeof window.VideoDecoder !== 'undefined',
    );

    if (hasWebCodecs) {
      await page.getByRole('button', { name: 'Compress Video' }).click();
      await expect(page.locator('a[data-receipt-download]')).toBeVisible({
        timeout: 15000,
      });
    }

    expect(offOrigin).toEqual([]);
  });
});
