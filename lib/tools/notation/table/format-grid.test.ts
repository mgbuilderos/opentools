import { describe, expect, it } from 'vitest';

import {
  convertTable,
  detectTableFormat,
  emitTable,
  parseTable,
} from './index';
import { emitLatexTable } from './latex';
import type { Table, TableFormat } from './types';

/**
 * The grid, checked as a grid.
 *
 * Every format here contributes one parser and one emitter, and the conversion
 * between any two of them is `parse` then `emit`. That is the whole reason the
 * eleventh format costs two functions rather than twenty -- and it is also the
 * reason a single broken parser breaks ten pages at once. So the check is not
 * "csv to json works": it is every ordered pair, on one fixture, with the
 * round trip stated separately so a fidelity loss is named rather than hidden
 * behind a conversion that merely did not throw.
 *
 * The fixture carries an ampersand and a two-word heading because those are
 * what the escaping rules exist for. `R&D` is the cell that found the LaTeX
 * parser splitting on an escaped `\&` -- three columns of data arriving as
 * four -- which no single-format test had noticed in either direction.
 */
const FORMATS: readonly TableFormat[] = [
  'csv',
  'tsv',
  'json',
  'yaml',
  'xml',
  'markdown',
  'html',
  'latex',
  'sql',
  'asciidoc',
  'rst',
];

const FIXTURE: Table = {
  headers: ['product', 'region', 'units', 'unit price'],
  rows: [
    ['Desk lamp', 'EU', '128', '24.50'],
    ['Chair', 'R&D', '64', '98.00'],
    ['Monitor', 'APAC', '32', '249.99'],
  ],
};

describe('the table format grid', () => {
  it.each(FORMATS)(
    'writes %s and reads back exactly what it wrote',
    (format) => {
      const written = emitTable(FIXTURE, format);
      expect(written.trim(), `${format} emitted nothing`).not.toBe('');

      const back = parseTable(written, format);
      expect(back.headers, `${format} headers`).toEqual(FIXTURE.headers);
      expect(back.rows, `${format} rows`).toEqual(FIXTURE.rows);
    },
  );

  it.each(FORMATS)('recognises %s from its own output', (format) => {
    expect(detectTableFormat(emitTable(FIXTURE, format))).toBe(format);
  });

  it('converts every ordered pair of formats', () => {
    const failures: string[] = [];
    for (const from of FORMATS) {
      const input = emitTable(FIXTURE, from);
      for (const to of FORMATS) {
        if (from === to) continue;
        try {
          const output = convertTable(input, from, to);
          if (!output.trim()) failures.push(`${from} -> ${to}: empty`);
          // The conversion has to carry the data, not merely produce syntax.
          const back = parseTable(output, to);
          if (back.rows.length !== FIXTURE.rows.length) {
            failures.push(
              `${from} -> ${to}: ${back.rows.length} rows, expected ${FIXTURE.rows.length}`,
            );
          }
        } catch (caught) {
          failures.push(
            `${from} -> ${to}: ${caught instanceof Error ? caught.message : String(caught)}`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  /**
   * The escaping `latex-table-generator` relies on, stated where a change to
   * the splitter would trip over it. The emitter is not what was fixed -- the
   * parser was -- and this is the line that keeps it that way.
   */
  it('still escapes & % _ # $ on the way into LaTeX, and reads them back', () => {
    const awkward: Table = {
      headers: ['symbol', 'note'],
      rows: [
        ['R&D', '50% of $40'],
        ['file_name', 'issue #3'],
      ],
    };
    const written = emitLatexTable(awkward);
    expect(written).toContain('R\\&D');
    expect(written).toContain('50\\% of \\$40');
    expect(written).toContain('file\\_name');
    expect(written).toContain('issue \\#3');

    const back = parseTable(written, 'latex');
    expect(back.rows).toEqual(awkward.rows);
  });

  it('refuses YAML that is not a sequence of mappings', () => {
    expect(() => parseTable('name: Ada\nteam: Blue', 'yaml')).toThrow();
    expect(() => parseTable('', 'yaml')).toThrow();
  });

  it('reads XML rows written as attributes as well as elements', () => {
    const table = parseTable(
      '<rows><row product="Desk lamp" units="128"/><row product="Chair" units="64"/></rows>',
      'xml',
    );
    expect(table.headers).toEqual(['product', 'units']);
    expect(table.rows).toEqual([
      ['Desk lamp', '128'],
      ['Chair', '64'],
    ]);
  });

  it('keeps a heading XML cannot name as an element name', () => {
    const written = emitTable(FIXTURE, 'xml');
    expect(written).toContain('<field name="unit price">');
    expect(parseTable(written, 'xml').headers).toContain('unit price');
  });
});
