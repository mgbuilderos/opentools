import type { Metadata } from 'next';

import { PdfCompressTool } from '@/components/pdf-compress-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Compress a PDF without uploading it',
  description:
    'Make a PDF smaller in your own browser. The file is read by the page and never sent to a server.',
};

export default function Page() {
  return <PdfCompressTool />;
}
