import { describe, expect, it } from 'vitest';

import { flagCells, summariseFlags, type ColumnRole } from './cell-flags';

const ROLES: ColumnRole[] = [
  'date',
  'description',
  'debit',
  'credit',
  'balance',
];

const OPTIONS = {
  convention: 'standard-us' as const,
  dateFormat: 'DD/MM/YYYY' as const,
};

describe('flagCells', () => {
  it('flags nothing when every cell reads cleanly', () => {
    const rows = [
      ['05/04/2026', 'NORTHERN RENT DD', '1,100.00', '', '4,550.00'],
      ['07/04/2026', 'CARD 4412 TESCO', '82.15', '', '4,467.85'],
    ];
    expect(flagCells(rows, ROLES, OPTIONS)).toEqual([]);
  });

  it('does not flag a blank debit on a credit line', () => {
    // Every statement has these, and flagging them would bury the real ones.
    const rows = [['03/04/2026', 'SALARY', '', '3,200.00', '5,650.00']];
    expect(flagCells(rows, ROLES, OPTIONS)).toEqual([]);
  });

  it('names the cell where a column divider landed wrong', () => {
    const rows = [['05/04/2026', 'RENT', '1,100.00 4,550.00', '', '']];
    const flags = flagCells(rows, ROLES, OPTIONS);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      rowIndex: 0,
      columnIndex: 2,
      reason: 'two-values-in-one-cell',
    });
    expect(flags[0]!.message).toContain('drag it');
  });

  it('flags an amount it cannot read rather than exporting it silently', () => {
    const rows = [['05/04/2026', 'RENT', 'l,100.OO', '', '4,550.00']];
    const flags = flagCells(rows, ROLES, OPTIONS);
    expect(flags.map((flag) => flag.reason)).toEqual(['not-a-number']);
  });

  it('flags a date column cell that is not a date', () => {
    const rows = [['Brought forward', 'RENT', '', '', '4,550.00']];
    const flags = flagCells(rows, ROLES, OPTIONS);
    expect(flags.map((flag) => flag.reason)).toEqual(['not-a-date']);
  });

  it('flags a missing date, because it usually means a split row', () => {
    const rows = [['', 'CONTINUED FROM ABOVE', '', '', '']];
    const flags = flagCells(rows, ROLES, OPTIONS);
    expect(flags.map((flag) => flag.reason)).toEqual(['missing-date']);
  });

  it('does not flag day-first versus month-first, row by row', () => {
    // 05/04/2026 is ambiguous, and so is most of a statement. The page asks
    // that question once for the whole document; asking it per row would
    // bury the flags that point at something actually wrong.
    const rows = [
      ['05/04/2026', 'RENT', '10.00', '', '4,550.00'],
      ['06/04/2026', 'TESCO', '12.00', '', '4,538.00'],
    ];
    expect(
      flagCells(rows, ROLES, { ...OPTIONS, dateFormat: 'MM/DD/YYYY' }),
    ).toEqual([]);
  });

  it('never flags a description, whatever is in it', () => {
    const rows = [['05/04/2026', '1,100.00 4,550.00 not a date', '', '', '']];
    expect(flagCells(rows, ROLES, OPTIONS)).toEqual([]);
  });

  it('never flags a column the user set to ignore', () => {
    const rows = [['nonsense', 'x', 'nonsense', '', '']];
    const roles: ColumnRole[] = [
      'ignore',
      'description',
      'ignore',
      'ignore',
      'ignore',
    ];
    expect(flagCells(rows, roles, OPTIONS)).toEqual([]);
  });

  it('reports a break in the running balance against the balance column', () => {
    const rows = [
      ['05/04/2026', 'RENT', '1,100.00', '', '4,550.00'],
      ['07/04/2026', 'TESCO', '82.15', '', '9,999.99'],
    ];
    const flags = flagCells(rows, ROLES, {
      ...OPTIONS,
      reconciliation: {
        totalTransactions: 2,
        hasBalanceColumn: true,
        chronologicalDirection: 'chronological',
        reconciledCount: 1,
        mismatchCount: 1,
        mismatchedRows: [
          {
            rowIndex: 1,
            expectedDelta: -82.15,
            actualDelta: 5449.99,
            error: 'mismatch',
          },
        ],
      },
    });
    const balanceFlag = flags.find(
      (flag) => flag.reason === 'balance-does-not-continue',
    );
    expect(balanceFlag).toMatchObject({ rowIndex: 1, columnIndex: 4 });
    expect(balanceFlag!.message).toContain('+5449.99');
    expect(balanceFlag!.message).toContain('-82.15');
  });

  it('sorts flags into reading order so a review queue walks the page', () => {
    const rows = [
      ['', 'A', '', '', ''],
      ['bad', 'B', 'x y', '', ''],
    ];
    const flags = flagCells(rows, ROLES, OPTIONS);
    const order = flags.map((flag) => [flag.rowIndex, flag.columnIndex]);
    expect(order).toEqual(
      [...order].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!),
    );
  });
});

describe('summariseFlags', () => {
  it('says nothing when there is nothing to say', () => {
    expect(summariseFlags([])).toBeNull();
  });

  it('counts cells and rows, and never invents a score', () => {
    const line = summariseFlags([
      { rowIndex: 0, columnIndex: 1, reason: 'not-a-number', message: '' },
      { rowIndex: 0, columnIndex: 2, reason: 'not-a-number', message: '' },
      { rowIndex: 4, columnIndex: 1, reason: 'not-a-date', message: '' },
    ]);
    expect(line).toBe('3 cells across 2 rows need a look before you export.');
    expect(line).not.toMatch(/%/u);
  });

  it('uses the singular for one cell in one row', () => {
    expect(
      summariseFlags([
        { rowIndex: 2, columnIndex: 0, reason: 'missing-date', message: '' },
      ]),
    ).toBe('1 cell across 1 row needs a look before you export.');
  });
});
