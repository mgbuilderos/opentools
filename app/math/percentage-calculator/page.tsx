import type { Metadata } from 'next';
import { PercentageTool } from '@/components/utility-tools';
export const metadata: Metadata = {
  title: 'Percentage Calculator',
  description: 'Calculate percentages and percentage change locally.',
};
export default function Page() {
  return <PercentageTool />;
}
