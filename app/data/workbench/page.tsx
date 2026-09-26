import type { Metadata } from 'next';

import { SpreadsheetWorkbenchTool } from '@/components/spreadsheet-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/data/workbench' },
  title: 'CSV & Spreadsheet Workbench',
  description:
    'Clean, reshape, compare, inspect, sample, and convert tabular data locally.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/data/workbench" meta={metadata} />
      <SpreadsheetWorkbenchTool />
    </>
  );
}
