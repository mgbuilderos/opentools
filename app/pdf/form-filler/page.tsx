import { PdfFormFillerTool } from '@/components/pdf-form-filler-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

const ROUTE = '/pdf/form-filler';

export const metadata = toolPageMetadata(ROUTE);

export default function FormFillerPage() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <PdfFormFillerTool />
    </PageDepthProvider>
  );
}
