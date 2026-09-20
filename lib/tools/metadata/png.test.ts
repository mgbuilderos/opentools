import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readPngMetadata, stripPngMetadata } from './png';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(fixturesDir, name)));
}

describe('PNG metadata reader and stripper', () => {
  it('reads metadata from sample PNG fixture', () => {
    const bytes = loadFixture('sample-text.png');
    const res = readPngMetadata(bytes);

    expect(res.format).toBe('png');
    expect(res.hasMetadata).toBe(true);
    expect(res.shot.width).toBe(64);
    expect(res.shot.height).toBe(64);
    expect(res.camera.make).toBe('Canon');
    expect(res.camera.model).toBe('EOS R5');

    const authorEntry = res.rawTextEntries.find((e) => e.key === 'Author');
    expect(authorEntry?.value).toBe('OpenTools Contributor');

    const descEntry = res.rawTextEntries.find((e) => e.key === 'Description');
    expect(descEntry?.value).toBe('Sample PNG with textual metadata');

    const timeEntry = res.rawTextEntries.find((e) =>
      e.key.includes('Timestamp'),
    );
    expect(timeEntry?.value).toContain('2026-09-19');
  });

  it('strips all metadata chunks from PNG', () => {
    const bytes = loadFixture('sample-text.png');
    const stripped = stripPngMetadata(bytes);

    expect(stripped.success).toBe(true);
    expect(stripped.bytesSaved).toBeGreaterThan(0);
    expect(stripped.removed).toContain('eXIf metadata chunk');
    expect(stripped.removed).toContain('tEXt textual metadata chunk');
    expect(stripped.removed).toContain('tIME modification timestamp chunk');

    const strippedMeta = readPngMetadata(stripped.cleanedBytes);
    expect(strippedMeta.hasMetadata).toBe(false);
    expect(strippedMeta.camera.make).toBeUndefined();
    expect(strippedMeta.rawTextEntries).toHaveLength(0);
    expect(strippedMeta.shot.width).toBe(64);
    expect(strippedMeta.shot.height).toBe(64);
  });

  it('rejects invalid PNG signature gracefully', () => {
    const notPng = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const res = readPngMetadata(notPng);
    expect(res.hasMetadata).toBe(false);
    expect(res.warnings[0]).toContain('invalid signature');

    const stripped = stripPngMetadata(notPng);
    expect(stripped.success).toBe(false);
  });
});
