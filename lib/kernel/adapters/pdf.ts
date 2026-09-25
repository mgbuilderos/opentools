/**
 * PDF engine → kernel adapter.
 *
 * `lib/tools/pdf/engine` is pdf-lib and runs in Node as readily as in a
 * worker, but it was never registered as a kernel source, so the kernel had no
 * merge, split, rotate or compress and `search("merge pdf")` came back empty.
 * That was the largest hole between what the site does and what the kernel
 * exposes.
 *
 * Only the operations that are whole in a bare Node process are adapted.
 * `compressPdf` is here without a `JpegReencoder`: image re-encoding needs
 * `OffscreenCanvas`, so it takes the lossless path and the notice says so
 * rather than the result implying a reduction it did not make.
 */
import {
  compressPdf,
  extractPdfPages,
  inspectPdfForm,
  inspectPdfInputs,
  mergePdfInputs,
  transformPdfPages,
} from '@/lib/tools/pdf/engine';
import { parsePageSelection } from '@/lib/tools/pdf/page-selection';
import type { PdfWorkerInput } from '@/lib/tools/pdf/protocol';
import type { KernelOperation, OperationContext } from '@/lib/kernel/types';

function toWorkerInputs(context: OperationContext): PdfWorkerInput[] {
  if (context.signal.aborted) {
    throw new DOMException('Operation cancelled.', 'AbortError');
  }
  if (context.files.length === 0) throw new Error('Choose a PDF file first.');
  return context.files.map((file, index) => ({
    id: `${index}`,
    name: file.name,
    // pdf-lib wants an ArrayBuffer; slice to the view's own bounds so a
    // subarray never exposes bytes beyond the file.
    bytes: file.bytes.buffer.slice(
      file.bytes.byteOffset,
      file.bytes.byteOffset + file.bytes.byteLength,
    ) as ArrayBuffer,
  }));
}

function single(context: OperationContext): PdfWorkerInput {
  const inputs = toWorkerInputs(context);
  if (inputs.length > 1) {
    throw new Error('This operation takes one PDF at a time.');
  }
  return inputs[0]!;
}

function pdfFile(name: string, bytes: Uint8Array) {
  return { name, type: 'application/pdf', bytes };
}

function integerParam(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const pdfOperations = [
  {
    id: 'pdf-merge',
    source: 'pdf',
    name: 'Merge PDFs',
    description:
      'Join two or more PDFs into one, in the order the files are given.',
    input: 'files',
    params: [],
    output: { kind: 'files', extension: 'pdf' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const inputs = toWorkerInputs(context);
      const result = await mergePdfInputs(inputs);
      return {
        kind: 'files',
        files: [pdfFile('merged.pdf', new Uint8Array(result.bytes))],
        summary: `Merged ${inputs.length} PDFs into ${result.pageCount} pages.`,
      };
    },
  },
  {
    id: 'pdf-inspect',
    source: 'pdf',
    name: 'Inspect PDFs',
    description: 'Report the page count of each PDF without changing it.',
    input: 'files',
    params: [],
    output: { kind: 'text', extension: 'json' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const inputs = toWorkerInputs(context);
      const inspected = await inspectPdfInputs(inputs);
      return {
        kind: 'text',
        text: JSON.stringify(
          inspected.map((entry) => ({
            name: inputs[Number(entry.id)]?.name ?? entry.id,
            pages: entry.pages,
          })),
          null,
          2,
        ),
      };
    },
  },
  {
    id: 'pdf-extract-pages',
    source: 'pdf',
    name: 'Extract PDF pages',
    description:
      'Take a page selection such as 1-3,7 out of one PDF into a new PDF.',
    input: 'file',
    params: [
      {
        id: 'pages',
        label: 'Pages',
        type: 'text',
        defaultValue: '1',
        serialisable: true,
      },
    ],
    output: { kind: 'files', extension: 'pdf' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const input = single(context);
      // The selection is validated against the real page count, so 1-999 on a
      // 3-page file is refused rather than silently truncated.
      const inspected = await inspectPdfInputs([input]);
      const pages = parsePageSelection(
        context.params.pages ?? '1',
        inspected[0]?.pages ?? 0,
      );
      const result = await extractPdfPages(input, [...pages]);
      return {
        kind: 'files',
        files: [pdfFile('extracted.pdf', new Uint8Array(result.bytes))],
        summary: `Extracted ${result.pageCount} pages.`,
      };
    },
  },
  {
    id: 'pdf-rotate-pages',
    source: 'pdf',
    name: 'Rotate PDF pages',
    description: 'Rotate every page of a PDF by 90, 180 or 270 degrees.',
    input: 'file',
    params: [
      {
        id: 'rotation',
        label: 'Rotation',
        type: 'select',
        defaultValue: '90',
        options: [
          { value: '90', label: '90°' },
          { value: '180', label: '180°' },
          { value: '270', label: '270°' },
        ],
        serialisable: true,
      },
    ],
    output: { kind: 'files', extension: 'pdf' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const input = single(context);
      const inspected = await inspectPdfInputs([input]);
      const pageCount = inspected[0]?.pages ?? 0;
      const rotation = integerParam(context.params.rotation, 90);
      if (rotation !== 90 && rotation !== 180 && rotation !== 270) {
        throw new Error('Rotation must be 90, 180 or 270.');
      }
      const result = await transformPdfPages(input, {
        pageOrder: Array.from({ length: pageCount }, (_, index) => index + 1),
        rotation,
        pageNumbers: false,
        watermark: '',
        metadata: { title: '', author: '', subject: '', keywords: '' },
      });
      return {
        kind: 'files',
        files: [pdfFile('rotated.pdf', new Uint8Array(result.bytes))],
        summary: `Rotated ${result.pageCount} pages by ${rotation}°.`,
      };
    },
  },
  {
    id: 'pdf-compress',
    source: 'pdf',
    name: 'Compress PDF (lossless)',
    description:
      'Rewrite a PDF with object streams and optionally drop its metadata.',
    input: 'file',
    params: [
      {
        id: 'removeMetadata',
        label: 'Remove metadata',
        type: 'boolean',
        defaultValue: 'false',
        serialisable: true,
      },
    ],
    output: { kind: 'files', extension: 'pdf' },
    runtime: 'pure',
    deterministic: true,
    // Stated because the result would otherwise imply a reduction it cannot
    // make: image re-encoding needs OffscreenCanvas, which Node has not got.
    notice:
      'Lossless rewrite only. Embedded images are not re-encoded outside a browser.',
    async run(context) {
      const input = single(context);
      const result = await compressPdf(input, {
        recompressImages: false,
        imageQuality: 80,
        maxImageDimension: 4096,
        removeMetadata: context.params.removeMetadata === 'true',
      });
      const before = input.bytes.byteLength;
      const after = result.bytes.byteLength;
      const delta = before === 0 ? 0 : Math.round((1 - after / before) * 100);
      return {
        kind: 'files',
        files: [pdfFile('compressed.pdf', new Uint8Array(result.bytes))],
        summary: `${before} → ${after} bytes (${delta}% smaller), lossless rewrite.`,
      };
    },
  },
  {
    id: 'pdf-inspect-form',
    source: 'pdf',
    name: 'Inspect PDF form fields',
    description: 'List the fillable fields of a PDF form with their types.',
    input: 'file',
    params: [],
    output: { kind: 'text', extension: 'json' },
    runtime: 'pure',
    deterministic: true,
    async run(context) {
      const input = single(context);
      return {
        kind: 'text',
        text: JSON.stringify(await inspectPdfForm(input), null, 2),
      };
    },
  },
] as const satisfies readonly KernelOperation[];
