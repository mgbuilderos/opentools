import { AgeCalculatorTool } from '@/components/utility-tools';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/date/age-calculator';

export const metadata = toolPageMetadata(ROUTE);

export default function Page() {
  return (
    <>
      <ToolJsonLd route="/date/age-calculator" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <AgeCalculatorTool />
      </PageDepthProvider>
    </>
  );
}
