import { Mp3ToolkitTool } from '@/components/mp3-toolkit-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/audio/mp3-toolkit';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/audio/mp3-toolkit" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <Mp3ToolkitTool />
      </PageDepthProvider>
    </>
  );
}
