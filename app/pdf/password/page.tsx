import { PdfPasswordTool } from '@/components/pdf-password-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

const ROUTE = '/pdf/password';

export const metadata = toolPageMetadata(ROUTE);

export default function PdfPasswordPage() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <PdfPasswordTool />
    </PageDepthProvider>
  );
}
