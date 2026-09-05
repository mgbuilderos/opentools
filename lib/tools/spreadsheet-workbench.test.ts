import { describe, expect, it } from 'vitest';

import {
  runSpreadsheetOperation,
  SPREADSHEET_OPERATIONS,
} from './spreadsheet-workbench';

function defaults(id: string) {
  const operation = SPREADSHEET_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('CSV and spreadsheet workbench', () => {
  it('publishes 39 unique operations whose defaults all run', () => {
    expect(SPREADSHEET_OPERATIONS).toHaveLength(39);
    expect(new Set(SPREADSHEET_OPERATIONS.map((item) => item.id)).size).toBe(
      39,
    );
    for (const operation of SPREADSHEET_OPERATIONS) {
      expect(
        runSpreadsheetOperation(
          operation.id,
          defaults(operation.id),
          () => 0.25,
        ),
      ).not.toBe('');
    }
  });

  it('sorts, filters, selects, renames, and deduplicates rows', () => {
    const input = 'name,team,score\nAda,Blue,91\nLin,Red,84\nMina,Blue,91';
    expect(
      runSpreadsheetOperation('csv-sorter', {
        input,
        column: 'score',
        mode: 'number-asc',
      }).split('\n')[1],
    ).toBe('Lin,Red,84');
    expect(
      runSpreadsheetOperation('csv-filter', {
        input,
        column: 'team',
        operator: 'equals',
        value: 'Blue',
      }),
    ).not.toContain('Lin');
    expect(
      runSpreadsheetOperation('csv-column-selector', {
        input,
        columns: 'name,score',
      }).split('\n')[0],
    ).toBe('name,score');
    expect(
      runSpreadsheetOperation('csv-column-renamer', {
        input,
        renames: 'name=person',
      }).split('\n')[0],
    ).toBe('person,team,score');
    expect(
      runSpreadsheetOperation('csv-deduplicator', {
        input,
        columns: 'score',
      }).split('\n'),
    ).toHaveLength(3);
  });

  it('merges, splits, transposes, groups, and pivots data', () => {
    expect(
      runSpreadsheetOperation('csv-merger', {
        input: 'name,score\nAda,91',
        second: 'name,score\nLin,84',
      }),
    ).toContain('Lin,84');
    expect(
      runSpreadsheetOperation('csv-splitter', {
        input: 'name,score\nAda,91\nLin,84\nMina,90',
        size: '2',
      }),
    ).toContain('--- part 2 ---');
    expect(
      runSpreadsheetOperation('csv-transposer', {
        input: 'name,score\nAda,91',
      }),
    ).toBe('name,Ada\nscore,91');
    expect(
      runSpreadsheetOperation('csv-group-by', {
        input: 'team,score\nBlue,10\nBlue,20\nRed,7',
        group: 'team',
        value: 'score',
        aggregate: 'sum',
      }),
    ).toContain('Blue,30');
    expect(
      runSpreadsheetOperation('csv-pivot-table', {
        input: 'team,month,sales\nBlue,Jan,10\nBlue,Feb,20\nRed,Jan,5',
        row: 'team',
        column: 'month',
        value: 'sales',
        aggregate: 'sum',
      }),
    ).toContain('Blue,10,20');
  });

  it('joins and diffs keyed datasets', () => {
    expect(
      runSpreadsheetOperation('csv-join', {
        input: 'id,name\n1,Ada\n2,Lin',
        second: 'id,city\n1,London',
        leftKey: 'id',
        rightKey: 'id',
        join: 'left',
      }),
    ).toContain('2,Lin,');
    expect(
      runSpreadsheetOperation('csv-diff', {
        input: 'id,value\n1,A\n2,B',
        second: 'id,value\n1,C\n3,D',
        key: 'id',
      }),
    ).toContain('"changed": [\n    "1"');
  });

  it('converts JSON, CSV, TSV, SQL, and Markdown with escaping', () => {
    expect(
      runSpreadsheetOperation('json-to-csv', {
        input: '[{"name":"Ada, A.","score":91}]',
      }),
    ).toContain('"Ada, A."');
    expect(
      runSpreadsheetOperation('csv-to-sql', {
        input: "name\nO'Reilly",
        table: 'people',
      }),
    ).toContain("'O''Reilly'");
    const markdown = runSpreadsheetOperation('table-to-markdown', {
      input: 'name,note\nAda,"A | B"',
    });
    expect(markdown).toContain('A \\| B');
    expect(
      runSpreadsheetOperation('markdown-table-to-csv', { input: markdown }),
    ).toContain('Ada,A | B');
  });

  it('profiles data and calculates numeric statistics and outliers', () => {
    expect(
      runSpreadsheetOperation('spreadsheet-data-profiler', {
        input: 'name,score\nAda,91\nLin,NA',
      }),
    ).toContain('score: 2 unique · 1 missing · 1/2 numeric');
    expect(
      runSpreadsheetOperation('column-statistics', {
        input: 'score\n1\n2\n3',
        column: 'score',
      }),
    ).toContain('Mean: 2');
    expect(
      runSpreadsheetOperation('outlier-detector', {
        input: 'score\n10\n11\n12\n13\n100',
        column: 'score',
      }),
    ).toContain('"value": 100');
  });

  it('normalizes dates, phones, and addresses conservatively', () => {
    expect(
      runSpreadsheetOperation('date-column-normalizer', {
        input: 'name,date\nAda,05/01/2026',
        column: 'date',
        format: 'DMY',
      }),
    ).toContain('2026-01-05');
    expect(
      runSpreadsheetOperation('phone-column-normalizer', {
        input: 'name,phone\nAda,09876543210',
        column: 'phone',
        country: '91',
      }),
    ).toContain('+919876543210');
    expect(
      runSpreadsheetOperation('address-column-cleaner', {
        input: 'name,address\nAda,"12  Main St,  London"',
        column: 'address',
      }),
    ).toContain('"12 Main St, London"');
  });

  it('samples deterministically when supplied a deterministic random source', () => {
    expect(
      runSpreadsheetOperation(
        'random-row-selector',
        { input: 'name\nAda\nLin\nMina' },
        () => 0.5,
      ),
    ).toContain('"row": 2');
  });

  it('rejects malformed schemas, unsafe sizes, and invalid cells', () => {
    expect(() =>
      runSpreadsheetOperation('csv-merger', {
        input: 'name\nAda',
        second: 'person\nLin',
      }),
    ).toThrow('identical headers');
    expect(() =>
      runSpreadsheetOperation('date-column-normalizer', {
        input: 'date\n31/02/2026',
        column: 'date',
        format: 'DMY',
      }),
    ).toThrow('Invalid calendar date');
    expect(() =>
      runSpreadsheetOperation('column-statistics', {
        input: 'score\nnot-a-number',
        column: 'score',
      }),
    ).toThrow('not numeric');
  });
});
