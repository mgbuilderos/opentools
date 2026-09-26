import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  FinanceFormatError,
  parseFinance,
  reconcile,
} from '@/lib/formats/finance';
import { toCsv } from '@/lib/tools/spreadsheet/csv';
import { writeXlsx } from '@/lib/tools/spreadsheet/xlsx-writer';

const fixturesDir = resolve(process.cwd(), 'lib/formats/finance/__fixtures__');

async function loadFixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve(fixturesDir, name)));
}

describe('OFX & QIF tool logic', () => {
  it('parses OFX 1.x SGML banking statement fixture correctly', async () => {
    const bytes = await loadFixture('ofx1.ofx');
    const result = await parseFinance(bytes);

    expect(result.format).toBe('ofx');
    expect(result.version).toBe('102');
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.id).toBe('SYNTHETIC-CHECKING');
    expect(result.accounts[0]?.closingBalance).toBe(1374.44);

    expect(result.transactions.length).toBeGreaterThan(0);
    const firstTx = result.transactions[0];
    expect(firstTx?.amount).toBe(-125.5);
    expect(firstTx?.payee).toBe('Utility payment');
  });

  it('parses OFX 2.x XML card statement fixture correctly', async () => {
    const bytes = await loadFixture('ofx2.ofx');
    const result = await parseFinance(bytes);

    expect(result.format).toBe('ofx');
    expect(result.version).toBe('220');
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.id).toBe('SYNTHETIC-CARD');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.payee).toBe('Rail ticket');
    expect(result.transactions[0]?.amount).toBe(-49.95);
  });

  it('parses QIF financial statement fixture correctly', async () => {
    const bytes = await loadFixture('sample.qif');
    const result = await parseFinance(bytes);

    expect(result.format).toBe('qif');
    expect(result.transactions.length).toBeGreaterThan(0);
    const utilityTx = result.transactions.find(
      (tx) => tx.payee === 'Utility payment',
    );
    expect(utilityTx).toBeDefined();
    expect(utilityTx?.amount).toBe(-1200);
  });

  it('reconciles balanced statement correctly', () => {
    const result = reconcile({
      opening: 1000.0,
      transactions: [-200.0, 500.0, -100.0],
      closing: 1200.0,
    });

    expect(result.balanced).toBe(true);
    if ('delta' in result && result.delta !== null) {
      expect(result.delta).toBe(0);
    }
  });

  it('detects and quantifies reconciliation discrepancy when unbalanced', () => {
    const result = reconcile({
      opening: 1000.0,
      transactions: [-200.0, 500.0, -100.0],
      closing: 1250.0, // Expected 1200.0, discrepancy is 50.0
    });

    expect(result.balanced).toBe(false);
    if ('delta' in result) {
      expect(result.delta).toBe(50.0);
    }
  });

  it('generates valid CSV and XLSX data from transactions', async () => {
    const rows = [
      [
        'Date',
        'Account',
        'Type',
        'Payee',
        'Memo',
        'Category',
        'Reference',
        'Amount',
        'Currency',
      ],
      [
        '2026-09-01',
        'CHK-1',
        'DEBIT',
        'Power Utility',
        'Electric bill',
        'Utilities',
        'REF01',
        '-120.00',
        'USD',
      ],
      [
        '2026-09-02',
        'CHK-1',
        'CREDIT',
        'Direct Deposit',
        'Payroll',
        'Income',
        'REF02',
        '2500.00',
        'USD',
      ],
    ];

    const csvOutput = toCsv(rows);
    expect(csvOutput).toContain('Power Utility');
    expect(csvOutput).toContain('2500.00');

    const { bytes: xlsxBytes } = await writeXlsx([
      {
        name: 'Transactions',
        rows: [
          ['Date', 'Account', 'Amount'],
          ['2026-09-01', 'CHK-1', -120.0],
          ['2026-09-02', 'CHK-1', 2500.0],
        ],
      },
    ]);
    expect(xlsxBytes.byteLength).toBeGreaterThan(100);
  });

  it('throws typed error on unsupported file format', async () => {
    const wrongBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    await expect(parseFinance(wrongBytes)).rejects.toThrow(FinanceFormatError);
  });

  it('never leaks financial amounts or bank account details to console', async () => {
    const spy = vi.spyOn(console, 'error');
    const bytes = await loadFixture('ofx1.ofx');

    const result = await parseFinance(bytes);
    expect(result.accounts[0]?.id).toBe('SYNTHETIC-CHECKING');

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
