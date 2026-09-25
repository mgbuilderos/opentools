import type { Metadata } from 'next';

import { CreatorWorkbenchTool } from '@/components/creator-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/creator/workbench' },
  title: 'Creator & Social Workbench',
  description:
    'Format, plan, measure, and package creator content locally with transparent rules.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/creator/workbench" meta={metadata} />
      <CreatorWorkbenchTool />
    </>
  );
}
