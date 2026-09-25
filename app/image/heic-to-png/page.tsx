import { HeicConvertTool } from '@/components/heic-convert-tool';
import { PageDepthProvider } from '@/components/page-depth-provider';
import {
  requireToolPageDepth,
  toolPageMetadata,
} from '@/lib/seo/tool-page-depth';

export const revalidate = 86400;

const ROUTE = '/image/heic-to-png';

export const metadata = toolPageMetadata(ROUTE);

export default function HeicToPngPage() {
  return (
    <PageDepthProvider content={requireToolPageDepth(ROUTE)}>
      <HeicConvertTool targetFormatId="png" />
    </PageDepthProvider>
  );
}
