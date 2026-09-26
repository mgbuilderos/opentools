import { PercentageTool } from '@/components/utility-tools';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/math/percentage-calculator';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/math/percentage-calculator" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <PercentageTool />
      </PageDepthProvider>
    </>
  );
}
