import type { Metadata } from 'next';

import { DeveloperAdvancedWorkbenchTool } from '@/components/developer-advanced-workbench-tool';

export const metadata: Metadata = {
  title: 'Advanced Developer Workbench',
  description:
    'Inspect JSON, decode JWTs, generate secure tokens, calculate IPv4 networks, and build project configuration locally.',
};

export default function Page() {
  return <DeveloperAdvancedWorkbenchTool />;
}
