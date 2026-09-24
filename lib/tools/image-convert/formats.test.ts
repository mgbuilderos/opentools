import { describe, expect, it } from 'vitest';

import {
  IMAGE_FORMATS,
  IMAGE_PAIRS_ANSWERED_ELSEWHERE,
  imageFormatById,
  imagePairById,
  imagePairs,
} from './formats';

describe('image conversion pairs', () => {
  it('never generates a pair whose destination canvas cannot write', () => {
    // The whole point of the `canEncode` gate. `canvas.toBlob` emits only
    // jpeg/png/webp; asked for anything else it silently returns a PNG, so a
    // generated `*-to-avif` page would promise an AVIF and hand over a
    // mislabelled PNG. This is the test that keeps that page from existing.
    for (const pair of imagePairs()) {
      expect(pair.to.canEncode, `${pair.id} writes ${pair.to.name}`).toBe(true);
    }
  });

  it('offers no pair that converts a format to itself', () => {
    for (const pair of imagePairs()) {
      expect(pair.from.id).not.toBe(pair.to.id);
    }
  });

  it('does not generate a pair a hand-written page already answers', () => {
    // Two addresses for one query with the same tool behind them split whatever
    // either had earned. Same rule as `lib/seo/format-pairs.ts`.
    const generated = new Set(imagePairs().map((pair) => pair.id));
    for (const id of Object.keys(IMAGE_PAIRS_ANSWERED_ELSEWHERE)) {
      expect(generated.has(id), `${id} is generated AND hand-written`).toBe(
        false,
      );
    }
  });

  it('routes every hand-written pair at an /image/ tool page', () => {
    for (const [id, href] of Object.entries(IMAGE_PAIRS_ANSWERED_ELSEWHERE)) {
      expect(href, `${id} must point at a real route`).toMatch(
        /^\/image\/[a-z0-9-]+$/u,
      );
    }
  });

  it('marks HEIC as the only format needing a downloaded decoder', () => {
    // If this ever fails, a second format started costing the reader a download
    // and the page copy owes them a disclosure. Measured 2026-09-24: every
    // engine reads jpg/png/webp/gif/bmp/avif unaided; only HEIC fails in Chromium.
    const needing = IMAGE_FORMATS.filter((format) => format.needsDecoder);
    expect(needing.map((format) => format.id)).toEqual(['heic']);
  });

  it('gives every format a unique id and a unique extension list', () => {
    const ids = IMAGE_FORMATS.map((format) => format.id);
    expect(new Set(ids).size).toBe(ids.length);
    const extensions = IMAGE_FORMATS.flatMap((format) => format.extensions);
    expect(new Set(extensions).size).toBe(extensions.length);
  });

  it('resolves every generated pair by id, and unknown ids to undefined', () => {
    for (const pair of imagePairs()) {
      expect(imagePairById(pair.id)?.id).toBe(pair.id);
    }
    expect(imagePairById('png-to-avif')).toBeUndefined();
    expect(imagePairById('heic-to-jpg')).toBeUndefined();
    expect(imageFormatById('tiff')).toBeUndefined();
  });

  it('covers the conversions people actually search for', () => {
    // Guards against a future edit quietly dropping a format and taking the
    // demand with it. These are the high-volume must-click queries.
    const generated = new Set(imagePairs().map((pair) => pair.id));
    for (const id of [
      'webp-to-png',
      'webp-to-jpg',
      'avif-to-jpg',
      'png-to-jpg',
    ]) {
      expect(generated.has(id), `${id} should have a page`).toBe(true);
    }
    // And HEIC is served, just by a hand-written page rather than a generated one.
    expect(IMAGE_PAIRS_ANSWERED_ELSEWHERE['heic-to-jpg']).toBe(
      '/image/heic-to-jpg',
    );
  });
});
