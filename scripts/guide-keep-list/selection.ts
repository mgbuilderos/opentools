/**
 * Turns a Search Console performance export into the guide keep list
 * (lib/seo/guide-keep-list.ts). Pure functions only; scripts/guide-keep-list.mjs
 * does the file reading and writing.
 */
import type { GuideKeepEntry } from '../../lib/seo/guide-keep-list';

/**
 * A guide is kept for traffic when, over the export's date range, it earned at
 * least MIN_CLICKS clicks OR at least MIN_IMPRESSIONS impressions.
 *
 * - 3 clicks: more than one stray visit, yet reachable for a site this young.
 *   A guide with any real click history loses it on a redirect.
 * - 100 impressions: roughly one a day over the recommended 3-month export.
 *   Google already ranks such a page for something, so the page may be worth
 *   improving rather than merging even before it earns clicks.
 *
 * Export 3 months (Search type: Web). Shorter windows understate both numbers.
 */
export const MIN_CLICKS = 3;
export const MIN_IMPRESSIONS = 100;

/**
 * The owner asked for roughly 30 to 50 full guides. Hand-picked `distinct`
 * guides are always kept and count toward this cap; traffic guides fill the
 * remaining slots in order of clicks, then impressions. Guides that qualify
 * but miss the cap are reported so the owner can raise it on purpose.
 */
export const MAX_KEPT_GUIDES = 50;

export const SITE_HOST = 'getopentools.com';

export type {
  GuideKeepEntry,
  GuideKeepReason,
} from '../../lib/seo/guide-keep-list';

export interface PageRow {
  url: string;
  clicks: number;
  impressions: number;
  /** 0 when the export has no position column. */
  position: number;
}

export interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
}

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF and embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/u, '');

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!;
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('CSV ends inside a quoted field');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/** "1,234" -> 1234, "3.5%" -> 0.035, "" -> 0. */
export function parseMetric(value: string | undefined): number {
  const raw = (value ?? '').trim().replace(/,/gu, '');
  if (raw === '') return 0;
  const percent = raw.endsWith('%');
  const number = Number(percent ? raw.slice(0, -1) : raw);
  if (!Number.isFinite(number)) {
    throw new Error(`Not a number: "${value}"`);
  }
  return percent ? number / 100 : number;
}

const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/\s+/gu, ' ');

function columnIndex(
  headers: readonly string[],
  label: string,
  aliases: readonly string[],
  file: string,
  required: boolean,
): number {
  const names = [label, ...aliases].map(normalizeHeader);
  const normalized = headers.map(normalizeHeader);
  const index = normalized.findIndex((header) => names.includes(header));
  if (index === -1 && required) {
    throw new Error(
      `${file}: no "${label}" column (found: ${headers.join(', ')})`,
    );
  }
  return index;
}

/** Rows of the Pages tab ("Top pages", "Clicks", "Impressions", ...). */
export function parsePagesCsv(text: string): PageRow[] {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) throw new Error('Pages CSV is empty');
  const file = 'Pages CSV';
  const url = columnIndex(
    headers,
    'Top pages',
    ['Page', 'Pages', 'URL', 'Landing page'],
    file,
    true,
  );
  const clicks = columnIndex(headers, 'Clicks', [], file, true);
  const impressions = columnIndex(headers, 'Impressions', [], file, true);
  const position = columnIndex(headers, 'Position', [], file, false);

  return rows.map((cells) => ({
    url: (cells[url] ?? '').trim(),
    clicks: parseMetric(cells[clicks]),
    impressions: parseMetric(cells[impressions]),
    position: position === -1 ? 0 : parseMetric(cells[position]),
  }));
}

/** Rows of the Queries tab ("Top queries", "Clicks", "Impressions", ...). */
export function parseQueriesCsv(text: string): QueryRow[] {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) throw new Error('Queries CSV is empty');
  const file = 'Queries CSV';
  const query = columnIndex(
    headers,
    'Top queries',
    ['Query', 'Queries'],
    file,
    true,
  );
  const clicks = columnIndex(headers, 'Clicks', [], file, true);
  const impressions = columnIndex(headers, 'Impressions', [], file, true);
  return rows.map((cells) => ({
    query: (cells[query] ?? '').trim(),
    clicks: parseMetric(cells[clicks]),
    impressions: parseMetric(cells[impressions]),
  }));
}

/** Filters.csv from the export ZIP, e.g. { Date: 'Last 3 months' }. */
export function parseFiltersCsv(text: string): Record<string, string> {
  const [, ...rows] = parseCsv(text);
  return Object.fromEntries(
    rows.map((cells) => [(cells[0] ?? '').trim(), (cells[1] ?? '').trim()]),
  );
}

/**
 * The guide slug a Search Console URL refers to, or null. Accepts http and
 * https, with or without www, a trailing slash, a query or a fragment, and a
 * bare host without a scheme. Category hubs and other hosts return null.
 */
export function guideSlugFromUrl(
  url: string,
  host: string = SITE_HOST,
): string | null {
  const trimmed = url.trim();
  if (trimmed === '') return null;
  let parsed: URL;
  try {
    parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed)
        ? trimmed
        : `https://${trimmed.replace(/^\/+/u, '')}`,
    );
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (parsed.hostname.toLowerCase().replace(/^www\./u, '') !== host) {
    return null;
  }
  let path: string;
  try {
    path = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  path = path.toLowerCase().replace(/\/+$/u, '');
  const match = /^\/guides\/([a-z0-9-]+)$/u.exec(path);
  if (!match || match[1] === 'category') return null;
  return match[1]!;
}

export interface GuideTraffic {
  slug: string;
  clicks: number;
  impressions: number;
  /** Impression-weighted average position; 0 when unknown. */
  position: number;
  /** How many exported URL variants were merged into this guide. */
  urlVariants: number;
}

/** Sums URL variants (http/https, www, trailing slash) of the same guide. */
export function aggregateGuideTraffic(
  rows: readonly PageRow[],
  host: string = SITE_HOST,
): Map<string, GuideTraffic> {
  const totals = new Map<string, GuideTraffic & { positionWeight: number }>();
  for (const row of rows) {
    const slug = guideSlugFromUrl(row.url, host);
    if (!slug) continue;
    const entry = totals.get(slug) ?? {
      slug,
      clicks: 0,
      impressions: 0,
      position: 0,
      positionWeight: 0,
      urlVariants: 0,
    };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    if (row.position > 0 && row.impressions > 0) {
      entry.positionWeight += row.position * row.impressions;
    }
    entry.urlVariants += 1;
    totals.set(slug, entry);
  }
  return new Map(
    [...totals].map(([slug, { positionWeight, ...entry }]) => [
      slug,
      {
        ...entry,
        position:
          entry.impressions > 0
            ? Math.round((positionWeight / entry.impressions) * 10) / 10
            : 0,
      },
    ]),
  );
}

export interface KeepListThresholds {
  minClicks: number;
  minImpressions: number;
  maxKept: number;
}

export const DEFAULT_THRESHOLDS: KeepListThresholds = {
  minClicks: MIN_CLICKS,
  minImpressions: MIN_IMPRESSIONS,
  maxKept: MAX_KEPT_GUIDES,
};

export interface KeepListInput {
  pages: readonly PageRow[];
  /** Slugs of guides whose tool is live today. */
  liveSlugs: ReadonlySet<string>;
  /** Hand-picked entries from the current keep list; preserved. */
  distinct?: readonly GuideKeepEntry[];
  /** Optional Queries tab, used only as review evidence. */
  queries?: readonly QueryRow[];
  /** Tool name per slug, to match queries to guides. */
  toolNames?: ReadonlyMap<string, string>;
  thresholds?: KeepListThresholds;
  host?: string;
}

export interface KeepListResult {
  entries: GuideKeepEntry[];
  /** Guides in the export whose tool is not live; they already 404. */
  notLive: string[];
  /** Hand-picked guides dropped because their tool is no longer live. */
  distinctNotLive: string[];
  /** Traffic guides that qualified but did not fit under maxKept. */
  overCap: GuideTraffic[];
  /** Live guides in the export that fell below both thresholds. */
  belowThreshold: number;
}

function queryWords(name: string) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((word) => word.length > 2);
}

/**
 * Site-wide queries whose text contains every significant word of the tool
 * name. The Queries tab is not broken down by page, so this is evidence for a
 * reviewer, never a selection input.
 */
export function matchingQueries(
  queries: readonly QueryRow[],
  toolName: string,
): { count: number; clicks: number } {
  const words = queryWords(toolName);
  if (words.length === 0) return { count: 0, clicks: 0 };
  let count = 0;
  let clicks = 0;
  for (const row of queries) {
    const text = row.query.toLowerCase();
    if (words.every((word) => text.includes(word))) {
      count += 1;
      clicks += row.clicks;
    }
  }
  return { count, clicks };
}

export function selectKeepList(input: KeepListInput): KeepListResult {
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;
  const traffic = aggregateGuideTraffic(input.pages, input.host);

  const distinctNotLive: string[] = [];
  const distinct = new Map<string, GuideKeepEntry>();
  for (const entry of input.distinct ?? []) {
    if (entry.reason !== 'distinct') continue;
    if (!input.liveSlugs.has(entry.slug)) {
      distinctNotLive.push(entry.slug);
      continue;
    }
    distinct.set(entry.slug, entry);
  }

  const notLive: string[] = [];
  const qualifying: GuideTraffic[] = [];
  let belowThreshold = 0;
  for (const guide of traffic.values()) {
    if (!input.liveSlugs.has(guide.slug)) {
      notLive.push(guide.slug);
    } else if (
      guide.clicks >= thresholds.minClicks ||
      guide.impressions >= thresholds.minImpressions
    ) {
      qualifying.push(guide);
    } else {
      belowThreshold += 1;
    }
  }
  qualifying.sort(
    (a, b) =>
      b.clicks - a.clicks ||
      b.impressions - a.impressions ||
      a.slug.localeCompare(b.slug),
  );

  const describe = (guide: GuideTraffic) => {
    const parts = [
      `${guide.clicks} clicks`,
      `${guide.impressions} impressions`,
    ];
    if (guide.position > 0) parts.push(`avg position ${guide.position}`);
    const name = input.toolNames?.get(guide.slug);
    if (input.queries && name) {
      const matched = matchingQueries(input.queries, name);
      if (matched.count > 0) {
        parts.push(
          `${matched.count} site queries name the tool (${matched.clicks} clicks)`,
        );
      }
    }
    return parts.join(', ');
  };

  const trafficEntries: GuideKeepEntry[] = [];
  const overCap: GuideTraffic[] = [];
  const slots = Math.max(0, thresholds.maxKept - distinct.size);
  for (const guide of qualifying) {
    const handPicked = distinct.get(guide.slug);
    if (handPicked) {
      // Keep the owner's reason and add the numbers that also back it.
      distinct.set(guide.slug, {
        ...handPicked,
        evidence: `${handPicked.evidence} (also ${describe(guide)})`,
      });
      continue;
    }
    if (trafficEntries.length < slots) {
      trafficEntries.push({
        slug: guide.slug,
        reason: 'traffic',
        evidence: describe(guide),
      });
    } else {
      overCap.push(guide);
    }
  }

  const distinctEntries = [...distinct.values()].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );
  return {
    entries: [...distinctEntries, ...trafficEntries],
    notLive: notLive.sort(),
    distinctNotLive: distinctNotLive.sort(),
    overCap,
    belowThreshold,
  };
}

/** Source of lib/seo/guide-keep-list.ts for these entries. */
export function renderKeepListModule(
  entries: readonly GuideKeepEntry[],
  source: string,
): string {
  const body = entries
    .map(
      (entry) =>
        `  {\n    slug: ${JSON.stringify(entry.slug)},\n    reason: ${JSON.stringify(entry.reason)},\n    evidence: ${JSON.stringify(entry.evidence)},\n  },\n`,
    )
    .join('');
  return `/**
 * Guides that keep their full page when guide consolidation is enabled
 * (lib/seo/guide-consolidation-config.ts). Every other live guide redirects to
 * its tool page.
 *
 * Enable only after the owner supplies Search Console data (DECISION_LOG §11).
 *
 * \`traffic\` entries are rewritten by \`npm run seo:guide-keep-list\`; \`distinct\`
 * entries are hand-picked by the owner and preserved by that script. Review the
 * diff before committing. See docs/seo/guide-consolidation.md.
 *
 * Last generated from: ${source.replace(/\*\//gu, '* /')}
 */

export type GuideKeepReason = 'traffic' | 'distinct';

export interface GuideKeepEntry {
  /** Guide slug, as in /guides/<slug>. */
  slug: string;
  reason: GuideKeepReason;
  /** Numbers from the export (traffic) or the owner's note (distinct). */
  evidence: string;
}

export const GUIDE_KEEP_LIST: readonly GuideKeepEntry[] = [
${body}];
`;
}
