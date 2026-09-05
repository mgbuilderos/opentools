import type { Metadata } from 'next';

import { ImageOptimizeTool } from '@/components/image-optimize-tool';

export const metadata: Metadata = {
  title: 'Image Compressor and Converter',
  description:
    'Resize, compress, and convert static JPEG, PNG, and WebP images locally.',
};

export default function Page() {
  return <ImageOptimizeTool />;
}
