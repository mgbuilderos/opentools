import type { Metadata } from 'next';

import { FormatConverterTool } from '@/components/format-converter-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  FILE_FORMATS,
  FORMAT_PAIRS,
  formatFacts,
  formatHubPair,
  formatPairIndex,
} from '@/lib/seo/format-pairs';

/*
  The hub the 103 pair pages hang off.

  A literal folder beats the `[pair]` segment next to it, so this address is
  this page and `excludedToolIdsForPrefix('/convert')` keeps the dynamic route
  from claiming `formats` as well.

  It exists for the reason the owner gave on 2026-09-20: listing a tool in
  `publicTools` is not enough to put it in a menu. One manifest entry points
  here, and this page indexes every pair -- so the whole family is reachable by
  browsing rather than by guessing a URL, and a crawler that reads links finds
  103 pages from one.

  Not cached: see the note in `app/convert/[pair]/page.tsx` and
  docs/CACHE_BUDGET.md.
*/

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

const pair = formatHubPair();
const facts = formatFacts(pair);

export const metadata: Metadata = {
  title: 'File format converter — CSV, JSON, YAML, XML, Markdown, SQL',
  description: `Convert between ${FILE_FORMATS.length} table and data formats in this browser tab: ${FORMAT_PAIRS.length} conversions, one page each, with the quoting and escaping each format needs applied for you.`,
  alternates: { canonical: `${CANONICAL_ORIGIN}/convert/formats` },
};

export default function Page() {
  return (
    <FormatConverterTool
      relatedTools={relatedToolsFor('/convert/formats')}
      index={formatPairIndex()}
      pair={{
        title: 'File format converter',
        summary: `One parser and one emitter per format, so every pair works the same way. Pick the two formats and the page for that conversion opens — ${FORMAT_PAIRS.length} of them, plus the seven with a tool of their own.`,
        measured: facts.measured,
        sample: facts.sample,
        output: facts.output,
        from: pair.from,
        to: pair.to,
        formats: facts.formats,
        routes: facts.routes,
        extension: facts.extension,
      }}
    />
  );
}
