import type { Metadata } from 'next';

import { ScienceEducationWorkbenchTool } from '@/components/science-education-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/science/workbench' },
  title: 'Science & Learning Workbench',
  description:
    'Use transparent science calculators and build study materials locally in your browser.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/science/workbench" meta={metadata} />
      <ScienceEducationWorkbenchTool />
    </>
  );
}
