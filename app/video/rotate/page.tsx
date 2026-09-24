import { VideoRotateTool } from '@/components/video-rotate-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

const ROUTE = '/video/rotate';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <VideoRotateTool />
    </PageDepthProvider>
  );
}
