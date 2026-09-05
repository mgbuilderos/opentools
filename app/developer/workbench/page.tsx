import type { Metadata } from 'next';

import { DeveloperDataWorkbenchTool } from '@/components/developer-data-workbench-tool';

export const metadata: Metadata = {
  title: 'Developer & Data Workbench',
  description:
    'Encode, decode, inspect, transform, hash, and test developer data locally.',
};

export default function Page() {
  return <DeveloperDataWorkbenchTool />;
}
