import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readPdfText } from './pdf-text';
import { extractTableFromPdfPages } from './tables';
import {
  detectDateFormatForColumn,
  detectNumberConvention,
  parseAmount,
  parseDate,
  reconcileRunningBalance,
} from './statement-values';
import { writeXlsx } from '../spreadsheet/xlsx-writer';
import { toCsv } from '../spreadsheet/csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

describe('lib/tools/pdf/golden-statement', () => {
  it('extracts signed amount layout and reconciles running balance', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-signed-amount.pdf'),
    );
    const pages = await readPdfText(bytes);
    const table = extractTableFromPdfPages(pages);

    expect(table.refusalReason).toBeUndefined();
    expect(table.headers).toEqual(['Date', 'Description', 'Amount', 'Balance']);
    expect(table.rows).toHaveLength(5);

    expect(table.rows[0]!.cells).toEqual([
      '01/10/2026',
      'OPENING BALANCE',
      '',
      '5,000.00',
    ]);
    expect(table.rows[1]!.cells).toEqual([
      '01/12/2026',
      'PAYROLL DIRECT DEPOSIT',
      '2,450.00',
      '7,450.00',
    ]);
    expect(table.rows[2]!.cells).toEqual([
      '01/15/2026',
      'ELECTRIC UTILITY BILL',
      '-120.50',
      '7,329.50',
    ]);
    expect(table.rows[3]!.cells).toEqual([
      '01/18/2026',
      'WHOLE FOODS MARKET',
      '-85.20',
      '7,244.30',
    ]);
    expect(table.rows[4]!.cells).toEqual([
      '01/25/2026',
      'MONTHLY RENT TRANSFER',
      '-1,500.00',
      '5,744.30',
    ]);

    // Reconcile
    const reconRows = table.rows.map((r, i) => ({
      rowIndex: i + 1,
      amount: parseAmount(r.cells[2]!).value,
      balance: parseAmount(r.cells[3]!).value,
    }));
    const recon = reconcileRunningBalance(reconRows);
    expect(recon.chronologicalDirection).toBe('chronological');
    expect(recon.reconciledCount).toBe(4);
    expect(recon.mismatchCount).toBe(0);

    // Number convention
    const numConv = detectNumberConvention(table.rows.map((r) => r.cells[2]!));
    expect(numConv).toBe('standard-us');

    // Date convention
    const dateConv = detectDateFormatForColumn(
      table.rows.map((r) => r.cells[0]!),
    );
    expect(dateConv.format).toBe('MM/DD/YYYY'); // Row 4 is 01/25/2026, so month is first!
    expect(dateConv.isAmbiguous).toBe(false);
  });

  it('extracts separate debit and credit columns layout', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-debit-credit.pdf'),
    );
    const pages = await readPdfText(bytes);
    const table = extractTableFromPdfPages(pages);

    expect(table.headers).toEqual([
      'Date',
      'Particulars',
      'Withdrawals',
      'Deposits',
      'Balance',
    ]);
    expect(table.rows).toHaveLength(4);

    expect(table.rows[1]!.cells).toEqual([
      '05/01/2026',
      'TFL TRAVEL UNDERGROUND',
      '12.80',
      '',
      '1,187.20',
    ]);
    expect(table.rows[2]!.cells).toEqual([
      '14/01/2026',
      'CONSULTING CLIENT FEE',
      '',
      '850.00',
      '2,037.20',
    ]);

    const reconRows = table.rows.map((r, i) => ({
      rowIndex: i + 1,
      debit: parseAmount(r.cells[2]!).value,
      credit: parseAmount(r.cells[3]!).value,
      amount: null,
      balance: parseAmount(r.cells[4]!).value,
    }));
    const recon = reconcileRunningBalance(reconRows);
    expect(recon.reconciledCount).toBe(3);
    expect(recon.mismatchCount).toBe(0);

    // Date convention: 14/01/2026 has day 14 first -> DD/MM/YYYY
    const dateConv = detectDateFormatForColumn(
      table.rows.map((r) => r.cells[0]!),
    );
    expect(dateConv.format).toBe('DD/MM/YYYY');
    expect(dateConv.isAmbiguous).toBe(false);
  });

  it('extracts DR/CR markers and parses values', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-drcr-marker.pdf'),
    );
    const pages = await readPdfText(bytes);
    const table = extractTableFromPdfPages(pages);

    expect(table.headers).toEqual(['Date', 'Narrative', 'Amount', 'Balance']);
    expect(table.rows).toHaveLength(4);

    const r1 = parseAmount(table.rows[1]!.cells[2]!); // 1,200.00 DR
    expect(r1.value).toBe(-1200);
    expect(r1.isDebit).toBe(true);

    const r2 = parseAmount(table.rows[2]!.cells[2]!); // 45.20 CR
    expect(r2.value).toBe(45.2);
    expect(r2.isCredit).toBe(true);
  });

  it('extracts European format with decimal comma', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-european.pdf'),
    );
    const pages = await readPdfText(bytes);
    const table = extractTableFromPdfPages(pages);

    expect(table.headers).toEqual(['Datum', 'Beschreibung', 'Betrag', 'Saldo']);
    expect(table.rows).toHaveLength(3);

    const conv = detectNumberConvention(table.rows.map((r) => r.cells[2]!));
    expect(conv).toBe('european');

    const a1 = parseAmount(table.rows[1]!.cells[2]!, 'european'); // -120,50
    expect(a1.value).toBe(-120.5);

    const a2 = parseAmount(table.rows[2]!.cells[2]!, 'european'); // 1.250,00
    expect(a2.value).toBe(1250);

    const reconRows = table.rows.map((r, i) => ({
      rowIndex: i + 1,
      amount: parseAmount(r.cells[2]!, 'european').value,
      balance: parseAmount(r.cells[3]!, 'european').value,
    }));
    const recon = reconcileRunningBalance(reconRows);
    expect(recon.reconciledCount).toBe(2);
    expect(recon.mismatchCount).toBe(0);
  });

  it('extracts Indian Lakh grouping format', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-indian-lakh.pdf'),
    );
    const pages = await readPdfText(bytes);
    const table = extractTableFromPdfPages(pages);

    expect(table.headers).toEqual([
      'Date',
      'Narration',
      'Withdrawal',
      'Deposit',
      'Balance',
    ]);
    expect(table.rows).toHaveLength(3);

    const conv = detectNumberConvention(table.rows.map((r) => r.cells[3]!));
    expect(conv).toBe('indian-lakh');

    const deposit = parseAmount(table.rows[2]!.cells[3]!, 'indian-lakh'); // 1,23,456.78
    expect(deposit.value).toBe(123456.78);

    const bal = parseAmount(table.rows[2]!.cells[4]!, 'indian-lakh'); // 2,48,456.78
    expect(bal.value).toBe(248456.78);

    const reconRows = table.rows.map((r, i) => ({
      rowIndex: i + 1,
      debit: parseAmount(r.cells[2]!, 'indian-lakh').value,
      credit: parseAmount(r.cells[3]!, 'indian-lakh').value,
      amount: null,
      balance: parseAmount(r.cells[4]!, 'indian-lakh').value,
    }));
    const recon = reconcileRunningBalance(reconRows);
    expect(recon.reconciledCount).toBe(2);
    expect(recon.mismatchCount).toBe(0);
  });

  it('merges multi-line descriptions and preserves row integrity', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-multiline.pdf'),
    );
    const pages = await readPdfText(bytes);
    const table = extractTableFromPdfPages(pages);

    expect(table.rows).toHaveLength(3);

    // Row 1 merged across 3 lines
    expect(table.rows[0]!.rawLines).toBe(3);
    expect(table.rows[0]!.cells[1]).toBe(
      'CLOUD HOSTING SERVICES LTD INVOICE INV-2026-904 EU VAT ID: EU372019481',
    );
    expect(table.rows[0]!.cells[2]).toBe('-250.00');

    // Row 2 is 1 line
    expect(table.rows[1]!.rawLines).toBe(1);
    expect(table.rows[1]!.cells[1]).toBe('COFFEE BEANS SUPPLIES');

    // Row 3 is 2 lines
    expect(table.rows[2]!.rawLines).toBe(2);
    expect(table.rows[2]!.cells[1]).toBe(
      'PAYMENT RECEIVED FROM ACME PROJECT MILESTONE 3 FINAL',
    );
  });

  it('joins multi-page statement and suppresses repeated headers', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-multipage.pdf'),
    );
    const pages = await readPdfText(bytes);
    expect(pages).toHaveLength(3);

    const table = extractTableFromPdfPages(pages);
    expect(table.rows).toHaveLength(6);
    expect(table.rows[0]!.pageNumber).toBe(1);
    expect(table.rows[2]!.pageNumber).toBe(2);
    expect(table.rows[4]!.pageNumber).toBe(3);

    // Verify all rows are data, not repeated headers
    for (const r of table.rows) {
      expect(r.cells[0]).not.toBe('Date');
      expect(r.cells[1]).not.toBe('Description');
    }
  });

  it('refuses scanned/image-only statement by name', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-scanned.pdf'),
    );
    const pages = await readPdfText(bytes);
    const table = extractTableFromPdfPages(pages);

    expect(table.rows).toHaveLength(0);
    expect(table.refusalReason).toBeDefined();
    expect(table.refusalReason).toContain('no readable text layer');
    expect(table.refusalReason).toContain('scanned document');
  });

  it('exports valid deterministic XLSX and CSV', async () => {
    const bytes = fs.readFileSync(
      path.join(FIXTURES_DIR, 'statement-signed-amount.pdf'),
    );
    const pages = await readPdfText(bytes);
    const table = extractTableFromPdfPages(pages);

    // Build table rows with types
    const excelRows = [
      table.headers,
      ...table.rows.map((r) => [
        parseDate(r.cells[0]!, 'MM/DD/YYYY').date ?? r.cells[0]!,
        r.cells[1]!,
        parseAmount(r.cells[2]!).value,
        parseAmount(r.cells[3]!).value,
      ]),
    ];

    const xlsxResult = await writeXlsx([
      { name: 'Statement', rows: excelRows },
    ]);
    expect(xlsxResult.bytes.length).toBeGreaterThan(1000);

    const csvStr = toCsv([table.headers, ...table.rows.map((r) => r.cells)]);
    const expectedCsv = fs.readFileSync(
      path.join(FIXTURES_DIR, 'golden-statement-chase.csv'),
      'utf8',
    );
    const normalizeEol = (s: string) =>
      s
        .replace(/^\uFEFF/u, '')
        .replace(/\r\n/gu, '\n')
        .trim();
    expect(normalizeEol(csvStr)).toBe(normalizeEol(expectedCsv));
    expect(normalizeEol(csvStr).split('\n')).toHaveLength(6);
  });
});
