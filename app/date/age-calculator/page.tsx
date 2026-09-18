import type { Metadata } from 'next';
import { AgeCalculatorTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Age Calculator',
  description: 'Calculate calendar age and elapsed days locally.',
};
export default function Page() {
  return <AgeCalculatorTool />;
}
