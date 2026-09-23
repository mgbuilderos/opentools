import { PageDepthProvider } from '@/components/page-depth-provider';
import { PdfPreflightTool } from '@/components/pdf-preflight-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

const ROUTE = '/pdf/preflight';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  const related = relatedToolsFor(ROUTE);
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <PdfPreflightTool relatedTools={related} />
    </PageDepthProvider>
  );
}
