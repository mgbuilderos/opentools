import { ToolWorkspace } from '@/components/tool-workspace';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';
import { ToolJsonLd } from '@/components/tool-json-ld';

export const revalidate = 86400;

const ROUTE = '/text/case-converter';

export const metadata = toolPageMetadata(ROUTE);

export default function TextCaseConverterPage() {
  return (
    <>
      <ToolJsonLd route="/text/case-converter" meta={metadata} />
      <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
        <ToolWorkspace />
      </PageDepthProvider>
    </>
  );
}
