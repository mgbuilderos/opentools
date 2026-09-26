/**
 * THE WORDS PEOPLE TYPE, AGAINST THE WORDS THE CATALOGUE USES.
 *
 * Most of the matching needs nothing from this file. A tool's index entry
 * already carries its description, its hand-written aliases and its
 * search-result copy, so "strip exif" finds the EXIF scrubber and "heic" finds
 * the HEIC converter without help.
 *
 * What it cannot do is bridge a sentence that shares no word with any of them.
 * "Take my name out of it" contains neither "metadata" nor "EXIF" nor "author",
 * and it is the most common way somebody asks for exactly that. Each entry here
 * is one of those bridges, and nothing more: a phrase, the catalogue words it
 * means, and -- where the words alone would leave several tools tied -- the one
 * this site would send you to.
 *
 * RULES THIS FILE KEEPS.
 *
 * 1. A `prefer` href must be a live tool. `lexicon.test.ts` looks every one of
 *    them up in the index and fails if it is not there, so a renamed route
 *    cannot leave a phrase pointing at a 404.
 * 2. `terms` may only add words the catalogue really uses. They are searched
 *    for, so a word no tool has is a word that finds nothing.
 * 3. A `caveat` is for a tool that answers the words but not the expectation.
 *    The extractive summariser is the case that matters: it picks existing
 *    sentences and writes none, and somebody who typed "summarise this" is
 *    usually expecting the other thing.
 */
import type { SubjectKind } from './types';

export interface LexiconEntry {
  id: string;
  /** Lower-case phrases. A space matches any run of whitespace. */
  phrases: readonly string[];
  /**
   * Shapes `parse.ts` recognised, which are a phrasing too. A stated ceiling --
   * "under 2MB" -- is how people ask for something to be made smaller without
   * using any of the words for it, and it was the one sentence in the example on
   * the home page that nothing here matched.
   */
  signals?: { size?: true; dimensions?: true };
  /** Words that mean this bridge does not apply after all. */
  unless?: readonly string[];
  /** Catalogue words the phrase means. Added to the search, never shown. */
  terms: readonly string[];
  /**
   * The tool this phrasing should land on, when several would otherwise tie.
   * The first whose condition holds wins; an entry with no condition is the
   * fallback for the phrase.
   */
  prefer?: readonly {
    href: string;
    /** Only when the sentence is about this kind of thing. */
    subject?: SubjectKind;
    /** Only when the sentence states a size ceiling. */
    withSize?: true;
  }[];
  /** What the tool does not do, when the words promise more than it delivers. */
  caveat?: string;
}

export const LEXICON: readonly LexiconEntry[] = [
  {
    id: 'strip-identity',
    phrases: [
      'strip my name',
      'remove my name',
      'take my name out',
      'my name out of',
      'name out of it',
      'without my name',
      'who made it',
      'who wrote it',
      'my details',
      'personal info',
      'personal information',
      'identifying',
      'anonymise',
      'anonymize',
      'de identify',
      'scrub',
      'clean it up before sending',
      'before i send it',
      'hidden data',
    ],
    terms: ['metadata', 'exif', 'author', 'strip', 'remove'],
    prefer: [
      { href: '/image/metadata', subject: 'image' },
      { href: '/pdf/metadata', subject: 'pdf' },
      { href: '/documents/metadata', subject: 'text' },
    ],
  },
  {
    id: 'make-it-smaller',
    phrases: [
      'make it smaller',
      'make this smaller',
      'too big',
      'too large',
      'too heavy',
      'won t fit',
      'wont fit',
      'will not fit',
      'over the limit',
      'under the limit',
      'for email',
      'to email',
      'email attachment',
      'attachment limit',
      'make it lighter',
      'slim it down',
      'cut the size',
      'reduce the size',
      'shrink',
    ],
    signals: { size: true },
    terms: ['compress', 'smaller', 'size', 'reduce', 'optimize'],
    prefer: [
      // A stated ceiling is a different job from "make it smaller", and there is
      // a tool for exactly it: `/image/exact-size` hits a KB target instead of
      // guessing at a quality setting.
      { href: '/image/exact-size', subject: 'image', withSize: true },
      { href: '/pdf/compress', subject: 'pdf' },
      { href: '/image/optimize', subject: 'image' },
      { href: '/video/compress', subject: 'video' },
    ],
  },
  {
    /*
      A pair of dimensions is a request on its own: "make them 800x600" has no
      word in it that any tool uses, and it is unambiguous to a person.
    */
    id: 'resize-it',
    phrases: [
      'resize',
      'scale it',
      'scale them',
      'pixels wide',
      'px wide',
      'pixels tall',
      'thumbnail',
      'fit the dimensions',
      'change the dimensions',
    ],
    signals: { dimensions: true },
    terms: ['resize', 'dimension', 'width', 'height', 'scale', 'pixel'],
    prefer: [
      { href: '/image/optimize', subject: 'image' },
      { href: '/video/resize', subject: 'video' },
    ],
  },
  {
    id: 'black-it-out',
    phrases: [
      'black out',
      'blank out',
      'cover up',
      'censor',
      'hide the',
      'obscure',
      'cross out',
      'redact',
    ],
    terms: ['redact', 'mask', 'cover'],
    prefer: [{ href: '/pdf/redact', subject: 'pdf' }],
  },
  {
    id: 'read-the-text',
    phrases: [
      'read the text',
      'get the text out',
      'text out of',
      'copy the text',
      'type it up',
      'typed up',
      'make it searchable',
      'searchable',
      'can t select the text',
      'cant select the text',
      'it s a scan',
      'scanned',
    ],
    terms: ['ocr', 'text', 'extract', 'scan'],
    prefer: [
      { href: '/pdf/ocr', subject: 'pdf' },
      { href: '/image/to-text', subject: 'image' },
    ],
  },
  {
    id: 'put-them-together',
    phrases: [
      'put them together',
      'put it together',
      'into one file',
      'into one pdf',
      'into a single',
      'all in one file',
      'combine',
      'stitch',
      'glue',
      'append them',
      'back to back',
    ],
    // "Split the pdf into one file per page" contains "into one file", and the
    // merger was winning it outright. Splitting is the opposite job.
    unless: ['per page', 'each page', 'every page', 'per file'],
    terms: ['merge', 'join', 'combine'],
    prefer: [
      { href: '/pdf/merge', subject: 'pdf' },
      { href: '/video/merge', subject: 'video' },
      { href: '/audio/mp3-toolkit?tool=mp3-join', subject: 'audio' },
    ],
  },
  {
    id: 'break-it-up',
    phrases: [
      'break it up',
      'break this up',
      'split it',
      'separate the pages',
      'one file per page',
      'every page its own',
      'pull out page',
      'pull the pages',
      'just the first page',
      'just page',
    ],
    terms: ['split', 'extract', 'page', 'burst'],
    prefer: [{ href: '/pdf/extract-pages', subject: 'pdf' }],
  },
  {
    id: 'cut-out-the-background',
    phrases: [
      'cut out the background',
      'remove the background',
      'no background',
      'transparent background',
      'cut the subject out',
      'just the subject',
      'white background off',
    ],
    terms: ['background', 'remove', 'transparent'],
    prefer: [{ href: '/image/background-remover' }],
  },
  {
    id: 'lock-it',
    phrases: [
      'password protect',
      'put a password on',
      'lock it',
      'encrypt it',
      'keep it private on disk',
    ],
    terms: ['encrypt', 'protect', 'password', 'aes'],
    prefer: [
      // The PDF one is a kernel operation with no page of its own; the plan hands
      // it to the batch runner as a pipeline of one.
      { href: '/batch?tool=pdfcrypt-encrypt-r6', subject: 'pdf' },
      { href: '/file/file-encrypt' },
    ],
  },
  {
    /*
      Taking a password OFF is a different tool from putting one on, and the
      matcher cannot see the difference: both sentences are about passwords. Before
      this, "remove the password from this pdf" was answered with the AES-GCM
      encryptor -- the same subject, the opposite operation.
    */
    id: 'unlock-it',
    phrases: [
      'remove the password',
      'take the password off',
      'forgot the password',
      'unlock it',
      'unlock this',
      'i know the password',
      'decrypt',
    ],
    terms: ['unlock', 'decrypt', 'password'],
    prefer: [
      { href: '/batch?tool=pdfcrypt-decrypt', subject: 'pdf' },
      { href: '/file/file-decrypt' },
    ],
  },
  {
    id: 'rename-a-pile',
    phrases: [
      'rename them all',
      'rename everything',
      'rename all',
      'number them',
      'tidy the file names',
      'fix the file names',
      'consistent names',
    ],
    terms: ['rename', 'bulk', 'sequential', 'name'],
    prefer: [{ href: '/file/bulk-file-renamer' }],
  },
  {
    id: 'find-the-duplicates',
    phrases: [
      'find duplicates',
      'find the duplicates',
      'same file twice',
      'duplicate files',
      'remove duplicates',
      'deduplicate',
      'dedupe',
    ],
    terms: ['duplicate', 'deduplicator', 'finder'],
    prefer: [
      { href: '/file/duplicate-file-finder' },
      { href: '/data/csv-deduplicator', subject: 'table' },
    ],
  },
  {
    id: 'whole-folder',
    phrases: [
      'a whole folder',
      'the whole folder',
      'all of them',
      'all my files',
      'in bulk',
      'hundreds of',
      'thousands of',
      'batch',
      'one by one',
    ],
    terms: ['folder', 'batch', 'operation'],
    prefer: [{ href: '/batch' }],
  },
  {
    id: 'shorten-it',
    phrases: [
      'summarise',
      'summarize',
      'shorten it',
      'the gist',
      'tl dr',
      'tldr',
      'key points',
    ],
    terms: ['summarizer', 'extractive', 'sentence'],
    prefer: [{ href: '/text/text-summarization-workspace' }],
    caveat:
      'This picks the sentences that already carry the most of the text. It does not write new ones — nothing here can.',
  },
  {
    id: 'sign-it',
    phrases: [
      'sign it',
      'sign this',
      'add my signature',
      'fill and sign',
      'fill in the form',
      'fill the form',
    ],
    terms: ['sign', 'signature', 'fill', 'form'],
    prefer: [{ href: '/pdf/sign' }],
  },
  {
    id: 'stamp-it',
    phrases: [
      'add a watermark',
      'watermark it',
      'mark it draft',
      'mark as confidential',
      'stamp it',
    ],
    terms: ['watermark', 'stamp', 'draft'],
    prefer: [{ href: '/pdf/pdf-watermark', subject: 'pdf' }],
  },
  {
    /*
      Its own entry, not a branch of the watermark one. Both were here together
      and "merge these pdfs and add page numbers" came back with the watermarker:
      the subject was PDF either way, and the watermark candidate was the more
      specific of the two. Two intents in one entry cannot be told apart by the
      conditions on their destinations.
    */
    id: 'number-the-pages',
    phrases: ['add page numbers', 'number the pages', 'page numbers on'],
    terms: ['page', 'number'],
    prefer: [{ href: '/pdf/pdf-page-numbers' }],
  },
  {
    id: 'turn-it-sideways',
    phrases: [
      'turn it sideways',
      'it s upside down',
      'its upside down',
      'wrong way up',
      'wrong way round',
      'straighten it',
      'rotate it',
      'landscape',
      'portrait',
    ],
    terms: ['rotate', 'flip'],
    prefer: [
      { href: '/pdf/rotate-pdf', subject: 'pdf' },
      { href: '/video/rotate', subject: 'video' },
      { href: '/image/image-rotator', subject: 'image' },
    ],
  },
  {
    id: 'count-the-words',
    phrases: [
      'how long is',
      'how many words',
      'word count',
      'character count',
      'is it under the limit',
      'fits in a tweet',
    ],
    terms: ['count', 'word', 'character', 'length'],
    prefer: [{ href: '/text/word-counter' }],
  },
  {
    /*
      "What is 20% of 340" has no word in it at all: `what`, `is` and `of` are
      stop words and the rest is arithmetic, so the matcher had two numbers and
      nothing to search for. The percent sign is the word.
    */
    id: 'work-out-a-percentage',
    phrases: [
      '% of',
      '% off',
      'percent of',
      'percentage of',
      'what percent',
      'percent off',
      'percentage increase',
      'percentage decrease',
      'percentage change',
    ],
    terms: ['percentage', 'percent'],
    prefer: [{ href: '/math/percentage-calculator' }],
  },
  {
    id: 'check-it-arrived-intact',
    phrases: [
      'same file',
      'has it changed',
      'verify it',
      'check the download',
      'checksum',
      'hash it',
      'prove it is the same',
    ],
    terms: ['checksum', 'hash', 'sha', 'verify'],
    prefer: [{ href: '/file/hash-calculator' }],
  },
];

/** A phrase matches a run of whitespace wherever it was written with a space. */
function phrasePattern(phrase: string) {
  return new RegExp(phrase.replace(/ /gu, "[\\s'’-]*"), 'iu');
}

export interface LexiconHit {
  entry: LexiconEntry;
  /** The preferred href for this clause, when one of the conditions holds. */
  href?: string;
}

/** How many conditions a candidate carries; the most specific one answers. */
function specificity(candidate: NonNullable<LexiconEntry['prefer']>[number]) {
  return (candidate.subject ? 1 : 0) + (candidate.withSize ? 1 : 0);
}

/** The bridges a clause crosses, in the order they are declared. */
export function lexiconFor(
  clause: string,
  options: {
    subject?: SubjectKind;
    hasSize?: boolean;
    hasDimensions?: boolean;
  } = {},
): readonly LexiconHit[] {
  return LEXICON.filter((entry) => {
    if (entry.unless?.some((word) => phrasePattern(word).test(clause)))
      return false;
    if (entry.signals?.size && options.hasSize) return true;
    if (entry.signals?.dimensions && options.hasDimensions) return true;
    return entry.phrases.some((phrase) => phrasePattern(phrase).test(clause));
  }).map((entry) => {
    /*
      The candidate with the most conditions met wins, rather than the first one
      declared. "Deduplicate this csv" is about a table AND matches the
      unconditional file-level duplicate finder, and declaration order was
      handing it the wrong one -- a bug that would come back every time somebody
      appended a candidate to the list.
    */
    const preferred = [...(entry.prefer ?? [])]
      .filter(
        (candidate) =>
          (!candidate.subject || candidate.subject === options.subject) &&
          (!candidate.withSize || options.hasSize === true),
      )
      .sort((left, right) => specificity(right) - specificity(left))
      .at(0);
    return { entry, ...(preferred ? { href: preferred.href } : {}) };
  });
}
