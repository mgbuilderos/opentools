import type { Metadata } from 'next';
import { BenchTool } from '@/components/bench/bench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'The Bench — Run Private Tools Over a Folder',
  description:
    'Drop files or choose a folder, run any OpenTools operation locally, and keep the results as a ZIP or in a folder you choose.',
};

export default function Page() {
  return <BenchTool />;
}
