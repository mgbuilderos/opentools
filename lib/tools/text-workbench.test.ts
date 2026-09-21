import { describe, expect, it } from 'vitest';

import { runTextOperation, TEXT_OPERATIONS } from './text-workbench';

describe('text workbench', () => {
  it('publishes a unique implementation for every configured operation', () => {
    expect(TEXT_OPERATIONS).toHaveLength(33);
    expect(new Set(TEXT_OPERATIONS.map((item) => item.id)).size).toBe(33);
  });

  it('counts text with documented boundaries', () => {
    expect(runTextOperation('word-counter', 'One café, two.').output).toBe('3');
    expect(runTextOperation('character-counter', 'A 👩🏽‍💻').output).toContain(
      'Characters: 3',
    );
    expect(
      runTextOperation('sentence-counter', 'One. Two! Three?').output,
    ).toBe('3');
    expect(
      runTextOperation('paragraph-counter', 'One\n\nTwo\n\n\nThree').output,
    ).toBe('3');
    expect(runTextOperation('reading-time', 'word '.repeat(225)).output).toBe(
      '1 min 0 sec',
    );
  });

  it('cleans and normalizes common text forms', () => {
    expect(runTextOperation('slug-generator', '  Café & Tea  ').output).toBe(
      'cafe-tea',
    );
    expect(runTextOperation('whitespace-remover', ' a\n  b\t c ').output).toBe(
      'a b c',
    );
    expect(runTextOperation('blank-line-remover', 'a\n \n b').output).toBe(
      'a\n b',
    );
    expect(runTextOperation('duplicate-line-remover', 'a\nb\na').output).toBe(
      'a\nb',
    );
    expect(runTextOperation('diacritic-remover', 'Crème brûlée').output).toBe(
      'Creme brulee',
    );
    expect(
      runTextOperation('unicode-normalizer', 'e\u0301', {
        normalization: 'NFC',
      }).output,
    ).toBe('é');
  });

  it('sorts, shuffles, numbers, and reverses lines safely', () => {
    expect(
      runTextOperation('line-sorter', 'b\na\nc', {
        sortDirection: 'descending',
      }).output,
    ).toBe('c\nb\na');
    expect(
      runTextOperation('line-shuffler', 'a\nb\nc', {}, () => 0).output,
    ).toBe('b\nc\na');
    expect(runTextOperation('line-number-adder', 'a\nb').output).toBe(
      '1. a\n2. b',
    );
    expect(runTextOperation('text-reverser', 'A👩🏽‍💻B').output).toBe('B👩🏽‍💻A');
  });

  it('repeats, replaces, splits, and deduplicates deterministically', () => {
    expect(
      runTextOperation('text-repeater', 'go', { repeatCount: 3 }).output,
    ).toBe('go\ngo\ngo');
    expect(
      runTextOperation('find-and-replace', 'One one ONE', {
        find: 'one',
        replacement: 'two',
        caseSensitive: false,
      }).output,
    ).toBe('two two two');
    expect(
      runTextOperation('regex-replace', 'a1 b22', {
        find: '\\d+',
        replacement: '#',
      }).output,
    ).toBe('a# b#');
    expect(
      runTextOperation('text-splitter', 'a,b,c', { separator: ',' }).output,
    ).toBe('a\nb\nc');
    expect(runTextOperation('text-deduplicator', 'a b a c').output).toBe(
      'a b c',
    );
  });

  it('generates bounded local placeholder and random words', () => {
    const placeholder = runTextOperation('lorem-ipsum-generator', '', {
      count: 2,
    }).output.split('\n\n');
    expect(placeholder).toHaveLength(2);
    // Filler that repeats one paragraph reads as a stuck tool and cannot show
    // how a layout copes with uneven text, so the paragraphs must differ.
    expect(placeholder[0]).not.toBe(placeholder[1]);
    expect(placeholder[0]).toMatch(/^Lorem ipsum dolor sit amet, consectetur/);
    for (const paragraph of placeholder) {
      expect(paragraph.trim()).not.toBe('');
      expect(paragraph).toMatch(/\.$/);
    }
    expect(
      runTextOperation('random-word-generator', '', { count: 3 }, () => 0)
        .output,
    ).toBe('amber\namber\namber');
    expect(() =>
      runTextOperation('text-repeater', 'x', { repeatCount: 101 }),
    ).toThrow('1 to 100');
  });

  it('finds user-provided anagrams and checks palindromes', () => {
    expect(
      runTextOperation('anagram-finder', 'listen', {
        candidates: 'silent\nenlist\nbanana',
      }).output,
    ).toBe('silent\nenlist');
    expect(
      runTextOperation('palindrome-checker', 'A man, a plan, a canal: Panama!')
        .output,
    ).toContain('Yes');
  });

  it('handles quotes, emoji, and punctuation', () => {
    expect(
      runTextOperation('smart-quote-converter', `"Hello" 'world'`).output,
    ).toBe('“Hello” ‘world’');
    expect(runTextOperation('emoji-remover', 'Hi 👋 world').output).toBe(
      'Hi world',
    );
    expect(runTextOperation('emoji-extractor', '👋 and 🚀').output).toBe(
      '👋\n🚀',
    );
    expect(
      runTextOperation('punctuation-cleaner', 'Hello, world!').output,
    ).toBe('Hello world');
  });

  it('translates Morse, NATO, and Pig Latin locally', () => {
    expect(runTextOperation('morse-code-translator', 'SOS 2').output).toBe(
      '... --- ... / ..---',
    );
    expect(runTextOperation('nato-alphabet-translator', 'AB 2').output).toBe(
      'Alfa Bravo / Two',
    );
    expect(runTextOperation('pig-latin-translator', 'Apple smile').output).toBe(
      'Appleway ilesmay',
    );
  });

  it('cleans subtitle and transcript structure without rendering markup', () => {
    const subtitle =
      '1\n00:00:01,000 --> 00:00:02,000\n<b>Hello</b>\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld';
    expect(runTextOperation('subtitles-text-cleaner', subtitle).output).toBe(
      'Hello\nWorld',
    );
    expect(
      runTextOperation(
        'transcript-formatter',
        ' Speaker 1:   Hello \n\n\n Speaker 2:  Hi ',
      ).output,
    ).toBe('Speaker 1: Hello\n\nSpeaker 2: Hi');
  });

  it('fails closed for missing inputs and invalid expressions', () => {
    expect(() => runTextOperation('word-counter', '')).toThrow(
      'Enter some text',
    );
    expect(() =>
      runTextOperation('regex-replace', 'abc', { find: '[' }),
    ).toThrow('valid JavaScript regular expression');
    expect(() =>
      runTextOperation('text-splitter', 'abc', { separator: '' }),
    ).toThrow('separator');
  });
});
