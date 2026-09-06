import type { Metadata } from 'next';

import { PdfPageTools } from '@/components/pdf-page-tools';

export const metadata: Metadata = {
  title: 'Organize and Edit PDF Pages',
  description:
    'Reorder, delete, rotate, number, watermark, and update PDF metadata locally.',
};

export default function Page() {
  return <PdfPageTools />;
}
