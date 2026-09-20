import { describe, expect, it } from 'vitest';
import {
  compareLists,
  deduplicateList,
  LIST_PRIVACY_NOTICE,
  mergeLists,
  normalizeList,
  parseListTable,
  serializeListTable,
  splitByColumnValue,
  splitByRowCount,
  type ListTable,
} from './hygiene';

describe('Marketer List Hygiene Engine', () => {
  const sampleTable: ListTable = {
    headers: ['Name', 'Email', 'Company', 'Phone'],
    rows: [
      ['Alice Smith', 'alice@example.com', 'Acme Inc', '+1 (555) 010-0001'],
      ['Bob Jones', 'bob@example.com', 'Beta LLC', '555-010-0002'],
      [
        'alice smith',
        'ALICE@EXAMPLE.COM',
        'Acme Corporation',
        '+1 555 010 0001',
      ],
      ['Charlie Brown', 'charlie@example.com', 'Beta LLC', '(555) 010-0003'],
      ['Bob Jones', 'bob.jones@work.com', 'Gamma Ltd', '+44 20 7946 0999'],
    ],
  };

  describe('Deduplication', () => {
    it('de-duplicates by email column case-insensitively keeping first', () => {
      const res = deduplicateList(sampleTable, {
        keyColumnIndex: 1,
        caseSensitive: false,
        keep: 'first',
      });

      expect(res.originalCount).toBe(5);
      expect(res.uniqueCount).toBe(4);
      expect(res.duplicatesRemoved).toBe(1);
      expect(res.table.rows.map((r) => r[1])).toEqual([
        'alice@example.com',
        'bob@example.com',
        'charlie@example.com',
        'bob.jones@work.com',
      ]);
    });

    it('de-duplicates keeping last record', () => {
      const res = deduplicateList(sampleTable, {
        keyColumnIndex: 1,
        caseSensitive: false,
        keep: 'last',
      });

      expect(res.uniqueCount).toBe(4);
      expect(
        res.table.rows.find(
          (r) => r[1]?.toLowerCase() === 'alice@example.com',
        )?.[0],
      ).toBe('alice smith');
    });

    it('respects case-sensitivity when specified', () => {
      const res = deduplicateList(sampleTable, {
        keyColumnIndex: 1,
        caseSensitive: true,
        keep: 'first',
      });

      expect(res.uniqueCount).toBe(5);
      expect(res.duplicatesRemoved).toBe(0);
    });
  });

  describe('List Merging', () => {
    const listA: ListTable = {
      headers: ['Email', 'First Name'],
      rows: [['a@test.com', 'Alex']],
    };
    const listB: ListTable = {
      headers: ['first name', 'Email', 'City'],
      rows: [['Dana', 'd@test.com', 'London']],
    };

    it('merges lists with union columns and aligned headers', () => {
      const res = mergeLists(listA, listB, { mode: 'union_columns' });
      expect(res.combinedRows).toBe(2);
      expect(res.table.headers).toEqual(['Email', 'First Name', 'City']);
      expect(res.table.rows[0]).toEqual(['a@test.com', 'Alex', '']);
      expect(res.table.rows[1]).toEqual(['d@test.com', 'Dana', 'London']);
    });

    it('merges lists with match_headers discarding unmapped columns from list B', () => {
      const res = mergeLists(listA, listB, { mode: 'match_headers' });
      expect(res.table.headers).toEqual(['Email', 'First Name']);
      expect(res.table.rows[1]).toEqual(['d@test.com', 'Dana']);
    });
  });

  describe('List Splitting', () => {
    it('splits list by row count preserving headers on every part', () => {
      const res = splitByRowCount(sampleTable, 2, 'subscribers');
      expect(res.chunks.length).toBe(3);
      expect(res.chunks[0]?.rowCount).toBe(2);
      expect(res.chunks[0]?.table.headers).toEqual(sampleTable.headers);
      expect(res.chunks[1]?.rowCount).toBe(2);
      expect(res.chunks[2]?.rowCount).toBe(1);
    });

    it('splits list by column value into discrete groups', () => {
      const res = splitByColumnValue(sampleTable, 2, 'by_company');
      // Companies: Acme Inc (1), Beta LLC (2), Acme Corporation (1), Gamma Ltd (1)
      expect(res.groups.length).toBe(4);
      const betaGroup = res.groups.find((g) => g.groupValue === 'Beta LLC');
      expect(betaGroup).toBeDefined();
      expect(betaGroup?.rowCount).toBe(2);
      expect(betaGroup?.table.headers).toEqual(sampleTable.headers);
    });
  });

  describe('List Comparison', () => {
    const listAlpha: ListTable = {
      headers: ['Email', 'Score'],
      rows: [
        ['one@domain.com', '10'],
        ['two@domain.com', '20'],
        ['three@domain.com', '30'],
      ],
    };
    const listBeta: ListTable = {
      headers: ['Email Address', 'Tier'],
      rows: [
        ['TWO@DOMAIN.COM', 'Gold'],
        ['four@domain.com', 'Silver'],
      ],
    };

    it('computes intersection, only in A, and only in B', () => {
      const res = compareLists(listAlpha, listBeta, {
        keyColumnA: 0,
        keyColumnB: 0,
        caseSensitive: false,
      });

      expect(res.countInBoth).toBe(1);
      expect(res.inBoth.rows[0]?.[0]).toBe('two@domain.com');

      expect(res.countOnlyInA).toBe(2);
      expect(res.onlyInA.rows.map((r) => r[0])).toEqual([
        'one@domain.com',
        'three@domain.com',
      ]);

      expect(res.countOnlyInB).toBe(1);
      expect(res.onlyInB.rows[0]?.[0]).toBe('four@domain.com');
    });
  });

  describe('Normalization', () => {
    const dirtyTable: ListTable = {
      headers: ['Name', 'Email', 'Phone'],
      rows: [
        [
          '  mary-jane watson  ',
          '  MARY.JANE@DAILYBUGLE.COM  ',
          '+1 (800) 555-0199 ',
        ],
        ['john d. rockefeller', 'john.d @oil.org', '020 7946 0123'],
      ],
    };

    it('standardizes casing, trims spaces, cleans email, and extracts phone digits', () => {
      const res = normalizeList(dirtyTable, {
        rules: [
          { columnIndex: 0, rule: 'titlecase' },
          { columnIndex: 1, rule: 'email' },
          { columnIndex: 2, rule: 'phone_digits' },
        ],
      });

      expect(res.cellsModified).toBe(6);
      expect(res.table.rows[0]).toEqual([
        'Mary-Jane Watson',
        'mary.jane@dailybugle.com',
        '+18005550199',
      ]);
      expect(res.table.rows[1]).toEqual([
        'John D. Rockefeller',
        'john.d@oil.org',
        '02079460123',
      ]);
    });
  });

  describe('Serialization & Privacy Notice', () => {
    it('round-trips ListTable through parseListTable and serializeListTable', () => {
      const csv = serializeListTable(sampleTable);
      const parsed = parseListTable(csv);
      expect(parsed.headers).toEqual(sampleTable.headers);
      expect(parsed.rows).toEqual(sampleTable.rows);
    });

    it('contains an explicit client-side privacy guarantee notice', () => {
      expect(LIST_PRIVACY_NOTICE).toContain('Client-Side Privacy Guarantee');
      expect(LIST_PRIVACY_NOTICE).toContain('local browser memory');
      expect(LIST_PRIVACY_NOTICE).toContain('No records are sent');
    });
  });
});
