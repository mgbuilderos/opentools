import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SchemaHubTool, type SchemaHubTab } from '@/components/schema-hub-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import { SCHEMA_TOOL_META } from '@/lib/seo/hub-tool-meta';

export const revalidate = 86400;
export const dynamicParams = false;

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

const TOOL_META = SCHEMA_TOOL_META;

export function generateStaticParams() {
  return (Object.keys(TOOL_META) as SchemaHubTab[]).map((tool) => ({ tool }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const meta = TOOL_META[tool as SchemaHubTab];
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${CANONICAL_ORIGIN}/schema/${tool}`,
    },
  };
}

export default async function SchemaToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!TOOL_META[tool as SchemaHubTab]) {
    notFound();
  }

  const related = relatedToolsFor(`/schema/${tool}`);
  return (
    <SchemaHubTool initialTab={tool as SchemaHubTab} relatedTools={related} />
  );
}
