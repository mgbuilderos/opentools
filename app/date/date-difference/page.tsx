import type { Metadata } from 'next';
import { DateDifferenceTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/date/date-difference' },
  title: 'Date Difference Calculator',
  description:
    'Count exact calendar days between dates. Give the two dates and read the days, the weeks and the whole months between them, worked out in your browser tab.',
};
export default function Page() {
  return <DateDifferenceTool />;
}
