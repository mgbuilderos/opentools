import type { Metadata } from 'next';

import { DocxMetadataTool } from '@/components/docx-metadata-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/documents/metadata' },
  title: 'Word Document (.docx) Metadata Viewer & Stripper',
  description:
    'Inspect author identity, company info, editing duration, machine RSIDs, reviewer comments and deleted text in a Word .docx file, or strip it all before sharing.',
};

export default function Page() {
  return <DocxMetadataTool />;
}
