import type { Metadata } from 'next';

import { PdfMergeTool } from '@/components/pdf-merge-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/pdf/merge' },
  title: 'Merge PDF',
  description:
    'Combine PDF files in your chosen order using a local browser worker.',
};

export default function MergePdfPage() {
  return <PdfMergeTool />;
}
