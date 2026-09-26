import type { Metadata } from 'next';
import { FileWorkbenchTool } from '@/components/file-workbench-tool';
import { FILE_WORKBENCH_OPERATIONS } from '@/lib/tools/file-workbench';
import { excludedToolIdsForPrefix } from '@/lib/seo/live-tools';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import { toolSearchCopy } from '@/lib/seo/tool-search-copy';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

/*
  One page per tool, generated from the operations the workbench already runs.

  All 31 used to answer on `/file/workbench?tool=<id>` with one shared title
  ("Private File Workbench"), and none of those variants were in the sitemap —
  a query parameter is not a page, so none of them could rank for its own name.
  This route renders the same component once per operation at `/file/<id>`,
  each with its own title, description and canonical taken from the operation
  definition that drives the tool, so a page cannot drift from what it runs.

  `/file` holds three hand-written folders (workbench, archive,
  hash-calculator) and a literal segment beats a dynamic one, so their ids are
  filtered out through `excludedToolIdsForPrefix`, the same list the registry
  excludes against. None of the 31 collides today; the filter is what keeps
  that true when the next one is added.

  `dynamicParams = false`: an unknown slug 404s rather than rendering a
  fallback that claims a tool it is not showing.
*/

const BASE = '/file';
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');
const DEDICATED = excludedToolIdsForPrefix(BASE);

export const dynamicParams = false;

const OPERATIONS = FILE_WORKBENCH_OPERATIONS.filter(
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
  if (!OPERATIONS.some((operation) => operation.id === tool)) return null;
  return (
    <FileWorkbenchTool
      initialOperationId={tool}
      routedBasePath={BASE}
      relatedTools={relatedToolsFor(`${BASE}/${tool}`)}
    />
  );
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
        route={`/file/${tool}`}
        meta={await generateMetadata(props)}
      />
      {rendered}
    </>
  );
}
