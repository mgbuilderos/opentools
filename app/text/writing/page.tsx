import type { Metadata } from 'next';

import { WritingWorkbenchTool } from '@/components/writing-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/text/writing' },
  title: 'Writing Workbench',
  description:
    'Edit, convert, compare, summarize, structure, and export text locally.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/text/writing" meta={metadata} />
      <WritingWorkbenchTool />
    </>
  );
}
