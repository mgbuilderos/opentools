import type { Metadata } from 'next';

import { FileWorkbenchTool } from '@/components/file-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/file/workbench' },
  title: 'Private File Workbench',
  description:
    'Inspect, hash, split, join, rename, encode, and download files locally in your browser.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/file/workbench" meta={metadata} />
      <FileWorkbenchTool />
    </>
  );
}
