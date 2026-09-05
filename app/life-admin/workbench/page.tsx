import type { Metadata } from 'next';

import { LifeAdminWorkbenchTool } from '@/components/life-admin-workbench-tool';

export const metadata: Metadata = {
  title: 'India & Life-Admin Workbench',
  description:
    'Mask sensitive references, check common formats, and run everyday planning calculations locally in your browser.',
};

export default function Page() {
  return <LifeAdminWorkbenchTool />;
}
