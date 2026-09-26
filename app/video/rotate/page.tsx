import { VideoRotateTool } from '@/components/video-rotate-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/video/rotate';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/video/rotate" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <VideoRotateTool />
      </PageDepthProvider>
    </>
  );
}
