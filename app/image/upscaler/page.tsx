import type { Metadata } from 'next';

import { ImageUpscalerTool } from '@/components/image-upscaler-tool';

export const metadata: Metadata = {
  title: 'AI Image Upscaler',
  description:
    'Enhance and upsize low-resolution images with AI directly in your browser.',
};

export default function Page() {
  return <ImageUpscalerTool />;
}
