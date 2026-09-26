import type { Metadata } from 'next';

import { FileXrayTool } from '@/components/file-xray-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/file/xray' },
  title: 'File X-ray — See the Hidden Metadata in Any File',
  description:
    'Drop any file to see the metadata hidden inside: GPS coordinates in a photo, a camera serial, a PDF author, text deleted from a Word file. All in your browser.',
};

export default function Page() {
  return <FileXrayTool />;
}
