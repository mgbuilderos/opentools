import type { Metadata } from 'next';

import { PdfExtractTool } from '@/components/pdf-extract-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/pdf/extract-pages' },
  title: 'Extract PDF Pages',
  description: 'Choose PDF pages or ranges and save them as a new local PDF.',
};

export default function Page() {
  return <PdfExtractTool />;
}
