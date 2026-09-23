import type { Metadata } from 'next';

import { ProductivityWorkbenchTool } from '@/components/productivity-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/productivity/workbench' },
  title: 'Planning & Productivity Workbench',
  description:
    'Prioritize tasks, build schedules, compare decisions, create teams, and make lists locally.',
};

export default function Page() {
  return <ProductivityWorkbenchTool />;
}
