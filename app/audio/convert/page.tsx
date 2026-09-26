import { AudioConvertTool } from '@/components/audio-convert-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/audio/convert';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/audio/convert" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <AudioConvertTool />
      </PageDepthProvider>
    </>
  );
}
