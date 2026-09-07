import type { Metadata } from 'next';

import { ImageEditorTool } from '@/components/image-editor-tool';

export const metadata: Metadata = {
  title: 'Solid Background Remover',
  description:
    'Make white or selected plain-color image backgrounds transparent in this browser.',
};

export default function SolidBackgroundRemoverPage() {
  return <ImageEditorTool defaultRemoveBackground />;
}
