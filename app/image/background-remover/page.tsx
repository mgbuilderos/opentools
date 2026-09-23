import type { Metadata } from 'next';

import { ImageEditorTool } from '@/components/image-editor-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/image/background-remover' },
  title: 'Solid Background Remover',
  description:
    'Make white or selected plain-color image backgrounds transparent in this browser.',
};

export default function SolidBackgroundRemoverPage() {
  return <ImageEditorTool defaultRemoveBackground />;
}
