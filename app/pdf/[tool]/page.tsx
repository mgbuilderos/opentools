import type { Metadata } from 'next';
import { PdfPageTools } from '@/components/pdf-page-tools';
import { PDF_PAGE_OPERATIONS } from '@/lib/tools/catalog';
import { excludedToolIdsForPrefix } from '@/lib/seo/live-tools';

export const revalidate = 86400;

/*
  One page per PDF page tool, generated from the operations the page can run.

  Every one of them used to answer on `/pdf/page-tools?tool=<id>` — one URL,
  one title ("Organize and Edit PDF Pages") for all six, and none of the
  query-string variants in the sitemap, so "rotate PDF" and "PDF watermark"
  competed for the same single page. Worse than the workbenches: this component
  never read `?tool=` at all, so the parameter decided nothing and the six
  guides all landed on identical markup.

  TWO TRAPS ARE HANDLED HERE, and both would have shipped silently.

  1. 66 catalogue entries point at `/pdf/page-tools`; the component has a
     control for six of them. The other 60 — flatten, OCR, PDF-to-images,
     repair, redact and the rest — are listed as destinations but are not
     built. Pages are generated from `PDF_PAGE_OPERATIONS`, the six the
     component really runs, and `lib/seo/live-tools.ts` derives its live-id set
     from the same constant. A title must never promise a tool the page cannot
     run.

  2. `/pdf` already holds nine hand-written folders (merge, compress, sign,
     to-word, …). A literal segment beats a dynamic one, so any id matching one
     of them would be claimed here and served there, putting a URL in the
     sitemap the build never writes. `excludedToolIdsForPrefix` is the single
     list both this route and the registry exclude against. No id collides
     today; the filter is what keeps that true when the next one is added.

  `dynamicParams = false`: an unknown slug 404s rather than rendering a
  fallback that claims a tool it is not showing.
*/

const BASE = '/pdf';
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');
const DEDICATED = excludedToolIdsForPrefix(BASE);

export const dynamicParams = false;

const OPERATIONS = PDF_PAGE_OPERATIONS.filter(
  (operation) => !DEDICATED.has(operation.id),
);

export function generateStaticParams() {
  return OPERATIONS.map((operation) => ({ tool: operation.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const operation = OPERATIONS.find((item) => item.id === tool);
  if (!operation) return {};
  return {
    title: operation.name,
    description: operation.description,
    alternates: { canonical: `${CANONICAL_ORIGIN}${BASE}/${operation.id}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!OPERATIONS.some((operation) => operation.id === tool)) return null;
  return <PdfPageTools initialOperationId={tool} />;
}
