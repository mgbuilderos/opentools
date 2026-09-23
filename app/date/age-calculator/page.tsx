import type { Metadata } from 'next';
import { AgeCalculatorTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/date/age-calculator' },
  title: 'Age Calculator',
  description:
    'Calculate calendar age and elapsed days locally. Give a birth date and a date to measure to, and read the years, months and days, plus the total days between.',
};
export default function Page() {
  return <AgeCalculatorTool />;
}
