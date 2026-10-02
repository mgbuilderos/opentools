import { TABLE_FORMAT_LABELS } from './table-formats';

/**
 * Which tools another website may frame, and the one place that answers it.
 *
 * `app/embed/[tool]/page.tsx`, the snippet page at `app/embed/page.tsx`, the
 * sitemap and the tests all read this list, so a tool is embeddable exactly
 * when it appears here -- there is no second switch to forget.
 *
 * ## The rule for adding one, and it is narrow on purpose
 *
 * An embeddable tool must be **text in, text out**. No file input, no
 * dropzone, no camera, no clipboard read, no support or donation prompt. That
 * is not a style preference: an embed runs inside a page we do not control and
 * cannot see, and a file picker in that position asks a visitor to hand a
 * document to a frame whose surrounding page may be misrepresenting it. Text a
 * visitor pastes is text they chose to paste after reading our own visible
 * header. See `decisions/ADR-019-embed-frame-ancestors.md` §4.
 *
 * `lib/embed/embeddable-tools.test.ts` fails if an entry names a component
 * outside the allowed set, so widening this is a deliberate code change and
 * not an oversight.
 */
export interface EmbeddableTool {
  /** URL segment: the tool is served at `/embed/<slug>`. */
  slug: string;
  /** Shown in the embed's own header, and in the snippet page's list. */
  name: string;
  /** One line, for the snippet page. Not a page description. */
  summary: string;
  /**
   * The page the attribution link points at. This is the whole economic point
   * of the programme: every embed is a permanent, contextual link to a page we
   * want to rank. It must be a real, live, canonical route.
   */
  canonicalPath: string;
  /** Default `height` in the iframe snippet, in CSS pixels. */
  defaultHeight: number;
}

/**
 * One height for every text-operation embed, because they are one shape: a
 * textarea, an output box and a copy button. A per-tool number here would be a
 * number somebody invented, and `embed-entry-point.test.ts` pins them to this.
 */
const TEXT_OPERATION_HEIGHT = 440;

export const EMBEDDABLE_TOOLS: readonly EmbeddableTool[] = [
  {
    slug: 'table-converter',
    name: 'Table Converter',
    summary: `Paste a table in any of ${
      Object.keys(TABLE_FORMAT_LABELS).length
    } notations and get it back in any other — LaTeX booktabs, Markdown, CSV, SQL and the rest. No upload.`,
    canonicalPath: '/latex/table-generator',
    defaultHeight: 620,
  },
  /*
   * EVERY option-free operation in `TEXT_OPERATIONS`, served by the one generic
   * `EmbedTextOperation` component. `name` and `summary` are that operation's
   * own `name` and `description`, copied rather than rewritten, and
   * `embed-entry-point.test.ts` fails on any drift between the two files --
   * a site owner deciding whether to embed something must read the same
   * sentence as a visitor deciding whether to use it.
   *
   * WHY THE LIST IS LITERAL RATHER THAN DERIVED. Importing `TEXT_OPERATIONS`
   * here would pull `lib/tools/text-workbench.ts` into every page on the site:
   * `components/embed-this-tool.tsx` imports this file and `AppShell` renders
   * it everywhere. The register stays plain data and the test does the
   * comparing, which costs nothing at runtime.
   *
   * An operation with an `optionKind` is NOT eligible and is absent here --
   * see the note in `components/embed-text-operation.tsx`.
   */
  {
    slug: 'word-counter',
    name: 'Word counter',
    summary:
      'Count the words in a passage using Unicode letter and digit runs, so accented words count once and a contraction such as don’t stays a single word.',
    canonicalPath: '/text/word-counter',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'character-counter',
    name: 'Character counter',
    summary: 'Count Unicode characters, including and excluding spaces.',
    canonicalPath: '/text/character-counter',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'sentence-counter',
    name: 'Sentence counter',
    summary: 'Estimate sentence boundaries from terminal punctuation.',
    canonicalPath: '/text/sentence-counter',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'paragraph-counter',
    name: 'Paragraph counter',
    summary:
      'Count the paragraphs in a draft, where a paragraph is any block of text separated by a blank line. Blocks holding only whitespace are left out of the total.',
    canonicalPath: '/text/paragraph-counter',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'reading-time',
    name: 'Reading time calculator',
    summary:
      'Estimate how long a draft takes to read at 225 words per minute. Anything under a minute is reported in seconds, longer pieces as minutes and seconds.',
    canonicalPath: '/text/reading-time',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'slug-generator',
    name: 'Slug generator',
    summary:
      'Turn a headline into a lowercase URL slug: accents are stripped back to plain ASCII, every other character becomes a hyphen, and stray hyphens are trimmed.',
    canonicalPath: '/text/slug-generator',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'whitespace-remover',
    name: 'Whitespace remover',
    summary:
      'Collapse every run of spaces, tabs and line breaks into one space and trim the ends, turning text copied out of a PDF back into a single tidy line.',
    canonicalPath: '/text/whitespace-remover',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'blank-line-remover',
    name: 'Blank-line remover',
    summary:
      'Strip the empty and whitespace-only lines out of a pasted list or block of text. Line endings are normalized first, so Windows CRLF files clean up too.',
    canonicalPath: '/text/blank-line-remover',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'duplicate-line-remover',
    name: 'Duplicate-line remover',
    summary:
      'Keep only the first appearance of each exact line and drop every later repeat. Matching is literal, so case and trailing spaces both count as a difference.',
    canonicalPath: '/text/duplicate-line-remover',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'line-shuffler',
    name: 'Line shuffler',
    summary:
      'Put a list of lines into random order in your browser. Useful for drawing names, mixing up quiz questions, or reordering rows of sample data before a test.',
    canonicalPath: '/text/line-shuffler',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'line-number-adder',
    name: 'Line-number adder',
    summary:
      'Put a number in front of every line, zero-padded to the width of the largest number so the numbers stay aligned when you paste the list somewhere else.',
    canonicalPath: '/text/line-number-adder',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'text-reverser',
    name: 'Text reverser',
    summary:
      'Reverse text by user-perceived character, so an accented letter, an emoji or a flag sequence stays whole instead of breaking into separate pieces.',
    canonicalPath: '/text/text-reverser',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'text-deduplicator',
    name: 'Text deduplicator',
    summary:
      'Remove repeated words from a whitespace-separated list, keeping the first of each. Matching is exact, so two spellings that differ in case both survive.',
    canonicalPath: '/text/text-deduplicator',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'palindrome-checker',
    name: 'Palindrome checker',
    summary: 'Check letters and numbers while ignoring case and punctuation.',
    canonicalPath: '/text/palindrome-checker',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'smart-quote-converter',
    name: 'Smart-quote converter',
    summary: 'Convert straight quotation marks to typographic quotes.',
    canonicalPath: '/text/smart-quote-converter',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'diacritic-remover',
    name: 'Diacritic remover',
    summary: 'Remove combining diacritic marks after Unicode decomposition.',
    canonicalPath: '/text/diacritic-remover',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'emoji-remover',
    name: 'Emoji remover',
    summary:
      'Take the emoji out of a caption or a message, including the joined multi-part sequences, then tidy up the double spaces that removing them leaves behind.',
    canonicalPath: '/text/emoji-remover',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'emoji-extractor',
    name: 'Emoji extractor',
    summary: 'List extended pictographic characters in reading order.',
    canonicalPath: '/text/emoji-extractor',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'punctuation-cleaner',
    name: 'Punctuation cleaner',
    summary: 'Remove Unicode punctuation and tidy remaining whitespace.',
    canonicalPath: '/text/punctuation-cleaner',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'morse-code-translator',
    name: 'Morse-code translator',
    summary: 'Translate Latin letters and digits to International Morse code.',
    canonicalPath: '/text/morse-code-translator',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'nato-alphabet-translator',
    name: 'NATO alphabet translator',
    summary: 'Spell Latin letters and digits with the NATO phonetic alphabet.',
    canonicalPath: '/text/nato-alphabet-translator',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'pig-latin-translator',
    name: 'Pig Latin translator',
    summary:
      'Convert English text to Pig Latin: a word starting with a vowel gains way, and any other word moves its leading consonants to the end and gains ay.',
    canonicalPath: '/text/pig-latin-translator',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'subtitles-text-cleaner',
    name: 'Subtitles text cleaner',
    summary: 'Remove common SRT/VTT indexes, timestamps, and markup.',
    canonicalPath: '/text/subtitles-text-cleaner',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
  {
    slug: 'transcript-formatter',
    name: 'Transcript formatter',
    summary: 'Normalize transcript spacing while preserving speaker turns.',
    canonicalPath: '/text/transcript-formatter',
    defaultHeight: TEXT_OPERATION_HEIGHT,
  },
] as const;

export function embeddableTool(slug: string): EmbeddableTool | undefined {
  return EMBEDDABLE_TOOLS.find((tool) => tool.slug === slug);
}

/**
 * The snippet a site owner copies. A plain `<iframe>` and nothing else -- no
 * script tag, so there is nothing for us to change under an embedder later and
 * nothing of theirs for us to read. `loading="lazy"` keeps an embed off the
 * critical path of the page hosting it, which is the difference between being
 * kept and being removed for hurting a Core Web Vitals score.
 *
 * The `title` is not decoration: a frame with no accessible name is an
 * unlabelled landmark to a screen reader, and embedders will not add one.
 */
export function embedSnippet(tool: EmbeddableTool, origin: string): string {
  return [
    `<iframe src="${origin}/embed/${tool.slug}"`,
    `        title="${tool.name} — OpenTools"`,
    `        width="100%" height="${tool.defaultHeight}"`,
    '        style="border:1px solid #e5e7eb;border-radius:12px;max-width:100%"',
    '        loading="lazy"></iframe>',
  ].join('\n');
}

/**
 * The embeddable tool whose own page this is, or `undefined`.
 *
 * WHY THIS EXISTS. Until 2026-09-30 the embed programme had no entry point:
 * `/embed` was live, it was in the sitemap, and **not one of the 1,031 pages on
 * the site linked to it**. Measured that day against production — `curl` of
 * `/pdf/redact`, `/data/csv-join` and `/math/median-calculator` returned no
 * `/embed` link at all, and Cloudflare recorded a single request to `/embed` in
 * 24 hours. A channel whose whole economics is other people's sites carrying a
 * permanent link back cannot start from a page nobody can reach.
 *
 * Keyed on the pathname rather than a tool id on purpose: `canonicalPath` is
 * already the field this list guarantees is "a real, live, canonical route",
 * so there is no second mapping to keep in step and nothing to forget when a
 * tool is added. `components/embed-this-tool.tsx` is the only caller.
 *
 * EXACT MATCH ONLY, including no trailing slash and no locale prefix. A
 * localised edition at `/de/...` deliberately does not offer this: the snippet
 * page and the embed header are English, so sending a German reader there would
 * be a worse experience than not offering it. `embed-entry-point.test.ts` pins
 * both halves of that.
 */
export function embeddableToolByPath(
  pathname: string,
): EmbeddableTool | undefined {
  return EMBEDDABLE_TOOLS.find((tool) => tool.canonicalPath === pathname);
}
