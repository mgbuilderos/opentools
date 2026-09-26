/**
 * FINDING THE TOOL, WITH 1,390 OF THEM AND NO SERVER TO ASK.
 *
 * The naive version of this ranks by how many of the typed words a tool
 * contains, and it is wrong in a way that is easy to measure on this catalogue:
 * "convert" is in 52% of the names and "to" in 50%, because 632 pages are called
 * "Convert X to Y". Counting words makes every one of those a good answer to
 * every conversion query.
 *
 * So a word is worth what it narrows. `browser` appears everywhere and is worth
 * nothing; `heic` appears in nine entries and all but settles the question. That
 * is inverse document frequency, computed here from the index itself at the
 * moment it is read -- 1,390 entries, one pass, no stored weights to go stale.
 *
 * Three things are then added that frequency cannot see:
 *
 *   DIRECTION. "png to webp" and "webp to png" are the same words and different
 *   pages. The ordered pair is read out of the query by `parse.ts` and out of the
 *   tool's own name here, and disagreeing with it costs more than matching it
 *   pays -- so the wrong direction loses to the right one rather than tying.
 *
 *   SUBJECT. "compress this photo" should not offer the PDF compressor. A route
 *   prefix that agrees with what the sentence is about is worth a little.
 *
 *   THE LEXICON. A phrase that shares no word with any tool ("take my name out
 *   of it") is bridged by `lexicon.ts`, and where that names a destination it
 *   outranks everything, because it was written to.
 */
import { lexiconFor, type LexiconHit } from './lexicon';
import type { ParsedClause } from './parse';
import { contentTokens, tokenize } from './tokens';
import type {
  CommandCatalogueEntry,
  CommandOperationRef,
  SubjectKind,
} from './types';

/** The route prefixes that answer a kind of subject. */
const PREFIXES: Readonly<Record<SubjectKind, readonly string[]>> = {
  pdf: ['/pdf'],
  image: ['/image'],
  audio: ['/audio'],
  video: ['/video'],
  table: ['/data'],
  text: ['/text', '/documents'],
  archive: ['/file'],
};

export interface PreparedEntry {
  entry: CommandCatalogueEntry;
  op?: CommandOperationRef;
  /** Tokens of the name, which are worth more than the rest. */
  nameTokens: readonly string[];
  /** Every token that finds this tool. */
  allTokens: ReadonlySet<string>;
  /** The whole name, lower case, for an exact or leading match. */
  normalizedName: string;
  /**
   * The ordered pair the name promises, with each side's alternative spellings:
   * `Convert Miles to Kilometres (mi to km)` promises `mile|mi` to `kilometre|km`.
   */
  direction?: { from: readonly string[]; to: readonly string[] };
}

export interface PreparedCatalogue {
  entries: readonly PreparedEntry[];
  byHref: ReadonlyMap<string, PreparedEntry>;
  /** How much one token narrows the catalogue. */
  weight: (token: string) => number;
  /** Tokens no tool anywhere contains. */
  unknown: (token: string) => boolean;
}

/**
 * An operation's id is the last segment of its route, or the `?tool=` value --
 * which is how `build-catalogue.ts` found it, so reading it back is exact rather
 * than a guess. `catalogue.test.ts` checks all 630 against the kernel manifest.
 */
function decodeOperation(
  entry: CommandCatalogueEntry,
): CommandOperationRef | undefined {
  if (!entry.op) return undefined;
  const [source, input, output] = entry.op.split(' ');
  if (!source || !input || !output) return undefined;
  const [path = '', query = ''] = entry.href.split('?');
  const id = new URLSearchParams(query).get('tool') ?? path.split('/').pop();
  if (!id) return undefined;
  return {
    id,
    source,
    input: input as CommandOperationRef['input'],
    output: output as CommandOperationRef['output'],
  };
}

/**
 * The ordered pair a conversion page promises, in every way it is written.
 *
 * A unit page is titled `Convert Pounds per square inch to Bar (psi to bar)`, and
 * people type either spelling. Reading only the long form let "32 psi to bar" be
 * answered by the page that converts bar to psi, because nothing in `pound per
 * square inch` contains `psi`. Reading them as two separate pairs was worse: "5
 * miles to km" mixes the long name of one side with the abbreviation of the other,
 * and matched neither pair.
 *
 * So the two forms are merged by position -- from is `mile` or `mi`, to is
 * `kilometre` or `km` -- and a side matches when it equals one of its spellings.
 * Nothing is compared by substring, which is what kept `m` (metres) from passing
 * for `mile`.
 */
function entryDirection(href: string, name: string) {
  const short = /\(([^)]+?)\s+to\s+([^)]+?)\)\s*$/iu.exec(name);
  const long =
    /^(?:convert\s+)?(.+?)\s+to\s+(.+?)(?:\s+(?:converter|conversion))?$/iu.exec(
      name.replace(/\s*\([^)]*\)\s*$/u, '').trim(),
    );
  /*
    The address is the third spelling, and the only one for a unit whose
    abbreviation is not in its title: `/convert/psi-to-bar` is called "Convert
    Pounds per square inch to Bar", so nothing in it contains `psi` and "32 psi to
    bar" was answered by the page that converts the other way. Every conversion
    page's slug carries the ordered pair already.
  */
  const slug = /^([^/]+)-to-(.+)$/u.exec(
    (href.split('?')[0] ?? '').split('/').pop() ?? '',
  );
  if (!long && !slug) return undefined;

  const side = (parts: readonly (string | undefined)[]) => [
    ...new Set(
      parts
        .filter((part): part is string => Boolean(part))
        .map((part) => tokenize(part).join(' '))
        .filter(Boolean),
    ),
  ];
  const from = side([long?.[1], short?.[1], slug?.[1]]);
  const to = side([long?.[2], short?.[2], slug?.[2]]);
  if (!from.length || !to.length) return undefined;
  if (from.join() === to.join()) return undefined;
  return { from, to };
}

/** Reads the index once into the shape the matcher needs. */
export function prepare(
  catalogue: readonly CommandCatalogueEntry[],
): PreparedCatalogue {
  const frequency = new Map<string, number>();
  const entries = catalogue.map((entry) => {
    const nameTokens = tokenize(entry.name);
    const allTokens = new Set([
      ...nameTokens,
      ...entry.terms.split(' ').filter(Boolean),
    ]);
    for (const token of allTokens)
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    return {
      entry,
      ...(decodeOperation(entry) ? { op: decodeOperation(entry) } : {}),
      nameTokens,
      allTokens,
      normalizedName: entry.name.toLocaleLowerCase('en-US'),
      ...(entryDirection(entry.href, entry.name)
        ? { direction: entryDirection(entry.href, entry.name) }
        : {}),
    };
  });

  const total = entries.length;
  return {
    entries,
    byHref: new Map(entries.map((item) => [item.entry.href, item])),
    // The usual smoothed form. A token in every entry lands near zero; one in a
    // handful lands near six. Unknown tokens are handled separately rather than
    // scoring infinity.
    weight: (token) =>
      Math.log((total + 1) / ((frequency.get(token) ?? 0) + 1)),
    unknown: (token) => !frequency.has(token),
  };
}

export interface ToolMatch {
  entry: CommandCatalogueEntry;
  op?: CommandOperationRef;
  score: number;
  /** Share of the query's weight this tool accounts for, 0 to 1. */
  coverage: number;
  /** True when the lexicon named this tool for this phrasing. */
  named: boolean;
  /** True when the coverage is enough to offer this tool as an answer. */
  confident: boolean;
}

export interface ClauseMatches {
  matches: readonly ToolMatch[];
  /** Typed words no tool on the site contains. The honest signal of a gap. */
  unknownTokens: readonly string[];
  lexicon: readonly LexiconHit[];
}

/** A digit run is a quantity, not a word the catalogue is searched for. */
const NUMERIC = /^\d+$/u;

/**
 * How much of the query a tool has to account for before it is offered.
 *
 * Coverage is weighted, so this is not "two thirds of the words" but "two thirds
 * of what the words narrowed". "Compress this pdf" is carried by `compress` and
 * `pdf`; `this` was dropped as a stop word and never counted. A sentence whose
 * only heavy word is missing from the catalogue cannot reach it -- which is the
 * whole point, because that sentence is a gap and `plan.ts` should say so.
 */
const CONFIDENT_COVERAGE = 0.66;

/**
 * The lower bar, and the two conditions that earn it.
 *
 * "Write me a readme" is `write` and `readme`, near enough the same weight, and
 * the README generator -- which is the answer, and is a tool here -- covers 0.48
 * of it, because it is not called "write". Refusing that is as wrong as the
 * subtitle workbench was for "fix my grammar".
 *
 * The difference between the two is what the sentence contains: every word of
 * the first is somewhere in the catalogue, and the second has a word that is
 * nowhere in it. So half the weight is enough when nothing was unrecognised AND
 * the tool's own NAME carries one of the words -- a name is what a tool is, where
 * a description is what it happens to mention.
 */
const HALF_COVERAGE = 0.45;

export function findTools(
  clause: ParsedClause,
  prepared: PreparedCatalogue,
  limit = 4,
): ClauseMatches {
  const lexicon = lexiconFor(clause.text, {
    ...(clause.subject ? { subject: clause.subject } : {}),
    hasSize: Boolean(clause.size),
    hasDimensions: Boolean(clause.dimensions),
  });
  const named = new Set(lexicon.flatMap((hit) => (hit.href ? [hit.href] : [])));
  /*
    The bridged words go through the same normalisation as everything else, so the
    lexicon can be written in plain English -- "deduplicator", "finder" -- rather
    than in whatever stem `tokens.ts` happens to produce. Getting that wrong is
    invisible: the word simply never matches. `lexicon.test.ts` checks that each
    one still names something after normalising.
  */
  const bridged = new Set(
    lexicon.flatMap((hit) =>
      hit.entry.terms.flatMap((term) => contentTokens(term)),
    ),
  );

  // The words to look for: what was typed, plus the catalogue words the lexicon
  // says they mean. A bridged word is worth what it narrows, like any other, but
  // it cannot make the query harder to satisfy -- only the typed words are
  // counted in what a tool has to cover, below.
  const typed = clause.tokens.filter((token) => !prepared.unknown(token));
  const unknownTokens = clause.tokens.filter((token) =>
    prepared.unknown(token),
  );
  const searched = [...new Set([...typed, ...bridged])];

  /*
    WHAT A TOOL HAS TO ACCOUNT FOR, AND WHY AN UNKNOWN WORD STAYS IN THE SUM.

    A digit run is left out: "5 miles to km" asked the index to account for `5`,
    whose weight is 5.43 because almost nothing is called five, and the
    miles-to-kilometres page -- the answer -- reached 0.56 coverage for not
    containing a number. Nor should it. A number is still counted when it matches,
    because `256` cannot make an answer about hashing but it is what tells SHA-256
    from SHA-512.

    A word no tool on the site contains is the opposite case, and it took a wrong
    answer to see it. "Fix my grammar" is `fix` and `grammar`; there is no grammar
    checker here, so dropping the unknown word left `fix` alone, every tool that
    mentions fixing at full coverage, and the subtitle workbench offered as the
    answer to a request about prose. An unknown word is the strongest evidence
    this site does not have the tool, so it is not free: it stays in the
    denominator, where its weight is the largest any word can have, and no tool
    can cover a sentence that contains one. `limits.ts` then gets to answer
    instead, which is the whole point of it.
  */
  const required = clause.tokens.filter((token) => !NUMERIC.test(token));
  const counts = new Set(required);
  const demand = required.reduce(
    (sum, token) => sum + prepared.weight(token),
    0,
  );
  /*
    Nothing to cover, because nothing was asked in words: "make this under 2MB"
    is a ceiling and two words that carry no intent. What is searched for then is
    the lexicon's own terms, and there is no coverage test to apply -- a tool that
    matches one of a curated handful of words is as much of an answer as the
    sentence contains. Ranking still decides the order, and the alternatives are
    still shown, so a wrong first pick is one click from the right one.
  */
  const gated = required.length > 0;

  const scored = prepared.entries.flatMap((item) => {
    let score = 0;
    let covered = 0;
    let hits = 0;
    let matchedInName = false;
    for (const token of searched) {
      if (!item.allTokens.has(token)) continue;
      const weight = prepared.weight(token);
      // A word in the tool's own name is a stronger signal than one in the
      // description it was indexed with.
      const inName = item.nameTokens.includes(token);
      score += inName ? weight * 2 : weight;
      hits += 1;
      if (!counts.has(token)) continue;
      if (inName) matchedInName = true;
      covered += weight;
    }
    if (!hits) return [];

    const query = clause.tokens.join(' ');
    if (item.normalizedName === query) score += 40;
    else if (item.normalizedName.startsWith(query)) score += 12;

    const asked = clause.direction;
    const promised = item.direction;
    if (asked && promised) {
      // The wrong way round costs more than the right way pays, so the reverse
      // page loses to the right one rather than tying with it on the same words.
      if (promised.from.includes(asked.from) && promised.to.includes(asked.to))
        score += 16;
      else if (
        promised.from.includes(asked.to) &&
        promised.to.includes(asked.from)
      )
        score -= 14;
    }

    if (clause.subject) {
      const prefixes = PREFIXES[clause.subject];
      if (prefixes.some((prefix) => item.entry.href.startsWith(`${prefix}/`)))
        score += 3;
    }

    if (named.has(item.entry.href)) score += 100;

    const coverage = demand > 0 ? Math.min(1, covered / demand) : 0;
    return [
      {
        entry: item.entry,
        ...(item.op ? { op: item.op } : {}),
        score,
        coverage,
        named: named.has(item.entry.href),
        confident:
          coverage >= CONFIDENT_COVERAGE ||
          (coverage >= HALF_COVERAGE && !unknownTokens.length && matchedInName),
      },
    ];
  });

  const matches = scored
    .filter((match) => match.named || !gated || match.confident)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.entry.name.localeCompare(right.entry.name),
    )
    .slice(0, limit);

  return { matches, unknownTokens, lexicon };
}
