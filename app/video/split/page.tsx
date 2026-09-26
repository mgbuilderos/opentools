import { VideoSplitTool } from '@/components/video-split-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/video/split';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/video/split" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <VideoSplitTool />
      </PageDepthProvider>
    </>
  );
}
