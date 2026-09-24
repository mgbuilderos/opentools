import { ToolWorkspace } from '@/components/tool-workspace';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

const ROUTE = '/text/case-converter';

export const metadata = toolPageMetadata(ROUTE);

export default function TextCaseConverterPage() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <ToolWorkspace />
    </PageDepthProvider>
  );
}
