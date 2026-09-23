import type { Metadata } from 'next';

import { PdfMetadataTool } from '@/components/pdf-metadata-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/pdf/metadata' },
  title: 'PDF Metadata Viewer & Remover — see the author, XMP and dates',
  description:
    'See every piece of identity a PDF carries — document properties, the XMP packet most tools miss, creation and modification dates, and the file identifier — then remove all of it in your browser.',
};

export default function Page() {
  return <PdfMetadataTool />;
}
