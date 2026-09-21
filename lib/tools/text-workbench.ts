export type TextOperationId =
  | 'word-counter'
  | 'character-counter'
  | 'sentence-counter'
  | 'paragraph-counter'
  | 'reading-time'
  | 'slug-generator'
  | 'whitespace-remover'
  | 'blank-line-remover'
  | 'duplicate-line-remover'
  | 'line-sorter'
  | 'line-shuffler'
  | 'line-number-adder'
  | 'text-reverser'
  | 'text-repeater'
  | 'find-and-replace'
  | 'regex-replace'
  | 'text-splitter'
  | 'text-deduplicator'
  | 'lorem-ipsum-generator'
  | 'random-word-generator'
  | 'anagram-finder'
  | 'palindrome-checker'
  | 'smart-quote-converter'
  | 'unicode-normalizer'
  | 'diacritic-remover'
  | 'emoji-remover'
  | 'emoji-extractor'
  | 'punctuation-cleaner'
  | 'morse-code-translator'
  | 'nato-alphabet-translator'
  | 'pig-latin-translator'
  | 'subtitles-text-cleaner'
  | 'transcript-formatter';

export interface TextOperation {
  id: TextOperationId;
  name: string;
  description: string;
  inputLabel: string;
  outputLabel: string;
  needsInput?: boolean;
  optionKind?:
    | 'find'
    | 'regex'
    | 'repeat'
    | 'separator'
    | 'normalization'
    | 'sort'
    | 'count'
    | 'candidates';
}

export interface TextOperationOptions {
  find?: string;
  replacement?: string;
  caseSensitive?: boolean;
  repeatCount?: number;
  separator?: string;
  normalization?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
  sortDirection?: 'ascending' | 'descending';
  count?: number;
  candidates?: string;
}

export interface TextOperationResult {
  output: string;
  summary: string;
}

export const TEXT_OPERATIONS: readonly TextOperation[] = [
  {
    id: 'word-counter',
    name: 'Word counter',
    description: 'Count words using Unicode-aware word boundaries.',
    inputLabel: 'Text to count',
    outputLabel: 'Word count',
  },
  {
    id: 'character-counter',
    name: 'Character counter',
    description: 'Count Unicode characters, including and excluding spaces.',
    inputLabel: 'Text to count',
    outputLabel: 'Character count',
  },
  {
    id: 'sentence-counter',
    name: 'Sentence counter',
    description: 'Estimate sentence boundaries from terminal punctuation.',
    inputLabel: 'Text to count',
    outputLabel: 'Sentence count',
  },
  {
    id: 'paragraph-counter',
    name: 'Paragraph counter',
    description: 'Count non-empty blocks separated by blank lines.',
    inputLabel: 'Text to count',
    outputLabel: 'Paragraph count',
  },
  {
    id: 'reading-time',
    name: 'Reading time calculator',
    description: 'Estimate reading time at 225 words per minute.',
    inputLabel: 'Text to estimate',
    outputLabel: 'Reading time',
  },
  {
    id: 'slug-generator',
    name: 'Slug generator',
    description: 'Create a lowercase, ASCII-friendly URL slug.',
    inputLabel: 'Title or phrase',
    outputLabel: 'Slug',
  },
  {
    id: 'whitespace-remover',
    name: 'Whitespace remover',
    description: 'Collapse whitespace runs to a single space.',
    inputLabel: 'Text to clean',
    outputLabel: 'Clean text',
  },
  {
    id: 'blank-line-remover',
    name: 'Blank-line remover',
    description: 'Remove empty or whitespace-only lines.',
    inputLabel: 'Lines to clean',
    outputLabel: 'Clean lines',
  },
  {
    id: 'duplicate-line-remover',
    name: 'Duplicate-line remover',
    description: 'Keep the first occurrence of every exact line.',
    inputLabel: 'Lines to deduplicate',
    outputLabel: 'Unique lines',
  },
  {
    id: 'line-sorter',
    name: 'Line sorter',
    description: 'Sort lines with locale-aware comparison.',
    inputLabel: 'Lines to sort',
    outputLabel: 'Sorted lines',
    optionKind: 'sort',
  },
  {
    id: 'line-shuffler',
    name: 'Line shuffler',
    description: 'Randomize line order with browser randomness.',
    inputLabel: 'Lines to shuffle',
    outputLabel: 'Shuffled lines',
  },
  {
    id: 'line-number-adder',
    name: 'Line-number adder',
    description: 'Prefix every line with a stable line number.',
    inputLabel: 'Lines to number',
    outputLabel: 'Numbered lines',
  },
  {
    id: 'text-reverser',
    name: 'Text reverser',
    description: 'Reverse user-perceived Unicode characters.',
    inputLabel: 'Text to reverse',
    outputLabel: 'Reversed text',
  },
  {
    id: 'text-repeater',
    name: 'Text repeater',
    description: 'Repeat text up to 100 times.',
    inputLabel: 'Text to repeat',
    outputLabel: 'Repeated text',
    optionKind: 'repeat',
  },
  {
    id: 'find-and-replace',
    name: 'Find and replace',
    description: 'Replace literal text without regular-expression rules.',
    inputLabel: 'Text to edit',
    outputLabel: 'Edited text',
    optionKind: 'find',
  },
  {
    id: 'regex-replace',
    name: 'Regex replace',
    description: 'Replace JavaScript regular-expression matches.',
    inputLabel: 'Text to edit',
    outputLabel: 'Edited text',
    optionKind: 'regex',
  },
  {
    id: 'text-splitter',
    name: 'Text splitter',
    description: 'Split text on a literal delimiter, one part per line.',
    inputLabel: 'Text to split',
    outputLabel: 'Split parts',
    optionKind: 'separator',
  },
  {
    id: 'text-deduplicator',
    name: 'Text deduplicator',
    description: 'Remove duplicate whitespace-delimited tokens.',
    inputLabel: 'Words or tokens',
    outputLabel: 'Unique tokens',
  },
  {
    id: 'lorem-ipsum-generator',
    name: 'Lorem ipsum generator',
    description: 'Generate local placeholder paragraphs.',
    inputLabel: 'No source text required',
    outputLabel: 'Placeholder text',
    needsInput: false,
    optionKind: 'count',
  },
  {
    id: 'random-word-generator',
    name: 'Random word generator',
    description: 'Pick words from a small built-in neutral list.',
    inputLabel: 'No source text required',
    outputLabel: 'Random words',
    needsInput: false,
    optionKind: 'count',
  },
  {
    id: 'anagram-finder',
    name: 'Anagram finder',
    description: 'Find exact anagrams in a list you provide.',
    inputLabel: 'Word to match',
    outputLabel: 'Matching anagrams',
    optionKind: 'candidates',
  },
  {
    id: 'palindrome-checker',
    name: 'Palindrome checker',
    description:
      'Check letters and numbers while ignoring case and punctuation.',
    inputLabel: 'Text to check',
    outputLabel: 'Palindrome result',
  },
  {
    id: 'smart-quote-converter',
    name: 'Smart-quote converter',
    description: 'Convert straight quotation marks to typographic quotes.',
    inputLabel: 'Text with straight quotes',
    outputLabel: 'Typography result',
  },
  {
    id: 'unicode-normalizer',
    name: 'Unicode normalizer',
    description: 'Normalize text to NFC, NFD, NFKC, or NFKD.',
    inputLabel: 'Text to normalize',
    outputLabel: 'Normalized text',
    optionKind: 'normalization',
  },
  {
    id: 'diacritic-remover',
    name: 'Diacritic remover',
    description:
      'Remove combining diacritic marks after Unicode decomposition.',
    inputLabel: 'Text with accents',
    outputLabel: 'Plain text',
  },
  {
    id: 'emoji-remover',
    name: 'Emoji remover',
    description: 'Remove extended pictographic characters.',
    inputLabel: 'Text containing emoji',
    outputLabel: 'Text without emoji',
  },
  {
    id: 'emoji-extractor',
    name: 'Emoji extractor',
    description: 'List extended pictographic characters in reading order.',
    inputLabel: 'Text containing emoji',
    outputLabel: 'Extracted emoji',
  },
  {
    id: 'punctuation-cleaner',
    name: 'Punctuation cleaner',
    description: 'Remove Unicode punctuation and tidy remaining whitespace.',
    inputLabel: 'Text to clean',
    outputLabel: 'Clean text',
  },
  {
    id: 'morse-code-translator',
    name: 'Morse-code translator',
    description:
      'Translate Latin letters and digits to International Morse code.',
    inputLabel: 'Text to translate',
    outputLabel: 'Morse code',
  },
  {
    id: 'nato-alphabet-translator',
    name: 'NATO alphabet translator',
    description:
      'Spell Latin letters and digits with the NATO phonetic alphabet.',
    inputLabel: 'Text to spell',
    outputLabel: 'Phonetic text',
  },
  {
    id: 'pig-latin-translator',
    name: 'Pig Latin translator',
    description: 'Convert simple English words to Pig Latin.',
    inputLabel: 'English text',
    outputLabel: 'Pig Latin',
  },
  {
    id: 'subtitles-text-cleaner',
    name: 'Subtitles text cleaner',
    description: 'Remove common SRT/VTT indexes, timestamps, and markup.',
    inputLabel: 'Subtitle text',
    outputLabel: 'Clean dialogue',
  },
  {
    id: 'transcript-formatter',
    name: 'Transcript formatter',
    description: 'Normalize transcript spacing while preserving speaker turns.',
    inputLabel: 'Transcript text',
    outputLabel: 'Formatted transcript',
  },
] as const;

const MORSE: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  0: '-----',
  1: '.----',
  2: '..---',
  3: '...--',
  4: '....-',
  5: '.....',
  6: '-....',
  7: '--...',
  8: '---..',
  9: '----.',
};

const NATO: Record<string, string> = {
  A: 'Alfa',
  B: 'Bravo',
  C: 'Charlie',
  D: 'Delta',
  E: 'Echo',
  F: 'Foxtrot',
  G: 'Golf',
  H: 'Hotel',
  I: 'India',
  J: 'Juliett',
  K: 'Kilo',
  L: 'Lima',
  M: 'Mike',
  N: 'November',
  O: 'Oscar',
  P: 'Papa',
  Q: 'Quebec',
  R: 'Romeo',
  S: 'Sierra',
  T: 'Tango',
  U: 'Uniform',
  V: 'Victor',
  W: 'Whiskey',
  X: 'X-ray',
  Y: 'Yankee',
  Z: 'Zulu',
  0: 'Zero',
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Niner',
};

// Placeholder copy is meant to stand in for real writing, so it has to vary:
// three identical paragraphs read as a stuck tool, not as filler, and they are
// useless for judging how a layout handles uneven text. The opening clause is
// the conventional one because that is what people check for.
const LOREM_OPENING =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const LOREM_WORDS = [
  'a',
  'ac',
  'accumsan',
  'ad',
  'aenean',
  'aliquam',
  'aliquet',
  'ante',
  'arcu',
  'at',
  'auctor',
  'augue',
  'blandit',
  'commodo',
  'condimentum',
  'congue',
  'consequat',
  'convallis',
  'cras',
  'cursus',
  'dapibus',
  'diam',
  'dictum',
  'dignissim',
  'donec',
  'dui',
  'egestas',
  'eget',
  'eleifend',
  'elementum',
  'enim',
  'erat',
  'eros',
  'est',
  'et',
  'etiam',
  'eu',
  'euismod',
  'facilisis',
  'fames',
  'faucibus',
  'felis',
  'fermentum',
  'feugiat',
  'fringilla',
  'fusce',
  'gravida',
  'habitant',
  'hendrerit',
  'iaculis',
  'id',
  'imperdiet',
  'in',
  'integer',
  'interdum',
  'ipsum',
  'justo',
  'lacinia',
  'lacus',
  'laoreet',
  'lectus',
  'leo',
  'libero',
  'ligula',
  'lorem',
  'luctus',
  'maecenas',
  'magna',
  'malesuada',
  'massa',
  'mattis',
  'mauris',
  'metus',
  'mi',
  'molestie',
  'mollis',
  'morbi',
  'nam',
  'nec',
  'neque',
  'nibh',
  'nisi',
  'nisl',
  'non',
  'nulla',
  'nullam',
  'nunc',
  'odio',
  'orci',
  'ornare',
  'pellentesque',
  'phasellus',
  'placerat',
  'porta',
  'porttitor',
  'posuere',
  'praesent',
  'pretium',
  'proin',
  'pulvinar',
  'purus',
  'quam',
  'quis',
  'quisque',
  'rhoncus',
  'risus',
  'rutrum',
  'sagittis',
  'sapien',
  'scelerisque',
  'sed',
  'sem',
  'semper',
  'sit',
  'sodales',
  'sollicitudin',
  'suscipit',
  'suspendisse',
  'tellus',
  'tempor',
  'tempus',
  'tincidunt',
  'tortor',
  'tristique',
  'turpis',
  'ullamcorper',
  'ultrices',
  'ultricies',
  'urna',
  'ut',
  'varius',
  'vehicula',
  'vel',
  'velit',
  'venenatis',
  'vestibulum',
  'vitae',
  'vivamus',
  'viverra',
  'volutpat',
  'vulputate',
] as const;

function loremPick(random: () => number) {
  return LOREM_WORDS[Math.floor(random() * LOREM_WORDS.length)]!;
}

function loremSentence(random: () => number) {
  const length = 6 + Math.floor(random() * 9);
  const words: string[] = Array.from({ length }, () => loremPick(random));
  // One comma in the longer sentences, never at either end, so the shape of
  // the text varies the way real prose does.
  if (length > 9) {
    const breakAt = 3 + Math.floor(random() * (length - 6));
    words[breakAt] = `${words[breakAt]},`;
  }
  const body = words.join(' ');
  return `${body.charAt(0).toUpperCase()}${body.slice(1)}.`;
}

function loremParagraph(random: () => number, opening: boolean) {
  const sentences = Array.from({ length: 3 + Math.floor(random() * 3) }, () =>
    loremSentence(random),
  );
  if (opening) sentences.unshift(LOREM_OPENING);
  return sentences.join(' ');
}
const RANDOM_WORDS = [
  'amber',
  'bridge',
  'canvas',
  'delta',
  'ember',
  'forest',
  'harbor',
  'indigo',
  'jasmine',
  'kindle',
  'lunar',
  'meadow',
  'north',
  'orbit',
  'pebble',
  'quiet',
  'river',
  'signal',
  'timber',
  'violet',
];

function graphemes(value: string) {
  const Segmenter = Intl.Segmenter;
  if (!Segmenter) return Array.from(value);
  return Array.from(
    new Segmenter(undefined, { granularity: 'grapheme' }).segment(value),
    (part) => part.segment,
  );
}

function words(value: string) {
  const matches = value.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu);
  return matches ?? [];
}

function lines(value: string) {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
}

function clampCount(value: number | undefined, maximum = 100) {
  const count = value ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > maximum) {
    throw new Error(`Choose a whole number from 1 to ${maximum}.`);
  }
  return count;
}

function normalizedLetters(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLocaleLowerCase();
}

function smartQuotes(value: string) {
  let openDouble = true;
  let openSingle = true;
  return value
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
    .replace(/"/gu, () => {
      const result = openDouble ? '“' : '”';
      openDouble = !openDouble;
      return result;
    })
    .replace(/(^|[\s([{])'/gu, (_, prefix: string) => {
      openSingle = false;
      return `${prefix}‘`;
    })
    .replace(/'/gu, () => {
      const result = openSingle ? '‘' : '’';
      openSingle = !openSingle;
      return result;
    });
}

function pigLatinWord(word: string) {
  const match = /^(\p{L}+)(.*)$/u.exec(word);
  if (!match) return word;
  const source = match[1];
  const suffix = match[2];
  const lower = source.toLocaleLowerCase();
  const converted = /^[aeiou]/u.test(lower)
    ? `${lower}way`
    : `${lower.replace(/^([^aeiou]*)(.*)$/u, '$2$1')}ay`;
  const cased = /^\p{Lu}/u.test(source)
    ? converted[0].toLocaleUpperCase() + converted.slice(1)
    : converted;
  return cased + suffix;
}

export function runTextOperation(
  operation: TextOperationId,
  input: string,
  options: TextOperationOptions = {},
  random: () => number = Math.random,
): TextOperationResult {
  const operationDefinition = TEXT_OPERATIONS.find(
    (item) => item.id === operation,
  );
  if (!operationDefinition)
    throw new Error('Choose a supported text operation.');
  if (operationDefinition.needsInput !== false && !input)
    throw new Error('Enter some text first.');

  const wordList = words(input);
  let output = '';
  let summary = operationDefinition.outputLabel;

  switch (operation) {
    case 'word-counter':
      output = String(wordList.length);
      summary = `${wordList.length.toLocaleString()} words counted`;
      break;
    case 'character-counter': {
      const characters = graphemes(input).length;
      const withoutSpaces = graphemes(input.replace(/\s/gu, '')).length;
      output = `Characters: ${characters.toLocaleString()}\nWithout spaces: ${withoutSpaces.toLocaleString()}`;
      summary = `${characters.toLocaleString()} characters counted`;
      break;
    }
    case 'sentence-counter': {
      const count = (input.trim().match(/[^.!?]+(?:[.!?]+|$)/gu) ?? []).filter(
        (item) => item.trim(),
      ).length;
      output = String(count);
      summary = `${count.toLocaleString()} sentences estimated`;
      break;
    }
    case 'paragraph-counter': {
      const count = input.trim()
        ? input
            .trim()
            .split(/\n\s*\n/gu)
            .filter((part) => part.trim()).length
        : 0;
      output = String(count);
      summary = `${count.toLocaleString()} paragraphs counted`;
      break;
    }
    case 'reading-time': {
      const minutes = wordList.length / 225;
      const seconds = Math.max(1, Math.round(minutes * 60));
      output =
        seconds < 60
          ? `${seconds} seconds`
          : `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
      summary = `${wordList.length.toLocaleString()} words at 225 wpm`;
      break;
    }
    case 'slug-generator':
      output = input
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/gu, '-')
        .replace(/^-+|-+$/gu, '');
      summary = `${output.length.toLocaleString()}-character slug created`;
      break;
    case 'whitespace-remover':
      output = input.trim().replace(/\s+/gu, ' ');
      break;
    case 'blank-line-remover':
      output = lines(input)
        .filter((line) => line.trim())
        .join('\n');
      break;
    case 'duplicate-line-remover':
      output = [...new Set(lines(input))].join('\n');
      break;
    case 'line-sorter':
      output = lines(input)
        .toSorted(
          (a, b) =>
            a.localeCompare(b) *
            (options.sortDirection === 'descending' ? -1 : 1),
        )
        .join('\n');
      break;
    case 'line-shuffler': {
      const shuffled = [...lines(input)];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const target = Math.floor(random() * (index + 1));
        [shuffled[index], shuffled[target]] = [
          shuffled[target],
          shuffled[index],
        ];
      }
      output = shuffled.join('\n');
      break;
    }
    case 'line-number-adder':
      output = lines(input)
        .map(
          (line, index) =>
            `${String(index + 1).padStart(String(lines(input).length).length, '0')}. ${line}`,
        )
        .join('\n');
      break;
    case 'text-reverser':
      output = graphemes(input).reverse().join('');
      break;
    case 'text-repeater': {
      const count = clampCount(options.repeatCount);
      output = Array.from({ length: count }, () => input).join('\n');
      summary = `Text repeated ${count.toLocaleString()} times`;
      break;
    }
    case 'find-and-replace': {
      if (!options.find) throw new Error('Enter the text to find.');
      output = options.caseSensitive
        ? input.replaceAll(options.find, options.replacement ?? '')
        : input.replace(
            new RegExp(
              options.find.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'),
              'giu',
            ),
            options.replacement ?? '',
          );
      break;
    }
    case 'regex-replace': {
      if (!options.find) throw new Error('Enter a regular expression.');
      let expression: RegExp;
      try {
        expression = new RegExp(
          options.find,
          options.caseSensitive ? 'gu' : 'giu',
        );
      } catch {
        throw new Error('Enter a valid JavaScript regular expression.');
      }
      output = input.replace(expression, options.replacement ?? '');
      break;
    }
    case 'text-splitter':
      if (!options.separator) throw new Error('Enter a separator.');
      output = input.split(options.separator).join('\n');
      summary = `${input.split(options.separator).length.toLocaleString()} parts created`;
      break;
    case 'text-deduplicator':
      output = [...new Set(input.split(/\s+/gu).filter(Boolean))].join(' ');
      break;
    case 'lorem-ipsum-generator': {
      const count = clampCount(options.count, 20);
      output = Array.from({ length: count }, (_unused, index) =>
        loremParagraph(random, index === 0),
      ).join('\n\n');
      summary = `${count.toLocaleString()} placeholder ${count === 1 ? 'paragraph' : 'paragraphs'} generated`;
      break;
    }
    case 'random-word-generator': {
      const count = clampCount(options.count, 100);
      output = Array.from(
        { length: count },
        () => RANDOM_WORDS[Math.floor(random() * RANDOM_WORDS.length)],
      ).join('\n');
      summary = `${count.toLocaleString()} random ${count === 1 ? 'word' : 'words'} generated`;
      break;
    }
    case 'anagram-finder': {
      if (!options.candidates?.trim())
        throw new Error('Paste candidate words, one per line.');
      const signature = Array.from(normalizedLetters(input)).sort().join('');
      const matches = lines(options.candidates)
        .map((item) => item.trim())
        .filter(
          (item) =>
            item &&
            normalizedLetters(item) !== normalizedLetters(input) &&
            Array.from(normalizedLetters(item)).sort().join('') === signature,
        );
      output = matches.join('\n') || 'No exact anagrams found.';
      summary = `${matches.length.toLocaleString()} exact ${matches.length === 1 ? 'match' : 'matches'}`;
      break;
    }
    case 'palindrome-checker': {
      const normalized = normalizedLetters(input);
      const yes =
        normalized.length > 0 &&
        normalized === Array.from(normalized).reverse().join('');
      output = yes
        ? 'Yes — this is a palindrome.'
        : 'No — this is not a palindrome.';
      summary = `${graphemes(normalized).length.toLocaleString()} comparable characters checked`;
      break;
    }
    case 'smart-quote-converter':
      output = smartQuotes(input);
      break;
    case 'unicode-normalizer':
      output = input.normalize(options.normalization ?? 'NFC');
      summary = `${options.normalization ?? 'NFC'} normalization applied`;
      break;
    case 'diacritic-remover':
      output = input.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
      break;
    case 'emoji-remover':
      output = input
        .replace(
          /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu,
          '',
        )
        .replace(/[ \t]{2,}/gu, ' ');
      break;
    case 'emoji-extractor':
      output = (
        input.match(
          /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu,
        ) ?? []
      ).join('\n');
      summary = `${output ? lines(output).length : 0} emoji sequences extracted`;
      break;
    case 'punctuation-cleaner':
      output = input
        .replace(/\p{P}+/gu, '')
        .replace(/[ \t]{2,}/gu, ' ')
        .trim();
      break;
    case 'morse-code-translator':
      output = input
        .toLocaleUpperCase()
        .split(/\s+/gu)
        .map((word) =>
          Array.from(word)
            .map((character) => MORSE[character] ?? `[${character}]`)
            .join(' '),
        )
        .join(' / ');
      break;
    case 'nato-alphabet-translator':
      output = Array.from(input.toLocaleUpperCase())
        .map((character) =>
          character === ' ' ? '/' : (NATO[character] ?? `[${character}]`),
        )
        .join(' ');
      break;
    case 'pig-latin-translator':
      output = input
        .split(/(\s+)/gu)
        .map((part) => (/^\p{L}/u.test(part) ? pigLatinWord(part) : part))
        .join('');
      break;
    case 'subtitles-text-cleaner':
      output = lines(input)
        .filter(
          (line) =>
            !/^\s*(?:WEBVTT|\d+|\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->)/u.test(line),
        )
        .map((line) => line.replace(/<[^>]*>/gu, '').trim())
        .filter(Boolean)
        .join('\n');
      break;
    case 'transcript-formatter':
      output = lines(input)
        .map((line) => line.trim().replace(/[ \t]+/gu, ' '))
        .filter((line, index, all) => line || (index > 0 && all[index - 1]))
        .join('\n');
      break;
  }

  return {
    output,
    summary:
      summary === operationDefinition.outputLabel
        ? `${operationDefinition.name} completed`
        : summary,
  };
}
