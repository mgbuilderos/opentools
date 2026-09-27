import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildPng,
  buildWebpVp8l,
  buildWebpVp8x,
} from '../testing/synthetic-images';
import {
  describeBytes,
  formatLabel,
  formatSupportsTransparency,
  formatWasSubstituted,
  probeEncodedFormat,
  readAlphaChannel,
  unmetReasons,
  verifyImageBytes,
} from './image-verify';

/**
 * Provenance of the inputs used here.
 *
 * Two kinds, deliberately:
 *
 * 1. **Real files already in this repository**, under
 *    `lib/tools/metadata/__fixtures__`, used as cross-checks that the parser
 *    agrees with what real encoders actually produce. Measured properties are
 *    asserted below rather than assumed.
 * 2. **Files constructed byte by byte**, by `lib/testing/synthetic-images`.
 *    None of the committed fixtures carries an alpha channel, so every
 *    "transparency is present" path would otherwise be untested. That helper
 *    documents *why* each byte means what it means — a fixture blob could not
 *    show that the WebP lossless alpha flag is bit 4 of the fifth payload byte,
 *    and a wrong bit position is exactly the mistake these tests exist to catch.
 */

const metadataFixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'metadata',
  '__fixtures__',
);

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(metadataFixtures, name)));
}

// ---------------------------------------------------------------------------

describe('readAlphaChannel', () => {
  it('reports no alpha channel for JPEG, which cannot carry one', () => {
    expect(readAlphaChannel(fixture('no-metadata.jpg'))).toBe(false);
    expect(readAlphaChannel(fixture('gps-camera-photo.jpg'))).toBe(false);
  });

  it('reads the PNG colour type: 6 and 4 carry alpha, 2 and 0 do not', () => {
    expect(
      readAlphaChannel(buildPng({ width: 4, height: 4, colourType: 6 })),
    ).toBe(true);
    expect(
      readAlphaChannel(buildPng({ width: 4, height: 4, colourType: 4 })),
    ).toBe(true);
    expect(
      readAlphaChannel(buildPng({ width: 4, height: 4, colourType: 2 })),
    ).toBe(false);
    expect(
      readAlphaChannel(buildPng({ width: 4, height: 4, colourType: 0 })),
    ).toBe(false);
  });

  it('treats a tRNS chunk as transparency for palette and colour-key PNGs', () => {
    expect(
      readAlphaChannel(
        buildPng({ width: 4, height: 4, colourType: 3, withTrns: true }),
      ),
    ).toBe(true);
    expect(
      readAlphaChannel(
        buildPng({ width: 4, height: 4, colourType: 2, withTrns: true }),
      ),
    ).toBe(true);
    expect(
      readAlphaChannel(buildPng({ width: 4, height: 4, colourType: 3 })),
    ).toBe(false);
  });

  it('agrees with the real PNG fixtures in this repository', () => {
    // Measured: both are colour type 2 with no tRNS chunk.
    expect(readAlphaChannel(fixture('sample-text.png'))).toBe(false);
    expect(readAlphaChannel(fixture('sample-text.stripped.png'))).toBe(false);
  });

  it('reads the VP8X alpha flag without confusing it with the Exif flag', () => {
    expect(
      readAlphaChannel(buildWebpVp8x({ width: 8, height: 8, alpha: true })),
    ).toBe(true);
    expect(
      readAlphaChannel(buildWebpVp8x({ width: 8, height: 8, alpha: false })),
    ).toBe(false);
    // Exif set, alpha clear: flags 0x08. A parser testing the wrong bit fails here.
    expect(
      readAlphaChannel(
        buildWebpVp8x({ width: 8, height: 8, alpha: false, exif: true }),
      ),
    ).toBe(false);
    expect(
      readAlphaChannel(
        buildWebpVp8x({ width: 8, height: 8, alpha: true, exif: true }),
      ),
    ).toBe(true);
  });

  it('agrees with the real WebP fixtures, whose VP8X flags are 0x08 and 0x00', () => {
    expect(readAlphaChannel(fixture('sample-exif.webp'))).toBe(false);
    expect(readAlphaChannel(fixture('sample-exif.stripped.webp'))).toBe(false);
  });

  it('reads the lossless VP8L alpha bit', () => {
    expect(
      readAlphaChannel(buildWebpVp8l({ width: 16, height: 9, alpha: true })),
    ).toBe(true);
    expect(
      readAlphaChannel(buildWebpVp8l({ width: 16, height: 9, alpha: false })),
    ).toBe(false);
  });

  it('returns null rather than guessing on unreadable input', () => {
    expect(readAlphaChannel(new Uint8Array(0))).toBeNull();
    expect(readAlphaChannel(fixture('corrupt-truncated.jpg'))).toBe(false); // still a JPEG
    expect(
      readAlphaChannel(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
    ).toBeNull();
    // A PNG signature with no room for IHDR: unknown, not "no alpha".
    expect(
      readAlphaChannel(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBeNull();
  });
});

describe('verifyImageBytes — format is read from bytes, never from a promise', () => {
  it('passes when the container matches', () => {
    const png = buildPng({ width: 10, height: 10, colourType: 6 });
    const result = verifyImageBytes(png, { format: 'image/png' });
    expect(result.detectedFormat).toBe('image/png');
    expect(result.pass).toBe(true);
  });

  it('fails a JPEG promise that a PNG file does not keep', () => {
    const png = buildPng({ width: 10, height: 10, colourType: 6 });
    const result = verifyImageBytes(png, { format: 'image/jpeg' });
    expect(result.pass).toBe(false);
    const check = result.checks.find((c) => c.id === 'format');
    expect(check?.actual).toBe('PNG');
    expect(check?.required).toBe('JPEG');
  });

  it('reports a file that is not an image at all', () => {
    const result = verifyImageBytes(new Uint8Array([1, 2, 3, 4]), {
      format: 'image/png',
    });
    expect(result.detectedFormat).toBeNull();
    expect(result.pass).toBe(false);
    expect(result.checks.find((c) => c.id === 'format')?.actual).toBe(
      'not a JPEG, PNG or WebP file',
    );
  });
});

describe('verifyImageBytes — byte limits', () => {
  const png = buildPng({ width: 10, height: 10, colourType: 2 });

  it('passes a limit the file is under, using its real measured length', () => {
    const result = verifyImageBytes(png, { maxBytes: png.length });
    expect(result.byteLength).toBe(png.length);
    expect(result.pass).toBe(true);
  });

  it('fails by one byte, because the boundary is inclusive', () => {
    const result = verifyImageBytes(png, { maxBytes: png.length - 1 });
    expect(result.pass).toBe(false);
    expect(result.checks.find((c) => c.id === 'maxBytes')?.pass).toBe(false);
  });

  it('checks a minimum when one was promised', () => {
    expect(verifyImageBytes(png, { minBytes: png.length }).pass).toBe(true);
    expect(verifyImageBytes(png, { minBytes: png.length + 1 }).pass).toBe(
      false,
    );
  });

  it('never passes an empty file, however few promises were made', () => {
    const result = verifyImageBytes(new Uint8Array(0), {});
    expect(result.pass).toBe(false);
    expect(result.checks.find((c) => c.id === 'notEmpty')?.pass).toBe(false);
  });
});

describe('verifyImageBytes — pixels', () => {
  it('reads the size out of the file header when no decode is supplied', () => {
    const png = buildPng({ width: 120, height: 80, colourType: 2 });
    const result = verifyImageBytes(png, { exactWidth: 120, exactHeight: 80 });
    expect(result.headerSize).toEqual({ width: 120, height: 80 });
    expect(result.pass).toBe(true);
  });

  it('fails exact dimensions that the file does not have', () => {
    const png = buildPng({ width: 120, height: 80, colourType: 2 });
    const result = verifyImageBytes(png, { exactWidth: 120, exactHeight: 81 });
    expect(result.pass).toBe(false);
    expect(result.checks.find((c) => c.id === 'exactPixels')?.actual).toBe(
      '120 × 80 px',
    );
  });

  it('holds a maximum width and height as upper bounds, not equalities', () => {
    const png = buildPng({ width: 100, height: 50, colourType: 2 });
    expect(verifyImageBytes(png, { maxWidth: 100 }).pass).toBe(true);
    expect(verifyImageBytes(png, { maxWidth: 200 }).pass).toBe(true);
    expect(verifyImageBytes(png, { maxWidth: 99 }).pass).toBe(false);
    expect(verifyImageBytes(png, { maxHeight: 49 }).pass).toBe(false);
  });

  it('fails when an independent decode disagrees with the file header', () => {
    const png = buildPng({ width: 120, height: 80, colourType: 2 });
    const result = verifyImageBytes(
      png,
      { exactWidth: 120, exactHeight: 80 },
      {
        width: 60,
        height: 40,
      },
    );
    expect(result.pass).toBe(false);
    const mismatch = result.checks.find((c) => c.id === 'headerMatchesPixels');
    expect(mismatch?.pass).toBe(false);
    // And the size check judges the decoded pixels, not the header's claim.
    expect(result.checks.find((c) => c.id === 'exactPixels')?.pass).toBe(false);
  });

  it('says so rather than passing when the size cannot be read at all', () => {
    const notAnImage = new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9]);
    const result = verifyImageBytes(notAnImage, { maxWidth: 100 });
    expect(result.pass).toBe(false);
    expect(result.unprovable.map((u) => u.id)).toContain('pixels');
    expect(result.checks.find((c) => c.id === 'maxWidth')).toBeUndefined();
  });
});

describe('verifyImageBytes — transparency', () => {
  it('confirms transparency was kept', () => {
    const rgba = buildPng({ width: 8, height: 8, colourType: 6 });
    expect(verifyImageBytes(rgba, { alphaChannel: true }).pass).toBe(true);
    expect(verifyImageBytes(rgba, { alphaChannel: false }).pass).toBe(false);
  });

  it('confirms transparency was flattened away', () => {
    const rgb = buildPng({ width: 8, height: 8, colourType: 2 });
    expect(verifyImageBytes(rgb, { alphaChannel: false }).pass).toBe(true);
    expect(verifyImageBytes(rgb, { alphaChannel: true }).pass).toBe(false);
  });

  it('cannot be promised for a file whose transparency is unreadable', () => {
    const result = verifyImageBytes(new Uint8Array([7, 7, 7, 7]), {
      alphaChannel: true,
    });
    expect(result.pass).toBe(false);
    expect(result.unprovable.map((u) => u.id)).toContain('alphaChannel');
  });

  it('knows which containers can carry transparency at all', () => {
    expect(formatSupportsTransparency('image/jpeg')).toBe(false);
    expect(formatSupportsTransparency('image/png')).toBe(true);
    expect(formatSupportsTransparency('image/webp')).toBe(true);
  });
});

describe('verifyImageBytes — metadata', () => {
  it('confirms removal against a file that really has none', () => {
    const result = verifyImageBytes(fixture('sample-text.stripped.png'), {
      metadataRemoved: true,
    });
    expect(result.hasMetadata).toBe(false);
    expect(result.pass).toBe(true);
  });

  it('fails when metadata is still there', () => {
    const result = verifyImageBytes(fixture('sample-text.png'), {
      metadataRemoved: true,
    });
    expect(result.hasMetadata).toBe(true);
    expect(result.pass).toBe(false);
    expect(result.checks.find((c) => c.id === 'metadataRemoved')?.actual).toBe(
      'still present',
    );
  });

  it('fails a stripped-metadata promise on a WebP that still carries Exif', () => {
    expect(
      verifyImageBytes(fixture('sample-exif.webp'), { metadataRemoved: true })
        .pass,
    ).toBe(false);
    expect(
      verifyImageBytes(fixture('sample-exif.stripped.webp'), {
        metadataRemoved: true,
      }).pass,
    ).toBe(true);
  });

  it('refuses to confirm removal on a container it cannot parse', () => {
    const result = verifyImageBytes(new Uint8Array([3, 3, 3, 3]), {
      metadataRemoved: true,
    });
    expect(result.hasMetadata).toBeNull();
    expect(result.pass).toBe(false);
    expect(result.unprovable.map((u) => u.id)).toContain('metadataRemoved');
  });

  it('makes no metadata check when removal was never promised', () => {
    const result = verifyImageBytes(fixture('sample-text.png'), {
      format: 'image/png',
    });
    expect(
      result.checks.find((c) => c.id === 'metadataRemoved'),
    ).toBeUndefined();
    expect(result.pass).toBe(true);
  });
});

describe('verifyImageBytes — everything at once, and the reasons it gives', () => {
  it('passes a file that satisfies a full requirement', () => {
    const png = buildPng({ width: 200, height: 100, colourType: 6 });
    const result = verifyImageBytes(
      png,
      {
        format: 'image/png',
        maxBytes: 10_000,
        maxWidth: 200,
        maxHeight: 100,
        alphaChannel: true,
        metadataRemoved: true,
      },
      { width: 200, height: 100 },
    );
    expect(result.pass).toBe(true);
    expect(unmetReasons(result)).toEqual([]);
  });

  it('names every missed promise, not just the first', () => {
    const png = buildPng({
      width: 400,
      height: 400,
      colourType: 2,
      withText: true,
    });
    const result = verifyImageBytes(png, {
      format: 'image/jpeg',
      maxBytes: 10,
      maxWidth: 100,
      alphaChannel: true,
      metadataRemoved: true,
    });
    expect(result.pass).toBe(false);
    const reasons = unmetReasons(result);
    expect(reasons.length).toBeGreaterThanOrEqual(5);
    expect(reasons.join(' ')).toContain('File type');
    expect(reasons.join(' ')).toContain('Maximum file size');
    expect(reasons.join(' ')).toContain('Maximum width');
    expect(reasons.join(' ')).toContain('Transparency');
    expect(reasons.join(' ')).toContain('Metadata');
  });

  it('passes vacuously only when nothing was promised about a real file', () => {
    const png = buildPng({ width: 4, height: 4, colourType: 2 });
    const result = verifyImageBytes(png, {});
    expect(result.checks).toEqual([]);
    expect(result.pass).toBe(true);
  });
});

describe('copy helpers', () => {
  it('describes bytes without losing the exact count', () => {
    expect(describeBytes(512)).toBe('512 bytes');
    expect(describeBytes(2048)).toContain('2 KB');
    expect(describeBytes(2048)).toContain('2,048 bytes');
    expect(describeBytes(5 * 1024 * 1024)).toContain('5 MB');
  });

  it('names containers the way a visitor reads them', () => {
    expect(formatLabel('image/jpeg')).toBe('JPEG');
    expect(formatLabel('image/png')).toBe('PNG');
    expect(formatLabel('image/webp')).toBe('WebP');
  });
});

describe('what a browser can actually write', () => {
  /** A canvas stand-in, so the probe is testable with no DOM at all. */
  const fakeCanvas =
    (behaviour: {
      produces?: string | null;
      throws?: boolean;
      noToBlob?: boolean;
      silent?: boolean;
    }) =>
    () =>
      ({
        width: 0,
        height: 0,
        ...(behaviour.noToBlob
          ? {}
          : {
              toBlob(callback: (blob: { type: string } | null) => void) {
                if (behaviour.throws) throw new Error('no');
                if (behaviour.silent) return; // never calls back
                callback(
                  behaviour.produces === null
                    ? null
                    : { type: behaviour.produces ?? '' },
                );
              },
            }),
      }) as unknown as HTMLCanvasElement;

  it('reports the type the browser really produced', async () => {
    expect(
      await probeEncodedFormat(
        'image/webp',
        fakeCanvas({ produces: 'image/webp' }),
      ),
    ).toBe('image/webp');
  });

  it('reports the substitute, which is the whole point', async () => {
    // WebKit answers a WebP request with a PNG rather than refusing.
    expect(
      await probeEncodedFormat(
        'image/webp',
        fakeCanvas({ produces: 'image/png' }),
      ),
    ).toBe('image/png');
  });

  it('answers unknown rather than "cannot" for every way the check can fail', async () => {
    for (const behaviour of [
      { produces: null },
      { produces: '' },
      { throws: true },
      { noToBlob: true },
      { silent: true },
    ]) {
      expect(
        await probeEncodedFormat('image/webp', fakeCanvas(behaviour)),
      ).toBeNull();
    }
    expect(await probeEncodedFormat('image/webp', () => null)).toBeNull();
  });

  it('does not hang when the browser never calls back', async () => {
    const started = Date.now();
    expect(
      await probeEncodedFormat('image/webp', fakeCanvas({ silent: true })),
    ).toBeNull();
    // Bounded, and comfortably inside its own 2s cap.
    expect(Date.now() - started).toBeLessThan(4000);
  });

  it('calls a substitution a substitution, and an unknown answer neither way', () => {
    expect(formatWasSubstituted('image/webp', 'image/png')).toBe(true);
    expect(formatWasSubstituted('image/webp', 'image/webp')).toBe(false);
    expect(formatWasSubstituted('image/webp', 'IMAGE/WEBP')).toBe(false);
    // Unknown must never be reported as a limitation of the browser.
    expect(formatWasSubstituted('image/webp', null)).toBe(false);
    expect(formatWasSubstituted('image/webp', '')).toBe(false);
  });
});
