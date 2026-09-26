import { describe, expect, it, vi } from 'vitest';
import {
  detectNumberConvention,
  parseAmount,
  reconcileRunningBalance,
} from './statement-values';
import { toCsv } from '../spreadsheet/csv';
import { writeXlsx } from '../spreadsheet/xlsx-writer';

describe('lib/tools/pdf/bank-statement-tool', () => {
  describe('numbering convention and parsing', () => {
    it('detects standard US, European, and Indian Lakh conventions', () => {
      expect(detectNumberConvention(['1,250.00', '45.50', '10,000.00'])).toBe(
        'standard-us',
      );
      expect(detectNumberConvention(['1.250,00', '45,50', '10.000,00'])).toBe(
        'european',
      );
      expect(
        detectNumberConvention(['1,50,000.00', '2,75,400.50', '500.00']),
      ).toBe('indian-lakh');
    });

    it('parses debits and credits with trailing DR/CR markers and parenthesis', () => {
      expect(parseAmount('$5,000.00').value).toBe(5000);
      expect(parseAmount('($150.00)').value).toBe(-150);
      expect(parseAmount('1,500.00 DR').value).toBe(-1500);
      expect(parseAmount('2,500.00 CR').value).toBe(2500);
      expect(parseAmount('1,23,456.78Cr', 'indian-lakh').value).toBe(123456.78);
    });
  });

  describe('running balance reconciliation', () => {
    it('verifies a fully reconciled balanced statement', () => {
      const reconRows = [
        { rowIndex: 1, amount: null, balance: 1000.0 },
        { rowIndex: 2, amount: 500.0, balance: 1500.0 },
        { rowIndex: 3, amount: -200.0, balance: 1300.0 },
        { rowIndex: 4, amount: -100.0, balance: 1200.0 },
      ];

      const report = reconcileRunningBalance(reconRows);
      expect(report.chronologicalDirection).toBe('chronological');
      expect(report.reconciledCount).toBe(3);
      expect(report.mismatchCount).toBe(0);
      expect(report.mismatchedRows).toHaveLength(0);
    });

    it('identifies discrepancies in an unbalanced statement', () => {
      const reconRows = [
        { rowIndex: 1, amount: null, balance: 1000.0 },
        { rowIndex: 2, amount: 500.0, balance: 1500.0 },
        // Tampered balance: should be 1300.0 but is 1400.0
        { rowIndex: 3, amount: -200.0, balance: 1400.0 },
        { rowIndex: 4, amount: -100.0, balance: 1300.0 },
      ];

      const report = reconcileRunningBalance(reconRows);
      expect(report.mismatchCount).toBeGreaterThan(0);
      expect(report.mismatchedRows.length).toBeGreaterThan(0);
      expect(report.mismatchedRows[0]!.rowIndex).toBe(3);
    });
  });

  describe('deterministic exports', () => {
    it('produces valid CSV export', () => {
      const headers = ['Date', 'Description', 'Amount', 'Balance'];
      const rows = [
        ['2026-01-01', 'Opening Balance', '', '1000.00'],
        ['2026-01-02', 'Transfer, wire', '500.00', '1500.00'],
      ];

      const csv = toCsv([headers, ...rows]);
      expect(csv).toContain('Date,Description,Amount,Balance');
      // Description with comma should be quoted
      expect(csv).toContain('"Transfer, wire"');
    });

    it('produces valid XLSX export bytes', async () => {
      const headers = ['Date', 'Description', 'Amount', 'Balance'];
      const rows = [
        ['2026-01-01', 'Opening Balance', '', '1000.00'],
        ['2026-01-02', 'Deposit', '500.00', '1500.00'],
      ];

      const xlsxResult = await writeXlsx([
        {
          name: 'Statement',
          rows: [headers, ...rows],
        },
      ]);

      expect(xlsxResult.bytes).toBeInstanceOf(Uint8Array);
      expect(xlsxResult.bytes.length).toBeGreaterThan(100);
      // PK signature for ZIP archive (XLSX container)
      expect(xlsxResult.bytes[0]).toBe(0x50);
      expect(xlsxResult.bytes[1]).toBe(0x4b);
    });
  });

  describe('privacy and zero-leak guarantees', () => {
    it('never logs financial records or balances to console', () => {
      const logSpy = vi.spyOn(console, 'log');
      const infoSpy = vi.spyOn(console, 'info');
      const warnSpy = vi.spyOn(console, 'warn');

      const headers = ['Date', 'Description', 'Amount', 'Balance'];
      const rows = [
        ['2026-01-01', 'Confidential Secret Salary', '99999.00', '199999.00'],
      ];

      const reconRows = [{ rowIndex: 1, amount: 99999.0, balance: 199999.0 }];
      reconcileRunningBalance(reconRows);
      toCsv([headers, ...rows]);

      for (const call of [
        ...logSpy.mock.calls,
        ...infoSpy.mock.calls,
        ...warnSpy.mock.calls,
      ]) {
        const serialized = JSON.stringify(call);
        expect(serialized).not.toContain('Confidential Secret Salary');
        expect(serialized).not.toContain('99999');
      }

      logSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});
