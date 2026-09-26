import { PdfPasswordTool } from '@/components/pdf-password-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

const ROUTE = '/pdf/password';

export const metadata = toolPageMetadata(ROUTE);

export default function PdfPasswordPage() {
  return (
    <>
      <ToolJsonLd route={ROUTE} meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <PdfPasswordTool />
      </PageDepthProvider>
    </>
  );
}
