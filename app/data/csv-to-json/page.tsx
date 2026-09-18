import type { Metadata } from 'next';

import { CsvToJsonTool } from '@/components/structured-tools';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'CSV to JSON Converter',
  description: 'Convert quoted CSV to JSON locally in your browser.',
};

export default function Page() {
  return <CsvToJsonTool />;
}
