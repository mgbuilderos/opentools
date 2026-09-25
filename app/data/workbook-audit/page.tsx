import type { Metadata } from 'next';

import { WorkbookAuditTool } from '@/components/workbook-audit-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/data/workbook-audit' },
  title: 'Excel Workbook Audit & Formula Inspector Online',
  description:
    'Audit an Excel workbook in your browser: hardcoded constants in formulas, broken formula runs, error cells, circular references, hidden sheets and mixed types.',
};

export default function Page() {
  const related = relatedToolsFor('/data/workbook-audit');
  return <WorkbookAuditTool relatedTools={related} />;
}
