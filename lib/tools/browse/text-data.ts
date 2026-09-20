// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'text-data',
    title: 'Text & writing',
    description: 'Case conversion, counting, cleaning, and writing tools.',
    destinations: [
      {
        id: 'text-case-converter',
        name: 'Text case converter',
        description: 'Change text to sentence, title, upper, or lower case.',
        href: '/text/case-converter',
        workspaceId: 'text-case-converter',
      },
      {
        id: 'text-workbench:word-counter',
        name: 'Word counter',
        description: 'Count words using Unicode-aware word boundaries.',
        href: '/text/workbench?tool=word-counter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:character-counter',
        name: 'Character counter',
        description:
          'Count Unicode characters, including and excluding spaces.',
        href: '/text/workbench?tool=character-counter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:sentence-counter',
        name: 'Sentence counter',
        description: 'Estimate sentence boundaries from terminal punctuation.',
        href: '/text/workbench?tool=sentence-counter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:paragraph-counter',
        name: 'Paragraph counter',
        description: 'Count non-empty blocks separated by blank lines.',
        href: '/text/workbench?tool=paragraph-counter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:reading-time',
        name: 'Reading time calculator',
        description: 'Estimate reading time at 225 words per minute.',
        href: '/text/workbench?tool=reading-time',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:slug-generator',
        name: 'Slug generator',
        description: 'Create a lowercase, ASCII-friendly URL slug.',
        href: '/text/workbench?tool=slug-generator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:whitespace-remover',
        name: 'Whitespace remover',
        description: 'Collapse whitespace runs to a single space.',
        href: '/text/workbench?tool=whitespace-remover',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:blank-line-remover',
        name: 'Blank-line remover',
        description: 'Remove empty or whitespace-only lines.',
        href: '/text/workbench?tool=blank-line-remover',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:duplicate-line-remover',
        name: 'Duplicate-line remover',
        description: 'Keep the first occurrence of every exact line.',
        href: '/text/workbench?tool=duplicate-line-remover',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:line-sorter',
        name: 'Line sorter',
        description: 'Sort lines with locale-aware comparison.',
        href: '/text/workbench?tool=line-sorter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:line-shuffler',
        name: 'Line shuffler',
        description: 'Randomize line order with browser randomness.',
        href: '/text/workbench?tool=line-shuffler',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:line-number-adder',
        name: 'Line-number adder',
        description: 'Prefix every line with a stable line number.',
        href: '/text/workbench?tool=line-number-adder',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:text-reverser',
        name: 'Text reverser',
        description: 'Reverse user-perceived Unicode characters.',
        href: '/text/workbench?tool=text-reverser',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:text-repeater',
        name: 'Text repeater',
        description: 'Repeat text up to 100 times.',
        href: '/text/workbench?tool=text-repeater',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:find-and-replace',
        name: 'Find and replace',
        description: 'Replace literal text without regular-expression rules.',
        href: '/text/workbench?tool=find-and-replace',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:regex-replace',
        name: 'Regex replace',
        description: 'Replace JavaScript regular-expression matches.',
        href: '/text/workbench?tool=regex-replace',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:text-splitter',
        name: 'Text splitter',
        description: 'Split text on a literal delimiter, one part per line.',
        href: '/text/workbench?tool=text-splitter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:text-deduplicator',
        name: 'Text deduplicator',
        description: 'Remove duplicate whitespace-delimited tokens.',
        href: '/text/workbench?tool=text-deduplicator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:lorem-ipsum-generator',
        name: 'Lorem ipsum generator',
        description: 'Generate local placeholder paragraphs.',
        href: '/text/workbench?tool=lorem-ipsum-generator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:random-word-generator',
        name: 'Random word generator',
        description: 'Pick words from a small built-in neutral list.',
        href: '/text/workbench?tool=random-word-generator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:anagram-finder',
        name: 'Anagram finder',
        description: 'Find exact anagrams in a list you provide.',
        href: '/text/workbench?tool=anagram-finder',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:palindrome-checker',
        name: 'Palindrome checker',
        description:
          'Check letters and numbers while ignoring case and punctuation.',
        href: '/text/workbench?tool=palindrome-checker',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:smart-quote-converter',
        name: 'Smart-quote converter',
        description: 'Convert straight quotation marks to typographic quotes.',
        href: '/text/workbench?tool=smart-quote-converter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:unicode-normalizer',
        name: 'Unicode normalizer',
        description: 'Normalize text to NFC, NFD, NFKC, or NFKD.',
        href: '/text/workbench?tool=unicode-normalizer',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:diacritic-remover',
        name: 'Diacritic remover',
        description:
          'Remove combining diacritic marks after Unicode decomposition.',
        href: '/text/workbench?tool=diacritic-remover',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:emoji-remover',
        name: 'Emoji remover',
        description: 'Remove extended pictographic characters.',
        href: '/text/workbench?tool=emoji-remover',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:emoji-extractor',
        name: 'Emoji extractor',
        description: 'List extended pictographic characters in reading order.',
        href: '/text/workbench?tool=emoji-extractor',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:punctuation-cleaner',
        name: 'Punctuation cleaner',
        description:
          'Remove Unicode punctuation and tidy remaining whitespace.',
        href: '/text/workbench?tool=punctuation-cleaner',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:morse-code-translator',
        name: 'Morse-code translator',
        description:
          'Translate Latin letters and digits to International Morse code.',
        href: '/text/workbench?tool=morse-code-translator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:nato-alphabet-translator',
        name: 'NATO alphabet translator',
        description:
          'Spell Latin letters and digits with the NATO phonetic alphabet.',
        href: '/text/workbench?tool=nato-alphabet-translator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:pig-latin-translator',
        name: 'Pig Latin translator',
        description: 'Convert simple English words to Pig Latin.',
        href: '/text/workbench?tool=pig-latin-translator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:subtitles-text-cleaner',
        name: 'Subtitles text cleaner',
        description: 'Remove common SRT/VTT indexes, timestamps, and markup.',
        href: '/text/workbench?tool=subtitles-text-cleaner',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:transcript-formatter',
        name: 'Transcript formatter',
        description:
          'Normalize transcript spacing while preserving speaker turns.',
        href: '/text/workbench?tool=transcript-formatter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'writing-workbench:text-editor',
        name: 'Plain-text editor & exporter',
        description:
          'Normalize pasted text to UTF-8 LF line endings and download it.',
        href: '/text/writing?tool=text-editor',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:markdown-editor',
        name: 'Markdown editor & exporter',
        description: 'Edit non-empty Markdown and download a UTF-8 file.',
        href: '/text/writing?tool=markdown-editor',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:html-to-markdown',
        name: 'HTML to Markdown',
        description:
          'Convert common semantic HTML tags into readable Markdown.',
        href: '/text/writing?tool=html-to-markdown',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:markdown-to-html',
        name: 'Markdown to HTML',
        description: 'Convert a safe common Markdown subset to escaped HTML.',
        href: '/text/writing?tool=markdown-to-html',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:text-diff',
        name: 'Text diff',
        description:
          'Create a bounded line-level longest-common-subsequence diff for text or code.',
        href: '/text/writing?tool=text-diff',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:text-merge',
        name: 'Text merge',
        description:
          'Join up to 1,000 supplied text blocks with an explicit separator.',
        href: '/text/writing?tool=text-merge',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:spelling-variant-converter',
        name: 'US/UK spelling converter',
        description:
          'Convert a disclosed built-in list of common US and UK spelling variants.',
        href: '/text/writing?tool=spelling-variant-converter',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:braille-translator',
        name: 'Basic Braille translator',
        description:
          'Translate basic Latin letters, digits, spaces, and punctuation to Unicode Braille.',
        href: '/text/writing?tool=braille-translator',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:rot-cipher',
        name: 'ROT cipher',
        description:
          'Rotate Latin letters by a chosen value while preserving case.',
        href: '/text/writing?tool=rot-cipher',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:caesar-cipher',
        name: 'Caesar cipher',
        description:
          'Encode or decode Latin letters with an explicit Caesar shift.',
        href: '/text/writing?tool=caesar-cipher',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:vigenere-cipher',
        name: 'Vigenère cipher',
        description:
          'Encode or decode Latin letters using a supplied alphabetic key.',
        href: '/text/writing?tool=vigenere-cipher',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:text-summarization-workspace',
        name: 'Extractive text summarizer',
        description:
          'Rank sentences by local word frequency and preserve selected sentence order.',
        href: '/text/writing?tool=text-summarization-workspace',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:outline-builder',
        name: 'Outline builder',
        description:
          'Convert explicit level/title rows into a Markdown outline.',
        href: '/text/writing?tool=outline-builder',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:prompt-template-builder',
        name: 'Prompt-template builder',
        description:
          'Structure supplied role, task, context, constraints, and output requirements.',
        href: '/text/writing?tool=prompt-template-builder',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:email-signature-generator',
        name: 'Email-signature generator',
        description:
          'Generate a minimal escaped HTML email signature from supplied contact facts.',
        href: '/text/writing?tool=email-signature-generator',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:citation-text-generator',
        name: 'Citation text generator',
        description:
          'Assemble supplied citation facts into a basic text pattern.',
        href: '/text/writing?tool=citation-text-generator',
        workspaceId: 'writing-workbench',
      },
      {
        id: 'writing-workbench:markdown-to-pdf-doc',
        name: 'Markdown to print & PDF document formatter',
        description:
          'Transform raw Markdown into a beautifully typeset, printable HTML document with page headers, footers, and print styles.',
        href: '/text/writing?tool=markdown-to-pdf-doc',
        workspaceId: 'writing-workbench',
      },
    ],
  },
];
