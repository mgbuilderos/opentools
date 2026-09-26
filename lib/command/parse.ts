/**
 * READING A TYPED SENTENCE, ON THE DEVICE, WITH NO MODEL.
 *
 * "make this under 2MB and strip my name out of it" is two jobs, a ceiling and
 * a subject, and all four have to be recovered from the words. There is no
 * server to ask -- `connect-src 'none'` -- and no model in the tab, so this is
 * done the only other way it can be: by splitting the sentence and reading the
 * parts.
 *
 * That is a real limit and it is stated rather than hidden. This parser knows
 * conjunctions, sizes, dimensions, a conversion's direction, and what kind of
 * thing is being talked about. It does not know grammar, it cannot resolve "it"
 * across a clause, and a sentence with none of these shapes comes out as one
 * clause of plain words -- which is exactly what the matcher wants anyway.
 */
import { contentTokens, tokenize } from './tokens';
import type { SubjectKind } from './types';

/** Bytes in one KB, matching the default in `lib/tools/exact-size.ts`. */
const KB = 1024;

const UNIT_BYTES: Readonly<Record<string, number>> = {
  b: 1,
  byte: 1,
  bytes: 1,
  k: KB,
  kb: KB,
  kib: KB,
  m: KB * KB,
  mb: KB * KB,
  mib: KB * KB,
  g: KB * KB * KB,
  gb: KB * KB * KB,
  gib: KB * KB * KB,
};

/** What a ceiling is called back to the person who typed it. */
const SIZE_LABEL: Readonly<Record<string, string>> = {
  b: 'bytes',
  byte: 'bytes',
  bytes: 'bytes',
  k: 'KB',
  kb: 'KB',
  kib: 'KiB',
  m: 'MB',
  mb: 'MB',
  mib: 'MiB',
  g: 'GB',
  gb: 'GB',
  gib: 'GiB',
};

/** A ceiling the request states, kept in the words it was typed in. */
export interface SizeLimit {
  value: number;
  /** As typed, upper-cased: `MB`. */
  unit: string;
  bytes: number;
}

export interface ParsedClause {
  /** The clause as typed, trimmed. Shown back so the answer is checkable. */
  text: string;
  /** What the clause is matched on: no duplicates, no stop words. */
  tokens: readonly string[];
  size?: SizeLimit;
  dimensions?: { width: number; height: number };
  /** `png to webp` -> the ordered pair, before "to" is dropped as a stop word. */
  direction?: { from: string; to: string };
  subject?: SubjectKind;
}

/**
 * Phrases that contain a conjunction and are still one thing.
 *
 * Splitting on "and" turns the PDF signer -- whose own page calls it "fill and
 * sign" -- into two clauses, one of which is "sign" and the other "fill". Each
 * entry here is a phrase this site or its visitors really use, and
 * `parse.test.ts` fails if one of them starts splitting again.
 */
const PROTECTED = [
  'black and white',
  'find and replace',
  'search and replace',
  'fill and sign',
  'copy and paste',
  'cut and paste',
  'drag and drop',
  'read and write',
  'before and after',
  'date and time',
  'width and height',
  'height and width',
  'rows and columns',
  'terms and conditions',
  'profit and loss',
  'question and answer',
  'name and address',
] as const;

/** Stands in for a phrase the splitter must not see. */
const MARK = '\uFFFC';

/**
 * Where one job ends and the next begins.
 *
 * No slash. "L/100km" and "km/h" are unit names on 631 `/convert` pages, and
 * splitting there would ask the catalogue for a tool called "100km to mpg".
 */
const SEPARATOR = /\s*(?:,|;|\band\b|\bthen\b|\balso\b|\bplus\b|\+)\s*/iu;

const SUBJECT_WORDS: ReadonlyArray<readonly [SubjectKind, readonly string[]]> =
  [
    [
      'pdf',
      ['pdf', 'pdfs', 'acrobat', 'statement', 'invoice', 'scan', 'scanned'],
    ],
    [
      'image',
      [
        'image',
        'images',
        'photo',
        'photos',
        'photograph',
        'picture',
        'pictures',
        'png',
        'jpg',
        'jpeg',
        'webp',
        'avif',
        'heic',
        'screenshot',
        'logo',
        'icon',
      ],
    ],
    [
      'audio',
      ['audio', 'mp3', 'wav', 'flac', 'song', 'track', 'podcast', 'recording'],
    ],
    ['video', ['video', 'videos', 'mp4', 'mov', 'clip', 'footage', 'movie']],
    [
      'table',
      [
        'csv',
        'spreadsheet',
        'excel',
        'xlsx',
        'sheet',
        'table',
        'column',
        'columns',
        'rows',
        'tsv',
      ],
    ],
    ['archive', ['zip', 'archive', 'tar', 'folder']],
    ['text', ['text', 'markdown', 'json', 'yaml', 'string', 'paragraph']],
  ];

function subjectOf(tokens: readonly string[]): SubjectKind | undefined {
  const present = new Set(tokens);
  for (const [kind, words] of SUBJECT_WORDS) {
    // `words` are written as typed; the tokens they are compared against have
    // had their plurals stripped, so both sides go through `tokenize`.
    if (words.some((word) => tokenize(word).every((part) => present.has(part))))
      return kind;
  }
  return undefined;
}

/** The size the clause states, and the words that stated it. */
interface SizeMatch {
  size: SizeLimit;
  /** The matched text, removed before tokenizing so it is not searched too. */
  matched: string;
}

function sizeOf(clause: string): SizeMatch | undefined {
  const match =
    /(?:under|below|less than|smaller than|no (?:bigger|larger|more) than|at most|max(?:imum)?|up to|within|<=?|to)\s*(\d+(?:\.\d+)?)\s*(bytes?|b|kb|kib|k|mb|mib|m|gb|gib|g)\b/iu.exec(
      clause,
    );
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const bytes = UNIT_BYTES[unit];
  if (!bytes || !Number.isFinite(value) || value <= 0) return undefined;
  return {
    size: {
      value,
      unit: SIZE_LABEL[unit] ?? unit.toUpperCase(),
      bytes: Math.round(value * bytes),
    },
    matched: match[0],
  };
}

function dimensionsOf(clause: string) {
  const match = /\b(\d{2,5})\s*(?:x|×|by)\s*(\d{2,5})\b/iu.exec(clause);
  if (!match) return undefined;
  return {
    dimensions: { width: Number(match[1]), height: Number(match[2]) },
    matched: match[0],
  };
}

/**
 * The ordered pair in "png to webp".
 *
 * Read here, before `contentTokens` drops "to" as the stop word it is
 * everywhere else, because it is the only thing that tells
 * `/convert/png-to-webp` from `/convert/webp-to-png`. `match.ts` compares this
 * against the same shape read out of the tool's own name.
 */
function directionOf(clause: string) {
  const match =
    /\b([\p{L}\p{N}][\p{L}\p{N}.+#-]{0,24})\s+(?:to|into|->|→)\s+([\p{L}\p{N}][\p{L}\p{N}.+#-]{0,24})\b/u.exec(
      clause,
    );
  if (!match) return undefined;
  const from = tokenize(match[1]!).join(' ');
  const to = tokenize(match[2]!).join(' ');
  if (!from || !to || from === to) return undefined;
  return { from, to };
}

/**
 * "Write me a readme" is addressed to the site, not to the catalogue.
 *
 * `write` is a word this catalogue uses -- the cheque amount writer is called
 * that -- so the request frame was competing with the request. Measured: "write
 * me a readme" was answered with the cheque amount writer, because `writer`
 * and `write` are the same word here (`tokens.ts`) and the match was in a name.
 *
 * A verb followed by "me", "my" or "us" is the frame. Dropping it leaves the
 * object, which is what the sentence is actually about, and README generator is
 * what comes back.
 */
const REQUEST_FRAME =
  /\b(write|writes|draft|drafts|create|creates|generate|generates|build|builds|do|get|fetch|send)\s+(?:me|my|us)\b/giu;

/** One clause per job the sentence asks for, in the order it asks. */
export function parseRequest(query: string): readonly ParsedClause[] {
  // An ampersand is a conjunction, and the tool this site calls "fill and sign"
  // is written "fill & sign" at least as often. Both forms reach the protected
  // list through this one substitution.
  let masked = query.replace(/&/gu, ' and ');
  /*
    A protected phrase is hidden from the splitter and put back afterwards. The
    marker is U+FFFC, the object replacement character, which means exactly this
    and is not a control character -- `oxlint`'s `no-control-regex` is right that a
    NUL in a pattern is worth objecting to. The tokenizer discards it either way,
    so a marker that somehow survived could not become a word to search for.
  */
  const held: string[] = [];
  for (const phrase of PROTECTED) {
    const pattern = new RegExp(phrase.replace(/ /gu, '\\s+'), 'giu');
    masked = masked.replace(pattern, (found) => {
      held.push(found);
      return `${MARK}${held.length - 1}${MARK}`;
    });
  }

  return (
    masked
      .split(SEPARATOR)
      .map((part) =>
        part.replace(
          new RegExp(`${MARK}(\\d+)${MARK}`, 'gu'),
          (_, index: string) => held[Number(index)] ?? '',
        ),
      )
      // Whitespace runs are collapsed because this text is shown back to the person
      // beside the tool it chose: "fill & sign" became "fill  and  sign" when the
      // ampersand was substituted, and a visible double space in your own words
      // reads like a bug in the reading.
      .map((part) => part.replace(/\s+/gu, ' ').trim())
      .filter(Boolean)
      .map((text) => {
        const size = sizeOf(text);
        const dimensions = dimensionsOf(text);
        /*
        A NUMBER THAT HAS BEEN UNDERSTOOD IS NOT A SEARCH WORD.

        "2MB" is one token, it is in no tool on the site, and left in the query it
        was reported back as a word nothing recognised -- when in fact it is the
        part of the sentence this parser understood best. So a ceiling or a pair
        of dimensions is removed from the text before the rest is tokenized, and
        travels as `size` and `dimensions` instead.
      */
        const searchable = [size?.matched, dimensions?.matched]
          .filter((part): part is string => Boolean(part))
          .reduce((rest, part) => rest.replace(part, ' '), text)
          .replace(REQUEST_FRAME, ' ');
        const tokens = contentTokens(searchable);
        const direction = directionOf(text);
        const subject = subjectOf(tokens);
        return {
          text,
          tokens,
          ...(size ? { size: size.size } : {}),
          ...(dimensions ? { dimensions: dimensions.dimensions } : {}),
          ...(direction ? { direction } : {}),
          ...(subject ? { subject } : {}),
        };
      })
      /*
      A clause with no words left is still a clause when the parser understood
      something structural in it. "Make this under 2MB" is `make` (carries no
      intent), `this` (a stop word) and a ceiling -- nothing to search for, and
      the most legible request on the home page. It survives on its `size`, which
      `lexicon.ts` treats as the phrasing it is.
    */
      .filter(
        (clause) =>
          clause.tokens.length > 0 ||
          Boolean(clause.size ?? clause.dimensions ?? clause.direction),
      )
  );
}
