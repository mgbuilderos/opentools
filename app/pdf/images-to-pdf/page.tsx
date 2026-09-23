import type { Metadata } from 'next';

import { ImagesToPdfTool } from '@/components/images-to-pdf-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/pdf/images-to-pdf' },
  title: 'Images to PDF',
  description:
    'Arrange JPEG and PNG images into one PDF in a local browser worker.',
};

export default function ImagesToPdfPage() {
  return <ImagesToPdfTool />;
}
