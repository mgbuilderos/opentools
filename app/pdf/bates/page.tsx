import type { Metadata } from 'next';

import { PdfBatesTool } from '@/components/pdf-bates-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Bates Numbering for PDFs — Legal Exhibit Stamping',
  description:
    'Stamp sequential Bates identifiers onto legal exhibits and document bundles. Sequences continuously across multiple PDFs with upright placement on rotated and cropped pages.',
};

export default function Page() {
  return <PdfBatesTool />;
}
