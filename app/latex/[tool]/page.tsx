import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LatexHubTool, type LatexHubTab } from '@/components/latex-hub-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;
export const dynamicParams = false;

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

const TOOL_META: Record<LatexHubTab, { title: string; description: string }> = {
  'table-generator': {
    title:
      'Multi-Format Table Generator — LaTeX, Markdown, HTML, CSV | OpenTools',
    description:
      'Convert tables between 8 technical formats at once: LaTeX (booktabs & longtable), Markdown, HTML, CSV, TSV, JSON, SQL, and AsciiDoc.',
  },
  'table-reader': {
    title: 'LaTeX Table to CSV, Excel & Markdown Reader | OpenTools',
    description:
      'Reverse extraction tool: parse LaTeX tabular and booktabs code into clean structured CSV, Markdown, JSON, and TSV tables in your browser.',
  },
  bibtex: {
    title: 'BibTeX Workbench — Deduplicate by DOI, Clean & Format | OpenTools',
    description:
      'Validate required fields, deduplicate by DOI and title, normalise page ranges (10--20), strip Google Scholar junk, and format clean .bib files.',
  },
  'word-count': {
    title: 'LaTeX Word Count — TeXcount Accurate Prose Counter | OpenTools',
    description:
      'Accurate journal word count for LaTeX documents: separates prose body words from headers, captions, and equations without counting markup.',
  },
  symbols: {
    title: 'LaTeX Symbol Finder — Math Symbols & Greek Commands | OpenTools',
    description:
      'Searchable LaTeX symbol directory: Greek letters, operators, relations, arrows, and delimiters with one-click command copy.',
  },
  equations: {
    title:
      'LaTeX Matrix & Equation Builder — pmatrix, bmatrix, cases | OpenTools',
    description:
      'Interactive visual matrix and equation builder: generate pmatrix, bmatrix, vmatrix, piecewise cases, and aligned derivations.',
  },
};

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
