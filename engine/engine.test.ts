import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import {
  csvToJson,
  extractPdfPages,
  hasPdfSignature,
  inspectPdfInputs,
  mergePdfInputs,
  parsePageSelection,
  PdfEngineError,
  QR_BARCODE_OPERATIONS,
  rgbaToTensor,
  runQrBarcodeOperation,
  runTextOperation,
  saliencyToMatte,
  TEXT_OPERATIONS,
  transformText,
  U2NETP,
} from '@/engine';
import type { PdfWorkerInput } from '@/engine';

async function makePdf(id: string, pages: number): Promise<PdfWorkerInput> {
  const document = await PDFDocument.create();
  for (let page = 0; page < pages; page++) document.addPage([300, 400]);
  const bytes = await document.save({ addDefaultPage: false });
  return { id, name: `${id}.pdf`, bytes: bytes.slice().buffer as ArrayBuffer };
}

describe('engine entry in Node', () => {
  it('loads without DOM globals', () => {
    // Importing `@/engine` above already ran every module body in Node.
    expect(typeof globalThis.window).toBe('undefined');
    expect(typeof globalThis.document).toBe('undefined');
  });

  it('runs text and structured operations', () => {
    expect(transformText('hello world', 'upper')).toBe('HELLO WORLD');
    expect(TEXT_OPERATIONS.length).toBeGreaterThan(0);
    expect(runTextOperation('word-counter', 'One café, two.').output).toBe('3');
    expect(JSON.parse(csvToJson('name,age\nAda,36').json)).toEqual([
      { name: 'Ada', age: '36' },
    ]);
  });

  it('runs a workbench operation that depends on a third-party package', async () => {
    const operation = QR_BARCODE_OPERATIONS.find(
      (item) => item.id === 'qr-code-generator',
    );
    if (!operation) throw new Error('Missing qr-code-generator operation.');
    const values = Object.fromEntries(
      operation.fields.map((field) => [field.id, field.defaultValue]),
    );
    const svg = await runQrBarcodeOperation(operation.id, values);
    expect(svg).toMatch(/^<svg/u);
    expect(svg).toContain('</svg>');
  });

  it('produces U²-Net tensors and mattes of the model shape', () => {
    const size = U2NETP.inputSize;
    const tensor = rgbaToTensor(new Uint8ClampedArray(size * size * 4));
    expect(tensor).toBeInstanceOf(Float32Array);
    expect(tensor).toHaveLength(3 * size * size);

    const { matte, foregroundRatio } = saliencyToMatte(
      new Float32Array([0, 1, 1, 0]),
      2,
    );
    expect(matte).toHaveLength(16);
    expect(foregroundRatio).toBe(0.5);
  });

  it('merges, inspects and extracts a pdf-lib document', async () => {
    const first = await makePdf('first', 2);
    const second = await makePdf('second', 1);
    expect(hasPdfSignature(first.bytes)).toBe(true);
    expect(await inspectPdfInputs([first, second])).toEqual([
      { id: 'first', pages: 2 },
      { id: 'second', pages: 1 },
    ]);

    const merged = await mergePdfInputs([first, second]);
    expect(merged.pageCount).toBe(3);

    const extracted = await extractPdfPages(
      {
        id: 'merged',
        name: 'merged.pdf',
        bytes: merged.bytes.slice().buffer as ArrayBuffer,
      },
      parsePageSelection('1,3', merged.pageCount),
    );
    expect(extracted.pageCount).toBe(2);
    const reopened = await PDFDocument.load(extracted.bytes);
    expect(reopened.getPageCount()).toBe(2);
  });

  it('rejects non-PDF input with a typed engine error', async () => {
    const notPdf = new TextEncoder().encode('hello').buffer as ArrayBuffer;
    await expect(
      inspectPdfInputs([{ id: 'x', name: 'x.pdf', bytes: notPdf }]),
    ).rejects.toBeInstanceOf(PdfEngineError);
  });
});
