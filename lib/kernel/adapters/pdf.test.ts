import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getOperation } from '../registry';
import type { OperationContext, OperationResult } from '../types';

/**
 * The conformance run proves the PDF operations REFUSE a CSV. That is not the
 * same as proving they work, so these run real PDFs through them in Node with
 * no DOM present — the claim the MCP server rests on.
 */
async function makePdf(pages: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) document.addPage([200, 200]);
  return document.save();
}

function fileFor(name: string, bytes: Uint8Array) {
  return {
    name,
    type: 'application/pdf',
    size: bytes.byteLength,
    lastModified: 0,
    bytes,
  };
}

function contextFor(
  files: ReturnType<typeof fileFor>[],
  params: Record<string, string> = {},
): OperationContext {
  return { text: '', files, params, signal: new AbortController().signal };
}

async function run(
  id: string,
  files: ReturnType<typeof fileFor>[],
  params: Record<string, string> = {},
): Promise<OperationResult> {
  const operation = getOperation(id, 'pdf');
  expect(operation, `${id} is registered`).toBeDefined();
  return operation!.run(contextFor(files, params));
}

describe('pdf kernel adapter in Node', () => {
  it('merges two real PDFs into one with the combined page count', async () => {
    const result = await run('pdf-merge', [
      fileFor('a.pdf', await makePdf(2)),
      fileFor('b.pdf', await makePdf(3)),
    ]);
    expect(result.kind).toBe('files');
    if (result.kind !== 'files') return;
    const merged = await PDFDocument.load(result.files[0]!.bytes);
    expect(merged.getPageCount()).toBe(5);
    expect(result.summary).toContain('5 pages');
  });

  it('refuses a single input to merge rather than passing it through', async () => {
    await expect(
      run('pdf-merge', [fileFor('a.pdf', await makePdf(2))]),
    ).rejects.toThrow(/at least two/iu);
  });

  it('extracts a page range and validates it against the real page count', async () => {
    const source = fileFor('a.pdf', await makePdf(5));
    const result = await run('pdf-extract-pages', [source], { pages: '2-3' });
    expect(result.kind).toBe('files');
    if (result.kind !== 'files') return;
    const extracted = await PDFDocument.load(result.files[0]!.bytes);
    expect(extracted.getPageCount()).toBe(2);

    await expect(
      run('pdf-extract-pages', [source], { pages: '1-999' }),
    ).rejects.toThrow();
  });

  it('rotates every page and keeps the page count', async () => {
    const result = await run(
      'pdf-rotate-pages',
      [fileFor('a.pdf', await makePdf(3))],
      { rotation: '180' },
    );
    expect(result.kind).toBe('files');
    if (result.kind !== 'files') return;
    const rotated = await PDFDocument.load(result.files[0]!.bytes);
    expect(rotated.getPageCount()).toBe(3);
    expect(rotated.getPage(0).getRotation().angle).toBe(180);
  });

  it('refuses a rotation that is not a quarter turn', async () => {
    await expect(
      run('pdf-rotate-pages', [fileFor('a.pdf', await makePdf(1))], {
        rotation: '45',
      }),
    ).rejects.toThrow(/90, 180 or 270/u);
  });

  it('compresses losslessly and says so rather than implying an image pass', async () => {
    const operation = getOperation('pdf-compress', 'pdf')!;
    expect(operation.notice).toMatch(/lossless/iu);
    const result = await run('pdf-compress', [
      fileFor('a.pdf', await makePdf(4)),
    ]);
    expect(result.kind).toBe('files');
    if (result.kind !== 'files') return;
    expect(
      (await PDFDocument.load(result.files[0]!.bytes)).getPageCount(),
    ).toBe(4);
    expect(result.summary).toContain('lossless');
  });

  it('inspects page counts without changing the file', async () => {
    const result = await run('pdf-inspect', [
      fileFor('a.pdf', await makePdf(2)),
      fileFor('b.pdf', await makePdf(7)),
    ]);
    expect(result.kind).toBe('text');
    if (result.kind !== 'text') return;
    expect(JSON.parse(result.text)).toEqual([
      { name: 'a.pdf', pages: 2 },
      { name: 'b.pdf', pages: 7 },
    ]);
  });

  it('takes one PDF where the operation declares one', async () => {
    await expect(
      run('pdf-compress', [
        fileFor('a.pdf', await makePdf(1)),
        fileFor('b.pdf', await makePdf(1)),
      ]),
    ).rejects.toThrow(/one PDF at a time/u);
  });
});
