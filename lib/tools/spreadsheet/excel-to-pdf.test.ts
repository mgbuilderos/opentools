import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { convertExcelToPdf, sanitizePdfText } from './excel-to-pdf';
import type { Cell, Workbook } from './xlsx-reader';

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const loadFixture = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

describe('Excel to PDF in-browser vector conversion', () => {
  it('converts sales.xlsx (openpyxl fixture) to a valid vector PDF', async () => {
    const bytes = loadFixture('sales.xlsx');
    const result = await convertExcelToPdf(bytes, {
      documentTitle: 'Quarterly Sales Report',
    });

    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.pdfBytes.length).toBeGreaterThan(1000);

    // Verify it starts with PDF magic header
    const header = new TextDecoder().decode(result.pdfBytes.slice(0, 8));
    expect(header).toMatch(/^%PDF-\d\.\d/);

    // Load with pdf-lib to ensure PDF validity
    const doc = await PDFDocument.load(result.pdfBytes);
    expect(doc.getPageCount()).toBe(result.pageCount);
    expect(result.pageCount).toBeGreaterThanOrEqual(3);
    expect(result.sheetCount).toBe(3);
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.columnCount).toBeGreaterThan(0);

    // Verify sheet details
    expect(result.sheetsProcessed.map((s) => s.name)).toEqual([
      'Sales',
      'Empty Sheet',
      'Gaps',
    ]);
  });

  it('supports single sheet selection by name and by index', async () => {
    const bytes = loadFixture('sales.xlsx');

    // By name
    const salesOnly = await convertExcelToPdf(bytes, {
      sheetSelection: 'Sales',
    });
    expect(salesOnly.sheetCount).toBe(1);
    expect(salesOnly.sheetsProcessed[0].name).toBe('Sales');

    // By index
    const sheet0 = await convertExcelToPdf(bytes, {
      sheetSelection: 0,
    });
    expect(sheet0.sheetCount).toBe(1);
    expect(sheet0.sheetsProcessed[0].name).toBe('Sales');

    // Non-existent sheet throws descriptive error
    await expect(
      convertExcelToPdf(bytes, { sheetSelection: 'NonExistentSheet' }),
    ).rejects.toThrow('Sheet named "NonExistentSheet" was not found.');
  });

  it('paginates large tables across multiple pages and repeats headers', async () => {
    // Construct a synthetic 80-row workbook
    const rows: Cell[][] = [
      [
        { kind: 'text', text: 'ID' },
        { kind: 'text', text: 'Product Name' },
        { kind: 'text', text: 'Quantity' },
        { kind: 'text', text: 'Unit Price' },
        { kind: 'text', text: 'Total' },
      ],
    ];

    for (let i = 1; i <= 80; i += 1) {
      rows.push([
        { kind: 'number', value: i },
        { kind: 'text', text: `Item Description #${i} Alpha Beta` },
        { kind: 'number', value: i * 5 },
        { kind: 'number', value: 19.99 },
        { kind: 'number', value: i * 5 * 19.99 },
      ]);
    }

    const testWorkbook: Workbook = {
      sheets: [
        {
          name: 'LargeInventory',
          rows,
          columnCount: 5,
        },
      ],
      date1904: false,
      notes: [],
    };

    const result = await convertExcelToPdf(testWorkbook, {
      repeatHeader: true,
      pageSize: 'a4',
      orientation: 'portrait',
    });

    expect(result.sheetCount).toBe(1);
    // 80 rows should span across at least 2 pages
    expect(result.pageCount).toBeGreaterThanOrEqual(2);

    const doc = await PDFDocument.load(result.pdfBytes);
    expect(doc.getPageCount()).toBe(result.pageCount);
  });

  it('respects explicit landscape and portrait orientations', async () => {
    const simpleWorkbook: Workbook = {
      sheets: [
        {
          name: 'Sheet1',
          rows: [
            [
              { kind: 'text', text: 'Col A' },
              { kind: 'text', text: 'Col B' },
            ],
            [
              { kind: 'number', value: 100 },
              { kind: 'number', value: 200 },
            ],
          ],
          columnCount: 2,
        },
      ],
      date1904: false,
      notes: [],
    };

    // Portrait test
    const portraitResult = await convertExcelToPdf(simpleWorkbook, {
      orientation: 'portrait',
      pageSize: 'a4',
    });
    const portraitDoc = await PDFDocument.load(portraitResult.pdfBytes);
    const p1 = portraitDoc.getPage(0);
    expect(p1.getWidth()).toBeLessThan(p1.getHeight());

    // Landscape test
    const landscapeResult = await convertExcelToPdf(simpleWorkbook, {
      orientation: 'landscape',
      pageSize: 'a4',
    });
    const landscapeDoc = await PDFDocument.load(landscapeResult.pdfBytes);
    const p2 = landscapeDoc.getPage(0);
    expect(p2.getWidth()).toBeGreaterThan(p2.getHeight());
  });

  it('safely handles Unicode and non-WinAnsi text without crashing', async () => {
    const unicodeWorkbook: Workbook = {
      sheets: [
        {
          name: 'UnicodeSheet',
          rows: [
            [
              { kind: 'text', text: 'Language' },
              { kind: 'text', text: 'Sample' },
              { kind: 'text', text: 'Status' },
            ],
            [
              { kind: 'text', text: 'Hindi' },
              { kind: 'text', text: 'नमस्ते दुनिया' },
              { kind: 'text', text: 'Approved ✓' },
            ],
            [
              { kind: 'text', text: 'Emoji' },
              { kind: 'text', text: '🚀 Fire & Ice ❄️' },
              { kind: 'text', text: 'Rejected ✗' },
            ],
          ],
          columnCount: 3,
        },
      ],
      date1904: false,
      notes: [],
    };

    // Should complete cleanly without throwing WinAnsi encode error
    const result = await convertExcelToPdf(unicodeWorkbook);
    expect(result.pageCount).toBe(1);

    const doc = await PDFDocument.load(result.pdfBytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('sanitizes text properly with fallback replacements', () => {
    const supported = new Set<number>([
      32,
      65,
      66,
      67,
      97,
      98,
      99,
      49,
      50,
      51,
      91,
      93,
      120, // A B C a b c 1 2 3 [ ] x
    ]);
    const clean = sanitizePdfText('A ✓ B', supported);
    expect(clean).toBe('A [x] B');
  });

  it('throws descriptive error on invalid inputs', async () => {
    const invalidBytes = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(convertExcelToPdf(invalidBytes)).rejects.toThrow();

    const emptyWorkbook: Workbook = {
      sheets: [],
      date1904: false,
      notes: [],
    };
    await expect(convertExcelToPdf(emptyWorkbook)).rejects.toThrow(
      'The spreadsheet contains no readable sheets.',
    );
  });
});
