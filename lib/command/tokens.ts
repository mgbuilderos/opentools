/**
 * The one way words are cut up, on both sides of the match.
 *
 * The index in `catalogue.generated.ts` is tokenised with these functions when
 * it is generated, and a typed sentence is tokenised with the same ones when it
 * is read. A second normalisation would mean a query that cannot match a word
 * that is really there -- so there is one.
 *
 * The normalisation deliberately mirrors the site search in `lib/tools/
 * catalog.ts`: NFKD, lower case, split on anything that is not a letter or a
 * number, and a plural stripped from anything longer than three characters, so
 * "pages" finds "page". That function is not imported because importing
 * anything from `catalog.ts` pulls all eighteen workbench operation modules
 * into whichever bundle does it -- the exact regression `lib/tools/browse.ts`
 * was written to undo.
 */

/** A plural is the same word. Three characters or fewer are left alone. */
function singular(token: string) {
  return token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token;
}

/**
 * THE TOOL AND THE DOING OF IT ARE THE SAME WORD.
 *
 * This site names a tool after the thing it is: "JSON formatter", "Word counter",
 * "Bulk file renamer". People type what they want done: "format this json",
 * "count the words", "rename them all". Nothing connected the two, and the
 * measured cost was not subtle -- "format this json" was answered with the file
 * format converter, because `format` and `formatter` are different strings and the
 * two pages actually called "JSON formatter" matched only half the query.
 *
 * A stemmer would find these and a great deal else: `formatter` stems to
 * `formatt`, which reaches `format` only after collapsing a double consonant, and
 * every rule that gets there brings its own false merges. This is a list instead.
 * It is thirty-odd pairs long because that is how many agent nouns this catalogue
 * actually uses, each one checkable by reading it, and `tokens.test.ts` fails if
 * a pair here is not a word some tool is really called.
 */
const SAME_WORD: Readonly<Record<string, string>> = {
  builder: 'build',
  calculator: 'calculate',
  checker: 'check',
  cleaner: 'clean',
  compressor: 'compress',
  converter: 'convert',
  counter: 'count',
  cutter: 'cut',
  decoder: 'decode',
  deduplicator: 'deduplicate',
  editor: 'edit',
  encoder: 'encode',
  extractor: 'extract',
  finder: 'find',
  formatter: 'format',
  generator: 'generate',
  inspector: 'inspect',
  joiner: 'join',
  masker: 'mask',
  merger: 'merge',
  optimizer: 'optimize',
  parser: 'parse',
  reader: 'read',
  remover: 'remove',
  renamer: 'rename',
  scrubber: 'scrub',
  sorter: 'sort',
  splitter: 'split',
  stripper: 'strip',
  translator: 'translate',
  validator: 'validate',
  viewer: 'view',
  writer: 'write',
};

export function tokenize(value: string): string[] {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en-US')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(singular)
    .map((token) => SAME_WORD[token] ?? token);
}

/** The agent nouns this catalogue uses, for the test that checks them. */
export const AGENT_NOUNS: readonly string[] = Object.keys(SAME_WORD);

/**
 * Words that carry no intent, dropped from both the index and the query.
 *
 * They are dropped from BOTH or from neither. Stripping "to" from a query but
 * not from "Millimetres to inches converter" would leave a query that can
 * never match every token of the name it is looking for.
 *
 * A conversion's direction survives this on its own path: `parse.ts` reads
 * "png to webp" as a direction before anything is dropped, and `match.ts`
 * compares that against the direction in the tool's name, so the pair is
 * ordered even though "to" is gone.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  /*
    The second group below is the one worth explaining. "Make this under 2MB" has
    exactly two words left after the ordinary stop words -- `make` and `under` --
    and the leap-year checker's description contains both, so it covered 100% of
    that query and was offered as the second-best answer to it. Words like these
    cannot narrow 1,367 tools down to anything; they are how English carries a
    request, not what the request is for.
  */
  'a',
  'able',
  'all',
  'also',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'can',
  'do',
  'don',
  'for',
  'from',
  'get',
  'give',
  'got',
  'have',
  'here',
  'i',
  'in',
  'into',
  'is',
  'it',
  'its',
  'just',
  'like',
  'me',
  'mine',
  'my',
  'need',
  'of',
  'on',
  'onto',
  'or',
  'out',
  'own',
  'please',
  'so',
  'some',
  'thanks',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'thi',
  'this',
  'those',
  'to',
  'up',
  'want',
  'was',
  'we',
  'what',
  'will',
  'with',
  'would',
  'you',
  'your',

  // Carry no intent of their own -- see the note at the top of this list.
  'about',
  'after',
  'again',
  'anything',
  'because',
  'before',
  'did',
  'doe',
  'doing',
  'done',
  'everything',
  'give',
  'had',
  'ha',
  'help',
  'how',
  'least',
  'les',
  'let',
  'made',
  'make',
  'making',
  'many',
  'more',
  'most',
  'much',
  'need',
  'not',
  'now',
  'only',
  'other',
  'over',
  'put',
  'quite',
  'really',
  'see',
  'show',
  'something',
  'still',
  'stuff',
  'take',
  'taken',
  'tell',
  'than',
  'thing',
  'too',
  'took',
  'try',
  'turn',
  'under',
  'use',
  'using',
  'very',
  'when',
  'where',
  'which',
  'while',
  'without',
]);

/**
 * The hyphenated words, joined up: "Wi-Fi" also answers to "wifi".
 *
 * `tokenize` splits on every non-alphanumeric character, so "Wi-Fi QR code"
 * indexes as `wi fi qr code` and the query somebody actually types -- "wifi" --
 * matches none of it. Measured: that alone lost the Wi-Fi QR code generator,
 * which is one of the most obviously searched-for tools on the site.
 *
 * So both forms go in, on both sides. Joining "csv-to-json" into "csvtojson"
 * costs nine bytes and finds nothing, which is the worst this does.
 */
export function joinedForms(value: string): string[] {
  return (value.match(/[\p{L}\p{N}]+(?:[-'\u2019][\p{L}\p{N}]+)+/gu) ?? [])
    .map((run) => run.replace(/[-'\u2019]/gu, '').toLocaleLowerCase('en-US'))
    .filter((joined) => joined.length > 2);
}

/** Tokens worth matching on: no duplicates, no stop words, in order. */
export function contentTokens(value: string): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const token of tokenize(value)) {
    if (STOP_WORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    kept.push(token);
  }
  return kept;
}
