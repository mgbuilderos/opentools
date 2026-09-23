import type { Metadata } from 'next';
import { UuidGeneratorTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/developer/uuid-generator' },
  title: 'UUID Generator',
  description: 'Generate random UUID v4 values locally in your browser.',
};
export default function Page() {
  return <UuidGeneratorTool />;
}
