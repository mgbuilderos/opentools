import type { Metadata } from 'next';

import { ImagesToPdfTool } from '@/components/images-to-pdf-tool';

export const metadata: Metadata = {
  title: 'Images to PDF',
  description:
    'Arrange JPEG and PNG images into one PDF in a local browser worker.',
};

export default function ImagesToPdfPage() {
  return <ImagesToPdfTool />;
}
