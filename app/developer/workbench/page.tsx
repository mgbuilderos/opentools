import type { Metadata } from 'next';

import { DeveloperDataWorkbenchTool } from '@/components/developer-data-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/developer/workbench' },
  title: 'Developer & Data Workbench',
  description:
    'Encode, decode, inspect, transform, hash, and test developer data locally.',
};

export default function Page() {
  return <DeveloperDataWorkbenchTool />;
}
