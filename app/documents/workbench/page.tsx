import type { Metadata } from 'next';

import { DocumentWorkbenchTool } from '@/components/document-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Documents & Office Workbench',
  description:
    'Create, calculate, compare, inspect, merge, and download everyday office documents locally.',
};

export default function Page() {
  return <DocumentWorkbenchTool />;
}
