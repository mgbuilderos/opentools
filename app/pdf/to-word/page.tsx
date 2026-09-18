import type { Metadata } from 'next';

import { PdfToWordTool } from '@/components/pdf-to-word-tool';

export const metadata: Metadata = {
  title: 'PDF to Word without uploading it',
  description:
    'Pull the text out of a PDF into an editable .docx in your own browser. Text only — layout, tables and images are not carried across. The file is never sent to a server.',
};

export default function Page() {
  return <PdfToWordTool />;
}
