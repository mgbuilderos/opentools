import type { Metadata } from 'next';

import { ImageExactSizeTool } from '@/components/image-exact-size-tool';

export const metadata: Metadata = {
  title: 'Resize Image to Exact KB, Pixels and DPI',
  description:
    'Fit a photo or signature under a KB limit at exact pixels with a real DPI value, in your own browser. Your files never touch a server.',
};

export default function Page() {
  return <ImageExactSizeTool />;
}
