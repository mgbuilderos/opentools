import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LatexHubTool, type LatexHubTab } from '@/components/latex-hub-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import { LATEX_TOOL_META } from '@/lib/seo/hub-tool-meta';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;
export const dynamicParams = false;

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

const TOOL_META = LATEX_TOOL_META;

export function generateStaticParams() {
  return (Object.keys(TOOL_META) as LatexHubTab[]).map((tool) => ({ tool }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const meta = TOOL_META[tool as LatexHubTab];
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${CANONICAL_ORIGIN}/latex/${tool}`,
    },
  };
}

async function renderToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!TOOL_META[tool as LatexHubTab]) {
    notFound();
  }

  const related = relatedToolsFor(`/latex/${tool}`);
  return (
    <LatexHubTool initialTab={tool as LatexHubTab} relatedTools={related} />
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
        route={`/latex/${tool}`}
        meta={await generateMetadata(props)}
      />
      {rendered}
    </>
  );
}
