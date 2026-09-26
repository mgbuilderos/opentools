import { Base64DecoderTool } from '@/components/utility-tools';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/developer/base64-decoder';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/developer/base64-decoder" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <Base64DecoderTool />
      </PageDepthProvider>
    </>
  );
}
