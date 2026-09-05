import { describe, expect, it } from 'vitest';

import { countWords, textCaseOptions, transformText } from './text-case';

describe('text case engine', () => {
  it.each([
    ['upper', 'Hello WORLD', 'HELLO WORLD'],
    ['lower', 'Hello WORLD', 'hello world'],
    ['title', 'hELLO from NEW delhi', 'Hello From New Delhi'],
    ['sentence', 'hELLO WORLD. this IS next!', 'Hello world. This is next!'],
    ['trim-lines', '  first  \n  second\t', 'first\nsecond'],
  ] as const)('applies %s deterministically', (mode, input, expected) => {
    expect(transformText(input, mode)).toBe(expected);
  });

  it('supports Unicode letters when capitalizing', () => {
    expect(transformText('élan vital', 'title')).toBe('Élan Vital');
  });

  it('keeps every transform idempotent', () => {
    const sample = '  hELLO WORLD. this IS next!  ';
    for (const { id } of textCaseOptions) {
      const once = transformText(sample, id);
      expect(transformText(once, id)).toBe(once);
    }
  });

  it('counts empty and whitespace-separated text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords(' one\n two\tthree ')).toBe(3);
  });
});
