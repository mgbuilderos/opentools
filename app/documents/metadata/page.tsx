import type { Metadata } from 'next';

import { DocxMetadataTool } from '@/components/docx-metadata-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/documents/metadata' },
  title: 'Word Document (.docx) Metadata Viewer & Stripper',
  description:
    'Inspect author identity, company info, editing duration, machine RSIDs, reviewer comments, and secret deleted text in Word (.docx) documents, or strip metadata before sharing.',
};

export default function Page() {
  return <DocxMetadataTool />;
}
