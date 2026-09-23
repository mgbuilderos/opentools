import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LatexHubTool, type LatexHubTab } from '@/components/latex-hub-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import { LATEX_TOOL_META } from '@/lib/seo/hub-tool-meta';

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

export default async function LatexToolPage({
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
