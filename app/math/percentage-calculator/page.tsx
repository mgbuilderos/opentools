import type { Metadata } from 'next';
import { PercentageTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/math/percentage-calculator' },
  title: 'Percentage Calculator',
  description: 'Calculate percentages and percentage change locally.',
};
export default function Page() {
  return <PercentageTool />;
}
