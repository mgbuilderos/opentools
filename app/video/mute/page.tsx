import { VideoTrimTool } from '@/components/video-trim-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/video/mute';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/video/mute" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <VideoTrimTool initialMode="video" forcedToolId="video-mute" />
      </PageDepthProvider>
    </>
  );
}
