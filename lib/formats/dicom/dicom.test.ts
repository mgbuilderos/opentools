import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BASIC_APPLICATION_LEVEL_CONFIDENTIALITY_PROFILE,
  DicomFormatError,
  PIXEL_BURN_IN_WARNING,
  anonymise,
  extractPixels,
  identifyingTags,
  readTags,
} from './index';

const fixtures = resolve(import.meta.dirname, '__fixtures__');

async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve(fixtures, name)));
}

function tagValue(result: Awaited<ReturnType<typeof readTags>>, tag: string) {
  return result.tags.find((candidate) => candidate.tag === tag)?.value;
}

describe('DICOM formats', () => {
  it('reads explicit VR little-endian tags', async () => {
    const result = await readTags(await fixture('explicit-le.dcm'));

    expect(result.transferSyntax).toBe('1.2.840.10008.1.2.1');
    expect(result.explicitVr).toBe(true);
    expect(result.littleEndian).toBe(true);
    expect(tagValue(result, '0010,0010')).toBe('SYNTHETIC^PERSON');
    expect(tagValue(result, '0028,0010')).toBe(2);
  });

  it('reads implicit VR little-endian tags and reports unknown dictionary entries', async () => {
    const result = await readTags(await fixture('implicit-le.dcm'));

    expect(result.transferSyntax).toBe('1.2.840.10008.1.2');
    expect(result.explicitVr).toBe(false);
    expect(tagValue(result, '0010,0010')).toBe('IMPLICIT^PERSON');
    expect(result.unparsed).toContainEqual(
      expect.objectContaining({ tag: '7778,0010' }),
    );
  });

  it('reads explicit VR big-endian tags', async () => {
    const result = await readTags(await fixture('explicit-be.dcm'));

    expect(result.transferSyntax).toBe('1.2.840.10008.1.2.2');
    expect(result.explicitVr).toBe(true);
    expect(result.littleEndian).toBe(false);
    expect(tagValue(result, '0028,0100')).toBe(16);
  });

  it('finds standard identifiers and all private attributes', async () => {
    const result = await readTags(await fixture('explicit-le.dcm'));
    const identifiers = identifyingTags(result.tags).map(({ tag }) => tag);

    expect(identifiers).toEqual(
      expect.arrayContaining([
        '0008,0018',
        '0008,0020',
        '0008,0080',
        '0010,0010',
        '0010,0020',
        '0010,1000',
        '0011,0010',
      ]),
    );
  });

  it('anonymises the Basic Profile identifiers without returning their values', async () => {
    const source = await fixture('explicit-le.dcm');
    const result = await anonymise(
      source,
      BASIC_APPLICATION_LEVEL_CONFIDENTIALITY_PROFILE,
    );
    const binary = new TextDecoder('windows-1252').decode(result.bytes);

    expect(binary).not.toContain('SYNTHETIC^PERSON');
    expect(binary).not.toContain('SYNTHETIC-123');
    expect(binary).not.toContain('OLDER-ID-456');
    expect(binary).not.toContain('SYNTHETIC HOSPITAL');
    expect(binary).not.toContain('SYNTHETIC_PRIVATE');
    expect(result.removed.map(({ tag }) => tag)).toContain('0010,1000');
    expect(JSON.stringify(result.removed)).not.toContain('SYNTHETIC');

    const reread = await readTags(result.bytes);
    expect(tagValue(reread, '0010,0010')).toBe('');
    expect(tagValue(reread, '0008,0016')).toBe('1.2.840.10008.5.1.4.1.1.7');
    expect(tagValue(reread, '0028,0303')).toBe('REMOVED');
  });

  it('reports tags it cannot interpret while anonymising', async () => {
    const result = await anonymise(
      await fixture('implicit-le.dcm'),
      BASIC_APPLICATION_LEVEL_CONFIDENTIALITY_PROFILE,
    );

    expect(result.unparsed).toContainEqual(
      expect.objectContaining({ tag: '7778,0010' }),
    );
    expect(new TextDecoder().decode(result.bytes)).not.toContain(
      'opaque-even-tag',
    );

    const explicit = await anonymise(
      await fixture('explicit-le.dcm'),
      BASIC_APPLICATION_LEVEL_CONFIDENTIALITY_PROFILE,
    );
    expect(explicit.unparsed).toContainEqual(
      expect.objectContaining({ tag: '0011,0010' }),
    );
  });

  it('extracts uncompressed 8-bit and 16-bit pixel data', async () => {
    await expect(
      extractPixels(await fixture('explicit-le.dcm')),
    ).resolves.toEqual({
      width: 3,
      height: 2,
      bitDepth: 8,
      data: Uint8Array.of(0, 50, 100, 150, 200, 255),
    });
    await expect(
      extractPixels(await fixture('explicit-be.dcm')),
    ).resolves.toEqual({
      width: 2,
      height: 1,
      bitDepth: 16,
      data: Uint8Array.of(1, 2, 3, 4),
    });
  });

  it('extracts DICOM RLE Lossless pixel data', async () => {
    await expect(extractPixels(await fixture('rle.dcm'))).resolves.toEqual({
      width: 3,
      height: 2,
      bitDepth: 8,
      data: Uint8Array.of(0, 50, 100, 150, 200, 255),
    });
  });

  it('throws a typed error instead of half-decoding JPEG pixels', async () => {
    await expect(
      extractPixels(await fixture('jpeg.dcm')),
    ).rejects.toMatchObject({
      name: 'DicomFormatError',
      code: 'UNSUPPORTED_COMPRESSION',
    });
  });

  it.each([
    ['truncated.dcm', 'TRUNCATED_DICOM'],
    ['wrong-magic.dcm', 'UNSUPPORTED_FORMAT'],
    ['declared-length.dcm', 'DECLARED_LENGTH_EXCEEDS_BUFFER'],
  ] as const)('throws a typed error for %s', async (name, code) => {
    const error = await readTags(await fixture(name)).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(DicomFormatError);
    expect(error).toMatchObject({ code });
  });

  it('exports the mandatory pixel burn-in warning', () => {
    expect(PIXEL_BURN_IN_WARNING).toMatch(/pixel/iu);
    expect(PIXEL_BURN_IN_WARNING).toMatch(/not remove/iu);
  });
});
