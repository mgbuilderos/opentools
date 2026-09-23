import { PageDepthProvider } from '@/components/page-depth-provider';
import { PdfDrawingRegisterTool } from '@/components/pdf-drawing-register-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

const ROUTE = '/pdf/drawing-register';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  const related = relatedToolsFor(ROUTE);
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <PdfDrawingRegisterTool relatedTools={related} />
    </PageDepthProvider>
  );
}
