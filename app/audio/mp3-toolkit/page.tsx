import type { Metadata } from 'next';

import { Mp3ToolkitTool } from '@/components/mp3-toolkit-tool';

export const metadata: Metadata = {
  title: 'MP3 Cutter, Joiner and Tag Editor',
  description:
    'Cut, join and tag MP3 files in your browser by copying MPEG frames — no re-encoding, no quality loss and no upload.',
};

export default function Page() {
  return <Mp3ToolkitTool />;
}
