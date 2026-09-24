// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
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
        description:
          'Count the words in a passage using Unicode letter and digit runs, so accented words count once and a contraction such as don’t stays a single word.',
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
        description:
          'Count the paragraphs in a draft, where a paragraph is any block of text separated by a blank line. Blocks holding only whitespace are left out of the total.',
        href: '/text/workbench?tool=paragraph-counter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:reading-time',
        name: 'Reading time calculator',
        description:
          'Estimate how long a draft takes to read at 225 words per minute. Anything under a minute is reported in seconds, longer pieces as minutes and seconds.',
        href: '/text/workbench?tool=reading-time',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:slug-generator',
        name: 'Slug generator',
        description:
          'Turn a headline into a lowercase URL slug: accents are stripped back to plain ASCII, every other character becomes a hyphen, and stray hyphens are trimmed.',
        href: '/text/workbench?tool=slug-generator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:whitespace-remover',
        name: 'Whitespace remover',
        description:
          'Collapse every run of spaces, tabs and line breaks into one space and trim the ends, turning text copied out of a PDF back into a single tidy line.',
        href: '/text/workbench?tool=whitespace-remover',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:blank-line-remover',
        name: 'Blank-line remover',
        description:
          'Strip the empty and whitespace-only lines out of a pasted list or block of text. Line endings are normalized first, so Windows CRLF files clean up too.',
        href: '/text/workbench?tool=blank-line-remover',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:duplicate-line-remover',
        name: 'Duplicate-line remover',
        description:
          'Keep only the first appearance of each exact line and drop every later repeat. Matching is literal, so case and trailing spaces both count as a difference.',
        href: '/text/workbench?tool=duplicate-line-remover',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:line-sorter',
        name: 'Line sorter',
        description:
          'Sort a list of lines into ascending or descending order with locale-aware comparison, so accented words land where a reader would expect to find them.',
        href: '/text/workbench?tool=line-sorter',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:line-shuffler',
        name: 'Line shuffler',
        description:
          'Put a list of lines into random order in your browser. Useful for drawing names, mixing up quiz questions, or reordering rows of sample data before a test.',
        href: '/text/workbench?tool=line-shuffler',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:line-number-adder',
        name: 'Line-number adder',
        description:
          'Put a number in front of every line, zero-padded to the width of the largest number so the numbers stay aligned when you paste the list somewhere else.',
        href: '/text/workbench?tool=line-number-adder',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:text-reverser',
        name: 'Text reverser',
        description:
          'Reverse text by user-perceived character, so an accented letter, an emoji or a flag sequence stays whole instead of breaking into separate pieces.',
        href: '/text/workbench?tool=text-reverser',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:text-repeater',
        name: 'Text repeater',
        description:
          'Repeat a word, a line or a whole block of text between 1 and 100 times, each copy on its own line. Handy for test data and for filling out a draft layout.',
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
        description:
          'Replace every match of a JavaScript regular expression, with capture groups available in the replacement and a switch for matching upper and lower case.',
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
        description:
          'Remove repeated words from a whitespace-separated list, keeping the first of each. Matching is exact, so two spellings that differ in case both survive.',
        href: '/text/workbench?tool=text-deduplicator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:lorem-ipsum-generator',
        name: 'Lorem ipsum generator',
        description:
          'Generate 1 to 20 paragraphs of placeholder text, each three to five sentences long, with the familiar lorem ipsum opening line on the first paragraph.',
        href: '/text/workbench?tool=lorem-ipsum-generator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:random-word-generator',
        name: 'Random word generator',
        description:
          'Generate 1 to 100 random words, one per line, drawn from a built-in list of 20 plain English words. Nothing needs pasting in to get a list back out.',
        href: '/text/workbench?tool=random-word-generator',
        workspaceId: 'text-workbench',
      },
      {
        id: 'text-workbench:anagram-finder',
        name: 'Anagram finder',
        description:
          'Paste a word and a list of candidates, one per line, to see which are exact anagrams. Case, accents and punctuation are ignored, and the word itself is skipped.',
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
        description:
          'Convert text to NFC, NFD, NFKC or NFKD normalization, for when the same accented word compares as unequal between two systems or two pasted files.',
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
        description:
          'Take the emoji out of a caption or a message, including the joined multi-part sequences, then tidy up the double spaces that removing them leaves behind.',
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
        description:
          'Convert English text to Pig Latin: a word starting with a vowel gains way, and any other word moves its leading consonants to the end and gains ay.',
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
