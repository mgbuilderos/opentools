import type { Metadata } from 'next';

import { ImageToTextTool } from '@/components/image-to-text-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/image/to-text' },
  title: 'Image to Text OCR in Your Browser',
  description:
    'Read selectable English text from photos, screenshots and scans with a worker that runs on your device. OCR assets load only after you ask.',
};

export default function Page() {
  return <ImageToTextTool />;
}
