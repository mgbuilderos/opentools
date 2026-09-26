import type { Metadata } from 'next';
import { excludedToolIdsForPrefix } from '@/lib/seo/live-tools';
import { DateWorkbenchTool } from '@/components/date-workbench-tool';
import { DATE_OPERATIONS } from '@/lib/tools/date-workbench';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import { toolSearchCopy } from '@/lib/seo/tool-search-copy';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

/*
  One page per tool, generated from the operations the workbench already runs.

  Every tool under /date used to answer on a single workbench URL behind a
  `?tool=` parameter, with one shared title, and none of those variants were
  in the sitemap — a query parameter is not a page, so no tool here could rank
  for its own name. This route renders the same component once per operation
  at `/date/<id>`, each with its own title, description and canonical
  taken from the operation definition that drives the tool, so a page cannot
  drift from what it runs.

  `dynamicParams = false`: an unknown slug 404s rather than rendering a
  fallback that claims a tool it is not showing. Ids that already have their
  own hand-written folder are excluded, because a literal segment wins over a
  dynamic one and listing it here would promise a page this route never writes.
*/

const BASE = '/date';
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');
const DEDICATED = excludedToolIdsForPrefix(BASE);

export const dynamicParams = false;

/*
  Two workbenches can share a prefix, and an id can appear in both -- /developer
  has `regex-tester` in the advanced list and the data list. First source wins,
  deliberately and in one place, so the page that answers is decided here rather
  than by whichever `find` happens to run first, and the id is emitted once.
*/
const OPERATIONS = [
  ...new Map(
    [DATE_OPERATIONS].flat().map((operation) => [operation.id, operation]),
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
  /*
    The operation's own line is written for someone already looking at the
    tool; `lib/seo/tool-search-copy.ts` carries the sentence written for
    someone still on a results page. A route with no entry there keeps its
    own, which is the usual case.
  */
  const route = `${BASE}/${operation.id}`;
  const copy = toolSearchCopy(route);
  return {
    title: copy?.title ?? operation.name,
    description: copy?.description ?? operation.description,
    alternates: { canonical: `${CANONICAL_ORIGIN}${route}` },
  };
}

async function renderToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  const related = relatedToolsFor(`${BASE}/${tool}`);
  if (DATE_OPERATIONS.some((operation) => operation.id === tool)) {
    return (
      <DateWorkbenchTool
        initialOperationId={tool}
        routedBasePath={BASE}
        relatedTools={related}
      />
    );
  }
  return null;
}

/*
  The structured data and the page, in that order.

  The body above is unchanged apart from its name: it has several returns and
  one of them is `null`, so rather than threading a script tag through every
  branch it is rendered once here and the JSON-LD placed beside whatever it
  produced. A branch that renders nothing gets no structured data either, which
  is the right answer -- there is no tool at that URL to describe. Lowercase
  because `react-compiler` reserves capitalised calls for JSX components.

  `generateMetadata` above is the single source of the name and description, so
  the sentence a machine reads is the sentence the search result shows.
*/
export default async function Page(props: {
  params: Promise<{ tool: string }>;
}) {
  const rendered = await renderToolPage(props);
  if (rendered === null) return null;
  const { tool } = await props.params;
  return (
    <>
      <ToolJsonLd
        route={`/date/${tool}`}
        meta={await generateMetadata(props)}
      />
      {rendered}
    </>
  );
}
