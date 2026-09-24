import { VideoMetadataTool } from '@/components/video-metadata-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

const ROUTE = '/video/metadata';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <VideoMetadataTool />
    </PageDepthProvider>
  );
}
