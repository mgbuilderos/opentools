import { PageDepthProvider } from '@/components/page-depth-provider';
import { PdfPreflightTool } from '@/components/pdf-preflight-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/pdf/preflight';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  const related = relatedToolsFor(ROUTE);
  return (
    <>
      <ToolJsonLd route="/pdf/preflight" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <PdfPreflightTool relatedTools={related} />
      </PageDepthProvider>
    </>
  );
}
