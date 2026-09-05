import type { Metadata } from 'next';

import { CreatorWorkbenchTool } from '@/components/creator-workbench-tool';

export const metadata: Metadata = {
  title: 'Creator & Social Workbench',
  description:
    'Format, plan, measure, and package creator content locally with transparent rules.',
};

export default function Page() {
  return <CreatorWorkbenchTool />;
}
