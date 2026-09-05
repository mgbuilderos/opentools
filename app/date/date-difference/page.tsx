import type { Metadata } from 'next';
import { DateDifferenceTool } from '@/components/utility-tools';
export const metadata: Metadata = {
  title: 'Date Difference Calculator',
  description: 'Count exact calendar days between dates.',
};
export default function Page() {
  return <DateDifferenceTool />;
}
