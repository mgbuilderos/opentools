import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { OperationContext } from '@/lib/kernel/types';

import { readTags } from './dicom';
import { dicomOperations } from './kernel';

const fixtures = resolve(import.meta.dirname, '__fixtures__');

async function context(name: string): Promise<OperationContext> {
  const bytes = new Uint8Array(await readFile(resolve(fixtures, name)));
  return {
    text: '',
    files: [
      {
        name,
        type: 'application/dicom',
        size: bytes.length,
        lastModified: 0,
        bytes,
      },
    ],
    params: {},
    signal: new AbortController().signal,
  };
}

function operation(id: string) {
  const found = dicomOperations.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing test operation ${id}.`);
  return found;
}

describe('DICOM kernel operations', () => {
  it('registers tag reading, anonymisation, and pixel extraction', () => {
    expect(dicomOperations.map(({ id }) => id)).toEqual([
      'dicom-read-tags',
      'dicom-anonymise-basic',
      'dicom-extract-pixels',
    ]);
  });

  it('produces a readable anonymised DICOM file', async () => {
    const result = await operation('dicom-anonymise-basic').run(
      await context('explicit-le.dcm'),
    );
    if (result.kind !== 'files') throw new Error('Expected a DICOM file.');
    const reread = await readTags(result.files[0]!.bytes);
    expect(reread.tags.find(({ tag }) => tag === '0010,0010')?.value).toBe('');
    expect(result.summary).toContain('burned into pixel data');
  });

  it('returns exact raw pixel bytes and separate metadata', async () => {
    const result = await operation('dicom-extract-pixels').run(
      await context('rle.dcm'),
    );
    if (result.kind !== 'files') throw new Error('Expected pixel files.');
    expect(result.files.map(({ name }) => name)).toEqual([
      'rle-pixels.raw',
      'rle-pixels.json',
    ]);
    expect(result.files[0]?.bytes).toEqual(
      Uint8Array.of(0, 50, 100, 150, 200, 255),
    );
  });
});
