import type { Metadata } from 'next';
import { MathWorkbenchTool } from '@/components/math-workbench-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  CONVERSION_PAIRS,
  conversionFacts,
  conversionPairById,
} from '@/lib/seo/conversion-pairs';

/*
  One page per unit pair, which is the next order of magnitude after one page
  per tool.

  Giving every calculator its own URL fixed the first half of the problem: 533
  tools that had shared one address now have 626 of their own. It did not fix
  this half. "cm to inches", "km to miles" and "kg to lbs" are three searches
  with three answers, and all three landed on `/math/distance-converter`, a
  page whose title is "Distance converter" and whose converter opens on
  whatever units the operation happens to default to. A converter is not one
  search intent; it is every pair it supports.

  WHAT KEEPS THIS OFF THE THIN-PAGE PILE. Constraint C4 forbids a new family of
  near-template pages while decision 11 de-indexes ~430 of the last one, and it
  is right to. The difference is not the wording, it is the work: the converter
  arrives already set to the pair in the URL, and the factor and worked
  examples above it are produced by calling `runMathOperation` -- the function
  the tool itself runs -- at build time. Every page therefore carries a number
  no other page carries, and no sentence on it can drift from the tool, because
  no sentence on it was written about the tool. A pair the converter cannot
  actually perform produces no page.

  `dynamicParams = false` means a slug that is not a real pair 404s at the edge
  rather than rendering a fallback, so no URL can claim a conversion the page
  is not doing.

  No `revalidate`: 512 pages in the Cloudflare KV page cache would cost 1,024
  writes a day against a free-plan allowance of about 1,000, and every deploy
  invalidates the lot. These are prerendered to static assets instead, which is
  free. See docs/CACHE_BUDGET.md.
*/

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

export const dynamicParams = false;

export function generateStaticParams() {
  return CONVERSION_PAIRS.map((pair) => ({ pair: pair.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair: slug } = await params;
  const pair = conversionPairById(slug);
  if (!pair) return {};
  return {
    title: pair.title,
    description: conversionFacts(pair).description,
    alternates: { canonical: `${CANONICAL_ORIGIN}/convert/${pair.id}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair: slug } = await params;
  const pair = conversionPairById(slug);
  if (!pair) return null;
  const facts = conversionFacts(pair);
  return (
    <MathWorkbenchTool
      initialOperationId={pair.operationId}
      relatedTools={relatedToolsFor(`/convert/${slug}`)}
      pair={{
        title: pair.title,
        summary: facts.description,
        relationship: facts.relationship,
        examples: facts.examples,
        from: pair.from,
        to: pair.to,
        units: facts.units,
        routes: facts.routes,
      }}
    />
  );
}
