import type { Metadata } from 'next';
import { LatexHubTool } from '@/components/latex-hub-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'LaTeX Authoring & Academic Notation Hub',
  description:
    'A browser suite for academic authoring: multi-format table generation, a LaTeX table reader, BibTeX deduplication, word counts and symbol lookup.',
  alternates: {
    canonical: '/latex',
  },
};

export default function LatexHubPage() {
  const related = relatedToolsFor('/latex');
  return <LatexHubTool initialTab="table-generator" relatedTools={related} />;
}
