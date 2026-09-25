import type { Metadata } from 'next';

import { FinanceBusinessWorkbenchTool } from '@/components/finance-business-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/finance/workbench' },
  title: 'Finance & Business Scenario Workbench',
  description:
    'Run transparent loan, savings, pricing, budget, and business metric scenarios locally.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/finance/workbench" meta={metadata} />
      <FinanceBusinessWorkbenchTool />
    </>
  );
}
