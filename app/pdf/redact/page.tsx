import type { Metadata } from 'next';

import { PdfRedactTool } from '@/components/pdf-redact-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/pdf/redact' },
  title: 'Black Out PDF & Redact Text | Free In-Browser Tool',
  description:
    'Permanently black out text, rectangles, or sensitive PII from PDFs in your browser. Redacted pages are physically rasterised with metadata and annotations purged.',
};

export default function Page() {
  return <PdfRedactTool />;
}
