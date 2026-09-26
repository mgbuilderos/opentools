import { EmailReaderTool } from '@/components/email-reader-tool';
import { ToolJsonLd } from '@/components/tool-json-ld';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

const ROUTE = '/email/reader';

export const metadata = toolPageMetadata(ROUTE);

export default function EmailReaderPage() {
  return (
    <>
      <ToolJsonLd route={ROUTE} meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <EmailReaderTool />
      </PageDepthProvider>
    </>
  );
}
