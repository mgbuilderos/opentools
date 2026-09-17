import type { Metadata } from 'next';

import { PdfSignTool } from '@/components/pdf-sign-tool';

export const metadata: Metadata = {
  title: 'Sign and fill a PDF without uploading it',
  description:
    'Complete a PDF form and draw or type your signature onto it in your own browser. The document is read by the page and never sent to a server.',
};

export default function Page() {
  return <PdfSignTool />;
}
