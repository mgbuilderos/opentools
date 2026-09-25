import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  detectNumberConvention as detectStatementConvention,
  parseAmount as parseStatementAmount,
} from '@/lib/tools/pdf/statement-values';

import {
  FinanceFormatError,
  detectNumberConvention,
  parseAmount,
  parseFinance,
  parseOfx,
  parseQif,
  reconcile,
} from './index';

const fixtures = resolve(import.meta.dirname, '__fixtures__');

async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve(fixtures, name)));
}

describe('finance formats', () => {
  it('parses OFX 1.x SGML bank statements with unclosed leaf tags', async () => {
    const result = await parseOfx(await fixture('ofx1.ofx'));

    expect(result.format).toBe('ofx');
    expect(result.version).toBe('102');
    expect(result.accounts).toEqual([
      {
        id: 'SYNTHETIC-CHECKING',
        type: 'CHECKING',
        currency: 'USD',
        bankId: '000000001',
        statementStart: '2026-09-01',
        statementEnd: '2026-09-30',
        openingBalance: null,
        closingBalance: 1374.44,
      },
    ]);
    expect(result.transactions).toHaveLength(3);
    expect(result.transactions[0]).toMatchObject({
      accountId: 'SYNTHETIC-CHECKING',
      type: 'DEBIT',
      date: '2026-09-05',
      amount: -125.5,
      id: 'synthetic-001',
      payee: 'Utility payment',
    });
    expect(result.transactions[1]?.memo).toBe('September transfer');
    expect(result.transactions[2]?.reference).toBe('42');
    expect(result.openingBalance).toBeNull();
    expect(result.closingBalance).toBe(1374.44);
  });

  it('parses OFX 2.x XML card statements', async () => {
    const result = await parseOfx(await fixture('ofx2.ofx'));

    expect(result.version).toBe('220');
    expect(result.accounts[0]).toMatchObject({
      id: 'SYNTHETIC-CARD',
      type: 'CREDITCARD',
      currency: 'EUR',
      closingBalance: -49.95,
    });
    expect(result.transactions).toEqual([
      expect.objectContaining({
        accountId: 'SYNTHETIC-CARD',
        amount: -49.95,
        date: '2026-09-20',
        payee: 'Rail ticket',
      }),
    ]);
  });

  it('parses QIF account metadata, balance, and transactions', async () => {
    const result = await parseQif(await fixture('sample.qif'));

    expect(result.format).toBe('qif');
    expect(result.accounts).toEqual([
      {
        id: 'Synthetic current account',
        name: 'Synthetic current account',
        type: 'Bank',
        description: 'Generated fixture account',
        statementEnd: '09/30/2026',
        openingBalance: null,
        closingBalance: 248456.78,
      },
    ]);
    expect(result.transactions.map((item) => item.amount)).toEqual([
      123456.78, -1200, 126200,
    ]);
    expect(result.transactions[1]).toMatchObject({
      accountId: 'Synthetic current account',
      date: '09/04/2026',
      payee: 'Utility payment',
      reference: '1001',
      category: 'Household',
    });
    expect(result.closingBalance).toBe(248456.78);
  });

  it('auto-detects OFX and QIF without using a filename', async () => {
    await expect(
      parseFinance(await fixture('ofx1.ofx')),
    ).resolves.toMatchObject({ format: 'ofx' });
    await expect(
      parseFinance(await fixture('sample.qif')),
    ).resolves.toMatchObject({ format: 'qif' });
  });

  it('pins copied amount parsing to the statement parser vector table', () => {
    const vectors = [
      ['$1,234.56', 'standard-us'],
      ['($1,234.56)', 'standard-us'],
      ['1,234.56-', 'standard-us'],
      ['-1,234.56', 'standard-us'],
      ['1,234.56 DR', 'standard-us'],
      ['1,234.56Cr', 'standard-us'],
      ['Dr. 1,234.56', 'standard-us'],
      ['€ 1.234,56', 'european'],
      ['₹ 1,23,456.78', 'indian-lakh'],
      ['₹ 12,50,000.00 DR', 'indian-lakh'],
      ['£50.00', 'standard-us'],
      ['¥500', 'standard-us'],
      ['', 'standard-us'],
      ['DRAFT', 'standard-us'],
    ] as const;

    for (const [text, convention] of vectors) {
      expect(parseAmount(text, convention), text).toEqual(
        parseStatementAmount(text, convention),
      );
    }

    const columns = [
      ['1,234.56', '50.00', '10,999.00'],
      ['1.234,56', '50,00', '10.999,00'],
      ['1,23,456.78', '12,50,000.00', '500.00'],
    ];
    for (const column of columns) {
      expect(detectNumberConvention(column)).toBe(
        detectStatementConvention(column),
      );
    }
  });

  it('reconciles exact decimal values without rounding', () => {
    expect(
      reconcile({ opening: 100, transactions: [0.1, 0.2], closing: 100.3 }),
    ).toEqual({ balanced: true, delta: 0 });
    expect(
      reconcile({
        opening: 100,
        transactions: [{ amount: -9.99 }, { amount: 4.5 }],
        closing: 94.5,
      }),
    ).toEqual({ balanced: false, delta: -0.01 });
  });

  it('does not erase a sub-cent reconciliation difference', () => {
    expect(
      reconcile({ opening: 0, transactions: [1.001], closing: 1 }),
    ).toEqual({ balanced: false, delta: -0.001 });
  });

  it.each([
    ['truncated.ofx', 'MALFORMED_OFX'],
    ['wrong-magic.bin', 'UNSUPPORTED_FORMAT'],
    ['declared-length.ofx', 'DECLARED_LENGTH_EXCEEDS_BUFFER'],
    ['truncated.qif', 'MALFORMED_QIF'],
  ])('returns a typed error for %s', async (name, code) => {
    const error = await parseFinance(await fixture(name)).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(FinanceFormatError);
    expect(error).toMatchObject({ code });
  });
});
