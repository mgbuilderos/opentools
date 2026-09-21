import type { Metadata } from 'next';
import { MathWorkbenchTool } from '@/components/math-workbench-tool';
import { excludedToolIdsForPrefix } from '@/lib/seo/live-tools';
import { MATH_OPERATIONS } from '@/lib/tools/math-workbench';

export const revalidate = 86400;

/*
  One page per calculator, which is the whole point of this file.

  All 67 math tools used to answer on `/math/workbench?tool=<id>` — one URL,
  one title ("Math & Unit Workbench") for every one of them, and none of the
  query-string variants in the sitemap. Measured on the live site: a request
  for `?tool=median-calculator` and one for `?tool=margin-of-error-calculator`
  returned byte-identical titles. "Median calculator" and "margin of error
  calculator" are two different searches, so one page could answer neither.

  This route renders the same component 67 times at build time, once per
  operation, each with its own address, title and description. No new content
  is invented: the name and description come from the operation definition
  that already drives the tool, so the page cannot drift from what it runs.

  `dynamicParams = false` means a slug that is not an operation 404s at the
  edge instead of rendering a fallback — a URL must never claim a calculator
  the page is not showing.
*/

const BASE = '/math';
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

export const dynamicParams = false;

export function generateStaticParams() {
  // Same shared exclusion every other [tool] route uses, so this one cannot
  // quietly start claiming an id a hand-written folder or another prefix owns.
  const excluded = excludedToolIdsForPrefix(BASE);
  return MATH_OPERATIONS.filter((operation) => !excluded.has(operation.id)).map(
    (operation) => ({ tool: operation.id }),
  );
}

function operationFor(tool: string) {
  return MATH_OPERATIONS.find((operation) => operation.id === tool);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const operation = operationFor(tool);
  if (!operation) return {};
  return {
    title: operation.name,
    description: operation.description,
    alternates: { canonical: `${CANONICAL_ORIGIN}/math/${operation.id}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  return <MathWorkbenchTool initialOperationId={tool} />;
}
