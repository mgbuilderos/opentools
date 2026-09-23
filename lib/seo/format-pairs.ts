import {
  convertTable,
  emitTable,
  type Table,
  type TableFormat,
} from '../tools/notation/table';

/**
 * One page per file-format pair, built on the same machinery as the unit
 * pairs next door in `conversion-pairs.ts`.
 *
 * WHY THIS EXISTS, MEASURED. `/convert` had 512 pages and all of them were
 * measurement units. On 2026-09-23 those 512 pages produced 15 page-opens
 * between them, while 19 `/pdf` pages produced 62. The reason is not the
 * pages: Google answers "cm to inches" inside its own results with a widget,
 * so the impression never becomes a click. It cannot answer "csv to yaml" that
 * way, because converting a file needs a converter, so the person has to open
 * one. Same route, same registration, same tests -- pointed at the questions
 * that still send somebody here.
 *
 * WHY IT IS NOT A SECOND SYSTEM. `lib/tools/notation/table` already holds ONE
 * parser and ONE emitter per format. Every pair below is `parse` then `emit`
 * with nothing in between, so eleven formats produce a hundred and ten
 * conversions and the eleventh format cost two functions rather than twenty.
 * That is the opposite of how this repo's first twelve converters were built
 * -- `csv-to-json`, `json-to-csv`, `csv-to-tsv`, `tsv-to-csv` and the rest were
 * each written out, which is the N-squared bill paid one cell at a time.
 *
 * DERIVED, NEVER TYPED. The sample on every page is this file's one fixture
 * emitted in the source format, and the result beside it is the converter's
 * own answer to it. A pair whose conversion throws generates no page, so a URL
 * can never promise a conversion the tool will not do.
 */

export interface FileFormat {
  /** URL token, and the word people type: `csv-to-yaml`. */
  id: TableFormat;
  /** Display name, in the casing the format's own community writes it. */
  name: string;
  /** File extension the download gets. */
  extension: string;
  /** What the format is, for the sentence under the title. */
  summary: string;
}

export const FILE_FORMATS: readonly FileFormat[] = [
  {
    id: 'csv',
    name: 'CSV',
    extension: 'csv',
    summary: 'comma-separated rows, the export every spreadsheet offers',
  },
  {
    id: 'tsv',
    name: 'TSV',
    extension: 'tsv',
    summary: 'tab-separated rows, what a spreadsheet puts on the clipboard',
  },
  {
    id: 'json',
    name: 'JSON',
    extension: 'json',
    summary: 'an array of objects, one per row',
  },
  {
    id: 'yaml',
    name: 'YAML',
    extension: 'yaml',
    summary: 'a sequence of mappings, as configuration files are written',
  },
  {
    id: 'xml',
    name: 'XML',
    extension: 'xml',
    summary: 'a row element per record, a child element per column',
  },
  {
    id: 'markdown',
    name: 'Markdown',
    extension: 'md',
    summary: 'a pipe table, the kind a README or a pull request renders',
  },
  {
    id: 'html',
    name: 'HTML',
    extension: 'html',
    summary: 'a `table` element with a head and a body',
  },
  {
    id: 'latex',
    name: 'LaTeX',
    extension: 'tex',
    summary: 'a tabular environment, escaping and all',
  },
  {
    id: 'sql',
    name: 'SQL',
    extension: 'sql',
    summary: 'CREATE TABLE and INSERT statements with quoted identifiers',
  },
  {
    id: 'asciidoc',
    name: 'AsciiDoc',
    extension: 'adoc',
    summary: 'a delimited table block',
  },
  {
    id: 'rst',
    name: 'reStructuredText',
    extension: 'rst',
    summary: 'a simple table ruled with equals signs',
  },
];

const FORMAT_BY_ID = new Map(FILE_FORMATS.map((format) => [format.id, format]));

/**
 * Pairs a page already answers, and the page that answers them.
 *
 * These seven conversions each have a hand-written tool at a URL Google
 * already knows. Generating `/convert/csv-to-json` beside `/data/csv-to-json`
 * would be two addresses competing for one query with the same tool behind
 * them, which splits whatever either had earned -- the exact duplication the
 * short-slug aliases are redirects rather than pages in order to avoid. So the
 * pair is not generated, and the converter links to the live page instead.
 *
 * `format-pairs.test.ts` checks every route here is still live, so deleting
 * one of those pages surfaces as a failing test rather than as a dead link.
 */
export const PAIRS_ANSWERED_ELSEWHERE: Readonly<Record<string, string>> = {
  'csv-to-json': '/data/csv-to-json',
  'json-to-csv': '/data/json-to-csv',
  'csv-to-tsv': '/data/csv-to-tsv',
  'tsv-to-csv': '/data/tsv-to-csv',
  'csv-to-sql': '/data/csv-to-sql',
  'markdown-to-html': '/text/markdown-to-html',
  'html-to-markdown': '/text/html-to-markdown',
};

/**
 * The one fixture every page's worked example is made from.
 *
 * It carries an ampersand, a decimal column and a two-word heading on purpose:
 * those are what the escaping rules in each emitter exist for, so the example
 * on the page demonstrates the escaping rather than describing it. LaTeX's
 * `& % _ # $` escaping in particular is tested here as well as in
 * `notation/table/table.test.ts`.
 */
export const SAMPLE_TABLE: Table = {
  headers: ['product', 'region', 'units', 'unit price'],
  rows: [
    ['Desk lamp', 'EU', '128', '24.50'],
    ['Chair', 'R&D', '64', '98.00'],
    ['Monitor', 'APAC', '32', '249.99'],
  ],
};

export interface FormatPair {
  /** Slug, and the `id` that `routedToolIdsForPrefix('/convert')` reports. */
  id: string;
  from: TableFormat;
  to: TableFormat;
  fromName: string;
  toName: string;
  title: string;
}

/** The fixture written in one format, or undefined when it cannot be. */
function sampleIn(format: TableFormat): string | undefined {
  try {
    const written = emitTable(SAMPLE_TABLE, format);
    return written.trim() ? written : undefined;
  } catch {
    return undefined;
  }
}

/** What the converter really returns, or undefined when it refuses. */
function convert(from: TableFormat, to: TableFormat): string | undefined {
  const input = sampleIn(from);
  if (!input) return undefined;
  try {
    const output = convertTable(input, from, to);
    return output.trim() ? output : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Every ordered pair of different formats that really converts, minus the ones
 * a live page already answers.
 */
export const FORMAT_PAIRS: readonly FormatPair[] = FILE_FORMATS.flatMap(
  (from) =>
    FILE_FORMATS.flatMap((to) => {
      if (from.id === to.id) return [];
      const id = `${from.id}-to-${to.id}`;
      if (PAIRS_ANSWERED_ELSEWHERE[id]) return [];
      if (!convert(from.id, to.id)) return [];
      return [
        {
          id,
          from: from.id,
          to: to.id,
          fromName: from.name,
          toName: to.name,
          title: `${from.name} to ${to.name} converter`,
        },
      ];
    }),
);

const PAIR_BY_ID = new Map(FORMAT_PAIRS.map((pair) => [pair.id, pair]));

export function formatPairById(id: string) {
  return PAIR_BY_ID.get(id);
}

export interface FormatFacts {
  /** The fixture written in the source format. */
  sample: string;
  /** What the converter returns for it. */
  output: string;
  description: string;
  /** What this conversion measurably does, in the tool's own numbers. */
  measured: string;
  /** Format token -> display name, for the two selects. */
  formats: Record<string, string>;
  /** `${from}|${to}` -> the page that answers it. */
  routes: Record<string, string>;
  /** Extension the download gets. */
  extension: string;
}

const lines = (value: string) => value.split('\n').length;

/**
 * The pair-specific content of the page, computed at build time by running the
 * converter. Kept out of `FORMAT_PAIRS` on purpose: the list is imported by the
 * route registry and the sitemap, and only the page being rendered needs its
 * own worked example.
 */
export function formatFacts(pair: FormatPair): FormatFacts {
  const sample = sampleIn(pair.from) ?? '';
  const output = convert(pair.from, pair.to) ?? '';

  const formats: Record<string, string> = {};
  for (const format of FILE_FORMATS) formats[format.id] = format.name;

  const routes: Record<string, string> = {};
  for (const other of FORMAT_PAIRS)
    routes[`${other.from}|${other.to}`] = `/convert/${other.id}`;
  for (const [id, href] of Object.entries(PAIRS_ANSWERED_ELSEWHERE)) {
    const [from = '', to = ''] = id.split('-to-');
    routes[`${from}|${to}`] = href;
  }

  const to = FORMAT_BY_ID.get(pair.to);

  return {
    sample,
    output,
    measured: `${SAMPLE_TABLE.rows.length} rows and ${SAMPLE_TABLE.headers.length} columns: ${lines(sample)} lines of ${pair.fromName} become ${lines(output)} lines of ${pair.toName}.`,
    description: `Turn ${pair.fromName} into ${pair.toName} — ${to?.summary ?? ''} — in this browser tab. Paste your ${pair.fromName}, copy the ${pair.toName}: the quoting and escaping ${pair.toName} needs are applied for you.`,
    formats,
    routes,
    extension: to?.extension ?? 'txt',
  };
}

/**
 * The pair the hub at `/convert/formats` opens on.
 *
 * Deliberately one of the seven answered elsewhere, so the hub's worked
 * example is not a second copy of any `/convert` page's own. The hub exists
 * because a tool is not browsable until something links to it: 103 pair pages
 * behind a dynamic segment are in the sitemap, and without this page they are
 * in no menu. It carries the index of all of them.
 */
export function formatHubPair(): FormatPair {
  const from = FORMAT_BY_ID.get('csv')!;
  const to = FORMAT_BY_ID.get('json')!;
  return {
    id: 'formats',
    from: from.id,
    to: to.id,
    fromName: from.name,
    toName: to.name,
    title: 'File format converter',
  };
}

/** Every generated pair, as links, newest format families together. */
export function formatPairIndex(): readonly { href: string; label: string }[] {
  return FORMAT_PAIRS.map((pair) => ({
    href: `/convert/${pair.id}`,
    label: `${pair.fromName} to ${pair.toName}`,
  }));
}
