import type { Metadata } from 'next';

import { LifeAdminWorkbenchTool } from '@/components/life-admin-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/life-admin/workbench' },
  title: 'India & Life-Admin Workbench',
  description:
    'Mask sensitive references, check common formats, and run everyday planning calculations locally in your browser.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/life-admin/workbench" meta={metadata} />
      <LifeAdminWorkbenchTool />
    </>
  );
}
