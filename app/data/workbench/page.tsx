import type { Metadata } from 'next';

import { SpreadsheetWorkbenchTool } from '@/components/spreadsheet-workbench-tool';

export const metadata: Metadata = {
  title: 'CSV & Spreadsheet Workbench',
  description:
    'Clean, reshape, compare, inspect, sample, and convert tabular data locally.',
};

export default function Page() {
  return <SpreadsheetWorkbenchTool />;
}
