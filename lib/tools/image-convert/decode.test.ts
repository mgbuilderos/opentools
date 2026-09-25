import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import libheif from 'libheif-js';
import { describe, expect, it } from 'vitest';

/**
 * The decoder, frozen against a file an outside tool made and approved.
 *
 * HOW THE FIXTURE WAS MADE, so it can be remade rather than trusted. A 64 by 64
 * PNG of four flat blocks -- red (220,30,40), blue (30,140,220), white
 * (250,250,250) and near-black (20,20,20), one per quadrant -- was written by
 * hand, then converted with macOS `sips -s format heic`. `file` reports the
 * result as "ISO Media, HEIF Image HEVC Main or Main Still Picture Profile" and
 * `sips` reads it back as 64 by 64. That is the outside verification; the bytes
 * are then committed and nothing here shells out, so this test is the same on
 * any machine and in CI.
 *
 * WHAT IT PINS. The numbers below are what libheif actually returned on
 * 2026-09-24, checked against the colours that went in: three quadrants come
 * back exactly, and the blue one lands one unit low on the blue channel (219
 * rather than 220) because HEVC is lossy and the picture makes a round trip
 * through YUV. Pinning the real values rather than the intended ones is the
 * point -- a decoder upgrade that changes the pixels will say so here instead
 * of being noticed by a reader looking at a photograph.
 *
 * THE TRAP THIS TEST WOULD OTHERWISE FALL INTO. `decoder.decode()` is lazy. It
 * returns in about a millisecond having decoded nothing, and the work happens
 * inside `image.display()`, which calls back asynchronously. A test that timed
 * `decode()` or read pixels straight after it would report a suspiciously fast
 * decode and an all-zero buffer -- which is exactly what the first measurement
 * of this package reported before the callback was awaited.
 */

const fixture = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '__fixtures__',
    'blocks-64.heic',
  ),
);

interface DecodedImage {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

async function decodeFixture(bytes: Uint8Array): Promise<DecodedImage> {
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(bytes);
  expect(images.length, 'the fixture holds exactly one image').toBe(1);
  const image = images[0]!;
  const width = image.get_width();
  const height = image.get_height();
  const target = {
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
  };
  await new Promise<void>((resolve, reject) => {
    image.display(target, (out: unknown) =>
      out ? resolve() : reject(new Error('libheif returned no pixels')),
    );
  });
  return { width, height, pixels: target.data };
}

function pixelAt(image: DecodedImage, x: number, y: number) {
  const index = (y * image.width + x) * 4;
  return [
    image.pixels[index],
    image.pixels[index + 1],
    image.pixels[index + 2],
    image.pixels[index + 3],
  ];
}

describe('libheif decodes a real HEIC to the bytes an outside tool approved', () => {
  it('reads the dimensions the outside tool reports', async () => {
    const image = await decodeFixture(fixture);
    expect([image.width, image.height]).toEqual([64, 64]);
    expect(image.pixels.length).toBe(64 * 64 * 4);
  });

  it('returns the frozen pixels, not merely some pixels', async () => {
    const image = await decodeFixture(fixture);
    // One sample in the middle of each quadrant, plus both far corners.
    expect(pixelAt(image, 16, 16)).toEqual([220, 30, 40, 255]);
    expect(pixelAt(image, 48, 16)).toEqual([30, 140, 219, 255]);
    expect(pixelAt(image, 16, 48)).toEqual([250, 250, 250, 255]);
    expect(pixelAt(image, 48, 48)).toEqual([20, 20, 20, 255]);
    expect(pixelAt(image, 0, 0)).toEqual([220, 30, 40, 255]);
    expect(pixelAt(image, 63, 63)).toEqual([20, 20, 20, 255]);
  });

  it('is opaque everywhere, so a JPEG needs no transparency fill here', async () => {
    const image = await decodeFixture(fixture);
    const alphas = new Set<number>();
    for (let index = 3; index < image.pixels.length; index += 4) {
      alphas.add(image.pixels[index]!);
    }
    expect([...alphas]).toEqual([255]);
  });

  it('fails cleanly on bytes that are not a HEIC', async () => {
    const notHeic = Buffer.from('this is not a photograph', 'utf8');
    // Either shape is acceptable: a throw, or an empty image list. What is not
    // acceptable is hanging, or returning an image whose pixels never arrive --
    // the page's error path depends on finding out promptly.
    let images: unknown[] = [];
    try {
      images = new libheif.HeifDecoder().decode(notHeic);
    } catch {
      images = [];
    }
    expect(images.length).toBe(0);
  });

  it('fails cleanly on a truncated HEIC', async () => {
    const half = fixture.subarray(0, Math.floor(fixture.length / 2));
    let pixelsArrived = true;
    try {
      const image = await decodeFixture(half);
      pixelsArrived = image.pixels.some((value) => value !== 0);
    } catch {
      pixelsArrived = false;
    }
    // A half file is not a picture. Whether libheif throws or hands back an
    // empty buffer, what matters is that it does not pretend to have decoded.
    expect(pixelsArrived).toBe(false);
  });
});
