import type { Metadata } from 'next';

import { PdfToExcelTool } from '@/components/pdf-to-excel-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'PDF to Excel & Bank Statement Converter',
  description:
    'Convert PDF bank statements and financial tables to clean Excel (.xlsx) and CSV spreadsheets directly in your browser. Column boundary detection, running balance reconciliation, and 100% private with zero server uploads.',
};

export default function Page() {
  return <PdfToExcelTool />;
}
