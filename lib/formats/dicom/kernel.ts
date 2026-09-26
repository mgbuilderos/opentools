import type { KernelOperation } from '@/lib/kernel/types';

import {
  BASIC_APPLICATION_LEVEL_CONFIDENTIALITY_PROFILE,
  PIXEL_BURN_IN_WARNING,
  anonymise,
  extractPixels,
  identifyingTags,
  readTags,
} from './dicom';

type Context = Parameters<KernelOperation['run']>[0];

function inputFile(context: Context) {
  if (context.signal.aborted) {
    throw new DOMException('Operation cancelled.', 'AbortError');
  }
  const file = context.files[0];
  if (!file) throw new Error('Choose a DICOM file first.');
  return file;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]*$/u, '') || 'image';
}

export const dicomOperations = [
  {
    id: 'dicom-read-tags',
    source: 'formats-dicom',
    name: 'Read DICOM tags',
    description:
      'Read DICOM metadata and identify fields that require privacy review.',
    input: 'file',
    params: [],
    output: { kind: 'text', extension: 'json' },
    runtime: 'pure',
    deterministic: true,
    notice: PIXEL_BURN_IN_WARNING,
    async run(context) {
      const file = inputFile(context);
      const result = await readTags(file.bytes);
      return {
        kind: 'text',
        text: JSON.stringify(
          {
            ...result,
            identifying: identifyingTags(result.tags),
            pixelBurnInWarning: PIXEL_BURN_IN_WARNING,
          },
          null,
          2,
        ),
      };
    },
  },
  {
    id: 'dicom-anonymise-basic',
    source: 'formats-dicom',
    name: 'Anonymise DICOM tags',
    description:
      'Apply the Basic Application Level Confidentiality Profile to DICOM tags.',
    input: 'file',
    params: [],
    output: { kind: 'files', extension: 'dcm' },
    runtime: 'pure',
    deterministic: true,
    notice: PIXEL_BURN_IN_WARNING,
    async run(context) {
      const file = inputFile(context);
      const result = await anonymise(
        file.bytes,
        BASIC_APPLICATION_LEVEL_CONFIDENTIALITY_PROFILE,
      );
      return {
        kind: 'files',
        files: [
          {
            name: `${baseName(file.name)}-anonymised.dcm`,
            type: 'application/dicom',
            bytes: result.bytes,
          },
        ],
        summary: `Removed ${result.removed.length} identifying tag${result.removed.length === 1 ? '' : 's'}; ${result.unparsed.length} unparsed tag${result.unparsed.length === 1 ? '' : 's'} require review. ${PIXEL_BURN_IN_WARNING}`,
      };
    },
  },
  {
    id: 'dicom-extract-pixels',
    source: 'formats-dicom',
    name: 'Extract DICOM pixels',
    description:
      'Extract uncompressed or RLE Lossless DICOM pixel bytes without interpretation.',
    input: 'file',
    params: [],
    output: { kind: 'files', extension: 'raw' },
    runtime: 'pure',
    deterministic: true,
    notice:
      'Raw pixel extraction performs no diagnostic interpretation, windowing, or measurement.',
    async run(context) {
      const file = inputFile(context);
      const result = await extractPixels(file.bytes);
      const metadata = new TextEncoder().encode(
        JSON.stringify(
          {
            width: result.width,
            height: result.height,
            bitDepth: result.bitDepth,
            byteLength: result.data.length,
          },
          null,
          2,
        ),
      );
      const base = baseName(file.name);
      return {
        kind: 'files',
        files: [
          {
            name: `${base}-pixels.raw`,
            type: 'application/octet-stream',
            bytes: result.data,
          },
          {
            name: `${base}-pixels.json`,
            type: 'application/json',
            bytes: metadata,
          },
        ],
        summary: `Extracted ${result.width} × ${result.height} pixels at ${result.bitDepth} bits without diagnostic interpretation.`,
      };
    },
  },
] as const satisfies readonly KernelOperation[];
