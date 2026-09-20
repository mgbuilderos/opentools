import type { Metadata } from 'next';

import { PdfOcrTool } from '@/components/pdf-ocr-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'OCR Scanned PDF into a Searchable PDF',
  description:
    'Add an invisible English text layer to a scanned PDF in your browser, preserving the visible pages and offering plain text separately.',
};

export default function Page() {
  return <PdfOcrTool />;
}
