import type { Metadata } from 'next';
import { UuidGeneratorTool } from '@/components/utility-tools';
export const metadata: Metadata = {
  title: 'UUID Generator',
  description: 'Generate random UUID v4 values locally in your browser.',
};
export default function Page() {
  return <UuidGeneratorTool />;
}
