import type { Metadata } from 'next';

import { ExcelTool } from '@/components/excel-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/data/excel' },
  title: 'Excel to CSV and CSV to Excel — in Your Browser',
  description:
    'Convert an .xlsx spreadsheet to CSV, or a CSV into a real Excel file, without the file leaving your browser. Dates and text are read the way Excel stores them.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/data/excel" meta={metadata} />
      <ExcelTool />
    </>
  );
}
