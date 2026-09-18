import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The share card, guarded.
 *
 * `twitter:card` was set to `summary_large_image` — which reserves a
 * full-bleed image slot — while no `og:image` or `twitter:image` was ever
 * declared and no image file existed. Every share on X, LinkedIn, Slack,
 * Discord, Reddit and WhatsApp therefore rendered an empty card. Nothing
 * failed, no test complained, and the only way to notice was to post a link.
 *
 * That is the worst shape a bug can have for this project specifically,
 * because the growth plan is almost entirely "people post links to it". A
 * broken card is a silent tax on every share, discovered on launch day.
 */
const appRoot = path.join(import.meta.dirname, '..', '..');

/**
 * Width and height out of the PNG's IHDR, no image library required.
 *
 * Plain byte arithmetic rather than Buffer helpers: `readFileSync` is typed
 * here as a bare `Uint8Array`, which has neither `readUInt32BE` nor a
 * radix-taking `toString`.
 */
function pngSize(file: string) {
  const bytes = new Uint8Array(readFileSync(file));
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const be32 = (at: number) =>
    ((bytes[at]! << 24) |
      (bytes[at + 1]! << 16) |
      (bytes[at + 2]! << 8) |
      bytes[at + 3]!) >>>
    0;
  return {
    isPng: PNG_SIGNATURE.every((byte, index) => bytes[index] === byte),
    // IHDR is the first chunk; width and height sit at byte 16 and 20.
    width: be32(16),
    height: be32(20),
  };
}

describe('open graph share card', () => {
  const cardPath = path.join(appRoot, 'public', 'og.png');
  const layout = readFileSync(path.join(appRoot, 'app', 'layout.tsx'), 'utf8');

  it('ships a real PNG at the declared size', () => {
    const card = pngSize(cardPath);
    expect(card.isPng, 'public/og.png is not a PNG').toBe(true);
    // 1200x630 is what every platform crops against; off-size cards get
    // letterboxed or centre-cropped through the headline.
    expect(card.width).toBe(1200);
    expect(card.height).toBe(630);
    // Twitter and LinkedIn refuse images over 5MB.
    expect(statSync(cardPath).size).toBeLessThan(5_000_000);
  });

  it('declares the image for both Open Graph and Twitter', () => {
    expect(layout).toMatch(/images:\s*\[/u);
    expect(layout).toContain('/og.png');
    // Both blocks need it: X reads `twitter:*` first and does not fall back to
    // `og:image` reliably once a card type is declared.
    const openGraph = layout.slice(
      layout.indexOf('openGraph:'),
      layout.indexOf('twitter:'),
    );
    const twitter = layout.slice(
      layout.indexOf('twitter:'),
      layout.indexOf('robots:'),
    );
    expect(openGraph, 'openGraph block declares no image').toContain('og.png');
    expect(twitter, 'twitter block declares no image').toContain('og.png');
  });

  it('never promises a large image card without supplying one', () => {
    // The exact invariant that broke. A `summary_large_image` card with no
    // image is strictly worse than no card at all: the platform reserves the
    // space and renders it blank.
    const twitter = layout.slice(
      layout.indexOf('twitter:'),
      layout.indexOf('robots:'),
    );
    if (/summary_large_image/u.test(twitter)) {
      expect(twitter, 'summary_large_image declared with no image').toMatch(
        /images:/u,
      );
    }
  });

  it('keeps the card in step with the site it represents', () => {
    // The generator reads the dark tokens out of globals.css rather than
    // copying them, so a brand change cannot silently leave the card behind.
    const generator = readFileSync(
      path.join(appRoot, 'scripts', 'generate-og-image.py'),
      'utf8',
    );
    expect(generator).toContain('globals.css');
    expect(generator).toContain('public');
  });
});
