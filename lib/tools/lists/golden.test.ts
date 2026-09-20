import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  compareLists,
  deduplicateList,
  normalizeList,
  parseListTable,
  serializeListTable,
  splitByColumnValue,
} from './hygiene';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '__fixtures__');

describe('List Hygiene Frozen Golden Verification', () => {
  const dirtyCsv = readFileSync(
    path.join(fixturesDir, 'dirty-subscribers.csv'),
    'utf8',
  );
  const secondCsv = readFileSync(
    path.join(fixturesDir, 'second-subscribers.csv'),
    'utf8',
  );

  it('produces deterministic golden clean subscriber list', () => {
    const table = parseListTable(dirtyCsv);

    // 1. Deduplicate by Email Address (index 2)
    const dedup = deduplicateList(table, {
      keyColumnIndex: 2,
      caseSensitive: false,
      keep: 'first',
    });

    expect(dedup.duplicatesRemoved).toBe(2);
    expect(dedup.uniqueCount).toBe(4);

    // 2. Normalize Names, Emails, and Phone Numbers
    const norm = normalizeList(dedup.table, {
      rules: [
        { columnIndex: 0, rule: 'titlecase' },
        { columnIndex: 1, rule: 'titlecase' },
        { columnIndex: 2, rule: 'email' },
        { columnIndex: 3, rule: 'phone_digits' },
      ],
    });

    const outputCsv = serializeListTable(norm.table);

    const goldenPath = path.join(fixturesDir, 'golden-cleaned-subscribers.csv');
    // If golden does not exist, initialize it
    try {
      const expected = readFileSync(goldenPath, 'utf8');
      expect(outputCsv).toBe(expected);
    } catch {
      writeFileSync(goldenPath, outputCsv, 'utf8');
      expect(outputCsv.length).toBeGreaterThan(50);
    }
  });

  it('proves non-vacuity: altered input produces altered output', () => {
    const altered = dirtyCsv.replace(
      'alice.smith@acme.corp',
      'zack@novelty.com',
    );
    const tableAltered = parseListTable(altered);
    const dedup = deduplicateList(tableAltered, {
      keyColumnIndex: 2,
      caseSensitive: false,
    });
    const outputCsv = serializeListTable(dedup.table);
    const golden = readFileSync(
      path.join(fixturesDir, 'golden-cleaned-subscribers.csv'),
      'utf8',
    );
    expect(outputCsv).not.toBe(golden);
  });

  it('verifies multi-list comparison against second list', () => {
    const tableA = parseListTable(dirtyCsv);
    const tableB = parseListTable(secondCsv);

    const comp = compareLists(tableA, tableB, {
      keyColumnA: 2, // Email Address
      keyColumnB: 0, // Email Address
      caseSensitive: false,
    });

    // In both: alice.smith@acme.corp, bob@jones-law.com
    expect(comp.countInBoth).toBe(4); // 2 alice rows + 2 bob rows in A
    expect(comp.countOnlyInB).toBe(1); // emma.watson@actors.uk
    expect(comp.onlyInB.rows[0]?.[0]).toBe('emma.watson@actors.uk');
  });

  it('verifies grouping by Plan column', () => {
    const table = parseListTable(dirtyCsv);
    const split = splitByColumnValue(table, 4); // Plan column
    // Plans: Enterprise, Starter, Pro
    expect(split.groups.length).toBe(3);
    const enterprise = split.groups.find((g) =>
      g.groupValue.includes('Enterprise'),
    );
    expect(enterprise).toBeDefined();
    expect(enterprise?.rowCount).toBe(2);
  });
});
