import type { Metadata } from 'next';

import { Mp3ToolkitTool } from '@/components/mp3-toolkit-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/audio/mp3-toolkit' },
  title: 'MP3 Cutter, Joiner and Tag Editor',
  description:
    'Cut, join and tag MP3 files in your browser by copying MPEG frames — no re-encoding, no quality loss and no upload.',
};

export default function Page() {
  return <Mp3ToolkitTool />;
}
