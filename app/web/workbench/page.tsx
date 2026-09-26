import type { Metadata } from 'next';

import { WebWorkbenchTool } from '@/components/web-workbench-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/web/workbench' },
  title: 'Web & SEO Workbench',
  description:
    'Generate and inspect metadata, URLs, sitemaps, CSS, HTML, and accessibility signals locally.',
};

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/web/workbench" meta={metadata} />
      <WebWorkbenchTool />
    </>
  );
}
