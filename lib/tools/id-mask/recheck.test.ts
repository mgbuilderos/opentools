import { describe, expect, it } from 'vitest';

import { maskIdentifiers } from './mask';
import { findUnmaskedIdentifiers } from './recheck';

const kinds = (text: string) =>
  findUnmaskedIdentifiers(text).map(({ kind, line, column }) => ({
    kind,
    line,
    column,
  }));

describe('re-check of masked output', () => {
  it('passes masked output in every layout the masker writes', () => {
    for (const text of [
      'XXXXXXXX2346',
      'XXXX XXXX 2346',
      'XXXX-XXXX-2346',
      'XXXXXXXX2346A',
      'XXXX XXXX 2346 A',
      'XXXXXX234F',
      'XXXXXXXXXX',
      'XXXXXX234F XXXX XXXX 2346',
    ]) {
      expect(findUnmaskedIdentifiers(text), text).toEqual([]);
    }
  });

  it('reports 12 digits in any grouping, with line and column', () => {
    expect(kinds('ok\nnumber 2345 67890123 here')).toEqual([
      { kind: 'twelve-digits', line: 2, column: 8 },
    ]);
    expect(kinds('23 4567 890123')).toHaveLength(1);
    expect(kinds('234567 890123')).toHaveLength(1);
    expect(kinds('0123 4567 8901')).toHaveLength(1);
  });

  it('reports 12 digits split by separators the masker does not accept', () => {
    expect(kinds('2345\t6789\t0124')).toHaveLength(1);
    expect(kinds('2345 / 6789 / 0124')).toHaveLength(1);
    expect(kinds('2345_6789_0124')).toHaveLength(1);
    expect(kinds('2345\n\n\n6789 0124')).toHaveLength(1);
  });

  it('reports 12 digits hidden by zero-width and bidi characters', () => {
    expect(kinds('23\u200b45\u200e67\u200f89\u202a01\u202c23')).toHaveLength(1);
  });

  it('reports digits from scripts the masker does not read', () => {
    // Thai digits: ๒๓๔๕ ๖๗๘๙ ๐๑๒๓
    const thai = '๒๓๔๕ ๖๗๘๙ ๐๑๒๓';
    const masked = maskIdentifiers(thai);
    expect(masked.output).toBe(thai);
    expect(kinds(masked.output)).toEqual([
      { kind: 'twelve-digits', line: 1, column: 1 },
    ]);
    // Mathematical bold digits are outside the Basic Multilingual Plane.
    const bold = '234567890124'
      .split('')
      .map((digit) => String.fromCodePoint(0x1d7ce + Number(digit)))
      .join('');
    expect(kinds(bold)).toHaveLength(1);
  });

  it('reports a 12-digit window inside a longer irregular run', () => {
    expect(kinds('2345 67890124 5678')).toHaveLength(1);
    expect(kinds('4111 1111 1111 1111')).toEqual([]);
    expect(kinds('4111 1111 1111 1111 111')).not.toEqual([]);
  });

  it('reports PAN shapes with any fourth letter, case or spacing', () => {
    expect(kinds('ABCDE1234F')).toEqual([
      { kind: 'pan-shape', line: 1, column: 1 },
    ]);
    expect(kinds('id=abcde1234fgh')).toHaveLength(1);
    expect(kinds('ABCDE 1234 F')).toHaveLength(1);
    expect(kinds('ABCDE-1234F')).toHaveLength(1);
    expect(kinds('ＡＢＣＤＥ１２３４Ｆ')).toHaveLength(1);
    expect(kinds('AB\u200bCDE12\u200d34F')).toHaveLength(1);
  });

  it('does not flag ordinary numbers and prose', () => {
    for (const text of [
      'Call +91 98765 43210 or +91-98765-43210 or +919876543210.',
      'Server 192.168.100.200 answered.',
      'On 2026-09-17 12:30:45 the total was 1,23,45,678.90.',
      'Since 2024 and Block 1234 C, Sector 5.',
      'Pincode 560001, order 98765432101.',
    ]) {
      expect(findUnmaskedIdentifiers(text), text).toEqual([]);
    }
  });

  it('merges overlapping findings into one position', () => {
    const findings = findUnmaskedIdentifiers('2345  6789  0124');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ start: 0, end: 16 });
  });

  it('gives UTF-16 columns that match textarea selection offsets', () => {
    const text = 'नाम: राम\nPAN ABCDE1234F';
    const [finding] = findUnmaskedIdentifiers(text);
    expect(finding).toMatchObject({ line: 2, column: 5 });
    expect(text.slice(finding!.start, finding!.end)).toBe('ABCDE1234F');
  });
});
