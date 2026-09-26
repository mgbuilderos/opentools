import type { Metadata } from 'next';

import { MathWorkbenchTool } from '@/components/math-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/math/workbench' },
  title: 'Math & Unit Workbench',
  description:
    'Calculate arithmetic, statistics, number theory, geometry, and unit conversions locally.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/math/workbench" meta={metadata} />
      <MathWorkbenchTool />
    </>
  );
}
