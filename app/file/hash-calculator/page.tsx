import type { Metadata } from 'next';
import { FileHashTool } from '@/components/utility-tools';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'File Hash Calculator',
  description: 'Calculate SHA file checksums locally in your browser.',
};
export default function Page() {
  return <FileHashTool />;
}
