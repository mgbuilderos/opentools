import type { Metadata } from 'next';

import { TextWorkbenchTool } from '@/components/text-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Text Workbench',
  description:
    'Count, clean, transform, inspect, and translate text locally in one compact workspace.',
};

export default function Page() {
  return <TextWorkbenchTool />;
}
