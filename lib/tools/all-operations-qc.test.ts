import { describe, expect, it } from 'vitest';

import {
  IMAGE_EDITOR_OPERATIONS,
  PDF_PAGE_OPERATIONS,
  publicTools,
} from './catalog';
import {
  ADVANCED_DEVELOPER_OPERATIONS,
  runAdvancedDeveloperOperation,
} from './developer-advanced-workbench';
import {
  DEVELOPER_DATA_OPERATIONS,
  runDeveloperDataOperation,
} from './developer-data-workbench';
import { CREATOR_OPERATIONS, runCreatorOperation } from './creator-workbench';
import { DATE_OPERATIONS, runDateOperation } from './date-workbench';
import {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from './document-workbench';
import {
  FILE_WORKBENCH_OPERATIONS,
  runFileWorkbenchOperation,
  type LocalFileInput,
} from './file-workbench';
import {
  FINANCE_OPERATIONS,
  runFinanceOperation,
} from './finance-business-workbench';
import {
  LIFE_ADMIN_OPERATIONS,
  runLifeAdminOperation,
} from './life-admin-workbench';
import { MATH_OPERATIONS, runMathOperation } from './math-workbench';
import {
  PRODUCTIVITY_OPERATIONS,
  runProductivityOperation,
} from './productivity-workbench';
import {
  QR_BARCODE_OPERATIONS,
  runQrBarcodeOperation,
} from './qr-barcode-workbench';
import {
  SCIENCE_OPERATIONS,
  runScienceOperation,
} from './science-education-workbench';
import {
  SPREADSHEET_OPERATIONS,
  runSpreadsheetOperation,
} from './spreadsheet-workbench';
import {
  TEXT_OPERATIONS,
  runTextOperation,
  type TextOperationOptions,
} from './text-workbench';
import { WEB_OPERATIONS, runWebOperation } from './web-workbench';
import { WRITING_OPERATIONS, runWritingOperation } from './writing-workbench';

interface QcField {
  id: string;
  label: string;
  type: string;
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

interface QcOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly QcField[];
  multiple?: boolean;
  directory?: boolean;
}

interface QcSuite {
  name: string;
  route: string;
  operations: readonly QcOperation[];
  run: (id: string, values: Record<string, string>) => unknown;
}

const textEncoder = new TextEncoder();
const firstBytes = textEncoder.encode('hello world');
const secondBytes = textEncoder.encode('hello world');
const fileFixtures: readonly LocalFileInput[] = [
  {
    name: 'alpha.txt',
    path: 'fixtures/alpha.txt',
    type: 'text/plain',
    size: firstBytes.length,
    lastModified: Date.UTC(2026, 8, 6),
    bytes: firstBytes,
  },
  {
    name: 'beta.txt',
    path: 'fixtures/beta.txt',
    type: 'text/plain',
    size: secondBytes.length,
    lastModified: Date.UTC(2026, 8, 6),
    bytes: secondBytes,
  },
];

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function defaultValues(operation: QcOperation) {
  return Object.fromEntries(
    operation.fields.map((field) => [
      field.id,
      field.type === 'file' ? onePixelPng : field.defaultValue,
    ]),
  );
}

function expectSafeText(output: string, context: string) {
  expect(output.trim(), `${context} returned an empty output`).not.toBe('');
  expect(output, `${context} returned a NUL byte`).not.toContain('\0');
  expect(output, `${context} leaked a generic object coercion`).not.toContain(
    '[object Object]',
  );
  expect(
    output,
    `${context} returned a non-finite or undefined value`,
  ).not.toMatch(/(?:^|[^A-Za-z])(?:NaN|Infinity|undefined)(?:$|[^A-Za-z])/u);
}

const suites: readonly QcSuite[] = [
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
        const enc = await runFileWorkbenchOperation(
          'file-encrypt',
          values,
          fileFixtures.slice(0, 1),
        );
        return runFileWorkbenchOperation(id, values, [
          {
            name: 'alpha.txt.enc',
            path: 'fixtures/alpha.txt.enc',
            type: 'application/octet-stream',
            size: enc.downloads[0].bytes.length,
            lastModified: Date.UTC(2026, 8, 6),
            bytes: enc.downloads[0].bytes,
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

describe('exhaustive workbench input/output QC', () => {
  it('keeps every field contract complete and internally valid', () => {
    const allOperations = suites.flatMap((suite) => suite.operations);

    expect(allOperations).toHaveLength(595);
    for (const suite of suites) {
      expect(new Set(suite.operations.map(({ id }) => id)).size).toBe(
        suite.operations.length,
      );
      for (const operation of suite.operations) {
        const context = `${suite.name}/${operation.id}`;
        expect(operation.id, context).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
        expect(operation.name.trim(), context).not.toBe('');
        expect(operation.description.trim(), context).not.toBe('');
        expect(new Set(operation.fields.map(({ id }) => id)).size).toBe(
          operation.fields.length,
        );
        for (const field of operation.fields) {
          expect(field.id.trim(), context).not.toBe('');
          expect(field.label.trim(), context).not.toBe('');
          expect(typeof field.defaultValue, context).toBe('string');
          if (field.type === 'select') {
            expect(field.options?.length, context).toBeGreaterThan(0);
            expect(
              field.options?.some(({ value }) => value === field.defaultValue),
              context,
            ).toBe(true);
          }
        }
      }
    }
  });

  for (const suite of suites) {
    it(`runs every ${suite.name} default input through its output contract`, async () => {
      for (const operation of suite.operations) {
        const context = `${suite.name}/${operation.id}`;
        const result = await suite.run(operation.id, defaultValues(operation));

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
            downloads: Array<{
              name: string;
              type: string;
              bytes: Uint8Array;
            }>;
          };
          expectSafeText(fileResult.summary, `${context} summary`);
          expectSafeText(fileResult.output, `${context} output`);
          for (const download of fileResult.downloads) {
            expect(download.name, context).not.toMatch(/[/\\]/u);
            expect(download.name, context).not.toContain(
              String.fromCharCode(0),
            );
            expect(download.type.trim(), context).not.toBe('');
            expect(download.bytes, context).toBeInstanceOf(Uint8Array);
          }
          continue;
        }

        expect(typeof result, context).toBe('string');
        expectSafeText(String(result), context);
        if (suite.name === 'QR and barcode') {
          const svg = String(result).trim();
          expect(svg, context).toMatch(/^<svg\b/u);
          expect(svg, context).toMatch(/<\/svg>$/u);
          expect(svg, context).not.toMatch(/<script\b|javascript:/iu);
        }
      }
    });
  }

  it('runs every text operation with a representative input and complete options', () => {
    const options: TextOperationOptions = {
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

    expect(TEXT_OPERATIONS).toHaveLength(33);
    for (const operation of TEXT_OPERATIONS) {
      const result = runTextOperation(
        operation.id,
        'Hello,world 👋\nlisten\nSecond line.',
        options,
        () => 0.25,
      );
      expectSafeText(result.summary, `text/${operation.id} summary`);
      expectSafeText(result.output, `text/${operation.id} output`);
    }
  });

  it('accounts for all 605 operation-level tool destinations', () => {
    const expectedDestinations = [
      ...suites.flatMap((suite) =>
        suite.operations.map(
          (operation) => `${suite.route}?tool=${operation.id}`,
        ),
      ),
      ...TEXT_OPERATIONS.map(
        (operation) => `/text/workbench?tool=${operation.id}`,
      ),
      ...PDF_PAGE_OPERATIONS.map(
        (operation) => `/pdf/page-tools?tool=${operation.id}`,
      ),
      ...IMAGE_EDITOR_OPERATIONS.map((operation) =>
        operation.id === 'solid-background-remover'
          ? '/image/background-remover?tool=solid-background-remover'
          : `/image/editor?tool=${operation.id}`,
      ),
    ].toSorted();
    const catalogDestinations = publicTools
      .flatMap((tool) => tool.searchEntries?.map((entry) => entry.href) ?? [])
      .toSorted();

    expect(expectedDestinations).toHaveLength(645);
    expect(catalogDestinations).toEqual(expectedDestinations);
  });
});
