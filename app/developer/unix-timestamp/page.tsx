import { TimestampTool } from '@/components/utility-tools';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/developer/unix-timestamp';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/developer/unix-timestamp" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <TimestampTool />
      </PageDepthProvider>
    </>
  );
}
