import { PageDepthProvider } from '@/components/page-depth-provider';
import { PdfBurstTool } from '@/components/pdf-burst-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/pdf/burst';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  const related = relatedToolsFor(ROUTE);
  return (
    <>
      <ToolJsonLd route="/pdf/burst" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <PdfBurstTool relatedTools={related} />
      </PageDepthProvider>
    </>
  );
}
