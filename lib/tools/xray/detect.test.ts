import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { createZip } from '../docx/zip';
import { detectFormat } from './detect';

const toolsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function fixture(relative: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(toolsDir, relative)));
}

const encoder = new TextEncoder();

describe('detectFormat', () => {
  it('reads the container from the bytes, for every format it supports', () => {
    expect(
      detectFormat(fixture('metadata/__fixtures__/gps-camera-photo.jpg')),
    ).toBe('jpeg');
    expect(detectFormat(fixture('metadata/__fixtures__/sample-text.png'))).toBe(
      'png',
    );
    expect(
      detectFormat(fixture('metadata/__fixtures__/sample-exif.webp')),
    ).toBe('webp');
    expect(detectFormat(fixture('video/__fixtures__/baseline.mp4'))).toBe(
      'mp4',
    );
    expect(detectFormat(fixture('spreadsheet/__fixtures__/sales.xlsx'))).toBe(
      'xlsx',
    );
  });

  it('tells the three OOXML documents apart by the part only each one has', async () => {
    // All three are ZIPs with the same magic bytes, so nothing but the contents
    // can distinguish them.
    const cases = [
      ['word/document.xml', 'docx'],
      ['xl/workbook.xml', 'xlsx'],
      ['ppt/presentation.xml', 'pptx'],
    ] as const;

    for (const [part, expected] of cases) {
      const bytes = await createZip([
        { path: part, data: encoder.encode('<root/>') },
      ]);
      expect(detectFormat(bytes), `${part} should read as ${expected}`).toBe(
        expected,
      );
    }
  });

  it('calls a ZIP that is not an Office document a ZIP', async () => {
    const bytes = await createZip([
      { path: 'notes.txt', data: encoder.encode('hello') },
    ]);
    expect(detectFormat(bytes)).toBe('zip');
  });

  it('ignores the extension and trusts the bytes', () => {
    // The whole reason this reads magic bytes: a file named .jpg that is a PNG
    // must be parsed as a PNG, or its metadata is read with the wrong parser.
    const png = fixture('metadata/__fixtures__/sample-text.png');
    expect(detectFormat(png)).toBe('png');
  });

  it('refuses what it cannot open instead of guessing', () => {
    expect(detectFormat(new Uint8Array(0))).toBe('unsupported');
    // A GIF is a real image this tool has no parser for.
    expect(
      detectFormat(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0])),
    ).toBe('unsupported');
    // Plain text.
    expect(detectFormat(encoder.encode('just some notes'))).toBe('unsupported');
    // Long enough to pass a length check, random enough to match no signature.
    expect(detectFormat(new Uint8Array(64).fill(0x7f))).toBe('unsupported');
  });

  it('does not crash on bytes too short to hold any signature', () => {
    for (let length = 0; length < 13; length += 1) {
      expect(() =>
        detectFormat(new Uint8Array(length).fill(0x50)),
      ).not.toThrow();
    }
  });

  it('reports a ZIP whose index is unreadable as a ZIP, not as unsupported', async () => {
    // Truncating after the local header leaves the magic bytes intact and the
    // central directory gone. The file is still a ZIP and saying so is what
    // lets the report explain why nothing could be read out of it.
    const whole = await createZip([
      { path: 'word/document.xml', data: encoder.encode('<root/>') },
    ]);
    expect(detectFormat(whole.slice(0, 24))).toBe('zip');
  });
});
