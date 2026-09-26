import { OfxQifTool } from '@/components/ofx-qif-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

const ROUTE = '/finance/ofx-qif';

export const metadata = toolPageMetadata(ROUTE);

export default function OfxQifPage() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <OfxQifTool />
    </PageDepthProvider>
  );
}
