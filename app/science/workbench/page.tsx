import type { Metadata } from 'next';

import { ScienceEducationWorkbenchTool } from '@/components/science-education-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Science & Learning Workbench',
  description:
    'Use transparent science calculators and build study materials locally in your browser.',
};

export default function Page() {
  return <ScienceEducationWorkbenchTool />;
}
