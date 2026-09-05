import { describe, expect, it } from 'vitest';

import { csvToJson, csvToRecords, transformJson } from './structured';

describe('structured data tools', () => {
  it('formats and minifies valid JSON', () => {
    expect(transformJson('{"b":2,"a":1}', 'pretty')).toContain('\n  "b"');
    expect(transformJson('{"b":2,"a":1}', 'minify')).toBe('{"b":2,"a":1}');
  });

  it('sorts object keys recursively without sorting arrays', () => {
    expect(
      transformJson('{"z":{"b":2,"a":1},"a":[{"d":4,"c":3}]}', 'sort'),
    ).toBe(
      '{\n  "a": [\n    {\n      "c": 3,\n      "d": 4\n    }\n  ],\n  "z": {\n    "a": 1,\n    "b": 2\n  }\n}',
    );
  });

  it('rejects invalid JSON', () => {
    expect(() => transformJson('{broken}', 'pretty')).toThrow(
      'JSON could not be parsed',
    );
  });

  it('rejects numbers that JSON.parse would silently corrupt', () => {
    expect(() => transformJson('{"id":9007199254740993}', 'minify')).toThrow(
      'outside the exact JavaScript range',
    );
    expect(() => transformJson('{"id":-9007199254740993}', 'minify')).toThrow(
      'outside the exact JavaScript range',
    );
    expect(() => transformJson('{"value":1e400}', 'pretty')).toThrow(
      'outside the finite JavaScript range',
    );
    expect(transformJson('{"id":"9007199254740993"}', 'minify')).toBe(
      '{"id":"9007199254740993"}',
    );
  });

  it('parses commas, escaped quotes, and newlines inside quoted CSV fields', () => {
    const result = csvToRecords(
      'name,note\r\nAda,"one, two"\r\nLin,"said ""hello""\nnext"',
    );
    expect(result.headers).toEqual(['name', 'note']);
    expect(result.rows).toEqual([
      { name: 'Ada', note: 'one, two' },
      { name: 'Lin', note: 'said "hello"\nnext' },
    ]);
  });

  it('rejects duplicate headers and ragged rows', () => {
    expect(() => csvToJson('name,name\nAda,Lovelace')).toThrow(
      'headers must be unique',
    );
    expect(() => csvToJson('name,age\nAda')).toThrow(
      'Row 2 has 1 columns; expected 2',
    );
  });
});
