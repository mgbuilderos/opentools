import type { Metadata } from 'next';

import { FinanceBusinessWorkbenchTool } from '@/components/finance-business-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/finance/workbench' },
  title: 'Finance & Business Scenario Workbench',
  description:
    'Run transparent loan, savings, pricing, budget, and business metric scenarios locally.',
};

export default function Page() {
  return <FinanceBusinessWorkbenchTool />;
}
