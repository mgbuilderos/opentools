import type { Metadata } from 'next';

import { ListToolsTool } from '@/components/list-tools-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Customer List Hygiene & Deduplicator — Private CSV Cleaner',
  description:
    'Clean, de-duplicate, merge, split, compare, and normalise customer CSV lists 100% locally in browser memory. Protect sensitive contact records without uploading to third parties.',
};

export default function Page() {
  return <ListToolsTool />;
}
