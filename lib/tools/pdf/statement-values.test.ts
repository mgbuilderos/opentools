import { describe, expect, it } from 'vitest';
import {
  detectDateFormatForColumn,
  detectNumberConvention,
  parseAmount,
  parseDate,
  reconcileRunningBalance,
} from './statement-values';

describe('lib/tools/pdf/statement-values', () => {
  describe('Amount parsing & numbering conventions', () => {
    it('detects numbering conventions per column', () => {
      expect(detectNumberConvention(['1,234.56', '50.00', '10,999.00'])).toBe(
        'standard-us',
      );
      expect(detectNumberConvention(['1.234,56', '50,00', '10.999,00'])).toBe(
        'european',
      );
      expect(
        detectNumberConvention(['1,23,456.78', '12,50,000.00', '500.00']),
      ).toBe('indian-lakh');
    });

    it('parses US/UK amounts with signs and symbols', () => {
      expect(parseAmount('$1,234.56').value).toBe(1234.56);
      expect(parseAmount('($1,234.56)').value).toBe(-1234.56);
      expect(parseAmount('1,234.56-').value).toBe(-1234.56);
      expect(parseAmount('-1,234.56').value).toBe(-1234.56);
      expect(parseAmount('1,234.56 DR').value).toBe(-1234.56);
      expect(parseAmount('1,234.56 CR').value).toBe(1234.56);
      expect(parseAmount('$1,234.56').currency).toBe('USD');
    });

    it('parses European format with decimal commas', () => {
      expect(parseAmount('1.234,56', 'european').value).toBe(1234.56);
      expect(parseAmount('(1.234,56)', 'european').value).toBe(-1234.56);
      expect(parseAmount('€ 1.234,56', 'european').value).toBe(1234.56);
      expect(parseAmount('€ 1.234,56', 'european').currency).toBe('EUR');
    });

    it('parses Indian numbering system (Lakh/Crore)', () => {
      const parsed = parseAmount('₹ 1,23,456.78', 'indian-lakh');
      expect(parsed.value).toBe(123456.78);
      expect(parsed.currency).toBe('INR');

      const debit = parseAmount('₹ 12,50,000.00 DR', 'indian-lakh');
      expect(debit.value).toBe(-1250000);
      expect(debit.isDebit).toBe(true);
    });
  });

  describe('Date parsing & ambiguity resolution', () => {
    it('resolves date format when day exceeds 12', () => {
      const col1 = ['01/02/2026', '25/01/2026', '05/03/2026'];
      const res1 = detectDateFormatForColumn(col1);
      expect(res1.format).toBe('DD/MM/YYYY');
      expect(res1.isAmbiguous).toBe(false);

      const col2 = ['01/02/2026', '01/25/2026', '03/05/2026'];
      const res2 = detectDateFormatForColumn(col2);
      expect(res2.format).toBe('MM/DD/YYYY');
      expect(res2.isAmbiguous).toBe(false);
    });

    it('flags column as ambiguous when all days are <= 12', () => {
      const col = ['01/02/2026', '03/04/2026', '05/06/2026'];
      const res = detectDateFormatForColumn(col);
      expect(res.isAmbiguous).toBe(true);
      expect(res.ambiguousCount).toBe(3);
    });

    it('parses alphanumeric named months unambiguously', () => {
      const d1 = parseDate('15-Jan-2026');
      expect(d1.isoDate).toBe('2026-01-15');
      expect(d1.isAmbiguous).toBe(false);

      const d2 = parseDate('Feb 28, 2026');
      expect(d2.isoDate).toBe('2026-02-28');
      expect(d2.isAmbiguous).toBe(false);
    });

    it('respects preferred format for ambiguous dates', () => {
      const d1 = parseDate('01/05/2026', 'DD/MM/YYYY');
      expect(d1.isoDate).toBe('2026-05-01'); // 1st May 2026

      const d2 = parseDate('01/05/2026', 'MM/DD/YYYY');
      expect(d2.isoDate).toBe('2026-01-05'); // Jan 5th 2026
    });
  });

  describe('Running Balance Reconciliation', () => {
    it('reconciles chronological downward transactions and detects mismatches', () => {
      const rows = [
        { rowIndex: 1, amount: null, balance: 1000.0 }, // Opening
        { rowIndex: 2, amount: 200.0, balance: 1200.0 }, // Match
        { rowIndex: 3, amount: -50.0, balance: 1150.0 }, // Match
        { rowIndex: 4, amount: -100.0, balance: 1040.0 }, // Mismatch: 1150 - 100 = 1050 != 1040
        { rowIndex: 5, amount: 500.0, balance: 1540.0 }, // Match from 1040 + 500 = 1540
      ];

      const report = reconcileRunningBalance(rows);
      expect(report.chronologicalDirection).toBe('chronological');
      expect(report.reconciledCount).toBe(3);
      expect(report.mismatchCount).toBe(1);
      expect(report.mismatchedRows[0]?.rowIndex).toBe(4);
      expect(report.mismatchedRows[0]?.expectedDelta).toBe(-100);
      expect(report.mismatchedRows[0]?.actualDelta).toBe(-110);
    });

    it('reconciles reverse-chronological upward transactions', () => {
      // Newest on top, oldest on bottom:
      // Row 1: Net -50, Balance 1150
      // Row 2: Net +200, Balance 1200 (prev 1000 + 200 = 1200, 1200 - 50 = 1150)
      // Row 3: Opening Balance 1000
      const rows = [
        { rowIndex: 1, amount: -50.0, balance: 1150.0 },
        { rowIndex: 2, amount: 200.0, balance: 1200.0 },
        { rowIndex: 3, amount: null, balance: 1000.0 },
      ];

      const report = reconcileRunningBalance(rows);
      expect(report.chronologicalDirection).toBe('reverse-chronological');
      expect(report.reconciledCount).toBe(2);
      expect(report.mismatchCount).toBe(0);
    });
  });
});
