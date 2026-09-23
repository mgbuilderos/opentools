import type { Metadata } from 'next';

import { ImageEditorTool } from '@/components/image-editor-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/image/editor' },
  title: 'Local Photo Editor',
  description:
    'Crop, rotate, flip, and adjust JPEG, PNG, and WebP images in your browser.',
};

export default function Page() {
  return <ImageEditorTool />;
}
