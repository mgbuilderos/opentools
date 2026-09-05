import type { Metadata } from 'next';

import { MathWorkbenchTool } from '@/components/math-workbench-tool';

export const metadata: Metadata = {
  title: 'Math & Unit Workbench',
  description:
    'Calculate arithmetic, statistics, number theory, geometry, and unit conversions locally.',
};

export default function Page() {
  return <MathWorkbenchTool />;
}
