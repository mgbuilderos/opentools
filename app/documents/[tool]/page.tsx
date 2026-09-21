import type { Metadata } from 'next';
import { DocumentWorkbenchTool } from '@/components/document-workbench-tool';
import { DOCUMENT_OPERATIONS } from '@/lib/tools/document-workbench';

// No `revalidate` here, deliberately. Every one of these pages is prerendered
// into `dist/client/` and served as a static asset, so the Worker never renders
// one and a KV page cache would buy nothing — while the ~600 of them would cost
// ~1,200 writes against an allowance of ~1,000 a day. See docs/CACHE_BUDGET.md.

/*
  One page per tool, generated from the operations the workbench already runs.

  Every tool under /documents used to answer on a single workbench URL behind a
  `?tool=` parameter, with one shared title, and none of those variants were
  in the sitemap — a query parameter is not a page, so no tool here could rank
  for its own name. This route renders the same component once per operation
  at `/documents/<id>`, each with its own title, description and canonical
  taken from the operation definition that drives the tool, so a page cannot
  drift from what it runs.

  `dynamicParams = false`: an unknown slug 404s rather than rendering a
  fallback that claims a tool it is not showing. Ids that already have their
  own hand-written folder are excluded, because a literal segment wins over a
  dynamic one and listing it here would promise a page this route never writes.
*/

const BASE = '/documents';
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');
const DEDICATED = new Set<string>([]);

export const dynamicParams = false;

/*
  Two workbenches can share a prefix, and an id can appear in both -- /developer
  has `regex-tester` in the advanced list and the data list. First source wins,
  deliberately and in one place, so the page that answers is decided here rather
  than by whichever `find` happens to run first, and the id is emitted once.
*/
const OPERATIONS = [
  ...new Map(
    [DOCUMENT_OPERATIONS].flat().map((operation) => [operation.id, operation]),
  ).values(),
];

export function generateStaticParams() {
  return OPERATIONS.filter((operation) => !DEDICATED.has(operation.id)).map(
    (operation) => ({ tool: operation.id }),
  );
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
  if (DOCUMENT_OPERATIONS.some((operation) => operation.id === tool)) {
    return (
      <DocumentWorkbenchTool initialOperationId={tool} routedBasePath={BASE} />
    );
  }
  return null;
}
