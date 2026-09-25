import { VideoConvertTool } from '@/components/video-convert-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/video/convert';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/video/convert" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <VideoConvertTool />
      </PageDepthProvider>
    </>
  );
}
