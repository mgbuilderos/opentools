import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';

import { readMetadata } from '../lib/tools/metadata';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'metadata',
  '__fixtures__',
);

async function uploadPhoto(page: Page, filename: string) {
  const filePath = path.join(fixtureDir, filename);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(filePath);
}

test.describe('Photo Metadata Viewer & Stripper (/image/metadata)', () => {
  test('inspects EXIF camera tags, shot settings, and GPS location from photo', async ({
    page,
  }) => {
    await page.goto('/image/metadata');

    // Page title and heading
    await expect(
      page.getByRole('heading', { name: 'Photo metadata viewer & stripper' }),
    ).toBeVisible();

    // Upload test fixture with known EXIF and GPS tags
    await uploadPhoto(page, 'gps-camera-photo.jpg');

    // File summary
    await expect(page.getByText('gps-camera-photo.jpg')).toBeVisible();
    await expect(page.getByText(/JPEG/)).toBeVisible();

    // Camera & lens card
    await expect(page.getByText('CameraCorp')).toBeVisible();
    await expect(page.getByText('Model-X')).toBeVisible();
    await expect(page.getByText('LensCorp')).toBeVisible();
    await expect(page.getByText('50mm f/1.4')).toBeVisible();
    await expect(page.getByText('PhotoEdit 1.0')).toBeVisible();
    await expect(page.getByText('123456789')).toBeVisible();
    await expect(page.getByText('Photographer')).toBeVisible();

    // Moment & shot settings card
    await expect(page.getByText('2026:09:19 12:30:45')).toBeVisible();
    await expect(page.getByText('1/250s')).toBeVisible();
    await expect(page.getByText('f/2.8')).toBeVisible();
    await expect(page.getByText('400', { exact: true })).toBeVisible();
    await expect(page.getByText('50.0 mm')).toBeVisible();
    await expect(page.getByText('1 (Normal)')).toBeVisible();

    // GPS location card
    await expect(page.getByText(/37° 46' 29\.76" N/)).toBeVisible();
    await expect(page.getByText(/122° 25' 9\.84" W/)).toBeVisible();
    await expect(page.getByText(/37\.77493,\s*-122\.41940/)).toBeVisible();
    await expect(page.getByText(/52\.4 m above sea level/)).toBeVisible();

    // OpenStreetMap external link check
    const mapLink = page.getByRole('link', { name: /View on OpenStreetMap/ });
    await expect(mapLink).toBeVisible();
    await expect(mapLink).toHaveAttribute('target', '_blank');
    await expect(mapLink).toHaveAttribute('rel', 'noopener noreferrer');
    const href = await mapLink.getAttribute('href');
    expect(href).toContain('openstreetmap.org');
    expect(href).toContain('37.77493');
    expect(href).toContain('-122.41940');
  });

  test('strips metadata and downloads a clean photo', async ({ page }) => {
    await page.goto('/image/metadata');
    await uploadPhoto(page, 'gps-camera-photo.jpg');

    // Wait for strip button
    const stripButton = page.getByRole('button', {
      name: 'Strip & download clean photo',
    });
    await expect(stripButton).toBeVisible();

    // Trigger download and strip
    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    await stripButton.click();
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toBe('gps-camera-photo_clean.jpg');

    // Inspect downloaded file bytes
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const downloadedBytes = new Uint8Array(await readFile(downloadPath!));

    // Verify with metadata reader that EXIF and GPS are completely gone
    const parsed = readMetadata(downloadedBytes);
    expect(parsed.format).toBe('jpeg');
    expect(parsed.hasMetadata).toBe(false);
    expect(parsed.gps).toBeUndefined();
    expect(parsed.camera.make).toBeUndefined();
    expect(parsed.camera.model).toBeUndefined();

    // Verify UI status message
    await expect(page.getByText('Metadata stripped successfully')).toBeVisible();
    await expect(page.getByText('Original size')).toBeVisible();
    await expect(page.getByText('Cleaned size')).toBeVisible();
  });

  test('clears file when Clear button is clicked', async ({ page }) => {
    await page.goto('/image/metadata');
    await uploadPhoto(page, 'gps-camera-photo.jpg');
    await expect(page.getByText('gps-camera-photo.jpg')).toBeVisible();

    // Click Clear
    await page.getByRole('button', { name: 'Clear' }).click();

    // Summary should disappear and dropzone reappear
    await expect(page.getByText('Drop your photo here, or browse')).toBeVisible();
    await expect(page.getByText('gps-camera-photo.jpg')).not.toBeVisible();
  });

  test('gracefully handles photo with no metadata', async ({ page }) => {
    await page.goto('/image/metadata');
    await uploadPhoto(page, 'no-metadata.jpg');

    await expect(page.getByText('no-metadata.jpg')).toBeVisible();
    await expect(
      page.getByText('No camera or equipment tags found in this file.'),
    ).toBeVisible();
    await expect(
      page.getByText('No GPS coordinates found in this image.'),
    ).toBeVisible();
  });

  test('displays text comments in PNG images', async ({ page }) => {
    await page.goto('/image/metadata');
    await uploadPhoto(page, 'sample-text.png');

    await expect(page.getByText('sample-text.png')).toBeVisible();
    await expect(
      page.getByText('Embedded text entries & comments'),
    ).toBeVisible();
    await expect(page.getByText('Author')).toBeVisible();
    await expect(page.getByText('Jane Doe')).toBeVisible();
  });
});

test.describe('Smart Dropzone Routing (/ page)', () => {
  test('routes video files (.mp4) to /video/trim', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles({
      name: 'sample-clip.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-video-content'),
    });

    await expect(page.getByText('Video File')).toBeVisible();
    const actionLink = page.getByRole('link', {
      name: /Trim, mute or extract the audio/,
    });
    await expect(actionLink).toBeVisible();
    await expect(actionLink).toHaveAttribute('href', '/video/trim');
  });

  test('routes non-MP3 audio files (.wav) to /audio/convert', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles({
      name: 'sample-audio.wav',
      mimeType: 'audio/wav',
      buffer: Buffer.from('fake-audio-content'),
    });

    await expect(page.getByText('Audio Recording')).toBeVisible();
    const actionLink = page.getByRole('link', {
      name: /Convert to WAV/,
    });
    await expect(actionLink).toBeVisible();
    await expect(actionLink).toHaveAttribute('href', '/audio/convert');
  });
});
