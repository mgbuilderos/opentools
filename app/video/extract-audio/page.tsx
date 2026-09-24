import { VideoTrimTool } from '@/components/video-trim-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

const ROUTE = '/video/extract-audio';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <VideoTrimTool initialMode="audio" forcedToolId="video-extract-audio" />
    </PageDepthProvider>
  );
}
