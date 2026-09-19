import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv, toCsv } from './csv';

describe('reading CSV', () => {
  it('reads the ordinary case', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('keeps a comma that is inside quotes', () => {
    // The reason quoting exists. `line.split(',')` breaks on the first address
    // in the file and produces a row one column too wide.
    expect(parseCsv('name,address\n"Ada","12 High St, London"')).toEqual([
      ['name', 'address'],
      ['Ada', '12 High St, London'],
    ]);
  });

  it('keeps a newline that is inside quotes', () => {
    // So CSV cannot be parsed line by line. A reader that splits on newlines
    // first turns this one record into two, and the damage looks like data.
    expect(parseCsv('note\n"line one\nline two"\nafter')).toEqual([
      ['note'],
      ['line one\nline two'],
      ['after'],
    ]);
  });

  it('turns a doubled quote back into one', () => {
    expect(parseCsv('a\n"He said ""hi"""')).toEqual([['a'], ['He said "hi"']]);
  });

  it('handles CRLF, LF and a lone CR', () => {
    const expected = [
      ['a', 'b'],
      ['1', '2'],
    ];
    expect(parseCsv('a,b\r\n1,2')).toEqual(expected);
    expect(parseCsv('a,b\n1,2')).toEqual(expected);
    expect(parseCsv('a,b\r1,2')).toEqual(expected);
  });

  it('strips the byte-order mark Excel writes', () => {
    // Left in place it becomes part of the first column's name, so the header
    // reads "﻿Name" and every lookup on "Name" quietly misses.
    const [header] = parseCsv('﻿Name,Age\nAda,36');
    expect(header[0]).toBe('Name');
  });

  it('does not invent a trailing row for a file ending in a newline', () => {
    expect(parseCsv('a,b\n1,2\n')).toHaveLength(2);
    expect(parseCsv('a,b\r\n1,2\r\n')).toHaveLength(2);
  });

  it('keeps empty fields, including a whole empty row', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
    expect(parseCsv('a\n\nb')).toEqual([['a'], [''], ['b']]);
  });

  it('reads a semicolon file when told to', () => {
    expect(parseCsv('a;b\n1;2', ';')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('writing CSV', () => {
  it('quotes only what has to be quoted', () => {
    const csv = toCsv(
      [['plain', 'has,comma', 'has"quote', 'has\nnewline', ' padded ']],
      {
        byteOrderMark: false,
      },
    );
    expect(csv).toBe(
      'plain,"has,comma","has""quote","has\nnewline"," padded "',
    );
  });

  it('writes the byte-order mark by default, because Excel needs it', () => {
    // Without it Excel reads a UTF-8 file as the local codepage and "café"
    // opens as "cafÃ©".
    expect(toCsv([['café']]).charCodeAt(0)).toBe(0xfeff);
    expect(toCsv([['café']], { byteOrderMark: false }).charCodeAt(0)).not.toBe(
      0xfeff,
    );
  });

  it('round-trips everything awkward', () => {
    const rows = [
      ['name', 'note'],
      ['Ada, Lovelace', 'She said "hello"'],
      ['multi', 'line one\nline two'],
      ['', ' padded '],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('uses CRLF by default, which is what RFC 4180 says', () => {
    expect(toCsv([['a'], ['b']], { byteOrderMark: false })).toBe('a\r\nb');
    expect(
      toCsv([['a'], ['b']], { byteOrderMark: false, lineEnding: '\n' }),
    ).toBe('a\nb');
  });
});

describe('guessing the delimiter', () => {
  it('finds the semicolon a European export uses', () => {
    // Much of Europe uses the comma as a decimal point, so Excel exports with
    // semicolons there. Assuming a comma gives one column and no error.
    const text = 'name;price;qty\nwidget;1,50;3\nbolt;0,80;12';
    expect(detectDelimiter(text)).toBe(';');
  });

  it('finds a tab', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3\n4\t5\t6')).toBe('\t');
  });

  it('prefers the consistent delimiter over the most frequent one', () => {
    // Prose full of commas would win on frequency alone, and give a different
    // column count on every line.
    const text = 'id|note\n1|one, two, three, four\n2|five, six, seven, eight';
    expect(detectDelimiter(text)).toBe('|');
  });

  it('falls back to a comma when there is nothing to go on', () => {
    expect(detectDelimiter('single')).toBe(',');
    expect(detectDelimiter('')).toBe(',');
  });
});
