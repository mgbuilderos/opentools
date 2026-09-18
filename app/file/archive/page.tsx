import type { Metadata } from 'next';

import { ArchiveToolkitTool } from '@/components/archive-toolkit-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Open and Make ZIP Files',
  description:
    'Open a ZIP, see what is inside, take files out and pack new archives — in your browser, with nothing uploaded. Checks every file against the archive’s own checksum.',
};

export default function Page() {
  return <ArchiveToolkitTool />;
}
