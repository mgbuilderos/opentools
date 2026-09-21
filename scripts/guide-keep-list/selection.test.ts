import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { LIVE_TOOL_CATALOG } from '../../lib/seo/live-tools';
import {
  aggregateGuideTraffic,
  guideSlugFromUrl,
  matchingQueries,
  parseCsv,
  parseFiltersCsv,
  parseMetric,
  parsePagesCsv,
  parseQueriesCsv,
  renderKeepListModule,
  selectKeepList,
} from './selection';
import { findZipEntry, readZipEntries } from './zip';

// The fixtures are invented numbers, not getopentools.com data. The ZIP holds
// the same three CSVs under the names Search Console uses in its export.
const fixtures = path.join(import.meta.dirname, '__fixtures__');
const fixture = (name: string) => readFileSync(path.join(fixtures, name));
const fixtureText = (name: string) =>
  readFileSync(path.join(fixtures, name), 'utf8');

const MERGE = 'pdf-merge-pdf';
const JWT = 'developer-and-data-jwt-decoder';
const CASE = 'text-and-writing-text-case-converter';
const PERCENT = 'math-and-units-percentage-calculator';
const COMPRESS = 'pdf-compress-pdf';
const liveSlugs = new Set([MERGE, JWT, CASE, PERCENT, COMPRESS]);

const pages = () => parsePagesCsv(fixtureText('fake-pages.csv'));

describe('CSV parsing', () => {
  it('handles quotes, doubled quotes, CRLF, embedded newlines and a BOM', () => {
    expect(
      parseCsv('\uFEFFa,"b,1","say ""hi"""\r\n"multi\nline",2,\r\n\r\n'),
    ).toEqual([
      ['a', 'b,1', 'say "hi"'],
      ['multi\nline', '2', ''],
    ]);
    expect(() => parseCsv('a,"open')).toThrow(/quoted/u);
  });

  it('reads metrics with thousands separators and percentages', () => {
    expect(parseMetric('1,250')).toBe(1250);
    expect(parseMetric('4.5%')).toBeCloseTo(0.045);
    expect(parseMetric('')).toBe(0);
    expect(() => parseMetric('n/a')).toThrow(/Not a number/u);
  });

  it('reads the Pages tab and rejects a file without its columns', () => {
    const rows = pages();
    expect(rows).toHaveLength(10);
    expect(rows[3]).toEqual({
      url: 'https://getopentools.com/guides/text-and-writing-text-case-converter?utm_source=x#how-it-works',
      clicks: 0,
      impressions: 1250,
      position: 24.1,
    });
    expect(() => parsePagesCsv('Query,Clicks\nx,1\n')).toThrow(/Top pages/u);
    expect(parsePagesCsv('Page,Clicks,Impressions\n/x,1,2\n')[0]).toEqual({
      url: '/x',
      clicks: 1,
      impressions: 2,
      position: 0,
    });
  });

  it('reads the Queries tab and the export filters', () => {
    const queries = parseQueriesCsv(fixtureText('fake-queries.csv'));
    expect(queries.map((row) => row.query)).toEqual([
      'merge pdf without upload',
      'merge pdf, free',
      'jwt decode',
    ]);
    expect(matchingQueries(queries, 'Merge PDF')).toEqual({
      count: 2,
      clicks: 6,
    });
    expect(parseFiltersCsv(fixtureText('fake-filters.csv'))).toEqual({
      'Search type': 'Web',
      Date: 'Last 3 months',
    });
  });

  it('reads Pages.csv out of the export ZIP (deflated and stored entries)', () => {
    const entries = readZipEntries(fixture('fake-export.zip'));
    const decode = (name: string) =>
      new TextDecoder().decode(findZipEntry(entries, name));
    expect(parsePagesCsv(decode('pages.csv'))).toEqual(pages());
    expect(decode('Filters.csv')).toContain('Last 3 months');
    expect(findZipEntry(entries, 'Devices.csv')).toBeUndefined();
    expect(() => readZipEntries(new Uint8Array(40))).toThrow(/ZIP/u);
  });
});

describe('guide URL normalisation', () => {
  it('maps every URL variant of a guide to its slug', () => {
    for (const url of [
      'https://getopentools.com/guides/pdf-merge-pdf',
      'https://getopentools.com/guides/pdf-merge-pdf/',
      'http://getopentools.com/guides/pdf-merge-pdf',
      'https://www.getopentools.com/guides/pdf-merge-pdf',
      'HTTPS://WWW.GETOPENTOOLS.COM/guides/PDF-Merge-PDF/',
      'https://getopentools.com/guides/pdf-merge-pdf?utm=1#faq',
      'getopentools.com/guides/pdf-merge-pdf',
      '  https://getopentools.com/guides/pdf-merge-pdf//  ',
    ]) {
      expect(guideSlugFromUrl(url), url).toBe(MERGE);
    }
  });

  it('ignores hubs, tool pages, other hosts and junk', () => {
    for (const url of [
      'https://getopentools.com/guides',
      'https://getopentools.com/guides/category/pdf',
      'https://getopentools.com/pdf/merge',
      'https://getopentools.com/guides/pdf-merge-pdf/extra',
      'https://notgetopentools.com/guides/pdf-merge-pdf',
      'https://staging.example.test/guides/pdf-merge-pdf',
      'ftp://getopentools.com/guides/pdf-merge-pdf',
      'https://getopentools.com/guides/%E0%A4%A',
      '',
    ]) {
      expect(guideSlugFromUrl(url), url).toBeNull();
    }
  });

  it('merges variants, weighting position by impressions', () => {
    const traffic = aggregateGuideTraffic(pages());
    expect(traffic.get(MERGE)).toEqual({
      slug: MERGE,
      clicks: 42,
      impressions: 1000,
      position: 6.7,
      urlVariants: 2,
    });
    expect([...traffic.keys()].sort()).toEqual(
      [MERGE, JWT, CASE, PERCENT, COMPRESS, 'video-video-to-gif'].sort(),
    );
  });
});

describe('keep list selection', () => {
  it('fixture slugs are real live guides today', () => {
    const live = new Set(LIVE_TOOL_CATALOG.map((tool) => tool.slug));
    for (const slug of liveSlugs) expect(live.has(slug), slug).toBe(true);
    expect(live.has('video-video-to-gif')).toBe(false);
  });

  it('keeps guides over either threshold, busiest first', () => {
    const result = selectKeepList({ pages: pages(), liveSlugs });
    expect(result.entries.map(({ slug, reason }) => [slug, reason])).toEqual([
      [MERGE, 'traffic'], // 42 clicks
      [JWT, 'traffic'], // exactly MIN_CLICKS
      [COMPRESS, 'traffic'], // exactly MIN_IMPRESSIONS
      [CASE, 'traffic'], // impressions only
    ]);
    expect(result.entries[0]!.evidence).toBe(
      '42 clicks, 1000 impressions, avg position 6.7',
    );
    // 2 clicks and 99 impressions: just under both thresholds.
    expect(result.belowThreshold).toBe(1);
    expect(result.notLive).toEqual(['video-video-to-gif']);
    expect(result.overCap).toEqual([]);
  });

  it('preserves hand-picked distinct guides and counts them toward the cap', () => {
    const result = selectKeepList({
      pages: pages(),
      liveSlugs,
      distinct: [
        {
          slug: PERCENT,
          reason: 'distinct',
          evidence: 'owner: worked examples',
        },
        { slug: MERGE, reason: 'distinct', evidence: 'owner: own page' },
        { slug: 'video-video-to-gif', reason: 'distinct', evidence: 'gone' },
        { slug: JWT, reason: 'traffic', evidence: 'stale numbers' },
      ],
      thresholds: { minClicks: 3, minImpressions: 100, maxKept: 3 },
    });
    expect(result.entries.map(({ slug, reason }) => [slug, reason])).toEqual([
      [PERCENT, 'distinct'],
      [MERGE, 'distinct'],
      [JWT, 'traffic'],
    ]);
    expect(result.entries[1]!.evidence).toBe(
      'owner: own page (also 42 clicks, 1000 impressions, avg position 6.7)',
    );
    expect(result.distinctNotLive).toEqual(['video-video-to-gif']);
    expect(result.overCap.map((guide) => guide.slug)).toEqual([COMPRESS, CASE]);
  });

  it('adds query evidence without changing the selection', () => {
    const queries = parseQueriesCsv(fixtureText('fake-queries.csv'));
    const result = selectKeepList({
      pages: pages(),
      liveSlugs,
      queries,
      toolNames: new Map([[MERGE, 'Merge PDF']]),
    });
    expect(result.entries.map((entry) => entry.slug)).toEqual(
      selectKeepList({ pages: pages(), liveSlugs }).entries.map(
        (entry) => entry.slug,
      ),
    );
    expect(result.entries[0]!.evidence).toContain(
      '2 site queries name the tool (6 clicks)',
    );
  });

  it('renders a module with every entry, safely quoted', () => {
    const source = renderKeepListModule(
      [{ slug: MERGE, reason: 'distinct', evidence: 'says "why" */ here' }],
      'fake-export.zip */',
    );
    expect(source).toContain('slug: "pdf-merge-pdf"');
    expect(source).toContain('evidence: "says \\"why\\" */ here"');
    expect(source).not.toContain('fake-export.zip */');
    expect(source).toContain('DECISION_LOG §11');
  });
});
