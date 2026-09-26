import type { Metadata } from 'next';

import { ArchiveToolkitTool } from '@/components/archive-toolkit-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/file/archive' },
  title: 'Open and Make ZIP Files',
  description:
    'Open a ZIP, see what is inside, take files out and pack new archives — in your browser, with nothing uploaded. Checks every file against the archive’s own checksum.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/file/archive" meta={metadata} />
      <ArchiveToolkitTool />
    </>
  );
}
