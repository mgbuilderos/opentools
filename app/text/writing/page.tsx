import type { Metadata } from 'next';

import { WritingWorkbenchTool } from '@/components/writing-workbench-tool';

export const metadata: Metadata = {
  title: 'Writing Workbench',
  description:
    'Edit, convert, compare, summarize, structure, and export text locally.',
};

export default function Page() {
  return <WritingWorkbenchTool />;
}
