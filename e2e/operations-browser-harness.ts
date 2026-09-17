/**
 * Runs every workbench operation inside a real browser.
 *
 * `lib/tools/all-operations-qc.test.ts` runs the same operations under Node.
 * That proves the logic, not that the browser can execute it: an operation can
 * pass in Node and still fail in Chromium or WebKit over a missing API, a
 * regex the engine rejects, or an Intl difference. This module is bundled for
 * the browser and driven from `e2e/browser-operations.spec.ts`.
 *
 * It mirrors the Node contract but reports failures instead of throwing, so one
 * broken operation does not hide the rest.
 */
import {
  ADVANCED_DEVELOPER_OPERATIONS,
  runAdvancedDeveloperOperation,
} from '../lib/tools/developer-advanced-workbench';
import {
  DEVELOPER_DATA_OPERATIONS,
  runDeveloperDataOperation,
} from '../lib/tools/developer-data-workbench';
import {
  CREATOR_OPERATIONS,
  runCreatorOperation,
} from '../lib/tools/creator-workbench';
import { DATE_OPERATIONS, runDateOperation } from '../lib/tools/date-workbench';
import {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from '../lib/tools/document-workbench';
import {
  FILE_WORKBENCH_OPERATIONS,
  runFileWorkbenchOperation,
  type LocalFileInput,
} from '../lib/tools/file-workbench';
import {
  FINANCE_OPERATIONS,
  runFinanceOperation,
} from '../lib/tools/finance-business-workbench';
import {
  LIFE_ADMIN_OPERATIONS,
  runLifeAdminOperation,
} from '../lib/tools/life-admin-workbench';
import { MATH_OPERATIONS, runMathOperation } from '../lib/tools/math-workbench';
import {
  PRODUCTIVITY_OPERATIONS,
  runProductivityOperation,
} from '../lib/tools/productivity-workbench';
import {
  QR_BARCODE_OPERATIONS,
  runQrBarcodeOperation,
} from '../lib/tools/qr-barcode-workbench';
import {
  SCIENCE_OPERATIONS,
  runScienceOperation,
} from '../lib/tools/science-education-workbench';
import {
  SPREADSHEET_OPERATIONS,
  runSpreadsheetOperation,
} from '../lib/tools/spreadsheet-workbench';
import {
  TEXT_OPERATIONS,
  runTextOperation,
  type TextOperationOptions,
} from '../lib/tools/text-workbench';
import { WEB_OPERATIONS, runWebOperation } from '../lib/tools/web-workbench';
import {
  WRITING_OPERATIONS,
  runWritingOperation,
} from '../lib/tools/writing-workbench';

export interface OperationFailure {
  suite: string;
  route: string;
  id: string;
  reason: string;
}

export interface HarnessReport {
  total: number;
  passed: number;
  failures: OperationFailure[];
}

interface HarnessField {
  id: string;
  label: string;
  type: string;
  defaultValue: string;
  accept?: string;
}

interface HarnessOperation {
  id: string;
  fields: readonly HarnessField[];
  multiple?: boolean;
  directory?: boolean;
}

interface HarnessSuite {
  name: string;
  route: string;
  operations: readonly HarnessOperation[];
  run: (id: string, values: Record<string, string>) => unknown;
}

const textEncoder = new TextEncoder();
const fileFixtures: readonly LocalFileInput[] = ['alpha', 'beta'].map(
  (stem) => {
    const bytes = textEncoder.encode('hello world');
    return {
      name: `${stem}.txt`,
      path: `fixtures/${stem}.txt`,
      type: 'text/plain',
      size: bytes.length,
      lastModified: Date.UTC(2026, 8, 6),
      bytes,
    };
  },
);

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/** Same one-second 8 kHz mono WAV the Node QC builds, without `Buffer`. */
function tinyPcmWav() {
  const sampleRate = 8000;
  const dataSize = sampleRate * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, dataSize, true);

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function isAudioFileField(field: HarnessField) {
  return /wav|audio/iu.test(`${field.label} ${field.accept ?? ''}`);
}

function defaultValues(operation: HarnessOperation) {
  return Object.fromEntries(
    operation.fields.map((field) => [
      field.id,
      field.type === 'file'
        ? isAudioFileField(field)
          ? tinyPcmWav()
          : onePixelPng
        : field.defaultValue,
    ]),
  );
}

/** Returns the reason the text is unsafe, or null when it is fine. */
function unsafeTextReason(output: string, context: string): string | null {
  if (output.trim() === '') return `${context} is empty`;
  if (output.includes('\0')) return `${context} contains a NUL byte`;
  if (output.includes('[object Object]')) {
    return `${context} leaked an object coercion`;
  }
  if (
    /(?:^|[^A-Za-z])(?:NaN|Infinity|undefined)(?:$|[^A-Za-z])/u.test(output)
  ) {
    return `${context} contains NaN, Infinity or undefined`;
  }
  return null;
}

const suites: readonly HarnessSuite[] = [
  {
    name: 'developer data',
    route: '/developer/workbench',
    operations: DEVELOPER_DATA_OPERATIONS,
    run: runDeveloperDataOperation,
  },
  {
    name: 'advanced developer',
    route: '/developer/advanced',
    operations: ADVANCED_DEVELOPER_OPERATIONS,
    run: runAdvancedDeveloperOperation,
  },
  {
    name: 'creator',
    route: '/creator/workbench',
    operations: CREATOR_OPERATIONS,
    run: runCreatorOperation,
  },
  {
    name: 'date',
    route: '/date/workbench',
    operations: DATE_OPERATIONS,
    run: runDateOperation,
  },
  {
    name: 'document',
    route: '/documents/workbench',
    operations: DOCUMENT_OPERATIONS,
    run: runDocumentOperation,
  },
  {
    name: 'file',
    route: '/file/workbench',
    operations: FILE_WORKBENCH_OPERATIONS,
    run: async (id, values) => {
      const operation = FILE_WORKBENCH_OPERATIONS.find(
        (candidate) => candidate.id === id,
      );
      if (id === 'file-decrypt') {
        const encrypted = await runFileWorkbenchOperation(
          'file-encrypt',
          values,
          fileFixtures.slice(0, 1),
        );
        return runFileWorkbenchOperation(id, values, [
          {
            name: 'alpha.txt.enc',
            path: 'fixtures/alpha.txt.enc',
            type: 'application/octet-stream',
            size: encrypted.downloads[0]!.bytes.length,
            lastModified: Date.UTC(2026, 8, 6),
            bytes: encrypted.downloads[0]!.bytes,
          },
        ]);
      }
      const files =
        operation?.multiple || operation?.directory
          ? fileFixtures
          : fileFixtures.slice(0, 1);
      return runFileWorkbenchOperation(id, values, files);
    },
  },
  {
    name: 'finance',
    route: '/finance/workbench',
    operations: FINANCE_OPERATIONS,
    run: runFinanceOperation,
  },
  {
    name: 'life admin',
    route: '/life-admin/workbench',
    operations: LIFE_ADMIN_OPERATIONS,
    run: runLifeAdminOperation,
  },
  {
    name: 'math',
    route: '/math/workbench',
    operations: MATH_OPERATIONS,
    run: runMathOperation,
  },
  {
    name: 'productivity',
    route: '/productivity/workbench',
    operations: PRODUCTIVITY_OPERATIONS,
    run: runProductivityOperation,
  },
  {
    name: 'QR and barcode',
    route: '/qr/workbench',
    operations: QR_BARCODE_OPERATIONS,
    run: runQrBarcodeOperation,
  },
  {
    name: 'science',
    route: '/science/workbench',
    operations: SCIENCE_OPERATIONS,
    run: runScienceOperation,
  },
  {
    name: 'spreadsheet',
    route: '/data/workbench',
    operations: SPREADSHEET_OPERATIONS,
    run: runSpreadsheetOperation,
  },
  {
    name: 'web',
    route: '/web/workbench',
    operations: WEB_OPERATIONS,
    run: runWebOperation,
  },
  {
    name: 'writing',
    route: '/text/writing',
    operations: WRITING_OPERATIONS,
    run: runWritingOperation,
  },
];

function checkResult(
  suite: HarnessSuite,
  operationId: string,
  result: unknown,
): string | null {
  const context = `${suite.name}/${operationId}`;

  if (
    typeof result === 'object' &&
    result !== null &&
    'summary' in result &&
    'output' in result &&
    'downloads' in result
  ) {
    const fileResult = result as {
      summary: string;
      output: string;
      downloads: Array<{ name: string; type: string; bytes: Uint8Array }>;
    };
    const summary = unsafeTextReason(fileResult.summary, `${context} summary`);
    if (summary) return summary;
    const output = unsafeTextReason(fileResult.output, `${context} output`);
    if (output) return output;
    for (const download of fileResult.downloads) {
      if (/[/\\]/u.test(download.name) || download.name.includes('\0')) {
        return `${context} produced an unsafe download name`;
      }
      if (download.type.trim() === '') {
        return `${context} produced a download with no media type`;
      }
      if (!(download.bytes instanceof Uint8Array)) {
        return `${context} produced a download whose bytes are not a Uint8Array`;
      }
    }
    return null;
  }

  if (typeof result !== 'string') {
    return `${context} returned ${typeof result}, not a string`;
  }
  const unsafe = unsafeTextReason(result, context);
  if (unsafe) return unsafe;

  if (suite.name === 'QR and barcode') {
    const svg = result.trim();
    if (!/^<svg\b/u.test(svg) || !svg.endsWith('</svg>')) {
      return `${context} did not return an SVG document`;
    }
    if (/<script\b|javascript:/iu.test(svg)) {
      return `${context} returned an SVG containing script`;
    }
  }
  return null;
}

export async function runAllOperations(): Promise<HarnessReport> {
  const failures: OperationFailure[] = [];
  let total = 0;

  for (const suite of suites) {
    for (const operation of suite.operations) {
      total += 1;
      try {
        const result = await suite.run(operation.id, defaultValues(operation));
        const reason = checkResult(suite, operation.id, result);
        if (reason) {
          failures.push({
            suite: suite.name,
            route: suite.route,
            id: operation.id,
            reason,
          });
        }
      } catch (error) {
        failures.push({
          suite: suite.name,
          route: suite.route,
          id: operation.id,
          reason: `threw ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
        });
      }
    }
  }

  // The text workbench takes its input as an argument rather than fields.
  const textOptions: TextOperationOptions = {
    find: 'Hello',
    replacement: 'Hi',
    caseSensitive: true,
    repeatCount: 3,
    separator: ',',
    normalization: 'NFC',
    sortDirection: 'ascending',
    count: 3,
    candidates: 'enlist\nsilent\ntinsel',
  };
  for (const operation of TEXT_OPERATIONS) {
    total += 1;
    try {
      const result = runTextOperation(
        operation.id,
        'Hello,world 👋\nlisten\nSecond line.',
        textOptions,
        () => 0.25,
      );
      const reason =
        unsafeTextReason(result.summary, `text/${operation.id} summary`) ??
        unsafeTextReason(result.output, `text/${operation.id} output`);
      if (reason) {
        failures.push({
          suite: 'text',
          route: '/text/workbench',
          id: operation.id,
          reason,
        });
      }
    } catch (error) {
      failures.push({
        suite: 'text',
        route: '/text/workbench',
        id: operation.id,
        reason: `threw ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
      });
    }
  }

  return { total, passed: total - failures.length, failures };
}

declare global {
  var __runAllOperations: typeof runAllOperations | undefined;
}

globalThis.__runAllOperations = runAllOperations;
