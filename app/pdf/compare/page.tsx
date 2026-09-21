import type { Metadata } from 'next';

import { PdfCompareTool } from '@/components/pdf-compare-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Compare PDF Documents Online — Visual Redline & Text Diff',
  description:
    'Whole-document stream comparison with reflow resilience. Detect insertions, deletions, moved clauses, and formatting changes between PDF contract drafts. Export annotated PDF, Word redline (.docx), and CSV change lists locally in your browser.',
};

export default function Page() {
  const related = relatedToolsFor('/pdf/compare');
  return <PdfCompareTool relatedTools={related} />;
}
